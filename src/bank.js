// Public metadata. Keep questions and their scoring keys on the game server.
export const GRADES = [
  { id: 'pg', label: 'Playgroup' }, { id: 'tk', label: 'TK' },
  ...Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), label: (i < 6 ? 'SD' : i < 9 ? 'SMP' : 'SMA') + ' kelas ' + (i + 1) })),
  { id: 'umum', label: 'Umum' },
];
export const SUBJECTS = Object.entries({
  mix: 'Campuran', matematika: 'Matematika', ipa: 'IPA', bahasa: 'Bahasa Indonesia',
  inggris: 'Bahasa Inggris', informatika: 'Informatika', ips: 'IPS', seni: 'Seni Budaya',
  pjok: 'PJOK', pancasila: 'Pendidikan Pancasila', fisika:'Fisika', kimia:'Kimia', biologi:'Biologi',
  ekonomi:'Ekonomi', geografi:'Geografi', sejarah:'Sejarah', prakarya:'Prakarya',
}).map(([id,label]) => ({id,label}));

// Buffering random words avoids a system call for every choice.
let entropy = new Uint32Array(128);
let cursor = entropy.length;
function rand(n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('Rentang acak salah.');
  const limit = 4294967296 - (4294967296 % n);
  let word;
  do {
    if (cursor === entropy.length) { crypto.getRandomValues(entropy); cursor = 0; }
    word = entropy[cursor++];
  } while (word >= limit);
  return word % n;
}
const between = (lo, hi) => lo + rand(hi - lo + 1);
const pick = xs => xs[rand(xs.length)];
function shuffle(xs) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const choose = (xs,n) => shuffle(xs).slice(0,n);
const q = (prompt,correct,wrongs,source) => ({ prompt, correct:String(correct), wrongs:wrongs.map(String), source });
function num(prompt, correct, step = 1) {
  const offsets = shuffle([-3,-2,-1,1,2,3,4,5]).map(v=>correct+v*step).filter(v=>v>=0);
  return q(prompt,correct,offsets);
}
const people = 'Ayu Bima Citra Damar Eka Fajar Gita Hana Indra Jaya Kirana Lani Niko Oki Putri Raka Sari Tio Uli Vina Wira Yani'.split(' ');
const objects = ['apel','jeruk','kelereng','kancing','pensil','balok','buku','kotak','manik','kartu','stiker','daun','biji','pita'];
const marks = ['★','●','▲','■','◆','♥'];
const emoji = ['🍎','🍋','🍇','🥕','🌽','🐟','🌸','🍃','🚗','🐢','🐈','🐝'];
const near = d=>d < 1 ? 3 : d< 3 ? 7 : 4 + d * 3;
const directions = ['utara','timur','selatan','barat'];
const direction = i => directions[(i % 4 + 4) % 4];
const seq = (values,n) => Array.from({length:n},(_,i)=>values[i%values.length]).join(' ');
function sequencePattern(d) {
  const tiles = choose(d<2?emoji:marks,3);
  const unit = pick([[tiles[0],tiles[1]],[tiles[0],tiles[0],tiles[1]],[...tiles],[tiles[0],tiles[1],tiles[1]]]);
  const length = d<2 ? between(4,6) : between(6,9);
  return q('Apa yang muncul setelah pola ini? '+seq(unit,length)+' …',unit[length%unit.length],[...tiles,...(d<2?emoji:marks)]);
}
function compareValues(d,context) {
  const names = choose(people,4), nums = choose(Array.from({length:Math.max(6,near(d))},(_,i)=>i+1),4);
  const high = rand(2)===1, target = high?Math.max(...nums):Math.min(...nums);
  return q(names.map((name,i)=>name+' '+nums[i]).join(', ')+'. Siapa yang '+context+' paling '+(high?'banyak':'sedikit')+'?',names[nums.indexOf(target)],names);
}
function pictureCount(d) {
  const [a,b] = choose(emoji,2), na = between(1,d<1?3:5), nb = between(1,3);
  const row = shuffle([...Array(na).fill(a),...Array(nb).fill(b)]).join(' ');
  return num(row+' — Berapa banyak '+a+'?',na);
}
// Adapted from the openly licensed IAMS National Foundation Phase Mathematics
// Olympiad, Connexions modules m33457 and m35669. Attribution is in the credits.
function olympiadMath(d) {
  const child=pick(people), item=pick(objects), n=between(2,Math.max(4,near(d))), k=between(2,d<3?4:9);
  const puzzles=[
    () => {const numbers=choose(Array.from({length:d<1?6:16},(_,i)=>i+1),4);
      return q('Dari kartu '+numbers.join(', ')+', kartu mana yang bilangannya paling kecil?',Math.min(...numbers),numbers);},
    () => num(child+' membagikan separuh '+item+' miliknya. Sisanya '+n+'. Berapa '+item+' semula?',2*n),
    () => num(child+' menghitung dengan lompatan '+k+' mulai dari '+k+'. Bilangan apa di urutan ke-'+n+'?',k*n),
  ];
  if(d>=3)puzzles.push(
    () => num('Sebanyak '+k+' persegi berjajar. Tiap pasangan persegi bertetangga berbagi satu sisi. Berapa batang yang dibutuhkan jika satu batang untuk tiap sisi satuan?',3*k+1),
    () => {const [left,right]=choose(objects,2);return num('Harga '+k+' '+left+' setara '+n+' '+right+'. Dengan uang untuk '+(k*3)+' '+left+', berapa '+right+' yang terbeli?',n*3);},
    () => {const other=between(2,12);return num('Dua bilangan rahasia berjumlah '+(n+other)+'. Dua kali bilangan pertama ditambah bilangan kedua adalah '+(2*n+other)+'. Berapa bilangan kedua?',other);},
    () => {const digits=choose(['1','2','3','4','5','6','7','8','9'],k%2?3:4);return num('Gunakan kartu '+digits.join(', ')+' masing-masing tepat sekali. Berapa bilangan berbeda yang dapat disusun?',digits.length===3?6:24);},
  );
  const result=pick(d<1?puzzles.slice(0,1):puzzles)();
  return {...result,source:'iams-math'};
}
function math(d) {
  if(rand(5)===0)return olympiadMath(d);
  const n = near(d), a = between(1,n), b = between(1,n), name = pick(people), item = pick(objects);
  const list = [
    () => num(name+' punya '+a+' '+item+' dan mendapat '+b+' lagi. Berapa sekarang?',a+b),
    () => num('Dari '+(a+b)+' '+item+', '+a+' diberikan kepada '+name+'. Berapa sisanya?',b),
    () => sequencePattern(d), () => pictureCount(d),
  ];
  if (d>=3) list.push(
    () => num('Ada '+a+' rak. Tiap rak berisi '+b+' buku. Jika '+a+' buku dipinjam, berapa yang tersisa?',a*b-a),
    () => num('Barisan '+a+', '+(a+b)+', '+(a+2*b)+', … bertambah tetap. Berapa suku ke-5?',a+4*b,b),
    () => num('Persegi panjang memiliki panjang '+(a+b)+' cm dan lebar '+a+' cm. Berapa kelilingnya dalam cm?',4*a+2*b,2),
    () => { const c=between(2,8);return num((a*c)+' manik dibagi rata ke '+c+' kantong. Berapa isi tiap kantong?',a); }
  );
  if (d>=7) return pick([
    () => num('Bilangan x memenuhi '+(a+1)+'x − '+b+' = '+((a+1)*b-b)+'. Berapa x?',b),
    () => { const k=between(3,Math.max(5,d));return num('Dalam liga '+k+' tim, setiap pasangan bertanding sekali. Berapa pertandingan?',k*(k-1)/2); },
    () => { const k=between(2,8);return num('Titik ('+a+', '+b+') digeser '+k+' satuan ke kanan lalu dicerminkan terhadap sumbu-y. Berapa nilai mutlak absis akhirnya?',a+k); },
    () => { const k=between(2,8);return num('Barisan aritmetika dimulai '+a+', '+(a+b)+'. Berapa jumlah '+k+' suku pertamanya?',k*(2*a+(k-1)*b)/2); },
    () => { const k=between(2,8);return num('Dari '+(a+k)+' bola merah dan '+k+' bola putih, minimal berapa bola harus diambil tanpa melihat agar pasti mendapat bola merah?',k+1); },
    ...(d>=10?[
      () => {const k=between(2,4);return num('Untuk f(x) = '+a+'x² + '+b+'x, berapa gradien garis singgung saat x = '+k+'?',2*a*k+b);},
      () => num('Jika akar persamaan kuadrat adalah '+a+' dan '+b+', berapa koefisien konstan dari bentuk monik x² + px + q?',a*b),
    ]:[]),
  ])();
  return pick(d<3?list:list.slice(4))();
}

