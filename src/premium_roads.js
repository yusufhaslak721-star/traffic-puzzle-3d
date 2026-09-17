import * as THREE from 'three';

// CC0 AmbientCG road/concrete surfaces.
const ASPHALT='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Asphalt021_2K-JPG/Asphalt021_2K-JPG_Color.jpg';
const CONCRETE='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Concrete012_2K-JPG/Concrete012_2K-JPG_Color.jpg';

function prepareTexture(url){
  const t=new THREE.TextureLoader().load(url,tex=>{
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.anisotropy=4;
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.needsUpdate=true;
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const asphaltMap=prepareTexture(ASPHALT);
const concreteMap=prepareTexture(CONCRETE);

function worldPlane(width,length,material,cx,cz,rot=0,repeat=5.6){
  const g=new THREE.PlaneGeometry(width,length,1,1);
  const uv=g.attributes.uv;
  const c=Math.cos(rot),s=Math.sin(rot);
  for(let i=0;i<uv.count;i++){
    const lx=(uv.getX(i)-.5)*width, lz=(uv.getY(i)-.5)*length;
    const wx=cx+lx*c+lz*s, wz=cz-lx*s+lz*c;
    uv.setXY(i,wx/repeat,wz/repeat);
  }
  const m=new THREE.Mesh(g,material);
  m.rotation.x=-Math.PI/2;
  m.rotation.z=-rot;
  m.position.set(cx,0,cz);
  m.receiveShadow=true;
  return m;
}

export function createPremiumRoads(world){
  const root=new THREE.Group();
  root.name='premium-road-layer-v6';

  const asphaltMat=new THREE.MeshStandardMaterial({color:0xf0efec,map:asphaltMap,roughness:.89,metalness:.006});
  const wetMat=new THREE.MeshStandardMaterial({color:0xd7dfe4,map:asphaltMap,roughness:.34,metalness:.10});
  const concreteMat=new THREE.MeshStandardMaterial({color:0xe1ddd5,map:concreteMap,roughness:.94,metalness:0});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf7f5ed,roughness:.68});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xf1c341,roughness:.66});
  const drainMat=new THREE.MeshStandardMaterial({color:0x2b2e30,roughness:.95});

  const ROAD_W=9.55, SHOULDER_W=11.35, JUNCTION_W=10.15, JUNCTION_SHOULDER=11.55;
  const nodeMap=level=>new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));
  function degree(level,id){let d=0;for(const e of level?.network?.edges||[])if(e.a===id||e.b===id)d++;return d}
  const isJunction=(level,id)=>degree(level,id)>=3;
  function directions(level,id){
    const m=nodeMap(level),n=m.get(id),out=[];if(!n)return out;
    for(const e of level?.network?.edges||[]){
      const other=e.a===id?m.get(e.b):e.b===id?m.get(e.a):null;
      if(!other)continue;
      const dx=other.x-n.x,dz=other.z-n.z;
      out.push(Math.abs(dx)>Math.abs(dz)?(dx>0?'E':'W'):(dz>0?'S':'N'));
    }
    return out;
  }

  function hideBaseRoads(){
    const colors=new Set([0x2b3136,0x222b31,0xbdb8ad,0xf2ead7,0xffd14b,0xf7f3e8]);
    world.traverse(o=>{
      if(!o.isMesh||root.getObjectById(o.id))return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      if(!mats.some(m=>m?.color&&colors.has(m.color.getHex())))return;
      const s=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      if(s.y<.9&&Math.max(s.x,s.z)>.7)o.visible=false;
    });
  }

  function mark(g,w,d,mat,x,y,z){
    const q=new THREE.Mesh(new THREE.BoxGeometry(w,.024,d),mat);
    q.position.set(x,y,z);q.receiveShadow=true;g.add(q);return q;
  }

  function segment(a,b,level){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.4)return;
    const ang=Math.atan2(dx,dz),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,wet=level.weather==='rain';
    const g=new THREE.Group();g.position.set(cx,0,cz);g.rotation.y=ang;

    // One continuous shoulder slab under the road. It runs node-centre to node-centre,
    // so corners never leave disconnected beige blocks.
    const shoulder=worldPlane(SHOULDER_W,len+.55,concreteMat,0,0,0,5.8);
    shoulder.position.y=.205;g.add(shoulder);
    const road=worldPlane(ROAD_W,len+.72,wet?wetMat:asphaltMat,0,0,0,5.8);
    road.position.y=.232;g.add(road);

    for(const sx of[-1,1])mark(g,.12,len+.55,drainMat,sx*(ROAD_W/2-.04),.245,0);
    for(let z=-len/2+.9;z<len/2-.45;z+=3.45){
      mark(g,.09,1.5,yellowMat,-.11,.254,z);mark(g,.09,1.5,yellowMat,.11,.254,z);
    }
    for(const x of[-2.34,2.34])for(let z=-len/2+1.0;z<len/2-.4;z+=4.35)mark(g,.075,1.6,whiteMat,x,.253,z);
    mark(g,.065,len+.25,whiteMat,-4.28,.252,0);mark(g,.065,len+.25,whiteMat,4.28,.252,0);
    root.add(g);
  }

  function crosswalkArm(g,rot){
    const r=new THREE.Group();
    const z=-3.70;
    mark(r,7.5,.15,whiteMat,0,.294,z-1.0);
    for(let x=-3.28;x<=3.28;x+=.72)mark(r,.36,1.18,whiteMat,x,.297,z);
    r.rotation.y=rot;g.add(r);
  }

  function junction(n,level){
    const wet=level.weather==='rain',g=new THREE.Group();g.position.set(n.x,0,n.z);
    // Full underlay + asphalt overlay. Incoming segment slabs continue underneath,
    // which removes the pasted/cut road corners completely.
    const shoulder=worldPlane(JUNCTION_SHOULDER,JUNCTION_SHOULDER,concreteMat,0,0,0,5.8);
    shoulder.position.y=.214;g.add(shoulder);
    const surface=worldPlane(JUNCTION_W,JUNCTION_W,wet?wetMat:asphaltMat,0,0,0,5.8);
    surface.position.y=.266;g.add(surface);

    const dirs=directions(level,n.id);
    if(dirs.includes('N'))crosswalkArm(g,0);
    if(dirs.includes('S'))crosswalkArm(g,Math.PI);
    if(dirs.includes('E'))crosswalkArm(g,-Math.PI/2);
    if(dirs.includes('W'))crosswalkArm(g,Math.PI/2);
    root.add(g);
  }

  function build(level){
    root.clear();
    if(root.parent!==world)world.add(root);
    hideBaseRoads();
    const m=nodeMap(level);
    for(const e of level?.network?.edges||[]){const a=m.get(e.a),b=m.get(e.b);if(a&&b)segment(a,b,level)}
    for(const n of level?.network?.nodes||[])if(isJunction(level,n.id))junction(n,level);
  }
  return{build,root};
}
