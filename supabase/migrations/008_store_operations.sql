-- Durable owner alerts, bounded reservations, minimal error telemetry and exports.
-- Never cancel review/paid orders: a slip may represent money already transferred.
alter table public.orders add column payment_due_at timestamptz not null default (now()+interval '30 minutes'), add column expired_at timestamptz;
-- Give pre-upgrade pending orders a fresh window rather than cancelling them at rollout.
update public.orders set payment_due_at=now()+interval '30 minutes' where status='pending';
create index orders_expiry_idx on public.orders(payment_due_at) where status='pending';
create table public.owner_notifications (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 kind text not null check(kind in ('new_order','new_slip')), created_at timestamptz not null default now(), seen_at timestamptz
);
create index owner_notifications_recent on public.owner_notifications(created_at desc);
alter table public.owner_notifications enable row level security;
create policy owner_notification_read on public.owner_notifications for select to authenticated using(public.is_admin());
revoke all on public.owner_notifications from anon,authenticated;
grant select on public.owner_notifications to authenticated;
create function public.notify_owner_order() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='INSERT' then insert into owner_notifications(order_id,kind) values(new.id,'new_order');
 elsif new.slip_path is not null and new.slip_path is distinct from old.slip_path then insert into owner_notifications(order_id,kind) values(new.id,'new_slip'); end if;
 return new;
end $$;
create trigger owner_order_notification after insert or update of slip_path on public.orders for each row execute function public.notify_owner_order();
create function public.mark_owner_notification(p_id uuid default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 update owner_notifications set seen_at=now() where seen_at is null and (p_id is null or id=p_id);
end $$;
create table public.operation_status (name text primary key, last_success timestamptz, affected integer not null default 0);
alter table public.operation_status enable row level security;
create policy operation_status_owner on public.operation_status for select to authenticated using(public.is_admin());
revoke all on public.operation_status from anon,authenticated;
grant select on public.operation_status to authenticated;
create function public.expire_unpaid_orders() returns integer language plpgsql security definer set search_path=public as $$
declare expired_ids uuid[]; item record; n integer;
begin
 -- Claim order rows before touching products, like manual cancellation/slip attach.
 -- SKIP LOCKED avoids stealing an order being processed by another transaction.
 select array_agg(id) into expired_ids from (select id from orders where status='pending' and slip_path is null and payment_due_at<=clock_timestamp() order by id limit 200 for update skip locked) due;
 n=coalesce(cardinality(expired_ids),0);
 if n>0 then
  -- One global product-ID order across this batch prevents inverted stock locks.
  for item in select (v->>'id')::uuid id,sum((v->>'quantity')::integer)::integer qty from orders o cross join lateral jsonb_array_elements(o.items) v where o.id=any(expired_ids) group by (v->>'id')::uuid order by (v->>'id')::uuid loop
   update products set stock=stock+item.qty where id=item.id;
  end loop;
  update orders set status='cancelled',expired_at=clock_timestamp() where id=any(expired_ids);
 end if;
 insert into operation_status(name,last_success,affected) values('order_expiry',clock_timestamp(),n) on conflict(name) do update set last_success=excluded.last_success,affected=excluded.affected;
 delete from owner_notifications where seen_at is not null and created_at<now()-interval '90 days';
 delete from client_errors where created_at<now()-interval '30 days';
 return n;
end $$;
-- Preserve authoritative pricing/idempotency and custom shipping implementation.
alter function public.create_order(jsonb,jsonb,uuid) rename to create_order_reserved_internal;
revoke all on function public.create_order_reserved_internal(jsonb,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.create_order(cart jsonb,delivery jsonb,request_key uuid) returns public.orders language plpgsql security definer set search_path=public as $$
declare existing orders;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform public.expire_unpaid_orders();
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from orders where user_id=auth.uid() and request_id=request_key;
 if found then return existing; end if;
 if (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '15 minutes')>=3 or (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '24 hours')>=20 then
  raise exception 'สร้างคำสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ (สูงสุด 3 ครั้งต่อ 15 นาที และ 20 ครั้งต่อวัน)';
 end if;
 return public.create_order_reserved_internal(cart,delivery,request_key);
end $$;
create or replace function public.attach_slip(order_id uuid,object_path text) returns void language plpgsql security definer set search_path=public as $$
declare o orders;
begin
 if auth.uid() is null or object_path not like auth.uid()::text||'/'||order_id::text||'/%' then raise exception 'ไม่มีสิทธิ์'; end if;
 select * into o from orders where id=order_id and user_id=auth.uid() for update;
 if not found or o.status not in ('pending','review') then raise exception 'ไม่สามารถแนบสลิปรายการนี้'; end if;
 if o.status='pending' and o.payment_due_at<=clock_timestamp() then raise exception 'หมดเวลาชำระเงินแล้ว กรุณาอย่าโอนเงิน หากโอนแล้วให้ติดต่อร้านพร้อมหลักฐาน'; end if;
 if not exists(select 1 from storage.objects where bucket_id='payment-slips' and name=object_path) then raise exception 'ไม่พบไฟล์สลิป'; end if;
 update orders set slip_path=object_path,status='review' where id=o.id;
end $$;
create table public.client_errors (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 area text not null check(area in ('checkout','account','catalogue','admin','auth','other')),
 code text not null check(code in ('NETWORK','AUTH','PERMISSION','DATABASE','STORAGE','UI','UNKNOWN')),
 created_at timestamptz not null default now()
);
create index client_errors_time on public.client_errors(created_at desc);
create index client_errors_user_time on public.client_errors(user_id,created_at desc);
alter table public.client_errors enable row level security;
create policy client_errors_owner on public.client_errors for select to authenticated using(public.is_admin());
revoke all on public.client_errors from anon,authenticated;
grant select(id,area,code,created_at) on public.client_errors to authenticated;
create function public.report_client_error(p_area text,p_code text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('error:'||auth.uid()::text,0));
 if exists(select 1 from client_errors where user_id=auth.uid() and created_at>now()-interval '1 minute') or (select count(*) from client_errors where user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then return; end if;
 insert into client_errors(user_id,area,code) values(auth.uid(),p_area,p_code);
end $$;
create function public.get_admin_backup() returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 return jsonb_build_object('format','zenmarket-data-v1','created_at',clock_timestamp(),
 'tables',jsonb_build_object('products',(select coalesce(jsonb_agg(t),'[]') from products t),
 'categories',(select coalesce(jsonb_agg(t),'[]') from categories t),
 'profiles',(select coalesce(jsonb_agg(t),'[]') from profiles t),
 'orders',(select coalesce(jsonb_agg(t),'[]') from orders t),
 'store_settings',(select coalesce(jsonb_agg(t),'[]') from store_settings t),
 'store_admin',(select coalesce(jsonb_agg(t),'[]') from store_admin t),
 'customer_addresses',(select coalesce(jsonb_agg(t),'[]') from customer_addresses t),
 'product_reviews',(select coalesce(jsonb_agg(t),'[]') from product_reviews t),
 'order_shipping_updates',(select coalesce(jsonb_agg(t),'[]') from order_shipping_updates t)));
end $$;
revoke all on function public.notify_owner_order(),public.expire_unpaid_orders(),public.create_order(jsonb,jsonb,uuid),public.mark_owner_notification(uuid),public.report_client_error(text,text),public.get_admin_backup() from public,anon,authenticated;
grant execute on function public.expire_unpaid_orders() to service_role;
grant execute on function public.create_order(jsonb,jsonb,uuid),public.mark_owner_notification(uuid),public.report_client_error(text,text),public.get_admin_backup() to authenticated;
