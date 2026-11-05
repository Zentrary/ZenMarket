-- Execute as postgres on the ZenMarket project. All fixtures/settings roll back.
begin;
select set_config('test.customer',(select id::text from public.profiles where username='zenuser'),true);
select set_config('test.owner',(select user_id::text from public.store_admin where singleton),true);
set local role anon;
do $$ begin
 if public.get_storefront() ?| array['promptpay_id','recipient_name'] then raise exception 'Private payment details leaked'; end if;
 if (select count(*) from public.store_settings)<>0 then raise exception 'Anonymous private settings access'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ declare n integer; begin
 begin insert into public.categories(name) values('Forbidden category'); raise exception 'Customer created category'; exception when insufficient_privilege then null; end;
 update public.store_settings set shop_name='FORBIDDEN' where singleton; get diagnostics n=row_count;
 if n<>0 then raise exception 'Customer changed store settings'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
insert into public.categories(name) values('__test_custom_category__');
insert into public.products(id,name,sku,category,price,image_url,stock) values('a4000000-0000-4000-8000-000000000001','Custom category test','TEST-CUSTOM-ROLLBACK','__test_custom_category__',390,'/images/placeholder.svg',10);
update public.categories set name='__test_renamed_category__' where name='__test_custom_category__';
do $$ begin
 if (select category from public.products where sku='TEST-CUSTOM-ROLLBACK')<>'__test_renamed_category__' then raise exception 'Category rename did not cascade'; end if;
 begin delete from public.categories where name='__test_renamed_category__'; raise exception 'Deleted occupied category'; exception when foreign_key_violation then null; end;
 begin insert into public.products(name,sku,category,price,image_url,stock) values('Invalid','TEST-INVALID','__missing_category__',1,'/images/placeholder.svg',1); raise exception 'Unknown category accepted'; exception when foreign_key_violation then null; end;
end $$;
update public.store_settings set shop_name='Test store',tagline='A test',shipping_fee=75,free_shipping_threshold=500,promptpay_id='0812345678',recipient_name='TEST ONLY' where singleton;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ declare a public.orders; b public.orders; begin
 a=public.create_order('[{"id":"a4000000-0000-4000-8000-000000000001","quantity":1,"price":1}]','{"recipient":"Test customer","phone":"0812345678","address":"99 ถนนสุขุมวิท กรุงเทพมหานคร 10110"}',gen_random_uuid());
 if a.shipping<>75 or a.total<>465 then raise exception 'Custom shipping not calculated by server'; end if;
 b=public.create_order('[{"id":"a4000000-0000-4000-8000-000000000001","quantity":2}]','{"recipient":"Test customer","phone":"0812345678","address":"99 ถนนสุขุมวิท กรุงเทพมหานคร 10110"}',gen_random_uuid());
 if b.shipping<>0 or b.total<>780 then raise exception 'Custom free shipping threshold failed'; end if;
 if public.get_storefront()->>'shop_name'<>'Test store' then raise exception 'Public branding read failed'; end if;
 perform public.transition_order(a.id,'cancelled');perform public.transition_order(b.id,'cancelled');
end $$;
reset role;
select 'PASS: public/private settings isolation, admin-only category/settings changes, custom category FK and rename cascade, occupied-category protection, server custom shipping and free threshold' as result;
rollback;
