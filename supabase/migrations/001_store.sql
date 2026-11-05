create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 first_name text not null check(length(first_name) between 1 and 80),
 last_name text not null check(length(last_name) between 1 and 80),
 nickname text not null check(length(nickname) between 1 and 50),
 phone text not null check(phone ~ '^0[0-9]{9}$'),
 age integer not null check(age between 13 and 120),
 username text not null unique check(username ~ '^[a-z0-9_]{3,30}$'),
 created_at timestamptz not null default now()
);
create table public.store_admin (singleton boolean primary key default true check(singleton), user_id uuid not null unique references auth.users);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from store_admin where user_id=auth.uid()) $$;
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 150),
 sku text not null unique check(length(sku) between 1 and 50), category text not null check(category in ('ไลฟ์สไตล์','ของแต่งบ้าน','แก็ดเจ็ต','แฟชั่น')),
 description text not null default '' check(length(description)<=2000), price numeric(12,2) not null check(price>0 and price<=1000000),
 image_url text not null check(length(image_url)<=1000), stock integer not null check(stock between 0 and 100000),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.store_settings (singleton boolean primary key default true check(singleton), promptpay_id text check(promptpay_id ~ '^(0[0-9]{9}|[0-9]{13})$'), recipient_name text not null default '' check(length(recipient_name)<=150));
insert into store_settings(singleton) values(true);
create table public.orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
 items jsonb not null, subtotal numeric(12,2) not null, shipping numeric(12,2) not null, total numeric(12,2) not null,
 address text not null check(length(address) between 20 and 1200), recipient text not null check(length(recipient) between 2 and 150), phone text not null check(phone ~ '^0[0-9]{9}$'),
 promptpay_id text not null, recipient_name text not null,
 status text not null default 'pending' check(status in ('pending','review','paid','shipped','cancelled')),
 slip_path text, tracking text check(length(tracking)<=100), request_id uuid not null,
 created_at timestamptz not null default now(), unique(user_id,request_id)
);
create index orders_user_idx on orders(user_id,created_at desc);
create function public.handle_signup() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into profiles(id,first_name,last_name,nickname,phone,age,username) values(new.id,trim(new.raw_user_meta_data->>'first_name'),trim(new.raw_user_meta_data->>'last_name'),trim(new.raw_user_meta_data->>'nickname'),new.raw_user_meta_data->>'phone',(new.raw_user_meta_data->>'age')::integer,lower(new.raw_user_meta_data->>'username'));
 return new;
end $$;
create trigger signup_profile after insert on auth.users for each row execute function public.handle_signup();
alter table profiles enable row level security;
alter table store_admin enable row level security;
alter table products enable row level security;
alter table store_settings enable row level security;
alter table orders enable row level security;
create policy profile_read on profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy admin_read on store_admin for select to authenticated using(user_id=auth.uid());
create policy product_read on products for select using(active or is_admin());
create policy product_admin on products for all to authenticated using(is_admin()) with check(is_admin());
create policy settings_admin on store_settings for all to authenticated using(is_admin()) with check(is_admin());
create policy order_read on orders for select to authenticated using(user_id=auth.uid() or is_admin());
grant select on public.products to anon,authenticated;
grant select on public.profiles,public.orders,public.store_admin to authenticated;
grant select,insert,update,delete on public.products,public.store_settings to authenticated;
revoke all on public.orders,public.profiles,public.store_admin from anon;
revoke insert,update,delete on public.orders,public.profiles,public.store_admin from authenticated;
create function public.create_order(cart jsonb, delivery jsonb, request_key uuid) returns public.orders language plpgsql security definer set search_path=public as $$
declare p products; line record; result orders; snapshot jsonb='[]'; amount numeric=0; fee numeric; cfg store_settings; qty integer;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into result from orders where user_id=auth.uid() and request_id=request_key;
 if found then return result; end if;
 if (select count(*) from orders where user_id=auth.uid() and status in ('pending','review'))>=5 then raise exception 'มีคำสั่งซื้อที่รอชำระครบ 5 รายการแล้ว กรุณาจัดการรายการเดิมก่อน'; end if;
 if cart is null or jsonb_typeof(cart)<>'array' or jsonb_array_length(cart) not between 1 and 50 then raise exception 'ตะกร้าไม่ถูกต้อง'; end if;
 select * into cfg from store_settings where singleton;
 if cfg.promptpay_id is null or length(trim(cfg.recipient_name))<2 then raise exception 'ร้านค้ายังไม่ได้ตั้งค่าบัญชีรับเงิน'; end if;
 for line in select value from jsonb_array_elements(cart) order by value->>'id' loop
  if (line.value->>'quantity') !~ '^[0-9]{1,3}$' then raise exception 'จำนวนไม่ถูกต้อง'; end if;
  qty=(line.value->>'quantity')::integer;
  select * into p from products where id=(line.value->>'id')::uuid and active for update;
  if not found or qty<1 or qty>99 or p.stock<qty then raise exception 'สินค้าไม่เพียงพอ กรุณาตรวจสอบตะกร้า'; end if;
  update products set stock=stock-qty where id=p.id;
  amount=amount+p.price*qty;
  snapshot=snapshot||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'sku',p.sku,'price',p.price,'quantity',qty,'image_url',p.image_url));
 end loop;
 fee=case when amount>=1000 then 0 else 50 end;
 insert into orders(user_id,items,subtotal,shipping,total,address,recipient,phone,promptpay_id,recipient_name,request_id)
 values(auth.uid(),snapshot,amount,fee,amount+fee,delivery->>'address',delivery->>'recipient',delivery->>'phone',cfg.promptpay_id,cfg.recipient_name,request_key) returning * into result;
 return result;
