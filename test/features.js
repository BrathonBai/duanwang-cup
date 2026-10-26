'use strict';
/* Roadster / 疯狂水世界 联调：先 node server.js，再 node test/features.js */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function j(path, body) {
  const r = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let d = null;
  try { d = await r.json(); } catch { }
  return { status: r.status, d };
}
const state = () => j('/api/state').then(x => x.d);
let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  ok ? pass++ : fail++;
}
async function waitFor(fn, ms = 9000, step = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await sleep(step);
  }
  return null;
}

(async () => {
  // ---------- Roadster ----------
  await j('/api/reset', {});
  await j('/api/clear', {});
  await j('/api/solo', {});
  const a = await j('/api/join', { name: '火星车手', skin: 'deepseek' });
  const pid = a.d.pid;
  await j('/api/give', { pid, god: true, godMs: 180000 });
  await j('/api/start', {});
  check('开局', !!(await waitFor(async () => (await state()).phase === 'playing')));
  {
    const st0 = await state();
    const me0 = st0.players.find(p => p.id === pid);
    check('Deepseek 女仆皮肤', me0 && me0.skin === 'deepseek', me0 && me0.skin);
  }

  await j('/api/give', { pid, roadster: true });
  const call = await j('/api/car', { pid });
  let s = await state();
  check('召唤 Roadster', call.d && call.d.ok && call.d.kind === 'roadster' && s.phase === 'car', `${call.status} ${call.d && (call.d.error || call.d.kind)}`);
  check('载具类型', s.car && s.car.type === 'roadster', s.car && s.car.type);

  await sleep(1400);
  s = await state();
  check('开始下降/悬停', s.car && s.car.y > 0.5, 'y=' + (s.car && s.car.y));
  check('全员上车', s.players.some(p => p.inCar), 'inCar=' + s.players.filter(p => p.inCar).length);

  await sleep(1800);
  s = await state();
  check('喷气上升', s.car && s.car.y > 3, 'y=' + (s.car && s.car.y) + ' stage=' + (s.car && s.car.stage));

  const hit = await waitFor(async () => {
    const q = await state();
    return (q.phase === 'crash' || q.phase === 'boss') ? q : null;
  }, 9000);
  s = hit || await state();
  check('俯冲撞王', (s.phase === 'crash' || s.phase === 'boss') && s.boss && s.boss.hp <= 105, `phase=${s.phase} hp=${s.boss && s.boss.hp}`);
  check('进入 Boss', !!(await waitFor(async () => (await state()).phase === 'boss', 6000)));

  // ---------- 疯狂水世界 ----------
  await j('/api/reset', {});
  await j('/api/clear', {});
  await j('/api/solo', {});
  const b = await j('/api/join', { name: '水上漂' });
  const pid2 = b.d.pid;
  await j('/api/give', { pid: pid2, god: true, godMs: 180000 });
  await j('/api/start', {});
  await waitFor(async () => (await state()).phase === 'playing');
  await j('/api/give', { pid: pid2, x: 562.5 });
  await sleep(300);
  s = await state();
  const me = s.players.find(p => p.id === pid2);
  check('进入水世界', !!s.water && s.water.from === 560 && s.water.to === 700, JSON.stringify(s.water));
  check('玩家在水上', me && me.wet === true, 'x=' + (me && me.x) + ' wet=' + (me && me.wet));
  check('海水过滤器', me && me.coins >= 50, 'coins=' + (me && me.coins) + ' hp=' + (me && me.hp));
  check('水世界播报', (s.feed || []).some(t => String(t.text || t).includes('疯狂水世界')), (s.feed && s.feed[0] && s.feed[0].text) || '');
  check('水世界三件套', (s.items || []).some(i => i[2] === 'eel') && (s.items || []).some(i => i[2] === 'puffer'), 'items=' + (s.items || []).filter(i => ['filter', 'eel', 'puffer'].includes(i[2])).map(i => i[2]).join(','));

  await j('/api/give', { pid: pid2, x: 594 });
  await sleep(250);
  s = await state();
  let me2 = s.players.find(p => p.id === pid2);
  check('电鳗发电机', me2 && me2.eel > 0, 'eel=' + (me2 && me2.eel));
  await j('/api/give', { pid: pid2, x: 638 });
  await sleep(250);
  s = await state();
  me2 = s.players.find(p => p.id === pid2);
  check('刺豚制氧机', me2 && me2.bubble > 0, 'bubble=' + (me2 && me2.bubble));
  await j('/api/give', { pid: pid2, x: 760 });
  await sleep(300);
  s = await state();
  check('后半程仙人掌密度', (s.obs || []).filter(o => o[0] > 720).length >= 8, 'late=' + (s.obs || []).filter(o => o[0] > 720).length);

  // 许愿也能召唤水世界梗
  const fw = await j('/api/wish', { text: '给我一台海水过滤器', name: '水世界观众' });
  await sleep(220);
  s = await state();
  check('许愿海水过滤器', fw.d && fw.d.ok && fw.d.intent === 'filter' && (s.items || []).some(i => i[2] === 'filter'), fw.d && fw.d.reply);
  await sleep(600);
  const tw = await j('/api/wish', { text: '给我一辆特斯拉', name: '火星观众' });
  await sleep(220);
  s = await state();
  check('许愿 Tesla', tw.d && tw.d.ok && tw.d.variant === 'roadster' && (s.items || []).some(i => i[2] === 'roadster'), tw.d && tw.d.reply);

  await j('/api/reset', {});
  console.log(`\n结果: ${pass}/${pass + fail} 通过`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