const animals = [
  ['kucing','anak kucing','mengeong','darat'],['ayam','anak ayam','berkotek','darat'],
  ['bebek','anak bebek','berkwek','darat dan air'],['sapi','anak sapi','melenguh','darat'],
  ['burung pipit','anak pipit','berkicau','darat'],['katak','berudu','berkuak','darat dan air'],
];
const plantParts = [['akar','menyerap air dari tanah'],['daun','menangkap cahaya untuk fotosintesis'],['batang','menopang daun dan bunga'],['bunga','menjadi tempat penyerbukan']];
const materials = [['kertas','menyerap air'],['karet gelang','dapat direntangkan'],['kaca bening','meneruskan cahaya'],['paku besi','ditarik magnet']];
function fact(rows, prompt) { const target=pick(rows); return q(prompt(target[1]),target[0],rows.map(pair=>pair[0])); }
function science(d) {
  const a=between(2,near(d)+3), b=between(2,near(d)+3);
  const names=choose(people,2), item=pick(['bayam','kacang hijau','jagung','tomat','sawi','cabai','kangkung','kedelai']);
  const options = [
    () => {const animal=pick(animals);return q(names[0]+' mendengar hewan '+animal[2]+'. Hewan apa itu?',animal[0],animals.map(x=>x[0]));},
    () => fact(plantParts,prop=>'Pada tanaman '+item+', bagian mana yang '+prop+'?'),
    () => fact(materials,prop=>names[0]+' mencari bahan yang '+prop+'. Pilih contoh paling cocok.'),
    () => compareValues(d,'mengumpulkan daun'),
    () => { const [first,last]=choose(['🌱','🌼','🌿','🍂','🍄','🌵','🌷','🌳'],2);
      const k=between(1,d<2?3:5);return num(seq([first,last],k*2)+' — Ada berapa '+first+'?',k); },
  ];
  if (d>=3) options.push(
    () => num('Suhu air mula-mula '+a+' °C. Setelah dipanaskan, suhunya naik '+b+' °C. Berapa suhu akhirnya (°C)?',a+b),
    () => num('Batang '+item+' tumbuh dari '+a+' cm menjadi '+(a+b)+' cm. Berapa pertambahan tingginya (cm)?',b),
    () => {const light=rand(2);return q(names[1]+' menanam '+item+' di dua pot. '+(light?'Jumlah air sama, lama pencahayaan berbeda.':'Lama pencahayaan sama, volume air berbeda.')+' Faktor apa yang sengaja diubah?',light?'Lama pencahayaan':'Volume air',['Jenis tanaman','Ukuran pot','Jenis tanah']);},
  );
  if (d>=7) return pick([
    () => num('Sebuah benda bermassa '+(a*b)+' g memiliki volume '+a+' cm³. Berapa massa jenisnya (g/cm³)?',b),
    () => num('Benda bergerak lurus dengan laju tetap '+a+' m/s selama '+b+' s. Berapa jaraknya (m)?',a*b),
    () => num('Pada rantai makanan, produsen menyimpan '+(a*100)+' kJ. Jika 10% diteruskan per tingkat, berapa kJ sampai ke konsumen kedua?',a),
    () => num('Pada rangkaian sederhana, tegangan '+(a*b)+' V dihubungkan ke hambatan '+a+' Ω. Berapa kuat arus (A)?',b),
    () => num('Sel awal berjumlah '+a+'. Setelah '+(b%4+1)+' pembelahan biner serempak tanpa kematian, berapa jumlah sel?',a*2**(b%4+1)),
    () => num('Gelombang memiliki frekuensi '+a+' Hz dan panjang gelombang '+b+' m. Berapa cepat rambatnya (m/s)?',a*b),
    ...(d>=10?[() => num('Sampel isotop bermassa '+(a*8)+' g. Setelah tiga waktu paruh, berapa gram isotop asal yang tersisa?',a),
      () => num('Model gas ideal: pada suhu tetap, volume gas '+(a*2)+' L menyusut menjadi '+a+' L. Jika tekanan awal '+b+' kPa, berapa tekanan akhir (kPa)?',2*b)]:[]),
  ])();
  return pick(d<3?options.slice(0,5):options)();
}

