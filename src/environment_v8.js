import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from './environment_base.js';

function pointOnRoute(route,fraction=0){
  const pts=route?.points||[];
  if(!pts.length)return null;
  if(pts.length===1)return new THREE.Vector3(pts[0][0],0,pts[0][1]);
  const lens=[];let total=0;
  for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lens.push(d);total+=d}
  let left=THREE.MathUtils.clamp(fraction||0,0,1)*total;
  for(let i=0;i<lens.length;i++){
    if(left<=lens[i]||i===lens.length-1){
      const t=lens[i]?left/lens[i]:0,a=pts[i],b=pts[i+1];
      return new THREE.Vector3(a[0]+(b[0]-a[0])*t,0,a[1]+(b[1]-a[1])*t);
    }
    left-=lens[i];
  }
  const p=pts[pts.length-1];return new THREE.Vector3(p[0],0,p[1]);
}

function gameplayPoints(level){
  const anchors=[];
  for(const n of level?.network?.nodes||[])if(n.intersection)anchors.push(new THREE.Vector3(n.x,0,n.z));
  for(const v of level?.vehicles||[]){const p=pointOnRoute(v.route,v.start||0);if(p)anchors.push(p)}
  if(!anchors.length)anchors.push(new THREE.Vector3());
  const points=[],pad=2.35;
  for(const p of anchors){
    points.push(
      new THREE.Vector3(p.x-pad,0,p.z),new THREE.Vector3(p.x+pad,0,p.z),
      new THREE.Vector3(p.x,0,p.z-pad),new THREE.Vector3(p.x,0,p.z+pad),
      new THREE.Vector3(p.x,2.7,p.z)
    );
  }
  const box=new THREE.Box3().setFromPoints(anchors);
  const target=box.getCenter(new THREE.Vector3());target.y=0;
  return{target,points};
}

function visible(camera,points){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  const portrait=camera.aspect<.8,xLimit=portrait?.82:.88,top=portrait?.62:.70,bottom=portrait?-.72:-.76;
  for(const w of points){
    const p=w.clone().project(camera);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<-1||p.z>1)return false;
    if(Math.abs(p.x)>xLimit||p.y>top||p.y<bottom)return false;
  }
  return true;
}

function fitGameplay(level,camera){
  const {target,points}=gameplayPoints(level),portrait=camera.aspect<.8,elevation=portrait?1.95:1.42;
  const azimuths=portrait?[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI/4,Math.PI*.75,Math.PI*1.25,Math.PI*1.75]
                         :[Math.PI/4,Math.PI*.75,Math.PI*1.25,Math.PI*1.75,0,Math.PI/2];
  const steps=portrait?[15,17,19,21,23,25,27,29,31,34,37,40,44,48]
                      :[16,18,20,22,24,27,30,33,36,40,44,49,54];
  let best=null;
  for(const a of azimuths){
    for(const r of steps){
      camera.position.set(target.x+Math.sin(a)*r,r*elevation,target.z+Math.cos(a)*r);
      camera.lookAt(target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
      if(visible(camera,points)){const score=r+(portrait?Math.abs(Math.sin(a))*.01:0);if(!best||score<best.score)best={score,pos:camera.position.clone()};break}
    }
  }
  if(best)camera.position.copy(best.pos);else{const r=portrait?52:58,a=Math.PI/4;camera.position.set(target.x+Math.sin(a)*r,r*elevation,target.z+Math.cos(a)*r)}
  camera.lookAt(target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}

function overlapXZ(a,b,pad=.65){
  return a.min.x-pad<b.max.x&&a.max.x+pad>b.min.x&&a.min.z-pad<b.max.z&&a.max.z+pad>b.min.z;
}

function cleanupBuildings(world){
  const candidates=[];
  for(const o of [...world.children]){
    if(!o?.isGroup)continue;
    const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());
    if(s.y<3.35||s.x<3.6||s.z<3.6)continue;
    candidates.push({o,b,s,score:s.y*2+s.x+s.z});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const kept=[];
  for(const item of candidates){
    if(kept.some(k=>overlapXZ(item.b,k.b,.8)))world.remove(item.o);else kept.push(item);
  }
  return kept.map(k=>k.b.clone());
}

function roadDistance(level,x,z){
  const map=new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));let best=1e9;
  for(const e of level?.network?.edges||[]){
    const a=map.get(e.a),b=map.get(e.b);if(!a||!b)continue;
    const vx=b.x-a.x,vz=b.z-a.z,l2=vx*vx+vz*vz||1,t=Math.max(0,Math.min(1,((x-a.x)*vx+(z-a.z)*vz)/l2));
    best=Math.min(best,Math.hypot(x-(a.x+t*vx),z-(a.z+t*vz)));
  }
  return best;
}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}

