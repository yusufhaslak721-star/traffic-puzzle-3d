import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/environment_v4.js';

function routeStartPoint(v){
  const pts=v?.route?.points||[];if(pts.length<2)return new THREE.Vector3();
  const seg=[];let total=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);total+=d}
  let target=Math.max(0,Math.min(1,v.start||0))*total;
  for(let i=0;i<seg.length;i++){if(target<=seg[i]||i===seg.length-1){const t=seg[i]?target/seg[i]:0;return new THREE.Vector3(THREE.MathUtils.lerp(pts[i][0],pts[i+1][0],t),.6,THREE.MathUtils.lerp(pts[i][1],pts[i+1][1],t))}target-=seg[i]}
  return new THREE.Vector3(pts[0][0],.6,pts[0][1])
}
function fitLevel(level,camera){
  const pts=[];for(const n of level?.network?.nodes||[])if(n.intersection)pts.push([n.x,n.z]);for(const v of level?.vehicles||[]){const p=routeStartPoint(v);pts.push([p.x,p.z])}
  if(!pts.length)return;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const p of pts){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minZ=Math.min(minZ,p[1]);maxZ=Math.max(maxZ,p[1])}
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,span=Math.max(maxX-minX,maxZ-minZ,20),h=23+span*.38,d=18+span*.34,flip=(level.number||1)%4;
  camera.fov=58;camera.position.set(cx+(flip===1?d:flip===3?-d:d*.82),h,cz+(flip===2?-d:d));camera.lookAt(cx,0,cz);camera.updateMatrixWorld(true);camera.updateProjectionMatrix()
}
export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);let activeLevel=null,lastAspect=ctx.camera.aspect;
  return{build(level){activeLevel=level;base.build(level);ctx.scene.fog=null;fitLevel(level,ctx.camera);lastAspect=ctx.camera.aspect},update(dt,now){base.update(dt,now);ctx.scene.fog=null;if(activeLevel&&Math.abs(ctx.camera.aspect-lastAspect)>.01){fitLevel(activeLevel,ctx.camera);lastAspect=ctx.camera.aspect}}}
}
