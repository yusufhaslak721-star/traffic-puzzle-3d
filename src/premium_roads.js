import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

// Kenney City Kit Roads 2.1 — CC0. Loaded from the public Bevy asset mirror.
const BASE='https://raw.githubusercontent.com/bevyengine/bevy_asset_files/main/kenney/city-kit-roads/';
const URLS={
  straight:BASE+'road-straight.glb',
  cross:BASE+'road-crossroad-path.glb',
  t:BASE+'road-intersection-path.glb'
};

export function createPremiumRoads(world){
  const loader=new GLTFLoader();
  const root=new THREE.Group();root.name='premium-road-layer';world.add(root);
  let buildToken=0;
  const load=url=>new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));
  const templates=Promise.all([load(URLS.straight),load(URLS.cross),load(URLS.t)])
    .then(([straight,cross,t])=>({straight,cross,t}));

  function prep(o){
    o.traverse(m=>{
      if(!m.isMesh)return;
      m.castShadow=false;m.receiveShadow=true;
      const mats=Array.isArray(m.material)?m.material:[m.material];
      for(const mat of mats){
        if(!mat)continue;
        if('roughness' in mat)mat.roughness=.82;
        if('metalness' in mat)mat.metalness=.02;
      }
    });
    return o;
  }
  function lowerOldRoads(){
    const colors=new Set([0x2b3136,0x222b31,0xbdb8ad,0xf2ead7,0xffd14b,0xf7f3e8]);
    world.traverse(o=>{
      if(!o.isMesh||o.userData.__oldRoadLowered)return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const hit=mats.some(m=>m?.color&&colors.has(m.color.getHex()));
      if(hit&&o.position.y<.55){o.position.y-=.11;o.userData.__oldRoadLowered=true}
    });
  }
  const nodeMap=level=>new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));
  function degree(level,id){let d=0;for(const e of level?.network?.edges||[])if(e.a===id||e.b===id)d++;return d}
  function connected(level,id){
    const m=nodeMap(level),n=m.get(id),out=[];if(!n)return out;
    for(const e of level?.network?.edges||[]){
      const other=e.a===id?m.get(e.b):e.b===id?m.get(e.a):null;
      if(other)out.push([other.x-n.x,other.z-n.z]);
    }
    return out;
  }
  function tRotation(level,n){
    const dirs=connected(level,n.id);if(dirs.length!==3)return 0;
    const card=dirs.map(([x,z])=>Math.abs(x)>Math.abs(z)?(x>0?'E':'W'):(z>0?'S':'N'));
    const missing=['N','E','S','W'].find(d=>!card.includes(d))||'N';
    return ({N:0,E:-Math.PI/2,S:Math.PI,W:Math.PI/2})[missing];
  }

  async function build(level){
    const token=++buildToken;root.clear();lowerOldRoads();
    let T;try{T=await templates}catch(e){console.warn('Premium roads failed; base roads remain.',e);return}
    if(token!==buildToken)return;
    const m=nodeMap(level),tile=9.3,y=.105;
    for(const e of level?.network?.edges||[]){
      const a=m.get(e.a),b=m.get(e.b);if(!a||!b)continue;
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);
      const count=Math.max(1,Math.ceil(len/tile)),step=len/count;
      for(let i=0;i<count;i++){
        const q=prep(T.straight.clone(true));
        q.scale.set(9.85,1,step*1.045);q.rotation.y=ang;
        q.position.set(a.x+dx*((i+.5)/count),y,a.z+dz*((i+.5)/count));
        q.userData.roadAsset='kenney-straight';root.add(q);
      }
    }
    for(const n of level?.network?.nodes||[]){
      const d=degree(level,n.id);if(d<3)continue;
      const q=prep((d>=4?T.cross:T.t).clone(true));
      q.scale.set(10.45,1,10.45);q.position.set(n.x,y+.01,n.z);
      if(d===3)q.rotation.y=tRotation(level,n);
      q.userData.roadAsset=d>=4?'kenney-crosswalk-cross':'kenney-crosswalk-t';root.add(q);
    }
  }
  return{build,root};
}
