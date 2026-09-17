import {levels as sourceLevels} from './levels_base.js';

const VEHICLE_LENGTH={fire:4.15,truck:3.7,flatbed:3.7,delivery:3.7,ambulance:3.5,van:3.5,tractor:3.5,suv:3.15,luxury:3.15};
const vLength=t=>VEHICLE_LENGTH[t]||2.95;
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const round=p=>[+p[0].toFixed(3),+p[1].toFixed(3)];

function cloneLevel(level){
  return {...level,network:{...level.network,nodes:level.network.nodes.map(n=>({...n})),edges:level.network.edges.map(e=>({...e})),boundary:[...level.network.boundary]},vehicles:level.vehicles.map(v=>({...v,userData:{...(v.userData||{})},route:{...v.route,points:v.route.points.map(p=>[...p])}}))};
}
function nodeMap(network){return new Map(network.nodes.map(n=>[n.id,n]))}
function adjacency(network){const a=new Map(network.nodes.map(n=>[n.id,[]]));for(const e of network.edges){a.get(e.a)?.push(e.b);a.get(e.b)?.push(e.a)}return a}
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
    if(dot>.985){const target=[c[0]+nin[0]*lane,c[1]+nin[1]*lane];addLine(out,out[out.length-1],target);continue}
    const r=3.15;
    const approach=[c[0]-din[0]*r+nin[0]*lane,c[1]-din[1]*r+nin[1]*lane];
    const exit=[c[0]+dout[0]*r+nout[0]*lane,c[1]+dout[1]*r+nout[1]*lane];
    const control=[c[0]+(nin[0]+nout[0])*lane,c[1]+(nin[1]+nout[1])*lane];
    addLine(out,out[out.length-1],approach);
    for(const t of[.5,1])addPoint(out,quad(approach,control,exit,t));
  }
  const last=centers.length-1,nl=normalRight(dirs[dirs.length-1]),end=[centers[last][0]+nl[0]*lane,centers[last][1]+nl[1]*lane];
  addLine(out,out[out.length-1],end);
  return out;
}