const words = [
  ['buku','book','books'],['pintu','door','doors'],['kursi','chair','chairs'],['ikan','fish','fish'],['sepeda','bicycle','bicycles'],['topi','hat','hats'],['pohon','tree','trees'],['rumah','house','houses'],['piring','plate','plates'],['bintang','star','stars'],['pensil','pencil','pencils'],['meja','table','tables'],['tas','bag','bags'],['bola','ball','balls'],['kotak','box','boxes'],['burung','bird','birds'],['awan','cloud','clouds'],['jendela','window','windows'],['bunga','flower','flowers'],['apel','apple','apples'],['kelinci','rabbit','rabbits'],['boneka','doll','dolls'],['daun','leaf','leaves'],['jam tangan','watch','watches'],
];
const activities=[
  ['draw','draws','drew','drawn','drawing','a map'],['write','writes','wrote','written','writing','a letter'],
  ['read','reads','read','read','reading','a book'],['paint','paints','painted','painted','painting','a wall'],
  ['make','makes','made','made','making','a kite'],['send','sends','sent','sent','sending','a message'],
  ['take','takes','took','taken','taking','a photo'],['choose','chooses','chose','chosen','choosing','a seat'],
  ['buy','buys','bought','bought','buying','fruit'],['wear','wears','wore','worn','wearing','a hat'],
  ['carry','carries','carried','carried','carrying','a bag'],['bring','brings','brought','brought','bringing','a gift'],
];
function english(d) {
  const [a,b] = choose(words,2), name = pick(people), act=pick(activities), n=between(2,near(d)+3);
  if (d<3 || (d<7&&rand(2))) {
    return pick([
      () => q('Apa arti “'+a[1]+'” dan “'+b[1]+'”, secara berurutan?',a[0]+' dan '+b[0],[b[0]+' dan '+a[0],a[0]+' dan '+a[0],b[0]+' dan '+b[0]]),
      () => q('Mana bahasa Inggris untuk “'+a[0]+'”?',a[1],words.map(w=>w[1])),
      () => q('Benda pertama adalah '+a[0]+', lalu '+b[0]+'. Apa nama benda kedua dalam bahasa Inggris?',b[1],words.map(w=>w[1])),
    ])();
  }
  return pick([
    () => q('Lengkapi: “Every morning, '+name+' ___ '+act[5]+ '.”',act[1],[act[0],act[4],'has '+act[4]]),
    () => q('Lengkapi: “Right now, '+name+' is ___ '+act[5]+ '.”',act[4],[act[0],act[1],'to '+act[0]]),
    () => q('Lengkapi: “Yesterday, '+name+' ___ '+act[5]+ '.”',act[2],[act[1],act[4],'will '+act[0]]),
    () => q('Pilih kata benda yang tepat: “'+name+' has '+n+' ___.” ('+a[0]+')',a[2],words.filter(w=>w!==a).map(w=>w[2])),
    ...(d>=7?[
      () => q('Lengkapi: “By noon tomorrow, '+name+' will have ___ '+act[5]+ '.”',act[3],[act[4],act[1],'to '+act[0]]),
      () => q('Lengkapi: “If '+name+' had time, '+name+' ___ '+act[5]+ '.”','would '+act[0],[act[1],'has '+act[4],'is '+act[0]]),
    ]:[]),
  ])();
}
const verbs=[['membaca','buku','dibaca'],['menggambar','peta','digambar'],['menanam','pohon','ditanam'],['membeli','pena','dibeli'],['melipat','kertas','dilipat'],['membawa','tas','dibawa'],['memasak','nasi','dimasak'],['memotret','bunga','dipotret'],['merakit','model','dirakit'],['menyusun','balok','disusun'],['menulis','surat','ditulis'],['membersihkan','meja','dibersihkan'],['menghapus','papan','dihapus'],['menjemur','pakaian','dijemur'],['mencuci','piring','dicuci'],['mengisi','botol','diisi']];
const places = ['di rumah','di sekolah','di balai desa','di pasar','di halaman','di kebun','di taman','di teras'];
const opposites = [['tinggi','rendah'],['besar','kecil'],['cepat','lambat'],['panas','dingin'],['panjang','pendek'],['terang','gelap'],['tebal','tipis'],['jauh','dekat'],['penuh','kosong'],['berat','ringan'],['kering','basah'],['baru','lama']];
function language(d) {
  const [a,b]=choose(people,2), v = pick(verbs), p=pick(places), [w1,w2]=choose(words,2);
  const sentence=a+' '+v[0]+' '+v[1]+' '+p;
  if(d<3)return pick([
    () => q('Huruf pertama kata “'+w1[0]+'” adalah …',w1[0][0],Array.from('abcdefghijklmnopqrstuvwxyz')),
    () => q('Kata mana yang diawali huruf '+w1[0][0].toUpperCase()+'?',w1[0],words.filter(x=>x[0][0]!==w1[0][0]).map(x=>x[0])),
    () => q('Dengarkan: “'+sentence+'.” Siapa yang '+v[0]+'?',a,[b,v[1],p]),
    () => q('Dengarkan: “'+a+' melihat '+w1[0]+' dan '+b+' melihat '+w2[0]+ '.” Apa yang dilihat '+b+'?',w2[0],words.map(x=>x[0])),
  ])();
  return pick([
    () => q('“'+sentence+'.” Manakah predikatnya?',v[0],[a,v[1],p]),
    () => q('“'+sentence+'.” Manakah keterangan tempatnya?',p,[a,v[1],v[0]]),
    () => q('“'+sentence+'.” Manakah objek kalimatnya?',v[1],[v[0],a,p]),
    () => q('Dalam kalimat “'+sentence+'”, bentuk pasif dari kata '+v[0]+' adalah …',v[2],verbs.map(x=>x[2])),
    () => {const t=pick(opposites);return q('“'+a+' mencari kata yang berlawanan dengan '+t[0]+ '.” Kata apa yang dicari?',t[1],opposites.filter(x=>x!==t).map(x=>x[1]));},
    ...(d>=7?[
      () => q('“'+a+' '+v[0]+' '+v[1]+' agar '+b+' dapat belajar.” Kata “agar” menyatakan hubungan …','tujuan',['penyebab','perbandingan','urutan waktu']),
      () => q('“Meskipun lelah, '+a+' tetap '+v[0]+' '+v[1]+'.” Hubungan kedua klausa adalah …','konsesif',['syarat','akibat','tujuan']),
      () => q('“'+a+' berkata kepada '+b+', ‘Saya akan '+v[0]+' '+v[1]+'.’” Siapa rujukan “saya”?',a,[b,v[1],v[0]]),
    ]:[]),
  ])();
}

const objectsForShelf = ['peta','topi','tenda','tali','jaket','lampu','peluit','kompas','spidol','bendera','buku','kacamata'];
// Adaptations of three tasks in Bebras Indonesia 2018. See public/sumber-soal.html.
function camping() {
  const shelf=choose(objectsForShelf,4), used=choose(shelf,2);
  const after=[...shelf.filter(x=>used.includes(x)),...shelf.filter(x=>!used.includes(x))];
  return q('Rak dari kiri: '+shelf.join(', ')+'. '+used.join(' dan ')+' dipindah ke kiri. Urutan relatif tiap kelompok tetap. Benda paling kanan sekarang?',after.at(-1),shelf,'bebras-kemping');
}
function scheduling() {
  const limit=between(4,30), days=choose(['Sen','Sel','Rab','Kam','Jum','Sab'],4), rates=choose([1,2,3],2);
  const reports=shuffle([
    ['cerah',limit-rates[0],'kosong',true],
    ['hujan',limit-rates[1],'kosong',false],
    ['cerah',limit+rates[0],'kosong',false],
    ['cerah',limit-rates[0],'dipakai',false],
  ]);
  return q('Pilih hari cerah, angin < '+limit+' km/jam, lapangan kosong. '+days.map((day,i)=>day+': '+reports[i].slice(0,3).join('/')).join('; ')+'.',days[reports.findIndex(r=>r[3])],days,'bebras-kondisi');
}
function flood() {
  const h=between(3,12), w=between(3,12), x=between(1,w), y=between(1,h);
  const row=between(1,h), col=between(1,w);
  return num('Air mulai di petak ('+x+','+y+') pada hari 0. Setiap hari air meluas satu petak ke empat arah, tanpa rintangan. Hari pertama air tiba di ('+col+','+row+')?',Math.abs(x-col)+Math.abs(y-row));
}
function computing(d) {
  const n=near(d), steps=between(2,n+1), hops=between(1,n+1), turn=rand(2)?1:-1, dir=rand(4), person=pick(people);
  if(d<3)return pick([
    () => sequencePattern(d),
    () => {const tiles=choose(emoji,4);return q('Urutannya '+tiles.join(' ') +'. Apa yang datang sesudah '+tiles[1]+'?',tiles[2],tiles);},
    () => {const tiles=choose(emoji,4);const rotated=[...tiles].reverse();return q('Robot membaca dari kanan: '+tiles.join(' ')+'. Mana yang dibaca pertama?',rotated[0],tiles);},
  ])();
  const puzzles=[
    () => num('Robot maju '+steps+' petak, lalu mengulang “maju '+hops+' petak” sebanyak 3 kali. Seberapa jauh dari awal?',steps+3*hops),
    () => q(person+' menghadap '+directions[dir]+'. Robot berputar '+(turn>0?'kanan':'kiri')+' 90° sebanyak '+steps+' kali. Menghadap ke mana sekarang?',direction(dir+turn*steps),directions),
    () => camping(),
    () => {const row=choose(people,4);return q('Antrean dari depan: '+row.join(', ')+'. Setelah dua orang dilayani, siapa yang berikutnya?',row[2],row);},
  ];
  if(d>=7)puzzles.push(
    () => scheduling(), () => ({...flood(),source:'bebras-danau'}),
    () => {const j=between(2,8);return num('x mulai dari '+steps+'. Ulangi '+j+' kali: x ← x + '+hops+'. Berapa x di akhir?',steps+j*hops);},
    () => {const j=between(1,8);return num('Bilangan biner '+(steps+j).toString(2)+' bernilai berapa dalam desimal?',steps+j);},
    () => {const row=choose(objectsForShelf,5);return q('Tumpukan diisi '+row.join(', ')+' secara berurutan. Setelah dua barang teratas diambil, barang apa yang sekarang teratas?',row[2],row);},
  );
  return pick(puzzles)();
}

