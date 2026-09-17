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
renderer.toneMappingExposure=1.08;

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,1,.1,130);
const hemi=new THREE.HemisphereLight(0xf8fdff,0x48613d,1.65);
scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b0,2.45);
sun.position.set(-14,24,11);
sun.castShadow=true;
sun.shadow.mapSize.set(1280,1280);
sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;
scene.add(sun);

const world=new THREE.Group();
const vehicleLayer=new THREE.Group();
const effectsLayer=new THREE.Group();
scene.add(world,vehicleLayer,effectsLayer);

let levelIndex=0;
let vehicles=[];
let running=false;
let failed=false;
let unlocked=+(localStorage.tp3dUnlocked||1);
let audioOn=true;
let loadToken=0;
let crashEffects=[];

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
  cyl(.16*s,1.7*s,0x70472d,x,.85*s,z);
  for(const [dx,dy,dz,sc,c] of [[0,1.95,0,1,0x2c8b47],[.45,1.78,.12,.72,0x49b863],[-.4,1.72,-.12,.68,0x23763d]]){
    const o=new THREE.Mesh(new THREE.IcosahedronGeometry(.88*s*sc,1),mat(c,.75,.01));
    o.position.set(x+dx*s,dy*s,z+dz*s);o.castShadow=true;world.add(o);
  }
}
function lamp(x,z,flip=1){
  cyl(.065,2.85,0x252b31,x,1.425,z);
  box(.62,.07,.07,0x252b31,x+.27*flip,2.82,z);
  const a=box(.22,.11,.18,0xffdd85,x+.58*flip,2.77,z);
  a.material=new THREE.MeshStandardMaterial({color:0xffdf91,emissive:0xffa928,emissiveIntensity:.55,roughness:.4});
}
function building(x,z,w,d,h,c,shop=false,roof=0x454b50){
  box(w+.58,.24,d+.58,0xb8b2a8,x,.06,z);
  box(w,h,d,c,x,h/2+.2,z,world,.77,.02);
  box(w+.12,.18,d+.12,roof,x,h+.22,z);
  const front=z+d/2+.021;
  for(let y=1.25;y<h-.2;y+=1.25)for(let xx=-w/2+.7;xx<w/2-.25;xx+=1.2){
    const win=box(.56,.5,.035,0x5fb0cf,x+xx,y,front,world,.25,.08);
    win.material=new THREE.MeshStandardMaterial({color:0x69bdd8,roughness:.22,metalness:.08});
  }
  if(shop){
    box(w*.78,.76,.24,0x284742,x,.88,z+d/2+.13);
    box(w*.72,.15,.42,0xffb82e,x,1.3,z+d/2+.18);
    for(let i=-1;i<=1;i++)box(.76,.8,.04,0x356f88,x+i*.9,.77,z+d/2+.27,world,.2,.08);
  }
}
function bench(x,z,rot=0){
  const g=new THREE.Group();
  box(1.65,.12,.42,0x8b512f,0,.58,0,g);box(1.65,.12,.12,0x8b512f,0,1.02,-.18,g);
  for(const dx of [-.6,.6]){box(.1,.58,.1,0x2e3437,dx,.29,0,g);box(.1,.54,.1,0x2e3437,dx,.78,-.2,g)}
  g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
}
function planter(x,z,c=0xf2f0e8){
  box(1.45,.42,.72,c,x,.21,z,world,.85);
  for(const dx of [-.42,0,.42]){
    cyl(.05,.36,0x2f7e3f,x+dx,.52,z,world,8);
    const f=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,1),mat(dx===0?0xff5c8a:0xffc83d,.6));
    f.position.set(x+dx,.75,z);world.add(f);
  }
}
function cafeSet(x,z){
  cyl(.09,1.05,0xdad5ca,x,.52,z,world,12);
  cyl(.8,.08,0xf7f1e5,x,1.02,z,world,18);
  const umbrella=new THREE.Mesh(new THREE.ConeGeometry(1.35,.65,18),mat(0xff665d,.5));
  umbrella.position.set(x,2,z);umbrella.castShadow=true;world.add(umbrella);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const cx=x+Math.cos(a)*1.4,cz=z+Math.sin(a)*1.4;
    box(.48,.1,.48,0x3d5564,cx,.48,cz);cyl(.05,.48,0x30363a,cx,.24,cz,world,8);
  }
}
function fountain(x,z){
  cyl(2.05,.38,0xd8d2c6,x,.2,z,world,28);
  cyl(1.55,.25,0x57b9d6,x,.43,z,world,28);
  cyl(.28,1.2,0xc5c0b7,x,1.05,z,world,16);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(.36,14,10),mat(0x77d4ed,.25,.05));
  orb.position.set(x,1.8,z);world.add(orb);
}
function busStop(x,z,rot=0){
  const g=new THREE.Group();
  box(2.7,.12,1.15,0x59636c,0,.08,0,g);
  for(const sx of [-1.15,1.15])box(.08,2.1,.08,0x2f363d,sx,1.05,0,g);
  box(2.45,.08,1.0,0x35424b,0,2.05,0,g);
  const glass=box(2.25,1.55,.05,0x6bb7d0,0,1.1,-.48,g,.18,.12);glass.material.transparent=true;glass.material.opacity=.45;
  box(1.5,.12,.42,0xffb837,0,.55,.1,g);
  g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
}
function cone(x,z){
  const c=new THREE.Mesh(new THREE.ConeGeometry(.23,.7,12),mat(0xff7a1f,.55));
  c.position.set(x,.35,z);c.castShadow=true;world.add(c);
}
function container(x,z,c,rot=0){
  const g=new THREE.Group();box(4.2,1.7,2.15,c,0,.85,0,g,.65,.08);
  for(let xx=-1.7;xx<=1.7;xx+=.7)box(.06,1.48,2.17,0x28343d,xx,.86,0,g,.8,.1);
  g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
}
function parkedCar(x,z,c=0x3b82f6,rot=0){
  const g=new THREE.Group();box(1.35,.55,2.65,c,0,.45,0,g,.3,.18);box(1.2,.45,1.25,0x4f8197,0,.88,-.1,g,.22,.1);
  for(const sx of [-.7,.7])for(const zz of [-.78,.78]){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.16,14),mat(0x14181b,.9));w.rotation.z=Math.PI/2;w.position.set(sx,.28,zz);g.add(w);
  }
  g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
}
function roadSign(x,z,text='P',c=0x2f80ff){
  cyl(.055,1.75,0x444b50,x,.875,z,world,10);
  box(.72,.72,.08,c,x,1.62,z,world,.5,.03);
  const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.font='900 82px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,67);
  const tx=new THREE.CanvasTexture(cv),m=new THREE.MeshBasicMaterial({map:tx,transparent:true});const q=new THREE.Mesh(new THREE.PlaneGeometry(.62,.62),m);q.position.set(x,1.62,z+.045);world.add(q);
}
function flowerPatch(x,z,w=3,d=1.5){
  box(w,.08,d,0x326f3e,x,.04,z);
  const colors=[0xff5f7f,0xffd341,0x8f6bff,0xffffff];
  for(let i=0;i<14;i++){
    const px=x+(Math.random()-.5)*(w-.35),pz=z+(Math.random()-.5)*(d-.3);
    cyl(.025,.25,0x39834c,px,.15,pz,world,6);
    const f=new THREE.Mesh(new THREE.SphereGeometry(.07,6,4),mat(colors[i%colors.length],.6));f.position.set(px,.31,pz);world.add(f);
  }
}
function palm(x,z,s=1){
  cyl(.18*s,2.9*s,0x9a7145,x,1.45*s,z,world,10);
  for(let i=0;i<6;i++){
    const leaf=box(1.3*s,.08,.28*s,0x2a9b55,x,3*s,z,world,.7);
    leaf.rotation.y=i*Math.PI/3;leaf.position.x+=Math.cos(i*Math.PI/3)*.62*s;leaf.position.z+=Math.sin(i*Math.PI/3)*.62*s;
  }
}
function roadArm(dir,width=9.8){
  const road=0x2c3338,side=0xbcb6aa,line=0xf4e8c8;
  if(dir==='W'||dir==='E'){
    const sign=dir==='W'?-1:1,x=sign*16.5;
    box(23,.18,width,road,x,0,0,world,.92);
    box(23,.22,1.25,side,x,.12,5.52);box(23,.22,1.25,side,x,.12,-5.52);
    for(let px=sign*7;Math.abs(px)<27;px+=sign*4.2){box(2.05,.025,.1,line,px,.14,3.28);box(2.05,.025,.1,line,px,.14,-3.28)}
  }else{
    const sign=dir==='N'?-1:1,z=sign*16.5;
    box(width,.18,23,road,0,.01,z,world,.92);
    box(1.25,.22,23,side,5.52,.12,z);box(1.25,.22,23,side,-5.52,.12,z);
    for(let pz=sign*7;Math.abs(pz)<27;pz+=sign*4.2){box(.1,.025,2.05,line,3.28,.14,pz);box(.1,.025,2.05,line,-3.28,.14,pz)}
  }
}
function armCrosswalk(dir){
  for(let i=-3;i<=3;i++){
    if(dir==='W'||dir==='E'){
      const x=(dir==='W'?-1:1)*5.05;box(.42,.025,1.55,0xf5f1e6,x,.155,i*.72);
    }else{
      const z=(dir==='N'?-1:1)*5.05;box(1.55,.025,.42,0xf5f1e6,i*.72,.155,z);
    }
  }
}
function layoutArms(layout){
  if(layout==='straightEW')return ['W','E'];
  if(layout==='straightNS')return ['N','S'];
  if(layout==='tNorth')return ['W','E','N'];
  if(layout==='tSouth')return ['W','E','S'];
  if(layout==='tWest')return ['N','S','W'];
  if(layout==='tEast')return ['N','S','E'];
  if(layout==='bendNE')return ['N','E'];
  return ['N','S','E','W'];
}
function themePalette(theme){
  const map={
    park:{ground:0x63a950,sky:0x78c7ed,fog:0xaedff0},
    shops:{ground:0x75ad55,sky:0x8ecbf0,fog:0xb9def0},
    suburb:{ground:0x72ad58,sky:0x8ed0ef,fog:0xc1e2ef},
    hospital:{ground:0x70a95b,sky:0x91cae6,fog:0xc6e1eb},
    city:{ground:0x649852,sky:0x84bfe2,fog:0xb2d7e8},
    industrial:{ground:0x72815b,sky:0x9eb6c3,fog:0xc0ced4},
    seaside:{ground:0xd7c77d,sky:0x68c8f2,fog:0xb8e8f7},
    terminal:{ground:0x7e9f5d,sky:0x8cc4df,fog:0xbddce8},
    plaza:{ground:0x6fa65a,sky:0x8dc7e7,fog:0xbfe0ed}
  };
  return map[theme]||map.city;
}
function addGeneralDecor(){
  for(const p of [[-8,-8],[8,-8],[-8,8],[8,8]])tree(p[0],p[1],.72);
  for(const p of [[-6.3,-10.2,1],[6.3,-10.2,-1],[-6.3,10.2,1],[6.3,10.2,-1]])lamp(...p);
  bench(-8.4,-6.1,0);bench(8.4,6.1,Math.PI);planter(-8.4,6.4);planter(8.4,-6.4);roadSign(-6.4,6.2,'P',0x2f80ff);
}
function addThemeDecor(level){
  const t=level.theme;
  if(t==='park'){
    building(-13,-13,6.5,5.8,4.2,0xff8b55,true);building(13,13,6.4,5.8,4.8,0xf4d35e,false);fountain(-13,12);flowerPatch(13,-11,5,2);cafeSet(11,11);cafeSet(-11,-10);
    for(const p of [[-16,8],[-18,12],[16,-10],[18,-14]])tree(...p,.95);
  }else if(t==='shops'){
    building(-13,-13,7.4,6.2,5.4,0xf37d55,true,0x55433f);building(13,-13,7.2,6.2,5.7,0xffbd59,true);building(-13,13,7.2,6.2,5.1,0x7cc6a4,true);building(13,13,7.2,6.2,5.9,0x8e7cc3,true);
    cafeSet(-10,8);cafeSet(11,-8);busStop(9,6,Math.PI/2);flowerPatch(-13,8,4,1.2);
  }else if(t==='suburb'){
    building(-13,-13,6.2,6.4,3.9,0xf29e72,false,0x6f5546);building(13,-13,6.2,6.4,4.1,0x8ac4d8,false,0x4f6472);building(-13,13,6.2,6.4,4.0,0xd2b48c,false,0x725746);building(13,13,6.2,6.4,4.2,0xb0d58c,false,0x536b45);
    flowerPatch(-12,8,4,1.3);flowerPatch(12,-8,4,1.3);parkedCar(-11,8,0xff5c5c,Math.PI/2);parkedCar(11,-8,0x3d7bff,Math.PI/2);
  }else if(t==='hospital'){
    building(12,-12,10,8,7.2,0xf2f2ed,false,0x8b9ba4);building(-13,12,6.6,6.4,4.8,0xb7d3dc,false);box(2.4,.14,2.4,0xf1f1eb,12,.22,-7.2);box(.34,1.9,.34,0xf5f5f2,12,1.08,-7.2);box(1.6,.32,.32,0xe73542,12,1.5,-7.05);box(.32,1.6,.32,0xe73542,12,1.5,-7.05);
    planter(8,-8);planter(15,-8);busStop(-9,7,Math.PI/2);parkedCar(15,8,0xffffff,0);
  }else if(t==='industrial'){
    building(-13,-13,9,7,4.8,0x77828b,false,0x3c464d);building(13,13,9,7,4.6,0x9b7a58,false,0x4c443d);container(-12,9,0x3e78a8,0);container(-12,12,0xd2743a,0);container(12,-10,0x5c9567,Math.PI/2);
    for(const p of [[-8,7],[-7.3,7],[-6.6,7],[8,-7],[8.7,-7]])cone(...p);
  }else if(t==='seaside'){
    box(16,.16,56,0x4ab6dd,20,-.05,0,world,.3,.02);box(7,.18,56,0xe8d18a,8,-.03,0);for(const p of [[10,-14],[10,-7],[10,7],[10,14],[15,-17],[15,17]])palm(...p,.85);
    building(-13,-13,7,6,4.8,0xff9f68,true);building(-13,13,7,6,5.2,0x55b8a6,true);cafeSet(-10,8);bench(8,-8,Math.PI/2);bench(8,8,Math.PI/2);
  }else if(t==='terminal'){
    building(12,-12,11,7.5,5.5,0x6f8fa3,false,0x354753);building(-13,13,7,6,4.5,0xd3945d,true);busStop(8,7,Math.PI/2);busStop(8,-7,Math.PI/2);roadSign(11,8,'T',0xff8a00);
    for(const p of [[-9,-8],[-9,-7.3],[-9,-6.6],[12,7],[12.7,7]])cone(...p);parkedCar(-12,-9,0xffcc00,Math.PI/2);parkedCar(-12,-12,0x2f80ff,Math.PI/2);
  }else if(t==='plaza'){
    building(-13,-13,7,6.5,7.2,0xe1725d,true);building(13,-13,7,6.5,6.8,0xe3a14b,true);building(-13,13,7,6.5,6.3,0x739ecf,true);building(13,13,7,6.5,7.5,0x8d70c7,true);fountain(12,11);cafeSet(-10,10);cafeSet(10,-10);flowerPatch(-12,-8,4.5,1.4);flowerPatch(12,8,4.5,1.4);
  }else{
    building(-13,-13,7.6,7,7.5,0xc86e52,true);building(13,-13,7.4,7,6.5,0xd59a55,true);building(-13,13,7.4,7,6.8,0x7a8fa6,false);building(13,13,7.6,7,8.0,0x9a6f86,true);busStop(-8,7,Math.PI/2);cafeSet(10,-9);
  }
}
function buildWorld(level){
  world.clear();
  const theme=level?.theme||'park',layout=level?.layout||'cross',pal=themePalette(theme),arms=layoutArms(layout);
  scene.background=new THREE.Color(pal.sky);scene.fog=new THREE.Fog(pal.fog,44,82);hemi.groundColor.setHex(theme==='seaside'?0x7c7b55:0x48613d);
  box(56,.62,56,pal.ground,0,-.5,0);
  const roadWidth=layout==='crossWide'?11.2:9.8;
  box(roadWidth,.18,roadWidth,0x2c3338,0,0,0,world,.92);
  for(const arm of arms){roadArm(arm,roadWidth);armCrosswalk(arm)}
  for(const arm of ['N','S','E','W']){
    if(arms.includes(arm))continue;
    if(arm==='N')flowerPatch(0,-7.1,7.5,2.1);if(arm==='S')flowerPatch(0,7.1,7.5,2.1);if(arm==='W')flowerPatch(-7.1,0,2.1,7.5);if(arm==='E')flowerPatch(7.1,0,2.1,7.5);
  }
  addGeneralDecor();addThemeDecor(level);
}

