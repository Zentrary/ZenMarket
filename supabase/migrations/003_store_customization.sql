-- Preserve all existing products, accounts, orders and payment details.
create table public.categories (
 name text primary key check(length(name) between 1 and 80 and name=btrim(name) and name<>'ทั้งหมด'),
 created_at timestamptz not null default now()
);
create unique index categories_name_ci on public.categories(lower(name));
insert into public.categories(name) select distinct category from public.products on conflict do nothing;
insert into public.categories(name) values('ไลฟ์สไตล์'),('ของแต่งบ้าน'),('แก็ดเจ็ต'),('แฟชั่น') on conflict do nothing;
alter table public.categories enable row level security;
create policy categories_read on public.categories for select using(true);
create policy categories_admin on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.categories to anon,authenticated;
grant insert,update,delete on public.categories to authenticated;
alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_fk foreign key(category) references public.categories(name) on update cascade on delete restrict;
alter table public.store_settings
 add column shop_name text not null default 'ZenMarket' check(length(btrim(shop_name)) between 1 and 80),
 add column tagline text not null default 'ร้านค้าออนไลน์ ดูแลโดยเจ้าของร้านโดยตรง' check(length(tagline)<=200),
 add column logo_url text not null default '' check(logo_url='' or (logo_url ~ '^https://' and length(logo_url)<=1000)),
 add column contact_email text not null default '' check(length(contact_email)<=254),
 add column contact_phone text not null default '' check(length(contact_phone)<=30),
 add column contact_address text not null default '' check(length(contact_address)<=1000),
 add column about_text text not null default 'ร้านค้าออนไลน์ ดูแลทุกคำสั่งซื้อโดยเจ้าของร้านโดยตรง' check(length(about_text)<=3000),
 add column shipping_note text not null default 'จัดส่งภายใน 2–5 วันทำการหลังตรวจสอบการชำระเงิน' check(length(shipping_note)<=500),
 add column shipping_fee numeric(10,2) not null default 50 check(shipping_fee between 0 and 10000),
 add column free_shipping_threshold numeric(12,2) not null default 1000 check(free_shipping_threshold between 1 and 1000000);
-- Explicit public allowlist: private PromptPay ID/name never appear in this response.
create function public.get_storefront() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('shop_name',shop_name,'tagline',tagline,'logo_url',logo_url,'contact_email',contact_email,'contact_phone',contact_phone,'contact_address',contact_address,'about_text',about_text,'shipping_note',shipping_note,'shipping_fee',shipping_fee,'free_shipping_threshold',free_shipping_threshold) from store_settings where singleton
$$;
revoke all on function public.get_storefront() from public;
grant execute on function public.get_storefront() to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('store-assets','store-assets',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy store_assets_read on storage.objects for select using(bucket_id='store-assets');
create policy store_assets_admin on storage.objects for all to authenticated using(bucket_id='store-assets' and public.is_admin()) with check(bucket_id='store-assets' and public.is_admin());
-- Upgrade both the local formatted definition and the existing live definition.
do $$ declare definition text; begin
 select pg_get_functiondef('public.create_order(jsonb,jsonb,uuid)'::regprocedure) into definition;
 definition=replace(definition,'fee=case when amount>=1000 then 0 else 50 end','fee=case when amount>=cfg.free_shipping_threshold then 0 else cfg.shipping_fee end');
 if definition not like '%amount>=cfg.free_shipping_threshold%' then raise exception 'Checkout shipping patch did not match'; end if;
 execute definition;
end $$;