const coords=['pasar','sekolah','perpustakaan','taman','stasiun','balai desa','kantor pos','jembatan','halte','lapangan','museum','kebun','terminal','toko'];
const professions=[['petani','menanam padi'],['nelayan','menangkap ikan di laut'],['guru','mengajar di kelas'],['penjahit','membuat pakaian pesanan'],['pengemudi bus','mengantar penumpang dengan bus'],['pustakawan','mengelola perpustakaan'],['koki','memasak di restoran'],['pelukis','melukis kanvas pesanan']];
function social(d) {
  const [site,other] = choose(coords,2), person=pick(people), dir=rand(4), a=between(2,near(d)+2), b=between(2,near(d)+2);
  const goods=pick(['beras','kopi','cabai','jagung','kedelai','gula','ubi','kacang']);
  const pool=[
    () => {const role=pick(professions);return q(person+' '+role[1]+'. Apa pekerjaannya?',role[0],professions.map(r=>r[0]));},
    () => q(site+' ada di '+directions[dir]+' '+other+'. Di arah mana '+other+' jika dilihat dari '+site+'?',direction(dir+2),directions),
    () => {const sites=choose(coords,4);return q('Rute '+person+': '+sites.join(' → ')+'. Di mana ia berhenti sesudah '+sites[1]+'?',sites[2],sites);},
  ];
  if(d<3)return pick(d<1?[pool[0],pool[2]]:pool)();
  pool.push(
    () => num('Di pasar, '+a+' kg '+goods+' bernilai Rp'+(a*b)+'.000. Berapa harga 1 kg dalam ribuan rupiah?',b),
    () => {const scale=between(1,9)*100000;return num('Jarak '+site+' ke '+other+' pada peta '+a+' cm. Jika skalanya 1 : '+scale+', berapa jarak sebenarnya (km)?',a*scale/100000);},
    () => {const otherPrice=between(1,8);return num('Pedagang menjual '+a+' kg '+goods+'. Laba tiap kg Rp'+otherPrice+'.000. Berapa total laba dalam ribuan rupiah?',a*otherPrice);},
  );
  if(d>=7)pool.push(
    () => num('Wilayah seluas '+a+' km² dihuni '+(a*b*10)+' orang. Berapa kepadatan penduduknya (jiwa/km²)?',b*10),
    () => {const y=between(1850,1980);return num('Arsip '+site+' dibuka tahun '+y+' dan dipindah tahun '+(y+a)+'. Berapa selisih tahunnya?',a);},
    () => num('Harga '+goods+' naik dari Rp'+(a*10)+'.000 menjadi Rp'+(a*11)+'.000. Jika sebelumnya membeli '+b+' kg, berapa tambahan biaya untuk jumlah yang sama (ribuan rupiah)?',a*b),
  );
  return pick(pool)();
}

const instruments=[['gitar','dipetik'],['biola','digesek'],['angklung','digetarkan dengan digoyang'],['seruling','ditiup'],['drum','dipukul dengan stik'],['piano','dimainkan dengan menekan tuts yang menggerakkan palu senar']];
const notes=['do','re','mi','fa','sol','la','si'];
const colorPairs=[['merah','kuning','jingga'],['kuning','biru','hijau'],['biru','merah','ungu']];
function arts(d) {
  const n=between(2,near(d)+2), b=between(2,5), person=pick(people);
  const row=choose(['merah','hijau','kuning','ungu','jingga','biru','putih'],3);
  const pool=[
    () => sequencePattern(d),
    () => fact(instruments,prop=>person+' memilih alat musik yang '+prop+'. Alat apa itu?'),
    () => q('Motif warna '+row.join(' – ')+' diulang. Warna apa yang mengikuti '+row[1]+'?',row[2],[...row,'hitam']),
    () => {const [a,b,c]=pick(colorPairs);return q('Pada roda warna cat RYB, '+person+' mencampur '+a+' dan '+b+'. Apa warna sekundernya?',c,['jingga','hijau','ungu','hitam']);},
  ];
  if(d>=3)pool.push(
    () => num('Lagu dalam birama '+b+'/4 dimainkan selama '+n+' birama penuh. Berapa ketuk not seperempat seluruhnya?',n*b),
    () => {const i=rand(7);return q('Dalam urutan do–re–mi–fa–sol–la–si yang berulang, '+person+' mulai pada '+notes[i]+' dan naik '+b+' langkah nada. Sampai nada apa?',notes[(i+b)%7],notes);},
    () => num('Satu pola ritme berisi '+b+' tepuk. Jika diulang '+n+' kali, berapa tepuk yang terdengar?',n*b),
  );
  if(d>=7)pool.push(
    () => {const tempo=between(12,40)*3;return num('Pada tempo '+tempo+' ketuk per menit, berapa ketuk yang terdengar selama '+n+' menit?',tempo*n);},
    () => num('Gambar mural selebar '+n+' cm diperbesar '+b+' kali secara proporsional. Berapa lebar barunya (cm)?',n*b),
  );
  return pick(pool)();
}

const sports=[['sepak bola','menendang bola ke gawang'],['bola basket','memasukkan bola ke keranjang'],['bulu tangkis','memukul kok dengan raket'],['renang','bergerak di kolam lintasan'],['panahan','membidik lingkaran sasaran dengan anak panah'],['tenis meja','memukul bola ringan dengan bet di atas meja'],['lompat jauh','melompat dari papan tumpu ke bak pasir'],['lari estafet','berlari sambil memindahkan tongkat ke rekan']];
function physical(d) {
  const a=between(2,near(d)+4), b=between(2,near(d)+3), name=pick(people);
  const actions=choose(['jalan','lari','lompat','tepuk','jongkok','berdiri','putar'],3);
  const games=[
    () => fact(sports,prop=>name+' berlatih '+prop+'. Cabang olahraga apa itu?'),
    () => q('Ikuti urutan gerak: '+actions.join(' → ')+'. Gerak apa sesudah '+actions[0]+'?',actions[1],[...actions,'duduk']),
    () => compareValues(d,'mencetak poin'),
    () => num(name+' melompat '+(d<3?2:a)+' kali lalu '+(d<3?3:b)+' kali. Berapa jumlah lompatan?',d<3?5:a+b),
  ];
  if(d>=3)games.push(
    () => num('Lintasan estafet terdiri dari '+a+' bagian sepanjang '+b+' meter. Berapa panjang totalnya (m)?',a*b),
    () => num('Dalam permainan basket, tim '+name+' membuat '+a+' tembakan dua angka dan '+b+' lemparan bebas yang masuk. Berapa poin?',2*a+b),
    () => num('Satu regu menempuh '+(a*b)+' meter dalam '+b+' detik. Berapa laju rata-ratanya dalam m/s?',a),
  );
  if(d>=7)games.push(
    () => {const percent=between(1,9)*10;return num(name+' melakukan '+(a*10)+' percobaan. '+percent+'% berhasil. Berapa percobaan yang berhasil?',a*percent/10);},
    () => {const size=between(3,12);return num('Dalam turnamen '+size+' tim, setiap tim bertemu tiap lawan dua kali. Berapa jumlah pertandingan?',size*(size-1));},
  );
  return pick(games)();
}

