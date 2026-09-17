import * as THREE from 'three';

// Continuous world-mapped CC0 AmbientCG road surfaces. The UVs are derived
// from world X/Z coordinates, so adjoining road pieces share the same texture
// phase instead of looking like separate stickers pasted together.
const ASPHALT='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Asphalt021_2K-JPG/Asphalt021_2K-JPG_Color.jpg';
const CONCRETE='https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Concrete012_2K-JPG/Concrete012_2K-JPG_Color.jpg';

function loadTexture(url){
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

const asphaltMap=loadTexture(ASPHALT);
const concreteMap=loadTexture(CONCRETE);

export function createPremiumRoads(world){
  const root=new THREE.Group();
  root.name='premium-road-layer-v5';

  const asphaltMat=new THREE.MeshStandardMaterial({color:0xf0efec,map:asphaltMap,roughness:.89,metalness:.006,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const wetMat=new THREE.MeshStandardMaterial({color:0xd8e0e5,map:asphaltMap,roughness:.34,metalness:.10,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const concreteMat=new THREE.MeshStandardMaterial({color:0xe0dbd2,map:concreteMap,roughness:.94,metalness:0});
  const curbMat=new THREE.MeshStandardMaterial({color:0xc8c4bb,roughness:.92});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf5f3ec,roughness:.7});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xf2c43e,roughness:.68});
  const gutterMat=new THREE.MeshStandardMaterial({color:0x282c2f,roughness:.96});

  const ROAD_W=9.55, WALK_W=.92, TEX_SCALE=5.6;
  const nodeMap=level=>new Map((level?.network?.nodes||[]).map(n=>[n.id,n]));
  function degree(level,id){let d=0;for(const e of level?.network?.edges||[])if(e.a===id||e.b===id)d++;return d}
  function connected(level,id){
    const m=nodeMap(level),n=m.get(id),out=[];if(!n)return out;
    for(const e of level?.network?.edges||[]){
      const o=e.a===id?m.get(e.b):e.b===id?m.get(e.a):null;
      if(o)out.push(o);
    }
    return out;
  }
  function directions(level,id){
    const m=nodeMap(level),n=m.get(id);if(!n)return[];
    return connected(level,id).map(o=>{
      const dx=o.x-n.x,dz=o.z-n.z;
      return Math.abs(dx)>Math.abs(dz)?(dx>0?'E':'W'):(dz>0?'S':'N');
    });
  }
  function isBend(level,id){
    if(degree(level,id)!==2)return false;
    const m=nodeMap(level),n=m.get(id),c=connected(level,id);if(!n||c.length!==2)return false;
    const a=[c[0].x-n.x,c[0].z-n.z],b=[c[1].x-n.x,c[1].z-n.z];
    const al=Math.hypot(...a)||1,bl=Math.hypot(...b)||1;
    return Math.abs((a[0]/al)*(b[0]/bl)+(a[1]/al)*(b[1]/bl))<.25;
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

  function quad(points,y,material,uvScale=TEX_SCALE){
    const pos=[],uv=[];
    for(const [x,z] of points){pos.push(x,y,z);uv.push(x/uvScale,z/uvScale)}
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex([0,1,2,0,2,3]);
    geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,material);m.receiveShadow=true;root.add(m);return m;
  }

  function ribbon(a,b,width,offset,y,material,uvScale=TEX_SCALE){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)return null;
    const nx=-dz/len,nz=dx/len,c1=[a.x+nx*offset,a.z+nz*offset],c2=[b.x+nx*offset,b.z+nz*offset],h=width/2;
    return quad([
      [c1[0]-nx*h,c1[1]-nz*h],
      [c1[0]+nx*h,c1[1]+nz*h],
      [c2[0]+nx*h,c2[1]+nz*h],
      [c2[0]-nx*h,c2[1]-nz*h]
    ],y,material,uvScale);
  }

  function rect(cx,cz,w,d,y,material,uvScale=TEX_SCALE){
    return quad([[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]],y,material,uvScale);
  }

  function mark(cx,cz,w,d,y,material,rot=0){
    const q=new THREE.Mesh(new THREE.BoxGeometry(w,.024,d),material);q.position.set(cx,y,cz);q.rotation.y=rot;q.receiveShadow=true;root.add(q);return q;
  }

  function roadSegment(a,b,level){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.5)return;
    const ux=dx/len,uz=dz/len,ang=Math.atan2(dx,dz),wet=level.weather==='rain';

    // Asphalt runs continuously node-to-node. The global UV mapping means bends
    // and intersections no longer restart the texture at every piece boundary.
    ribbon(a,b,ROAD_W,0,.235,wet?wetMat:asphaltMat);
    ribbon(a,b,.18,-(ROAD_W/2-.09),.246,gutterMat);
    ribbon(a,b,.18, ROAD_W/2-.09,.246,gutterMat);
    ribbon(a,b,WALK_W,-(ROAD_W/2+WALK_W/2+.10),.272,concreteMat,3.15);
    ribbon(a,b,WALK_W, ROAD_W/2+WALK_W/2+.10,.272,concreteMat,3.15);
    ribbon(a,b,.14,-(ROAD_W/2+.03),.312,curbMat,3.15);
    ribbon(a,b,.14, ROAD_W/2+.03,.312,curbMat,3.15);

    // Keep markings away from busy nodes so lines don't form ugly X shapes.
    const trimA=degree(level,a.id)>=2?2.35:.45,trimB=degree(level,b.id)>=2?2.35:.45;
    const usable=Math.max(0,len-trimA-trimB);
    if(usable>.7){
      const sx=a.x+ux*trimA,sz=a.z+uz*trimA;
      const ex=b.x-ux*trimB,ez=b.z-uz*trimB;
      for(let s=.8;s<usable-.4;s+=3.35){
        const x=sx+ux*s,z=sz+uz*s;
        mark(x-(-uz)*.11,z-(ux)*.11,.095,1.48,.265,yellowMat,ang);
        mark(x+(-uz)*.11,z+(ux)*.11,.095,1.48,.265,yellowMat,ang);
      }
      for(const off of[-2.34,2.34])for(let s=1;s<usable-.4;s+=4.3){
        const x=sx+ux*s+(-uz)*off,z=sz+uz*s+(ux)*off;
        mark(x,z,.08,1.58,.263,whiteMat,ang);
      }
      // edge lines are continuous and make the carriageway read as one road.
      ribbon({x:sx,z:sz},{x:ex,z:ez},.07,-4.30,.263,whiteMat,3.2);
      ribbon({x:sx,z:sz},{x:ex,z:ez},.07, 4.30,.263,whiteMat,3.2);
    }
  }

  function crosswalk(n,dir){
    const cfg={N:[0,-3.65,0],S:[0,3.65,Math.PI],E:[3.65,0,-Math.PI/2],W:[-3.65,0,Math.PI/2]}[dir];
    if(!cfg)return;
    const [ox,oz,rot]=cfg;
    mark(n.x+ox,n.z+oz,7.45,.15,.292,whiteMat,rot);
    for(let i=-4;i<=4;i++)mark(n.x+ox+(dir==='N'||dir==='S'?i*.72:0),n.z+oz+(dir==='E'||dir==='W'?i*.72:0),.37,1.12,.294,whiteMat,rot);
  }

  function nodeJoin(n,level){
    const d=degree(level,n.id),bend=isBend(level,n.id),wet=level.weather==='rain';
    if(d<3&&!bend)return;
    // This patch sits just below the incoming strips and uses the same world UVs,
    // so it only fills the inner corner/hub without looking like a separate tile.
    const size=d>=3?ROAD_W+.32:ROAD_W+.08;
    rect(n.x,n.z,size,size,.231,wet?wetMat:asphaltMat);

    const dirs=directions(level,n.id);
    if(d>=3)for(const dir of dirs)crosswalk(n,dir);

    // Small outside pavement corners soften L/T shapes without covering the road.
    const corner=1.18,edge=ROAD_W/2+corner/2+.02;
    const occupied=new Set(dirs);
    const corners=[['N','E',1,-1],['E','S',1,1],['S','W',-1,1],['W','N',-1,-1]];
    for(const [a,b,sx,sz] of corners){
      if(occupied.has(a)&&occupied.has(b))continue;
      rect(n.x+sx*edge,n.z+sz*edge,corner,corner,.276,concreteMat,3.15);
    }
  }

  function build(level){
    root.clear();
    if(root.parent!==world)world.add(root);
    hideBaseRoads();
    const m=nodeMap(level);
    for(const e of level?.network?.edges||[]){const a=m.get(e.a),b=m.get(e.b);if(a&&b)roadSegment(a,b,level)}
    for(const n of level?.network?.nodes||[])nodeJoin(n,level);
  }

  return{build,root};
}
