import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {levels} from './levels.js';

const $=s=>document.querySelector(s);
const canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.88;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x86b6ce);
scene.fog=new THREE.Fog(0x9bc1d2,42,78);
const camera=new THREE.PerspectiveCamera(42,1,.1,130);
scene.add(new THREE.HemisphereLight(0xeaf6ff,0x405338,1.35));
const sun=new THREE.DirectionalLight(0xffe0ae,2.15);
sun.position.set(-14,24,11);
sun.castShadow=true;
sun.shadow.mapSize.set(1280,1280);
sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;
scene.add(sun);

const world=new THREE.Group(),vehicleLayer=new THREE.Group();
scene.add(world,vehicleLayer);
let levelIndex=0,vehicles=[],running=false,failed=false,unlocked=+(localStorage.tp3dUnlocked||1),audioOn=true,loadToken=0;

const mats=new Map();
function mat(c,r=.72,m=.03){
  const k=`${c}-${r}-${m}`;
  if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m}));
  return mats.get(k);
}
function box(w,h,d,c,x,y,z,g=world,r=.72,m=.03){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,r,m));
  o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;
}
function cyl(rad,h,c,x,y,z,g=world,segments=14){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,h,segments),mat(c));
  o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;
}
function tree(x,z,s=1){
  cyl(.16*s,1.7*s,0x6f4b32,x,.85*s,z);
  for(const [dx,dy,dz,sc,c] of [[0,1.95,0,1,0x327342],[.45,1.78,.12,.72,0x3d814a],[-.4,1.72,-.12,.68,0x2f6a3b]]){
    const o=new THREE.Mesh(new THREE.IcosahedronGeometry(.88*s*sc,1),mat(c));
    o.position.set(x+dx*s,dy*s,z+dz*s);o.castShadow=true;world.add(o);
  }
}
function lamp(x,z,flip=1){
  cyl(.065,2.85,0x242a2e,x,1.425,z);
  box(.62,.07,.07,0x242a2e,x+.27*flip,2.82,z);
  const a=box(.22,.11,.18,0xf6d27b,x+.58*flip,2.77,z);
  a.material=new THREE.MeshStandardMaterial({color:0xffdf91,emissive:0xffa928,emissiveIntensity:.45,roughness:.45});
}
function building(x,z,w,d,h,c,shop=false){
  box(w+.55,.26,d+.55,0xaaa69e,x,.06,z);
  box(w,h,d,c,x,h/2+.2,z,world,.8,.01);
  box(w+.12,.18,d+.12,0x454b50,x,h+.22,z);
  const front=z+d/2+.021;
  for(let y=1.25;y<h-.2;y+=1.25)for(let xx=-w/2+.7;xx<w/2-.25;xx+=1.2){
    const win=box(.56,.5,.035,0x4f7f91,x+xx,y,front,world,.3,.08);
    win.material=new THREE.MeshStandardMaterial({color:0x5f8fa1,roughness:.28,metalness:.08});
  }
  if(shop){
    box(w*.76,.72,.24,0x263f3a,x,.88,z+d/2+.13);
    box(w*.69,.12,.38,0xd99a35,x,1.28,z+d/2+.18);
    for(let i=-1;i<=1;i++)box(.75,.78,.04,0x315968,x+i*.9,.75,z+d/2+.27,world,.25,.08);
  }
}
function bench(x,z,rot=0){
  const g=new THREE.Group();
  box(1.65,.12,.42,0x6d442d,0,.58,0,g);box(1.65,.12,.12,0x6d442d,0,1.02,-.18,g);
  for(const dx of [-.6,.6]){box(.1,.58,.1,0x2e3437,dx,.29,0,g);box(.1,.54,.1,0x2e3437,dx,.78,-.2,g)}
  g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
}
function crosswalk(horizontal=true,sign=1){
  for(let i=-3;i<=3;i++){
    if(horizontal)box(.42,.025,1.6,0xe8e4d8,i*.72,.145,sign*5.05);
    else box(1.6,.025,.42,0xe8e4d8,sign*5.05,.145,i*.72);
  }
}
function buildWorld(theme){
  world.clear();
  box(56,.62,56,0x5d8d46,0,-.5,0);
  box(56,.18,9.8,0x292f34,0,0,0,world,.92);
  box(9.8,.19,56,0x292f34,0,.01,0,world,.92);
  for(const s of [-1,1]){
    box(56,.23,1.3,0xa5a39b,0,.12,s*5.52);
    box(1.3,.23,56,0xa5a39b,s*5.52,.12,0);
  }
  for(const z of [-3.28,3.28])for(let x=-25;x<26;x+=4.25)box(2.15,.025,.1,0xded9c9,x,.14,z);
  for(const x of [-3.28,3.28])for(let z=-25;z<26;z+=4.25)box(.1,.025,2.15,0xded9c9,x,.14,z);
  crosswalk(true,-1);crosswalk(true,1);crosswalk(false,-1);crosswalk(false,1);

  const cs=theme==='hospital'?[0x9c6b55,0xe1dfd4,0xa67c68,0x9b735d]:[0x9f604b,0xc1865c,0x8b8275,0xb06f52];
  building(-12,-12,7.8,7.2,theme==='city'?7.8:5.6,cs[0],true);
  building(12,-12,7.2,7.1,theme==='hospital'?6.7:5.3,cs[1],theme==='shops');
  building(-12,12,7.2,7.2,5.8,cs[2],false);
  building(12,12,7.8,7.2,theme==='city'?8.1:5.7,cs[3],true);
  for(const p of [[-7.4,-7.3],[7.4,-7.3],[-7.4,7.3],[7.4,7.3],[-18,-7.2],[18,7.2],[-18,7.2],[18,-7.2]])tree(...p,.82);
  for(const p of [[-6.2,-10.2,1],[6.2,-10.2,-1],[-6.2,10.2,1],[6.2,10.2,-1]])lamp(...p);
  bench(-8.2,-5.9,0);bench(8.2,5.9,Math.PI);bench(-5.9,8.1,Math.PI/2);bench(5.9,-8.1,-Math.PI/2);
  if(theme==='hospital'){
    box(2.2,.14,2.2,0xe6e8e7,12,.22,-8.2);
    box(.32,1.75,.32,0xe8e8e4,12,1.05,-8.2);
    box(1.5,.3,.3,0xd43c43,12,1.45,-8.05);
    box(.3,1.5,.3,0xd43c43,12,1.45,-8.05);
  }
}

