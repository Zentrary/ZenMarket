# ZenMarket

ทดสอบเว็บ: https://zenmarket-blue.vercel.app · หลังบ้าน: https://zenmarket-blue.vercel.app/#/admin

เว็บใช้ดีไซน์เรียบง่าย โทนขาว–น้ำเงิน–เทา ร้านเริ่มต้นที่ **0 สินค้า** และจะแสดงเฉพาะสินค้าที่เจ้าของร้านเพิ่มเอง ยังต้องตั้ง PromptPay จริง, Custom SMTP และข้อมูลนโยบาย/ติดต่อก่อนเปิดขายจริง

ร้านค้าเจ้าของคนเดียว ภาษาไทย — HTML + CSS + JavaScript (Vanilla / Vite), Supabase Auth/PostgreSQL/Storage/Edge Functions และ Vercel ไม่ใช้ React หรือระบบ marketplace

## ฟีเจอร์

- หน้าร้าน responsive โทนขาว–น้ำเงิน–เทา ใช้ Prompt แบบ self-hosted ลดภาพ/ข้อความตกแต่ง และใช้ปุ่มกับเมนูที่ชัดเจน
- แค็ตตาล็อก ค้นหาชื่อ/รหัสสินค้า กรองหมวด เรียงราคา รายละเอียดสินค้า รายการโปรด
- ตะกร้าเก็บในเบราว์เซอร์ ปรับจำนวน/ลบสินค้า ค่าจัดส่ง 50 บาท ฟรีเมื่อสินค้า ≥ 1,000 บาท
- สมัครชื่อจริง นามสกุล ชื่อเล่น เบอร์ อายุ 13–120 ปี username รหัสผ่าน ยืนยันรหัส และอีเมล
- Login ด้วย username หรือ email, ยืนยันอีเมล, ขอรีเซ็ตรหัสผ่าน, เปลี่ยนรหัสผ่าน
- Admin คนเดียว: เพิ่ม/แก้ไข/ซ่อนสินค้า, SKU ไม่ซ้ำ, หมวด, ราคา, รูปภาพอัปโหลด, สต็อก, บัญชี PromptPay
- คำสั่งซื้อ: ที่อยู่, QR ตามยอด, ดาวน์โหลด QR, อัปโหลดสลิป private, admin ตรวจยอดจริง, จัดส่ง/เลขพัสดุ, ประวัติ

## เริ่มในเครื่อง

```sh
npm ci
cp .env.example .env
# ตั้ง public URL และ publishable/anon key ของ Supabase ใน .env
npm run dev
npm run build
npm test
```

Dev server bind `0.0.0.0:5173` และอนุญาต Arena preview host `.e2b.app` ไม่มี frontend API ที่เรียก localhost ข้ามบริการ หากไม่ตั้ง env จะแสดงร้านว่าง (0 สินค้า) พร้อมป้ายเตือน และไม่อนุญาต auth/สั่งซื้อ ไม่มีการเติมสินค้าตัวอย่างอัตโนมัติ

## Supabase

โปรเจกต์ที่สร้างแยก: `zenmarket` (`njjrgklfjwgmtcoefctc`, Singapore, free) ไม่เปลี่ยนข้อมูลโปรเจกต์บุฟเฟต์เดิม

สำหรับติดตั้งใหม่:

