import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/environment_v4.js';

function routeStartPoint(v){
  const pts=v?.route?.points||[];
  if(pts.length<2)return new THREE.Vector3();
  const seg=[];let total=0;
  for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);total+=d}
  let target=Math.max(0,Math.min(1,v.start||0))*total;
  for(let i=0;i<seg.length;i++){
    if(target<=seg[i]||i===seg.length-1){const t=seg[i]?target/seg[i]:0;return new THREE.Vector3(THREE.MathUtils.lerp(pts[i][0],pts[i+1][0],t),.6,THREE.MathUtils.lerp(pts[i][1],pts[i+1][1],t))}
    target-=seg[i];
  }
  return new THREE.Vector3(pts[0][0],.6,pts[0][1]);
}
function centerOfIntersections(level){const a=(level?.network?.nodes||[]).filter(n=>n.intersection);if(!a.length)return new THREE.Vector3();let x=0,z=0;for(const n of a){x+=n.x;z+=n.z}return new THREE.Vector3(x/a.length,0,z/a.length)}
function startsVisible(level,camera){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  for(const v of level.vehicles||[]){const p=routeStartPoint(v).clone().project(camera);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>.93||p.y<-.88||p.y>.88)return false}
  return true;
}
function gentlyFitVehicles(level,camera){
  if(startsVisible(level,camera))return;
  const target=centerOfIntersections(level),base=camera.position.clone(),delta=base.clone().sub(target);
  for(const scale of[1.06,1.12,1.18,1.24,1.30,1.36]){
    camera.position.copy(target).addScaledVector(delta,scale);camera.lookAt(target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    if(startsVisible(level,camera))return;
  }
  // Never destroy the close, readable composition just to expose a far edge spawn.
  camera.position.copy(target).addScaledVector(delta,1.36);camera.lookAt(target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}
export function createEnvironment(ctx){const base=createBaseEnvironment(ctx);return{build(level){base.build(level);gentlyFitVehicles(level,ctx.camera)},update(dt,now){base.update(dt,now)}}}
