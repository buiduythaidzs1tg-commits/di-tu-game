const CFG={name:'STREAMER',free:'🤡',jail:'😭',likesPerPct:10,keys:['tù','tu','bắt','bat','police','cảnh sát'],chatPct:2,chatCool:3000,jailTime:45,bailDia:500,smallCut:5,bigCut:2,bigFrom:10,grace:8,jailGifts:['Finger Heart','Heart Me']};
const P=new URLSearchParams(location.search);
if(P.get('name'))CFG.name=P.get('name');else if(P.get('user'))CFG.name=P.get('user').toUpperCase();
let wanted=0,inJail=false,timeLeft=0,grace=0,timerId=null,actx=null;
const scores={},lastChat={};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const N=esc(CFG.name);
$('nameTag').textContent=CFG.name;
function log(h){const d=document.createElement('div');d.innerHTML=h;const b=$('log');b.appendChild(d);while(b.children.length>6)b.removeChild(b.firstChild);setTimeout(()=>d.remove(),9000)}
function addScore(u,p){scores[u]=(scores[u]||0)+p;$('top').innerHTML=Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,s])=>`<li><span>${esc(n).slice(0,12)}</span><b>${s}</b></li>`).join('')}
function setWanted(v){wanted=Math.max(0,Math.min(100,v));$('wantedFill').style.width=wanted+'%';$('wantedText').textContent='Mức truy nã '+Math.floor(wanted)+'%'}
function unlock(){try{if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
['touchstart','click'].forEach(e=>document.addEventListener(e,unlock,{passive:true}));
function beep(f,d){try{if(!actx||actx.state!=='running')return;const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.connect(g);g.connect(actx.destination);g.gain.value=.15;o.start();o.stop(actx.currentTime+d)}catch(e){}}
function renderTimer(){$('timer').textContent=Math.ceil(timeLeft)+'s';$('bailFill').style.width=Math.max(0,timeLeft/CFG.jailTime*100)+'%';$('bailText').textContent='Còn '+Math.ceil(timeLeft)+'s - tặng quà để bảo lãnh!'}
function goJail(by){
if(inJail||grace>0)return;
inJail=true;timeLeft=CFG.jailTime;setWanted(100);
$('cop').classList.add('in');$('flash').className='siren';
setTimeout(()=>$('flash').className='',3200);
beep(880,.3);setTimeout(()=>beep(660,.3),350);setTimeout(()=>beep(880,.3),700);
setTimeout(()=>{$('bars').classList.add('down');$('prisoner').className='jail';$('prisoner').textContent=CFG.jail},900);
$('status').textContent='🔒 ĐANG Ở TÙ';$('bailBar').style.display='block';$('timer').style.display='block';
log(`🚨 <b>${esc(by||'Cảnh sát')}</b> đã tống <b>${N}</b> vào tù!`);
renderTimer();clearInterval(timerId);
timerId=setInterval(()=>{timeLeft-=1;if(timeLeft<=0)release('Mãn hạn tù');else renderTimer()},1000)}
