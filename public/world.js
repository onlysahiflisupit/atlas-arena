import * as THREE from './vendor/three.module.js';
import {models} from './assets/kenney-models.js';
export {THREE};

import {places, MAPS, CHARACTERS} from './catalog.js';
export {MAPS, CHARACTERS};
const shapes = {
  box:new THREE.BoxGeometry(1,1,1), rock:new THREE.DodecahedronGeometry(1,0),
  ball:new THREE.IcosahedronGeometry(1,1), point:new THREE.ConeGeometry(1,1,7),
  branch:new THREE.CylinderGeometry(.52,1,1,8), tip:new THREE.ConeGeometry(1,1,8),
  pyramid:new THREE.ConeGeometry(1,1,4,1,false,Math.PI/4),
  drum:new THREE.CylinderGeometry(1,1,1,10), taper:new THREE.CylinderGeometry(.65,1,1,8),
  peak:new THREE.ConeGeometry(1,1,8), ring:new THREE.TorusGeometry(1,.075,5,32),
  disk:new THREE.CircleGeometry(1,24)
};
const TAU = Math.PI*2;
function decode(base64, Type) {
  const bytes=Uint8Array.from(atob(base64), c=>c.charCodeAt(0));
  return new Type(bytes.buffer);
}
const assetGeometry = new Map();
function modelGeometry(name) {
  if(assetGeometry.has(name))return assetGeometry.get(name);
  const data=models[name], geometry=new THREE.BufferGeometry();
  const p=Float32Array.from(decode(data.p,Int16Array),value=>value/6000);
  const gamma=v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;};
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(Float32Array.from(decode(data.c,Uint8Array),gamma),3));
  geometry.setIndex(new THREE.BufferAttribute(decode(data.i,Uint16Array),1));geometry.computeVertexNormals();
  assetGeometry.set(name,geometry);return geometry;
}
function material(color, vertexColors=false) { return new THREE.MeshLambertMaterial({color,flatShading:true,vertexColors}); }
const avatarMaterials = new Map();
function getMaterial(color,vertex=false) {
  const key=String(color)+vertex;if(!avatarMaterials.has(key))avatarMaterials.set(key,material(color,vertex));
  return avatarMaterials.get(key);
}
function part(group,shape,color,x,y,z,sx,sy,sz,turn=0) {
  const mesh=new THREE.Mesh(shapes[shape],getMaterial(color));mesh.position.set(x,y,z);
  mesh.scale.set(sx,sy,sz);mesh.rotation.y=turn;group.add(mesh);return mesh;
}
export function createAvatar(id='nova') {
  const chosen=CHARACTERS.find(c=>c.id===id)||CHARACTERS[Number(id)]||CHARACTERS[0];
  const group=new THREE.Group(), base=new THREE.Mesh(modelGeometry('character'),getMaterial('#ffffff',true));
  base.scale.set(1.15,1.55,1.18);group.add(base);
  part(group,'box',chosen.color,0,.91,-.29,.92,.13,.2);
  part(group,'box',chosen.color,0,.99,.28,.84,.27,.17);
  part(group,'ball',chosen.color,-.43,1.08,0,.17,.2,.22);
  part(group,'ball',chosen.color,.43,1.08,0,.17,.2,.22);
  const cap=part(group,'ball',chosen.color,0,1.43,-.01,.43,.18,.38);
  if(chosen.id==='ember')cap.scale.set(.37,.27,.35);
  if(chosen.id==='orbit')part(group,'ring',chosen.color,0,1.7,0,.24,.24,.24).rotation.x=Math.PI/2;
  if(chosen.id==='sol')for(const sign of [-1,1])part(group,'point',chosen.color,sign*.24,1.61,.02,.11,.27,.11);
  return group;
}
export function createBlaster(index=0) {
  const k=((Number(index)||0)%4+4)%4, group=new THREE.Group();
  const palette=['#46efc1','#fbb955','#78baff','#c893ff'],col=palette[k];
  const length=[.39,.28,.48,.62][k];
  part(group,'box','#314157',0,0,0,.17,.14,length);
  part(group,'box',col,0,.085,-.045,.135,.046,length*.68);
  part(group,'ball','#d5e9eb',0,0,-length*.51,.095,.09,.065);
  part(group,'ball',col,0,.005,-length*.64,.064,.061,.048);
  part(group,'box','#53647d',0,-.09,.06,.087,.19,.087).rotation.x=-.23;
  if(k===0||k===2)for(const side of [-1,1])part(group,'ball',col,side*.105,.02,-length*.24,.033,.045,.092);
  if(k===3)part(group,'drum','#4a7289',0,.135,-.05,.048,.16,.048).rotation.x=Math.PI/2;
  return group;
}
function randomGenerator(seed) {let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function mapFloor(size,color,rng,hard) {
  const n=hard?28:44, geo=new THREE.PlaneGeometry(size,size,n,n);geo.rotateX(-Math.PI/2);
  const triangles=geo.toNonIndexed();geo.dispose();
  const pos=triangles.getAttribute('position'),colors=new Float32Array(pos.count*3),base=new THREE.Color(color);
  const tile=new THREE.Color();
  for(let i=0;i<pos.count;i+=3){
    const x=pos.getX(i),z=pos.getZ(i);
    const variation=hard?.96+.047*((Math.floor(x/7)+Math.floor(z/7)+100)%2):.89+.085*Math.sin(x*.17+z*.07)+.055*Math.cos(z*.16)+.07*rng();
    tile.copy(base).multiplyScalar(variation);
    for(let j=i;j<i+3;j++){colors[j*3]=tile.r;colors[j*3+1]=tile.g;colors[j*3+2]=tile.b;}
  }
  triangles.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return triangles;
}

export function createWorld(scene,mapId='dino') {
  const cfg=places.find(p=>p[0]===mapId)||places[0], [id,,,,zenith,horizon,floorColor]=cfg;
  const seed=places.indexOf(cfg)+16,rng=randomGenerator(seed*3453), root=new THREE.Group();
  const disposeGeometry=[],disposeMaterial=[],batches=new Map(),colliders=[];
  const oldFog=scene.fog,oldBackground=scene.background;
  scene.add(root);scene.background=new THREE.Color(horizon);
  scene.fog=new THREE.FogExp2(horizon,id==='space'?.005:.0065);
  const hemi=new THREE.HemisphereLight(id==='space'?'#c2d5ff':'#fff2d7',id==='space'?'#666a8a':'#9caea9',1.73);
  const sun=new THREE.DirectionalLight(id==='space'?'#91cfff':'#ffdfb3',2.02);sun.position.set(-27,48,23);
  root.add(hemi,sun);
  const skyGeo=new THREE.SphereGeometry(205,32,16);
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{high:{value:new THREE.Color(zenith)},low:{value:new THREE.Color(horizon)},night:{value:id==='space'?1:0}},
    vertexShader:'varying vec3 dir; void main(){dir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 dir;uniform vec3 high; uniform vec3 low;uniform float night;
    void main(){vec3 d=normalize(dir);float y=max(0.0,d.y);vec3 c=mix(low,high,smoothstep(-.015,.64,y));
    float dist=distance(d,normalize(vec3(-.43,.34,-.84)));c+=vec3(.19,.12,.035)*exp(-dist*8.)*(1.-night);
    c=mix(c,vec3(1.,.88,.57), (1.-smoothstep(.048,.053,dist))*(1.-night));
    gl_FragColor=vec4(c,1.);
    #include <colorspace_fragment>
    }`.replace('    #include','#include')
  });
  const sky=new THREE.Mesh(skyGeo,skyMat);sky.renderOrder=-5;root.add(sky);disposeGeometry.push(skyGeo);disposeMaterial.push(skyMat);
  const hard=['stadium','school','space','race','city','castle'].includes(id);
  const floor=mapFloor(id==='sky'?100:270,floorColor,rng,hard);
  const fm=material('#ffffff',true);root.add(new THREE.Mesh(floor,fm));disposeGeometry.push(floor);disposeMaterial.push(fm);
  const transform=new THREE.Object3D(), tempColor=new THREE.Color();
  function add(shape,c,x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0){
    if(!batches.has(shape))batches.set(shape,[]);
    transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.rotation.set(rx,ry,rz,'YXZ');transform.updateMatrix();
    batches.get(shape).push([transform.matrix.clone(),c]);
  }
  const box=(c,x,y,z,w,h,d,ry=0)=>add('box',c,x,y,z,w,h,d,ry);
  const dot=(c,x,y,z,w,h,d)=>add('ball',c,x,y,z,w,h,d);
  const cone=(c,x,y,z,r,h,turn=0)=>add('peak',c,x,y,z,r,h,r,turn);
  const drum=(c,x,y,z,r,h)=>add('drum',c,x,y,z,r,h,r);
  const disk=(c,x,z,rx,rz,y=.012)=>add('disk',c,x,y,z,rx,rz,1,0,-Math.PI/2);
  function rod(c,a,b,r,shape='drum') {
    const delta=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    const e=new THREE.Euler().setFromQuaternion(q,'YXZ');
    add(shape,c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,delta.length(),r,e.y,e.x,e.z);
  }
  function tree(x,z,s,pine=false) {
    drum('#705844',x,s*.28,z,.095*s,s*.56);
    if(pine){for(let i=0;i<3;i++)cone(['#315d53','#437867','#639277'][i],x,s*(.54+.2*i),z,s*(.39-.075*i),s*.52,i);}
    else{for(let i=0;i<3;i++)add('rock',['#52866d','#6d9e73','#92ac73'][i],x+s*(i-1)*.17,s*(.71+.13*(i===1)),z+s*(i%2)*.08,s*.34,s*.36,s*.33,i);}
  }
  function palm(x,z,s) {
    rod('#956b43',[x,0,z],[x+.12*s,s*.79,z],.065*s);
    for(let i=0;i<7;i++){let a=i*TAU/7;add('ball',i%2?'#60976a':'#347b66',x+s*(.12+Math.sin(a)*.26),s*.78,z+s*Math.cos(a)*.26,s*.12,s*.075,s*.38,a,.23);}
  }
  function rock(x,z,s,c='#849083'){add('rock',c,x,s*.34,z,s*.81,s*.62,s*.75,rng()*6);}
  function mushroom(x,z,s,c) {
    add('taper','#f3dec0',x,s*.29,z,s*.115,s*.63,s*.115);
    dot(c,x,s*.62,z,s*.48,s*.24,s*.48);
    for(let j=0;j<7;j++){const a=TAU*j/7;dot('#ffebc7',x+Math.sin(a)*s*.32,s*.76,z+Math.cos(a)*s*.32,s*.064,s*.022,s*.066);}
    dot('#ffebc7',x,s*.859,z,s*.088,s*.018,s*.073);
  }
  function mountain(x,z,r,h,cap=false) {
    const turn=rng()*6;cone(cap?'#758792':'#65817b',x,h*.5-.5,z,r,h,turn);
    if(cap)cone('#e5eff0',x,h*.85-.5,z,r*.32,h*.31,turn);
  }
  function tower(x,z,s,fairy=false) {
    const wall=fairy?'#e5c6ce':'#a7a3a3',roof=fairy?'#8d83cf':'#577491';
    drum(wall,x,s*.5,z,s*.23,s);drum('#c8c2b5',x,s*.91,z,s*.27,s*.13);
    cone(roof,x,s*1.16,z,s*.32,s*.46);
    box('#414757',x,s*.71,z+s*.225,s*.07,s*.19,.1);
    rod('#bd914e',[x,s*1.3,z],[x,s*1.55,z],.065);box('#ecac6e',x+s*.105,s*1.49,z,s*.21,s*.09,.05);
  }
  function house(x,z,s,turn=0) {
    box('#edd7ab',x,s*.29,z,s*.9,s*.58,s*.77,turn);
    add('pyramid','#ad6550',x,s*.69,z,s*.83,s*.46,s*.76,turn);
    box('#70594b',x,s*.18,z+s*.39,s*.18,s*.38,.1);
    box('#647b80',x-s*.28,s*.32,z+s*.39,s*.15,s*.15,.13);
  }
  function cactus(x,z,s) {
    rod('#37866f',[x,0,z],[x,s,z],s*.12);
    rod('#4d9272',[x,s*.45,z],[x+s*.27,s*.55,z],s*.082);
    rod('#4d9272',[x+s*.27,s*.55,z],[x+s*.27,s*.79,z],s*.082);
  }
  function dinosaur(x,z,s,crest=false) {
    const green=crest?'#4c927b':'#5c8162', pale=crest?'#a8ba71':'#a0ad71';
    disk('#687e56',x,z,s*2.7,s*1.12,.022);
    const p=(a,b,c)=>[x+a*s,b*s,z+c*s];
    add('ball',green,...p(0,2.4,0),s*2.25,s*1.14,s*.92);
    for(const i of [-1,1])for(const j of [-1,1]){
      const px=i*1.11,pz=j*.56;rod(green,p(px,2.16,pz),p(px+i*.065,.32,pz),s*.28);
      add('ball',pale,...p(px-.10,.23,pz),s*.43,s*.24,s*.33);
    }
    rod(green,p(-1.46,2.67,0),p(-2.31,4.37,0),s*.74,'branch');
    add('ball',green,...p(-2.31,4.37,0),s*.40,s*.42,s*.39);
    rod(green,p(-2.31,4.37,0),p(-2.98,5.82,0),s*.42,'branch');
    add('ball',pale,...p(-3.27,5.84,0),s*.76,s*.43,s*.42);
    add('ball',green,...p(-3.66,5.74,0),s*.58,s*.21,s*.35);
    add('ball',pale,...p(-3.72,5.65,0),s*.44,s*.09,s*.28);
    for(const side of [-1,1]){add('ball','#41554a',...p(-4,5.85,side*.18),s*.05,s*.04,s*.055);add('ball','#f8df98',...p(-3.59,5.98,side*.30),s*.15,s*.13,s*.11);add('ball','#273e41',...p(-3.6,5.99,side*.39),s*.07,s*.073,s*.038);}
    rod(green,p(1.45,2.34,0),p(3.03,1.91,.21),s*.77,'branch');
    add('ball',green,...p(3.03,1.91,.21),s*.39,s*.38,s*.38);
    rod(green,p(3.03,1.91,.21),p(5.23,2.27,.52),s*.41,'tip');
    for(const side of [-1,1])for(let j=0;j<4;j++){const xx=-1+j*.48;add('ball',pale,...p(xx,2.87,side*(.73+.08*Math.cos(xx))),s*.18,s*.16,s*.1);}
    if(crest)for(let i=0;i<6;i++)cone('#dfa56a',x+s*(-1.5+i*.52),s*(3.57-.11*Math.abs(i-2)),z,s*.18,s*.46);
  }
  function stands(x,z,turn,seat) {
    for(let i=0;i<5;i++){
      const depth=i*1.25,px=x+Math.sin(turn)*depth,pz=z+Math.cos(turn)*depth;
      box('#a6adb4',px,i*.66+.35,pz,26,(i+1)*.66,1.38,turn);
      box(seat,px,i*.66+.72,pz,25.8,.13,1.21,turn);
      for(let t=0;t<3;t++){const dx=(t-1)*8.4;box('#ede4d7',px+Math.cos(turn)*dx,i*.66+.81,pz-Math.sin(turn)*dx,.67,.12,1.34,turn);}
    }
  }
  function lamp(x,z,h=8) {drum('#667882',x,h*.48,z,.115,h*.95);box('#516574',x,h,z,.9,.23,.71);box('#ffe7bf',x,h-.14,z,.7,.09,.5);}
  function stripe(x,z,w,d,c='#eee7ce',y=.028){box(c,x,y,z,w,.025,d);}
  function post(x,z,h,c='#617793') {
    box('#576475',x,h*.5,z,.22,h,.22);box(c,x+.39,h-.42,z,.78,.76,.07);
  }
  function car(x,z,c,angle=0) {
    box(c,x,1,z,4.8,.93,2,angle);box('#526978',x+.1,1.74,z,2.25,.72,1.69,angle);
    for(let side of [-1,1])for(let end of [-1,1]){
      const dx=Math.cos(angle)*end*1.46+Math.sin(angle)*side, dz=-Math.sin(angle)*end*1.46+Math.cos(angle)*side;
      add('drum','#2e3743',x+dx,.64,z+dz,.58,.32,.58,angle,Math.PI/2);
    }
  }
  const horizonRange=id==='space'||id==='sky'?0:18;
  for(let i=0;i<horizonRange;i++){
    const a=i/horizonRange*TAU,r=91+rng()*19;
    mountain(Math.sin(a)*r,Math.cos(a)*r,17+rng()*19,9+rng()*(id==='mountain'?43:17),id==='mountain');
  }
  if(id!=='space'){
    for(let i=0;i<9;i++){const a=i*TAU/9,x=Math.sin(a)*104,y=20+rng()*10,z=Math.cos(a)*104;add('cloud','#fff5db',x,y,z,10,2.3,5);add('cloud','#fff4da',x-2.1,y+1.2,z+.5,5,3.2,4);add('cloud','#fff5e3',x+3.7,y+.8,z-.4,4.5,2.5,3.5);}
  }
  if(id==='dino'){
    dinosaur(4,-47,3.5,true);dinosaur(-28,-51,2.4);dinosaur(49,18,2.2,true);
    for(let i=0;i<54;i++){const a=rng()*TAU,r=56+rng()*20; palm(Math.sin(a)*r,Math.cos(a)*r,3.6+rng()*7);}
    for(let i=0;i<13;i++){const a=i/13*TAU;rock(Math.sin(a)*55,Math.cos(a)*55,3+rng()*2,'#8c9470');}
    for(const [x,z,h] of [[-18,-47,7],[26,-44,8],[-25,-39,4],[22,-43,4.5]]){palm(x,z,h);rock(x+1.8,z,1.2,'#999e77');}
    disk('#a5a076',-7,4,11,31);disk('#89a67f',27,-25,13,8);
  }else if(id==='mountain'){
    for(let i=0;i<64;i++){const a=rng()*TAU,r=51+rng()*23;tree(Math.cos(a)*r,Math.sin(a)*r,3+rng()*9,true);}
    for(let i=0;i<4;i++)house(-36+i*12,-54,6.3);
    for(let i=0;i<6;i++)rock(48,i*14-40,3.3,'#8c989d');
    disk('#c6d8d5',-22,-26,18,8);disk('#c6d8d5',26,16,11,18);
  }else if(id==='castle'){
    for(const x of [-52,52])for(const z of [-52,52])tower(x,z,20);
    for(const side of [-1,1]){
      box('#aaa69d',side*53,4.3,0,3,8.6,102);box('#a8a59c',0,4.3,side*53,103,8.6,3);
      for(let n=-44;n<=44;n+=6){box('#c1b9a6',side*53,9.2,n,3.1,2.3,2.5);box('#c1b9a6',n,9.2,side*53,2.5,2.3,3.1);}
    }
    box('#b8b1a0',0,9.25,-55,23,18.5,9);add('pyramid','#61788d',0,21,-55,17,8,8);
    tower(-14,-51,16);tower(14,-51,16);
    for(let i=-3;i<=3;i++)box('#5f666d',i*2.8,12,-50.4,.85,2.4,.17);
    box('#6e655e',0,3,-50.4,5.5,6,.17);
    stripe(0,0,6,100,'#bab49e');stripe(0,0,100,6,'#bab49e');
  }else if(id==='stadium'){
    for(let n=-1;n<=1;n++){stands(n*28,50,0,'#cf8266');stands(n*28,-50,Math.PI,'#6899a6');stands(50,n*28,Math.PI/2,'#6899a6');stands(-50,n*28,-Math.PI/2,'#cf8266');}
    for(let i=-4;i<=4;i++)stripe(i*10,0,9.98,95,i%2?'#629b70':'#6ca675',.015);
    for(const k of [-1,1]){stripe(k*38,0,.21,81);stripe(0,k*40,76,.21);stripe(0,k*30,30,.18);for(const x of [-15,15])stripe(x,k*35,.18,10);
      box('#f2f0d6',0,4,k*44,11,.19,.19);for(const x of [-5.4,5.4])box('#f2f0d6',x,2,k*44,.19,4,.19);}
    stripe(0,0,76,.18);add('ring','#f5f0d4',0,.053,0,8,8,.07,0,Math.PI/2);
    for(const x of [-47,47])for(const z of [-47,47]){lamp(x,z,19);box('#fbefcb',x,19,z,4,.9,.7);}
  }else if(id==='space'){
    for(let i=-4;i<=4;i++){
      stripe(i*10,0,.09,99,'#639eae');stripe(0,i*10,99,.09,'#639eae');
      for(const sign of [-1,1]){const x=i*11;box('#485674',x,2.4,sign*52,10.7,4.8,3);box('#527188',x,7,sign*52,.8,12,2);box('#86e6dd',x,7,sign*50.8,.29,7,.22);
        box('#4b5a74',sign*52,2.4,x,3,4.8,10.7);box('#91dfeb',sign*50.5,4.1,x,.2,.37,7);}
    }
    add('ball','#c6acac',-35,27,-90,13,13,13);add('ring','#cfbba7',-35,27,-90,18,18,18,0,1.28,-.2);
    for(let i=0;i<125;i++){const a=rng()*TAU,y=8+rng()*75,r=92+rng()*18;dot(i%3?'#e4edf9':'#ddcaa3',Math.cos(a)*r,y,Math.sin(a)*r,.14,.14,.14);}
  }else if(id==='race'){
    for(const sign of [-1,1]){
      stripe(sign*33,0,13,80,'#525965');stripe(0,sign*33,80,13,'#525965');
      for(let i=-7;i<=7;i++){const c=i%2?'#e9d9c6':'#cc6f62';stripe(i*5,sign*40,5,1.2,c,.04);stripe(sign*40,i*5,1.2,5,c,.04);}
      stands(sign*17,-50,Math.PI,'#dc8a6c');
      for(let i=-2;i<=2;i++){car(i*13,sign*47,['#e68556','#6bbcb4','#e8bb6e','#b47eac','#769dc2'][i+2]);}
    }
    for(let x=0;x<8;x++)for(let z=0;z<3;z++)stripe(28+x*1.4,8+z*1.4,1.4,1.4,(x+z)%2?'#f6eacb':'#424852',.048);
    for(const x of [-48,48]){box('#737e82',x,4,0,1.2,8,1.2);post(x,-20,9,'#efb659');}
  }else if(id==='desert'){
    for(let i=0;i<16;i++){const a=i*TAU/16,r=63+rng()*12;
      add('ball',i%2?'#dca26e':'#cb9163',Math.cos(a)*r,-2,Math.sin(a)*r,14+rng()*6,6+rng()*7,11+rng()*8,i);}
    for(let i=0;i<14;i++)palm(48+rng()*9,-41+i*3.5,5+rng()*5);
    for(const [x,z,h] of [[-28,-64,21],[2,-71,31],[32,-65,17]])add('pyramid','#ba875e',x,h*.5,z,h*.85,h,h*.85);
    disk('#72a997',37,9,9,13);disk('#a6ba87',39,5,5,6,.019);
  }else if(id==='school'){
    for(let wing=-1;wing<=1;wing++){
      const x=wing*32;box('#d58f72',x,6,-52,30,12,7);box('#f3ddab',x,12,-51.5,31,1.2,9);
      for(let r=0;r<2;r++)for(let k=-3;k<=3;k++)box('#516f7d',x+k*3.8,3+r*5.2,-48.42,2.4,2.6,.22);
    }
    box('#f0dabe',0,10,-47,12,19,4);add('pyramid','#8d7485',0,21,-47,10,6,5);
    add('drum','#f1e5c9',0,15,-44.8,2,.22,2,0,Math.PI/2);box('#544f58',0,15.55,-44.61,.13,1.2,.16);box('#544f58',.49,15,-44.55,1,.13,.17);
    for(let i=-3;i<=3;i++){tree(i*14,51,6.2);add('grass-trees','#ffffff',53,0,i*13,5.6,5.6,5.6);}
    stripe(0,8,31,40,'#bc8069');for(const x of [-15,15])stripe(x,8,.19,40);
    for(const z of [-12,8,28])stripe(0,z,30,.19);add('ring','#e7ddc4',0,.06,8,3.6,3.6,.08,0,Math.PI/2);
  }else if(id==='city'){
    for(const sign of [-1,1])for(let i=-3;i<=3;i++){
      const s=7+rng()*7;add(i%2?'building-small-b':'building-small-a','#ffffff',i*15,0,sign*53,s,s,s,sign<0?Math.PI:0);
      const h=11+rng()*11;add(i%2?'building-small-a':'building-small-b','#ffffff',sign*55,0,i*15,h,h,h,sign*Math.PI/2);
      lamp(i*14,sign*47,6.3);
    }
    for(const k of [-21,21]){stripe(k,0,8.8,98,'#555f6c');stripe(0,k,98,8.8,'#555f6c');for(let i=-5;i<=5;i++){stripe(i*8,k,3.3,.18,'#e0c99a',.045);stripe(k,i*8,.18,3.3,'#e0c99a',.045);}}
    for(let i=-2;i<=2;i++){stripe(-20+i*1.3,14,.6,3.2);stripe(20+i*1.3,-14,.6,3.2);}
  }else if(id==='sky'){
    for(let i=0;i<12;i++){
      const a=i*TAU/12,r=63+rng()*22,s=6+rng()*7,y=4+rng()*11,x=Math.sin(a)*r,z=Math.cos(a)*r;
      add('peak','#8985a5',x,y-s*.5,z,s,s*1.2,s,0,Math.PI);drum('#b2c39f',x,y+.2,z,s*.98,.9);
      if(i%3===0){drum('#e2c9cf',x,y+4.1,z,2.7,8);cone('#907dbd',x,y+11,z,3.8,5.8);}
      else {drum('#998c87',x,y+1.7,z,.4,3.4);dot('#dcadce',x,y+5,z,3.5,2.8,3.5);}
    }
    for(const x of [-51,51])for(const z of [-42,41])tower(x,z,12,true);
    disk('#b5b7a5',0,-2,7,42);
  }else if(id==='mushroom'){
    for(let i=0;i<39;i++){
      const a=i*TAU/39,r=51+rng()*12; mushroom(Math.sin(a)*r,Math.cos(a)*r,4+rng()*10,['#d67e81','#9682b2','#dcab77','#a27da1'][i%4]);
    }
    for(let i=0;i<14;i++){let a=rng()*TAU;tree(Math.sin(a)*70,Math.cos(a)*70,12);}
    disk('#b19c96',-15,-10,9,23);disk('#a9a8a0',24,15,15,7);
  }else if(id==='village'){
    for(let i=-3;i<=3;i++){house(i*14,-54,8+rng()*3);house(i*14,54,6+rng()*3);
      add('grass-trees','#ffffff',-51,0,i*14,6,6,6);house(52,i*14,6+rng()*2);}
    for(let side of [-1,1])for(let i=0;i<6;i++)stripe(side*(28+i*2),-19,1.2,23,'#aeb768');
    stripe(0,0,6,103,'#b89971');stripe(0,0,103,4,'#b89971');
    tower(-41,-53,11);add('building-garage','#ffffff',41,0,-48,5,5,5);
  }
  // Keep the 10-metre coordinate lattice clear for all players and quiz beacons.
  for(let ix=-4;ix<=3;ix++)for(let iz=-4;iz<=3;iz++){
    if(rng()>.18)continue;const x=ix*10+5,z=iz*10+5;let r=1.2;
    if(id==='dino'){palm(x,z,3.1);r=.77;}
    else if(id==='mountain'||id==='village'){tree(x,z,3.3,id==='mountain');r=.7;}
    else if(id==='desert'){cactus(x,z,2.7);r=.82;}
    else if(id==='mushroom'){mushroom(x,z,2.5,'#d48898');r=1.1;}
    else if(id==='sky'){add('rock','#bb94cd',x,1.11,z,.81,1.78,.8,.2);r=.95;}
    else if(id==='castle'){drum('#ae9174',x,.62,z,.65,1.24);drum('#838078',x,.91,z,.67,.12);r=.9;}
    else if(id==='space'){add('taper','#586b86',x,.71,z,.94,1.42,.94);drum('#82d5d8',x,1.47,z,.56,.1);r=1.1;}
    else if(id==='race'||id==='stadium'){cone('#e59569',x,.55,z,.43,1.1);drum('#ece0be',x,.56,z,.23,.15);r=.65;}
    else {box('#958d7b',x,.43,z,1.6,.86,1.6);add('rock','#75966d',x,1.15,z,.99,.75,.99,.4);r=1.25;}
    colliders.push({x,z,r:r+.33});
  }
  // Small ground fragments give motion parallax without adding collision or hidden objectives.
  if(!hard){for(let i=0;i<140;i++){
    const x=rng()*90-45,z=rng()*90-45,s=.045+rng()*.14;
    if(id==='desert'||id==='mountain')add('rock',id==='desert'?'#bc946d':'#809491',x,.035,z,s*1.8,s*.5,s,rng()*5);
    else{add('point',id==='mushroom'?'#8f9e8a':'#81986c',x,.08,z,s,.21,s,rng()*5);}
  }}
  // A continuous ground stripe makes the playable limit visible on all twelve maps.
  const edgeColor=id==='space'?'#83b5c6':(hard?'#b3b2a4':'#a7a68a');
  for(const sign of [-1,1]){stripe(sign*47,0,.17,94,edgeColor,.07);stripe(0,sign*47,94,.17,edgeColor,.07);}
  const instanced=[];
  for (const [shape,items] of batches){
    const imported=Object.hasOwn(models,shape),geom=imported?modelGeometry(shape):shapes[shape];
    const mat=material('#ffffff',imported),mesh=new THREE.InstancedMesh(geom,mat,items.length);
    for(let i=0;i<items.length;i++){mesh.setMatrixAt(i,items[i][0]);mesh.setColorAt(i,tempColor.set(items[i][1]));}
    mesh.computeBoundingSphere();root.add(mesh);disposeMaterial.push(mat);instanced.push(mesh);
  }
  return {
    root,update(){},
    blocked(x,z){return !Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>47||Math.abs(z)>47||colliders.some(o=>(o.x-x)**2+(o.z-z)**2<o.r*o.r);},
    dispose(){scene.remove(root);scene.fog=oldFog;scene.background=oldBackground;for(const m of instanced)m.dispose();for(const g of disposeGeometry)g.dispose();for(const m of disposeMaterial)m.dispose();}
  };
}
