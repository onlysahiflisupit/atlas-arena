import {THREE as T,createWorld,createAvatar,createBlaster} from './world.js';
const $=s=>document.getElementById(s);
const TOOLS=[['Flux SMG','Pulsa cepat',135],['Ion Handgun','Pulsa tunggal',280],['Prisma AR','Pulsa beruntun',180],['Nova Sniper','Lensa fokus',440]];
export function createGame(view,initial,send){
  const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'low-power',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));view.replaceChildren(renderer.domElement);const canvas=renderer.domElement;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(69,1,.055,330);scene.add(camera);
  const world=createWorld(scene,initial.settings.map),me=initial.players.find(p=>p.id===initial.me);
  const hero=createAvatar(me.avatar),tools=TOOLS.map((_,i)=>createBlaster(i));scene.add(hero);
  const beacon=new T.Group();scene.add(beacon);const ownGeo=[],ownMat=[],textures=[];
  function mesh(g,m){ownGeo.push(g);ownMat.push(m);return new T.Mesh(g,m);}
  const glow=(color,opacity=1)=>new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1,side:T.DoubleSide});
  const ring=mesh(new T.TorusGeometry(2.25,.12,6,40),glow(0xb5ff64));ring.rotation.x=Math.PI/2;ring.position.y=.13;beacon.add(ring);
  const beam=mesh(new T.CylinderGeometry(.16,.6,14,8),glow(0xceff7c,.30));beam.position.y=7;beacon.add(beam);
  const gem=mesh(new T.OctahedronGeometry(1),glow(0xd7ff6b));gem.position.y=3.2;beacon.add(gem);
  const targets=new T.Group();scene.add(targets);const plates=[];const palette=['#277f83','#965b40','#5666a6','#805588'];
  for(let i=0;i<4;i++){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=palette[i];ctx.fillRect(0,0,128,128);ctx.lineWidth=8;ctx.strokeStyle='#e7fdc9';ctx.strokeRect(4,4,120,120);ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 88px Arial';ctx.fillText('ABCD'[i],64,70);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    const plate=mesh(new T.PlaneGeometry(1.25,1.25),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));plate.userData.choice=i;plate.position.set(i%2?1:-1,i<2?2.52:.95,0);targets.add(plate);plates.push(plate);
  }
  targets.visible=false;
  const ray=new T.Raycaster(), pointer=new T.Vector2(),loc=new T.Vector3(0,0,0),dir=new T.Vector3();
  const lines=[],remote=new Map(),keys=new Set(),events=new AbortController(),signal=events.signal;
  const capacities=[24,10,18,6],charge=[...capacities];let rechargingUntil=0,previousTool=1;
  let yaw=0,pitch=0,height=0,velocity=0,third=false,crouch=false,autoRun=false,focus=false,tool=0,held=false,fireTime=0;
  let stickX=0,stickY=0,stickId=null,lookId=null,lastX=0,lastY=0,drag=false,touchStart=0;
  let previousPose='',lastPoseCheck=0,frameWindow=0,frameCount=0,objectiveText='';
  let state=initial,lastRound=-1,hasTargets=false,lastT=performance.now(),lastSent=0,lastReach=0,raf=0,alive=true;
  const on=(node,type,fn,opts={})=>node.addEventListener(type,fn,{...opts,signal});
  function equip(i){
    const next=(i+4)%4;if(next!==tool){previousTool=tool;rechargingUntil=0;}tool=next;tools.forEach(t=>t.removeFromParent());const obj=tools[tool];
    if(third){hero.add(obj);obj.position.set(.44,.92,-.32);obj.scale.setScalar(1.0);}
    else{camera.add(obj);obj.position.set(.27,-.22,-.53);obj.scale.setScalar(.88);}
    toolDisplay();
  }
  function toolDisplay(){
    $('toolName').textContent=(tool+1)+' / 4 · '+TOOLS[tool][0];
    $('toolInfo').textContent=rechargingUntil?'Mengisi energi…':TOOLS[tool][1]+' · '+charge[tool]+'/'+capacities[tool]+' · R isi energi';
  }
  function recharge(){
    if(!rechargingUntil&&charge[tool]<capacities[tool]){rechargingUntil=performance.now()+850;toolDisplay();}
  }
  function switchCam(){third=!third;hero.visible=third;equip(tool);$('camera').textContent=third?'TPS → FPS':'FPS → TPS';}
  hero.visible=false;equip(0);$('camera').textContent='FPS → TPS';
  function aimAtPoint(pt){yaw=Math.atan2(-(pt.x-loc.x),-(pt.z-loc.z));pitch=-.035;}
  function received(next){
    state=next;
    if(next.round!==lastRound){lastRound=next.round;targets.visible=false;hasTargets=false;aimAtPoint(next.point);lastReach=0;}
    beacon.position.set(next.point.x,0,next.point.z);beacon.visible=!next.reached;
    if(next.reached && !hasTargets){
      hasTargets=true;targets.position.set(loc.x-Math.sin(yaw)*6,0,loc.z-Math.cos(yaw)*6);targets.rotation.y=yaw;targets.visible=true;pitch=.015;
    }
    for(const p of next.players){if(p.id===next.me||remote.has(p.id))continue;const avatar=createAvatar(p.avatar);scene.add(avatar);const label=document.createElement('canvas');label.width=256;label.height=48;const c=label.getContext('2d');c.fillStyle='#122123cc';c.fillRect(0,0,256,48);c.font='bold 26px Arial';c.fillStyle='white';c.textAlign='center';c.fillText(p.name.slice(0,16),128,33);const tx=new T.CanvasTexture(label);textures.push(tx);const mat=new T.SpriteMaterial({map:tx,depthTest:false});ownMat.push(mat);const badge=new T.Sprite(mat);badge.position.y=2.05;badge.scale.set(2.7,.5,1);avatar.add(badge);remote.set(p.id,{avatar,target:new T.Vector3(),yaw:0,crouch:false,tool:-1});}
    for(const p of next.players){if(remote.has(p.id))remote.get(p.id).avatar.visible=p.online;}
  }
  function poses(list){for(const p of list){const other=remote.get(p.id);if(!other)continue;other.target.set(p.x,p.y,p.z);other.yaw=p.yaw;other.crouch=p.crouch;}}
  function mark(i){plates.forEach((p,k)=>p.scale.setScalar(k===i?1.16:1));}
  function select(i){if(state.reached&&state.question&&send({type:'shot',round:state.round,choice:i})){mark(i);}}
  function fire(ndc=null){
    const t=performance.now();if(t-fireTime<TOOLS[tool][2]||rechargingUntil)return;
    if(!charge[tool]){recharge();return;}
    charge[tool]--;fireTime=t;toolDisplay();
    pointer.set(ndc?.x||0,ndc?.y||0);ray.setFromCamera(pointer,camera);
    const hit=targets.visible?ray.intersectObjects(plates,false)[0]:null;
    if(hit)select(hit.object.userData.choice);
    const start=tools[tool].getWorldPosition(new T.Vector3()),end=hit?hit.point:ray.ray.at(24,new T.Vector3());
    const geo=new T.BufferGeometry().setFromPoints([start,end]),mat=new T.LineBasicMaterial({color:[0x86ffec,0xffd18b,0xa7ddff,0xe1aaff][tool],transparent:true,opacity:.9});const line=new T.Line(geo,mat);scene.add(line);lines.push({line,t});
  }
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function look(dx,dy){yaw-=dx*(focus?.0012:.003);pitch=clamp(pitch-dy*(focus?.0012:.003),-1.15,1.15);}
  function jump(){if(height<=.005){velocity=6.3;height=.007;}}
  function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  on(window,'resize',resize);resize();
  on(window,'keydown',e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey)return;
    const k=e.code;if(['Space','KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;
    if(k==='Space')jump();if(k==='KeyV')switchCam();if(k==='KeyR')recharge();if(k==='KeyQ')equip(previousTool);if(k==='KeyF')focus=!focus;if(/^Digit[1-4]$/.test(k))equip(Number(k.slice(-1))-1);
  });
  on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',()=>{keys.clear();held=false;stickX=stickY=0;});
  on(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas)held=false;});
  on(canvas,'wheel',e=>{e.preventDefault();equip(tool+(e.deltaY>0?1:-1));},{passive:false});
  on(canvas,'contextmenu',e=>e.preventDefault());
  on(canvas,'pointerdown',e=>{
    if(e.button===2){focus=!focus;return;}if(e.pointerType==='touch'){lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;touchStart=performance.now();drag=false;canvas.setPointerCapture(e.pointerId);return;}
    if(document.pointerLockElement===canvas){held=true;fire();return;}
    const r=canvas.getBoundingClientRect();fire({x:2*(e.clientX-r.left)/r.width-1,y:1-2*(e.clientY-r.top)/r.height});
    lastX=e.clientX;lastY=e.clientY;lookId=e.pointerId;canvas.setPointerCapture(e.pointerId);try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{}
  });
  on(document,'mousemove',e=>{if(document.pointerLockElement===canvas)look(e.movementX,e.movementY);});
  on(canvas,'pointermove',e=>{if(e.pointerId!==lookId||document.pointerLockElement===canvas)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)drag=true;look(dx,dy);lastX=e.clientX;lastY=e.clientY;});
  on(window,'pointerup',e=>{held=false;if(e.pointerId===lookId){lookId=null;if(e.pointerType==='touch'&&!drag&&performance.now()-touchStart<250){const r=canvas.getBoundingClientRect();fire({x:2*(e.clientX-r.left)/r.width-1,y:1-2*(e.clientY-r.top)/r.height});}}});
  on(canvas,'pointercancel',()=>{held=false;lookId=null;});
  const stick=$('stick'),thumb=stick.firstElementChild;
  function joy(e){const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.38),y=(e.clientY-r.top-r.height/2)/(r.height*.38),l=Math.max(1,Math.hypot(x,y));stickX=x/l;stickY=-y/l;thumb.style.transform='translate('+stickX*24+'px,'+(-stickY*24)+'px)';}
  on(stick,'pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);joy(e);});on(stick,'pointermove',e=>{if(e.pointerId===stickId)joy(e);});
  for(const type of ['pointerup','pointercancel'])on(stick,type,e=>{if(e.pointerId===stickId){stickId=null;stickX=stickY=0;thumb.style.transform='';}});
  on($('camera'),'click',switchCam);on($('touchTool'),'click',()=>equip(tool+1));on($('touchJump'),'pointerdown',jump);on($('touchCrouch'),'click',()=>{crouch=!crouch;$('touchCrouch').setAttribute('aria-pressed',crouch);});on($('touchRun'),'click',()=>{autoRun=!autoRun;$('touchRun').setAttribute('aria-pressed',autoRun);});
  on($('touchFire'),'pointerdown',e=>{e.target.setPointerCapture(e.pointerId);held=true;fire();});on($('touchFire'),'pointercancel',()=>held=false);
  function frame(t){if(!alive)return;
    // Keep aiming responsive on low-end GPUs when a populated scene slows rendering.
    if(!document.hidden && t-lastT<250){frameWindow+=t-lastT;frameCount++;}
    if(frameWindow>=2200){
      if(frameCount*1000/frameWindow<27 && renderer.getPixelRatio()>.8){
        renderer.setPixelRatio(Math.max(.8,renderer.getPixelRatio()-.2));resize();
      }
      frameCount=frameWindow=0;
    }
    const dt=Math.min(.05,Math.max(0,(t-lastT)/1000));lastT=t;
    if(rechargingUntil && t>=rechargingUntil){charge[tool]=capacities[tool];rechargingUntil=0;toolDisplay();}
    const paused=!!document.querySelector('dialog[open]'),low=crouch||keys.has('KeyC')||keys.has('ControlLeft');
    if(!paused){
      let f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+stickY;
      let s=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+stickX;
      if(keys.has('ArrowLeft'))yaw+=dt*2;if(keys.has('ArrowRight'))yaw-=dt*2;
      const n=Math.max(1,Math.hypot(f,s)),speed=low?3.2:(keys.has('ShiftLeft')||keys.has('ShiftRight')||autoRun)?10.5:6.7;
      f=f/n*speed*dt;s=s/n*speed*dt;const x=loc.x+s*Math.cos(yaw)-f*Math.sin(yaw),z=loc.z-s*Math.sin(yaw)-f*Math.cos(yaw);
      if(!world.blocked(x,loc.z))loc.x=x;if(!world.blocked(loc.x,z))loc.z=z;
      if(held&&(tool===0||tool===2))fire();
    }
    velocity-=dt*15;height=Math.max(0,height+velocity*dt);if(!height)velocity=0;
    const eyes=(low?1.05:1.63)+height;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0,'YXZ');
    camera.position.set(loc.x,eyes,loc.z);
    if(third){camera.getWorldDirection(dir);camera.position.addScaledVector(dir,-3.7);camera.position.y+=.7;hero.position.set(loc.x,height,loc.z);hero.rotation.y=yaw;hero.scale.y=low?.72:1;}
    camera.fov=focus?(tool===3?31:50):69;camera.updateProjectionMatrix();world.update(t/1000);gem.rotation.y=t/650;gem.position.y=3.15+Math.sin(t/340)*.2;
    if(!third)tools[tool].position.z=-.53+Math.max(0,1-(t-fireTime)/110)*.085;
    for(const o of remote.values()){o.avatar.position.lerp(o.target,1-Math.exp(-dt*15));const delta=Math.atan2(Math.sin(o.yaw-o.avatar.rotation.y),Math.cos(o.yaw-o.avatar.rotation.y));o.avatar.rotation.y+=delta*Math.min(1,dt*15);o.avatar.scale.y=o.crouch?.72:1;}
    for(let i=lines.length-1;i>=0;i--)if(t-lines[i].t>95){const l=lines.splice(i,1)[0].line;l.removeFromParent();l.geometry.dispose();l.material.dispose();}
    const dx=state.point.x-loc.x,dz=state.point.z-loc.z,dist=Math.hypot(dx,dz);
    if(t-lastPoseCheck>98){
      lastPoseCheck=t;
      const pose={type:'move',x:+loc.x.toFixed(2),z:+loc.z.toFixed(2),y:+height.toFixed(2),yaw:+yaw.toFixed(3),tool,crouch:low};
      const fingerprint=JSON.stringify(pose);
      if(fingerprint!==previousPose||t-lastSent>1500){send(pose);previousPose=fingerprint;lastSent=t;}
    }
    if(!state.reached&&dist<3.8&&t-lastReach>400){send({type:'reach',round:state.round});lastReach=t;}
    const angle= Math.atan2(-dx,-dz)-yaw;
    const arrows=['↑','↖','←','↙','↓','↘','→','↗'];const arrow=arrows[((Math.round(angle/(Math.PI/4))%8)+8)%8];
    const text=state.reached?'Bidik pelat A–D':arrow+'  Suar soal · '+Math.ceil(dist)+' m';
    if(text!==objectiveText){objectiveText=text;$('objective').textContent=text;}
    renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }
  received(initial);raf=requestAnimationFrame(frame);
  return {state:received,poses,correct:p=>loc.set(p.x,0,p.z),select,mark,dispose(){alive=false;cancelAnimationFrame(raf);events.abort();if(document.pointerLockElement===canvas)document.exitPointerLock();world.dispose();for(const l of lines){l.line.geometry.dispose();l.line.material.dispose();}ownGeo.forEach(g=>g.dispose());ownMat.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