const loader=new GLTFLoader();
const CAR_BASE='https://cdn.jsdelivr.net/gh/kidscancode/3d_car_sphere@cabc5c0019e68913012fc41d7b2ded6dcef3be31/assets/kenney_car_kit/';
const carFiles={
  sedan:'sedan.glb',hatch:'hatchbackSports.glb',suv:'suv.glb',taxi:'taxi.glb',
  van:'van.glb',ambulance:'ambulance.glb',police:'police.glb',fire:'firetruck.glb',
  sports:'sedanSports.glb',truck:'truck.glb'
};
const cache=new Map();
function getAsset(type){
  const f=carFiles[type]||carFiles.sedan;
  if(cache.has(f))return cache.get(f);
  const p=new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('asset timeout'))}},6500);
    loader.load(CAR_BASE+f,g=>{if(settled)return;settled=true;clearTimeout(timer);resolve(g.scene)},undefined,e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e)});
  });
  cache.set(f,p);return p;
}

function wheel(g,x,z,r=.31){
  const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.25,18),mat(0x111418,.86));
  t.rotation.z=Math.PI/2;t.position.set(x,.36,z);t.castShadow=true;g.add(t);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.43,r*.43,.255,14),mat(0x9ca4aa,.3,.65));
  hub.rotation.z=Math.PI/2;hub.position.copy(t.position);g.add(hub);
}
function makeDirectionArrow(height=2.05){
  const g=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(.18,.08,.9),new THREE.MeshStandardMaterial({color:0xffd23f,emissive:0x6b4d00,emissiveIntensity:.42,roughness:.35}));
  shaft.position.z=.1;g.add(shaft);
  const head=new THREE.Mesh(new THREE.ConeGeometry(.38,.68,3),new THREE.MeshStandardMaterial({color:0xffd23f,emissive:0x6b4d00,emissiveIntensity:.42,roughness:.35}));
  head.rotation.x=Math.PI/2;head.position.z=.78;g.add(head);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.05,24),new THREE.MeshBasicMaterial({color:0x17202a,transparent:true,opacity:.72}));
  disc.rotation.x=Math.PI/2;disc.position.y=-.06;g.add(disc);
  g.position.y=height;g.userData.directionArrow=true;
  return g;
}
function addDirectionArrow(g,type){
  const height=type==='fire'?2.35:['ambulance','van','truck'].includes(type)?2.12:type==='suv'?1.95:1.78;
  const arrow=makeDirectionArrow(height);
  g.add(arrow);g.userData.arrow=arrow;
}
function fallbackVehicle(v){
  const g=new THREE.Group();
  const big=['van','ambulance','fire','truck'].includes(v.type);
  const L=v.type==='fire'?4.1:big?3.45:v.type==='suv'?3.1:2.95;
  const W=big?1.55:1.45,H=big?1.0:v.type==='suv'?.84:.68,c=v.color||0xd54c43;
  box(W,H,L,c,0,.58,0,g,.34,.16);
  box(W*.96,.13,L*.72,c,0,.92,-.08,g,.3,.16);
  box(W*.83,big?.62:.52,big?L*.46:L*.48,big?c:0x365765,0,big?1.25:1.16,-.2,g,.22,.12);
  if(!big){for(const sx of [-1,1])box(.04,.36,L*.25,0x668e9b,sx*W*.42,1.15,-.2,g,.2,.08)}
  for(const x of [-W*.51,W*.51])for(const z of [-L*.31,L*.31])wheel(g,x,z,big?.34:.3);
  for(const x of [-W*.28,W*.28]){
    const h=box(.22,.2,.06,0xffdf91,x,.62,L/2+.035,g);
    h.material=new THREE.MeshStandardMaterial({color:0xffe7a8,emissive:0xffbf44,emissiveIntensity:.7});
    const t=box(.22,.18,.06,0xde2633,x,.61,-L/2-.035,g);
    t.material=new THREE.MeshStandardMaterial({color:0xe52d37,emissive:0x7c0710,emissiveIntensity:.6});
  }
  if(v.type==='taxi')box(.5,.16,.35,0xf4c542,0,1.47,0,g);
  if(v.type==='sports')box(W*.86,.12,L*.32,0x1f2933,0,.98,-.25,g,.25,.18);
  if(['police','ambulance','fire'].includes(v.type)){
    const bar=new THREE.Group();
    const a=box(.42,.12,.22,0x2d78ff,-.25,1.55,0,bar);
    a.material=new THREE.MeshStandardMaterial({color:0x327cff,emissive:0x135dff,emissiveIntensity:1.5});
    const b=box(.42,.12,.22,0xff3f4e,.25,1.55,0,bar);
    b.material=new THREE.MeshStandardMaterial({color:0xff3f4e,emissive:0xff1026,emissiveIntensity:1.5});
    g.add(bar);g.userData.flash=[a,b];
  }
  g.userData.emergency=['police','ambulance','fire'].includes(v.type);
  addDirectionArrow(g,v.type);
  return g;
}
function normalizeGLB(src,type){
  const outer=new THREE.Group(),model=src.clone(true);outer.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material.side=THREE.FrontSide}});
  let b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3());
  const target=type==='fire'?4.15:['ambulance','van','truck'].includes(type)?3.5:type==='suv'?3.15:2.95;
  const horiz=Math.max(s.x,s.z)||1,scale=target/horiz;
  model.scale.setScalar(scale);
  model.rotation.y=Math.PI;
  b=new THREE.Box3().setFromObject(model);
  const center=b.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y-.13;
  outer.userData.emergency=['police','ambulance','fire'].includes(type);
  if(outer.userData.emergency){
    const bar=new THREE.Group(),y=type==='fire'?1.55:1.38;
    const a=box(.36,.09,.18,0x2d78ff,-.22,y,0,bar);
    a.material=new THREE.MeshStandardMaterial({color:0x327cff,emissive:0x135dff,emissiveIntensity:1.8});
    const bb=box(.36,.09,.18,0xff3f4e,.22,y,0,bar);
    bb.material=new THREE.MeshStandardMaterial({color:0xff3f4e,emissive:0xff1026,emissiveIntensity:1.8});
    outer.add(bar);outer.userData.flash=[a,bb];
  }
  addDirectionArrow(outer,type);
  return outer;
}
async function upgradeVehicle(v,token){
  try{
    const src=await getAsset(v.type);
    if(token!==loadToken||!v.mesh||v.state==='done')return;
    const upgraded=normalizeGLB(src,v.type);
    upgraded.position.copy(v.mesh.position);
    upgraded.rotation.copy(v.mesh.rotation);
    upgraded.visible=v.mesh.visible;
    vehicleLayer.remove(v.mesh);vehicleLayer.add(upgraded);v.mesh=upgraded;
  }catch(e){
    console.warn('Real model unavailable, fallback kept:',v.type,e);
  }
}

