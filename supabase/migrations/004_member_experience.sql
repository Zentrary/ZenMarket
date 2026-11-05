-- Additive upgrade: retain existing products, images, orders and payment settings.
alter table public.products add column image_urls text[] not null default '{}'
 check(cardinality(image_urls)<=8 and array_position(image_urls,null) is null);
update public.products set image_urls=array[image_url];
alter table public.store_settings
 add column facebook_url text not null default '' check(length(facebook_url)<=500 and (facebook_url='' or facebook_url ~ '^https://(www\.)?(facebook\.com|fb\.com)/[^[:space:]]*$')),
 add column instagram_url text not null default '' check(length(instagram_url)<=500 and (instagram_url='' or instagram_url ~ '^https://(www\.)?instagram\.com/[^[:space:]]*$')),
 add column line_url text not null default '' check(length(line_url)<=500 and (line_url='' or line_url ~ '^https://(line\.me|lin\.ee)/[^[:space:]]*$'));
create or replace function public.get_storefront() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('shop_name',shop_name,'tagline',tagline,'logo_url',logo_url,'contact_email',contact_email,'contact_phone',contact_phone,'contact_address',contact_address,'about_text',about_text,'shipping_note',shipping_note,'shipping_fee',shipping_fee,'free_shipping_threshold',free_shipping_threshold,'facebook_url',facebook_url,'instagram_url',instagram_url,'line_url',line_url) from store_settings where singleton
$$;
-- Catalogue membership enforcement is activated by migration 005 after frontend rollout.
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check(status in ('pending','review','paid','shipped','delivered','cancelled'));
alter table public.orders add column paid_at timestamptz, add column shipped_at timestamptz, add column delivered_at timestamptz;
create or replace function public.transition_order(order_id uuid,next_status text,tracking_number text default null) returns void language plpgsql security definer set search_path=public as $$
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
 elsif next_status='delivered' and o.status='shipped' and o.user_id=auth.uid() then null;
 else raise exception 'ไม่สามารถเปลี่ยนสถานะนี้ได้'; end if;
 update orders set status=next_status,
 tracking=case when next_status='shipped' then trim(tracking_number) else tracking end,
 paid_at=case when next_status='paid' then now() else paid_at end,
 shipped_at=case when next_status='shipped' then now() else shipped_at end,
 delivered_at=case when next_status='delivered' then now() else delivered_at end
 where id=order_id;
end $$;
-- Product IDs are historical references, deliberately not cascading FKs: deleting a
-- product must not delete verified reviews or immutable order-item snapshots.
create table public.product_reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id), product_id uuid not null,
 reviewer_name text not null, product_name text not null,
 rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(length(comment)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(order_id,product_id)
);
create index product_reviews_product_idx on public.product_reviews(product_id,created_at desc);
alter table public.product_reviews enable row level security;
create policy review_read on public.product_reviews for select to authenticated using(true);
revoke all on public.product_reviews from anon,authenticated;
-- Public review projection deliberately has no customer ID, private order ID,
-- email, phone, address or payment fields. Order-specific reads use an RPC.
grant select(id,product_id,reviewer_name,product_name,rating,comment,created_at,updated_at) on public.product_reviews to authenticated;
create function public.save_review(p_order_id uuid,p_product_id uuid,p_rating integer,p_comment text) returns void language plpgsql security definer set search_path=public as $$
declare o orders; label text; author text;
begin
 select * into o from orders where id=p_order_id for update;
 if auth.uid() is null or not found or o.user_id<>auth.uid() or o.status<>'delivered' then raise exception 'รีวิวได้เฉพาะสินค้าที่ซื้อและยืนยันรับแล้ว'; end if;
 if p_rating is null or p_rating not between 1 and 5 or p_comment is null or length(p_comment)>2000 then raise exception 'กรุณาให้ 1–5 ดาว และข้อความไม่เกิน 2,000 ตัวอักษร'; end if;
 select value->>'name' into label from jsonb_array_elements(o.items) where value->>'id'=p_product_id::text limit 1;
 if label is null then raise exception 'ไม่พบสินค้าในคำสั่งซื้อนี้'; end if;
 select username into author from profiles where id=auth.uid();
 insert into product_reviews(order_id,product_id,reviewer_name,product_name,rating,comment)
 values(o.id,p_product_id,author,label,p_rating,btrim(p_comment))
 on conflict(order_id,product_id) do update set rating=excluded.rating,comment=excluded.comment,updated_at=now();
end $$;
create function public.get_order_reviews(p_order_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from orders where id=p_order_id and (user_id=auth.uid() or is_admin())) then raise exception 'ไม่มีสิทธิ์'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('product_id',product_id,'rating',rating,'comment',comment)) from product_reviews where order_id=p_order_id),'[]');
end $$;
create function public.get_admin_dashboard() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 select jsonb_build_object(
  'revenue',coalesce((select sum(total) from orders where status in ('paid','shipped','delivered')),0),
  'units_sold',coalesce((select sum((item->>'quantity')::integer) from orders cross join lateral jsonb_array_elements(items) item where status in ('paid','shipped','delivered')),0),
  'paid_orders',(select count(*) from orders where status in ('paid','shipped','delivered')),
  'awaiting_review',(select count(*) from orders where status='review'),
  'awaiting_shipment',(select count(*) from orders where status='paid'),
  'review_count',(select count(*) from product_reviews),
  'average_rating',coalesce((select round(avg(rating),1) from product_reviews),0),
  'product_count',(select count(*) from products),
  'stock_units',coalesce((select sum(stock) from products),0),
  'daily_revenue',(select jsonb_agg(jsonb_build_object('day',d::date,'total',coalesce((select sum(total) from orders where status in ('paid','shipped','delivered') and (coalesce(paid_at,created_at) at time zone 'Asia/Bangkok')::date=d::date),0)) order by d) from generate_series((now() at time zone 'Asia/Bangkok')::date-6,(now() at time zone 'Asia/Bangkok')::date,'1 day'::interval) d),
  'ratings',(select jsonb_agg(jsonb_build_object('rating',n,'count',(select count(*) from product_reviews where rating=n)) order by n desc) from generate_series(1,5) n)
 ) into result;
 return result;
end $$;
revoke all on function public.save_review(uuid,uuid,integer,text),public.get_order_reviews(uuid),public.get_admin_dashboard() from public,anon;
grant execute on function public.save_review(uuid,uuid,integer,text),public.get_order_reviews(uuid),public.get_admin_dashboard() to authenticated;
