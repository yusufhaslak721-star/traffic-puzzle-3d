import * as THREE from 'three';
import {createEnvironment as createBaseEnvironment} from './environment_base.js';

function gameplayBounds(level){
  const nodes=level?.network?.nodes||[];
  if(!nodes.length)return{target:new THREE.Vector3(),points:[new THREE.Vector3()]};
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const n of nodes){minX=Math.min(minX,n.x);maxX=Math.max(maxX,n.x);minZ=Math.min(minZ,n.z);maxZ=Math.max(maxZ,n.z)}
  const pad=4.8;
  minX-=pad;maxX+=pad;minZ-=pad;maxZ+=pad;
  const target=new THREE.Vector3((minX+maxX)/2,0,(minZ+maxZ)/2);
  const points=[
    new THREE.Vector3(minX,0,minZ),new THREE.Vector3(maxX,0,minZ),
    new THREE.Vector3(minX,0,maxZ),new THREE.Vector3(maxX,0,maxZ),
    new THREE.Vector3(minX,2.8,minZ),new THREE.Vector3(maxX,2.8,minZ),
    new THREE.Vector3(minX,2.8,maxZ),new THREE.Vector3(maxX,2.8,maxZ),
  ];
  return{target,points};
}

function allGameplayVisible(camera,points){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  const xLimit=camera.aspect>1.55?.88:.84;
  const top=.73,bottom=-.76;
  for(const w of points){
    const p=w.clone().project(camera);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<-1||p.z>1)return false;
    if(Math.abs(p.x)>xLimit||p.y>top||p.y<bottom)return false;
  }
  return true;
}

function fitGameplay(level,camera,seedVector){
  const {target,points}=gameplayBounds(level);
  const seed=seedVector?.clone?.()||camera.position.clone().sub(target);
  if(seed.length()<1)seed.set(20,34,20);
  const tries=[1,1.08,1.16,1.25,1.36,1.48,1.62,1.78,1.96,2.16,2.4,2.7,3.05];
  for(const s of tries){
    camera.position.copy(target).addScaledVector(seed,s);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    if(allGameplayVisible(camera,points))return;
  }
  camera.position.copy(target).addScaledVector(seed,3.35);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}

export function createEnvironment(ctx){
  const base=createBaseEnvironment(ctx);
  let active=null,seedVector=null,lastW=0,lastH=0;

  function viewportSize(){
    const vv=window.visualViewport;
    return{
      w:Math.max(1,Math.round(vv?.width||window.innerWidth||1)),
      h:Math.max(1,Math.round(vv?.height||window.innerHeight||1)),
    };
  }

  function syncViewport(force=false){
    const {w,h}=viewportSize();
    if(!force&&Math.abs(w-lastW)<2&&Math.abs(h-lastH)<2)return false;
    lastW=w;lastH=h;
    const pxH=`${h}px`;
    document.documentElement.style.height=pxH;
    document.body.style.height=pxH;
    const app=document.getElementById('app');if(app)app.style.height=pxH;
    ctx.renderer.setSize(w,h,false);
    ctx.camera.aspect=w/h;
    ctx.camera.updateProjectionMatrix();
    if(active&&seedVector)fitGameplay(active,ctx.camera,seedVector);
    return true;
  }

  const onViewport=()=>syncViewport(true);
  window.visualViewport?.addEventListener('resize',onViewport);
  window.addEventListener('orientationchange',onViewport);

  return{
    build(level){
      active=level;
      syncViewport(true);
      base.build(level);
      ctx.scene.fog=null;
      const {target}=gameplayBounds(level);
      seedVector=ctx.camera.position.clone().sub(target);
      fitGameplay(level,ctx.camera,seedVector);
    },
    update(dt,now){
      base.update(dt,now);
      ctx.scene.fog=null;
      syncViewport(false);
    }
  };
}
