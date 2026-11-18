// Pack local assets into a Worker data module. Each entry can be sent without decompressing other files.
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const out='dist';await mkdir(out,{recursive:true});
const types={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8'};
const metadata={},buffers=[];let offset=0;
async function pack(dir=''){
  for(const f of (await readdir(join('public',dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const path=join(dir,f.name);if(f.isDirectory()){await pack(path);continue;}
    const ext=extname(path),data=await readFile(join('public',path));
    const zipped=ext!=='.webp' && data.length>350;
    const bytes=zipped?gzipSync(data,{level:9,mtime:0}):data;
    metadata['/'+path]=[offset,bytes.length,types[ext]||'application/octet-stream',zipped,createHash('sha256').update(data).digest('hex').slice(0,20)];
    buffers.push(bytes);offset+=bytes.length;
  }
}
await pack();const worker=await readFile('src/worker.js','utf8');
const serve=`
import packed from './public.bin';
const staticFiles=${JSON.stringify(metadata)};
function serveStatic(request){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  const path=new URL(request.url).pathname;
  const item=staticFiles[path==='/'?'/index.html':path];
  if(!item)return new Response('Halaman tidak ditemukan.',{status:404});
  const [start,size,type,zip,version]=item,etag='"'+version+'"';
  const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'public, max-age=0, must-revalidate','ETag':etag,'Vary':'Accept-Encoding'};
  if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
  if(zip)headers['Content-Encoding']='gzip';
  return new Response(request.method==='HEAD'?null:packed.slice(start,start+size),{headers,encodeBody:'manual'});
}
`;
await Promise.all([writeFile(join(out,'public.bin'),Buffer.concat(buffers)),writeFile(join(out,'worker.js'),serve+worker.replace('env.ASSETS.fetch(req)','serveStatic(req)')),writeFile(join(out,'bank.js'),await readFile('src/bank.js'))]);
console.log(Object.keys(metadata).length+' assets, '+offset+' packed bytes');
