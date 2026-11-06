function release(why){
if(!inJail)return;
inJail=false;clearInterval(timerId);
$('bars').classList.remove('down');$('prisoner').className='free';$('prisoner').textContent=CFG.free;
$('cop').classList.remove('in');$('timer').style.display='none';$('bailBar').style.display='none';
$('status').textContent='Đang tự do 😎';setWanted(0);grace=CFG.grace;beep(1200,.25);
log(`🎉 <b>${N}</b> được thả! (${esc(why)})`);
const g=setInterval(()=>{grace-=1;if(grace<=0)clearInterval(g)},1000)}
function cut(s,u,l){timeLeft-=s;log(`💸 <b>${esc(u)}</b> ${esc(l)}: -${s}s án`);if(timeLeft<=0)release('Được '+u+' bảo lãnh');else renderTimer()}
function onEvent(e){
if(e.type==='like'){
if(inJail||grace>0)return;
setWanted(wanted+(e.count||1)/CFG.likesPerPct);addScore(e.user,e.count||1);
if(wanted>=100)goJail(e.user)}
else if(e.type==='chat'){
const t=(e.text||'').toLowerCase();
if(!CFG.keys.some(k=>t.includes(k))||inJail||grace>0)return;
const n=Date.now();
if(lastChat[e.user]&&n-lastChat[e.user]<CFG.chatCool)return;
lastChat[e.user]=n;setWanted(wanted+CFG.chatPct);addScore(e.user,5);
log(`📢 <b>${esc(e.user)}</b> tố cáo ${N}!`);
if(wanted>=100)goJail(e.user)}
else if(e.type==='gift'){
const d=e.diamonds||1;addScore(e.user,d*10);
if(!inJail){if(CFG.jailGifts.includes(e.giftName))goJail(e.user);else log(`🎁 <b>${esc(e.user)}</b> tặng ${esc(e.giftName)}`);return}
if(d>=CFG.bailDia){log(`👑 <b>${esc(e.user)}</b> BẢO LÃNH!`);release('Được '+e.user+' bảo lãnh')}
else if(d>=CFG.bigFrom)cut(d*CFG.bigCut,e.user,'tặng '+e.giftName);
else cut(CFG.smallCut,e.user,'tặng '+e.giftName)}
else if(e.type==='follow')log(`➕ <b>${esc(e.user)}</b> đã follow`)}
function connectWS(){
if(location.protocol==='file:'){$('conn').textContent='Chế độ TEST';return}
const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/'+location.search);
ws.onmessage=m=>{try{const e=JSON.parse(m.data);
if(e.type==='status'){$('conn').textContent=(e.ok?'🟢 ':'🟡 ')+e.text;$('conn').style.display='block';if(e.ok)setTimeout(()=>$('conn').style.display='none',4000);return}
onEvent(e)}catch(x){}};
ws.onclose=()=>{$('conn').style.display='block';$('conn').textContent='🔴 Mất kết nối, thử lại...';setTimeout(connectWS,3000)}}
connectWS();
function awake(){try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}}
awake();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')awake()});
if(location.search.includes('notest'))document.body.classList.add('hideTest');