function addCreativeDecor(level,world,buildingBoxes){
  const r=seeded((level.decorSeed||1)*31+(level.number||1)*997),occupied=[];
  const mat=(c,rough=.72,metal=.03)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
  const box=(g,w,h,d,c,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
  const cyl=(g,rad,h,c,x=0,y=0,z=0,seg=14)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,h,seg),mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
  const free=(x,z,rad)=>{
    if(Math.abs(x)>31||Math.abs(z)>31)return false;
    const d=roadDistance(level,x,z);if(d<6.25||d>12.8)return false;
    for(const b of buildingBoxes){const ex=b.clone().expandByScalar(rad+.8);if(x>ex.min.x&&x<ex.max.x&&z>ex.min.z&&z<ex.max.z)return false}
    return !occupied.some(o=>Math.hypot(x-o.x,z-o.z)<rad+o.r+.9);
  };
  function place(rad,fn){for(let k=0;k<80;k++){const x=-28+r()*56,z=-28+r()*56;if(!free(x,z,rad))continue;occupied.push({x,z,r:rad});fn(x,z);return true}return false}
  function kiosk(x,z){const g=new THREE.Group();box(g,2.2,.18,1.6,0xd8d3c8,0,.09,0);box(g,1.9,1.8,1.35,0x37556a,0,1,0);box(g,2.35,.16,1.8,0xffc53d,0,1.96,0);box(g,1.2,.6,.05,0x83c8de,0,1.25,.7);g.position.set(x,0,z);g.rotation.y=r()*Math.PI*2;world.add(g)}
  function billboard(x,z){const g=new THREE.Group();for(const dx of[-1,1])cyl(g,.08,2.9,0x31383f,dx,1.45,0);box(g,2.8,1.45,.15,0x17304d,0,2.65,0);box(g,2.35,.18,.18,0xffc83d,0,2.65,.1);g.position.set(x,0,z);g.rotation.y=r()*Math.PI*2;world.add(g)}
  function sculpture(x,z){const g=new THREE.Group();cyl(g,1.1,.24,0xd3cec4,0,.12,0,24);const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.16,12,28),mat(0xd88b36,.36,.4));ring.rotation.x=Math.PI/2.6;ring.position.y=1.2;ring.castShadow=true;g.add(ring);cyl(g,.13,1.45,0x4b535a,0,.72,0);g.position.set(x,0,z);world.add(g)}
  function playground(x,z){const g=new THREE.Group();box(g,3.5,.12,2.7,0x5da86b,0,.06,0);for(const dx of[-1.2,1.2])cyl(g,.08,2.1,0x43505a,dx,1.05,0);box(g,2.5,.1,.1,0xffc53d,0,2.05,0);for(const dx of[-.65,.65]){box(g,.04,1,.04,0x33383e,dx,1.38,0);box(g,.58,.1,.32,0xff654f,dx,.92,0)}g.position.set(x,0,z);g.rotation.y=r()*Math.PI*2;world.add(g)}
  function flowerBed(x,z){const g=new THREE.Group();box(g,2.7,.38,1.15,0xe1d8c7,0,.19,0);for(let i=0;i<7;i++){const px=-1.05+i*.35;cyl(g,.035,.34,0x2e7f43,px,.48,0,7);const f=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,1),mat(i%2?0xff5a83:0xffd34a));f.position.set(px,.72,0);g.add(f)}g.position.set(x,0,z);g.rotation.y=r()*Math.PI*2;world.add(g)}
  function bikeRack(x,z){const g=new THREE.Group();for(let i=-2;i<=2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.32,.055,8,16,Math.PI),mat(0x66737d,.5,.5));ring.rotation.z=Math.PI/2;ring.position.set(i*.48,.34,0);g.add(ring)}box(g,2.4,.08,.12,0x48525a,0,.05,0);g.position.set(x,0,z);g.rotation.y=r()*Math.PI*2;world.add(g)}
  function umbrella(x,z){const g=new THREE.Group();cyl(g,.07,2.1,0x76513a,0,1.05,0);const top=new THREE.Mesh(new THREE.ConeGeometry(1.25,.52,18),mat(level.number%2?0xff655d:0x3e9ed8,.48));top.position.y=2.05;top.castShadow=true;g.add(top);for(const sx of[-.8,.8])box(g,.65,.08,.34,0xe6d5b7,sx,.3,.4);g.position.set(x,0,z);world.add(g)}
  function helipad(x,z){const g=new THREE.Group();box(g,3.4,.09,3.4,0x6b7379,0,.045,0);box(g,.32,.04,2,0xf3f5f6,0,.1,0);box(g,1.4,.04,.32,0xf3f5f6,0,.1,0);g.position.set(x,0,z);g.rotation.y=r()*Math.PI*.5;world.add(g)}

  const theme=level.theme;
  if(theme==='park'){place(2.2,playground);place(1.7,flowerBed);place(1.6,bikeRack);place(1.5,sculpture)}
  else if(theme==='shops'){place(1.7,kiosk);place(1.7,billboard);place(1.6,bikeRack);place(1.7,flowerBed)}
  else if(theme==='suburb'){place(2.1,playground);place(1.6,bikeRack);place(1.7,flowerBed)}
  else if(theme==='hospital'){place(2.2,helipad);place(1.5,billboard);place(1.7,flowerBed)}
  else if(theme==='industrial'){place(1.7,billboard);place(1.6,sculpture);place(1.6,bikeRack)}
  else if(theme==='seaside'){place(1.8,umbrella);place(1.8,umbrella);place(1.6,kiosk);place(1.5,bikeRack)}
  else if(theme==='terminal'){place(1.8,kiosk);place(1.7,billboard);place(1.5,bikeRack);place(1.7,flowerBed)}
  else if(theme==='plaza'){place(1.7,sculpture);place(1.8,kiosk);place(1.7,flowerBed);place(1.5,bikeRack)}
  else{place(1.7,billboard);place(1.6,kiosk);place(1.6,sculpture);place(1.5,bikeRack)}
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);let active=null,lastW=0,lastH=0;
  function viewportSize(){const vv=window.visualViewport;return{w:Math.max(1,Math.round(vv?.width||window.innerWidth||1)),h:Math.max(1,Math.round(vv?.height||window.innerHeight||1))}}
  function syncViewport(force=false){
    const {w,h}=viewportSize(),aspect=w/h,unchanged=Math.abs(w-lastW)<2&&Math.abs(h-lastH)<2&&Math.abs(ctx.camera.aspect-aspect)<.002;
    if(!force&&unchanged)return false;
    lastW=w;lastH=h;const pxH=`${h}px`;document.documentElement.style.height=pxH;document.body.style.height=pxH;const app=document.getElementById('app');if(app)app.style.height=pxH;
    ctx.renderer.setSize(w,h,false);ctx.camera.aspect=aspect;ctx.camera.updateProjectionMatrix();if(active)fitGameplay(active,ctx.camera);return true;
  }
  const onViewport=()=>syncViewport(true);window.visualViewport?.addEventListener('resize',onViewport);window.visualViewport?.addEventListener('scroll',onViewport);window.addEventListener('orientationchange',onViewport);
  return{
    build(level){
      active=level;syncViewport(true);base.build(level);ctx.scene.fog=null;
      const buildings=cleanupBuildings(ctx.world);addCreativeDecor(level,ctx.world,buildings);fitGameplay(level,ctx.camera);
    },
    update(dt,now){base.update(dt,now);ctx.scene.fog=null;syncViewport(false)}
  };
}
