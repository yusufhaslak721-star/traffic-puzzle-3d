import {levels as generatedLevels} from './levels_routes_v2.js';

const trStages=['Başlangıç','Akış','Şehir','Kavşak','Yoğunluk','Ustalık','Karma Ağ','Büyük Şehir','Mega Trafik','Final'];
const enStages=['Opening','Flow','City','Junction','Rush','Expert','Complex Grid','Big City','Mega Traffic','Final'];
const score=l=>{
  const turns=(l.vehicles||[]).reduce((n,v)=>n+Math.max(0,(v.route?.points?.length||2)-2),0);
  const special=(l.vehicles||[]).filter(v=>['police','ambulance','fire','truck','flatbed','tractor'].includes(v.type)).length;
  return (l.intersectionCount||1)*10000+(l.vehicles?.length||0)*260+turns*12+special*7+(l.difficulty||0);
};
const ordered=[...generatedLevels].sort((a,b)=>score(a)-score(b)||a.number-b.number);

const COLORS=[0xff453a,0x3287ff,0xffcf24,0x2ed66f,0xf8fbff,0xff8d24,0x303841,0xff58ad,0xa35cff,0x28d0ef,0xa3ea2b,0xff6f61,0x28b8a7,0xffb52e,0x203a72,0x55d6b2];
const VEHICLE_LENGTH={fire:4.15,truck:3.7,flatbed:3.7,delivery:3.7,ambulance:3.5,van:3.5,tractor:3.5,suv:3.15,luxury:3.15};
const vLength=t=>VEHICLE_LENGTH[t]||2.95;
function routeLength(points){let d=0;for(let i=1;i<(points?.length||0);i++)d+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);return d}
function sourceOf(v){return String(v.route?.name||'').split('-')[0]||'X'}
function targetVehicles(n){
  if(n<=3)return 5;
  if(n<=7)return 6;
  if(n<=12)return 7;
  if(n<=17)return 9;
  if(n<=25)return 11;
  if(n<=40)return 12;
  if(n<=60)return 14;
  if(n<=90)return 16;
  if(n<=130)return 18;
  if(n<=180)return 20;
  if(n<=220)return 22;
  return 25;
}

function strengthenLevel(level,n){
  const vehicles=(level.vehicles||[]).map(v=>({...v,route:{...v.route,points:(v.route?.points||[]).map(p=>[...p])}}));
  const boundaryCount=Math.max(1,level.network?.boundary?.length||1);
  const target=Math.min(25,boundaryCount*3,targetVehicles(n));
  if(!vehicles.length)return {...level,vehicles};

  // Add cars to the least-populated entrances first. This creates several queues
  // converging on the same junctions, which makes tap order matter without making
  // any individual car snake through multiple turns.
  const sourceCounts=new Map();
  for(const v of vehicles)sourceCounts.set(sourceOf(v),(sourceCounts.get(sourceOf(v))||0)+1);
  let extra=0;
  while(vehicles.length<target){
    const candidates=[...vehicles].sort((a,b)=>{
      const ca=sourceCounts.get(sourceOf(a))||0,cb=sourceCounts.get(sourceOf(b))||0;
      if(ca!==cb)return ca-cb;
      return String(a.id).localeCompare(String(b.id));
    });
    const base=candidates[(n*7+extra*3)%Math.min(candidates.length,Math.max(1,boundaryCount*2))]||candidates[0];
    const src=sourceOf(base),clone={...base,route:{...base.route,points:base.route.points.map(p=>[...p])}};
    clone.id=`${base.id}_P${n}_${extra}`;
    clone.color=COLORS[(n*5+extra*7)%COLORS.length];
    clone.speed=+(base.speed*(1+Math.min(.16,Math.max(0,n-8)*.0032))).toFixed(2);
    vehicles.push(clone);
    sourceCounts.set(src,(sourceCounts.get(src)||0)+1);
    extra++;
  }

  // Also raise the original cars' pace gradually after the tutorial levels.
  const pace=1+Math.min(.16,Math.max(0,n-8)*.0032);
  for(let i=0;i<vehicles.length-extra;i++)vehicles[i].speed=+(vehicles[i].speed*pace).toFixed(2);

  // Re-space each entrance queue after adding cars. The cap keeps every vehicle
  // before the first junction while still allowing three cars per approach road.
  const groups=new Map();
  for(const v of vehicles){const s=sourceOf(v);if(!groups.has(s))groups.set(s,[]);groups.get(s).push(v)}
  for(const group of groups.values()){
    group.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    let along=2.6;
    for(const v of group){
      const len=Math.max(1,routeLength(v.route?.points));
      v.start=+Math.min(.45,along/len).toFixed(4);
      along+=vLength(v.type)+1.0;
    }
  }

  return {...level,vehicles};
}

export const levels=ordered.map((raw,index)=>{
  const n=index+1,stage=Math.min(9,Math.floor((n-1)/25));
  const level=strengthenLevel(raw,n);
  return{
    ...level,
    number:n,
    difficulty:stage+1,
    nameTR:`${trStages[stage]} Rotası ${n}`,
    nameEN:`${enStages[stage]} Route ${n}`
  };
});
