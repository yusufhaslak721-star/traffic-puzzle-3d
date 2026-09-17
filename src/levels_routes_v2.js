import {levels as sourceLevels} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/levels100.js';

const VEHICLE_LENGTH={fire:4.15,truck:3.7,flatbed:3.7,delivery:3.7,ambulance:3.5,van:3.5,tractor:3.5,suv:3.15,luxury:3.15};
const vLength=t=>VEHICLE_LENGTH[t]||2.95;
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const round=p=>[+p[0].toFixed(3),+p[1].toFixed(3)];

function cloneLevel(level){
  return {...level,network:{...level.network,nodes:level.network.nodes.map(n=>({...n})),edges:level.network.edges.map(e=>({...e})),boundary:[...level.network.boundary]},vehicles:level.vehicles.map(v=>({...v,route:{...v.route,points:v.route.points.map(p=>[...p])}}))};
}
function nodeMap(network){return new Map(network.nodes.map(n=>[n.id,n]))}
function adjacency(network){const a=new Map(network.nodes.map(n=>[n.id,[]]));for(const e of network.edges){a.get(e.a)?.push(e.b);a.get(e.b)?.push(e.a)}return a}
function pathIds(network,start,end){
  const adj=adjacency(network),q=[start],prev=new Map([[start,null]]);
  while(q.length){const cur=q.shift();if(cur===end)break;for(const nx of adj.get(cur)||[])if(!prev.has(nx)){prev.set(nx,cur);q.push(nx)}}
  if(!prev.has(end))return[];
  const out=[];for(let c=end;c!=null;c=prev.get(c))out.push(c);return out.reverse();
}
function routeLength(points){let d=0;for(let i=1;i<points.length;i++)d+=dist(points[i-1],points[i]);return d}
function direction(a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]}
function normalRight(d){return[d[1],-d[0]]}
function addPoint(out,p){const q=round(p),last=out[out.length-1];if(!last||dist(last,q)>.08)out.push(q)}
function addLine(out,a,b,step=3.2){const d=dist(a,b),n=Math.max(1,Math.ceil(d/step));for(let i=1;i<=n;i++){const t=i/n;addPoint(out,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}
function quad(a,c,b,t){const u=1-t;return[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]]}

function buildLaneRoute(network,ids,lane=1.78){
  const map=nodeMap(network),centers=ids.map(id=>{const n=map.get(id);return[n.x,n.z]});
  if(centers.length<2)return centers;
  const dirs=[];for(let i=0;i<centers.length-1;i++)dirs.push(direction(centers[i],centers[i+1]));
  const out=[],n0=normalRight(dirs[0]);
  addPoint(out,[centers[0][0]+n0[0]*lane,centers[0][1]+n0[1]*lane]);
  for(let i=1;i<centers.length-1;i++){
    const c=centers[i],din=dirs[i-1],dout=dirs[i],nin=normalRight(din),nout=normalRight(dout),dot=din[0]*dout[0]+din[1]*dout[1];
    if(dot>.985){
      const target=[c[0]+nin[0]*lane,c[1]+nin[1]*lane];addLine(out,out[out.length-1],target);continue;
    }
    // Enter the junction straight, turn on a compact radius, and exit straight.
    // Dense samples keep Three.js CatmullRom from cutting corners or zig-zagging.
    const r=3.15;
    const approach=[c[0]-din[0]*r+nin[0]*lane,c[1]-din[1]*r+nin[1]*lane];
    const exit=[c[0]+dout[0]*r+nout[0]*lane,c[1]+dout[1]*r+nout[1]*lane];
    const control=[c[0]+(nin[0]+nout[0])*lane,c[1]+(nin[1]+nout[1])*lane];
    addLine(out,out[out.length-1],approach);
    for(const t of[.18,.36,.54,.72,.9,1])addPoint(out,quad(approach,control,exit,t));
  }
  const last=centers.length-1,nl=normalRight(dirs[dirs.length-1]),end=[centers[last][0]+nl[0]*lane,centers[last][1]+nl[1]*lane];
  addLine(out,out[out.length-1],end);
  return out;
}

function parseRoute(v){const s=String(v.route?.name||'').split('-');return[s[0],s[1]]}
function extendBusyEntries(level){
  const groups=new Map();
  for(const v of level.vehicles){const[src]=parseRoute(v);if(!src)continue;if(!groups.has(src))groups.set(src,[]);groups.get(src).push(v)}
  const map=nodeMap(level.network),adj=adjacency(level.network);
  for(const[src,group]of groups){
    const b=map.get(src),nextId=(adj.get(src)||[])[0],j=map.get(nextId);if(!b||!j)continue;
    const longest=Math.max(...group.map(v=>vLength(v.type))),needed=3.0+Math.max(0,group.length-1)*(longest+1.15)+6.3,current=Math.hypot(b.x-j.x,b.z-j.z);
    if(current>=needed)continue;
    const dx=(b.x-j.x)/(current||1),dz=(b.z-j.z)/(current||1),extra=Math.min(10,needed-current);
    b.x=+(b.x+dx*extra).toFixed(2);b.z=+(b.z+dz*extra).toFixed(2);
  }
}
function rebuildLevel(level){
  extendBusyEntries(level);
  const groups=new Map();
  for(const v of level.vehicles){const[src,dst]=parseRoute(v),ids=pathIds(level.network,src,dst);if(ids.length<2)continue;v.route={name:`${src}-${dst}`,points:buildLaneRoute(level.network,ids,1.78)};if(!groups.has(src))groups.set(src,[]);groups.get(src).push(v)}
  for(const group of groups.values()){
    group.sort((a,b)=>a.id.localeCompare(b.id));
    let along=3.0;
    for(const v of group){const len=routeLength(v.route.points);v.start=+Math.min(.42,along/Math.max(1,len)).toFixed(4);along+=vLength(v.type)+1.15}
  }
  return level;
}

export const levels=sourceLevels.map(l=>rebuildLevel(cloneLevel(l)));
