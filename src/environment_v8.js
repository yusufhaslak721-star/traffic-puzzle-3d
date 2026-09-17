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

  // Frame only what the player must see at the start: junctions + parked vehicles.
  // Route exit nodes are intentionally ignored so long off-screen roads do not make cars microscopic.
  const points=[];
  const pad=2.35;
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
  const portrait=camera.aspect<.8;
  const xLimit=portrait?.82:.88;
  const top=portrait?.62:.70;
  const bottom=portrait?-.72:-.76;
  for(const w of points){
    const p=w.clone().project(camera);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<-1||p.z>1)return false;
    if(Math.abs(p.x)>xLimit||p.y>top||p.y<bottom)return false;
  }
  return true;
}

function fitGameplay(level,camera){
  const {target,points}=gameplayPoints(level);
  const portrait=camera.aspect<.8;
  // In portrait we use a steeper camera and test several azimuths. This aligns wide levels
  // vertically when possible, keeping cars large instead of zooming the entire city out.
  const elevation=portrait?1.95:1.42;
  const azimuths=portrait?[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI/4,Math.PI*.75,Math.PI*1.25,Math.PI*1.75]
                         :[Math.PI/4,Math.PI*.75,Math.PI*1.25,Math.PI*1.75,0,Math.PI/2];
  const steps=portrait?[15,17,19,21,23,25,27,29,31,34,37,40,44,48]
                      :[16,18,20,22,24,27,30,33,36,40,44,49,54];
  let best=null;
  for(const a of azimuths){
    for(const r of steps){
      const h=r*elevation;
      camera.position.set(target.x+Math.sin(a)*r,h,target.z+Math.cos(a)*r);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
      if(visible(camera,points)){
        const score=r+(portrait?Math.abs(Math.sin(a))*0.01:0);
        if(!best||score<best.score)best={score,pos:camera.position.clone()};
        break;
      }
    }
  }
  if(best)camera.position.copy(best.pos);
  else{
    const r=portrait?52:58,a=Math.PI/4;
    camera.position.set(target.x+Math.sin(a)*r,r*elevation,target.z+Math.cos(a)*r);
  }
  camera.lookAt(target);
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);
  let active=null,lastW=0,lastH=0;

  function viewportSize(){
    const vv=window.visualViewport;
    return{
      w:Math.max(1,Math.round(vv?.width||window.innerWidth||1)),
      h:Math.max(1,Math.round(vv?.height||window.innerHeight||1)),
    };
  }

  function syncViewport(force=false){
    const {w,h}=viewportSize(),aspect=w/h;
    const unchanged=Math.abs(w-lastW)<2&&Math.abs(h-lastH)<2&&Math.abs(ctx.camera.aspect-aspect)<.002;
    if(!force&&unchanged)return false;
    lastW=w;lastH=h;
    const pxH=`${h}px`;
    document.documentElement.style.height=pxH;
    document.body.style.height=pxH;
    const app=document.getElementById('app');if(app)app.style.height=pxH;
    ctx.renderer.setSize(w,h,false);
    ctx.camera.aspect=aspect;
    ctx.camera.updateProjectionMatrix();
    if(active)fitGameplay(active,ctx.camera);
    return true;
  }

  const onViewport=()=>syncViewport(true);
  window.visualViewport?.addEventListener('resize',onViewport);
  window.visualViewport?.addEventListener('scroll',onViewport);
  window.addEventListener('orientationchange',onViewport);

  return{
    build(level){
      active=level;
      syncViewport(true);
      base.build(level);
      ctx.scene.fog=null;
      fitGameplay(level,ctx.camera);
    },
    update(dt,now){
      base.update(dt,now);
      ctx.scene.fog=null;
      syncViewport(false);
    }
  };
}
