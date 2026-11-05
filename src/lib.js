export const money = n => new Intl.NumberFormat('th-TH', {style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(n)||0);
export const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeImage(url) { return typeof url==='string' && (/^\/images\/[a-z0-9-]+\.svg$/.test(url)||/^https:\/\//.test(url)) ? escapeHTML(url) : '/images/bag.svg'; }
export function validPromptPay(s) {
 if(/^0\d{9}$/.test(s)) return true;
 if(!/^\d{13}$/.test(s)) return false;
 const sum=s.slice(0,12).split('').reduce((a,d,i)=>a+Number(d)*(13-i),0);
 return (11-sum%11)%10===Number(s[12]);
}
export function promptpayPayload(id,amount) {
 if(!validPromptPay(id)||!Number.isFinite(Number(amount))||Number(amount)<=0||Number(amount)>100000000) throw Error('ข้อมูล PromptPay หรือยอดเงินไม่ถูกต้อง');
 const field=(tag,value)=>tag+String(value.length).padStart(2,'0')+value;
 const target=id.length===10?field('01','0066'+id.slice(1)):field('02',id);
 let payload='000201010212'+field('29',field('00','A000000677010111')+target)+'5802TH5303764'+field('54',Number(amount).toFixed(2))+'6304';
 let crc=0xffff;
 for(const c of payload){crc^=c.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 return payload+crc.toString(16).toUpperCase().padStart(4,'0');
}
export function validateCart(cart) { return Array.isArray(cart)?cart.filter(x=>typeof x.id==='string'&&/^[a-f0-9-]{36}$/.test(x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99).slice(0,50):[]; }
