-- Run against the isolated ZenMarket test project as postgres. Always rolls back.
-- Requires the two test profiles and catalogue. Never configures a real receiver.
begin;
select set_config('test.user_id',(select id::text from public.profiles where username='zenuser'),true);
select set_config('test.admin_id',(select id::text from public.profiles where username='zenadmin'),true);
update public.store_settings set promptpay_id='0812345678',recipient_name='TEST ONLY';
set local role anon;
do $$ begin
 if (select count(*) from public.products)<1 then raise exception 'Public catalogue missing'; end if;
 begin perform * from public.orders; raise exception 'FAIL: anonymous read orders'; exception when insufficient_privilege then null; end;
 begin perform public.login_email('zenadmin'); raise exception 'FAIL: public email lookup'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
set local role authenticated;
do $$ declare o public.orders; replay public.orders; n integer; before_stock integer; begin
 if public.is_admin() then raise exception 'FAIL: customer is admin'; end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL: private profiles'; end if;
 begin insert into public.store_admin(user_id) values(auth.uid()); raise exception 'FAIL: privilege escalation'; exception when insufficient_privilege then null; end;
 begin insert into public.products(name,sku,category,price,image_url,stock) values('Bad','BAD','แฟชั่น',1,'/images/bag.svg',1); raise exception 'FAIL: customer sells products'; exception when insufficient_privilege then null; end;
 select stock into before_stock from public.products where sku='ZM-BAG-001';
 o=public.create_order('[{"id":"a1000000-0000-4000-8000-000000000001","quantity":1,"price":1,"total":1}]','{"recipient":"ทดสอบระบบ","phone":"0812345678","address":"99 ถนนสุขุมวิท กรุงเทพมหานคร 10110"}','a2000000-0000-4000-8000-000000000001');
 if o.total<>440 or o.subtotal<>390 then raise exception 'FAIL: price tampering'; end if;
 select stock into n from products where sku='ZM-BAG-001';
 if n<>before_stock-1 then raise exception 'FAIL: stock not reserved'; end if;
 replay=public.create_order('[{"id":"a1000000-0000-4000-8000-000000000001","quantity":1}]','{}','a2000000-0000-4000-8000-000000000001');
 if replay.id<>o.id then raise exception 'FAIL: idempotency'; end if;
 select stock into n from products where sku='ZM-BAG-001';
 if n<>before_stock-1 then raise exception 'FAIL: duplicate reservation'; end if;
 begin perform public.transition_order(o.id,'paid'); raise exception 'FAIL: customer marked paid'; exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
 begin perform public.create_order(null,'{}',gen_random_uuid()); raise exception 'FAIL: null cart accepted'; exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
 begin perform public.create_order('[{"id":"a1000000-0000-4000-8000-000000000001","quantity":999}]','{}',gen_random_uuid()); raise exception 'FAIL: oversell'; exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
 perform public.transition_order(o.id,'cancelled');
 select stock into n from products where sku='ZM-BAG-001';
 if n<>before_stock then raise exception 'FAIL: cancellation stock restore'; end if;
 begin perform public.transition_order(o.id,'cancelled'); raise exception 'FAIL: double cancellation'; exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin if (select count(*) from public.orders)<>0 or (select count(*) from public.profiles)<>0 then raise exception 'FAIL: cross-user data leak'; end if; end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin_id'),true);
set local role authenticated;
do $$ begin if not public.is_admin() then raise exception 'FAIL: admin missing'; end if; if (select count(*) from public.store_settings)<>1 then raise exception 'FAIL: settings admin access'; end if; end $$;
reset role;
select 'PASS: anonymous permissions, profile/order isolation, admin role, privilege escalation prevention, server prices, stock reservation, idempotency, oversell rejection, cancellation restore' as result;
rollback;
