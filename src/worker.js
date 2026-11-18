import { DurableObject } from 'cloudflare:workers';
import { GRADES, SUBJECTS, generateQuestions } from './bank.js';

const MAPS = ['dino','mountain','castle','stadium','space','race','desert','school','city','sky','mushroom','village'];
const ttl = 2 * 60 * 60 * 1000;
const json = (value,status=200,headers={}) => Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail = (message,status=400) => json({error:message},status);
const number = (n,min,max,fallback) => Number.isInteger(+n) ? Math.max(min,Math.min(+n,max)) : fallback;
const random = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const filterMatch = (room,f) => ['map','subject','grade'].every(key=>!f[key] || room[key]===f[key]);
const toId = async secret => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const profile = body => ({
  name:String(body.name || 'Penjelajah').replace(/[<>\x00-\x1F]/g,'').trim().slice(0,22)||'Penjelajah',
  avatar:String(body.avatar||'').slice(0,30)
});
function config(body) {
  return {map:MAPS.includes(body.map)?body.map:'dino',grade:GRADES.some(g=>g.id===body.grade)?body.grade:'7',
    subject:body.subject==='guru'?'guru':SUBJECTS.some(s=>s.id===body.subject)?body.subject:'mix',customLabel:body.subject==='guru'?String(body.customLabel||'').trim().slice(0,45):'',count:number(body.count,1,20,5),
    seconds:number(body.seconds,15,180,60),capacity:number(body.capacity,1,32,16),public:body.public===true};
}
// Import tab-separated rows copied from a spreadsheet. Store keys only on the server.
async function customPool(body) {
  const entries=[],seen=new Set();
  if(!String(body.customLabel||'').trim())throw Error('Isi nama mata pelajaran.');
  const lines=String(body.customBank||'').trim().split(/\r?\n/);
  if(lines.length>500)throw Error('Satu bank dapat memuat hingga 500 soal.');
  for(const [i,line] of lines.entries()){
    if(!line.trim())continue;
    const cells=line.split('\t').map(x=>x.trim()),[prompt,...rest]=cells;
    if(i===0 && cells.length===6 && /^(kunci|jawaban)$/i.test(cells[5]))continue;
    const options=rest.slice(0,4),answer='ABCD'.indexOf((cells[5]||' ').toUpperCase());
    if(cells.length!==6 || !/^[A-D]$/i.test(cells[5]) || !prompt || prompt.length>360 ||
       options.some(x=>!x||x.length>150)||new Set(options.map(x=>x.toLowerCase())).size<4)
      throw Error('Periksa baris '+(i+1)+'. Gunakan enam kolom dengan empat opsi berbeda dan kunci A–D.');
    const normalized=prompt.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    if(seen.has(normalized))continue;
    seen.add(normalized);entries.push({id:'guru-'+(await toId(normalized)).slice(0,24),subject:'guru',prompt,options,answer});
  }
  const min=number(body.count,1,20,5)*11;
  if(entries.length<min)throw Error('Sediakan minimal '+min+' soal unik untuk '+number(body.count,1,20,5)+' soal per sesi agar riwayat 10 permainan dapat dihormati.');
  return entries;
}
function customDraw(settings,pool,excludeIds){
  const excluded=new Set(excludeIds),eligible=pool.filter(q=>!excluded.has(q.id));
  if(eligible.length<settings.count)throw Error('Bank guru belum cukup untuk riwayat pemain.');
  for(let i=eligible.length-1;i>0;i--){const j=random(i+1);[eligible[i],eligible[j]]=[eligible[j],eligible[i]];}
  return eligible.slice(0,settings.count).map(q=>{
    const pairs=q.options.map((text,i)=>({text,correct:i===q.answer}));
    for(let i=3;i>0;i--){const j=random(i+1);[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
    return {...q,options:pairs.map(v=>v.text),answer:pairs.findIndex(v=>v.correct)};
  });
}
function stations(count) {
  const points=[]; let prev={x:0,z:0};
  for(let i=0;i<count;i++) {
    const candidates=[];
    for(let x=-40;x<=40;x+=10)for(let z=-40;z<=40;z+=10){
      const d=Math.hypot(x-prev.x,z-prev.z);
      if(d>=10 && d<=32 && !points.some(p=>p.x===x&&p.z===z)) candidates.push({x,z});
    }
    // Up to 20 samples from an 81-cell board; the frontier can occasionally enclose the current cell.
    if(!candidates.length) for(let x=-40;x<=40;x+=10)for(let z=-40;z<=40;z+=10)
      if(!points.some(p=>p.x===x&&p.z===z)) candidates.push({x,z});
    prev=candidates[random(candidates.length)]; points.push(prev);
  }
  return points;
}
export class AtlasDirectory extends DurableObject {
  async publish(entry) {
    if(entry.public && entry.phase==='lobby' && entry.online>0 && entry.players<entry.capacity)
      await this.ctx.storage.put(entry.pin,{...entry,expires:Date.now()+65_000});
    else await this.ctx.storage.delete(entry.pin);
    if(!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now()+70_000);
  }
  async list(filters={}) {
    const rows=await this.ctx.storage.list();
    return [...rows.values()].filter(r=>r.expires>Date.now() && filterMatch(r,filters)).map(({expires,...r})=>r).sort((a,b)=>b.online-a.online);
  }
  async alarm(){
    const rows=await this.ctx.storage.list(), now=Date.now();
    const stale=[...rows].filter(([,r])=>r.expires<=now).map(([k])=>k);
    for(let i=0;i<stale.length;i+=128) await this.ctx.storage.delete(stale.slice(i,i+128));
    if(rows.size>stale.length) await this.ctx.storage.setAlarm(now+70_000);
  }
}
export class AtlasHistory extends DurableObject {
  async draw(match,settings,pool=null) {
    return this.ctx.storage.transaction(async tx=>{
      const last=await tx.get('last');
      if(last?.match===match)return last.questions;
      const history=await tx.get('history')||{};
      const excludeIds=pool?(history['guru/'+settings.customLabel.toLowerCase()]||[]).flat():Object.values(history).flat(2);
      const questions=pool?customDraw(settings,pool,excludeIds):generateQuestions({...settings,excludeIds});
      for(const subject of new Set(questions.map(q=>q.subject))){
        const key=subject==='guru'?'guru/'+settings.customLabel.toLowerCase():subject;
        history[key]=[...(history[key]||[]),questions.filter(q=>q.subject===subject).map(q=>q.id)].slice(-10);
      }
      await tx.put({history,last:{match,questions}});
      return questions;
    });
  }
}
export class AtlasRoom extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);this.positions=new Map();this.dirty=new Map();this.chain=Promise.resolve();this.lastFrame=0;this.lastListed=0;
    ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room');});
  }
  serial(fn){const task=this.chain.then(fn);this.chain=task.catch(()=>{});return task;}
  async save(){await this.ctx.storage.put('room',this.room);}
  peers(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
  online(){return new Set(this.peers().map(ws=>ws.deserializeAttachment()?.id));}
  summary(){
    const r=this.room, online=this.online();
    return {pin:r.pin,...r.settings,phase:r.phase,host:r.players[r.host]?.name||'Penjelajah',players:Object.keys(r.players).length,online:online.size};
  }
  listRoom(){
    if(!this.room.settings.public)return Promise.resolve();
    this.lastListed=Date.now();return this.env.DIRECTORY.getByName('public').publish(this.summary());
  }
  async create(pin,id,body,pool=null) {
    return this.serial(async()=>{
      if(this.room)return false;
      if(pool)await this.ctx.storage.put('custom',pool);
      this.room={pin,settings:config(body),host:id,phase:'lobby',players:{[id]:{...profile(body),joined:Date.now(),score:0}},expires:Date.now()+ttl};
      await this.save();await this.ctx.storage.setAlarm(Date.now()+45_000);return true;
    });
  }
  async enter(id,body,publicOnly=false) {
    return this.serial(async()=>{
      const r=this.room;
      if(!r || r.expires<Date.now() || (publicOnly&&!r.settings.public))return {error:'Room tidak ditemukan.'};
      if(!r.players[id]){
        if(r.phase!=='lobby')return {error:'Pertandingan sudah dimulai.'};
        if(Object.keys(r.players).length>=r.settings.capacity)return {error:'Room sudah penuh.'};
        r.players[id]={...profile(body),joined:Date.now(),score:0};await this.save();await this.listRoom();this.broadcast();
      }
      return {pin:r.pin};
    });
  }
  send(ws,data){try{ws.send(JSON.stringify(data));}catch{}}
  roster() {
    const online=this.online();
    return Object.entries(this.room.players).map(([id,p])=>({id,name:p.name,avatar:p.avatar,score:p.score,online:online.has(id)}));
  }
  broadcast(){const roster=this.roster();for(const ws of this.peers()){const id=ws.deserializeAttachment()?.id;if(this.room.players[id])this.send(ws,this.snapshot(id,roster));}}
  snapshot(id,roster=this.roster()) {
    const r=this.room,p=r.players[id], i=r.round, open=r.phase==='play',q=open?p.deck?.[i]:null;
    return {type:'state',now:Date.now(),pin:r.pin,phase:r.phase,me:id,host:r.host,settings:r.settings,
      players:roster,
      round:i,point:open?r.points[i]:null,deadline:r.deadline||0,choice:p.choice??null,reached:!!p.reached,
      question:q&&p.reached?{prompt:q.prompt,options:q.options,subject:q.subject}:null,last:p.last||null,
      review:r.phase==='done'?p.review:undefined};
  }
  async fetch(request) {
    const id=request.headers.get('X-Atlas-Player');
    if(!this.room?.players[id]||this.room.expires<Date.now())return fail('Room tidak tersedia.',404);
    const pair=new WebSocketPair(), [client,ws]=Object.values(pair);
    for(const old of this.peers())if(old.deserializeAttachment()?.id===id)old.close(1000,'Sesi lain terhubung');
    this.ctx.acceptWebSocket(ws);ws.serializeAttachment({id});this.broadcast();
    await this.listRoom();return new Response(null,{status:101,webSocket:client});
  }
  position(id) {return this.positions.get(id)||{x:0,z:0,y:0,yaw:0,t:0};}
  move(id,m,ws) {
    const r=this.room;if(r.phase!=='play')return;
    const now=Date.now(), last=this.position(id),dt=(now-(last.t||r.started))/1000;
    if(last.t && dt<0.065)return;
    const x=Number(m.x),z=Number(m.z);
    if(![x,z,m.y,m.yaw].every(Number.isFinite)||Math.max(Math.abs(x),Math.abs(z))>48)return;
    if(Math.hypot(x-last.x,z-last.z)>Math.max(2.2,Math.min(dt,12)*13+1.5)){
      this.send(ws,{type:'correct',x:last.x,z:last.z});return;
    }
    const pos={x,z,y:Math.min(3,Math.max(0,m.y)),yaw:m.yaw%(Math.PI*2),tool:number(m.tool,0,3,0),crouch:!!m.crouch,t:now};
    this.positions.set(id,pos);this.dirty.set(id,{id,...pos});
    if(now-this.lastFrame>=95){const data={type:'poses',poses:[...this.dirty.values()]};this.dirty.clear();this.lastFrame=now;for(const peer of this.peers())this.send(peer,data);}
  }
  async webSocketMessage(ws,raw) {
    if(typeof raw!=='string'||raw.length>1600){ws.close(1009);return;}
    let m;try{m=JSON.parse(raw);}catch{return;}
    if(!m||typeof m!=='object')return;
    const id=ws.deserializeAttachment()?.id;
    if(!this.room?.players[id])return;
    if(m.type==='move'){this.move(id,m,ws);return;}
    if(m.type==='ping'){
      this.send(ws,{type:'pong',at:m.at,now:Date.now()});
      if(this.room.phase==='lobby' && Date.now()-this.lastListed>25_000)await this.listRoom();
      return;
    }
    await this.serial(async()=>{
      const r=this.room,p=r.players[id];if(!p)return;
      if(m.type==='leave'){
        if(r.phase==='lobby'){delete r.players[id];if(id===r.host)r.host=Object.keys(r.players)[0];}
        ws.close(1000,'Keluar');await this.save();this.broadcast();await this.listRoom();return;
      }
      if(m.type==='start'&&r.phase==='lobby'&&id===r.host){
        const online=this.online();
        for(const k of Object.keys(r.players))if(!online.has(k))delete r.players[k];
        const match=crypto.randomUUID();
        const pool=r.settings.subject==='guru'?await this.ctx.storage.get('custom'):null;
        const decks=await Promise.all(Object.keys(r.players).map(k=>this.env.HISTORY.getByName(k).draw(match,r.settings,pool)));
        Object.values(r.players).forEach((p,i)=>Object.assign(p,{deck:decks[i],review:[],choice:null,reached:false,score:0}));
        Object.assign(r,{phase:'play',points:stations(r.settings.count),round:0,started:Date.now(),deadline:Date.now()+r.settings.seconds*1000});
        this.positions.clear();await this.save();await this.ctx.storage.setAlarm(r.deadline);this.broadcast();await this.listRoom();return;
      }
      if(r.phase!=='play')return;
      if(Date.now()>=r.deadline){await this.advance();return;}
      if(m.round!==r.round)return;
      const pos=this.position(id),pt=r.points[r.round];
      if(m.type==='reach'&&!p.reached && Math.hypot(pos.x-pt.x,pos.z-pt.z)<5){
        p.reached=true;await this.save();this.send(ws,this.snapshot(id));
      }
      if(m.type==='shot'&&p.reached&&Number.isInteger(m.choice)&&m.choice>=0&&m.choice<4){
        p.choice=m.choice;await this.save();this.send(ws,{type:'choice',round:r.round,choice:m.choice});
      }
    });
  }
  async advance() {
    const r=this.room, idx=r.round;
    for(const p of Object.values(r.players)){
      const q=p.deck[idx],correct=p.choice===q.answer;
      if(correct)p.score+=100;
      p.last={round:idx,correct,choice:p.choice,answer:q.options[q.answer]};
      p.review.push({prompt:q.prompt,selected:p.choice==null?null:q.options[p.choice],answer:q.options[q.answer],correct});
      p.choice=null;p.reached=false;
    }
    if(idx+1>=r.settings.count){r.phase='done';r.deadline=0;for(const p of Object.values(r.players))delete p.deck;}
    else {r.round++;r.deadline=Date.now()+r.settings.seconds*1000;}
    await this.save();await this.ctx.storage.setAlarm(r.phase==='done'?Date.now()+ttl:r.deadline);this.broadcast();
  }
  async webSocketClose(ws,code){try{ws.close(code===1000?1000:1001);}catch{}if(this.room){this.broadcast();await this.listRoom();}}
  async webSocketError(ws){await this.webSocketClose(ws,1001);}
  async alarm(){return this.serial(async()=>{
    const r=this.room;if(!r)return;
    if(r.phase==='play'){if(Date.now()>=r.deadline)await this.advance();else await this.ctx.storage.setAlarm(r.deadline);return;}
    const online=this.online();
    if(r.phase==='done'||(!online.size && (Date.now()>=r.expires || !Object.keys(r.players).length))){
      if(r.phase==='lobby'){r.phase='closed';await this.listRoom();}
      for(const ws of this.peers())ws.close(1000,'Room ditutup');await this.ctx.storage.deleteAll();this.room=null;return;
    }
    if(r.phase==='lobby'){
      for(const [id,p] of Object.entries(r.players)){
        if(online.has(id)){delete p.away;continue;}
        p.away??=Date.now();if(Date.now()-p.away>45_000)delete r.players[id];
      }
      if(!r.players[r.host])r.host=Object.keys(r.players).find(id=>online.has(id))||Object.keys(r.players)[0];
      if(online.size)r.expires=Date.now()+ttl;
      await this.save();this.broadcast();await this.listRoom();await this.ctx.storage.setAlarm(Date.now()+45_000);
    }
  });}
}
export default {
  async fetch(req,env) {
    const url=new URL(req.url),path=url.pathname;
    if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
    const origin=req.headers.get('Origin');
    if(origin && origin!==url.origin)return fail('Asal permintaan berbeda.',403);
    if(path==='/api/catalog')return json({grades:GRADES,subjects:[...SUBJECTS,{id:'guru',label:'Mata pelajaran sendiri'}]});
    if(path==='/api/profile' && req.method==='POST'){
      const current=req.headers.get('Cookie')?.match(/(?:^|; )atlas=([a-f0-9]{64})(?:;|$)/)?.[1];
      return json({ok:true},200,current?{}:{'Set-Cookie':'atlas='+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')+'; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict; Secure'});
    }
    const secret=req.headers.get('Cookie')?.match(/(?:^|; )atlas=([a-f0-9]{64})(?:;|$)/)?.[1];
    if(!secret)return fail('Aktifkan cookie untuk masuk.',401);
    const id=await toId(secret),dir=env.DIRECTORY.getByName('public');
    if(path==='/api/rooms'&&req.method==='GET')return json(await dir.list(Object.fromEntries(url.searchParams)));
    if(/^\/api\/live\/\d{6}$/.test(path)&&req.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const h=new Headers(req.headers);h.set('X-Atlas-Player',id);return env.ROOMS.getByName(path.slice(-6)).fetch(new Request(req,{headers:h}));
    }
    if(req.method!=='POST')return fail('Rute tidak ditemukan.',404);
    if(!req.headers.get('Content-Type')?.includes('application/json'))return fail('Gunakan JSON.',415);
    let b;try{const raw=await req.text();if(raw.length>(path==='/api/create'?420000:2000))return fail('Permintaan terlalu panjang.',413);b=JSON.parse(raw);}catch{return fail('Data tidak valid.');}
    if(!b||typeof b!=='object')return fail('Data tidak valid.');
    if(path==='/api/create'){
      let pool=null;
      if(b.subject==='guru'){try{pool=await customPool(b);}catch(e){return fail(e.message);}delete b.customBank;}
      for(let i=0;i<8;i++){const pin=String(100000+random(900000));if(await env.ROOMS.getByName(pin).create(pin,id,b,pool))return json({pin});}
      return fail('Coba buat room kembali.',503);
    }
    if(path==='/api/join' && /^\d{6}$/.test(b.pin)){const out=await env.ROOMS.getByName(b.pin).enter(id,b);return json(out,out.error?409:200);}
    if(path==='/api/quick'){
      for(const room of (await dir.list(b.filters||{})).slice(0,12)){const out=await env.ROOMS.getByName(room.pin).enter(id,b,true);if(!out.error)return json(out);}
      return fail('Belum ada room publik yang cocok. Buka room atau coba filter lain.',404);
    }
    return fail('Rute tidak ditemukan.',404);
  }
};
