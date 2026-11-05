-- Real PostgreSQL or Supabase SQL editor, as postgres. Never commits test data.
begin;
select set_config('test.owner',(select user_id::text from public.store_admin where singleton),true);
select set_config('test.owner_username',(select username from public.profiles where id=current_setting('test.owner')::uuid),true);
select set_config('test.customer',(select id::text from public.profiles where username='zenuser'),true);
insert into public.categories(name) values('__delivery_fixture__');
insert into public.products(id,name,sku,category,price,image_url,stock) values('a6000000-0000-4000-8000-000000000001','Last item fixture','TEST-DELIVERY','__delivery_fixture__',100,'/images/placeholder.svg',1);
update public.store_settings set shipping_fee=50,free_shipping_threshold=1000,promptpay_id='0812345678',recipient_name='TEST ONLY' where singleton;
set local role anon;
do $$ begin
 begin perform public.save_profile('Test','User','Test','0812345678',25,'guest_update'); raise exception 'FAIL: anonymous profile write'; exception when insufficient_privilege then null; end;
 begin perform * from public.customer_addresses; raise exception 'FAIL: anonymous address read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ declare a public.customer_addresses; new_id uuid; n integer; o public.orders; begin
 begin update public.profiles set first_name='BAD' where id=auth.uid(); raise exception 'FAIL: direct profile write'; exception when insufficient_privilege then null; end;
 perform public.save_profile('Updated','Customer','Nickname','0891234567',30,'qa_'||substr(replace(gen_random_uuid()::text,'-',''),1,16));
 if public.is_admin() or not exists(select 1 from public.profiles where id=auth.uid() and first_name='Updated') then raise exception 'FAIL: self profile save/privilege'; end if;
 begin perform public.save_profile('Updated','Customer','Nickname','0891234567',30,current_setting('test.owner_username')); raise exception 'FAIL: duplicate username'; exception when unique_violation then null; end;
 for n in 1..5 loop new_id=public.save_address(null,'Home '||n,'Test recipient','0812345678','99 ถนนสุขุมวิท กรุงเทพมหานคร 10110',n=2); end loop;
 if (select count(*) from public.customer_addresses)<>5 or (select count(*) from public.customer_addresses where is_default)<>1 then raise exception 'FAIL: address limit/default'; end if;
 begin perform public.save_address(null,'Sixth','Test','0812345678','99 ถนนสุขุมวิท กรุงเทพมหานคร 10110',true); raise exception 'FAIL: sixth address accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 select * into a from public.customer_addresses where is_default;
 perform set_config('test.address',a.id::text,true);
 o=public.create_order('[{"id":"a6000000-0000-4000-8000-000000000001","quantity":1}]',jsonb_build_object('recipient',a.recipient,'phone',a.phone,'address',a.address),gen_random_uuid());
 perform set_config('test.order',o.id::text,true);
 if (select stock from public.products where id='a6000000-0000-4000-8000-000000000001')<>0 then raise exception 'FAIL: last item stock'; end if;
 perform public.save_address(a.id,'Edited home','Changed recipient','0891234567','100 ถนนสีลม กรุงเทพมหานคร 10500',true);
 perform public.delete_address(a.id);
 if (select count(*) from public.customer_addresses)<>4 or (select count(*) from public.customer_addresses where is_default)<>1 then raise exception 'FAIL: delete promotes default'; end if;
 if not exists(select 1 from public.orders where id=o.id and recipient='Test recipient' and address='99 ถนนสุขุมวิท กรุงเทพมหานคร 10110') then raise exception 'FAIL: address/profile edits changed order snapshot'; end if;
 begin insert into public.customer_addresses(user_id,label,recipient,phone,address) values(auth.uid(),'Direct','Test','0812345678','99 ถนนสุขุมวิท กรุงเทพมหานคร 10110'); raise exception 'FAIL: direct address insertion bypass'; exception when insufficient_privilege then null; end;
 begin insert into public.order_shipping_updates(order_id,message) values(o.id,'Fake update'); raise exception 'FAIL: customer update insertion'; exception when insufficient_privilege then null; end;
 begin perform public.add_shipping_update(o.id,'Fake update','{}'); raise exception 'FAIL: customer shipping RPC'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 perform set_config('test.address_other',(select id::text from public.customer_addresses limit 1),true);
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.customer_addresses)<>0 then raise exception 'FAIL: owner reads customer address book'; end if;
 begin perform public.delete_address(current_setting('test.address_other')::uuid); raise exception 'FAIL: cross-user address deletion'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.save_address(current_setting('test.address_other')::uuid,'Other','Test','0812345678','99 ถนนสุขุมวิท กรุงเทพมหานคร 10110',true); raise exception 'FAIL: cross-user address edit'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.create_order('[{"id":"a6000000-0000-4000-8000-000000000001","quantity":1}]','{"recipient":"Another buyer","phone":"0812345678","address":"99 ถนนสุขุมวิท กรุงเทพมหานคร 10110"}',gen_random_uuid()); raise exception 'FAIL: last-item oversell'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
update public.orders set status='review' where id=current_setting('test.order')::uuid;
select set_config('test.path',current_setting('test.order')||'/a6000000-0000-4000-8000-000000000002.png',true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
select public.transition_order(current_setting('test.order')::uuid,'paid');
-- Metadata-only upload fixture: no live file bytes. Rolled back below.
insert into storage.objects(bucket_id,name) values('shipping-updates',current_setting('test.path'));
do $$ begin
 begin perform public.ship_order_with_update(current_setting('test.order')::uuid,'TH123','Invalid proof',array['wrong-order.png']); raise exception 'FAIL: invalid proof accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 if (select status from public.orders where id=current_setting('test.order')::uuid)<>'paid' then raise exception 'FAIL: shipment not atomic'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='shipping-updates' and name=current_setting('test.path')) then raise exception 'FAIL: unpublished upload visible to customer'; end if;
 begin insert into storage.objects(bucket_id,name) values('shipping-updates',current_setting('test.order')||'/a6000000-0000-4000-8000-000000000003.png'); raise exception 'FAIL: customer shipping upload'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
select public.ship_order_with_update(current_setting('test.order')::uuid,'TH123','ส่งพัสดุแล้ว',array[current_setting('test.path')]);
do $$ begin
 begin perform public.add_shipping_update(current_setting('test.order')::uuid,'Too many',array_fill(current_setting('test.path'),array[5])); raise exception 'FAIL: five photos accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.add_shipping_update(current_setting('test.order')::uuid,repeat('x',1001),'{}'); raise exception 'FAIL: oversized update'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.order_shipping_updates where order_id=current_setting('test.order')::uuid)<>1 then raise exception 'FAIL: own shipping feed'; end if;
 if not exists(select 1 from storage.objects where bucket_id='shipping-updates' and name=current_setting('test.path')) then raise exception 'FAIL: own published shipping photo'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.order_shipping_updates where order_id=current_setting('test.order')::uuid) or exists(select 1 from storage.objects where bucket_id='shipping-updates' and name=current_setting('test.path')) then raise exception 'FAIL: other customer sees delivery proof'; end if;
end $$;
reset role;
do $$ begin if (select public from storage.buckets where id='shipping-updates') then raise exception 'FAIL: delivery bucket is public'; end if; end $$;
select 'PASS: self-only profile editing, five-address cap/default/ownership/snapshot isolation, last-item stock/oversell, admin-only atomic shipment proof, private published-photo access and cross-customer isolation' as result;
rollback;
