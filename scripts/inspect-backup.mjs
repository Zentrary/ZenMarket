// Verify a browser export without printing customer data or writing plaintext.
// ZEN_BACKUP_PASSWORD is read from environment, never a command-line argument.
import {readFileSync} from 'node:fs';
try {
 const file=process.argv[2];
 if(!file||!process.env.ZEN_BACKUP_PASSWORD)throw Error('Supply a .zenbackup.json path and ZEN_BACKUP_PASSWORD in your environment.');
 const e=JSON.parse(readFileSync(file,'utf8'));
 if(e.format!=='zenmarket-encrypted-v1'||e.iterations!==250000||e.algorithm!=='AES-256-GCM')throw Error('Unsupported export format');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(process.env.ZEN_BACKUP_PASSWORD),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:Buffer.from(e.salt,'base64'),iterations:e.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(e.iv,'base64')},key,Buffer.from(e.ciphertext,'base64'));
 const data=JSON.parse(new TextDecoder().decode(raw));
 if(data.format!=='zenmarket-data-v1'||!data.tables)throw Error('Invalid payload');
 console.log('Verified encrypted application export, created:',data.created_at);
 for(const [table,rows] of Object.entries(data.tables))console.log(table,Array.isArray(rows)?rows.length:'invalid');
 console.log('No plaintext was saved. Restore only into an isolated project after reviewing schema, Auth mapping and missing image files.');
} catch {console.error('Could not verify backup: check the format, password and integrity. No data was restored.');process.exitCode=1;}