const civicCases=[
  ['menemukan dompet milik teman','Mengembalikan dompet','Memakainya untuk jajan','Menyembunyikannya','Membagikan isinya'],
  ['ingin berbicara ketika teman sedang menjelaskan','Menunggu giliran','Berteriak lebih keras','Mengejek pembicara','Meninggalkan kelompok'],
  ['tidak setuju dengan usul temannya','Menyampaikan alasan dengan sopan','Memaksa semua orang setuju','Menghina pengusul','Merebut giliran bicara'],
  ['melihat teman baru belum diajak bermain','Mengundangnya bergabung','Membiarkannya selalu sendiri','Mengejek logatnya','Menutup pintu'],
  ['meminjam penghapus milik teman','Mengembalikan setelah dipakai','Mengaku sebagai pemilik','Menyimpan diam-diam','Membuangnya'],
  ['mendapat giliran membersihkan kelas','Menjalankan tugas bersama','Menyuruh semua teman pergi','Meninggalkan sampah','Bersembunyi saat piket'],
  ['mengetahui ada teman yang berbeda keyakinan','Menghormati ibadahnya','Melarangnya beribadah','Mengejek keyakinannya','Mengucilkannya'],
  ['melihat sampah di halaman bersama','Membuangnya di tempat sampah','Menendangnya ke kelas lain','Menimbunnya di meja','Membuangnya ke selokan'],
  ['tanpa sengaja merusak hasil karya teman','Mengaku dan membantu memperbaiki','Menyalahkan teman lain','Menyembunyikan kerusakan','Menertawakan teman'],
  ['ingin memakai alat yang sedang dipakai teman','Meminta izin dan menunggu','Merebut alat itu','Memaksa teman pulang','Menyembunyikan barang teman'],
  ['menjadi pemimpin diskusi kelompok','Memberi tiap anggota kesempatan bicara','Memilih teman dekat saja','Memutuskan sebelum diskusi','Melarang pertanyaan'],
  ['mendengar ejekan terhadap teman','Menolak ejekan dan mendampingi teman','Merekam untuk mengejek','Ikut menertawakan','Menyebarkan ejekan'],
  ['mendapat informasi yang sumbernya belum jelas','Memeriksa sumber sebelum membagikan','Mengarang rincian baru','Langsung menyebarkan','Memalsukan nama penulis'],
  ['mengetahui teman kesulitan membaca pengumuman','Membantu membacakannya','Mencabut pengumuman','Menertawakannya','Memberi informasi keliru'],
];
function civics(d) {
  const who=pick(people), [a,b]=choose(people,2);
  const row=pick(civicCases), n=near(d), copies=between(2,Math.max(4,n)), groups=between(2,Math.max(4,n));
  const pool=[
    () => q(who+' '+row[0]+'. Tindakan yang menghargai orang lain adalah …',row[1],row.slice(2)),
    () => {const lineup=choose(people,4);return q('Giliran bermain disepakati: '+lineup.join(', ')+'. Siapa yang mendapat giliran sesudah '+lineup[1]+'?',lineup[2],lineup);},
  ];
  if(d>=3)pool.push(
    () => num('Sesuai kesepakatan kelas, '+(copies*groups)+' lembar dibagi sama rata ke '+groups+' kelompok. Berapa lembar hak tiap kelompok?',copies),
    () => q(a+' ingin '+b+' ikut menentukan kegiatan. Bagaimana keputusan bersama dapat diambil?','Mendengar pendapat tiap peserta',['Menyembunyikan pilihan','Mengabaikan suara berbeda','Menyerahkan semua suara ke satu peserta']),
  );
  if(d>=7)pool.push(
    () => {const count=between(12,80);return num('Aturan rapat mengharuskan lebih dari separuh '+count+' anggota menyetujui usul. Minimal berapa suara setuju?',Math.floor(count/2)+1);},
    () => {const count=between(10,45)*3;return num('Aturan forum '+who+' memerlukan sekurangnya dua pertiga dari '+count+' anggota untuk hadir. Berapa orang agar kuorum?',count*2/3);},
    () => {const names=choose(people,4), points=choose(Array.from({length:20},(_,i)=>i+1),4);return q('Tiap warga memilih satu wakil. Yang terbanyak menang. '+names.map((x,i)=>x+' '+points[i]).join(', ')+'. Siapa wakil terpilih?',names[points.indexOf(Math.max(...points))],names);},
  );
  return pick(pool)();
}
const stateExamples = {
  padat:['batu','pensil','koin','balok kayu','kancing','sendok','kelereng','es batu','penggaris','piring'],
  cair:['air minum','susu','minyak goreng','jus apel','madu cair','sirup','santan cair','teh','cuka dapur','air kelapa'],
  gas:['udara','oksigen','uap air','karbon dioksida'],
};
function pairsFromCategory(groups, target, prompt) {
  const matching=choose(groups[target],2);
  const other=Object.keys(groups).filter(k=>k!==target).flatMap(k=>groups[k]);
  const incorrect=choose(other,2);
  const cards=shuffle([...matching,...incorrect]);
  const wrongs=[incorrect, [matching[0],incorrect[0]], [incorrect[1],matching[1]]].map(pair=>pair.join(' dan '));
  return q('Kartu: '+cards.join(', ')+'. '+prompt,matching.join(' dan '),wrongs);
}
const labTools=[
  ['penggaris','panjang pensil'],['neraca','massa sebuah batu'],['termometer','suhu air'],
  ['stopwatch','waktu tempuh pelari'],['gelas ukur','volume air'],
];
const motions=['menggelindingkan bola','mendorong kereta mainan','menarik tali layang-layang','menggeser kursi','menekan spons','menarik daun pintu','mendorong troli','menarik gerobak'];
function physics(d) {
  const a=between(2,near(d)+3), b=between(2,near(d)+3), who=pick(people), object=pick(['bola','kereta','mobil mainan','sepeda','perahu','balok']);
  if(d<3)return pick([
    () => {const [tool,prop]=pick(labTools);return q(who+' ingin mengukur '+prop+'. Alat mana yang cocok?',tool,labTools.map(x=>x[0]));},
    () => {const move=pick(motions.slice(2)),first=move.split(' ')[0];return q(who+' '+move+'. '+(first==='mendorong'||first==='menarik'?'Gerakan ini termasuk …':'Kata gerak yang dipakai adalah …'),first==='mendorong'?'dorongan':first==='menarik'?'tarikan':first,['dorongan','tarikan','pantulan','putaran','melipat']);},
    () => {const names=choose(people,4), a=choose([1,2,3,4,5,6],4);return q('Mobil mainan menempuh jarak: '+names.map((n,i)=>n+' '+a[i]+' petak').join(', ')+'. Mobil siapa yang terjauh?',names[a.indexOf(Math.max(...a))],names);},
    () => {const toys=choose(['bola','kelereng','gasing','mobil','roda','kereta'],4);return q('Yang bergerak: '+toys[0]+' dan '+toys[1]+'. Yang diam: '+toys[2]+' dan '+toys[3]+'. Pilih pasangan yang bergerak.',toys[0]+' dan '+toys[1],[toys[1]+' dan '+toys[2],toys[2]+' dan '+toys[3],toys[3]+' dan '+toys[0]]);},
  ])();
  const choices=[
    () => num('Laju '+object+' tetap '+a+' m/s selama '+b+' detik. Berapa meter jaraknya?',a*b),
    () => num('Benda berpindah '+(a*b)+' m dalam '+b+' s dengan gerak lurus beraturan. Berapa lajunya dalam m/s?',a),
    () => num('Dua gaya segaris berlawanan sebesar '+(a+b)+' N dan '+a+' N bekerja pada '+object+'. Berapa besar resultannya (N)?',b),
    () => {const cold=between(2,25);return num('Suhu mula-mula '+cold+' °C. Kemudian termometer menunjukkan '+(cold+b)+' °C. Berapa kenaikannya (°C)?',b);},
  ];
  if(d>=7)choices.push(
    () => num('Sebuah '+object+' bermassa '+a+' kg dipercepat '+b+' m/s². Berapa besar gaya resultan (N)?',a*b),
    () => num('Gelombang berulang '+(a*b)+' kali dalam '+b+' detik. Berapa frekuensinya (Hz)?',a),
    () => num('Tuas seimbang memiliki beban '+(a*b)+' N pada lengan 1 m. Berapa gaya pada lengan '+b+' m (N)?',a),
  );
  if(d>=10)choices.push(
    () => num('Massa '+object+' adalah '+(2*a)+' kg, lajunya '+b+' m/s. Berapa energi kinetiknya (J)?',a*b*b),
    () => num('Sebuah beban '+a+' kg dinaikkan setinggi '+b+' m. Gunakan g = 10 m/s². Berapa kenaikan energi potensial (J)?',a*b*10),
    () => num('Pada lintasan lurus, '+object+' mulai dari diam dengan percepatan tetap '+(2*a)+' m/s². Berapa perpindahannya setelah '+b+' s (m)?',a*b*b),
  );
  return pick(choices)();
}
const formulae=[
  ['H₂O',{H:2,O:1}],['CO₂',{C:1,O:2}],['C₆H₁₂O₆',{C:6,H:12,O:6}],['C₁₂H₂₂O₁₁',{C:12,H:22,O:11}],
  ['CaCO₃',{Ca:1,C:1,O:3}],['NaCl',{Na:1,Cl:1}],['SiO₂',{Si:1,O:2}],['MgO',{Mg:1,O:1}],
  ['C₂H₄O₂',{C:2,H:4,O:2}],['NaHCO₃',{Na:1,H:1,C:1,O:3}],
];
const masses={H:1,C:12,O:16,Ca:40,Na:23,Cl:35.5,Si:28,Mg:24};
const elements=[['C',6],['O',8],['Ne',10],['Mg',12],['Si',14],['Ar',18],['Ca',20],['He',2],['Na',11],['Al',13],['N',7],['F',9]];
function chemistry(d) {
  const who=pick(people), a=between(2,near(d)+3), b=between(1,near(d)+2);
  if(d<7){
    const target=pick(['padat','cair']), [item,other]=choose(stateExamples[target],2), transition=pick([['air membeku','es'],['es mencair','air cair']]);
    const choices=[
      () => pairsFromCategory(stateExamples,target,who+' menyortir benda. Pilih pasangan yang keduanya '+target+'.'),
      () => {const opposite=target==='padat'?'cair':'padat',items=shuffle([item,other,pick(stateExamples[opposite])]);return q(who+' mengamati '+items.join(', ')+'. Mana satu-satunya benda '+opposite+'?',items.find(x=>stateExamples[opposite].includes(x)),[...items,'tidak ada']);},
      () => q(who+' melihat '+transition[0]+'. Apa hasilnya?',transition[1],['es','air cair','kayu','pasir','kertas']),
    ];
    if(d>=3)choices.push(() => num(who+' menimbang '+a+' g gula dan '+b+' g air dalam wadah tertutup. Setelah gula larut, berapa gram massa campurannya?',a+b),
      () => num('Dua wadah berisi '+a+' mL dan '+b+' mL air pada suhu yang sama. Jika digabung tanpa tumpah, berapa mL air seluruhnya?',a+b));
    return pick(choices)();
  }
  const [formula,composition]=pick(formulae), symbol=pick(Object.keys(composition)), [atom,z]=pick(elements);
  const choices=[
    () => num('Dalam '+a+' satuan rumus '+formula+', berapa jumlah atom '+symbol+' seluruhnya?',a*composition[symbol]),
    () => num('Jika ada '+a+' satuan rumus '+formula+', berapa total atom semua unsur?',a*Object.values(composition).reduce((x,y)=>x+y)),
    () => num('Suatu atom '+atom+' memiliki nomor atom '+z+' dan nomor massa '+(z+b)+'. Berapa jumlah neutron?',b),
    () => num('Ada '+a+' atom netral '+atom+' dengan nomor atom '+z+'. Berapa elektron semuanya?',a*z),
  ];
  if(d>=10)choices.push(
    () => {const m=Object.entries(composition).reduce((v,[s,k])=>v+masses[s]*k,0);
      return num('Massa molar '+formula+' adalah '+String(m).replace('.',',')+' g/mol. Berapa mol terdapat dalam '+String(m*a).replace('.',',')+' g?',a);},
    () => num('Persamaan pembentukan air: 2H₂ + O₂ → 2H₂O. Secara stoikiometri, '+(a*2)+' mol H₂ bereaksi sempurna dengan berapa mol O₂?',a),
    () => num('Sampel terdiri dari '+a+' mol '+formula+'. Dalam sampel ini ada berapa mol atom '+symbol+'?',a*composition[symbol]),
  );
  return pick(choices)();
}