const loader=new GLTFLoader();
const CAR_BASE='https://cdn.jsdelivr.net/gh/kidscancode/3d_car_sphere@cabc5c0019e68913012fc41d7b2ded6dcef3be31/assets/kenney_car_kit/';
const carFiles={
  sedan:'sedan.glb',hatch:'hatchbackSports.glb',suv:'suv.glb',luxury:'suvLuxury.glb',taxi:'taxi.glb',van:'van.glb',delivery:'delivery.glb',flatbed:'truckFlat.glb',truck:'truck.glb',tractor:'tractor.glb',ambulance:'ambulance.glb',police:'police.glb',fire:'firetruck.glb',sports:'sedanSports.glb',race:'race.glb',future:'raceFuture.glb'
};
const cache=new Map();
function getAsset(type){
  const f=carFiles[type]||carFiles.sedan;if(cache.has(f))return cache.get(f);
  const p=new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('asset timeout'))}},6500);loader.load(CAR_BASE+f,g=>{if(settled)return;settled=true;clearTimeout(timer);resolve(g.scene)},undefined,e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e)})});cache.set(f,p);return p;
}
function routeManeuver(route){
  const pts=route.points;if(!pts||pts.length<2)return 'straight';const a=pts[0],b=pts[1],c=pts[pts.length-2],d=pts[pts.length-1];let ix=b[0]-a[0],iz=b[1]-a[1],ox=d[0]-c[0],oz=d[1]-c[1];const il=Math.hypot(ix,iz)||1,ol=Math.hypot(ox,oz)||1;ix/=il;iz/=il;ox/=ol;oz/=ol;const dot=ix*ox+iz*oz;if(dot>.72)return 'straight';const crossY=iz*ox-ix*oz;return crossY>0?'left':'right';
}
function maneuverLabel(kind){return kind==='left'?'SOL':kind==='right'?'SAĞ':'DÜZ'}
function indicatorTexture(kind){
  const c=document.createElement('canvas');c.width=320;c.height=360;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(17,24,39,.92)';x.beginPath();x.roundRect(28,18,264,320,54);x.fill();x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=6;x.stroke();x.strokeStyle='#ffdf37';x.fillStyle='#ffdf37';x.lineWidth=34;x.lineCap='round';x.lineJoin='round';x.beginPath();
  if(kind==='left'){x.moveTo(180,235);x.lineTo(180,166);x.quadraticCurveTo(180,112,126,112);x.lineTo(86,112);x.stroke();x.beginPath();x.moveTo(82,112);x.lineTo(126,72);x.lineTo(126,152);x.closePath();x.fill()}else if(kind==='right'){x.moveTo(140,235);x.lineTo(140,166);x.quadraticCurveTo(140,112,194,112);x.lineTo(234,112);x.stroke();x.beginPath();x.moveTo(238,112);x.lineTo(194,72);x.lineTo(194,152);x.closePath();x.fill()}else{x.moveTo(160,238);x.lineTo(160,108);x.stroke();x.beginPath();x.moveTo(160,62);x.lineTo(112,120);x.lineTo(208,120);x.closePath();x.fill()}
  x.fillStyle='#fff';x.font='800 44px system-ui, sans-serif';x.textAlign='center';x.fillText(maneuverLabel(kind),160,308);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const indicatorTextures={};
function vehicleTopHeight(type){if(type==='fire')return 2.55;if(['truck','flatbed','delivery','ambulance','van','tractor'].includes(type))return 2.3;if(['suv','luxury'].includes(type))return 2.05;return 1.9}
function makeForwardChevron(height){const shape=new THREE.Shape();shape.moveTo(0,.7);shape.lineTo(-.42,.05);shape.lineTo(-.17,.05);shape.lineTo(-.17,-.48);shape.lineTo(.17,-.48);shape.lineTo(.17,.05);shape.lineTo(.42,.05);shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xffe03a,depthTest:false,transparent:true,opacity:.98,side:THREE.DoubleSide}));mesh.rotation.x=Math.PI/2;mesh.position.y=height-.28;mesh.scale.setScalar(.78);mesh.renderOrder=20;return mesh}
function addRouteIndicators(g,type,kind){if(!indicatorTextures[kind])indicatorTextures[kind]=indicatorTexture(kind);const h=vehicleTopHeight(type),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:indicatorTextures[kind],transparent:true,depthTest:false,depthWrite:false}));sprite.position.set(0,h+.55,0);sprite.scale.set(1.55,1.75,1);sprite.renderOrder=30;const chevron=makeForwardChevron(h);g.add(sprite,chevron);g.userData.arrow=sprite;g.userData.chevron=chevron;g.userData.maneuver=kind}
function setIndicatorVisible(mesh,visible){if(mesh?.userData?.arrow)mesh.userData.arrow.visible=visible;if(mesh?.userData?.chevron)mesh.userData.chevron.visible=visible}
function wheel(g,x,z,r=.31){const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.25,18),mat(0x111418,.86));t.rotation.z=Math.PI/2;t.position.set(x,.36,z);t.castShadow=true;g.add(t);const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.43,r*.43,.255,14),mat(0xaeb7bd,.3,.65));hub.rotation.z=Math.PI/2;hub.position.copy(t.position);g.add(hub)}
function fallbackVehicle(v,kind){
  const g=new THREE.Group(),big=['van','delivery','flatbed','ambulance','fire','truck','tractor'].includes(v.type);const L=v.type==='fire'?4.2:['truck','flatbed','delivery'].includes(v.type)?3.7:big?3.5:['suv','luxury'].includes(v.type)?3.15:2.95;const W=big?1.58:1.45,H=big?1.02:['suv','luxury'].includes(v.type)?.86:.7,c=v.color||0xff4b45;box(W,H,L,c,0,.58,0,g,.3,.18);box(W*.96,.13,L*.72,c,0,.92,-.08,g,.28,.18);box(W*.83,big?.64:.52,big?L*.46:L*.48,big?c:0x376d83,0,big?1.26:1.17,-.2,g,.2,.12);if(!big)for(const sx of [-1,1])box(.04,.36,L*.25,0x78b5cc,sx*W*.42,1.15,-.2,g,.18,.08);for(const x of [-W*.51,W*.51])for(const z of [-L*.31,L*.31])wheel(g,x,z,big?.34:.3);for(const x of [-W*.28,W*.28]){const h=box(.22,.2,.06,0xffe6a0,x,.62,L/2+.035,g);h.material=new THREE.MeshStandardMaterial({color:0xffe9ad,emissive:0xffc54a,emissiveIntensity:.8});const t=box(.22,.18,.06,0xff3447,x,.61,-L/2-.035,g);t.material=new THREE.MeshStandardMaterial({color:0xff3447,emissive:0x9b0713,emissiveIntensity:.65})}if(v.type==='taxi')box(.5,.16,.35,0xffd21f,0,1.47,0,g);if(['sports','race','future'].includes(v.type))box(W*.86,.12,L*.32,0x19232c,0,.99,-.25,g,.25,.18);if(['police','ambulance','fire'].includes(v.type)){const bar=new THREE.Group(),a=box(.42,.12,.22,0x2d78ff,-.25,1.58,0,bar),b=box(.42,.12,.22,0xff3f4e,.25,1.58,0,bar);a.material=new THREE.MeshStandardMaterial({color:0x327cff,emissive:0x135dff,emissiveIntensity:1.7});b.material=new THREE.MeshStandardMaterial({color:0xff3f4e,emissive:0xff1026,emissiveIntensity:1.7});g.add(bar);g.userData.flash=[a,b]}g.userData.emergency=['police','ambulance','fire'].includes(v.type);addRouteIndicators(g,v.type,kind);return g;
}
function enhanceVehicleMaterials(model,color,preserveIdentity){model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const arr=Array.isArray(o.material)?o.material:[o.material];const next=arr.map(m=>{if(!m)return m;const c=m.clone(),name=(c.name||'').toLowerCase(),looksLikePaint=/paint|body|car/.test(name);if(c.color){if(!preserveIdentity&&looksLikePaint)c.color.setHex(color);const hsl={h:0,s:0,l:0};c.color.getHSL(hsl);if(hsl.l>.08&&hsl.s>.06)c.color.setHSL(hsl.h,Math.min(1,hsl.s*1.28+.08),Math.min(.82,hsl.l*1.06+.015))}if('roughness' in c)c.roughness=Math.max(.2,Math.min(.72,c.roughness??.55));c.side=THREE.FrontSide;return c});o.material=Array.isArray(o.material)?next:next[0]})}
function normalizeGLB(src,v,kind){const outer=new THREE.Group(),model=src.clone(true);outer.add(model);enhanceVehicleMaterials(model,v.color,['police','ambulance','fire','taxi'].includes(v.type));let b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3());const target=v.type==='fire'?4.2:['truck','flatbed','delivery'].includes(v.type)?3.7:['ambulance','van','tractor'].includes(v.type)?3.5:['suv','luxury'].includes(v.type)?3.15:2.95,scale=target/(Math.max(s.x,s.z)||1);model.scale.setScalar(scale);model.rotation.y=Math.PI;b=new THREE.Box3().setFromObject(model);const center=b.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y-.13;outer.userData.emergency=['police','ambulance','fire'].includes(v.type);if(outer.userData.emergency){const bar=new THREE.Group(),y=v.type==='fire'?1.58:1.4,a=box(.36,.09,.18,0x2d78ff,-.22,y,0,bar),bb=box(.36,.09,.18,0xff3f4e,.22,y,0,bar);a.material=new THREE.MeshStandardMaterial({color:0x327cff,emissive:0x135dff,emissiveIntensity:2});bb.material=new THREE.MeshStandardMaterial({color:0xff3f4e,emissive:0xff1026,emissiveIntensity:2});outer.add(bar);outer.userData.flash=[a,bb]}addRouteIndicators(outer,v.type,kind);return outer}
async function upgradeVehicle(v,token){try{const src=await getAsset(v.type);if(token!==loadToken||!v.mesh||v.state==='done')return;const upgraded=normalizeGLB(src,v,v.maneuver);upgraded.position.copy(v.mesh.position);upgraded.rotation.copy(v.mesh.rotation);upgraded.visible=v.mesh.visible;setIndicatorVisible(upgraded,v.state==='waiting');vehicleLayer.remove(v.mesh);vehicleLayer.add(upgraded);v.mesh=upgraded}catch(e){console.warn('Real model unavailable, fallback kept:',v.type,e)}}
function buildCurve(route){const pts=route.points.map(p=>new THREE.Vector3(p[0],.13,p[1]));const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.28);curve.arcLengthDivisions=320;return curve}
function placeOnRoute(v){const u=THREE.MathUtils.clamp(v.distance/v.routeLength,0,.99999),p=v.curve.getPointAt(u),t=v.curve.getTangentAt(u);v.mesh.position.copy(p);v.mesh.rotation.y=Math.atan2(t.x,t.z)}
function vehicleDims(type){if(type==='fire')return[4.15,1.6];if(['truck','flatbed','delivery'].includes(type))return[3.7,1.58];if(['ambulance','van','tractor'].includes(type))return[3.5,1.56];if(['suv','luxury'].includes(type))return[3.15,1.5];return[2.95,1.43]}
function obb(v){const [L,W]=vehicleDims(v.type),a=v.mesh.rotation.y,s=Math.sin(a),c=Math.cos(a);return{x:v.mesh.position.x,z:v.mesh.position.z,fx:s,fz:c,rx:c,rz:-s,hl:L*.46+.04,hw:W*.45+.03}}
function axisRadius(b,ax,az){return b.hl*Math.abs(ax*b.fx+az*b.fz)+b.hw*Math.abs(ax*b.rx+az*b.rz)}
function overlaps(a,b){const A=obb(a),B=obb(b),dx=B.x-A.x,dz=B.z-A.z,axes=[[A.fx,A.fz],[A.rx,A.rz],[B.fx,B.fz],[B.rx,B.rz]];for(const [ax,az] of axes){const d=Math.abs(dx*ax+dz*az),r=axisRadius(A,ax,az)+axisRadius(B,ax,az);if(d>=r)return false}return true}
function findCollision(){for(let i=0;i<vehicles.length;i++)for(let j=i+1;j<vehicles.length;j++){const a=vehicles[i],b=vehicles[j];if(a.state==='done'||b.state==='done')continue;if(a.state!=='moving'&&b.state!=='moving')continue;if(overlaps(a,b))return[a,b]}return null}

