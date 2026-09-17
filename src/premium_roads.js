import * as THREE from 'three';

// Road visuals use CC0 AmbientCG asphalt/concrete textures mirrored in:
// https://github.com/petroulacl/fps-buildings-env-kit
// Geometry is generated here to fit the game's arbitrary road graph exactly.
const ASPHALT='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Asphalt021_2K-JPG/Asphalt021.png';
const CONCRETE='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Concrete012_2K-JPG/Concrete012.png';

function prepareTexture(url,colorSpace=true){
  const t=new THREE.TextureLoader().load(url,tex=>{
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.anisotropy=4;
    if(colorSpace)tex.colorSpace=THREE.SRGBColorSpace;
    tex.needsUpdate=true;
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}

const asphaltMap=prepareTexture(ASPHALT,true);
const concreteMap=prepareTexture(CONCRETE,true);

function tiledPlane(width,length,material,repeatMeters=4){
  const g=new THREE.PlaneGeometry(width,length,1,1);
  const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++){
    uv.setXY(i,uv.getX(i)*(width/repeatMeters),uv.getY(i)*(length/repeatMeters));
  }
  const m=new THREE.Mesh(g,material);
  m.rotation.x=-Math.PI/2;
  m.receiveShadow=true;
  return m;
}

export function createPremiumRoads(world){
  const root=new THREE.Group();
  root.name='premium-road-layer-v2';

  const asphaltMat=new THREE.MeshStandardMaterial({
    color:0xffffff,map:asphaltMap,roughness:.88,metalness:.015
  });
  const wetMat=new THREE.MeshStandardMaterial({
    color:0xe5edf2,map:asphaltMap,roughness:.36,metalness:.12
  });
  const concreteMat=new THREE.MeshStandardMaterial({
    color:0xd9d4ca,map:concreteMap,roughness:.91,metalness:0
  });
  const curbMat=new THREE.MeshStandardMaterial({color:0xc8c5bd,roughness:.9});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf5f2e8,roughness:.7});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xf7c83d,roughness:.68});
  const gutterMat=new THREE.MeshStandardMaterial({color:0x272b2e,roughness:.94});

  const nodeMap=level=>new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));
  function degree(level,id){let d=0;for(const e of level?.network?.edges||[])if(e.a===id||e.b===id)d++;return d}

  function hideBaseRoads(){
    const colors=new Set([0x2b3136,0x222b31,0xbdb8ad,0xf2ead7,0xffd14b,0xf7f3e8]);
    world.traverse(o=>{
      if(!o.isMesh||o.parent===root)return;
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
    if(len<.2)return;
    const g=new THREE.Group(),roadW=9.55,sideW=1.12,ang=Math.atan2(dx,dz),wet=level.weather==='rain';

    const road=tiledPlane(roadW,len+1.0,wet?wetMat:asphaltMat,3.2);
    road.position.y=.235;g.add(road);

    // Dark gutters plus textured raised sidewalks make the road edge read much cleaner.
    for(const sx of[-1,1]){
      markBox(g,.20,len+.65,gutterMat,sx*(roadW/2-.1),.244,0);
      const walk=tiledPlane(sideW,len+.75,concreteMat,2.2);
      walk.position.set(sx*(roadW/2+sideW/2+.12),.27,0);g.add(walk);
      markBox(g,.16,len+.78,curbMat,sx*(roadW/2+.05),.31,0);
    }

    // Centre line + lane dividers. Shorter dashes look much less toy-like from the isometric camera.
    for(let z=-len/2+1.2;z<len/2-.5;z+=3.2){
      markBox(g,.105,1.45,yellowMat,-.12,.26,z);
      markBox(g,.105,1.45,yellowMat,.12,.26,z);
    }
    for(const x of[-2.35,2.35])for(let z=-len/2+1.3;z<len/2-.4;z+=4.2)markBox(g,.085,1.6,whiteMat,x,.258,z);

    // Thin edge lines stop the asphalt from visually melting into the pavement.
    markBox(g,.075,len+.2,whiteMat,-4.30,.257,0);
    markBox(g,.075,len+.2,whiteMat,4.30,.257,0);

    g.position.set((a.x+b.x)/2,0,(a.z+b.z)/2);g.rotation.y=ang;root.add(g);
  }

  function crosswalkArm(g,rot,offset){
    const r=new THREE.Group();
    // stop line
    markBox(r,7.6,.16,whiteMat,0,.275,offset-1.12);
    // zebra stripes
    for(let x=-3.4;x<=3.4;x+=.72)markBox(r,.38,1.38,whiteMat,x,.278,offset);
    r.rotation.y=rot;g.add(r);
  }

  function junction(n,level){
    const wet=level.weather==='rain',d=degree(level,n.id),size=10.65,g=new THREE.Group();
    const surface=tiledPlane(size,size,wet?wetMat:asphaltMat,3.2);surface.position.y=.246;g.add(surface);

    // Corner pavement blocks create a proper city-junction silhouette instead of one flat black square.
    const corner=2.08;
    for(const x of[-1,1])for(const z of[-1,1]){
      const p=tiledPlane(corner,corner,concreteMat,2.1);
      p.position.set(x*(size/2-corner/2),.285,z*(size/2-corner/2));g.add(p);
    }

    if(d>=3){
      crosswalkArm(g,0,-4.00);
      crosswalkArm(g,Math.PI/2,-4.00);
      crosswalkArm(g,Math.PI,-4.00);
      crosswalkArm(g,-Math.PI/2,-4.00);
    }
    g.position.set(n.x,0,n.z);root.add(g);
  }

  function build(level){
    root.clear();
    if(root.parent!==world)world.add(root); // base.build() clears world; reattach every level.
    hideBaseRoads();
    const m=nodeMap(level);
    for(const e of level?.network?.edges||[]){const a=m.get(e.a),b=m.get(e.b);if(a&&b)segment(a,b,level)}
    for(const n of level?.network?.nodes||[])if(degree(level,n.id)>=2)junction(n,level);
  }

  return{build,root};
}
