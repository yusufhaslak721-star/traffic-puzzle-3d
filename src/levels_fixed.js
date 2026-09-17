import {levels as sourceLevels} from 'https://cdn.jsdelivr.net/gh/yusufhaslak721-star/traffic-puzzle-3d@35c0685c1a0e90be161ebb68d6ea71db2b744c50/src/levels100.js';

const VEHICLE_LENGTH={fire:4.15,truck:3.7,flatbed:3.7,delivery:3.7,ambulance:3.5,van:3.5,tractor:3.5,suv:3.15,luxury:3.15};
const vehicleLength=t=>VEHICLE_LENGTH[t]||2.95;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function routeLength(points){let d=0;for(let i=1;i<points.length;i++)d+=distance(points[i-1],points[i]);return d}
function startKey(v){return String(v.route?.name||'').split('-')[0]||`${v.route.points[0][0]},${v.route.points[0][1]}`}
function cloneLevel(level){return{...level,network:{...level.network,nodes:level.network.nodes.map(n=>({...n})),edges:level.network.edges.map(e=>({...e})),boundary:[...level.network.boundary]},vehicles:level.vehicles.map(v=>({...v,route:{...v.route,points:v.route.points.map(p=>[...p])}}))}}
function stabilizeStarts(level){
  const groups=new Map();
  for(const v of level.vehicles){const k=startKey(v);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v)}
  const keep=new Set();
  for(const group of groups.values()){
    const p=group[0].route.points,firstSeg=distance(p[0],p[1]);
    const frontClear=6.2,minFromBoundary=2.2,spacing=5.35;
    const capacity=Math.max(1,Math.floor(Math.max(0,firstSeg-frontClear-minFromBoundary)/spacing)+1);
    group.sort((a,b)=>vehicleLength(b.type)-vehicleLength(a.type)||a.id.localeCompare(b.id));
    const allowed=group.slice(0,capacity);
    for(let i=0;i<allowed.length;i++){
      const v=allowed[i],total=routeLength(v.route.points),along=Math.max(minFromBoundary,firstSeg-frontClear-i*spacing);
      v.start=+Math.min(.48,Math.max(.012,along/Math.max(total,1))).toFixed(4);keep.add(v.id)
    }
  }
  level.vehicles=level.vehicles.filter(v=>keep.has(v.id));return level
}
function pointAtStart(v){const p=v.route.points,total=routeLength(p);let left=(v.start||0)*total;for(let i=1;i<p.length;i++){const d=distance(p[i-1],p[i]);if(left<=d||i===p.length-1){const t=d?left/d:0;return[p[i-1][0]+(p[i][0]-p[i-1][0])*t,p[i-1][1]+(p[i][1]-p[i-1][1])*t]}left-=d}return[...p[0]]}
function removeResidualOverlaps(level){const out=[];for(const v of level.vehicles){const p=pointAtStart(v);let blocked=false;for(const q of out){const qp=pointAtStart(q),safe=(vehicleLength(v.type)+vehicleLength(q.type))*.5+.55;if(distance(p,qp)<safe){blocked=true;break}}if(!blocked)out.push(v)}level.vehicles=out;return level}
export const levels=sourceLevels.map(l=>removeResidualOverlaps(stabilizeStarts(cloneLevel(l))));
