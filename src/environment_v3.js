import * as THREE from 'three';

const ENV=[
  {layout:'boulevardEW',theme:'park',time:'day',weather:'clear',camera:[19,24,19]},
  {layout:'tNorth',theme:'shops',time:'day',weather:'sunny',camera:[18,23,21]},
  {layout:'tSouth',theme:'suburb',time:'sunset',weather:'clear',camera:[-20,23,18]},
  {layout:'bendNE',theme:'hospital',time:'day',weather:'rain',camera:[20,24,18]},
  {layout:'cityCross',theme:'city',time:'night',weather:'clear',camera:[18,25,21]},
  {layout:'tWestIndustrial',theme:'industrial',time:'day',weather:'cloudy',camera:[-20,23,19]},
  {layout:'seasideNS',theme:'seaside',time:'sunset',weather:'clear',camera:[19,23,-20]},
  {layout:'tEastTerminal',theme:'terminal',time:'evening',weather:'rain',camera:[20,23,18]},
  {layout:'crossWideMedian',theme:'hospital',time:'night',weather:'rain',camera:[18,26,22]},
  {layout:'plazaCross',theme:'plaza',time:'morning',weather:'sunny',camera:[-19,24,20]}
];

export function createEnvironment({scene,world,weatherLayer,camera,renderer,hemi,sun}){
  let state={rain:null,signals:[],night:false};
  const cache=new Map();
  const mat=(c,r=.72,m=.03)=>{const k=`${c}-${r}-${m}`;if(!cache.has(k))cache.set(k,new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m}));return cache.get(k)};
  const pbr=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:o.rough??.7,metalness:o.metal??.02,emissive:o.emissive??0,emissiveIntensity:o.ei??0,transparent:o.transparent??false,opacity:o.opacity??1});
  const box=(w,h,d,c,x,y,z,g=world,r=.72,m=.03)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,r,m));q.position.set(x,y,z);q.castShadow=q.receiveShadow=true;g.add(q);return q};
  const cyl=(rad,h,c,x,y,z,g=world,seg=14)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,h,seg),mat(c));q.position.set(x,y,z);q.castShadow=q.receiveShadow=true;g.add(q);return q};

  // Gece yalnızca gökyüzünü karartır; araçlar ve yol okunabilir kalır.
  const nightAmbient=new THREE.AmbientLight(0x86a9d2,0);
  const moonFill=new THREE.DirectionalLight(0xaacbff,0);moonFill.position.set(10,18,8);
  scene.add(nightAmbient,moonFill);

  function armsFor(layout){
    if(layout==='boulevardEW')return['W','E'];
    if(layout==='seasideNS')return['N','S'];
    if(layout==='tNorth')return['W','E','N'];
    if(layout==='tSouth')return['W','E','S'];
    if(layout==='tWestIndustrial')return['N','S','W'];
    if(layout==='tEastTerminal')return['N','S','E'];
    if(layout==='bendNE')return['N','E'];
    return['N','S','E','W'];
  }
  function applyAtmosphere(env){
    const night=env.time==='night',sunset=env.time==='sunset'||env.time==='evening',rain=env.weather==='rain';state.night=night;
    const sky=night?(rain?0x152336:0x18304a):env.time==='sunset'?0xef9b78:env.time==='evening'?0x7189aa:rain||env.weather==='cloudy'?0x91a8b6:0x80c8ed;
    scene.background=new THREE.Color(sky);
    scene.fog=new THREE.Fog(night?0x31475d:rain?0xa9b8c1:env.time==='sunset'?0xf0b69e:0xc2e2ed,rain?38:46,rain?76:92);
    hemi.intensity=night?1.05:sunset?1.25:1.68;
    hemi.color.setHex(night?0xa8c4e6:0xf8fdff);hemi.groundColor.setHex(night?0x344052:0x43533b);
    sun.intensity=night?.62:sunset?1.55:2.45;sun.color.setHex(night?0x9bbcff:sunset?0xffa16d:0xffdfae);sun.position.set(sunset?18:-14,night?17:24,sunset?-9:11);
    nightAmbient.intensity=night?.48:0;moonFill.intensity=night?.82:0;
    renderer.toneMappingExposure=night?1.04:rain?.94:1.06;
  }

  function road(w,d,x,z,wet=false,c=0x2b3136){const q=new THREE.Mesh(new THREE.BoxGeometry(w,.18,d),pbr(c,{rough:wet?.34:.88,metal:wet?.12:.02}));q.position.set(x,0,z);q.receiveShadow=true;world.add(q)}
  const sidewalk=(w,d,x,z,c=0xbcb6aa)=>box(w,.22,d,c,x,.12,z,world,.86);
  function arm(dir,width,wet,seaside=false){
    const side=seaside?0xd7c9a1:0xbcb6aa;
    if(dir==='W'||dir==='E'){
      const s=dir==='W'?-1:1,x=s*16.5;road(23,width,x,0,wet);sidewalk(23,1.2,x,5.5,side);sidewalk(23,1.2,x,-5.5,side);
      for(let px=s*7;Math.abs(px)<27;px+=s*4.2){box(2.05,.025,.1,0xf5ebd1,px,.145,3.25);box(2.05,.025,.1,0xf5ebd1,px,.145,-3.25)}
    }else{
      const s=dir==='N'?-1:1,z=s*16.5;road(width,23,0,z,wet);sidewalk(1.2,23,5.5,z,side);sidewalk(1.2,23,-5.5,z,side);
      for(let pz=s*7;Math.abs(pz)<27;pz+=s*4.2){box(.1,.025,2.05,0xf5ebd1,3.25,.145,pz);box(.1,.025,2.05,0xf5ebd1,-3.25,.145,pz)}
    }
  }
  function crosswalk(dir,off=5.05){for(let i=-3;i<=3;i++){if(dir==='W'||dir==='E'){const x=(dir==='W'?-1:1)*off;box(.42,.027,1.55,0xf7f3e8,x,.158,i*.72)}else{const z=(dir==='N'?-1:1)*off;box(1.55,.027,.42,0xf7f3e8,i*.72,.158,z)}}}
  function roads(layout,wet){
    const arms=armsFor(layout),wide=layout==='crossWideMedian'?11.4:layout==='plazaCross'?10.5:9.8;road(wide,wide,0,0,wet,layout==='plazaCross'?0x3b3d40:wet?0x252d33:0x2b3136);
    for(const a of arms){arm(a,wide,wet,layout==='seasideNS');crosswalk(a,wide>10.6?5.75:5.05)}
    if(layout==='boulevardEW')for(let x=-22;x<=22;x+=6)box(2.2,.06,.34,0xffd34d,x,.15,0);
    if(layout==='seasideNS'){for(let z=-22;z<=22;z+=5)box(.11,.026,2.2,0xffd34d,0,.145,z);box(14,.12,56,0xe1cf89,17,-.02,0);box(8,.1,56,0x46bce4,26,-.04,0)}
    if(layout==='crossWideMedian')for(const p of[[-7,0],[7,0],[0,-7],[0,7]])cyl(.62,.16,0xbcb6aa,p[0],.16,p[1],world,20);
    if(layout==='plazaCross'){box(8.4,.025,8.4,0x5e5a55,0,.12,0,world,.7,.02);for(const t of[-3,-1,1,3]){box(.05,.03,8.2,0x77716b,t,.15,0);box(8.2,.03,.05,0x77716b,0,.15,t)}}
    return arms;
  }

  function tree(x,z,s=1){cyl(.16*s,1.65*s,0x70472d,x,.825*s,z);for(const [dx,dy,dz,sc,c]of[[0,1.9,0,1,0x2c8b47],[.45,1.72,.12,.72,0x49b863],[-.4,1.68,-.12,.68,0x23763d]]){const q=new THREE.Mesh(new THREE.IcosahedronGeometry(.9*s*sc,1),mat(c,.78,.01));q.position.set(x+dx*s,dy*s,z+dz*s);q.castShadow=true;world.add(q)}}
  function palm(x,z,s=1){cyl(.18*s,2.9*s,0x9a7145,x,1.45*s,z,world,10);for(let i=0;i<7;i++){const q=box(1.35*s,.08,.28*s,0x2a9b55,x,3*s,z,world,.7);q.rotation.y=i*Math.PI/3.5;q.position.x+=Math.cos(i*Math.PI/3.5)*.65*s;q.position.z+=Math.sin(i*Math.PI/3.5)*.65*s}}
  function bench(x,z,rot=0){const g=new THREE.Group();box(1.65,.12,.42,0x8b512f,0,.58,0,g);box(1.65,.12,.12,0x8b512f,0,1.02,-.18,g);for(const dx of[-.6,.6]){box(.1,.58,.1,0x2e3437,dx,.29,0,g);box(.1,.54,.1,0x2e3437,dx,.78,-.2,g)}g.position.set(x,0,z);g.rotation.y=rot;world.add(g)}
  function planter(x,z){box(1.5,.42,.76,0xe9e6dc,x,.21,z,world,.84);for(const dx of[-.45,0,.45]){cyl(.045,.33,0x2f7e3f,x+dx,.5,z,world,7);const f=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,1),mat(dx===0?0xff5c8a:0xffc83d,.6));f.position.set(x+dx,.73,z);world.add(f)}}
  function flowers(x,z,w=3,d=1.5){box(w,.07,d,0x316c3d,x,.035,z);const cc=[0xff5f7f,0xffd341,0x8f6bff,0xffffff];for(let i=0;i<12;i++){const px=x+(Math.random()-.5)*(w-.3),pz=z+(Math.random()-.5)*(d-.3);cyl(.02,.22,0x39834c,px,.13,pz,world,6);const f=new THREE.Mesh(new THREE.SphereGeometry(.07,6,4),mat(cc[i%4],.6));f.position.set(px,.28,pz);world.add(f)}}
  function cafe(x,z){cyl(.08,1,0xdad5ca,x,.5,z,world,12);cyl(.7,.08,0xf7f1e5,x,1.02,z,world,18);const u=new THREE.Mesh(new THREE.ConeGeometry(1.3,.62,18),mat(0xff665d,.5));u.position.set(x,1.95,z);u.castShadow=true;world.add(u)}
  function fountain(x,z){cyl(2,.38,0xd8d2c6,x,.2,z,world,28);cyl(1.5,.24,0x57b9d6,x,.43,z,world,28);cyl(.28,1.2,0xc5c0b7,x,1.05,z,world,16)}
  function busStop(x,z,rot=0){const g=new THREE.Group();box(2.7,.12,1.15,0x59636c,0,.08,0,g);for(const sx of[-1.15,1.15])box(.08,2.1,.08,0x2f363d,sx,1.05,0,g);box(2.45,.08,1,0x35424b,0,2.05,0,g);const gl=box(2.25,1.55,.05,0x6bb7d0,0,1.1,-.48,g,.18,.12);gl.material=pbr(0x6bb7d0,{rough:.16,metal:.08,transparent:true,opacity:.42});box(1.5,.12,.42,0xffb837,0,.55,.1,g);g.position.set(x,0,z);g.rotation.y=rot;world.add(g)}
  function parkedCar(x,z,c=0x3b82f6,rot=0){const g=new THREE.Group();box(1.35,.55,2.65,c,0,.45,0,g,.3,.18);box(1.2,.45,1.25,0x4f8197,0,.88,-.1,g,.22,.1);g.position.set(x,0,z);g.rotation.y=rot;world.add(g)}
  function shipping(x,z,c,rot=0){const g=new THREE.Group();box(4.2,1.7,2.15,c,0,.85,0,g,.65,.08);for(let xx=-1.7;xx<=1.7;xx+=.7)box(.06,1.48,2.17,0x28343d,xx,.86,0,g,.8,.1);g.position.set(x,0,z);g.rotation.y=rot;world.add(g)}
  function cone(x,z){const q=new THREE.Mesh(new THREE.ConeGeometry(.23,.7,12),mat(0xff7a1f,.55));q.position.set(x,.35,z);world.add(q)}
  function targetFor(x,z,arms){const c=[];if(arms.includes('N')||arms.includes('S'))c.push([0,z]);if(arms.includes('W')||arms.includes('E'))c.push([x,0]);if(!c.length)return[0,0];c.sort((a,b)=>Math.hypot(a[0]-x,a[1]-z)-Math.hypot(b[0]-x,b[1]-z));return c[0]}
  function building(x,z,w,d,h,c,{shop=false,target=[0,0],night=false,label=''}={}){
    const g=new THREE.Group();box(w,h,d,c,0,h/2+.22,0,g,.65,.05);box(w+.2,.2,d+.2,0x3d444a,0,h+.3,0,g,.72,.04);box(w+.45,.22,d+.45,0xbdb5aa,0,.1,0,g,.85,.01);
    const wm=pbr(night?0xffdda0:0x68b7d0,{rough:.18,metal:.08,emissive:night?0xffb54a:0,ei:night?1.15:0});
    for(let y=1.35;y<h-.3;y+=1.2){for(let xx=-w/2+.7;xx<w/2-.25;xx+=1.15){const q=new THREE.Mesh(new THREE.BoxGeometry(.58,.52,.04),wm);q.position.set(xx,y,d/2+.025);g.add(q)}for(let zz=-d/2+.75;zz<d/2-.25;zz+=1.2){const q=new THREE.Mesh(new THREE.BoxGeometry(.04,.52,.58),wm);q.position.set(w/2+.025,y,zz);g.add(q)}}
    if(shop){box(w*.78,.82,.26,0x294842,0,.86,d/2+.14,g,.35,.08);box(w*.72,.16,.45,0xffb82e,0,1.35,d/2+.2,g,.42,.03)}else{box(1.2,1.8,.12,0x39444b,0,.92,d/2+.08,g,.55,.08);box(2.1,.16,.6,0x3f474d,0,1.9,d/2+.18,g,.6,.04)}
    if(label){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.font='800 58px system-ui';cx.textAlign='center';cx.fillText(label,256,82);const tx=new THREE.CanvasTexture(cv),p=new THREE.Mesh(new THREE.PlaneGeometry(w*.6,w*.15),new THREE.MeshBasicMaterial({map:tx,transparent:true}));p.position.set(0,1.65,d/2+.32);g.add(p)}
    const dx=target[0]-x,dz=target[1]-z;g.rotation.y=Math.atan2(dx,dz);g.position.set(x,0,z);world.add(g);
  }
  function streetLamp(x,z,night=false,rot=0){const g=new THREE.Group();cyl(.07,3,0x242a2e,0,1.5,0,g,12);box(.72,.07,.07,0x242a2e,.32,2.94,0,g);const bulb=box(.25,.13,.2,0xffdc82,.67,2.9,0,g,.35,.02);bulb.material=pbr(0xffe2a2,{rough:.3,emissive:0xffb52a,ei:night?3:.5});if(night){const l=new THREE.PointLight(0xffc46b,2.2,11,2);l.position.set(.67,2.75,0);g.add(l)}g.position.set(x,0,z);g.rotation.y=rot;world.add(g)}
  function trafficLight(x,z,rot=0){const g=new THREE.Group();cyl(.1,3.25,0x24292d,0,1.62,0,g,12);box(.75,1.95,.54,0x11161a,0,3.2,0,g,.45,.08);const ls=[];for(const[y,c]of[[3.78,0xff3131],[3.2,0xffc62e],[2.62,0x37e36d]]){const s=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),pbr(c,{rough:.3,emissive:c,ei:.35}));s.position.set(0,y,.29);g.add(s);ls.push(s)}g.position.set(x,0,z);g.rotation.y=rot;world.add(g);state.signals.push(ls)}
  function rain(){const count=850,pos=new Float32Array(count*3),speed=new Float32Array(count);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*58;pos[i*3+1]=4+Math.random()*28;pos[i*3+2]=(Math.random()-.5)*58;speed[i]=15+Math.random()*13}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd8efff,size:.075,transparent:true,opacity:.76,depthWrite:false}));weatherLayer.add(pts);return{pts,speed,count}}

  function decor(env,arms){const night=env.time==='night',t=(x,z)=>targetFor(x,z,arms);
    if(env.theme==='park'){building(-14,-12,6.5,5.8,4.4,0xff8b55,{shop:true,target:t(-14,-12),night});building(14,12,6.5,5.8,5,0xf2d45e,{target:t(14,12),night});fountain(-12,11);flowers(12,-10,5,2);cafe(11,10)}
    else if(env.theme==='shops'){building(-14,-13,7.4,6.2,5.8,0xf37d55,{shop:true,target:t(-14,-13),night,label:'KAFE'});building(14,-13,7.2,6.2,6.1,0xffbd59,{shop:true,target:t(14,-13),night,label:'MARKET'});building(-14,13,7.2,6.2,5.4,0x7cc6a4,{shop:true,target:t(-14,13),night});building(14,13,7.2,6.2,6.3,0x8e7cc3,{shop:true,target:t(14,13),night});cafe(-10,8);busStop(9,6,Math.PI/2)}
    else if(env.theme==='suburb'){for(const[x,z,c]of[[-14,-13,0xf29e72],[14,-13,0x8ac4d8],[-14,13,0xd2b48c],[14,13,0xb0d58c]])building(x,z,6.2,6.4,4.3,c,{target:t(x,z),night});flowers(-12,8,4,1.3);flowers(12,-8,4,1.3);parkedCar(-11,8,0xff5c5c,Math.PI/2);parkedCar(11,-8,0x3d7bff,Math.PI/2)}
    else if(env.theme==='hospital'){building(13,-13,10,8,7.4,0xf1f2ef,{target:t(13,-13),night,label:'HOSPITAL'});building(-14,13,7,6.6,5.2,0xb7d3dc,{target:t(-14,13),night});planter(8,-8);planter(15,-8);busStop(-9,7,Math.PI/2);parkedCar(15,8,0xffffff)}
    else if(env.theme==='industrial'){building(-14,-13,9,7,5,0x77828b,{target:t(-14,-13),night,label:'DEPOT'});building(14,13,9,7,4.8,0x9b7a58,{target:t(14,13),night});shipping(-12,9,0x3e78a8);shipping(-12,12,0xd2743a);shipping(12,-10,0x5c9567,Math.PI/2);for(const p of[[-8,7],[-7.3,7],[-6.6,7],[8,-7],[8.7,-7]])cone(...p)}
    else if(env.theme==='seaside'){building(-14,-13,7,6,5,0xff9f68,{shop:true,target:t(-14,-13),night,label:'CAFE'});building(-14,13,7,6,5.4,0x55b8a6,{shop:true,target:t(-14,13),night});cafe(-10,8);for(const p of[[10,-14],[10,-7],[10,7],[10,14],[18,-17],[18,17]])palm(...p,.85);bench(8,-8,Math.PI/2);bench(8,8,Math.PI/2)}
    else if(env.theme==='terminal'){building(13,-13,11,7.5,5.8,0x6f8fa3,{target:t(13,-13),night,label:'TERMINAL'});building(-14,13,7,6,4.8,0xd3945d,{shop:true,target:t(-14,13),night});busStop(8,7,Math.PI/2);busStop(8,-7,Math.PI/2);parkedCar(-12,-9,0xffcc00,Math.PI/2)}
    else if(env.theme==='plaza'){building(-14,-13,7,6.5,7.4,0xe1725d,{shop:true,target:t(-14,-13),night});building(14,-13,7,6.5,7,0xe3a14b,{shop:true,target:t(14,-13),night});building(-14,13,7,6.5,6.6,0x739ecf,{target:t(-14,13),night});building(14,13,7,6.5,7.7,0x8d70c7,{shop:true,target:t(14,13),night});fountain(12,11);cafe(-10,10)}
    else{building(-14,-13,7.6,7,7.5,0xc86e52,{shop:true,target:t(-14,-13),night});building(14,-13,7.4,7,6.5,0xd59a55,{shop:true,target:t(14,-13),night});building(-14,13,7.4,7,6.8,0x7a8fa6,{target:t(-14,13),night});building(14,13,7.6,7,8,0x9a6f86,{shop:true,target:t(14,13),night})}
    for(const p of[[-8,-8],[8,-8],[-8,8],[8,8]])tree(...p,.72);for(const p of[[-6.4,-10.2,0],[6.4,-10.2,Math.PI],[-6.4,10.2,0],[6.4,10.2,Math.PI]])streetLamp(...p,night);bench(-8.5,-6.1);bench(8.5,6.1,Math.PI);planter(-8.4,6.4);planter(8.4,-6.4);
  }

  function build(level,idx){
    world.clear();weatherLayer.clear();state={rain:null,signals:[],night:false};const base=ENV[idx]||ENV[0],env={...base,theme:level.theme||base.theme};applyAtmosphere(env);
    box(62,.62,62,env.theme==='seaside'?0xcdbf7b:env.theme==='industrial'?0x6f7f59:0x67a854,0,-.5,0);const arms=roads(env.layout,env.weather==='rain');decor(env,arms);
    if(arms.length>=3){trafficLight(-5.7,-5.7,Math.PI*.25);trafficLight(5.7,-5.7,-Math.PI*.25);trafficLight(5.7,5.7,-Math.PI*.75);trafficLight(-5.7,5.7,Math.PI*.75)}
    if(env.weather==='rain')state.rain=rain();camera.position.set(...env.camera);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  }
  function update(dt,now){
    if(state.rain){const a=state.rain.pts.geometry.attributes.position.array;for(let i=0;i<state.rain.count;i++){a[i*3+1]-=state.rain.speed[i]*dt;a[i*3]+=.9*dt;if(a[i*3+1]<.3){a[i*3+1]=25+Math.random()*8;a[i*3]=(Math.random()-.5)*58;a[i*3+2]=(Math.random()-.5)*58}}state.rain.pts.geometry.attributes.position.needsUpdate=true}
    const phase=Math.floor(now/3200)%2;for(const ls of state.signals){ls[0].material.emissiveIntensity=phase?2.5:.22;ls[1].material.emissiveIntensity=.16;ls[2].material.emissiveIntensity=phase?.22:2.5}
  }
  return{build,update};
}
