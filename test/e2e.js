/* 端到端自测：大厅 → 比赛 → 操作 → 整蛊 → 尊界 → 撞击 → Boss → 结算
   用法：先 `node server.js`，再 `node test/e2e.js`
   Windows / macOS / Linux 自动找 Chrome 或 Edge；可用 CHROME_BIN、ORIGIN 覆盖 */
const { spawn } = require('child_process'); const fs = require('fs');
const os = require('os'); const path = require('path');

if (typeof WebSocket !== 'function') {
  console.error('需要 Node 22+（内置 WebSocket）。当前 ' + process.version);
  process.exit(1);
}

const CANDIDATES = [
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CANDIDATES.find(p => fs.existsSync(p));
if (!CHROME) { console.error('找不到 Chrome/Edge，请设置 CHROME_BIN'); process.exit(1); }

const PORT = 9399;
const ORIGIN = process.env.ORIGIN || 'http://127.0.0.1:3000';
const TMP = os.tmpdir();
const PROFILE = path.join(TMP, 'cup-e2e-' + process.pid);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${PROFILE}`,
  `--remote-debugging-port=${PORT}`, '--window-size=1600,1000', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[]; const errors=[];
function check(name, ok, extra=''){ results.push({name, ok:!!ok, extra}); console.log((ok?'PASS':'FAIL')+'  '+name+(extra?'  ('+extra+')':'')); }

async function targetWs(wsUrl, label){
  const ws=new WebSocket(wsUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const pend=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
    else if(m.method==='Runtime.exceptionThrown'){
      const t=(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description)||m.params.exceptionDetails.text;
      errors.push(label+': '+String(t).split('\n')[0]);
    }};
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
  const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});return r.result&&r.result.result?r.result.result.value:null};
  await send('Page.enable'); await send('Runtime.enable');
  return {ws,send,ev};
}
const j=async(u,d)=>{const r=await fetch(ORIGIN+u,{method:d?'POST':'GET',headers:{'content-type':'application/json'},body:d?JSON.stringify(d):undefined});return r.json()};
const st=()=>j('/api/state');

(async()=>{
  // 重置房间
  await j('/api/reset',{}); await j('/api/clear',{}); await j('/api/solo',{});
  let list; for(let i=0;i<50;i++){try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();if(list&&list.length)break}catch{}await sleep(200)}

  // 大屏
  const page=list.find(t=>t.type==='page');
  const S=await targetWs(page.webSocketDebuggerUrl,'SCREEN');
  await S.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await S.send('Page.navigate',{url:ORIGIN+'/?t='+Date.now()}); await sleep(1400);

  // 手机
  const t2=await (await fetch(`http://127.0.0.1:${PORT}/json/new?${ORIGIN}/pad`,{method:'PUT'})).json();
  const P=await targetWs(t2.webSocketDebuggerUrl,'PAD');
  await P.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
  await P.send('Page.navigate',{url:ORIGIN+'/pad?t='+Date.now()}); await sleep(1400);

  // A 大厅
  check('大厅阶段', (await st()).phase==='lobby');
  check('大屏渲染无异常', errors.filter(e=>e.startsWith('SCREEN')).length===0, errors.filter(e=>e.startsWith('SCREEN'))[0]||'');

  // B 加入 + 开局
  await P.ev(`document.querySelector('#name').value='测试员';document.querySelector('#joinBtn').click();`);
  await sleep(700);
  const pid=await P.ev('pid');
  check('手机入场拿到 pid', !!pid, 'pid='+pid);
  await S.ev(`document.querySelector('#startBtn').click()`);
  await sleep(3600);
  let s=await st();
  check('进入比赛', s.phase==='playing', 'phase='+s.phase);
  check('选手在跑', s.players.every(p=>p.dead||p.x>=0) && s.players.some(p=>p.x>1), 'x='+s.players.map(p=>p.x.toFixed(1)).join(','));

  // C 操作
  await P.ev(`fetch('/api/act',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:${pid},act:'jump'})})`);
  await sleep(160);
  s=await st(); let me=s.players.find(p=>p.id===pid);
  check('跳跃生效', me && (me.y>0.1 || me.vy>0), 'y='+(me&&me.y.toFixed(2)));
  await P.ev(`fetch('/api/act',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:${pid},act:'dash'})})`);
  await sleep(120);
  s=await st(); me=s.players.find(p=>p.id===pid);
  check('冲刺生效', me && me.dashLeft>0, 'left='+(me&&Math.round(me.dashLeft)));
  await P.ev(`fetch('/api/act',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:${pid},act:'crouch'})})`);
  await sleep(650);
  const sc=await st();
  check('下蹲生效', (sc.players.find(p=>p.id===pid)||{}).crouch===true);
  check('下蹲按钮高亮', await P.ev(`document.querySelector('#crouchBtn').classList.contains('active')`));
  await P.ev(`fetch('/api/act',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:${pid},act:'crouchEnd'})})`);

  // D 风滚草 / 撞碎
  let sawTumble=false;
  for(let i=0;i<40;i++){ const q=await st(); if((q.obs||[]).some(o=>o[3]===8)){sawTumble=true;break;} await sleep(120); }
  check('风滚草出现', sawTumble);

  // E 傻瓜弹
  await j('/api/give',{pid,prank:'flash'});
  const pr=await j('/api/prank',{pid}); await sleep(500);
  const sf=await st();
  check('傻瓜弹触发', pr.ok && sf.flashLeft>0, 'flashLeft='+Math.round(sf.flashLeft));
  check('手机白屏层', Number(await P.ev(`parseFloat(document.querySelector('#flash').style.opacity)||0`))>0.5);
  await sleep(2800);

  // F 尊界过场
  await j('/api/give',{pid,car:true});
  const car=await j('/api/car',{pid}); await sleep(300);
  s=await st();
  check('召唤载具', car.ok && s.phase==='car', 'phase='+s.phase);
  await sleep(1000);
  s=await st();
  check('全员上车', s.players.filter(p=>p.inCar).length>0, 'inCar='+s.players.filter(p=>p.inCar).length);
  let phase='';
  for(let i=0;i<30;i++){ const q=await st(); phase=q.phase; if(phase==='crash'||phase==='boss'){break;} await sleep(150); }
  s=await st();
  check('撞击阶段/王掉半血', (s.phase==='crash'||s.phase==='boss') && s.boss && s.boss.hp<=Math.floor(s.boss.maxHp/2), 'hp='+(s.boss&&s.boss.hp));
  await sleep(1600);
  s=await st();
  check('进入 Boss 战', s.phase==='boss', 'phase='+s.phase);

  // G 打王
  let hp0=s.boss? s.boss.hp : 0;
  for(let i=0;i<25;i++){
    await P.ev(`fetch('/api/act',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pid:${pid},act:'dash'})})`);
    await sleep(320);
    const q=await st(); if(q.phase==='result') break;
  }
  s=await st();
  check('投掷命中王', s.phase==='result' || (s.boss && s.boss.hp<hp0), 'hp ' + hp0 + ' -> ' + (s.boss&&s.boss.hp));

  // H 结算（若还没结束，等人类团灭）
  for(let i=0;i<60 && (await st()).phase!=='result'; i++) await sleep(500);
  s=await st();
  check('到达结算', s.phase==='result', 'phase='+s.phase);
  if(s.phase==='result'){
    await sleep(2200);
    const shown=await S.ev(`!document.querySelector('#result').classList.contains('hidden')`);
    check('大屏结算页显示', shown);
  }

  fs.writeFileSync(path.join(TMP,'cup-e2e-screen.png'), Buffer.from((await S.send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  fs.writeFileSync(path.join(TMP,'cup-e2e-pad.png'), Buffer.from((await P.send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  console.log('截图: ' + path.join(TMP,'cup-e2e-screen.png') + ' / cup-e2e-pad.png');

  check('全程无 JS 异常', errors.length===0, errors.slice(0,3).join(' | '));
  const pass=results.filter(r=>r.ok).length;
  console.log(`\n结果: ${pass}/${results.length} 通过`);
  if(errors.length) console.log('异常清单:\n'+errors.slice(0,10).join('\n'));
  S.ws.close(); P.ws.close(); chrome.kill('SIGKILL'); process.exit(0);
})().catch(e=>{console.log('TEST CRASH', e.message); process.exit(1)});
