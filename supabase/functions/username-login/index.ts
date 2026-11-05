import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response('ok', { headers });
 const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
 if(req.method !== 'POST') return reply({error:'Method not allowed'},405);
 try {
  const {identifier,password} = await req.json();
  if(typeof identifier !== 'string'||typeof password !== 'string'||identifier.length>254||password.length>128) return reply({error:'ข้อมูลไม่ถูกต้อง'},400);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const digest = async (s:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  for (const key of ['ip:'+ip,'name:'+identifier.toLowerCase()]) {
   const {data,error} = await admin.rpc('login_allow',{bucket_key:await digest(key)});
   if(error||!data) return reply({error:'ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที'},429);
  }
  let email = identifier.trim().toLowerCase();
  if(!email.includes('@')) {
   const {data} = await admin.rpc('login_email',{login_name:email});
   email = data || 'unknown-account@invalid.example';
  }
  const auth = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
  const {data,error} = await auth.auth.signInWithPassword({email,password});
  if(error||!data.session) return reply({error:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล'},401);
  return reply({session:data.session});
 } catch { return reply({error:'ไม่สามารถเข้าสู่ระบบได้'},400); }
});
