import {createEnvironment as createBaseEnvironment} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/environment_v4.js';

function fitAllRoadsAndSpawns(level,camera){
  const nodes=level?.network?.nodes||[];
  if(!nodes.length)return;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const n of nodes){minX=Math.min(minX,n.x);maxX=Math.max(maxX,n.x);minZ=Math.min(minZ,n.z);maxZ=Math.max(maxZ,n.z)}
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const spanX=Math.max(1,maxX-minX),spanZ=Math.max(1,maxZ-minZ);
  const span=Math.max(spanX,spanZ*1.05,32);
  const aspect=Math.max(.65,camera.aspect||1.7778);
  const portraitBoost=aspect<1?1.18:1;
  const h=(27+span*.74)*portraitBoost;
  const d=(22+span*.66)*portraitBoost;
  const flip=(level.number||1)%4;
  camera.position.set(flip===1?d:flip===3?-d:d*.82,h,flip===2?-d:d);
  camera.lookAt(cx,0,cz);
  camera.updateProjectionMatrix();
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);
  return{
    build(level){base.build(level);fitAllRoadsAndSpawns(level,ctx.camera)},
    update(dt,now){base.update(dt,now)}
  };
}
