-- Run as postgres; every fixture/setting/status change is rolled back.
begin;
select set_config('test.owner',(select user_id::text from public.store_admin where singleton),true);
select set_config('test.customer',(select id::text from public.profiles where username='zenuser'),true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select set_config('test.baseline',public.get_admin_dashboard()::text,true);
insert into public.categories(name) values('__experience_test__');
insert into public.products(id,name,sku,category,price,stock,image_url,image_urls) values('a5000000-0000-4000-8000-000000000001','Experience fixture','TEST-EXPERIENCE','__experience_test__',250,5,'/images/placeholder.svg',array['/images/placeholder.svg','https://example.com/back.png']);
update public.store_settings set shipping_fee=75,free_shipping_threshold=500,promptpay_id='0812345678',recipient_name='TEST ONLY',facebook_url='https://www.facebook.com/test',instagram_url='https://www.instagram.com/test',line_url='https://line.me/ti/p/@test' where singleton;
set local role anon;
do $$ begin
 begin perform * from public.products; raise exception 'FAIL: guest catalogue access'; exception when insufficient_privilege then null; end;
 begin perform rating from public.product_reviews; raise exception 'FAIL: guest reviews access'; exception when insufficient_privilege then null; end;
 if public.get_storefront() ?| array['promptpay_id','recipient_name'] then raise exception 'FAIL: private settings leak'; end if;
 if public.get_storefront()->>'line_url'<>'https://line.me/ti/p/@test' then raise exception 'FAIL: public social settings'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
do $$ declare o public.orders; begin
 if not exists(select 1 from public.products where sku='TEST-EXPERIENCE') then raise exception 'FAIL: member catalogue'; end if;
 begin perform public.get_admin_dashboard(); raise exception 'FAIL: customer dashboard'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin insert into public.product_reviews(order_id,product_id,reviewer_name,product_name,rating) values(gen_random_uuid(),gen_random_uuid(),'fake','fake',5); raise exception 'FAIL: direct review insert'; exception when insufficient_privilege then null; end;
 begin perform order_id from public.product_reviews; raise exception 'FAIL: private order ID exposed'; exception when insufficient_privilege then null; end;
 o=public.create_order('[{"id":"a5000000-0000-4000-8000-000000000001","quantity":1,"price":1}]','{"recipient":"Test customer","phone":"0812345678","address":"99 ถนนสุขุมวิท กรุงเทพมหานคร 10110"}',gen_random_uuid());
 perform set_config('test.order',o.id::text,true);
 if o.total<>325 then raise exception 'FAIL: authoritative shipping'; end if;
 begin perform public.save_review(o.id,'a5000000-0000-4000-8000-000000000001',5,'Too early'); raise exception 'FAIL: premature review'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.transition_order(o.id,'delivered'); raise exception 'FAIL: early delivery'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.transition_order(o.id,'paid'); raise exception 'FAIL: self approval'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
-- Simulate slip-review precondition only, without uploading or changing real files.
update public.orders set status='review' where id=current_setting('test.order')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
select public.transition_order(current_setting('test.order')::uuid,'paid');
do $$ begin
 begin perform public.transition_order(current_setting('test.order')::uuid,'shipped',''); raise exception 'FAIL: empty tracking'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select public.transition_order(current_setting('test.order')::uuid,'shipped','TH123456789');
do $$ begin
 begin perform public.transition_order(current_setting('test.order')::uuid,'delivered'); raise exception 'FAIL: admin impersonated receipt'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
select public.transition_order(current_setting('test.order')::uuid,'delivered');
do $$ declare o public.orders; begin
 select * into o from public.orders where id=current_setting('test.order')::uuid;
 if o.delivered_at is null or o.shipped_at is null or o.paid_at is null then raise exception 'FAIL: transition timestamps'; end if;
 begin perform public.transition_order(o.id,'delivered'); raise exception 'FAIL: double receipt'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.save_review(o.id,gen_random_uuid(),5,'wrong product'); raise exception 'FAIL: unrelated product review'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.save_review(o.id,'a5000000-0000-4000-8000-000000000001',6,'invalid'); raise exception 'FAIL: invalid rating'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.save_review(o.id,'a5000000-0000-4000-8000-000000000001',5,repeat('x',2001)); raise exception 'FAIL: oversized review'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 perform public.save_review(o.id,'a5000000-0000-4000-8000-000000000001',5,'Great');
 perform public.save_review(o.id,'a5000000-0000-4000-8000-000000000001',4,'Updated review');
 if jsonb_array_length(public.get_order_reviews(o.id))<>1 then raise exception 'FAIL: duplicate review'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 begin perform public.get_order_reviews(current_setting('test.order')::uuid); raise exception 'FAIL: cross-user review order leak'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.save_review(current_setting('test.order')::uuid,'a5000000-0000-4000-8000-000000000001',1,'Impersonation'); raise exception 'FAIL: other user review'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
delete from public.products where sku='TEST-EXPERIENCE';
do $$ declare d jsonb; baseline jsonb=current_setting('test.baseline')::jsonb; begin
 d=public.get_admin_dashboard();
 if (d->>'revenue')::numeric<>(baseline->>'revenue')::numeric+325 or (d->>'units_sold')::integer<>(baseline->>'units_sold')::integer+1 then raise exception 'FAIL: dashboard totals'; end if;
 if (d->>'review_count')::integer<>(baseline->>'review_count')::integer+1 then raise exception 'FAIL: review history deleted'; end if;
 if not exists(select 1 from public.orders where id=current_setting('test.order')::uuid and items->0->>'name'='Experience fixture') then raise exception 'FAIL: order history deleted'; end if;
end $$;
reset role;
select 'PASS: member-only catalogue, safe social settings, owner-only dashboard, private order ID protection, verified-purchase reviews, receipt permissions/timestamps, review validation/upsert/isolation, deletion preserves history and authoritative sales totals' as result;
rollback;