function point(route,t){
  const n=route.length-1,p=Math.min(n-1,Math.floor(t*n)),f=t*n-p,a=route[p],b=route[p+1];
  return new THREE.Vector3(THREE.MathUtils.lerp(a[0],b[0],f),.13,THREE.MathUtils.lerp(a[1],b[1],f));
}
function orient(mesh,p,n){
  mesh.rotation.y=Math.atan2(n.x-p.x,n.z-p.z);
}

let audioCtx=null,masterGain=null,ambient=null;
function ensureAudio(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain();masterGain.gain.value=audioOn?.5:0;masterGain.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
  if(!ambient&&audioOn)startAmbient();
}
function startAmbient(){
  if(!audioCtx||ambient)return;
  const seconds=2,buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*seconds,audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.18;
  const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
  src.buffer=buffer;src.loop=true;filter.type='lowpass';filter.frequency.value=260;gain.gain.value=.035;
  src.connect(filter);filter.connect(gain);gain.connect(masterGain);src.start();
  ambient={src,gain};
}
function beep(freq,dur=.12,vol=.08,type='sine',when=0){
  if(!audioOn)return;ensureAudio();
  const t=audioCtx.currentTime+when,o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+dur+.03);
}
function playEngineStart(type){
  if(!audioOn)return;ensureAudio();
  const heavy=['truck','van','fire','ambulance'].includes(type);
  const sporty=type==='sports';
  const base=heavy?58:sporty?118:82,t=audioCtx.currentTime;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
  o.type=heavy?'sawtooth':'triangle';o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*(sporty?2.3:1.65),t+.38);
  filter.type='lowpass';filter.frequency.value=heavy?520:900;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(heavy?.13:.1,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.48);
  o.connect(filter);filter.connect(g);g.connect(masterGain);o.start();o.stop(t+.52);
}
function startDriveSound(v){
  if(!audioOn||v.sound)return;ensureAudio();
  const heavy=['truck','van','fire','ambulance'].includes(v.type),sporty=v.type==='sports';
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=heavy?54:sporty?112:76;filter.type='lowpass';filter.frequency.value=heavy?380:650;g.gain.value=heavy?.035:.024;
  o.connect(filter);filter.connect(g);g.connect(masterGain);o.start();
  v.sound={engine:o,engineGain:g};
  if(['police','ambulance','fire'].includes(v.type)){
    const sir=audioCtx.createOscillator(),sg=audioCtx.createGain(),lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();
    sir.type='sine';sir.frequency.value=v.type==='police'?720:v.type==='ambulance'?640:520;
    sg.gain.value=v.type==='fire'?.055:.045;lfo.type='sine';lfo.frequency.value=v.type==='police'?1.45:v.type==='ambulance'?1.05:.82;
    lg.gain.value=v.type==='fire'?150:210;lfo.connect(lg);lg.connect(sir.frequency);sir.connect(sg);sg.connect(masterGain);sir.start();lfo.start();
    v.sound.siren=sir;v.sound.sirenGain=sg;v.sound.lfo=lfo;
  }
}
function stopVehicleSound(v){
  if(!v.sound||!audioCtx){v.sound=null;return}
  const t=audioCtx.currentTime;
  for(const key of ['engineGain','sirenGain'])if(v.sound[key]){v.sound[key].gain.cancelScheduledValues(t);v.sound[key].gain.setValueAtTime(Math.max(.0001,v.sound[key].gain.value),t);v.sound[key].gain.exponentialRampToValueAtTime(.0001,t+.12)}
  for(const key of ['engine','siren','lfo'])if(v.sound[key])try{v.sound[key].stop(t+.14)}catch{}
  v.sound=null;
}
function stopAllSounds(){for(const v of vehicles)stopVehicleSound(v)}
function crashSound(){
  if(!audioOn)return;ensureAudio();
  beep(95,.3,.15,'sawtooth');beep(55,.38,.13,'square',.03);
}
function winSound(){
  if(!audioOn)return;
  beep(523,.11,.08,'sine');beep(659,.11,.08,'sine',.12);beep(784,.18,.09,'sine',.24);
}

