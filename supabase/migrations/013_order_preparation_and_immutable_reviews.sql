-- Add an explicit seller confirmation between packing an order and handing it to the carrier.
alter table public.orders
  drop constraint orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending','review','paid','ready_to_ship','shipped','delivered','cancelled'));
alter table public.orders add column prepared_at timestamptz;

create or replace function public.transition_order(order_id uuid,next_status text,tracking_number text default null)
returns void language plpgsql security definer set search_path=public as $$
declare o orders; item jsonb;
begin
 select * into o from orders where id=order_id for update;
 if not found or auth.uid() is null or not (is_admin() or o.user_id=auth.uid()) then
  raise exception 'ไม่มีสิทธิ์';
 end if;
 if next_status='cancelled' and (o.status='pending' or (is_admin() and o.status='review')) then
  for item in select value from jsonb_array_elements(o.items) order by value->>'id' loop
   update products set stock=stock+(item->>'quantity')::integer where id=(item->>'id')::uuid;
  end loop;
 elsif is_admin() and next_status='paid' and o.status='review' then
  null;
 elsif is_admin() and next_status='ready_to_ship' and o.status='paid' then
  null;
 elsif next_status='delivered' and o.status='shipped' and o.user_id=auth.uid() then
  null;
 else
  raise exception 'ไม่สามารถเปลี่ยนสถานะนี้ได้';
 end if;
 update orders set
  status=next_status,
  tracking=case when next_status='shipped' then trim(tracking_number) else tracking end,
  paid_at=case when next_status='paid' then now() else paid_at end,
  prepared_at=case when next_status='ready_to_ship' then now() else prepared_at end,
  shipped_at=case when next_status='shipped' then now() else shipped_at end,
  delivered_at=case when next_status='delivered' then now() else delivered_at end
 where id=order_id;
end $$;

-- Shipping photos are uploaded before the final ship RPC, while the order is ready_to_ship.
drop policy if exists shipping_photo_insert on storage.objects;
create policy shipping_photo_insert on storage.objects for insert to authenticated
 with check(bucket_id='shipping-updates' and public.is_admin() and exists(
  select 1 from public.orders o where o.id::text=(storage.foldername(name))[1]
   and o.status in ('ready_to_ship','shipped','delivered')
 ));

create or replace function public.add_shipping_update(p_order_id uuid,p_message text,p_images text[])
returns uuid language plpgsql security definer set search_path=public as $$
declare o orders; path text; images text[]=coalesce(p_images,'{}'); result uuid; body text=btrim(coalesce(p_message,''));
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 select * into o from orders where id=p_order_id for update;
 if not found or o.status not in ('shipped','delivered') then
  raise exception 'เพิ่มอัปเดตได้หลังยืนยันการจัดส่งเท่านั้น';
 end if;
 if cardinality(images)>4 or array_position(images,null) is not null or length(coalesce(p_message,''))>1000 or (body='' and cardinality(images)=0) then
  raise exception 'ระบุข้อความ หรือแนบรูปไม่เกิน 4 รูป พร้อมข้อความไม่เกิน 1,000 ตัวอักษร';
 end if;
 foreach path in array images loop
  if path !~ ('^'||o.id::text||'/[0-9a-f-]{36}\\.(jpeg|png|webp)$')
   or not exists(select 1 from storage.objects where bucket_id='shipping-updates' and name=path) then
   raise exception 'ไม่พบรูปของคำสั่งซื้อนี้ หรือรูปไม่ถูกต้อง';
  end if;
 end loop;
 insert into order_shipping_updates(order_id,message,image_paths)
 values(o.id,coalesce(nullif(body,''),'อัปเดตการจัดส่งจากร้าน'),images) returning id into result;
 return result;
end $$;

