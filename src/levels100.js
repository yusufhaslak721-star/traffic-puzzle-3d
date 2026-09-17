import {levels as generatedLevels} from './levels_routes_v2.js';

const trStages=['Başlangıç','Akış','Şehir','Kavşak','Yoğunluk','Ustalık','Karma Ağ','Büyük Şehir','Mega Trafik','Final'];
const enStages=['Opening','Flow','City','Junction','Rush','Expert','Complex Grid','Big City','Mega Traffic','Final'];
const score=l=>{
  const turns=(l.vehicles||[]).reduce((n,v)=>n+Math.max(0,(v.route?.points?.length||2)-2),0);
  const special=(l.vehicles||[]).filter(v=>['police','ambulance','fire','truck','flatbed','tractor'].includes(v.type)).length;
  return (l.intersectionCount||1)*10000+(l.vehicles?.length||0)*220+turns*12+special*7+(l.difficulty||0);
};

const ordered=[...generatedLevels].sort((a,b)=>score(a)-score(b)||a.number-b.number);

export const levels=ordered.map((level,index)=>{
  const n=index+1,stage=Math.min(9,Math.floor((n-1)/25));
  return{
    ...level,
    number:n,
    difficulty:stage+1,
    nameTR:`${trStages[stage]} Rotası ${n}`,
    nameEN:`${enStages[stage]} Route ${n}`
  };
});
