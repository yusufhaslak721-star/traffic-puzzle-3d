import * as THREE from 'three';

// CC0 AmbientCG surface textures mirrored in:
// https://github.com/petroulacl/fps-buildings-env-kit
// IMPORTANT: use the actual tileable Color JPG maps, not the preview PNGs.
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

function tiledPlane(width,length,material,repeatMeters=4){
  const g=new THREE.PlaneGeometry(width,length,1,1);
  const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(width/repeatMeters),uv.getY(i)*(length/repeatMeters));
  const m=new THREE.Mesh(g,material);
  m.rotation.x=-Math.PI/2;
  m.receiveShadow=true;
  return m;
}

export function createPremiumRoads(world){
  const root=new THREE.Group();
  root.name='premium-road-layer-v3';

  const asphaltMat=new THREE.MeshStandardMaterial({color:0xf5f5f5,map:asphaltMap,roughness:.86,metalness:.01});
  const wetMat=new THREE.MeshStandardMaterial({color:0xd9e2e8,map:asphaltMap,roughness:.34,metalness:.11});
  const concreteMat=new THREE.MeshStandardMaterial({color:0xe7e3dc,map:concreteMap,roughness:.92,metalness:0});
  const curbMat=new THREE.MeshStandardMaterial({color:0xc8c5bd,roughness:.9});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf7f5ee,roughness:.66});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xf4c542,roughness:.64});
  const gutterMat=new THREE.MeshStandardMaterial({color:0x25292c,roughness:.94});

  const nodeMap=level=>new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));
  function degree(level,id){let d=0;for(const e of level?.network?.edges||[])if(e.a===id||e.b===id)d++;return d}
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
      const hit=mats.some(m=>m?.color&&colors.has(m.color.getHex()));
      if(!hit)return;
      const s=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      if(s.y<.9&&Math.max(s.x,s.z)>.7)o.visible=false;
    });
  }

  function markBox(g,w,d,mat,x,y,z){
    const q=new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),mat);
    q.position.set(x,y,z);q.receiveShadow=true;g.add(q);return q;
  }

  function segment(a,b,level){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<.5)return;
    const ux=dx/len,uz=dz/len;
    const cutA=degree(level,a.id)>=2?5.18:0;
    const cutB=degree(level,b.id)>=2?5.18:0;
    let inner=len-cutA-cutB;
    if(inner<1.1)inner=Math.max(.75,len*.18);
    const effectiveCutA=Math.max(0,(len-inner)*(cutA/(Math.max(.001,cutA+cutB))));
    const effectiveCutB=Math.max(0,len-inner-effectiveCutA);
    const ax=a.x+ux*effectiveCutA,az=a.z+uz*effectiveCutA;
    const bx=b.x-ux*effectiveCutB,bz=b.z-uz*effectiveCutB;
    const segLen=Math.hypot(bx-ax,bz-az);
    if(segLen<.5)return;

    const g=new THREE.Group(),roadW=9.55,sideW=1.12,ang=Math.atan2(bx-ax,bz-az),wet=level.weather==='rain';
    const road=tiledPlane(roadW,segLen,wet?wetMat:asphaltMat,5.2);
    road.position.y=.235;g.add(road);

    for(const sx of[-1,1]){
      markBox(g,.20,segLen,gutterMat,sx*(roadW/2-.1),.244,0);
      const walk=tiledPlane(sideW,segLen,concreteMat,3.0);
      walk.position.set(sx*(roadW/2+sideW/2+.12),.27,0);g.add(walk);
      markBox(g,.16,segLen,curbMat,sx*(roadW/2+.05),.31,0);
    }

    for(let z=-segLen/2+1.0;z<segLen/2-.6;z+=3.35){
      markBox(g,.105,1.55,yellowMat,-.12,.26,z);
      markBox(g,.105,1.55,yellowMat,.12,.26,z);
    }
    for(const x of[-2.35,2.35])for(let z=-segLen/2+1.1;z<segLen/2-.5;z+=4.3)markBox(g,.085,1.65,whiteMat,x,.258,z);
    markBox(g,.075,segLen,whiteMat,-4.30,.257,0);
    markBox(g,.075,segLen,whiteMat,4.30,.257,0);

    g.position.set((ax+bx)/2,0,(az+bz)/2);g.rotation.y=ang;root.add(g);
  }

  function crosswalkArm(g,rot,offset){
    const r=new THREE.Group();
    markBox(r,7.6,.16,whiteMat,0,.275,offset-1.02);
    for(let x=-3.35;x<=3.35;x+=.72)markBox(r,.38,1.25,whiteMat,x,.278,offset);
    r.rotation.y=rot;g.add(r);
  }

  function junction(n,level){
    const wet=level.weather==='rain',d=degree(level,n.id),size=10.45,g=new THREE.Group();
    const surface=tiledPlane(size,size,wet?wetMat:asphaltMat,5.2);surface.position.y=.246;g.add(surface);

    // Sidewalk corners are deliberately simple and opaque; no road segment continues under them.
    const corner=2.0;
    for(const x of[-1,1])for(const z of[-1,1]){
      const p=tiledPlane(corner,corner,concreteMat,3.0);
      p.position.set(x*(size/2-corner/2),.285,z*(size/2-corner/2));g.add(p);
    }

    const dirs=directions(level,n.id);
    if(d>=3){
      if(dirs.includes('N'))crosswalkArm(g,0,-3.92);
      if(dirs.includes('S'))crosswalkArm(g,Math.PI, -3.92);
      if(dirs.includes('E'))crosswalkArm(g,-Math.PI/2,-3.92);
      if(dirs.includes('W'))crosswalkArm(g,Math.PI/2,-3.92);
    }
    g.position.set(n.x,0,n.z);root.add(g);
  }

  function build(level){
    root.clear();
    if(root.parent!==world)world.add(root);
    hideBaseRoads();
    const m=nodeMap(level);
    for(const e of level?.network?.edges||[]){const a=m.get(e.a),b=m.get(e.b);if(a&&b)segment(a,b,level)}
    for(const n of level?.network?.nodes||[])if(degree(level,n.id)>=2)junction(n,level);
  }

  return{build,root};
}
