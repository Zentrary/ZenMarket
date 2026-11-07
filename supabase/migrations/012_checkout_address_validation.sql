-- Normalize and validate checkout delivery values before the orders row is inserted.
-- This turns the low-level orders_address_check failure into an actionable message
-- and prevents whitespace-only values from reaching the database constraint.
create or replace function public.create_order(cart jsonb, delivery jsonb, request_key uuid)
returns public.orders
language plpgsql
security definer
set search_path=public
as $$
declare
 existing orders;
 clean_delivery jsonb;
 address_value text;
 recipient_value text;
 phone_value text;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from orders where user_id=auth.uid() and request_id=request_key;
 if found then return existing; end if;

 if jsonb_typeof(delivery) is distinct from 'object' then
  raise exception 'ข้อมูลที่อยู่จัดส่งไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
 end if;
 address_value=btrim(coalesce(delivery->>'address',''));
 recipient_value=btrim(coalesce(delivery->>'recipient',''));
 phone_value=btrim(coalesce(delivery->>'phone',''));
 if length(address_value) not between 20 and 1200 then
  raise exception 'กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน (20–1,200 ตัวอักษร)';
 end if;
 if length(recipient_value) not between 2 and 150 then
  raise exception 'กรุณากรอกชื่อผู้รับให้ถูกต้อง';
 end if;
 if phone_value !~ '^0[0-9]{9}$' then
  raise exception 'กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง';
 end if;
 clean_delivery=jsonb_build_object(
  'address',address_value,
  'recipient',recipient_value,
  'phone',phone_value
 );

 if (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '15 minutes')>=3
 or (select count(*) from orders where user_id=auth.uid() and created_at>now()-interval '24 hours')>=20 then
  raise exception 'สร้างคำสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ (สูงสุด 3 ครั้งต่อ 15 นาที และ 20 ครั้งต่อวัน)';
 end if;
 return public.create_order_reserved_internal(cart,clean_delivery,request_key);
end $$;
revoke all on function public.create_order(jsonb,jsonb,uuid) from public,anon;
grant execute on function public.create_order(jsonb,jsonb,uuid) to authenticated;
