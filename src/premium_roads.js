import * as THREE from 'three';

// CC0 AmbientCG road/concrete surfaces. Geometry is generated to match the
// level graph exactly; no modular road tiles are stretched across junctions.
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
  root.name='premium-road-layer-v4';

  const asphaltMat=new THREE.MeshStandardMaterial({color:0xf1f0ed,map:asphaltMap,roughness:.88,metalness:.008});
  const wetMat=new THREE.MeshStandardMaterial({color:0xd8e0e5,map:asphaltMap,roughness:.34,metalness:.10});
  const concreteMat=new THREE.MeshStandardMaterial({color:0xe2ddd4,map:concreteMap,roughness:.93,metalness:0});
  const curbMat=new THREE.MeshStandardMaterial({color:0xc9c5bc,roughness:.91});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf7f5ed,roughness:.68});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xf3c63f,roughness:.66});
  const gutterMat=new THREE.MeshStandardMaterial({color:0x272b2e,roughness:.95});

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

    // Only true T/cross junctions cut the road. Degree-2 nodes are ordinary
    // bends/continuations, so roads run through them instead of leaving a blank block.
    const junctionCut=4.42;
    const cutA=isJunction(level,a.id)?junctionCut:-.20;
    const cutB=isJunction(level,b.id)?junctionCut:-.20;
    let ax=a.x+ux*cutA,az=a.z+uz*cutA;
    let bx=b.x-ux*cutB,bz=b.z-uz*cutB;
    let segLen=Math.hypot(bx-ax,bz-az);
    if(segLen<.65){
      ax=a.x;az=a.z;bx=b.x;bz=b.z;segLen=len;
    }

    const g=new THREE.Group(),roadW=9.55,sideW=1.10,ang=Math.atan2(bx-ax,bz-az),wet=level.weather==='rain';
    const road=tiledPlane(roadW,segLen,wet?wetMat:asphaltMat,5.7);
    road.position.y=.235;g.add(road);

    for(const sx of[-1,1]){
      markBox(g,.18,segLen,gutterMat,sx*(roadW/2-.09),.244,0);
      const walk=tiledPlane(sideW,segLen,concreteMat,3.2);
      walk.position.set(sx*(roadW/2+sideW/2+.10),.27,0);g.add(walk);
      markBox(g,.15,segLen,curbMat,sx*(roadW/2+.035),.31,0);
    }

    // Lane markings continue through normal degree-2 bends. At real junctions
    // they disappear beneath the junction surface/crosswalk, avoiding broken seams.
    for(let z=-segLen/2+.9;z<segLen/2-.45;z+=3.35){
      markBox(g,.095,1.48,yellowMat,-.11,.26,z);
      markBox(g,.095,1.48,yellowMat,.11,.26,z);
    }
    for(const x of[-2.34,2.34])for(let z=-segLen/2+1.05;z<segLen/2-.4;z+=4.3)markBox(g,.08,1.58,whiteMat,x,.258,z);
    markBox(g,.07,segLen,whiteMat,-4.30,.257,0);
    markBox(g,.07,segLen,whiteMat,4.30,.257,0);

    g.position.set((ax+bx)/2,0,(az+bz)/2);g.rotation.y=ang;root.add(g);
  }

  function crosswalkArm(g,rot,offset){
    const r=new THREE.Group();
    markBox(r,7.55,.15,whiteMat,0,.281,offset-1.02);
    for(let x=-3.3;x<=3.3;x+=.72)markBox(r,.37,1.20,whiteMat,x,.284,offset);
    r.rotation.y=rot;g.add(r);
  }

  function junction(n,level){
    const wet=level.weather==='rain',size=10.0,g=new THREE.Group();
    const surface=tiledPlane(size,size,wet?wetMat:asphaltMat,5.7);surface.position.y=.252;g.add(surface);

    // Compact corner pavements: the incoming road overlaps beneath this square by
    // roughly half a metre, so there is never a visible cut between pieces.
    const corner=1.70;
    for(const x of[-1,1])for(const z of[-1,1]){
      const p=tiledPlane(corner,corner,concreteMat,3.2);
      p.position.set(x*(size/2-corner/2),.29,z*(size/2-corner/2));g.add(p);
    }

    const dirs=directions(level,n.id),walkOffset=-3.70;
    if(dirs.includes('N'))crosswalkArm(g,0,walkOffset);
    if(dirs.includes('S'))crosswalkArm(g,Math.PI,walkOffset);
    if(dirs.includes('E'))crosswalkArm(g,-Math.PI/2,walkOffset);
    if(dirs.includes('W'))crosswalkArm(g,Math.PI/2,walkOffset);

    g.position.set(n.x,0,n.z);root.add(g);
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
