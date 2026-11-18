// Run after npm run build. The new Worker uses one SQLite Durable Object per room.
import {readFile} from 'node:fs/promises';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the deployment environment.');
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/workers/scripts/atlas-arena';
const headers={Authorization:'Bearer '+token};
const existing=await fetch(endpoint+'/settings',{headers});
if(!existing.ok && existing.status!==404)throw Error('Could not read Worker settings: HTTP '+existing.status);
const metadata=JSON.parse(await readFile('cloudflare-upload.json','utf8'));
if(existing.ok)delete metadata.migrations;
const form=new FormData();
form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
for(const [file,type] of [['worker.js','application/javascript+module'],['bank.js','application/javascript+module'],['public.bin','application/octet-stream']]){
  form.append(file,new Blob([await readFile('dist/'+file)],{type}),file);
}
const result=await fetch(endpoint,{method:'PUT',headers,body:form});
if(!result.ok)throw Error('Deploy failed: '+result.status+' '+await result.text());
const enable=await fetch(endpoint+'/subdomain',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({enabled:true})});
if(!enable.ok)throw Error('Worker uploaded; activation failed: '+enable.status);
console.log('Published atlas-arena.');