function loadLevel(i){
  stopAllSounds();
  const token=++loadToken;levelIndex=i;failed=false;running=false;vehicleLayer.clear();vehicles=[];buildWorld(levels[i].theme);
  $('#levelLabel').textContent=i+1;$('#message').textContent=levels[i].name+' • Araca dokun';
  for(const data of levels[i].vehicles){
    const mesh=fallbackVehicle(data),t=data.start||0,p=point(data.route,t),n=point(data.route,Math.min(.999,t+.01));
    mesh.position.copy(p);orient(mesh,p,n);vehicleLayer.add(mesh);
    const v={...data,mesh,t,state:'waiting',sound:null};vehicles.push(v);upgradeVehicle(v,token);
  }
  updateRemaining();running=true;
}
function updateRemaining(){$('#remaining').textContent=vehicles.filter(v=>v.state!=='done').length}

const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener('pointerup',e=>{
  if(!running||failed)return;
  ensureAudio();
  const r=canvas.getBoundingClientRect();
  pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(pointer,camera);
  const h=ray.intersectObjects(vehicleLayer.children,true);
  if(!h.length)return;
  let o=h[0].object;
  while(o.parent!==vehicleLayer&&o.parent)o=o.parent;
  const v=vehicles.find(q=>q.mesh===o);
  if(v?.state==='waiting'){
    v.state='moving';playEngineStart(v.type);startDriveSound(v);
    $('#message').textContent=v.mesh.userData.emergency?'Acil araç yolda!':'Araç hareket etti';
  }
});
function collide(){
  const active=vehicles.filter(v=>v.state==='moving');
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    if(active[i].mesh.position.distanceTo(active[j].mesh.position)<1.42){
      failed=true;running=false;stopAllSounds();crashSound();
      $('#resultIcon').textContent='!';$('#resultIcon').style.background='#ff5a5f';
      $('#resultTitle').textContent='Çarpışma!';$('#resultText').textContent='Sırayı değiştir ve tekrar dene.';
      $('#nextBtn').style.display='none';$('#result').classList.add('visible');return;
    }
  }
}
function win(){
  running=false;stopAllSounds();winSound();
  unlocked=Math.max(unlocked,Math.min(levels.length,levelIndex+2));localStorage.tp3dUnlocked=unlocked;
  $('#resultIcon').textContent='✓';$('#resultIcon').style.background='#54d98c';
  $('#resultTitle').textContent='Yol Temiz!';$('#resultText').textContent='Tüm araçları güvenle geçirdin.';
  $('#nextBtn').style.display=levelIndex<levels.length-1?'block':'none';$('#result').classList.add('visible');
}
function tick(dt,now){
  if(!running||failed)return;
  for(const v of vehicles){
    if(v.mesh.userData.flash){
      const on=Math.floor(now/220)%2===0;v.mesh.userData.flash[0].visible=on;v.mesh.userData.flash[1].visible=!on;
    }
    if(v.state!=='moving')continue;
    v.t+=dt*v.speed/42;
    if(v.t>=1){
      v.t=1;v.state='done';stopVehicleSound(v);v.mesh.visible=false;updateRemaining();continue;
    }
    const p=point(v.route,v.t),n=point(v.route,Math.min(.999,v.t+.008));
    v.mesh.position.copy(p);orient(v.mesh,p,n);
  }
  collide();
  if(!failed&&vehicles.length&&vehicles.every(v=>v.state==='done'))win();
}
let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  tick(Math.min(.035,(now-last)/1000),now);last=now;renderer.render(scene,camera);
}
requestAnimationFrame(animate);