1. สำหรับติดตั้งใหม่ รัน `supabase/migrations/001_store.sql` ใน SQL editor ฐานข้อมูลจะเริ่มต้นที่ **0 สินค้า**; `supabase/seed.sql` ตั้งใจเว้นว่าง สำหรับฐานเดิมรัน `002_remove_demo_products.sql` หนึ่งครั้งเพื่อลบเฉพาะสินค้าเดโมเดิม 8 รายการ โดยตรวจ ID + SKU + รูปเดิม ไม่ลบสินค้าที่เจ้าของเพิ่มเอง
2. Deploy `supabase/functions/username-login/index.ts` เป็น `username-login` โดย `verify_jwt = false` เนื่องจากใช้ก่อน login ตัว function จำกัดการลองด้วยฐานข้อมูล (ต่อ IP hash และชื่อผู้ใช้ 15 ครั้ง/15 นาที) ไม่ส่งอีเมลจาก username กลับ browser และคืนข้อผิดพลาดรวม
3. Edge runtime ใช้ `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ที่แพลตฟอร์มตั้งให้ **ห้าม** ใส่ service key ใน Vite env, browser หรือ Git
4. เปิด email auth และ email confirmation, ปิด anonymous signup; ตั้ง Site URL และ Redirect URLs ตรง deployment ที่อนุญาต พร้อมเปิด refresh token rotation
5. **ก่อนให้คนทั่วไปสมัคร ต้องตั้ง Custom SMTP** ค่าเริ่มต้นของ Supabase จำกัดอีเมลเฉพาะผู้รับที่อนุญาตและจำกัดจำนวน การส่ง confirmation/recovery ให้คนนอกทีมจึงยังไม่พร้อม ต้องทดสอบส่งจริงหลังตั้ง SMTP
6. เปิด CAPTCHA และตั้งรหัสผ่านขั้นต่ำ ≥12 ตัวใน Auth dashboard (หน้าเว็บตรวจ 12 ตัว/อักษร+ตัวเลขแล้ว แต่ Auth ค่าเริ่มต้นฐานโปรเจกต์ยังขั้นต่ำ 6 และ connector เปลี่ยนค่านี้ไม่ได้)
7. สมาชิกที่สร้างปกติไม่มีสิทธิ์ขายสินค้า กำหนดเจ้าของร้านจาก trusted SQL เพียงคนเดียว หลังสมัครและยืนยันอีเมล:

```sql
insert into public.store_admin(singleton,user_id)
select true,id from auth.users where email = 'YOUR_VERIFIED_OWNER_EMAIL'
on conflict(singleton) do update set user_id=excluded.user_id;
```

การเปลี่ยนเจ้าของต้องทำผ่าน Supabase โดยเจ้าของโปรเจกต์ ไม่เปิดให้แก้ role จาก browser/metadata

### บัญชี Admin สำหรับเจ้าของร้าน

| รายการ | ข้อมูล |
| --- | --- |
| ชื่อผู้ใช้ | `zenadmin` |
| อีเมลบัญชีทดสอบ | `admin@zenmarket.example` |
| หน้าเข้าสู่ระบบ | https://zenmarket-blue.vercel.app/#/login |
| ระบบหลังบ้าน | https://zenmarket-blue.vercel.app/#/admin |
| รหัสผ่าน | ไม่เผยแพร่ใน GitHub; ใช้รหัสที่ส่งให้เจ้าของร้านเป็นการส่วนตัว |

**Repository นี้เป็นสาธารณะ ห้ามเพิ่มรหัสผ่านที่ยังใช้งานได้, token, service key หรือ session ลง README/โค้ด/ประวัติ Git** บุคคลทั่วไปไม่ควรได้รับสิทธิ์จัดการร้านผ่านรหัสที่เปิดเผย

บัญชีทดสอบใช้โดเมน `.example` จึงรับเมลกู้รหัสไม่ได้ หากจำรหัสไม่ได้ ให้เจ้าของโปรเจกต์เปลี่ยนอีเมลเป็นอีเมลจริงผ่าน Supabase Dashboard → Authentication → Users แล้วส่งลิงก์ reset หลังตั้ง Custom SMTP หรือสร้างบัญชีที่ยืนยันอีเมลแล้วและย้ายสิทธิ์ด้วย SQL ด้านบน **เปลี่ยนรหัสและอีเมลก่อนเปิดขายจริง** หลังย้ายสิทธิ์และเก็บข้อมูลที่จำเป็นแล้ว ให้ลบบัญชีทดสอบใน dashboard

### เพิ่มสินค้าชิ้นแรก

1. เข้าสู่ระบบด้วยแอดมิน → หลังบ้าน → สินค้า
2. กด **เพิ่มสินค้า** แล้วระบุชื่อ รหัสสินค้า หมวดหมู่ ราคา จำนวน และอัปโหลดรูป
3. เปิดตัวเลือก **เปิดขายสินค้า** แล้วบันทึก สินค้าจะแสดงในหน้าร้านทันที
4. หากยังไม่เพิ่ม หน้าหลัก/รายการสินค้า/หมวดหมู่จะแสดง 0 รายการ ไม่มีรูปหรือสินค้าจำลอง และสินค้าเดิมที่ถูกลบจะถูกนำออกจากตะกร้าที่บันทึกในเบราว์เซอร์

ข้อมูลสินค้าใน `tests/fixtures/products.js` ใช้เฉพาะ API จำลองในชุดทดสอบ ไม่ import จากหน้าร้าน ไม่ deploy เป็นสินค้า และไม่ insert ลงฐานข้อมูลจริง

## ชำระเงินจริง: สิ่งที่ต้องรู้

- ไม่ตั้งเลข PromptPay สมมติในระบบจริง ร้านจะปฏิเสธ checkout จน admin บันทึกเลขจริงและชื่อเจ้าของบัญชี
- รับเบอร์ 10 หลักหรือเลขประชาชน 13 หลัก (หน้าเว็บตรวจ checksum) **เลขต้องผูก PromptPay แล้ว** ระบบไม่สามารถยืนยันการผูกหรือชื่อกับธนาคารได้ ลูกค้าต้องตรวจชื่อในแอป
- ใช้ Thai QR EMV payload พร้อม CRC16 และยอดสั่งซื้อจากฐานข้อมูล บันทึก PNG ได้ ไม่ใช่ payment gateway
- **ไม่มีการตรวจเงินเข้าอัตโนมัติ** แนบสลิปเพียงเปลี่ยนเป็น `review` แอดมินต้องตรวจรายการธนาคารก่อนกด `paid`; สลิปอาจปลอมได้ ไม่ใช้รูปสลิปเป็นข้อพิสูจน์เพียงอย่างเดียว
- สินค้าถูกจอง/ตัดเมื่อสร้างคำสั่งซื้อ และคืนเมื่อยกเลิกครั้งเดียว ไม่ oversell ข้าม transaction; ลูกค้ายกเลิกได้เฉพาะ pending, admin ยกเลิก pending/review ได้ ต้องตรวจว่าไม่โอนมาก่อน
- จำกัด pending/review 5 รายการต่อบัญชี **ยังไม่มีหมดอายุ/คืนสต็อกอัตโนมัติ** admin ต้องจัดการรายการค้าง การตัด paid/shipped/คืนเงินเป็นงานที่ต้องมีขั้นตอนตรวจด้วยคน
- ราคาและบัญชีรับเงิน snapshot ในคำสั่งซื้อ การแก้สินค้าหรือ PromptPay ภายหลังไม่เปลี่ยน QR/ยอดของคำสั่งซื้อเดิม
- ก่อนขายจริง เพิ่มสินค้าของร้านเอง พร้อมรูป/ราคา/สต็อกที่ถูกต้อง เพิ่มช่องทางติดต่อ ระยะเวลาเก็บข้อมูล เงื่อนไขคืนสินค้า และตรวจความเหมาะสมทาง PDPA; หน้า privacy/help ระบุสิ่งเหล่านี้ไว้ว่าเจ้าของต้องเพิ่มเติม

## การป้องกันที่ทำ

- RLS ทุก public table; profiles/orders อ่านเฉพาะเจ้าของหรือ admin; ลูกค้าไม่มี direct insert/update orders หรือ store_admin
- Postgres RPC ตรวจ session, ราคาจริง, stock lock ตามลำดับ, transaction rollback, idempotency key, จำกัดจำนวน, สถานะที่อนุญาต และคืนสต็อก
- admin เป็นตาราง singleton แยกจาก user metadata, UI guard เป็นเพียงชั้นเสริม
- payment-slips private; path เป็น user/order/UUID; ตรวจเจ้าของและสถานะ; อ่านผ่าน signed URL 120 วินาที; อนุญาต JPG/PNG/WebP ≤5 MB และไม่อนุญาต overwrite
- product-images เขียนได้เฉพาะ admin; ไม่รับ SVG/HTML จาก upload; ภาพ placeholder SVG ใน repo เป็น trusted asset ไม่ใช่สินค้าตัวอย่าง
- escape HTML ก่อนแสดงข้อมูล, image URL allowlist, ไม่เก็บรหัสผ่านใน localStorage, ไม่มี service credential ใน client
- Vercel: HTTPS/HSTS, CSP, nosniff, frame-ancestors none, จำกัด browser permissions และ referrer
- ใช้ Supabase Auth จัดการ password hashing/token/refresh rotation (session token อยู่ใน browser storage ตาม Supabase SPA จึงต้องป้องกัน XSS และใช้เครื่องที่เชื่อถือได้)

ไม่มีเว็บที่รับประกันป้องกันการโจมตีได้ทุกแบบ ก่อน production ควรเพิ่ม MFA แอดมินพร้อม UI รองรับ, CAPTCHA, monitoring/alert, backup policy และตรวจความปลอดภัยเพิ่มเติม โดยเฉพาะการป้องกัน abuse สมัครสมาชิก/จองสต็อก และไม่ควรเปิดขายจริงด้วยบัญชีทดสอบ

## Vercel

โปรเจกต์แยก `zenmarket` เชื่อม `Zentrary/ZenMarket`, build `npm run build`, output `dist`

ตั้ง environment สำหรับ production/preview/development:

```text
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

