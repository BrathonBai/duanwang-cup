'use strict';
/* 许愿池联调：先 `node server.js`，再 `node test/wish-live.js` */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

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
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  ok ? pass++ : fail++;
}

(async () => {
  await j('/api/reset', {});
  await j('/api/clear', {});
  await j('/api/solo', {});
  const joined = await j('/api/join', { name: '许愿测试' });
  check('入场', joined.d && joined.d.ok, 'pid=' + (joined.d && joined.d.pid));
  const start = await j('/api/start', {});
  check('开局', start.d && start.d.ok);
  await sleep(3600);

  let s = (await j('/api/state')).d;
  check('进入比赛', s.phase === 'playing', 'phase=' + s.phase);
  const baseObs = s.obs.length;

  // 1. 点名仙人掌
  let w = await j('/api/wish', { text: '给许愿测试前面来一根仙人掌', name: '观众甲' });
  check('许愿接口返回', w.status === 200 && w.d.ok, w.d && w.d.reply);
  await sleep(120);
  s = (await j('/api/state')).d;
  check('仙人掌已生成', s.obs.length > baseObs, `${baseObs} -> ${s.obs.length}`);
  check('愿望进入大屏日志', (s.wishes || []).some(x => x.text.includes('仙人掌')));

  // 2. 金币雨（换个人，避开冷却；等过全场节流）
  await sleep(600);
  const baseItems = s.items.length;
  w = await j('/api/wish', { text: '全场下金币雨', name: '观众乙' });
  check('金币雨许愿', w.status === 200 && w.d.ok, `${w.status} ${w.d && (w.d.error || w.d.reply)}`);
  await sleep(150);
  s = (await j('/api/state')).d;
  check('金币已掉落', s.items.length > baseItems, `${baseItems} -> ${s.items.length}`);

  // 3. 冷却
  const again = await j('/api/wish', { text: '再来一次', name: '观众乙' });
  check('同一人冷却生效', again.status === 429, 'status=' + again.status);

  // 4. 打王
  await sleep(600);
  await j('/api/boss', {});
  s = (await j('/api/state')).d;
  const hp0 = s.boss ? s.boss.hp : -1;
  w = await j('/api/wish', { text: '让仙人掌王掉20血', name: '观众丙' });
  check('打王许愿', w.status === 200 && w.d.ok, `${w.status} ${w.d && (w.d.error || w.d.reply)}`);
  await sleep(150);
  s = (await j('/api/state')).d;
  check('王掉血', s.boss && s.boss.hp <= hp0 - 20, `${hp0} -> ${s.boss && s.boss.hp}`);

  // 5. 未识别
  await sleep(600);
  w = await j('/api/wish', { text: '让机器人唱歌', name: '观众丁' });
  check('未识别也给回复', w.status === 200 && w.d.ok === true && w.d.intent === 'none', `${w.status} ${w.d && (w.d.error || w.d.reply)}`);

  console.log(`\n结果: ${pass}/${pass + fail} 通过`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
