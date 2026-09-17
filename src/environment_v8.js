import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/environment_v4.js';

function routeStartPoint(v){
  const pts=v?.route?.points||[];
  if(pts.length<2)return new THREE.Vector3();
  const seg=[];let total=0;
  for(let i=1;i<pts.length;i++){
    const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    seg.push(d);total+=d;
  }
  let target=THREE.MathUtils.clamp(v.start||0,0,1)*total;
  for(let i=0;i<seg.length;i++){
    if(target<=seg[i]||i===seg.length-1){
      const t=seg[i]?target/seg[i]:0;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(pts[i][0],pts[i+1][0],t),
        .7,
        THREE.MathUtils.lerp(pts[i][1],pts[i+1][1],t)
      );
    }
    target-=seg[i];
  }
  return new THREE.Vector3(pts[0][0],.7,pts[0][1]);
}

function focusPoint(level){
  const pts=[];
  for(const n of level?.network?.nodes||[])if(n.intersection)pts.push(new THREE.Vector3(n.x,0,n.z));
  for(const v of level?.vehicles||[])pts.push(routeStartPoint(v));
  if(!pts.length)return new THREE.Vector3();
  return new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
}

function allStartsVisible(level,camera){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  for(const v of level?.vehicles||[]){
    const p=routeStartPoint(v).clone().project(camera);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<-1||p.z>1||Math.abs(p.x)>.95||p.y<-.89||p.y>.89)return false;
  }
  return true;
}

function tightenCamera(level,camera){
  const target=focusPoint(level);
  const base=camera.position.clone();
  const delta=base.clone().sub(target);
  const attempts=[
    {s:.68,f:42},{s:.72,f:42},{s:.76,f:43},{s:.80,f:43},{s:.84,f:44},{s:.88,f:44},
    {s:.92,f:45},{s:.96,f:45},{s:1.00,f:46},{s:1.06,f:47},{s:1.12,f:48}
  ];
  for(const a of attempts){
    camera.fov=a.f;
    camera.position.copy(target).addScaledVector(delta,a.s);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    if(allStartsVisible(level,camera))return;
  }
  camera.fov=48;
  camera.position.copy(target).addScaledVector(delta,1.12);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);
  let active=null,lastAspect=ctx.camera.aspect;
  return{
    build(level){
      active=level;
      base.build(level);
      ctx.scene.fog=null;
      tightenCamera(level,ctx.camera);
      lastAspect=ctx.camera.aspect;
    },
    update(dt,now){
      base.update(dt,now);
      ctx.scene.fog=null;
      if(active&&Math.abs(ctx.camera.aspect-lastAspect)>.01){
        tightenCamera(active,ctx.camera);
        lastAspect=ctx.camera.aspect;
      }
    }
  };
}