let audioCtx=null,masterGain=null,ambient=null;
function ensureAudio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=audioOn?.52:0;masterGain.connect(audioCtx.destination)}if(audioCtx.state==='suspended')audioCtx.resume();if(!ambient&&audioOn)startAmbient()}
function startAmbient(){if(!audioCtx||ambient)return;const seconds=2,buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*seconds,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.18;const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buffer;src.loop=true;filter.type='lowpass';filter.frequency.value=260;gain.gain.value=.032;src.connect(filter);filter.connect(gain);gain.connect(masterGain);src.start();ambient={src,gain}}
function beep(freq,dur=.12,vol=.08,type='sine',when=0){if(!audioOn)return;ensureAudio();const t=audioCtx.currentTime+when,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+dur+.03)}
function playEngineStart(type){if(!audioOn)return;ensureAudio();const heavy=['truck','flatbed','delivery','van','fire','ambulance','tractor'].includes(type),sporty=['sports','race','future'].includes(type),base=heavy?58:sporty?122:82,t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();o.type=heavy?'sawtooth':'triangle';o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*(sporty?2.35:1.65),t+.38);filter.type='lowpass';filter.frequency.value=heavy?520:950;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(heavy?.13:.1,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.48);o.connect(filter);filter.connect(g);g.connect(masterGain);o.start();o.stop(t+.52)}
function startDriveSound(v){if(!audioOn||v.sound)return;ensureAudio();const heavy=['truck','flatbed','delivery','van','fire','ambulance','tractor'].includes(v.type),sporty=['sports','race','future'].includes(v.type),o=audioCtx.createOscillator(),g=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();o.type='sawtooth';o.frequency.value=heavy?54:sporty?116:76;filter.type='lowpass';filter.frequency.value=heavy?380:680;g.gain.value=heavy?.035:.024;o.connect(filter);filter.connect(g);g.connect(masterGain);o.start();v.sound={engine:o,engineGain:g};if(['police','ambulance','fire'].includes(v.type)){const sir=audioCtx.createOscillator(),sg=audioCtx.createGain(),lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();sir.type='sine';sir.frequency.value=v.type==='police'?720:v.type==='ambulance'?640:520;sg.gain.value=v.type==='fire'?.06:.05;lfo.type='sine';lfo.frequency.value=v.type==='police'?1.45:v.type==='ambulance'?1.05:.82;lg.gain.value=v.type==='fire'?150:210;lfo.connect(lg);lg.connect(sir.frequency);sir.connect(sg);sg.connect(masterGain);sir.start();lfo.start();v.sound.siren=sir;v.sound.sirenGain=sg;v.sound.lfo=lfo}}
function stopVehicleSound(v){if(!v.sound||!audioCtx){v.sound=null;return}const t=audioCtx.currentTime;for(const key of ['engineGain','sirenGain'])if(v.sound[key]){v.sound[key].gain.cancelScheduledValues(t);v.sound[key].gain.setValueAtTime(Math.max(.0001,v.sound[key].gain.value),t);v.sound[key].gain.exponentialRampToValueAtTime(.0001,t+.12)}for(const key of ['engine','siren','lfo'])if(v.sound[key])try{v.sound[key].stop(t+.14)}catch{}v.sound=null}
function stopAllSounds(){for(const v of vehicles)stopVehicleSound(v)}
function crashSound(){if(!audioOn)return;ensureAudio();const t=audioCtx.currentTime,duration=.55,buffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*duration),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const p=i/data.length;data[i]=(Math.random()*2-1)*Math.pow(1-p,2.7)}const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buffer;filter.type='bandpass';filter.frequency.value=520;filter.Q.value=.6;gain.gain.setValueAtTime(.24,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.5);src.connect(filter);filter.connect(gain);gain.connect(masterGain);src.start(t);const thud=audioCtx.createOscillator(),tg=audioCtx.createGain();thud.type='sine';thud.frequency.setValueAtTime(92,t);thud.frequency.exponentialRampToValueAtTime(38,t+.28);tg.gain.setValueAtTime(.22,t);tg.gain.exponentialRampToValueAtTime(.0001,t+.34);thud.connect(tg);tg.connect(masterGain);thud.start(t);thud.stop(t+.36);const metal=audioCtx.createOscillator(),mg=audioCtx.createGain();metal.type='square';metal.frequency.setValueAtTime(360,t+.015);metal.frequency.exponentialRampToValueAtTime(150,t+.4);mg.gain.setValueAtTime(.07,t+.015);mg.gain.exponentialRampToValueAtTime(.0001,t+.45);metal.connect(mg);mg.connect(masterGain);metal.start(t+.015);metal.stop(t+.47)}
function winSound(){if(!audioOn)return;beep(523,.11,.08,'sine');beep(659,.11,.08,'sine',.12);beep(784,.18,.09,'sine',.24)}
function spawnCrashEffect(a,b){const center=new THREE.Vector3().addVectors(a.mesh.position,b.mesh.position).multiplyScalar(.5);center.y=.75;const root=new THREE.Group();root.position.copy(center);effectsLayer.add(root);const flash=new THREE.PointLight(0xffc34a,5,9,2);flash.position.set(0,.8,0);root.add(flash);const ringMat=new THREE.MeshBasicMaterial({color:0xffc234,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(.25,.42,28),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.08;root.add(ring);const particles=[];for(let i=0;i<18;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.24),new THREE.MeshBasicMaterial({color:i%3===0?0xffef85:i%3===1?0xffa428:0xffffff,transparent:true}));m.position.set((Math.random()-.5)*.35,Math.random()*.35,(Math.random()-.5)*.35);m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);root.add(m);particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*6,2.3+Math.random()*4,(Math.random()-.5)*6),spin:new THREE.Vector3((Math.random()-.5)*9,(Math.random()-.5)*9,(Math.random()-.5)*9)})}const smoke=[];for(let i=0;i<5;i++){const sm=new THREE.Mesh(new THREE.SphereGeometry(.22+.08*Math.random(),8,6),new THREE.MeshBasicMaterial({color:0x4e5559,transparent:true,opacity:.45,depthWrite:false}));sm.position.set((Math.random()-.5)*.4,.25+Math.random()*.25,(Math.random()-.5)*.4);root.add(sm);smoke.push(sm)}crashEffects.push({root,flash,ring,particles,smoke,age:0,duration:1.25})}
function updateCrashEffects(dt){for(let i=crashEffects.length-1;i>=0;i--){const e=crashEffects[i];e.age+=dt;const q=e.age/e.duration;e.flash.intensity=Math.max(0,5*(1-q*3));e.ring.scale.setScalar(1+q*4);e.ring.material.opacity=Math.max(0,.9*(1-q));for(const p of e.particles){p.vel.y-=7.5*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=p.spin.x*dt;p.mesh.rotation.y+=p.spin.y*dt;p.mesh.rotation.z+=p.spin.z*dt;p.mesh.material.opacity=Math.max(0,1-q)}for(let s=0;s<e.smoke.length;s++){const m=e.smoke[s];m.position.y+=dt*(.65+s*.08);m.scale.setScalar(1+q*2.3);m.material.opacity=Math.max(0,.45*(1-q))}if(e.age>=e.duration){effectsLayer.remove(e.root);e.root.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material)o.material.dispose?.()});crashEffects.splice(i,1)}}}
function loadLevel(i){stopAllSounds();const token=++loadToken;levelIndex=i;failed=false;running=false;vehicleLayer.clear();vehicles=[];buildWorld(levels[i]);$('#levelLabel').textContent=i+1;$('#message').textContent=levels[i].name+' • Okları okuyup doğru sırayı seç';for(const data of levels[i].vehicles){const maneuver=routeManeuver(data.route),mesh=fallbackVehicle(data,maneuver),curve=buildCurve(data.route),routeLength=curve.getLength(),distance=(data.start||0)*routeLength,v={...data,mesh,maneuver,curve,routeLength,distance,state:'waiting',sound:null,prev:null};placeOnRoute(v);vehicleLayer.add(mesh);vehicles.push(v);upgradeVehicle(v,token)}updateRemaining();running=true}
function updateRemaining(){$('#remaining').textContent=vehicles.filter(v=>v.state!=='done').length}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener('pointerup',e=>{if(!running||failed)return;ensureAudio();const r=canvas.getBoundingClientRect();pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);const h=ray.intersectObjects(vehicleLayer.children,true);if(!h.length)return;let o=h[0].object;while(o.parent!==vehicleLayer&&o.parent)o=o.parent;const v=vehicles.find(q=>q.mesh===o);if(v?.state==='waiting'){v.state='moving';setIndicatorVisible(v.mesh,false);playEngineStart(v.type);startDriveSound(v);$('#message').textContent=v.mesh.userData.emergency?'Acil araç sabit rotasında ilerliyor':`${maneuverLabel(v.maneuver)} rotası başladı`}})
function failCollision(pair){const[a,b]=pair;for(const v of vehicles)if(v.prev&&v.state==='moving'){v.mesh.position.copy(v.prev.p);v.mesh.rotation.y=v.prev.r}spawnCrashEffect(a,b);failed=true;running=false;stopAllSounds();crashSound();$('#resultIcon').textContent='!';$('#resultIcon').style.background='#ff5a5f';$('#resultTitle').textContent='Çarpışma!';$('#resultText').textContent='Araçların rotaları çakıştı. Çıkış sırasını değiştir.';$('#nextBtn').style.display='none';$('#result').classList.add('visible')}
function win(){running=false;stopAllSounds();winSound();unlocked=Math.max(unlocked,Math.min(levels.length,levelIndex+2));localStorage.tp3dUnlocked=unlocked;$('#resultIcon').textContent='✓';$('#resultIcon').style.background='#54d98c';$('#resultTitle').textContent='Yol Temiz!';$('#resultText').textContent='Tüm araçları güvenle geçirdin.';$('#nextBtn').style.display=levelIndex<levels.length-1?'block':'none';$('#result').classList.add('visible')}
function tick(dt,now){if(!running||failed)return;for(const v of vehicles){if(v.mesh.userData.flash){const on=Math.floor(now/220)%2===0;v.mesh.userData.flash[0].visible=on;v.mesh.userData.flash[1].visible=!on}v.prev=null;if(v.state!=='moving')continue;v.prev={p:v.mesh.position.clone(),r:v.mesh.rotation.y};v.distance+=v.speed*dt;if(v.distance>=v.routeLength){v.distance=v.routeLength;v.state='done';stopVehicleSound(v);v.mesh.visible=false;updateRemaining();continue}placeOnRoute(v)}const hit=findCollision();if(hit){failCollision(hit);return}if(vehicles.length&&vehicles.every(v=>v.state==='done'))win()}
let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.035,(now-last)/1000);tick(dt,now);updateCrashEffects(dt);last=now;renderer.render(scene,camera)}
requestAnimationFrame(animate);
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;const k=camera.aspect<.72?1.34:camera.aspect<1?1.15:1;camera.position.set(18*k,23*k,21*k);camera.lookAt(0,0,0);camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();buildWorld({theme:'park',layout:'straightEW'});
const menu=$('#menu'),select=$('#levelSelect'),result=$('#result');
$('#playBtn').onclick=()=>{ensureAudio();menu.classList.remove('visible');loadLevel(Math.min(unlocked-1,levels.length-1))};
$('#homeBtn').onclick=()=>{stopAllSounds();++loadToken;running=false;result.classList.remove('visible');select.classList.remove('visible');menu.classList.add('visible')};
$('#retryBtn').onclick=()=>{result.classList.remove('visible');loadLevel(levelIndex)};
$('#nextBtn').onclick=()=>{result.classList.remove('visible');loadLevel(Math.min(levelIndex+1,levels.length-1))};
$('#soundBtn').onclick=e=>{audioOn=!audioOn;e.currentTarget.textContent=audioOn?'🔊':'🔇';if(audioOn){ensureAudio();if(masterGain)masterGain.gain.setTargetAtTime(.52,audioCtx.currentTime,.03)}else if(masterGain)masterGain.gain.setTargetAtTime(0,audioCtx.currentTime,.03)};
function grid(){const g=$('#levelGrid');g.innerHTML='';levels.forEach((l,i)=>{const b=document.createElement('button');b.textContent=i+1;b.className=i>=unlocked?'locked':'';b.onclick=()=>{if(i>=unlocked)return;ensureAudio();select.classList.remove('visible');menu.classList.remove('visible');loadLevel(i)};g.appendChild(b)})}
$('#levelsBtn').onclick=()=>{grid();menu.classList.remove('visible');select.classList.add('visible')};
$('#closeLevels').onclick=()=>{select.classList.remove('visible');menu.classList.add('visible')};
Object.keys(carFiles).forEach(t=>getAsset(t).catch(()=>{}));
