import {levels} from './levels100.js';

let ctx=null,master=null,currentIndex=-1,running=false,enabled=true,loops=[],timers=[];

function ensure(){
  if(!ctx){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=.34;master.connect(ctx.destination);
  }
  if(ctx.state==='suspended')ctx.resume();
}
function noiseBuffer(seconds=4){
  const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
  return b;
}
function loopNoise({gain=.02,low=800,high=80,type='lowpass',rate=1}={}){
  const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  src.buffer=noiseBuffer();src.loop=true;src.playbackRate.value=rate;f.type=type;f.frequency.value=type==='highpass'?high:low;g.gain.value=gain;
  src.connect(f);f.connect(g);g.connect(master);src.start();loops.push({src,g});return {src,f,g};
}
function tone(freq,dur,vol=.02,type='sine',slide=0){
  if(!ctx||!enabled||!running)return;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);
}
function clearScene(){for(const x of loops)try{x.src.stop()}catch{}loops=[];for(const t of timers)clearInterval(t);timers=[]}
function bird(){tone(2100,.08,.018,'sine',500);setTimeout(()=>tone(2500,.07,.015,'sine',-300),95)}
function horn(){tone(310,.22,.012,'triangle',-40)}
function rebuild(){
  if(!ctx||!running)return;
  clearScene();
  const level=levels[currentIndex]||levels[0],theme=level?.theme||'city',rain=level?.weather==='rain';
  const traffic=loopNoise({gain:theme==='park'?.012:.022,low:320});traffic.f.Q.value=.55;
  const air=loopNoise({gain:.008,low:1200});air.f.Q.value=.3;
  if(rain){const r=loopNoise({gain:.045,low:3200,type:'highpass',high:650});r.f.Q.value=.2}
  if(theme==='seaside'){
    const sea=loopNoise({gain:.025,low:520}),l=ctx.createOscillator(),lg=ctx.createGain();
    l.frequency.value=.18;lg.gain.value=.013;l.connect(lg);lg.connect(sea.g.gain);l.start();loops.push({src:l,g:lg});
  }
  if(['park','suburb','seaside'].includes(theme))timers.push(setInterval(()=>{if(Math.random()>.28)bird()},3200));
  if(['city','shops','terminal','plaza','industrial'].includes(theme))timers.push(setInterval(()=>{if(Math.random()>.58)horn()},7600));
}
function indexFromUI(){const n=parseInt(document.querySelector('#levelLabel')?.textContent||'1',10);return Math.max(0,Math.min(levels.length-1,(Number.isFinite(n)?n:1)-1))}
function start(){ensure();enabled=document.querySelector('#soundBtn')?.textContent!=='🔇';master.gain.setTargetAtTime(enabled?.34:0,ctx.currentTime,.08);running=true;currentIndex=indexFromUI();rebuild()}
function stop(){running=false;clearScene()}
function syncLevel(){const i=indexFromUI();if(i!==currentIndex){currentIndex=i;if(running)rebuild()}}

const levelEl=document.querySelector('#levelLabel');
if(levelEl)new MutationObserver(syncLevel).observe(levelEl,{childList:true,characterData:true,subtree:true});
document.querySelector('#playBtn')?.addEventListener('click',()=>setTimeout(start,0));
document.querySelector('#homeBtn')?.addEventListener('click',()=>setTimeout(stop,0));
document.querySelector('#soundBtn')?.addEventListener('click',()=>setTimeout(()=>{
  if(!ctx)return;enabled=document.querySelector('#soundBtn')?.textContent!=='🔇';master.gain.setTargetAtTime(enabled?.34:0,ctx.currentTime,.06);
},0));
document.querySelector('#game')?.addEventListener('pointerdown',()=>{
  if(!ctx&&document.querySelector('#menu')&&!document.querySelector('#menu').classList.contains('visible'))start();
},{once:true});
