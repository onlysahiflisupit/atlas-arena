import { MAPS,CHARACTERS } from './catalog.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const stored=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
let user=stored('atlas-profile',{name:'Penjelajah',avatar:'nova'});
let mapIndex=0,catalog={grades:[],subjects:[]},socket,room,game,screen='home',clockDelta=0,timer,toastTimer,pin='',conn=0,retry=0,gameLoading;
const map=()=>MAPS[mapIndex], mapBy=id=>MAPS.find(m=>m.id===id)||map();
const label=(list,id)=>catalog[list].find(x=>x.id===id)?.label||id;
const descriptions=['Telusuri lembah dinosaurus dan temukan setiap titik soal.','Cari sinyal kuis di antara puncak dan cemara.','Susuri benteng batu untuk menemukan titik berikutnya.','Kejar titik soal di lapangan stadion.','Lacak sinyal di dek kapal antariksa.','Lintasi sirkuit dan ikuti penanda berikutnya.','Jelajahi oasis di tengah bukit pasir.','Temukan titik soal di halaman sekolah.','Jelajahi distrik kota dan raih skor tertinggi.','Ikuti suar di antara pulau-pulau melayang.','Temukan jawaban di rimba jamur raksasa.','Jelajahi desa dan kumpulkan poin di setiap titik.'];
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
async function api(path,body){const r=await fetch('/api/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Server belum dapat dihubungi.');return data;}
function page(name){
  screen=name;for(const s of ['home','arenas','rooms','wait','done'])$(s+'Page').hidden=s!==name;
  $('game').hidden=name!=='game';$('lobby').hidden=name==='game';document.querySelector('.top').hidden=name==='game';
  document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  window.scrollTo(0,0);if(name==='home'||name==='rooms')loadRooms();document.title=(name==='game'?mapBy(room.settings.map).tag:'Atlas Arena')+' · Atlas Arena';
}
function navigate(name){if(pin && ['wait','done'].includes(screen))exit();page(name);}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
function showMap(i){
  mapIndex=(i+MAPS.length)%MAPS.length;const m=map(),words=m.tag.split(' '),end=el('span','.');
  $('heroTitle').replaceChildren(document.createTextNode(words.slice(0,-1).join(' ')),el('br'),document.createTextNode(words.at(-1)),end);
  $('heroDesc').textContent=descriptions[mapIndex];$('heroIndex').textContent=String(mapIndex+1).padStart(2,'0')+' / 12';
  $('heroArt').style.backgroundImage='url(/assets/previews/'+m.id+'.webp)';
  for(const b of document.querySelectorAll('.mapCard'))b.classList.toggle('active',b.dataset.map===m.id);
}
function mapCard(m,i){const b=el('button',null,'mapCard');b.dataset.map=m.id;b.style.backgroundImage='linear-gradient(0deg,#0a1517ef,transparent 85%),url(/assets/previews/'+m.id+'.webp)';b.append(el('small',m.name.toUpperCase()),el('strong',m.tag));b.onclick=()=>{showMap(i);page('home');};return b;}
MAPS.forEach((m,i)=>{$('mapGrid').append(mapCard(m,i));if([0,2,4,10].includes(i))$('mapStrip').append(mapCard(m,i));});
showMap(0);$('prevMap').onclick=()=>showMap(mapIndex-1);$('nextMap').onclick=()=>showMap(mapIndex+1);
const dialog=$('dialog'),form=$('form');
function modal(title){if(document.pointerLockElement)document.exitPointerLock();$('dialogTitle').textContent=title;form.replaceChildren();form.onsubmit=e=>e.preventDefault();if(!dialog.open)dialog.showModal();return form;}
$('closeDialog').onclick=()=>dialog.close();
function field(parent,title,name,value,options,attrs={}){const node=el('label',title),input=el(options?'select':'input');if(options){for(const o of options){const op=el('option',o.label);op.value=o.id;input.append(op);}}Object.assign(input,attrs);input.name=name;input.value=value;node.append(input);parent.append(node);return input;}
const maps=MAPS.map(m=>({id:m.id,label:m.tag+' · '+m.name}));
function submit(text,run){const err=el('p','','formError');err.setAttribute('role','alert');const b=el('button',text,'primary');b.type='submit';form.append(err,b);form.onsubmit=async e=>{e.preventDefault();b.disabled=true;err.textContent='';try{await run(Object.fromEntries(new FormData(form)));dialog.close();}catch(e){err.textContent=e.message;}finally{b.disabled=false;}};}
function settings(solo){
  modal(solo?'Ekspedisi solo':'Buat room');const grid=el('div',null,'fields');form.append(grid);
  const f=field(grid,'Arena','map',map().id,maps);f.parentNode.className='wide';
  const subjectField=field(grid,'Mata pelajaran','subject','mix',catalog.subjects);field(grid,'Tingkat','grade','7',catalog.grades);
  field(grid,'Jumlah soal','count','5',null,{type:'number',min:1,max:20,required:true});
  field(grid,'Detik per soal','seconds','60',null,{type:'number',min:15,max:180,required:true});
  if(!solo){field(grid,'Akses room','visibility','private',[{id:'private',label:'Private · PIN / tautan'},{id:'public',label:'Publik · tampil di pencarian'}]);field(grid,'Maksimal pemain','capacity','25',null,{type:'number',min:1,max:32,required:true});}
  const custom=el('section',null,'wide');custom.hidden=true;grid.append(custom);
  const previous=stored('atlas-custom-bank',{title:'',rows:''});
  const title=field(custom,'Nama mata pelajaran','customLabel',previous.title,null,{maxLength:45});
  const lab=el('label','Bank soal dari spreadsheet'),area=el('textarea');area.name='customBank';area.rows=5;area.value=previous.rows;lab.append(area);custom.append(lab,el('small','Salin 6 kolom dari spreadsheet: Soal, A, B, C, D, Kunci (A–D). Sediakan 11 × jumlah soal per sesi. Maksimal 500 baris.','muted'));
  subjectField.onchange=()=>{custom.hidden=subjectField.value!=='guru';title.required=area.required=!custom.hidden;};
  submit(solo?'Mulai solo':'Buka room',async data=>{if(data.subject!=='guru'){delete data.customBank;delete data.customLabel;}else{localStorage.setItem('atlas-custom-bank',JSON.stringify({title:data.customLabel,rows:data.customBank}));}const out=await api('create',{...data,...user,public:!solo&&data.visibility==='public',capacity:solo?1:Number(data.capacity)});connect(out.pin,solo);});
}
$('host').onclick=$('host2').onclick=()=>settings(false);$('playSolo').onclick=()=>settings(true);
function join(value=''){modal('Masuk dengan PIN');const input=field(form,'PIN 6 digit','pin',value,null,{type:'text',inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,required:true,autocomplete:'off'});input.focus();submit('Gabung room',async data=>connect((await api('join',{...data,...user})).pin));}
$('join').onclick=()=>join();
$('profile').onclick=()=>{modal('Profil pemain');const grid=el('div',null,'fields');form.append(grid);field(grid,'Nama panggilan','name',user.name,null,{required:true,maxLength:22});field(grid,'Karakter','avatar',user.avatar,CHARACTERS.map(c=>({id:c.id,label:c.name})));submit('Simpan profil',async data=>{user=data;localStorage.setItem('atlas-profile',JSON.stringify(user));$('myName').textContent=user.name;});};
$('myName').textContent=user.name;
function filters(){return Object.fromEntries([...$('filters').querySelectorAll('select')].map(s=>[s.name,s.value]).filter(([,v])=>v));}
let loadVersion=0;
function blank(title,detail){const d=el('div',null,'blank'),copy=el('div');copy.append(el('strong',title),el('small',detail));d.append(el('i','·','radar'),copy);return d;}
function roomCard(r){const b=el('button',null,'roomCard'),left=el('div');left.append(el('strong',mapBy(r.map).tag),el('small',r.host+' · '+(r.customLabel||label('subjects',r.subject))+' · '+label('grades',r.grade)));b.append(left,el('span',r.online+'/'+r.capacity+' ↗'));b.onclick=async()=>{try{connect((await api('join',{...user,pin:r.pin})).pin);}catch(e){toast(e.message);loadRooms();}};return b;}
async function loadRooms(){if(!catalog.grades.length)return;const seq=++loadVersion;try{const data=await api('rooms?'+new URLSearchParams(screen==='rooms'?filters():{}));if(seq!==loadVersion)return;const empty=()=>blank('Belum ada room terbuka','Buat room publik agar pemain lain bisa bergabung.');
  $('brief').replaceChildren(...(data.length?data.slice(0,1).map(roomCard):[empty()]));$('roomList').replaceChildren(...(data.length?data.map(roomCard):[empty()]));
}catch(e){if(seq===loadVersion){$('brief').replaceChildren(blank('Pencarian terputus','Coba muat ulang daftar room.'));$('roomList').replaceChildren(blank('Room belum dapat dimuat',e.message));}}}
async function quick(filtered){try{const out=await api('quick',{...user,filters:filtered?filters():{}});connect(out.pin);}catch(e){page('rooms');toast(e.message);}}
$('playQuick').onclick=()=>quick(false);$('filterQuick').onclick=()=>quick(true);$('refresh').onclick=loadRooms;
function help(){modal('Cara bermain');const list=el('ol',null,'guideList');for(const t of ['Ikuti penunjuk arah menuju suar hijau. Dekati cincin untuk membuka soal.','Bidik pelat A–D atau sentuh pilihan jawaban. Pilihan terakhir yang diterima server terkunci ketika waktu habis. Jawaban benar bernilai 100 poin.','Komputer: WASD untuk bergerak, mouse untuk melihat, Shift berlari, Spasi melompat, C jongkok, V ganti kamera, 1–4 atau roda mouse ganti alat, Q kembali ke alat sebelumnya, R isi energi. Klik untuk menembak. F mengaktifkan fokus.','HP: gerakkan analog kiri, seret sisi kanan untuk melihat, lalu gunakan tombol aksi.','Esc melepaskan mouse. PG dan TK dapat menggunakan tombol Dengarkan jika suara Indonesia tersedia di perangkat.'])list.append(el('li',t));form.append(list);}
$('guide').onclick=$('controlsBtn').onclick=help;
function send(data){if(socket?.readyState===1){socket.send(JSON.stringify(data));return true;}return false;}
function exit(){conn++;send({type:'leave'});socket?.close();socket=null;pin='';sessionStorage.removeItem('atlas-room');room=null;game?.dispose();game=null;gameLoading=null;clearInterval(timer);if(dialog.open)dialog.close();page('home');}
$('exitRoom').onclick=$('backHome').onclick=exit;
$('leaveGame').onclick=()=>{modal('Keluar dari permainan?');const p=el('p','Timer dan pertandingan pemain lain tetap berjalan.');form.append(p);submit('Keluar ke lobi',async()=>exit());};
$('invite').onclick=async()=>{const url=new URL('/',location.href);url.searchParams.set('pin',pin);try{await navigator.clipboard.writeText(url.href);toast('Tautan undangan disalin.');}catch{modal('Tautan undangan');field(form,'Salin tautan ini','url',url.href,null,{readOnly:true}).select();}};
$('start').onclick=()=>{if(send({type:'start'}))$('start').disabled=true;};
function connect(code,auto=false,reconnect=false){
  const token=++conn;if(!reconnect){retry=0;room=null;}
  socket?.close();pin=code;sessionStorage.setItem('atlas-room',pin);
  if(!reconnect){$('waitPin').textContent=pin;$('waitSettings').textContent='Menghubungkan ke room…';$('roster').replaceChildren();$('start').hidden=true;page('wait');}
  socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/live/'+pin);
  socket.onmessage=async ev=>{if(token!==conn)return;const d=JSON.parse(ev.data);
    if(d.type==='state'){retry=0;room=d;clockDelta=d.now-Date.now();if(d.phase==='lobby'){waiting(d);if(auto&&d.host===d.me){auto=false;send({type:'start'});}}
      else if(d.phase==='play')await playing(d,token);else if(d.phase==='done')finish(d);}
    if(d.type==='poses')game?.poses(d.poses);if(d.type==='correct')game?.correct(d);
    if(d.type==='choice'&&room?.round===d.round){room.choice=d.choice;markChoice();}
    if(d.type==='pong'){$('ping').textContent=Math.round(performance.now()-d.at)+' ms';}
  };
  socket.onclose=ev=>{if(token!==conn||!pin)return;clearInterval(timer);if(ev.code===1000&&ev.reason==='Sesi lain terhubung'){exit();toast('Room sedang dibuka di tab lain.');return;}
    if(retry++<5){toast('Menyambungkan kembali ke room…');setTimeout(()=>{if(token===conn)connect(code,auto,true);},Math.min(5000,700*retry));}
    else {exit();toast('Sesi berakhir atau jaringan terputus. Masuk kembali dengan PIN.');}};
  socket.onopen=()=>{clearInterval(timer);send({type:'ping',at:performance.now()});timer=setInterval(()=>send({type:'ping',at:performance.now()}),5000);};
}
function waiting(d){page('wait');$('roomTitle').replaceChildren(document.createTextNode(mapBy(d.settings.map).tag),el('span','.'));$('waitPin').textContent=d.pin;
  $('waitSettings').textContent=[d.settings.public?'Publik':'Private',label('grades',d.settings.grade),(d.settings.customLabel||label('subjects',d.settings.subject)),d.settings.count+' soal',d.settings.seconds+' detik/soal'].join(' · ');
  $('waitCount').textContent=d.players.length+' / '+d.settings.capacity;$('roster').replaceChildren(...d.players.map(p=>{const n=el('div',null,'person');n.append(el('strong',p.name+(p.id===d.me?' (saya)':'')),el('small',!p.online?'Terputus':p.id===d.host?'Host':'Terhubung'));return n;}));
  $('start').hidden=d.host!==d.me;$('start').disabled=false;$('waitingNote').textContent=d.host===d.me?'Mulai kapan saja, termasuk saat bermain sendiri.':'Menunggu host memulai permainan.';}
