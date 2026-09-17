import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// Give every non-premium fallback vehicle a clear body colour so some levels
// never fall back to a row of grey/white cars when a premium model is not used.
const PALETTE=[
  [/taxi\.glb/i,0xffcc28],
  [/police\.glb/i,0xf2f5f7],
  [/ambulance\.glb/i,0xf4f6f8],
  [/firetruck\.glb/i,0xe83c34],
  [/suvLuxury\.glb/i,0x7b55d9],
  [/suv\.glb/i,0x32a66a],
  [/hatchbackSports\.glb/i,0x2f80ed],
  [/sedanSports\.glb|race\.glb|raceFuture\.glb/i,0xff5b61],
  [/delivery\.glb/i,0xf39c35],
  [/truckFlat\.glb/i,0x32b8a5],
  [/truck\.glb/i,0x3564b8],
  [/tractor\.glb/i,0x8ccf39],
  [/van\.glb/i,0x35b9d2],
  [/sedan\.glb/i,0xe94f45]
];
const colorFor=url=>(PALETTE.find(([re])=>re.test(String(url)))||[])[1]||0xe94f45;

function tintFallback(scene,url){
  if(!scene||scene.userData?.premiumVehicle)return;
  const tint=new THREE.Color(colorFor(url));
  const candidates=[];
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{
    if(!o.isMesh)return;
    const name=((o.name||'')+' '+(o.material?.name||'')).toLowerCase();
    if(/wheel|tire|tyre|rim|glass|window|windshield|windscreen|light|lamp/.test(name))return;
    const box=new THREE.Box3().setFromObject(o),s=box.getSize(new THREE.Vector3()),score=s.x*s.y+s.y*s.z+s.x*s.z;
    candidates.push({o,score,name});
  });
  candidates.sort((a,b)=>b.score-a.score);
  const chosen=candidates.filter(c=>/body|paint|door|hood|bonnet|roof|boot|fender|panel|cab|chassis/.test(c.name)).slice(0,5);
  const targets=chosen.length?chosen:candidates.slice(0,2);
  for(const {o} of targets){
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const next=mats.map(m=>{
      if(!m)return m;
      const q=m.clone();
      if(q.color)q.color.copy(tint);
      if('roughness' in q)q.roughness=Math.min(.48,q.roughness??.48);
      if('metalness' in q)q.metalness=Math.max(.08,q.metalness??.08);
      return q;
    });
    o.material=Array.isArray(o.material)?next:next[0];
  }
}

if(!GLTFLoader.prototype.__karagameColorFix){
  GLTFLoader.prototype.__karagameColorFix=true;
  const previous=GLTFLoader.prototype.load;
  GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){
    return previous.call(this,url,gltf=>{tintFallback(gltf.scene,url);onLoad?.(gltf)},onProgress,onError);
  };
}