function resize(){
  renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
  const k=camera.aspect<.72?1.34:camera.aspect<1?1.15:1;
  camera.position.set(18*k,23*k,21*k);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();buildWorld('park');

const menu=$('#menu'),select=$('#levelSelect'),result=$('#result');
$('#playBtn').onclick=()=>{
  ensureAudio();menu.classList.remove('visible');loadLevel(Math.min(unlocked-1,levels.length-1));
};
$('#homeBtn').onclick=()=>{
  stopAllSounds();++loadToken;running=false;result.classList.remove('visible');select.classList.remove('visible');menu.classList.add('visible');
};
$('#retryBtn').onclick=()=>{result.classList.remove('visible');loadLevel(levelIndex)};
$('#nextBtn').onclick=()=>{result.classList.remove('visible');loadLevel(Math.min(levelIndex+1,levels.length-1))};
$('#soundBtn').onclick=e=>{
  audioOn=!audioOn;e.currentTarget.textContent=audioOn?'🔊':'🔇';
  if(audioOn){ensureAudio();if(masterGain)masterGain.gain.setTargetAtTime(.5,audioCtx.currentTime,.03)}
  else if(masterGain)masterGain.gain.setTargetAtTime(0,audioCtx.currentTime,.03);
};
function grid(){
  const g=$('#levelGrid');g.innerHTML='';
  levels.forEach((l,i)=>{
    const b=document.createElement('button');b.textContent=i+1;b.className=i>=unlocked?'locked':'';
    b.onclick=()=>{if(i>=unlocked)return;ensureAudio();select.classList.remove('visible');menu.classList.remove('visible');loadLevel(i)};
    g.appendChild(b);
  });
}
$('#levelsBtn').onclick=()=>{grid();menu.classList.remove('visible');select.classList.add('visible')};
$('#closeLevels').onclick=()=>{select.classList.remove('visible');menu.classList.add('visible')};

['sedan','hatch','suv','taxi','sports','van','truck','police','ambulance','fire'].forEach(t=>getAsset(t).catch(()=>{}));
