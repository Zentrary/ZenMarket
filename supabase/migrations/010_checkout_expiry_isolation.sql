-- Keep scheduled expiry in its own transaction. Running the sweep inside checkout
-- would hold its shared heartbeat row until checkout finishes, and could invert
-- heartbeat/product locks against a concurrent cron sweep. Deadlocks roll back
-- safely, but should not interrupt legitimate purchases. Cron already runs each
-- minute; stock release can lag its deadline until the next successful sweep.
create or replace function public.create_order(cart jsonb,delivery jsonb,request_key uuid) returns public.orders language plpgsql security definer set search_path=public as $$
declare existing orders;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from orders where user_id=auth.uid() and request_id=request_key;
 if found then return existing; end if;
 if (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '15 minutes')>=3 or (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '24 hours')>=20 then
  raise exception 'สร้างคำสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ (สูงสุด 3 ครั้งต่อ 15 นาที และ 20 ครั้งต่อวัน)';
 end if;
 return public.create_order_reserved_internal(cart,delivery,request_key);
end $$;
revoke all on function public.create_order(jsonb,jsonb,uuid) from public,anon;
grant execute on function public.create_order(jsonb,jsonb,uuid) to authenticated;
