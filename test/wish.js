'use strict';
/* 许愿池解析器自测：node test/wish.js */
const assert = require('assert');
const { parseWish } = require('../wish');

const players = [
  { id: 1, name: '老王', bot: false, dead: false, finished: false, x: 40 },
  { id: 2, name: '小美', bot: false, dead: false, finished: false, x: 80 },
  { id: 3, name: '机器人 01', bot: true, dead: false, finished: false, x: 10 },
  { id: 4, name: '出局者', bot: false, dead: true, finished: false, x: 5 },
];
const ctx = { players, selfId: 1 };

let pass = 0, fail = 0;
function check(name, text, expect) {
  const w = parseWish(text, ctx);
  try {
    if (expect.intent) assert.strictEqual(w.intent, expect.intent, `intent ${w.intent} != ${expect.intent}`);
    if (expect.target) assert.strictEqual(w.target.name, expect.target, `target ${w.target.name} != ${expect.target}`);
    if (expect.kind) assert.strictEqual(w.target.kind, expect.kind, `kind ${w.target.kind} != ${expect.kind}`);
    if (expect.magnitude !== undefined) assert.strictEqual(w.magnitude, expect.magnitude, `magnitude ${w.magnitude} != ${expect.magnitude}`);
    if (expect.replyHas) assert.ok(w.reply.includes(expect.replyHas), `reply "${w.reply}" missing "${expect.replyHas}"`);
    console.log(`PASS  ${name}  → [${w.intent}] ${w.target.name} ${w.magnitude}  ${w.reply}`);
    pass++;
  } catch (e) {
    console.log(`FAIL  ${name}  → ${e.message}  (reply: ${w.reply})`);
    fail++;
  }
}

check('点名仙人掌', '给老王前面来一根仙人掌', { intent: 'cactus', target: '老王', kind: 'player' });
check('全场金币雨', '全场下金币雨', { intent: 'coin', target: '全场', kind: 'all', magnitude: 14 });
check('第一名减速', '让第一名减速', { intent: 'slow', target: '小美', kind: 'player' });
check('自己满血', '我要满血', { intent: 'heart', target: '老王', kind: 'self', magnitude: 5 });
check('王掉二十血', '让仙人掌王掉20血', { intent: 'boss', magnitude: 20 });
check('按钮失灵', '让按钮失灵', { intent: 'freeze' });
check('傻瓜弹', '来一发傻瓜弹', { intent: 'flash' });
check('尊界', '我要尊界', { intent: 'car' });
check('机器人未识别', '让机器人唱歌', { intent: 'none', target: '机器人 01' });
check('全场加速', '全场加速', { intent: 'speed', kind: 'all' });
check('随机他', '给他一根仙人掌', { intent: 'cactus' });
check('减速优先于加速', '让全场减速', { intent: 'slow', kind: 'all' });
check('二段跳', '给我二段跳', { intent: 'jump', kind: 'self' });

// 空输入 / 空场
const empty = parseWish('   ', ctx);
assert.strictEqual(empty.ok, false);
const nobody = parseWish('给我金币', { players: [], selfId: 1 });
assert.strictEqual(nobody.ok, false);
console.log(`PASS  空输入/空场`); pass++;

// 出局者不在可选池里
const onlyDead = parseWish('给老王一根仙人掌', { players: [players[3]], selfId: 1 });
assert.notStrictEqual(onlyDead.target.name, '老王');
console.log(`PASS  出局者被排除`); pass++;

// 比赛途中不许打王
const earlyBoss = parseWish('让仙人掌王掉20血', { players, selfId: 1, phase: 'playing' });
assert.strictEqual(earlyBoss.ok, false);
assert.ok(earlyBoss.reply.includes('还没到打王'));
console.log(`PASS  比赛中打王被拦下`); pass++;

// 特斯拉 / Roadster 变体
const tesla = parseWish('给我一辆特斯拉', ctx);
assert.strictEqual(tesla.intent, 'car');
assert.strictEqual(tesla.variant, 'roadster');
assert.ok(tesla.reply.includes('Roadster'));
console.log(`PASS  特斯拉许愿 → Roadster`); pass++;

// 英文大小写
const en = parseWish('Give me a Roadster', ctx);
assert.strictEqual(en.intent, 'car');
assert.strictEqual(en.variant, 'roadster');
console.log(`PASS  Roadster 大小写`); pass++;

// 疯狂水世界
const fw = parseWish('给我一台海水过滤器', ctx);
assert.strictEqual(fw.intent, 'filter');
assert.ok(fw.reply.includes('年入百万'));
console.log(`PASS  海水过滤器许愿`); pass++;

console.log(`\n结果: ${pass}/${pass + fail} 通过`);
process.exit(fail ? 1 : 0);