มี `vercel.json` พร้อม security headers และ SPA fallback หน้าเว็บใช้ hash routing (`/#/shop`, `/#/admin`) จึงเปิดลิงก์ตรงได้ ไม่ต้องใช้ server state

## ทดสอบ

- `npm test`: QR เปรียบเทียบกับ `promptpay-qr`, CRC, amount/ID validation, HTML escaping, cart parsing และล้างสินค้าเดิมที่ถูกลบ/ซ่อนจากตะกร้า
- `npm run build`: production bundle
- `node tests/ui.mjs`: Playwright ผ่าน Chromium npm binary, mock Supabase API **ไม่ใช่การยืนยัน live auth/email/payment** ครอบคลุมร้านว่าง 0 สินค้า, แอดมินเพิ่มสินค้าชิ้นแรก, category/search/favorites/cart persistence, register mismatch, user/admin guard, checkout/QR/slip, admin products/settings/approve, เมนูคีย์บอร์ด และ responsive 13 ขนาด 320–1920px บน 14 routes รวม dialog
- Chromium Linux ต้องมี NSPR/NSS ในระบบ หาก sandbox ไม่มี สามารถใช้ libraries ที่ bundled ใน `@sparticuz/chromium/bin/al2023.tar.br` (ใช้เฉพาะการทดสอบ ไม่ deploy binary)
- `tests/security.sql`: รันใน SQL editor ของ test project เป็น postgres; สร้างสินค้าทดสอบเฉพาะใน transaction ตรวจ permissions/RLS/stock/idempotency/price tampering/cancellation และ rollback ทุกครั้ง ร้านจริงยังคงว่างหลังทดสอบ

