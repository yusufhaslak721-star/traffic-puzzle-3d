import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const DIRECT=[
  {test:/\/sedan\.glb(?:[?#]|$)/i,url:'https://cdn.3dassets.dev/assets/32487/v1/model.glb',name:'City car'},
  {test:/\/hatchbackSports\.glb(?:[?#]|$)/i,url:'https://cdn.3dassets.dev/assets/32493/v1/model.glb',name:'Three-door hatchback'},
  {test:/\/(?:sedanSports|race|raceFuture)\.glb(?:[?#]|$)/i,url:'https://cdn.3dassets.dev/assets/32495/v1/model.glb',name:'Mid-engine sports car'},
  {test:/\/firetruck\.glb(?:[?#]|$)/i,url:'https://cdn.3dassets.dev/assets/24904/v1/model.glb',name:'Fire engine'}
];

const FLEET='https://cdn.3dassets.dev/assets/32562/v1/model.glb';
const STARTER_SPECS=[
  {test:/\/suvLuxury\.glb(?:[?#]|$)/i,label:'Executive SUV',tokens:[['large','suv'],['executive','saloon'],['mid','size','suv']]},
  {test:/\/suv\.glb(?:[?#]|$)/i,label:'Mid-size SUV',tokens:[['mid','size','suv'],['city','suv'],['compact','crossover']]},
  {test:/\/taxi\.glb(?:[?#]|$)/i,label:'Licensed taxi',tokens:[['licensed','taxi'],['taxi','saloon'],['taxi']]},
  {test:/\/police\.glb(?:[?#]|$)/i,label:'Police patrol car',tokens:[['police','patrol'],['police']]},
  {test:/\/ambulance\.glb(?:[?#]|$)/i,label:'Ambulance response estate',tokens:[['ambulance','response'],['ambulance']]},
  {test:/\/delivery\.glb(?:[?#]|$)/i,label:'Parcel delivery van',tokens:[['parcel','delivery','van'],['delivery','van'],['medium','panel','van']]},
  {test:/\/van\.glb(?:[?#]|$)/i,label:'Medium panel van',tokens:[['medium','panel','van'],['panel','van'],['crew','van']]},
  {test:/\/truckFlat\.glb(?:[?#]|$)/i,label:'Flatbed truck',tokens:[['flatbed','truck'],['dropside','flatbed'],['flat','bed']]},
  {test:/\/truck\.glb(?:[?#]|$)/i,label:'Rigid truck',tokens:[['box','truck'],['curtainside','rigid'],['tipper','truck'],['truck']]},
  {test:/\/tractor\.glb(?:[?#]|$)/i,label:'4x4 utility vehicle',tokens:[['ladder','frame','4x4'],['boxy','off','roader'],['pickup']]}
];

function clean(s){return String(s||'').toLowerCase().replace(/[_\-.]+/g,' ').replace(/\s+/g,' ').trim()}
function findBest(scene,tokenSets){
  const list=[];
  scene.traverse(o=>{
    const n=clean(o.name);if(!n)return;
    let score=0;
    for(const set of tokenSets){
      const hits=set.filter(t=>n.includes(t)).length;
      score=Math.max(score,hits===set.length?100+hits*12:hits*7);
    }
    if(score>0)list.push({o,score,n});
  });
  list.sort((a,b)=>b.score-a.score||a.n.length-b.n.length);
  const best=list[0]?.o;if(!best)return null;
  let root=best;
  while(root.parent&&root.parent!==scene){
    const pn=clean(root.parent.name);
    if(pn&&tokenSets.some(set=>set.some(t=>pn.includes(t))))root=root.parent;else break;
  }
  return root.clone(true);
}

if(!GLTFLoader.prototype.__karagamePremiumRedirectV3){
  GLTFLoader.prototype.__karagamePremiumRedirectV3=true;
  const originalLoad=GLTFLoader.prototype.load;
  let fleetPromise=null;
  const loadFleet=()=>fleetPromise||(fleetPromise=new Promise((resolve,reject)=>{
    const l=new GLTFLoader();originalLoad.call(l,FLEET,g=>resolve(g.scene),undefined,reject);
  }));

  // main_v4 normalizer rotates every loaded vehicle by PI because Kenney cars face -Z.
  // Standalone premium models face +Z, so they need an inner PI to cancel that normalizer.
  // Vehicles extracted from the fleet pack already follow the Kenney/-Z convention, so they MUST NOT be flipped here.
  const wrap=(scene,name,cancelNormalizer)=>{
    const wrapper=new THREE.Group();
    if(cancelNormalizer)scene.rotation.y=Math.PI;
    wrapper.add(scene);
    wrapper.userData.premiumVehicle=true;
    wrapper.userData.premiumVehicleName=name;
    return wrapper;
  };

  GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){
    const s=String(url),direct=DIRECT.find(x=>x.test.test(s));
    const original=()=>originalLoad.call(this,url,onLoad,onProgress,onError);
    if(direct){
      return originalLoad.call(this,direct.url,g=>{g.scene=wrap(g.scene,direct.name,true);onLoad?.(g)},onProgress,err=>{console.warn('Premium vehicle failed:',direct.name,err);original()});
    }
    const spec=STARTER_SPECS.find(x=>x.test.test(s));
    if(!spec)return original();
    loadFleet().then(scene=>{
      const picked=findBest(scene,spec.tokens);
      if(!picked){console.warn('Premium fleet model not found:',spec.label);return original()}
      onLoad?.({scene:wrap(picked,spec.label,false),animations:[]});
    }).catch(err=>{console.warn('Premium fleet pack failed:',err);original()});
    return this;
  };
}
