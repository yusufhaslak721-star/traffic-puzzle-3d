const C={
  red:0xff453a,blue:0x3287ff,yellow:0xffcf24,green:0x2ed66f,white:0xf8fbff,orange:0xff8d24,
  black:0x303841,pink:0xff58ad,silver:0xd4dde4,purple:0xa35cff,cyan:0x28d0ef,lime:0xa3ea2b,
  coral:0xff6f61,teal:0x28b8a7,gold:0xffb52e,navy:0x203a72,mint:0x55d6b2,cream:0xffe8b2
};
const COLORS=Object.values(C);
const TYPES=['sedan','hatch','suv','luxury','taxi','van','delivery','sports','race','future','truck','flatbed','tractor','police','ambulance','fire'];
const THEMES=['park','shops','suburb','hospital','city','industrial','seaside','terminal','plaza'];
const TEMPLATES=[
  [[0,0]],
  [[-1,0],[1,0]],
  [[-1,0],[0,0],[0,1]],
  [[-1,0],[0,0],[1,0],[0,1]],
  [[-1,-1],[0,-1],[0,0],[1,0]],
  [[-1,-1],[1,-1],[-1,1],[1,1]],
  [[0,0],[-1,0],[1,0],[0,-1],[0,1]],
  [[-1,-1],[-1,0],[-1,1],[0,1],[1,1]],
  [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
  [[-1,-1],[0,-1],[1,-1],[-1,1],[0,1],[1,1]],
  [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
  [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]],
  [[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,-1],[1,1]],
  [[-1,-2],[-1,-1],[-1,0],[-1,1],[0,-1],[1,-1],[1,0],[1,1]],
  [[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]],
  [[-2,-1],[-1,-1],[0,-1],[1,-1],[-2,1],[-1,1],[0,1],[1,1],[-1,0],[1,0]],
  [[-1,-2],[0,-2],[1,-2],[-1,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[1,1]],
  [[-2,-1],[-1,-1],[0,-1],[1,-1],[-2,0],[0,0],[1,0],[-2,1],[-1,1],[0,1],[1,1]],
  [[-2,-1],[-1,-1],[0,-1],[1,-1],[-2,0],[-1,0],[0,0],[1,0],[-2,1],[-1,1],[0,1],[1,1]],
  [[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[-2,0],[0,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1]]
];
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function shuffle(r,a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function rotatePoint([x,z],q,mirror){if(mirror)x=-x;for(let i=0;i<q;i++)[x,z]=[-z,x];return[x,z]}
function connectIntersections(points){
  const edges=[];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];
    if(a[0]===b[0]){
      let blocked=false;
      for(let k=0;k<points.length;k++)if(k!==i&&k!==j&&points[k][0]===a[0]&&points[k][1]>Math.min(a[1],b[1])&&points[k][1]<Math.max(a[1],b[1])){blocked=true;break}
      if(!blocked)edges.push([i,j]);
    }else if(a[1]===b[1]){
      let blocked=false;
      for(let k=0;k<points.length;k++)if(k!==i&&k!==j&&points[k][1]===a[1]&&points[k][0]>Math.min(a[0],b[0])&&points[k][0]<Math.max(a[0],b[0])){blocked=true;break}
      if(!blocked)edges.push([i,j]);
    }
  }
  return edges;
}
function templateIndex(levelNo,r){
  let lo=0,hi=4;
  if(levelNo>12){lo=1;hi=6}
  if(levelNo>30){lo=3;hi=9}
  if(levelNo>60){lo=5;hi=12}
  if(levelNo>95){lo=7;hi=14}
  if(levelNo>135){lo=9;hi=16}
  if(levelNo>175){lo=11;hi=18}
  if(levelNo>215){lo=13;hi=19}
  return lo+Math.floor(r()*(hi-lo+1));
}
function makeNetwork(levelNo){
  const r=rng(levelNo*7919+17),ti=templateIndex(levelNo,r),base=TEMPLATES[ti],q=Math.floor(r()*4),mirror=r()>.5;
  const spacingX=8.4+r()*2.6,spacingZ=8.4+r()*2.6;
  let pts=base.map(p=>{const [x,z]=rotatePoint(p,q,mirror);return[+(x*spacingX).toFixed(2),+(z*spacingZ).toFixed(2)]});
  const centerX=pts.reduce((s,p)=>s+p[0],0)/pts.length,centerZ=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  pts=pts.map(p=>[+(p[0]-centerX).toFixed(2),+(p[1]-centerZ).toFixed(2)]);
  const nodes=pts.map((p,i)=>({id:`I${i}`,x:p[0],z:p[1],intersection:true,boundary:false}));
  const edges=connectIntersections(pts).map(([a,b])=>({a:`I${a}`,b:`I${b}`}));
  const dirs=[['W',-1,0],['E',1,0],['N',0,-1],['S',0,1]],candidates=[];
  for(let i=0;i<pts.length;i++){
    const [x,z]=pts[i];
    for(const [d,dx,dz] of dirs){
      let blocked=false;
      for(let j=0;j<pts.length;j++)if(j!==i){const [xx,zz]=pts[j];
        if(dx&&Math.abs(zz-z)<.01&&Math.sign(xx-x)===dx){blocked=true;break}
        if(dz&&Math.abs(xx-x)<.01&&Math.sign(zz-z)===dz){blocked=true;break}
      }
      if(!blocked)candidates.push({i,d,dx,dz,x,z,outer:Math.abs(x)+Math.abs(z)});
    }
  }
  const desired=Math.min(candidates.length,levelNo<12?3:levelNo<45?4:levelNo<100?5:levelNo<170?6:levelNo<220?7:8);
  const bySide=new Map(dirs.map(d=>[d[0],[]]));for(const c of shuffle(r,candidates))bySide.get(c.d).push(c);
  const chosen=[];
  for(const [d] of dirs){const list=bySide.get(d);if(list?.length&&chosen.length<desired)chosen.push(list.sort((a,b)=>b.outer-a.outer)[0])}
  for(const c of shuffle(r,candidates))if(chosen.length<desired&&!chosen.some(x=>x.i===c.i&&x.d===c.d))chosen.push(c);
  const boundary=[],arm=15.5+r()*3.5;
  for(const c of chosen){const id=`B${boundary.length}`,x=+(c.x+c.dx*arm).toFixed(2),z=+(c.z+c.dz*arm).toFixed(2);nodes.push({id,x,z,intersection:false,boundary:true,dir:c.d});boundary.push(id);edges.push({a:`I${c.i}`,b:id})}
  if(boundary.length<2){
    const fallback=[[0,-1,'N'],[0,1,'S']];for(const [dx,dz,d] of fallback){const id=`B${boundary.length}`;nodes.push({id,x:dx*arm,z:dz*arm,intersection:false,boundary:true,dir:d});boundary.push(id);edges.push({a:'I0',b:id})}
  }
  return{nodes,edges,boundary,intersectionCount:pts.length,template:ti};
}
function adjacency(network){const a=new Map(network.nodes.map(n=>[n.id,[]]));for(const e of network.edges){a.get(e.a)?.push(e.b);a.get(e.b)?.push(e.a)}return a}
function pathIds(network,start,end){const adj=adjacency(network),q=[start],prev=new Map([[start,null]]);while(q.length){const cur=q.shift();if(cur===end)break;for(const nx of adj.get(cur)||[])if(!prev.has(nx)){prev.set(nx,cur);q.push(nx)}}if(!prev.has(end))return[];const out=[];for(let c=end;c!=null;c=prev.get(c))out.push(c);return out.reverse()}
function routePoints(network,ids){const map=new Map(network.nodes.map(n=>[n.id,n]));return ids.map(id=>[map.get(id).x,map.get(id).z])}
function longestDestination(network,src,boundary,r,samples){let best=null,bestLen=-1;const pool=boundary.filter(b=>b!==src);for(let i=0;i<samples;i++){const dst=pick(r,pool),ids=pathIds(network,src,dst);const score=ids.length+r()*.45;if(score>bestLen){bestLen=score;best={dst,ids}}}return best}
function makeVehicles(levelNo,network,r){
  const maxByRoads=Math.max(5,network.boundary.length*3),count=Math.min(25,maxByRoads,5+Math.floor((levelNo-1)/11)),bs=[...network.boundary],srcUse=new Map(),vehicles=[];
  for(let i=0;i<count;i++){
    const src=bs[i%bs.length],choice=longestDestination(network,src,bs,r,levelNo<25?2:levelNo<100?4:6)||{dst:bs[(i+1)%bs.length],ids:[]};
    let ids=choice.ids;if(ids.length<3)ids=pathIds(network,src,choice.dst);if(ids.length<2)continue;
    const queue=srcUse.get(src)||0;srcUse.set(src,queue+1);
    let type=TYPES[(levelNo*3+i*5+Math.floor(r()*TYPES.length))%TYPES.length];
    if(levelNo<8&&['police','ambulance','fire','tractor','flatbed','truck','delivery'].includes(type))type=['sedan','hatch','suv','taxi','sports'][i%5];
    if(levelNo>=20&&i===0)type=['police','ambulance','fire'][levelNo%3];
    if(levelNo>=85&&i===Math.floor(count/2))type=['ambulance','police','fire'][(levelNo+1)%3];
    const heavy=['truck','flatbed','tractor','delivery','fire'].includes(type),sport=['sports','race','future'].includes(type);
    const difficultyBoost=Math.min(.9,levelNo/300),speed=4.65+(r()-.5)*1.05+difficultyBoost+(sport?.35:0)-(heavy?.62:0);
    vehicles.push({
      id:`L${levelNo}V${i}`,type,color:COLORS[(levelNo*7+i*3)%COLORS.length],
      route:{name:`${src}-${choice.dst}`,points:routePoints(network,ids)},
      start:+Math.min(.3,.02+queue*.055).toFixed(3),speed:+Math.max(3.55,speed).toFixed(2)
    });
  }
  return vehicles;
}
const trNames=['Başlangıç Akışı','Şehir Geçidi','Park Bağlantısı','Çarşı Düğümü','Hastane Hattı','Yoğun Saat','Sahil Akışı','Sanayi Bağlantısı','Terminal Düğümü','Meydan Trafiği','Çifte Kavşak','Dar Geçiş','Kritik Sıra','Acil Koridor','Karmaşık Ağ','Üçlü Düğüm','Gece Akışı','Yağmur Hattı','Yoğun Merkez','Usta Rotası','Köprü Bağlantısı','Kıyı Düğümü','Dört Yol','Şehir Halkası','Büyük Aktarma'];
const enNames=['Opening Flow','City Crossing','Park Link','Market Junction','Hospital Route','Rush Hour','Coastal Flow','Industrial Link','Terminal Junction','Plaza Traffic','Double Junction','Narrow Passage','Critical Order','Emergency Corridor','Complex Network','Triple Junction','Night Flow','Rain Route','Dense Center','Master Route','Bridge Link','Coast Junction','Four Ways','City Ring','Grand Transfer'];
function levelName(n,lang){const a=lang==='tr'?trNames:enNames;return`${a[(n-1)%a.length]} ${Math.ceil(n/25)}`}
export const levels=Array.from({length:250},(_,idx)=>{
  const n=idx+1,r=rng(n*104729+31),network=makeNetwork(n);
  let theme=THEMES[(n*3+network.template+Math.floor(r()*THEMES.length))%THEMES.length];
  const time=n%17===0||n%29===0?'night':n%11===0?'sunset':n%23===0?'evening':n%13===0?'morning':'day';
  const weather=n%19===0||n%31===0?'rain':n%14===0?'cloudy':n%9===0?'sunny':'clear';
  if(n<=3)theme=['park','shops','suburb'][n-1];
  return{number:n,nameTR:levelName(n,'tr'),nameEN:levelName(n,'en'),theme,time,weather,network,intersectionCount:network.intersectionCount,decorSeed:n*4099+73,difficulty:1+Math.floor((n-1)/25),vehicles:makeVehicles(n,network,r)};
});