const livingGroups={
  tumbuhan:['padi','jagung','teratai','mangga','paku','lumut','kelapa','bayam','bambu','talas','pisang','jati'],
  hewan:['kucing','merpati','kodok','rusa','ikan mas','sapi','paus','lumba-lumba','katak','lebah','kupu-kupu','ayam'],
  benda:['batu','pensil','kelereng','gelas','penggaris','koin','sendok','piring'],
};
const lifeStages=[['kupu-kupu','telur','ulat','kepompong','kupu-kupu dewasa'],['katak','telur','berudu','katak muda','katak dewasa'],['tanaman kacang','biji','kecambah','tanaman muda','tanaman dewasa']];
function biology(d) {
  const who=pick(people),a=between(2,near(d)+3),b=between(2,near(d)+3),plant=pick(livingGroups.tumbuhan), animal=pick(livingGroups.hewan);
  const pool=[
    () => {const g=pick(['hewan','tumbuhan']);return pairsFromCategory(livingGroups,g,who+' bermain tebak makhluk hidup. Pilih dua '+g+'.');},
    () => fact(plantParts,x=>'Bagian tanaman '+plant+' yang '+x+' adalah …'),
    () => {const [species,...stages]=pick(lifeStages);const i=between(0,2);return q(who+' menyusun daur hidup '+species+'. Tahap apa yang mengikuti '+stages[i]+'?',stages[i+1],stages);},
  ];
  if(d>=3)pool.push(
    () => num(who+' mencatat '+a+' hewan di satu petak dan '+b+' di petak lain. Jika tidak ada yang terhitung dua kali, berapa jumlahnya?',a+b),
    () => {const organs=[['insang','ikan mas di kolam'],['paru-paru','paus di laut'],['trakea','belalang dewasa di kebun'],['permukaan kulit lembap','cacing tanah di kebun']];return fact(organs,x=>who+' mengamati '+x+'. Alat pernapasan utamanya?');},
  );
  if(d>=7)pool.push(
    () => num('Dalam '+a+' petak pengamatan, rata-rata ditemukan '+b+' tanaman per petak. Berapa seluruh tanaman yang teramati?',a*b),
    () => num('Pada survei '+animal+', mula-mula ada '+(a+b)+' individu. Sebanyak '+a+' masuk dan '+b+' keluar. Tanpa kelahiran atau kematian, berapa jumlah akhirnya?',2*a),
    () => {const rate=between(1,9)*10;return num('Dari '+(a*10)+' biji pada satu sampel, '+rate+'% berkecambah. Berapa banyak kecambah?',a*rate/10);},
    () => {const t=pick([['komensalisme','satu spesies memperoleh manfaat, spesies lain tidak terpengaruh'],['mutualisme','kedua spesies memperoleh manfaat'],['parasitisme','satu memperoleh manfaat dengan hidup pada atau di dalam inang yang dirugikan'],['kompetisi','kedua spesies memperebutkan sumber daya terbatas']]);return q(who+' mencatat interaksi di sekitar '+plant+': '+t[1]+'. Apa jenis interaksinya?',t[0],['komensalisme','mutualisme','parasitisme','kompetisi']);},
  );
  if(d>=10)pool.push(
    () => num('Pada model persilangan bunga Aa × Aa, A dominan penuh. Dari '+(a*4)+' keturunan, berapa harapan jumlah yang berfenotipe resesif?',a),
    () => num('Preparat daun '+plant+' dilihat dengan okuler '+a+'× dan objektif '+b+'×. Berapa kali perbesaran total?',a*b),
    () => num('Dalam jejaring makanan '+a*100+' unit energi tersedia pada produsen. Jika perpindahan pada tiap tingkat tepat 10%, berapa unit sampai ke konsumen sekunder?',a),
  );
  return pick(pool)();
}
const goods=['buku','buah','kue','telur','beras','susu','wortel','sepatu','kaus','tas','roti','jagung','pensil','bunga','jeruk','apel'];
function economics(d) {
  const who=pick(people),[seller,buyer]=choose(people,2),[prod,other]=choose(goods,2),a=between(2,near(d)+3),b=between(1,near(d)+2);
  const pool=[
    () => q(seller+' menjual '+prod+' kepada '+buyer+'. Siapa pembelinya?',buyer,[seller,'Keduanya','Tidak ada']),
    () => q(buyer+' membeli '+prod+' dari '+seller+'. Siapa penjualnya?',seller,[buyer,'Keduanya','Tidak ada']),
    () => {const list=choose(goods,4),cost=choose(d<1?[1,2,3,4,5]:[1,2,3,4,5,6,7,8],4);return q('Harga dalam koin: '+list.map((x,i)=>x+' '+cost[i]).join(', ')+'. Mana yang paling murah?',list[cost.indexOf(Math.min(...cost))],list);},
    () => num(who+' punya '+(a+b)+' koin. Ia membayar '+a+' koin untuk '+prod+'. Berapa koin tersisa?',b),
  ];
  if(d>=3)pool.push(
    () => num('Koperasi menjual '+a+' paket '+prod+' dengan harga Rp'+b+'.000 per paket. Berapa penerimaannya (ribuan rupiah)?',a*b),
    () => num('Satu paket '+prod+' dibeli Rp'+a+'.000 dan dijual Rp'+(a+b)+'.000. Berapa laba kotor per paket dalam ribuan rupiah?',b),
  );
  if(d>=7)pool.push(
    () => num('Usaha '+prod+' menanggung biaya tetap '+(a*b)+' ribu rupiah. Margin kontribusi per paket '+a+' ribu. Berapa paket perlu dijual untuk impas?',b),
    () => num('Suatu indeks harga naik dari 100 menjadi '+(100+a)+' dalam setahun. Berdasarkan indeks itu, berapa tingkat inflasinya dalam persen?',a),
    () => q(who+' hanya punya waktu untuk membuat '+prod+' atau '+other+'. Jika '+prod+' dipilih, alternatif terbaik yang dikorbankan adalah …','Membuat '+other,['Membuat '+prod,'Kedua kegiatan','Waktu yang telah berlalu']),
  );
  if(d>=10)pool.push(
    () => num('Model pasar: permintaan Qd = '+(a+2*b)+' − P dan penawaran Qs = '+a+' + P. Berapa harga P saat pasar seimbang?',b),
    () => num('Dengan kurs contoh '+(a*1000)+' rupiah per unit mata uang X, berapa ribu rupiah untuk '+b+' unit X?',a*b),
    () => num('Tabungan sederhana bernilai '+(a*100)+' ribu rupiah. Pada bunga tunggal '+b+'% setahun, berapa bunga setahun dalam ribuan rupiah?',a*b),
  );
  return pick(pool)();
}
const landforms=[['gunung','bagian daratan yang menjulang tinggi dengan lereng'],['pulau','daratan yang dikelilingi air'],['danau','cekungan daratan luas yang berisi air'],['sungai','aliran air yang mengalir pada suatu alur'],['lembah','daratan rendah di antara bukit atau gunung'],['pantai','tempat bertemunya daratan dan laut']];
function geography(d) {
  const who=pick(people), [x,y,z]=choose(coords,3), dir=rand(4),a=between(2,near(d)+3),b=between(2,near(d)+3);
  const pool=[
    () => fact(landforms,desc=>who+' melihat '+desc+'. Itu adalah …'),
    () => {const sequence=choose(coords,4);return q('Peta perjalanan '+who+': '+sequence.join(' → ')+'. Lokasi kedua?',sequence[1],sequence);},
    () => q('Pada denah, '+x+' di atas '+y+' dan '+z+' di bawah '+y+'. Tempat paling atas?',x,[y,z,'Semua sama']),
  ];
  if(d>=3)pool.push(
    () => q(y+' berada di '+directions[dir]+' dari '+x+'. Untuk kembali dari '+y+' ke '+x+', pilih arah …',direction(dir+2),directions),
    () => num('Legenda peta: 1 cm mewakili '+b+' km. Jarak '+x+' ke '+y+' di peta '+a+' cm. Jarak sebenarnya berapa km?',a*b),
    () => {const stage=[['evaporasi','air permukaan menjadi uap'],['kondensasi','uap mendingin dan membentuk titik air'],['infiltrasi','air meresap ke dalam tanah'],['presipitasi','air jatuh dari awan']];return fact(stage,s=>who+' mencatat proses: '+s+'. Apa istilahnya?');},
  );
  if(d>=7)pool.push(
    () => num('Wilayah '+x+' memiliki '+a+' km² lahan dan '+(a*b*100)+' penduduk. Berapa jiwa per km²?',b*100),
    () => {const step=pick([5,10,20,25,50]);return num('Garis kontur pertama '+a*10+' m. '+b+' interval lebih tinggi, dengan interval '+step+' m, berapa elevasinya (m)?',a*10+b*step);},
    () => num('Hujan tercatat '+a+' mm pada Senin dan '+b+' mm pada Selasa. Berapa total curah hujan dua hari itu (mm)?',a+b),
  );
  if(d>=10)pool.push(
    () => num('Di luar ekuinoks, panjang siang suatu kota '+(600+a)+' menit. Jika satu hari tepat 1.440 menit, berapa panjang malamnya dalam menit?',840-a),
    () => {const k=between(1,9);return num('Di peta, '+a+' cm mewakili '+a*k+' kilometer. Pada skala 1 : N, berapa N?',k*100000);},
    () => num('Citra memiliki resolusi '+a+' meter per piksel pada kedua sumbu. Sebidang lahan meliputi '+b+' piksel penuh. Berapa luasnya dalam m²?',a*a*b),
  );
  return pick(pool)();
}
const timeline=[['Budi Utomo berdiri',1908],['Taman Siswa berdiri',1922],['Sumpah Pemuda',1928],['Proklamasi Kemerdekaan Indonesia',1945],['Konferensi Asia Afrika di Bandung',1955],['ASEAN didirikan',1967],['Reformasi Indonesia dimulai',1998]];
const routines=['membuka buku','bernyanyi','melihat foto','menggambar','merapikan meja','membaca cerita','menyiram tanaman','menulis nama','melipat kertas','bermain bola','menyusun balok','mengunjungi teman'];
const evidence=[
  ['catatan harian asli seorang pelaku','kesaksian tertulis langsung'],
  ['rekaman wawancara baru dengan saksi mata','sumber lisan dari saksi'],
  ['foto asli yang diambil saat kejadian','sumber visual sezaman'],
  ['buku analisis yang ditulis puluhan tahun kemudian','sumber sekunder'],
];
function history(d) {
  const who=pick(people),actions=choose(routines,4),select=rand(2),events=choose(timeline,4),sources=choose(evidence,2),a=between(1,25);
  const pool=[
    () => q('Cerita '+who+' berurutan: '+actions.join(', ')+'. Apa yang dilakukan '+(select?'lebih dulu':'terakhir')+'?',select?actions[0]:actions[3],actions),
    () => q('Pagi '+who+' '+actions[0]+', siang '+actions[1]+', sore '+actions[2]+'. Apa yang dilakukan sebelum sore tetapi sesudah pagi?',actions[1],actions),
  ];
  if(d>=3)pool.push(
    () => {const sorted=[...events].sort((x,y)=>x[1]-y[1]);return q('Pilih peristiwa yang terjadi paling '+(select?'awal':'akhir')+': '+events.map(x=>x[0]+' ('+x[1]+')').join(', ')+'.',sorted[select?0:3][0],events.map(x=>x[0]));},
    () => num(events[0][0]+' ('+events[0][1]+') dan '+events[1][0]+' ('+events[1][1]+'). Berapa selisih tahunnya?',Math.abs(events[0][1]-events[1][1])),
    () => q('Dalam arsip kelas, '+who+' membaca tentang '+events[0][0]+'. Tahun peristiwanya?',events[0][1],timeline.map(x=>x[1])),
  );
  if(d>=7)pool.push(
    () => q(who+' meneliti '+events[0][0]+' dan menemukan '+sources[0][0]+'. Jenis bukti ini adalah …',sources[0][1],evidence.map(x=>x[1])),
    () => q('Untuk meneliti '+events[0][0]+', '+who+' membandingkan '+sources[0][0]+' dan '+sources[1][0]+'. Apa tujuan membandingkan sumber?','Memeriksa kesesuaian dan perbedaan informasi',['Menjamin semua kesaksian selalu sama','Menghapus konteks tiap sumber','Mengutamakan sumber yang paling baru saja']),
    () => {const y=events[0][1]+a;return num('Contoh latihan: foto dibuat pada tahun '+events[0][1]+', lalu diberi keterangan ulang pada '+y+'. Berapa tahun jarak kedua tindakan?',a);},
  );
  if(d>=10)pool.push(
    () => q('Untuk meneliti '+events[0][0]+', '+who+' memeriksa umur kertas, tinta dan asal dokumen. Langkah ini adalah …','Kritik eksternal',['Kritik internal','Periodisasi','Penulisan narasi']),
    () => q(who+' mengevaluasi apakah penulis memo tentang '+events[0][0]+' berada di lokasi dan memiliki bias. Apa yang sedang diperiksa?','Kredibilitas isi sumber',['Jenis serat kertas','Umur tinta asli','Ukuran naskah']),
    () => q(who+' membandingkan perubahan kondisi masyarakat dari '+events[0][1]+' hingga '+(events[0][1]+a)+'. Pendekatan yang mengikuti perubahan sepanjang waktu disebut …','Diakronis',['Sinkronis','Kartografis','Demografis']),
  );
  return pick(pool)();
}
const craftTools=[['penggaris','membuat garis lurus'],['kuas','mengoleskan cat'],['lem','merekatkan dua lembar kertas'],['pensil','membuat sketsa tipis'],['penghapus','menghilangkan garis pensil'],['pelubang kertas','membuat lubang bulat pada kertas'],['penjepit','menahan dua lapisan sementara']];
const crafts=['bingkai','hiasan dinding','kartu ucapan','kolase','boneka kain','sampul buku','hiasan meja','mozaik'];
const craftMaterial={
  kertas:['kertas koran','karton','kertas kado','kertas lipat','majalah bekas','kertas gambar','kertas kraft'],
  tekstil:['kain perca','felt','kain katun','kain tenun','kain wol','kain linen','kain denim'],
  alam:['bambu','daun kering','kulit jagung','ranting','sabut kelapa','biji jagung','pelepah pisang'],
};
function craftsLesson(d) {
  const person=pick(people),project=pick(crafts),[m1,m2]=choose(craftMaterial.kertas,2),a=between(2,near(d)+3),b=between(2,near(d)+3);
  const pool=[
    () => fact(craftTools,desc=>person+' membuat '+project+'. Untuk '+desc+', ia memakai …'),
    () => {const k=pick(['kertas','tekstil']);return pairsFromCategory(craftMaterial,k,person+' menyiapkan '+project+'. Mana pasangan bahan '+k+'?');},
    () => {const colors=choose(['merah','kuning','biru','putih','hijau','ungu','jingga'],3);return q(person+' menyusun motif '+project+': '+colors.join(' – ')+' lalu berulang. Warna tepat sebelum '+colors[2]+'?',colors[1],[...colors,'hitam']);},
  ];
  if(d>=3)pool.push(
    () => num('Untuk satu '+project+', '+person+' memakai '+a+' potong '+m1+'. Untuk '+b+' buah karya yang sama, berapa potong diperlukan?',a*b),
    () => num('Pita sepanjang '+a*b+' cm dibagi rata untuk '+a+' hiasan. Berapa cm pita untuk satu hiasan?',b),
  );
  if(d>=7)pool.push(
    () => num('Pola '+project+' dibuat dengan perbandingan panjang:lebar '+a+':1. Jika lebar '+b+' cm, panjang rancangan berapa cm?',a*b),
    () => num(person+' memiliki lembar '+m1+' ukuran '+(a*b)+' cm × '+b+' cm. Jika dipotong menjadi persegi '+b+' cm × '+b+' cm tanpa sisa, berapa potong didapat?',a),
    () => num('Biaya lembar '+m1+' Rp'+a+'.000 dan '+m2+' Rp'+b+'.000. Jika digunakan penuh untuk satu '+project+', berapa biaya bahan (ribuan rupiah)?',a+b),
  );
  if(d>=10)pool.push(
    () => num('Pesanan '+project+' berjumlah '+a*4+' buah. Bila '+b+' lembar bahan cukup untuk empat buah, berapa lembar untuk pesanan itu?',a*b),
    () => {const k=between(1,8)*10;return num('Prototipe membutuhkan '+a*10+' cm pita. Untuk sambungan disediakan cadangan '+k+'%. Berapa panjang total yang harus disiapkan (cm)?',a*10+a*k/10);},
    () => q('Setelah menguji '+project+' dari '+m1+', '+person+' menemukan sambungan mudah lepas. Langkah evaluasi paling tepat?','Uji alternatif sambungan dengan kondisi sama',['Langsung produksi seluruh pesanan','Ubah semua bahan sekaligus tanpa catatan','Abaikan hasil uji pertama']),
  );
  return pick(pool)();
}

