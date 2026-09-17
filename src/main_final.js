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

const oldManeuver="function routeManeuver(route){const p=route.points;if(!p||p.length<2)return'straight';for(let i=1;i<p.length-1;i++){let ax=p[i][0]-p[i-1][0],az=p[i][1]-p[i-1][1],bx=p[i+1][0]-p[i][0],bz=p[i+1][1]-p[i][1],al=Math.hypot(ax,az)||1,bl=Math.hypot(bx,bz)||1;ax/=al;az/=al;bx/=bl;bz/=bl;const dot=ax*bx+az*bz;if(dot<.82)return az*bx-ax*bz>0?'left':'right'}return'straight'}";
const newManeuver="function routeManeuver(route){const p=route?.points;if(!p||p.length<3)return'straight';let ax=0,az=0,found=false;for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0],dz=p[i][1]-p[i-1][1],l=Math.hypot(dx,dz);if(l>.18){ax=dx/l;az=dz/l;found=true;break}}if(!found)return'straight';const cosLimit=.91;for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0],dz=p[i][1]-p[i-1][1],l=Math.hypot(dx,dz);if(l<.12)continue;const bx=dx/l,bz=dz/l,dot=ax*bx+az*bz,cross=az*bx-ax*bz;if(dot<cosLimit&&Math.abs(cross)>.18)return cross>0?'left':'right'}return'straight'}";
if(!source.includes(oldManeuver))throw new Error('routeManeuver patch target not found');
source=source.replace(oldManeuver,newManeuver);

const oldArrow="function addArrow(g,type,kind){const h=type==='fire'?2.55:['truck','flatbed','delivery','ambulance','van','tractor'].includes(type)?2.3:['suv','luxury'].includes(type)?2.05:1.9,s=new THREE.Sprite(new THREE.SpriteMaterial({map:arrowTexture(kind),transparent:true,depthTest:false,depthWrite:false}));s.position.set(0,h+.58,0);s.scale.set(1.5,1.72,1);s.renderOrder=30;g.add(s);g.userData.arrow=s}";
const newArrow="function addArrow(g,type,kind){const h=type==='fire'?2.55:['truck','flatbed','delivery','ambulance','van','tractor'].includes(type)?2.3:['suv','luxury'].includes(type)?2.05:1.9,geo=new THREE.PlaneGeometry(1.5,1.72),material=new THREE.MeshBasicMaterial({map:arrowTexture(kind),transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide}),s=new THREE.Mesh(geo,material);s.position.set(0,h+.62,0);s.rotation.x=Math.PI/2;s.renderOrder=30;g.add(s);g.userData.arrow=s}";
if(!source.includes(oldArrow))throw new Error('addArrow patch target not found');
source=source.replace(oldArrow,newArrow);

source=source.replace("Math.min(100,+(localStorage.tp3dUnlocked||1))","Math.min(250,+(localStorage.tp3dUnlocked||1))");

new Function('THREE','GLTFLoader','levels','createEnvironment',source)(THREE,GLTFLoader,levels,createEnvironment);
