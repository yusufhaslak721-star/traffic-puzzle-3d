const result=document.getElementById('result');
const title=document.getElementById('resultTitle');
const soundBtn=document.getElementById('soundBtn');
let release=false,timer=null,audioCtx=null;

const style=document.createElement('style');
style.textContent=`
#impactHold{position:fixed;inset:0;z-index:9;pointer-events:none;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at center,rgba(255,196,74,.06) 0 16%,rgba(255,82,52,.12) 30%,rgba(0,0,0,.05) 62%,rgba(0,0,0,.18) 100%);box-shadow:inset 0 0 0 0 rgba(255,76,48,0);animation:none}
#impactHold.visible{display:flex;animation:impactPulse .34s ease-out 1}
#impactHold::before{content:'';position:absolute;inset:0;border:0 solid rgba(255,90,52,.7);animation:impactBorder .55s ease-out 1}
#impactLabel{padding:10px 18px;border-radius:18px;background:rgba(20,23,28,.58);backdrop-filter:blur(5px);font:900 18px system-ui;color:#fff;text-shadow:0 2px 10px #000;opacity:.94;transform:translateY(-18vh)}
@keyframes impactPulse{0%{background-color:rgba(255,255,255,.35)}35%{background-color:rgba(255,90,52,.14)}100%{background-color:transparent}}
@keyframes impactBorder{0%{border-width:18px}100%{border-width:0}}
`;
document.head.appendChild(style);
const hold=document.createElement('div');hold.id='impactHold';
const label=document.createElement('div');label.id='impactLabel';hold.appendChild(label);document.body.appendChild(hold);

function soundEnabled(){return soundBtn?.textContent!=='🔇'}
function ctx(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function skidAndImpact(){
  if(!soundEnabled())return;
  const c=ctx(),t=c.currentTime;
  const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
  o.type='sawtooth';o.frequency.setValueAtTime(1050,t);o.frequency.exponentialRampToValueAtTime(145,t+.42);
  f.type='bandpass';f.frequency.value=1300;f.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+.46);
  o.connect(f);f.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.5);
  const hit=c.createOscillator(),hg=c.createGain();hit.type='square';hit.frequency.setValueAtTime(115,t+.18);hit.frequency.exponentialRampToValueAtTime(48,t+.48);hg.gain.setValueAtTime(.0001,t+.18);hg.gain.exponentialRampToValueAtTime(.2,t+.195);hg.gain.exponentialRampToValueAtTime(.0001,t+.52);hit.connect(hg);hg.connect(c.destination);hit.start(t+.18);hit.stop(t+.56);
}
function isCrash(){const s=(title?.textContent||'').toLowerCase();return s.includes('çarp')||s.includes('crash')}
function showHold(){label.textContent=document.documentElement.lang==='en'?'CRASH!':'ÇARPIŞMA!';hold.classList.add('visible');skidAndImpact();setTimeout(()=>hold.classList.remove('visible'),1850)}

new MutationObserver(()=>{
  if(!result.classList.contains('visible')||!isCrash())return;
  if(release){release=false;return}
  result.classList.remove('visible');
  if(timer)clearTimeout(timer);
  showHold();
  timer=setTimeout(()=>{release=true;result.classList.add('visible')},2000);
}).observe(result,{attributes:true,attributeFilter:['class']});
