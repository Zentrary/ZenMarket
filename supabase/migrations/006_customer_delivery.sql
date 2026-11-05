-- Self-service profiles. No direct profile/role/auth-user writes are granted.
create function public.save_profile(p_first_name text,p_last_name text,p_nickname text,p_phone text,p_age integer,p_username text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 update profiles set first_name=btrim(p_first_name),last_name=btrim(p_last_name),nickname=btrim(p_nickname),phone=btrim(p_phone),age=p_age,username=lower(btrim(p_username)) where id=auth.uid();
 if not found then raise exception 'ไม่พบโปรไฟล์ของคุณ'; end if;
end $$;
create table public.customer_addresses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 label text not null check(length(btrim(label)) between 1 and 40),
 recipient text not null check(length(btrim(recipient)) between 2 and 150),
 phone text not null check(phone ~ '^0[0-9]{9}$'),
 address text not null check(length(btrim(address)) between 20 and 1200),
 is_default boolean not null default false, created_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses(user_id,created_at);
create unique index customer_addresses_one_default on public.customer_addresses(user_id) where is_default;
alter table public.customer_addresses enable row level security;
create policy address_owner_read on public.customer_addresses for select to authenticated using(user_id=auth.uid());
revoke all on public.customer_addresses from anon,authenticated;
grant select on public.customer_addresses to authenticated;
create function public.save_address(p_id uuid,p_label text,p_recipient text,p_phone text,p_address text,p_default boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare n integer; result uuid; make_default boolean;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform pg_advisory_xact_lock(hashtextextended('address:'||auth.uid()::text,0));
 if p_id is not null and not exists(select 1 from customer_addresses where id=p_id and user_id=auth.uid()) then raise exception 'ไม่มีสิทธิ์แก้ไขที่อยู่นี้'; end if;
 select count(*) into n from customer_addresses where user_id=auth.uid();
 if p_id is null and n>=5 then raise exception 'บันทึกได้สูงสุด 5 ที่อยู่ กรุณาแก้ไขหรือลบที่อยู่เดิมก่อน'; end if;
 make_default=coalesce(p_default,false) or n=0 or exists(select 1 from customer_addresses where id=p_id and user_id=auth.uid() and is_default);
 if make_default then update customer_addresses set is_default=false where user_id=auth.uid() and is_default; end if;
 if p_id is null then
  insert into customer_addresses(user_id,label,recipient,phone,address,is_default) values(auth.uid(),btrim(p_label),btrim(p_recipient),btrim(p_phone),btrim(p_address),make_default) returning id into result;
 else
  update customer_addresses set label=btrim(p_label),recipient=btrim(p_recipient),phone=btrim(p_phone),address=btrim(p_address),is_default=make_default where id=p_id and user_id=auth.uid() returning id into result;
 end if;
 return result;
end $$;
create function public.delete_address(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare was_default boolean;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform pg_advisory_xact_lock(hashtextextended('address:'||auth.uid()::text,0));
 delete from customer_addresses where id=p_id and user_id=auth.uid() returning is_default into was_default;
 if not found then raise exception 'ไม่มีสิทธิ์ลบที่อยู่นี้'; end if;
 if was_default then update customer_addresses set is_default=true where id=(select id from customer_addresses where user_id=auth.uid() order by created_at,id limit 1); end if;
end $$;
create table public.order_shipping_updates (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 message text not null check(length(btrim(message)) between 1 and 1000),
 image_paths text[] not null default '{}' check(cardinality(image_paths)<=4 and array_position(image_paths,null) is null),
 created_at timestamptz not null default now()
);
create index shipping_updates_order_idx on public.order_shipping_updates(order_id,created_at desc);
alter table public.order_shipping_updates enable row level security;
create policy shipping_update_read on public.order_shipping_updates for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
revoke all on public.order_shipping_updates from anon,authenticated;
grant select on public.order_shipping_updates to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('shipping-updates','shipping-updates',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy shipping_photo_insert on storage.objects for insert to authenticated with check(bucket_id='shipping-updates' and public.is_admin() and exists(select 1 from public.orders o where o.id::text=(storage.foldername(name))[1] and o.status in ('paid','shipped','delivered')));
create policy shipping_photo_read on storage.objects for select to authenticated using(bucket_id='shipping-updates' and (public.is_admin() or exists(select 1 from public.order_shipping_updates u join public.orders o on o.id=u.order_id where o.user_id=auth.uid() and storage.objects.name=any(u.image_paths))));
create function public.add_shipping_update(p_order_id uuid,p_message text,p_images text[]) returns uuid language plpgsql security definer set search_path=public as $$
declare o orders; path text; images text[]=coalesce(p_images,'{}'); result uuid; body text=btrim(coalesce(p_message,''));
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 select * into o from orders where id=p_order_id for update;
 if not found or o.status not in ('paid','shipped','delivered') then raise exception 'เพิ่มอัปเดตได้หลังยืนยันการชำระเงินเท่านั้น'; end if;
 if cardinality(images)>4 or array_position(images,null) is not null or length(coalesce(p_message,''))>1000 or (body='' and cardinality(images)=0) then raise exception 'ระบุข้อความ หรือแนบรูปไม่เกิน 4 รูป พร้อมข้อความไม่เกิน 1,000 ตัวอักษร'; end if;
 foreach path in array images loop
  if path !~ ('^'||o.id::text||'/[0-9a-f-]{36}\.(jpeg|png|webp)$') or not exists(select 1 from storage.objects where bucket_id='shipping-updates' and name=path) then raise exception 'ไม่พบรูปของคำสั่งซื้อนี้ หรือรูปไม่ถูกต้อง'; end if;
 end loop;
 insert into order_shipping_updates(order_id,message,image_paths) values(o.id,coalesce(nullif(body,''),'อัปเดตการจัดส่งจากร้าน'),images) returning id into result;
 return result;
end $$;
-- Status and the published update commit atomically; upload bytes happen first.
create function public.ship_order_with_update(p_order_id uuid,p_tracking text,p_message text,p_images text[]) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'สำหรับเจ้าของร้านเท่านั้น'; end if;
 perform public.transition_order(p_order_id,'shipped',p_tracking);
 perform public.add_shipping_update(p_order_id,coalesce(nullif(btrim(p_message),''),'จัดส่งสินค้าแล้ว เลขติดตาม: '||btrim(p_tracking)),p_images);
end $$;
revoke all on function public.save_profile(text,text,text,text,integer,text),public.save_address(uuid,text,text,text,text,boolean),public.delete_address(uuid),public.add_shipping_update(uuid,text,text[]),public.ship_order_with_update(uuid,text,text,text[]) from public,anon;
grant execute on function public.save_profile(text,text,text,text,integer,text),public.save_address(uuid,text,text,text,text,boolean),public.delete_address(uuid),public.add_shipping_update(uuid,text,text[]),public.ship_order_with_update(uuid,text,text,text[]) to authenticated;