-- Shipping status and its customer-visible tracking/photo update commit atomically.
create or replace function public.ship_order_with_update(p_order_id uuid,p_tracking text,p_message text,p_images text[])
returns void language plpgsql security definer set search_path=public as $$
declare o orders;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 if length(trim(coalesce(p_tracking,''))) not between 1 and 100 then
  raise exception 'กรุณากรอกเลขติดตามพัสดุให้ถูกต้อง';
 end if;
 select * into o from orders where id=p_order_id for update;
 if not found or o.status<>'ready_to_ship' then
  raise exception 'ยืนยันเตรียมจัดส่งก่อน แล้วกรอกข้อมูลการส่งมอบ';
 end if;
 update orders set status='shipped',tracking=trim(p_tracking),shipped_at=now() where id=o.id;
 perform public.add_shipping_update(p_order_id,coalesce(nullif(btrim(p_message),''),'จัดส่งสินค้าแล้ว เลขติดตาม: '||btrim(p_tracking)),p_images);
end $$;

-- Include paid/prepared orders in seller payment and dispatch KPIs.
create or replace function public.get_admin_dashboard() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 select jsonb_build_object(
  'revenue',coalesce((select sum(total) from orders where status in ('paid','ready_to_ship','shipped','delivered')),0),
  'units_sold',coalesce((select sum((item->>'quantity')::integer) from orders cross join lateral jsonb_array_elements(items) item where status in ('paid','ready_to_ship','shipped','delivered')),0),
  'paid_orders',(select count(*) from orders where status in ('paid','ready_to_ship','shipped','delivered')),
  'awaiting_review',(select count(*) from orders where status='review'),
  'preparing_orders',(select count(*) from orders where status='paid'),
  'ready_to_ship',(select count(*) from orders where status='ready_to_ship'),
  'awaiting_shipment',(select count(*) from orders where status in ('paid','ready_to_ship')),
  'review_count',(select count(*) from product_reviews),
  'average_rating',coalesce((select round(avg(rating),1) from product_reviews),0),
  'product_count',(select count(*) from products),
  'stock_units',coalesce((select sum(stock) from products),0),
  'daily_revenue',(select jsonb_agg(jsonb_build_object('day',d::date,'total',coalesce((select sum(total) from orders where status in ('paid','ready_to_ship','shipped','delivered') and (coalesce(paid_at,created_at) at time zone 'Asia/Bangkok')::date=d::date),0)) order by d) from generate_series((now() at time zone 'Asia/Bangkok')::date-6,(now() at time zone 'Asia/Bangkok')::date,'1 day'::interval) d),
  'ratings',(select jsonb_agg(jsonb_build_object('rating',n,'count',(select count(*) from product_reviews where rating=n)) order by n desc) from generate_series(1,5) n)
 ) into result;
 return result;
end $$;

-- Reviews are final once submitted; order locking plus this check prevents edits/replays.
create or replace function public.save_review(p_order_id uuid,p_product_id uuid,p_rating integer,p_comment text)
returns void language plpgsql security definer set search_path=public as $$
declare o orders; label text; author text;
begin
 select * into o from orders where id=p_order_id for update;
 if auth.uid() is null or not found or o.user_id<>auth.uid() or o.status<>'delivered' then
  raise exception 'รีวิวได้เฉพาะสินค้าที่ซื้อและยืนยันรับแล้ว';
 end if;
 if p_rating is null or p_rating not between 1 and 5 or p_comment is null or length(p_comment)>2000 then
  raise exception 'กรุณาให้ 1–5 ดาว และข้อความไม่เกิน 2,000 ตัวอักษร';
 end if;
 select value->>'name' into label from jsonb_array_elements(o.items)
  where value->>'id'=p_product_id::text limit 1;
 if label is null then raise exception 'ไม่พบสินค้าในคำสั่งซื้อนี้'; end if;
 if exists(select 1 from product_reviews where order_id=o.id and product_id=p_product_id) then
  raise exception 'รีวิวนี้ส่งแล้ว ไม่สามารถแก้ไขได้';
 end if;
 select username into author from profiles where id=auth.uid();
 insert into product_reviews(order_id,product_id,reviewer_name,product_name,rating,comment)
 values(o.id,p_product_id,author,label,p_rating,btrim(p_comment));
end $$;