function parseRoute(v){const s=String(v.route?.name||'').split('-');return[s[0],s[1]]}
function classifyTurn(map,prevId,junctionId,nextId){
  const p=map.get(prevId),j=map.get(junctionId),n=map.get(nextId);if(!p||!j||!n)return'straight';
  const a=direction([p.x,p.z],[j.x,j.z]),b=direction([j.x,j.z],[n.x,n.z]);
  const dot=a[0]*b[0]+a[1]*b[1],cross=a[1]*b[0]-a[0]*b[1];
  if(dot>.86)return'straight';
  return cross>0?'right':'left';
}
function nearestBoundaryPath(network,start,blocked,forbiddenBoundary){
  const adj=adjacency(network),boundary=new Set((network.boundary||[]).filter(x=>x!==forbiddenBoundary)),q=[start],prev=new Map([[start,null]]);
  let end=boundary.has(start)?start:null;
  while(q.length&&!end){
    const cur=q.shift();
    for(const nx of adj.get(cur)||[]){
      if(nx===blocked||prev.has(nx))continue;
      prev.set(nx,cur);
      if(boundary.has(nx)){end=nx;break}
      q.push(nx);
    }
  }
  if(!end)return null;
  const out=[];for(let c=end;c!=null;c=prev.get(c))out.push(c);return out.reverse();
}
function firstBranch(network,src){
  const adj=adjacency(network),prefix=[src];
  let prev=null,cur=src;
  for(let guard=0;guard<32;guard++){
    const nexts=(adj.get(cur)||[]).filter(x=>x!==prev);
    if(cur!==src&&nexts.length>=2)return{prefix,prev,junction:cur,nexts};
    if(!nexts.length)return null;
    const nx=nexts[0];prev=cur;cur=nx;prefix.push(cur);
    if((network.boundary||[]).includes(cur)&&cur!==src)return null;
  }
  return null;
}
function branchOptions(network,src){
  const br=firstBranch(network,src),map=nodeMap(network);
  if(!br)return[];
  const out=[];
  for(const nx of br.nexts){
    const tail=nearestBoundaryPath(network,nx,br.junction,src);if(!tail)continue;
    const ids=[...br.prefix,...tail];
    const maneuver=classifyTurn(map,br.prev,br.junction,nx);
    out.push({maneuver,ids,dst:ids[ids.length-1],segments:ids.length-1});
  }
  out.sort((a,b)=>a.segments-b.segments||String(a.dst).localeCompare(String(b.dst)));
  return out;
}
function fallbackRoute(network,src,preferredDst){
  const adj=adjacency(network),q=[src],prev=new Map([[src,null]]),target=preferredDst&&preferredDst!==src?preferredDst:(network.boundary||[]).find(x=>x!==src);
  if(!target)return null;
  while(q.length){const cur=q.shift();if(cur===target)break;for(const nx of adj.get(cur)||[])if(!prev.has(nx)){prev.set(nx,cur);q.push(nx)}}
  if(!prev.has(target))return null;
  const ids=[];for(let c=target;c!=null;c=prev.get(c))ids.push(c);ids.reverse();
  return{maneuver:'straight',ids,dst:target,segments:ids.length-1};
}
function assignRoutesForSource(level,src,group){
  let options=branchOptions(level.network,src);
  if(!options.length){const f=fallbackRoute(level.network,src,parseRoute(group[0]||{})[1]);if(f)options=[f]}
  if(!options.length)return;

  const by=new Map();for(const o of options){if(!by.has(o.maneuver))by.set(o.maneuver,[]);by.get(o.maneuver).push(o)}
  const classOrder=['left','straight','right'].filter(k=>by.has(k));
  const classes=classOrder.length?classOrder:[...by.keys()];
  const classUse=new Map(),routeUse=new Map();
  group.sort((a,b)=>String(a.id).localeCompare(String(b.id)));

  for(let i=0;i<group.length;i++){
    // Always pick the least-used manoeuvre first. This explicitly prevents a queue
    // of 4-5 cars from all receiving the same arrow when alternatives exist.
    const cls=[...classes].sort((a,b)=>(classUse.get(a)||0)-(classUse.get(b)||0)||classes.indexOf(a)-classes.indexOf(b))[0];
    const choices=[...(by.get(cls)||options)].sort((a,b)=>(routeUse.get(a.dst)||0)-(routeUse.get(b.dst)||0)||a.segments-b.segments);
    const choice=choices[0];
    classUse.set(cls,(classUse.get(cls)||0)+1);routeUse.set(choice.dst,(routeUse.get(choice.dst)||0)+1);
    const v=group[i];
    v.route={name:`${src}-${choice.dst}`,points:buildLaneRoute(level.network,choice.ids,1.78)};
    v.userData={...(v.userData||{}),routeManeuver:choice.maneuver};
  }
}

function extendBusyEntries(level){
  const groups=new Map();for(const v of level.vehicles){const[src]=parseRoute(v);if(!src)continue;if(!groups.has(src))groups.set(src,[]);groups.get(src).push(v)}
  const map=nodeMap(level.network),adj=adjacency(level.network);
  for(const[src,group]of groups){
    const b=map.get(src),nextId=(adj.get(src)||[])[0],j=map.get(nextId);if(!b||!j)continue;
    const longest=Math.max(...group.map(v=>vLength(v.type))),needed=3+Math.max(0,group.length-1)*(longest+1.05)+6,current=Math.hypot(b.x-j.x,b.z-j.z);
    if(current>=needed)continue;
    const dx=(b.x-j.x)/(current||1),dz=(b.z-j.z)/(current||1),extra=Math.min(11,needed-current);
    b.x=+(b.x+dx*extra).toFixed(2);b.z=+(b.z+dz*extra).toFixed(2);
  }
}
function rebuildLevel(level){
  extendBusyEntries(level);
  const groups=new Map();for(const v of level.vehicles){const[src]=parseRoute(v);if(!src)continue;if(!groups.has(src))groups.set(src,[]);groups.get(src).push(v)}
  for(const [src,group] of groups)assignRoutesForSource(level,src,group);
  for(const group of groups.values()){
    group.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    let along=2.7;
    for(const v of group){const len=Math.max(1,routeLength(v.route.points));v.start=+Math.min(.45,along/len).toFixed(4);along+=vLength(v.type)+.95}
  }
  return level;
}

export const levels=sourceLevels.map(l=>rebuildLevel(cloneLevel(l)));
