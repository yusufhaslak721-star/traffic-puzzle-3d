import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from './environment_v8.js';
import {createPremiumRoads} from './premium_roads.js';

function makeBird(){
  const g=new THREE.Group();
  const mat=new THREE.MeshBasicMaterial({color:0xf4f6f8,side:THREE.DoubleSide});
  const dark=new THREE.MeshBasicMaterial({color:0x2e3742,side:THREE.DoubleSide});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),dark);body.scale.set(1,.55,2.1);g.add(body);
  const wingGeo=new THREE.PlaneGeometry(.42,.13);
  const left=new THREE.Mesh(wingGeo,mat),right=new THREE.Mesh(wingGeo,mat);
  left.position.set(-.2,.03,0);right.position.set(.2,.03,0);
  left.rotation.y=.12;right.rotation.y=-.12;
  g.add(left,right);g.userData.wings=[left,right];
  return g;
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);
  const roads=createPremiumRoads(ctx.world);
  const flock=new THREE.Group();
  ctx.scene.add(flock);
  let active=null;

  function rebuildFlock(level){
    flock.clear();active=level;
    const centers=(level?.network?.nodes||[]).filter(n=>n.intersection);
    const cx=centers.length?centers.reduce((s,n)=>s+n.x,0)/centers.length:0;
    const cz=centers.length?centers.reduce((s,n)=>s+n.z,0)/centers.length:0;
    const count=level?.theme==='seaside'?10:level?.theme==='park'?8:5;
    for(let i=0;i<count;i++){
      const b=makeBird();
      b.scale.setScalar(.8+(i%3)*.12);
      b.userData.phase=i*(Math.PI*2/count)+(level?.number||1)*.31;
      b.userData.radius=8+(i%4)*2.2;
      b.userData.radiusZ=6+(i%3)*1.8;
      b.userData.speed=.7+(i%5)*.08;
      b.userData.cx=cx+(i%2?2:-2);
      b.userData.cz=cz+(i%3-1)*1.3;
      flock.add(b);
    }
  }

  return{
    build(level){base.build(level);roads.build(level);rebuildFlock(level)},
    update(dt,now){
      base.update(dt,now);
      const t=now*.00042;
      for(let i=0;i<flock.children.length;i++){
        const b=flock.children[i],u=b.userData,a=t*u.speed+u.phase;
        b.position.set(u.cx+Math.cos(a)*u.radius,7.5+(i%3)*.8+Math.sin(a*2.1)*.45,u.cz+Math.sin(a)*u.radiusZ);
        const nx=-Math.sin(a)*u.radius,nz=Math.cos(a)*u.radiusZ;
        b.rotation.y=Math.atan2(nx,nz);
        const flap=Math.sin(now*.012+i)*.5;
        if(u.wings){u.wings[0].rotation.z=flap;u.wings[1].rotation.z=-flap}
      }
    }
  };
}