end $$;
create function public.attach_slip(order_id uuid, object_path text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or object_path not like auth.uid()::text||'/'||order_id::text||'/%' then raise exception 'ไม่มีสิทธิ์'; end if;
 if not exists(select 1 from storage.objects where bucket_id='payment-slips' and name=object_path) then raise exception 'ไม่พบไฟล์สลิป'; end if;
 update orders set slip_path=object_path,status='review' where id=order_id and user_id=auth.uid() and status in ('pending','review');
 if not found then raise exception 'ไม่สามารถแนบสลิปรายการนี้'; end if;
end $$;
create function public.transition_order(order_id uuid,next_status text,tracking_number text default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders; item jsonb;
begin
 select * into o from orders where id=order_id for update;
 if not found or auth.uid() is null or not (is_admin() or o.user_id=auth.uid()) then raise exception 'ไม่มีสิทธิ์'; end if;
 if next_status='cancelled' and (o.status='pending' or (is_admin() and o.status='review')) then
  for item in select value from jsonb_array_elements(o.items) order by value->>'id' loop
   update products set stock=stock+(item->>'quantity')::integer where id=(item->>'id')::uuid;
  end loop;
 elsif is_admin() and next_status='paid' and o.status='review' then null;
 elsif is_admin() and next_status='shipped' and o.status='paid' and length(trim(tracking_number)) between 1 and 100 then null;
 else raise exception 'ไม่สามารถเปลี่ยนสถานะนี้ได้'; end if;
 update orders set status=next_status,tracking=case when next_status='shipped' then tracking_number else tracking end where id=order_id;
end $$;
revoke all on function public.create_order(jsonb,jsonb,uuid),public.attach_slip(uuid,text),public.transition_order(uuid,text,text) from public,anon;
grant execute on function public.create_order(jsonb,jsonb,uuid),public.attach_slip(uuid,text),public.transition_order(uuid,text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-slips','payment-slips',false,5242880,array['image/jpeg','image/png','image/webp']),('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy slip_insert on storage.objects for insert to authenticated with check(bucket_id='payment-slips' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from orders where id::text=(storage.foldername(name))[2] and user_id=auth.uid() and status in ('pending','review')));
create policy slip_read on storage.objects for select to authenticated using(bucket_id='payment-slips' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
create policy images_read on storage.objects for select using(bucket_id='product-images');
create policy images_admin on storage.objects for all to authenticated using(bucket_id='product-images' and is_admin()) with check(bucket_id='product-images' and is_admin());
-- Server-only username lookup + fixed-window login throttling. Neither table is browser-readable.
create table public.login_attempts (key text primary key, hits integer not null, expires timestamptz not null);
alter table login_attempts enable row level security;
revoke all on login_attempts from anon,authenticated;
create function public.login_allow(bucket_key text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into login_attempts(key,hits,expires) values(bucket_key,1,now()+interval '15 minutes') on conflict(key) do update set hits=case when login_attempts.expires<now() then 1 else login_attempts.hits+1 end,expires=case when login_attempts.expires<now() then now()+interval '15 minutes' else login_attempts.expires end returning hits into n;
 delete from login_attempts where expires<now()-interval '1 day';
 return n<=15;
end $$;
create function public.login_email(login_name text) returns text language sql security definer set search_path=public as $$ select u.email::text from profiles p join auth.users u on u.id=p.id where p.username=lower(login_name) $$;
revoke all on function public.login_allow(text),public.login_email(text) from public,anon,authenticated;
grant execute on function public.login_allow(text),public.login_email(text) to service_role;
