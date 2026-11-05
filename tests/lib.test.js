import test from 'node:test';
import generate from 'promptpay-qr';
import assert from 'node:assert/strict';
import {promptpayPayload,validPromptPay,escapeHTML,safeImage,validateCart} from '../src/lib.js';
test('PromptPay phone formats country code, exact amount and CRC',()=>{
 const payload=promptpayPayload('0812345678',440);
 assert.ok(payload.includes('01130066812345678'));
 assert.ok(payload.includes('5406440.00'));
 // CRC check across complete payload must produce zero.
 let crc=0xffff; const body=payload.slice(0,-4);for(const c of body){crc^=c.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=crc&0x8000?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 assert.equal(payload.slice(-4),crc.toString(16).toUpperCase().padStart(4,'0'));
 assert.equal(payload,generate('0812345678',{amount:440}));
});
test('PromptPay validates phone, national ID checksum and rejects invalid amounts',()=>{
 assert.equal(validPromptPay('0812345678'),true);assert.equal(validPromptPay('1234567890121'),true);
 assert.equal(validPromptPay('1234567890123'),false);assert.equal(validPromptPay('812345678'),false);
 assert.ok(promptpayPayload('1234567890121',10).includes('02131234567890121'));
 for(const amount of [0,-1,Infinity,NaN,'x'])assert.throws(()=>promptpayPayload('0812345678',amount));
});
test('HTML escaping blocks injected markup and attributes',()=>{
 assert.equal(escapeHTML('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
 assert.equal(safeImage('javascript:alert(1)'),'/images/bag.svg');
 assert.equal(safeImage('data:image/svg+xml,evil'),'/images/bag.svg');
 assert.equal(safeImage('https://images.example/a" onerror="x'),'https://images.example/a&quot; onerror=&quot;x');
});
test('cart restore ignores invalid or inflated entries',()=>{
 const good={id:'a1000000-0000-4000-8000-000000000001',quantity:2};
 assert.deepEqual(validateCart([good,{...good,quantity:-1},{...good,quantity:100},{...good,quantity:1.1},{id:'<script>',quantity:1}]),[good]);
 assert.deepEqual(validateCart({}),[]);
});
