import {chromium as playwright} from '@playwright/test';
import chromium from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import {seedProducts} from '../src/catalog.js';
const browser=await playwright.launch({headless:true,executablePath:await chromium.executablePath(),args:chromium.args});
const errors=[];
const user={id:'c5a5d418-c050-41c8-9079-87f2435cea2d',email:'user@zenmarket.example',user_metadata:{},app_metadata:{provider:'email'},aud:'authenticated',role:'authenticated'};
const adminUser={...user,id:'d38d4d1f-ca7c-4d87-a1cf-8abecdae8891',email:'admin@zenmarket.example'};
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
let isAdmin=false,products=seedProducts.map(p=>({...p,active:true,created_at:'2026-11-05T00:00:00Z'})),orders=[],configured=false;
await page.route('https://*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;let body;try{body=req.postDataJSON();}catch{}let result=null;let status=200;
 if(path.includes('/functions/v1/username-login')){isAdmin=body.identifier==='zenadmin';const u=isAdmin?adminUser:user;const jwt='e30.'+Buffer.from(JSON.stringify({sub:u.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.mock';result={session:{access_token:jwt,refresh_token:'mock-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:u}};}
 else if(path==='/auth/v1/user')result=isAdmin?adminUser:user;
 else if(path.includes('/auth/v1/logout'))result={};
 else if(path==='/rest/v1/products'){
  if(req.method()==='PATCH'){const id=url.searchParams.get('id').slice(3);Object.assign(products.find(p=>p.id===id),body);result=null;}else result=products;
 }
 else if(path==='/rest/v1/rpc/is_admin')result=isAdmin;
 else if(path==='/rest/v1/profiles')result={id:(isAdmin?adminUser:user).id,first_name:'ทดสอบ',last_name:'ระบบ',nickname:'Tester',username:isAdmin?'zenadmin':'zenuser',phone:'0812345678',age:25};
 else if(path==='/rest/v1/store_settings'){if(req.method()==='PATCH'){configured=true;result=null;}else result={singleton:true,promptpay_id:configured?'0812345678':null,recipient_name:configured?'บัญชีทดสอบ':''};}
 else if(path==='/rest/v1/rpc/create_order'){
  if(!configured){status=400;result={message:'ร้านค้ายังไม่ได้ตั้งค่าบัญชีรับเงิน'};}else {const items=body.cart.map(x=>({...products.find(p=>p.id===x.id),quantity:x.quantity}));const subtotal=items.reduce((a,p)=>a+p.price*p.quantity,0);const shipping=subtotal>=1000?0:50;const o={id:'b1000000-0000-4000-8000-000000000001',user_id:user.id,items,subtotal,shipping,total:subtotal+shipping,...body.delivery,promptpay_id:'0812345678',recipient_name:'บัญชีทดสอบ',status:'pending',created_at:new Date().toISOString()};orders.push(o);result=o;}
 }
 else if(path==='/rest/v1/orders'){result=url.searchParams.has('id')?orders.find(o=>o.id===url.searchParams.get('id').slice(3)):orders;}
 else if(path==='/rest/v1/rpc/transition_order'){orders.find(o=>o.id===body.order_id).status=body.next_status;result=null;}
 else if(path==='/rest/v1/rpc/attach_slip'){orders[0].status='review';result=null;}
 else if(path.startsWith('/storage/'))result={Key:'mock'};
 else {console.log('Unhandled mock:',path);result={};}
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result),headers:{'access-control-allow-origin':'*'}});
});
const visit=async p=>{await page.goto('http://localhost:5173/#'+p);await page.locator('.loading').waitFor({state:'detached'});};
const login=async name=>{await visit('/login');await page.locator('[name=identifier]').fill(name);await page.locator('[name=password]').fill('MockPassword123!');await page.locator('#login-form button[type=submit]').click();await page.waitForURL(name==='zenadmin'?'**/#/admin':'**/#/account');await page.locator('.loading').waitFor({state:'detached'});};
try{
 await visit('/');await page.locator('.product-card').first().waitFor();assert.equal(await page.locator('.product-card').count(),8);assert.equal(await page.locator('i[data-lucide]').count(),0,'all icons rendered');await page.screenshot({path:'/home/user/zenmarket-desktop.png',fullPage:true});
 // Self-contained editorial SVG and packaged fonts load correctly.
 assert.equal(await page.locator('.hero-image').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.locator('.pill[data-category="แก็ดเจ็ต"]').click();assert.equal(await page.locator('.product-card').count(),2);
 await page.locator('.pill[data-category="ทั้งหมด"]').click();await page.locator('.product-card .wish').first().click();assert.equal(await page.locator('.wish.liked').count(),1);
 await page.locator('.product-card .add-btn').first().click();await visit('/cart');assert.equal(await page.locator('.cart-row').count(),1);await page.locator('[data-delta="1"]').click();assert.equal(await page.locator('.stepper>span').textContent(),'2');
 await page.reload();await page.locator('.cart-row').waitFor();assert.equal(await page.locator('.stepper>span').textContent(),'2');await visit('/checkout');assert.match(await page.locator('main').textContent(),/เข้าสู่ระบบก่อน/);
 await visit('/shop');await page.locator('[name=search]').fill('Bottle');await page.locator('#search-form button').click();assert.equal(await page.locator('.product-card').count(),1);
 await visit('/register');await page.locator('[name=first_name]').fill('ชื่อ');await page.locator('[name=last_name]').fill('นามสกุล');await page.locator('[name=nickname]').fill('ชื่อเล่น');await page.locator('[name=age]').fill('25');await page.locator('[name=phone]').fill('0812345678');await page.locator('[name=username]').fill('tester');await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=password]').fill('Password123456');await page.locator('[name=confirm]').fill('Password654321');await page.locator('[name=consent]').check();await page.locator('#register-form button[type=submit]').click();assert.match(await page.locator('.form-error').textContent(),/ไม่ตรงกัน/);
 await login('zenuser');await visit('/admin');assert.match(await page.locator('main').textContent(),/สำหรับแอดมินเท่านั้น/);
 await visit('/checkout');await page.locator('[name=address]').fill('99 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพมหานคร 10110');await page.locator('#checkout-form button').click();await page.locator('.form-error').filter({hasText:'ยังไม่ได้ตั้งค่า'}).waitFor();
 configured=true;await page.locator('#checkout-form button').click();await page.waitForURL('**/#/order/*');await page.locator('img.qr').waitFor();assert.equal(await page.locator('a[download]').count(),1);await page.locator('[name=slip]').setInputFiles({name:'slip.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aql0AAAAASUVORK5CYII=','base64')});await page.locator('#slip-form button').click();await page.locator('.status.review').waitFor();
 await visit('/account');await page.locator('[data-action=logout]').click();await page.waitForURL('**/#/');await login('zenadmin');assert.equal(await page.locator('tbody tr').count(),8);await page.locator('[data-action=edit-product][data-id]').first().click();await page.locator('dialog [name=price]').fill('399');await page.locator('dialog button[type=submit]').click();await page.locator('dialog').waitFor({state:'detached'});assert.equal(products[0].price,399);
 await visit('/admin/settings');await page.locator('[name=recipient_name]').fill('บัญชีทดสอบ');await page.locator('[name=promptpay_id]').fill('1234567890123');await page.locator('#settings-form button').click();assert.match(await page.locator('.form-error').textContent(),/ไม่ถูกต้อง/);await page.locator('[name=promptpay_id]').fill('0812345678');await page.locator('#settings-form button').click();
 await visit('/admin/orders');await page.locator('tbody a').click();await page.locator('[data-action=approve-order]').click();await page.locator('.status.paid').waitFor();
 await page.setViewportSize({width:390,height:844});await visit('/');assert.equal(await page.locator('.product-card').count(),8);await page.locator('#toast.show').waitFor({state:'detached'});await page.screenshot({path:'/home/user/zenmarket-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('[data-action=menu]').click();assert.equal(await page.locator('header nav').isVisible(),true);
 for(const p of ['/shop','/collections','/cart','/register','/about','/admin','/admin/settings','/orders']){await visit(p);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow '+p);}
 assert.deepEqual(errors,[]);console.log('PASS: storefront, categories, search, favorites, cart persistence, registration validation, login roles, checkout, missing receiver guard, QR download, slip upload, admin edit/settings/approval, mobile layouts. API calls mocked.');
}finally{await browser.close();}
