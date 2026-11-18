import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env;} }',shortCircuit:true};
  return next(specifier,context);
}});
const {default:worker,AtlasHistory,AtlasRoom}=await import('../src/worker.js');
const store=()=>{const map=new Map();return {get:async k=>map.get(k),put:async(k,v)=>{if(typeof k==='object')for(const [key,val] of Object.entries(k))map.set(key,structuredClone(val));else map.set(k,structuredClone(v));},transaction:fn=>fn({get:async k=>structuredClone(map.get(k)),put:async o=>Object.entries(o).forEach(([k,v])=>map.set(k,structuredClone(v)))}),setAlarm:async()=>{}};};
const jsonBody=(url,body)=>new Request('https://atlas.test/api/'+url,{method:'POST',headers:{'Content-Type':'application/json',Cookie:'atlas='+'a'.repeat(64)},body:JSON.stringify(body)});
test('spreadsheet imports keep correct answers on server and respect ten prior rounds',async()=>{
 const history=new AtlasHistory({storage:store()},{}), rows=Array.from({length:22},(_,i)=>['Soal '+i,'p','q','r','s','B'].join('\t')).join('\n');
 let pool;const env={DIRECTORY:{getByName:()=>({})},ROOMS:{getByName:()=>({create:async(pin,id,b,p)=>{pool=p;assert.equal(b.customBank,undefined);return true;}})}};
 const body={subject:'guru',count:2,customLabel:'Muatan lokal',customBank:rows};
 const res=await worker.fetch(jsonBody('create',body),env);assert.equal(res.status,200);assert.equal(pool.length,22);
 const seen=new Set();for(let i=0;i<11;i++){const pack=await history.draw('m'+i,body,pool);for(const q of pack){assert(!seen.has(q.id));seen.add(q.id);assert.equal(q.options[q.answer],'q');}}
 assert.equal(seen.size,22);assert.equal((await worker.fetch(jsonBody('create',{...body,customBank:'x\ta\tb\tc\td\tE'}),env)).status,400);
});
test('a room reveals a question on arrival and scores the most recent shot at timeout',async()=>{
 const storage=store(),messages=[];const socket={readyState:1,deserializeAttachment:()=>({id:'test'}),send:text=>messages.push(JSON.parse(text))};
 const ctx={storage,getWebSockets:()=>[socket],blockConcurrencyWhile:fn=>fn()};
 const history=new AtlasHistory({storage:store()},{});const env={HISTORY:{getByName:()=>history}};
 const room=new AtlasRoom(ctx,env);await room.create('123456','test',{count:1,seconds:30,subject:'matematika',grade:'7'});
 await room.webSocketMessage(socket,JSON.stringify({type:'start'}));assert.equal(room.room.phase,'play');
 const p=room.room.players.test;
 assert.equal(messages.at(-1).question,null);
 await room.webSocketMessage(socket,JSON.stringify({type:'shot',choice:0,round:0}));assert.equal(p.choice,null);
 room.positions.set('test',room.room.points[0]);await room.webSocketMessage(socket,JSON.stringify({type:'reach',round:0}));
 assert.equal(messages.at(-1).question.options.length,4);assert.equal(messages.at(-1).question.answer,undefined);
 await room.webSocketMessage(socket,JSON.stringify({type:'shot',round:0,choice:(p.deck[0].answer+1)%4}));
 await room.webSocketMessage(socket,JSON.stringify({type:'shot',round:0,choice:p.deck[0].answer}));
 room.room.deadline=Date.now()-1;await room.alarm();assert.equal(room.room.phase,'done');assert.equal(p.score,100);assert.equal(p.review[0].correct,true);
});
