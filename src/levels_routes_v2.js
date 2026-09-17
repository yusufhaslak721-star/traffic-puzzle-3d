import {levels as sourceLevels} from './levels_base.js';

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
function hashId(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function routeStats(network,ids){
  const map=nodeMap(network),pts=ids.map(id=>map.get(id)).filter(Boolean),dirs=[];
  for(let i=1;i<pts.length;i++){const dx=pts[i].x-pts[i-1].x,dz=pts[i].z-pts[i-1].z,l=Math.hypot(dx,dz)||1;dirs.push([dx/l,dz/l])}
  let turns=0,maneuver='straight';
  for(let i=1;i<dirs.length;i++){
    const a=dirs[i-1],b=dirs[i],dot=a[0]*b[0]+a[1]*b[1];
    if(dot<.985){
      turns++;
      if(maneuver==='straight'){
        const cross=a[1]*b[0]-a[0]*b[1];
        maneuver=cross>0?'right':'left';
      }
    }
  }
  const junctions=ids.filter(id=>String(id).startsWith('I')).length;
  return{turns,junctions,segments:Math.max(0,ids.length-1),maneuver};
}
function routeOptions(network,src){
  const options=(network.boundary||[]).filter(dst=>dst!==src).map(dst=>{
    const ids=pathIds(network,src,dst);if(ids.length<2)return null;
    return{dst,ids,...routeStats(network,ids)};
  }).filter(Boolean);
  if(!options.length)return[];

  let pool=options.filter(o=>o.turns<=1&&o.junctions<=3);
  if(!pool.length)pool=options.filter(o=>o.turns<=1);
  if(!pool.length){
    const bestTurns=Math.min(...options.map(o=>o.turns));
    pool=options.filter(o=>o.turns===bestTurns);
  }
  pool.sort((a,b)=>a.turns-b.turns||a.junctions-b.junctions||a.segments-b.segments||String(a.dst).localeCompare(String(b.dst)));
  return pool;
}
function assignRoutesForSource(level,src,group){
  const options=routeOptions(level.network,src);if(!options.length)return;
  const by=new Map();
  for(const o of options){if(!by.has(o.maneuver))by.set(o.maneuver,[]);by.get(o.maneuver).push(o)}
  const preferredOrder=['left','straight','right'].filter(k=>by.has(k));
  const classes=preferredOrder.length?preferredOrder:[...by.keys()];
  const offset=classes.length?hashId(`${level.number||0}:${src}`)%classes.length:0;
  const usage=new Map();
  group.sort((a,b)=>String(a.id).localeCompare(String(b.id)));

  for(let i=0;i<group.length;i++){
    const v=group[i],cls=classes[(i+offset)%classes.length],choices=by.get(cls)||options;
    choices.sort((a,b)=>(usage.get(a.dst)||0)-(usage.get(b.dst)||0)||a.junctions-b.junctions||a.segments-b.segments);
    const choice=choices[0]||options[i%options.length];
    usage.set(choice.dst,(usage.get(choice.dst)||0)+1);
    v.route={name:`${src}-${choice.dst}`,points:buildLaneRoute(level.network,choice.ids,1.78)};
    v.userData={...(v.userData||{}),routeManeuver:choice.maneuver};
  }
}

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
  for(const v of level.vehicles){const[src]=parseRoute(v);if(!src)continue;if(!groups.has(src))groups.set(src,[]);groups.get(src).push(v)}
  for(const [src,group] of groups)assignRoutesForSource(level,src,group);

  for(const group of groups.values()){
    group.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    let along=3.0;
    for(const v of group){const len=routeLength(v.route.points);v.start=+Math.min(.42,along/Math.max(1,len)).toFixed(4);along+=vLength(v.type)+1.15}
  }
  return level;
}

export const levels=sourceLevels.map(l=>rebuildLevel(cloneLevel(l)));
