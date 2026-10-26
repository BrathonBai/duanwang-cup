'use strict';
/**
 * 无浏览器冒烟测试：只打 HTTP，验证一局的主干流程。
 * 用法：先 node server.js，再 node test/smoke.js
 */
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
async function waitFor(fn, ms = 6000, step = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await sleep(step);
  }
  return null;
}

(async () => {
  await j('/api/reset', {});
  await j('/api/clear', {});
  await j('/api/solo', {});
  const joined = await j('/api/join', { name: '冒烟测试' });
  const pid = joined.d && joined.d.pid;
  check('入场', !!pid, 'pid=' + pid);
  await j('/api/give', { pid, god: true, godMs: 180000 });

  const notYet = await j('/api/wish', { text: '全场下金币雨', name: '冒烟观众' });
  check('比赛前不许愿', notYet.status === 400, 'status=' + notYet.status);

  const st = await j('/api/start', {});
  check('开局', st.d && st.d.ok);
  const playing = await waitFor(async () => (await state()).phase === 'playing', 6000);
  check('进入比赛', !!playing);

  // 跑跳
  await j('/api/act', { pid, act: 'jump' });
  await sleep(140);
  let s = await state();
  let me = s.players.find(p => p.id === pid);
  check('跳跃生效', me && (me.y > 0.05 || me.vy > 0), `y=${me && me.y.toFixed(2)} vy=${me && me.vy && me.vy.toFixed(2)}`);

  await j('/api/act', { pid, act: 'dash' });
  await sleep(120);
  s = await state();
  me = s.players.find(p => p.id === pid);
  check('冲刺生效', me && me.dashLeft > 0, 'left=' + (me && Math.round(me.dashLeft)));

  await j('/api/act', { pid, act: 'crouch' });
  await sleep(200);
  s = await state();
  me = s.players.find(p => p.id === pid);
  check('下蹲生效', me && me.crouch === true);
  await j('/api/act', { pid, act: 'crouchEnd' });

  // 整蛊
  await j('/api/give', { pid, prank: 'flash' });
  const pr = await j('/api/prank', { pid });
  await sleep(180);
  s = await state();
  check('傻瓜弹生效', pr.d && pr.d.ok && s.flashLeft > 0, 'flashLeft=' + Math.round(s.flashLeft || 0));

  // 载具
  await j('/api/give', { pid, car: true });
  const car = await j('/api/car', { pid });
  await sleep(120);
  s = await state();
  check('召唤载具', car.d && car.d.ok && s.phase === 'car', 'phase=' + s.phase);
  const crashed = await waitFor(async () => {
    const q = await state();
    return (q.phase === 'crash' || q.phase === 'boss') ? q : null;
  }, 8000);
  s = crashed || await state();
  check('撞王掉半血', (s.phase === 'crash' || s.phase === 'boss') && s.boss && s.boss.hp <= Math.floor(s.boss.maxHp / 2), 'hp=' + (s.boss && s.boss.hp));
  const bossPhase = await waitFor(async () => (await state()).phase === 'boss', 6000);
  check('进入 Boss', !!bossPhase);

  // 打王
  const hp0 = (await state()).boss.hp;
  const w = await j('/api/wish', { text: '让仙人掌王掉20血', name: '冒烟观众' });
  await sleep(150);
  s = await state();
  check('许愿打王', w.d && w.d.ok && s.boss.hp <= hp0 - 20, `${hp0} -> ${s.boss && s.boss.hp}`);

  // 投掷（王会上下浮动，多扔几发再等飞行时间）
  const hp1 = s.boss.hp;
  for (let i = 0; i < 12; i++) {
    await j('/api/act', { pid, act: 'dash' });
    await sleep(300);
  }
  await sleep(1000);
  s = await state();
  check('投掷有伤害', s.boss.hp < hp1, `${hp1} -> ${s.boss.hp}`);

  await j('/api/reset', {});
  console.log(`\n结果: ${pass}/${pass + fail} 通过`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