ห้าม commit `.env`, browser session, credentials, screenshots หรือ build output ที่ไม่จำเป็น

## การรองรับอุปกรณ์

- Layout ปรับตามขนาดจอ ไม่ผูกกับยี่ห้อ: มือถือ Android/iPhone, แท็บเล็ต และคอมพิวเตอร์ผ่าน browser มาตรฐานรุ่นปัจจุบัน
- ทดสอบ Chromium emulation 320, 360, 375, 390, 430, 600, 768, 820, 844 (แนวนอน), 1024, 1280, 1440 และ 1920px ทั้งร้านว่าง/มีสินค้า, ตะกร้า/ชำระเงิน, ฟอร์มสมาชิก, บัญชี, หลังบ้าน/ตาราง และ dialog
- ปรับ input เป็น 16px เพื่อไม่ให้ iOS ซูมตอนกรอก, เมนูมือถือมี aria-expanded/ปิดด้วย Escape, รองรับ keyboard focus/reduced motion, ตารางหลังบ้านเลื่อนได้ภายในกรอบโดยไม่ดันทั้งหน้า
- การทดสอบนี้เป็น browser emulation ไม่ใช่การรับรองว่าได้ทดสอบเครื่องจริงทุกยี่ห้อหรือ Safari/Firefox ทุกเวอร์ชัน ควรตรวจบนอุปกรณ์จริงที่ใช้ก่อนเปิดขาย
