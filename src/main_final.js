import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import {levels} from './levels100.js';
import {createEnvironment} from './environment_v4.js';

const sourceUrl=new URL('./main_v4.js',import.meta.url);
let source=await (await fetch(sourceUrl,{cache:'no-store'})).text();

source=source
  .replace("import * as THREE from 'three';\n",'')
  .replace("import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';\n",'')
  .replace("import {levels} from './levels100.js';\n",'')
  .replace("import {createEnvironment} from './environment_v4.js';\n",'');

const helpers=`
function stylizeVehicleGroup(group,v){
  if(!group||group.userData.__styled)return;
  group.userData.__styled=true;
  const len=v?.type==='fire'?4.2:['truck','flatbed','delivery'].includes(v?.type)?3.75:['ambulance','van','tractor'].includes(v?.type)?3.5:['suv','luxury'].includes(v?.type)?3.18:2.98;
  const wid=['truck','flatbed','delivery','ambulance','van','tractor','fire'].includes(v?.type)?1.6:1.42;

  const shadow=new THREE.Mesh(
    new THREE.CircleGeometry(.95,28),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.2,depthWrite:false})
  );
  shadow.rotation.x=-Math.PI/2;
  shadow.position.y=.025;
  shadow.scale.set(len*.44,wid*.82,1);
  shadow.renderOrder=-3;
  group.add(shadow);

  group.traverse(o=>{
    if(!o.isMesh||o===shadow||o===group.userData.arrow||(group.userData.flash||[]).includes(o))return;
    const name=(o.name||'').toLowerCase();
    const isWheel=/wheel|tire|tyre|rim/.test(name);
    const isGlass=/glass|window|windshield|windscreen/.test(name);
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const upgraded=mats.map(m=>{
      if(!m)return m;
      const mm=new THREE.MeshPhysicalMaterial({
        color:m.color?m.color.clone():new THREE.Color(0xffffff),
        map:m.map||null,
        transparent:!!m.transparent,
        opacity:m.opacity??1,
        side:m.side??THREE.FrontSide,
        roughness:isWheel?.9:(isGlass?.07:.28),
        metalness:isWheel?.45:(isGlass?0:.16),
        clearcoat:isWheel?0:.95,
        clearcoatRoughness:isWheel?1:.13,
        envMapIntensity:isWheel?.28:(isGlass?1.15:.75)
      });
      if(isGlass){
        mm.color=new THREE.Color(0x9fc6df);
        mm.transmission=.16;
        mm.thickness=.12;
        mm.ior=1.16;
        mm.opacity=.94;
      }
      if(['police','ambulance','fire'].includes(v?.type)&&!isWheel&&!isGlass){
        mm.clearcoat=1;
        mm.clearcoatRoughness=.09;
      }
      return mm;
    });
    o.material=Array.isArray(o.material)?upgraded:upgraded[0];
    o.castShadow=true;
    o.receiveShadow=true;
  });

  const lamp=(x,z,c,e)=>{
    const m=new THREE.Mesh(
      new THREE.BoxGeometry(.18,.1,.08),
      new THREE.MeshStandardMaterial({color:c,emissive:e,emissiveIntensity:1.8,roughness:.25})
    );
    m.position.set(x,.62,z);
    group.add(m);
  };
  lamp(-wid*.27,len*.48,0xfff0bd,0xffc34d);
  lamp(wid*.27,len*.48,0xfff0bd,0xffc34d);
  lamp(-wid*.27,-len*.48,0xff4b54,0xff1625);
  lamp(wid*.27,-len*.48,0xff4b54,0xff1625);
}
`;
source=helpers+'\n'+source;

source=source.replace("renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));","renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));");
source=source.replace("sun.shadow.mapSize.set(1536,1536)","sun.shadow.mapSize.set(2048,2048)");

const oldManeuver="function routeManeuver(route){const p=route.points;if(!p||p.length<2)return'straight';for(let i=1;i<p.length-1;i++){let ax=p[i][0]-p[i-1][0],az=p[i][1]-p[i-1][1],bx=p[i+1][0]-p[i][0],bz=p[i+1][1]-p[i][1],al=Math.hypot(ax,az)||1,bl=Math.hypot(bx,bz)||1;ax/=al;az/=al;bx/=bl;bz/=bl;const dot=ax*bx+az*bz;if(dot<.82)return az*bx-ax*bz>0?'left':'right'}return'straight'}";
const newManeuver="function routeManeuver(route,start=0){const p=route?.points;if(!p||p.length<3)return'straight';const curve=new THREE.CatmullRomCurve3(p.map(q=>new THREE.Vector3(q[0],.13,q[1])),false,'centripetal',.22);curve.arcLengthDivisions=420;const u0=THREE.MathUtils.clamp(start||0,0,.94),a=curve.getTangentAt(u0);a.y=0;if(a.lengthSq()<.0001)return'straight';a.normalize();const samples=96,end=.995;for(let i=1;i<=samples;i++){const u=u0+(end-u0)*(i/samples),b=curve.getTangentAt(u);b.y=0;if(b.lengthSq()<.0001)continue;b.normalize();const dot=THREE.MathUtils.clamp(a.x*b.x+a.z*b.z,-1,1),cross=a.z*b.x-a.x*b.z;if(dot<.965&&Math.abs(cross)>.2)return cross>0?'right':'left'}return'straight'}";
if(!source.includes(oldManeuver))throw new Error('routeManeuver patch target not found');
source=source.replace(oldManeuver,newManeuver);
source=source.replace("const maneuver=routeManeuver(d.route),mesh=fallback(d,maneuver)","const maneuver=routeManeuver(d.route,d.start||0),mesh=fallback(d,maneuver)");

const oldArrow="function addArrow(g,type,kind){const h=type==='fire'?2.55:['truck','flatbed','delivery','ambulance','van','tractor'].includes(type)?2.3:['suv','luxury'].includes(type)?2.05:1.9,s=new THREE.Sprite(new THREE.SpriteMaterial({map:arrowTexture(kind),transparent:true,depthTest:false,depthWrite:false}));s.position.set(0,h+.58,0);s.scale.set(1.5,1.72,1);s.renderOrder=30;g.add(s);g.userData.arrow=s}";
const newArrow="function addArrow(g,type,kind){const h=type==='fire'?2.55:['truck','flatbed','delivery','ambulance','van','tractor'].includes(type)?2.3:['suv','luxury'].includes(type)?2.05:1.9,geo=new THREE.PlaneGeometry(1.5,1.72),material=new THREE.MeshBasicMaterial({map:arrowTexture(kind),transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide}),s=new THREE.Mesh(geo,material);s.position.set(0,h+.62,0);s.rotation.x=Math.PI/2;s.renderOrder=30;g.add(s);g.userData.arrow=s}";
if(!source.includes(oldArrow))throw new Error('addArrow patch target not found');
source=source.replace(oldArrow,newArrow);

source=source.replace("addArrow(g,v.type,kind);return g}","addArrow(g,v.type,kind);stylizeVehicleGroup(g,v);return g}");
source=source.replace("addArrow(outer,v.type,kind);return outer}","addArrow(outer,v.type,kind);stylizeVehicleGroup(outer,v);return outer}");
source=source.replace("Math.min(100,+(localStorage.tp3dUnlocked||1))","Math.min(250,+(localStorage.tp3dUnlocked||1))");

new Function('THREE','GLTFLoader','levels','createEnvironment',source)(THREE,GLTFLoader,levels,createEnvironment);