let viewedRound=-1,lastQuestion='';
async function playing(d,token){
  if(!game){page('game');if(!gameLoading)gameLoading=import('./game.js').then(({createGame})=>{if(token!==conn||room?.phase!=='play')return null;return createGame($('viewport'),d,send);});
    try{const instance=await gameLoading;if(!instance||token!==conn)return;game=instance;}catch(e){gameLoading=null;exit();toast('Arena 3D gagal dibuka. '+e.message);return;}}
  if(token!==conn||room!==d)return;
  page('game');game.state(d);if(viewedRound!==d.round){if(d.last)toast(d.last.correct?'Benar! +100 poin':'Jawaban: '+d.last.answer);viewedRound=d.round;lastQuestion='';}
  $('hudMap').textContent=mapBy(d.settings.map).tag.toUpperCase();$('hudRound').textContent='Titik '+(d.round+1)+' / '+d.settings.count;$('hudScore').textContent=(d.players.find(p=>p.id===d.me)?.score||0)+' poin';
  $('question').hidden=!d.question;if(d.question&&lastQuestion!==d.question.prompt){
    lastQuestion=d.question.prompt;$('qText').textContent=d.question.prompt;$('qSub').replaceChildren(document.createTextNode((d.settings.customLabel||label('subjects',d.question.subject))+' · PILIH JAWABAN '));
    if(['pg','tk'].includes(d.settings.grade)&&window.speechSynthesis){const b=el('button','♫ Dengarkan');b.style.pointerEvents='auto';b.onclick=()=>{const u=new SpeechSynthesisUtterance(d.question.prompt+'. '+d.question.options.map((s,i)=>'ABCD'[i]+', '+s).join('. '));u.lang='id-ID';window.speechSynthesis.cancel();window.speechSynthesis.speak(u);};$('qSub').append(b);}
    $('choices').replaceChildren(...d.question.options.map((o,i)=>{const b=el('button');b.append(el('b','ABCD'[i]),document.createTextNode(o));b.onclick=()=>game?.select(i);return b;}));}
  markChoice();
}
function markChoice(){const i=room?.choice;[...$('choices').children].forEach((b,j)=>b.classList.toggle('selected',j===i));$('lockHint').textContent=i==null?'Pilih sebelum waktu habis.':'Pilihan terakhir: '+('ABCD'[i])+'. Masih bisa diganti.';game?.mark(i);}
setInterval(()=>{if(room?.phase==='play'){const s=Math.max(0,Math.ceil((room.deadline-Date.now()-clockDelta)/1000));$('clock').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}},200);
function finish(d){if(dialog.open)dialog.close();game?.dispose();game=null;gameLoading=null;viewedRound=-1;lastQuestion='';page('done');$('resultSub').textContent=mapBy(d.settings.map).tag+' · '+d.settings.count+' soal';
$('scores').replaceChildren(...[...d.players].sort((a,b)=>b.score-a.score).map(p=>{const li=el('li',p.name+' ');li.append(el('b',p.score+' poin'));if(p.id===d.me)li.className='me';return li;}));
$('review').replaceChildren(...(d.review||[]).map((q,i)=>{const n=el('div',null,'review');n.append(el('strong',(i+1)+'. '+q.prompt),el('small',(q.correct?'✓ Benar':'✕ '+(q.selected??'Terlewat'))+' · Kunci: '+q.answer));return n;}));}
async function init(){try{await api('profile',{});catalog=await api('catalog');for(const [name,title,items] of [['map','Arena',maps],['subject','Pelajaran',catalog.subjects],['grade','Tingkat',catalog.grades]]){field($('filters'),title,name,'',[{id:'',label:'Semua'},...items]).onchange=loadRooms;}
const requested=new URLSearchParams(location.search).get('pin');if(/^\d{6}$/.test(requested||''))join(requested);else if(sessionStorage.getItem('atlas-room'))connect(sessionStorage.getItem('atlas-room'));await loadRooms();
setInterval(()=>{if(!document.hidden&&['home','rooms'].includes(screen))loadRooms();},15000);}catch(e){toast('Koneksi ke arena gagal. Muat ulang untuk mencoba kembali.');}}
init();