const make = {fisika:physics,kimia:chemistry,biologi:biology,ekonomi:economics,geografi:geography,sejarah:history,prakarya:craftsLesson,matematika:math,ipa:science,bahasa:language,inggris:english,informatika:computing,ips:social,seni:arts,pjok:physical,pancasila:civics};
const playable = Object.keys(make);

// Stable across difficulty and option permutations. Equal displayed prompts in the
// same subject always share a history key, even when produced by different families.
function promptId(subject,prompt) {
  let h=2166136261;
  for(let i=0;i<prompt.length;i++)h=Math.imul(h^prompt.charCodeAt(i),16777619);
  return subject+'-'+(h>>>0).toString(36)+'-'+prompt.length.toString(36);
}
export function generateQuestions({grade='7',subject='mix',count=10,excludeIds=[]}={}) {
  grade=String(grade);
  if(!GRADES.some(x=>x.id===grade)||!SUBJECTS.some(x=>x.id===subject))throw new RangeError('Jenjang atau mata pelajaran tidak dikenal.');
  if(!Number.isInteger(count)||count<1||count>50)throw new RangeError('Pilih 1–50 soal.');
  const d=grade==='pg'?-1:grade==='tk'?0:grade==='umum'?10:Number(grade);
  const blocked=new Set(excludeIds), output=[];
  let rotation=[];
  for(let i=0;i<count;i++){
    if(!rotation.length)rotation=shuffle(playable);
    const s=subject==='mix'?rotation.pop():subject;
    let found=false;
    for(let retry=0;retry<2500&&!found;retry++){
      const raw=make[s](d), id=promptId(s,raw.prompt);
      if(blocked.has(id))continue;
      const alternatives=Array.from(new Set(raw.wrongs.filter(v=>v!==raw.correct)));
      if(alternatives.length<3)continue;
      const options=shuffle([raw.correct,...choose(alternatives,3)]);
      output.push({id,subject:s,prompt:raw.prompt,options,answer:options.indexOf(raw.correct),...(raw.source?{source:raw.source}:{})});
      blocked.add(id);
      found=true;
    }
    if(!found)throw new RangeError('Bank soal untuk sejumlah riwayat gabungan ini sedang penuh. Kurangi jumlah soal atau pilih campuran.');
  }
  return output;
}
