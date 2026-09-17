import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from './environment_v4.js';

// Only intersections define the "play area" the camera must frame tightly.
// Vehicle spawn points can sit far out at the map boundary; forcing every
// single one of them into view was what pushed the camera back and shrank
// the cars. Spawns are allowed to enter from just off-screen instead.
function focusPoint(level){
  const pts=[];
  for(const n of level?.network?.nodes||[])if(n.intersection)pts.push(new THREE.Vector3(n.x,0,n.z));
  if(!pts.length)return new THREE.Vector3();
  return new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
}

function intersectionsVisible(level,camera){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  for(const n of level?.network?.nodes||[]){
    if(!n.intersection)continue;
    const p=new THREE.Vector3(n.x,0,n.z).project(camera);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<-1||p.z>1||Math.abs(p.x)>.82||p.y<-.78||p.y>.78)return false;
  }
  return true;
}

function tightenCamera(level,camera){
  const target=focusPoint(level);
  const base=camera.position.clone();
  const delta=base.clone().sub(target);
  // Only zoom IN from the base framing computed by environment_v4's
  // fitCamera (s<1). We never zoom further OUT than that base shot, so a
  // level with many vehicles can no longer push the camera back and make
  // the cars tiny.
  const attempts=[.6,.66,.72,.78,.84,.9,.96,1];
  for(const s of attempts){
    camera.position.copy(target).addScaledVector(delta,s);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    if(intersectionsVisible(level,camera))return;
  }
  camera.position.copy(base);
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
