import {levels} from './levels100.js';

let ctx=null,master=null,currentIndex=-1,running=false,enabled=true,loops=[],timers=[];

function ensure(){
  if(!ctx){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=.30;master.connect(ctx.destination);
  }
  if(ctx.state==='suspended')ctx.resume();
}
function noiseBuffer(seconds=5){
  const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),d=b.getChannelData(0);
  let smooth=0;
  for(let i=0;i<d.length;i++){smooth=smooth*.985+(Math.random()*2-1)*.015;d[i]=smooth*3.2+(Math.random()*2-1)*.16}
  return b;
}
function loopNoise({gain=.02,low=800,high=80,type='lowpass',rate=1,pan=0}={}){
  const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?.();
  src.buffer=noiseBuffer();src.loop=true;src.playbackRate.value=rate;f.type=type;f.frequency.value=type==='highpass'?high:low;g.gain.value=gain;
  src.connect(f);f.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(master)}else g.connect(master);src.start();loops.push({src,g,p});return{src,f,g,p};
}
function tone(freq,dur,vol=.02,type='sine',slide=0,pan=0){
  if(!ctx||!enabled||!running)return;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?.();
  o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(master)}else g.connect(master);o.start(t);o.stop(t+dur+.03);
}
function clearScene(){for(const x of loops)try{x.src.stop()}catch{}loops=[];for(const t of timers)clearInterval(t);timers=[]}
function bird(){const pan=(Math.random()*2-1)*.7;const base=1850+Math.random()*650;tone(base,.07,.012,'sine',520,pan);setTimeout(()=>tone(base+420,.055,.010,'sine',-260,pan),85)}
function horn(){const pan=(Math.random()*2-1)*.65;tone(260+Math.random()*80,.18,.010,'triangle',-30,pan);if(Math.random()>.6)setTimeout(()=>tone(300,.14,.008,'triangle',-20,pan),230)}
function passBy(){
  if(!ctx||!enabled||!running)return;
  const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?.(),t=ctx.currentTime;
  o.type='sawtooth';o.frequency.setValueAtTime(72+Math.random()*30,t);o.frequency.exponentialRampToValueAtTime(105+Math.random()*35,t+1.3);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.008,t+.35);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);
  o.connect(g);if(p){p.pan.setValueAtTime(-.75,t);p.pan.linearRampToValueAtTime(.75,t+1.35);g.connect(p);p.connect(master)}else g.connect(master);o.start(t);o.stop(t+1.5);
}
function wavePulse(bus){
  const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=.11+Math.random()*.04;lg.gain.value=.012;l.connect(lg);lg.connect(bus.g.gain);l.start();loops.push({src:l,g:lg});
}
function rebuild(){
  if(!ctx||!running)return;
  clearScene();
  const level=levels[currentIndex]||levels[0],theme=level?.theme||'city',rain=level?.weather==='rain',night=level?.time==='night';

  // Constant distant road bed.
  const trafficGain=['city','shops','terminal','plaza','industrial'].includes(theme)?.025:theme==='suburb'?.016:.010;
  const traffic=loopNoise({gain:trafficGain,low:360,pan:-.08});traffic.f.Q.value=.55;
  const air=loopNoise({gain:night?.005:.008,low:1450,pan:.10});air.f.Q.value=.3;

  if(rain){
    const rainHi=loopNoise({gain:.032,high:720,type:'highpass',rate:1.08,pan:.08});rainHi.f.Q.value=.15;
    const rainBody=loopNoise({gain:.018,low:1100,rate:.95,pan:-.12});rainBody.f.Q.value=.2;
  }
  if(theme==='seaside'){
    const sea=loopNoise({gain:.025,low:560,rate:.72,pan:.12});wavePulse(sea);
  }
  if(theme==='industrial'){
    tone(58,8,.006,'sine',0,-.2);const hum=loopNoise({gain:.012,low:180,pan:.18});hum.f.Q.value=1.2;
  }
  if(theme==='terminal'){
    const hum=loopNoise({gain:.010,low:260,pan:.1});hum.f.Q.value=.8;
  }

  if(['park','suburb','seaside'].includes(theme)&&!night)timers.push(setInterval(()=>{if(Math.random()>.22)bird()},2600));
  if(['city','shops','terminal','plaza','industrial'].includes(theme)){
    timers.push(setInterval(()=>{if(Math.random()>.52)horn()},6900));
    timers.push(setInterval(()=>{if(Math.random()>.28)passBy()},4300));
  }
}
function indexFromUI(){const n=parseInt(document.querySelector('#levelLabel')?.textContent||'1',10);return Math.max(0,Math.min(levels.length-1,(Number.isFinite(n)?n:1)-1))}
function start(){ensure();enabled=document.querySelector('#soundBtn')?.textContent!=='🔇';master.gain.setTargetAtTime(enabled?.30:0,ctx.currentTime,.08);running=true;currentIndex=indexFromUI();rebuild()}
function stop(){running=false;clearScene()}
function syncLevel(){const i=indexFromUI();if(i!==currentIndex){currentIndex=i;if(running)rebuild()}}

const levelEl=document.querySelector('#levelLabel');
if(levelEl)new MutationObserver(syncLevel).observe(levelEl,{childList:true,characterData:true,subtree:true});
document.querySelector('#playBtn')?.addEventListener('click',()=>setTimeout(start,0));
document.querySelector('#homeBtn')?.addEventListener('click',()=>setTimeout(stop,0));
document.querySelector('#soundBtn')?.addEventListener('click',()=>setTimeout(()=>{
  if(!ctx)return;enabled=document.querySelector('#soundBtn')?.textContent!=='🔇';master.gain.setTargetAtTime(enabled?.30:0,ctx.currentTime,.06);
},0));
document.querySelector('#game')?.addEventListener('pointerdown',()=>{
  if(!ctx&&document.querySelector('#menu')&&!document.querySelector('#menu').classList.contains('visible'))start();
},{once:true});
