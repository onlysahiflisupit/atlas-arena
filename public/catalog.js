export const places = [
  ['dino','Zaman Dinosaurus','Lembah Purba','#62ca8c','#95d6c4','#d7eac0','#728e55'],
  ['mountain','Gunung','Puncak Arunika','#84caff','#80b6df','#e4ebf0','#9fb2ac'],
  ['castle','Kastil','Benteng Fajar','#dea878','#abbcd5','#ffe4bd','#aab18a'],
  ['stadium','Stadion','Stadion Merdeka','#6dd29d','#88c4ee','#dcedf2','#559b67'],
  ['space','Space Ship','Dek Orion','#8e9dff','#071329','#263958','#39465a'],
  ['race','Arena Balapan Mobil','Sirkuit Komet','#ff7468','#95cde3','#ffe2b0','#618b71'],
  ['desert','Gurun Pasir','Oasis Senja','#f3ac68','#ee976e','#ffd4a3','#dba460'],
  ['school','Sekolah','Kampus Cendekia','#f5b572','#a6ceef','#f9ecce','#bba78f'],
  ['city','Kota','Distrik Metro','#7db9d2','#8daacb','#e9c4b0','#79818b'],
  ['sky','Negeri Dongeng Melayang','Kepulauan Awan','#ca9fea','#a88de1','#ffe5d3','#92ba93'],
  ['mushroom','Negeri Jamur','Rimba Spora','#f297a7','#7e84b7','#f3b8b1','#879e83'],
  ['village','Desa','Desa Tirta','#d8cd79','#a5c5d6','#f9daa5','#95a762']
];
export const MAPS = places.map(([id,name,tag,color]) => ({id,name,tag,color}));
export const CHARACTERS = [
  {id:'nova',name:'Nova',color:'#51dec0'}, {id:'ember',name:'Ember',color:'#ff824e'},
  {id:'orbit',name:'Orbit',color:'#b397ff'}, {id:'sol',name:'Sol',color:'#ffd76e'},
];
