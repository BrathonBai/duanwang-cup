'use strict';
/**
 * 许愿池 · 离线中文意图解析器（零依赖，不联网，不调大模型）
 *
 * 为什么不用大模型：这是「断网杯」，现场可能真的断网。
 * 所以把「许愿式编程」里最常用的那部分语法，手写成一套小规则：
 *   一句人话 → 一个目标 + 一个意图 + 一个数值 → 一个立刻生效的整蛊。
 *
 * parseWish(text, ctx) -> {
 *   intent, target:{kind,id,name}, magnitude, reply, raw
 * }
 * ctx = {
 *   players: [{ id, name, bot, dead, finished, x }],
 *   selfId?: number,
 * }
 */

// 顺序即优先级：同分时靠前的规则先命中。
// 「王」必须排在「血」前面，否则「让王掉血」会被当成回血。
const RULES = [
  { id: 'flash',  words: ['傻瓜弹', '白屏', '黑屏', '致盲', '闪光', '瞎', '看不见', '光'] },
  { id: 'boss',   words: ['仙人掌王', '扣血', '掉血', '打王', 'boss', '王'] },
  { id: 'filter', words: ['海水过滤器', '过滤器', '疯狂水世界', '净水器'] },
  { id: 'car',    words: ['特斯拉', 'roadster', '马斯克', 'spacex', '尊界', 'v800', '载具', '车钥匙', '开车', '车'] },
  { id: 'freeze', words: ['按钮失灵', '失灵', '卡住', '断网', '掉线', '冻结', '不能动', '暂停', '提交', '手滑'] },
  { id: 'cactus', words: ['仙人掌', '扎', '刺', '绊', '摔', '撞', '路障', '障碍'] },
  { id: 'coin',   words: ['金币', '硬币', '发财', '暴富', '钱', '富'] },
  { id: 'heart',  words: ['回血', '满血', '加血', '补血', '红心', '治疗'] },
  { id: 'slow',   words: ['减速', '变慢', '蜗牛', '拖慢', '慢'] },
  { id: 'speed',  words: ['加速', '变快', '飞快', '火箭', '超速', '冲刺', '快'] },
  { id: 'jump',   words: ['二段跳', '弹簧', '上天', '起飞', '跳', '飞'] },
  { id: 'item',   words: ['道具', '空投', '礼物', '下雨', '天降', '掉'] },
];

const INTENT_NAMES = {
  flash: '致盲', boss: '打王', car: '载具', filter: '海水过滤器', freeze: '按钮失灵',
  cactus: '仙人掌', coin: '金币雨', heart: '回血', slow: '减速',
  speed: '加速', jump: '上天', item: '道具雨', none: '没听懂',
};

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function normalize(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[，。！？、,.!?;；:："'“”‘’《》<>【】\[\]()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function resolveTarget(text, ctx) {
  const all = Array.isArray(ctx.players) ? ctx.players : [];
  const alive = all.filter(p => p && !p.dead && !p.finished);
  const pool = alive.length ? alive : all;

  if (!pool.length) return { kind: 'none', name: '空场', strip: '' };
  if (/所有人|全场|全员|大家|全体|每个人|全部/.test(text)) {
    return { kind: 'all', name: '全场', strip: '' };
  }
  if (/第一名|领先的|跑最快|最前面|第一/.test(text)) {
    const lead = alive.slice().sort((a, b) => (b.x || 0) - (a.x || 0))[0];
    if (lead) return { kind: 'player', id: lead.id, name: lead.name, strip: lead.name };
  }

  // 点名优先，且用最长名字匹配，避免「老王」被「王」抢先
  let named = null;
  for (const p of pool) {
    if (!p.name) continue;
    if (text.includes(p.name) && (!named || p.name.length > named.name.length)) named = p;
  }
  if (named) return { kind: 'player', id: named.id, name: named.name, strip: named.name };

  if (/机器人|电脑|ai|bot/i.test(text)) {
    const bot = pool.filter(p => p.bot)[0];
    if (bot) return { kind: 'player', id: bot.id, name: bot.name, strip: bot.name };
  }
  if (ctx.selfId && /我(?!们)/.test(text) && !/他|她/.test(text)) {
    const me = all.find(p => p.id === ctx.selfId);
    if (me) return { kind: 'self', id: me.id, name: me.name, strip: me.name };
  }
  if (/他|她|随机|随便/.test(text)) {
    const others = pool.filter(p => p.id !== ctx.selfId);
    const t = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))];
    if (t) return { kind: 'player', id: t.id, name: t.name, strip: t.name };
  }

  // 没点名也没说「他」：随机挑一位幸运观众
  const t = pool[Math.floor(Math.random() * pool.length)];
  return t
    ? { kind: 'player', id: t.id, name: t.name, strip: t.name, random: true }
    : { kind: 'none', name: '空场', strip: '' };
}

function scoreIntent(scan) {
  const s = String(scan).toLowerCase();
  let best = null;
  for (const rule of RULES) {
    let score = 0;
    for (const w of rule.words) if (s.includes(w)) score += Math.max(1, w.length);
    if (score > 0 && (!best || score > best.score)) best = { id: rule.id, score };
  }
  return best ? best.id : 'none';
}

function readMagnitude(text, intent) {
  const num = text.match(/(\d{1,3})\s*(?:点|滴|个|根|枚)?/);
  switch (intent) {
    case 'boss':
      if (num) return clamp(parseInt(num[1], 10), 5, 40);
      return 10 + Math.floor(Math.random() * 7);
    case 'cactus':
      return /一排|两根|三根|成排|一排排/.test(text) ? 2 : 1;
    case 'coin':
      return /雨|暴富|好多|一堆|满屏/.test(text) ? 14 : 8;
    case 'freeze':
      return /三秒|3秒/.test(text) ? 3000 : 2600;
    case 'heart':
      return /满血|回满|全部/.test(text) ? 5 : 1;
    case 'speed':
    case 'slow':
      return /三秒|3秒/.test(text) ? 3000 : 5000;
    case 'item':
      return /雨|一堆|满屏/.test(text) ? 10 : 6;
    default:
      return 1;
  }
}

function replyFor(intent, targetName, magnitude, text, variant = '') {
  const t = targetName || '他';
  switch (intent) {
    case 'cactus':
      return magnitude >= 2
        ? `${t}前面长出了一排仙人掌。许愿成功，后果自负。`
        : `${t}前面长出一根仙人掌。这就是许愿式编程。`;
    case 'freeze':
      return `${t}的按钮被改成了「提交」。系统批准了。`;
    case 'flash':
      return '有人许愿要有光。于是全场都瞎了。';
    case 'coin':
      return `天上开始掉金币。${t}快去捡。`;
    case 'heart':
      return `${t}的血被许愿修好了。`;
    case 'speed':
      return `${t}被许愿加速。系统不负责刹车。`;
    case 'slow':
      return `${t}被许愿减速。这叫民意。`;
    case 'jump':
      return `${t}被许愿送上了天。`;
    case 'car':
      return variant === 'roadster'
        ? `${t}前面出现了一把 Roadster 钥匙。这次真的要起飞了。`
        : `${t}前面出现了一把车钥匙。`;
    case 'filter':
      return `${t}前面出现了一台海水过滤器。年入百万不是梦。`;
    case 'boss':
      return `许愿池从仙人掌王身上扣了 ${magnitude} 点血。王没有同意。`;
    case 'item':
      return `天上开始掉道具。${t}自己看着办。`;
    default: {
      const short = text.length > 14 ? text.slice(0, 14) + '…' : text;
      return `许愿池没听懂「${short}」。它假装听懂了。`;
    }
  }
}

function parseWish(rawText, ctx = {}) {
  const text = normalize(rawText);
  if (!text) {
    return { ok: false, intent: 'none', target: { kind: 'none', name: '空场' }, magnitude: 0, reply: '愿望是空的。许愿池也是空的。', raw: '' };
  }
  const players = Array.isArray(ctx.players) ? ctx.players : [];
  if (!players.length) {
    return { ok: false, intent: 'none', target: { kind: 'none', name: '空场' }, magnitude: 0, reply: '场上没人，愿望无处安放。', raw: text };
  }

  const target = resolveTarget(text, ctx);
  // 把目标名字从扫描文本里去掉：避免「老王」的「王」触发打王
  const scan = target.strip ? text.split(target.strip).join(' ') : text;
  let intent = target.kind === 'none' ? 'none' : scoreIntent(scan);
  const variant = /特斯拉|roadster|马斯克|spacex|火箭|火星/i.test(text) ? 'roadster' : '';
  // 「打王」只在 Boss 战有意义；比赛途中先把愿望记下来
  if (intent === 'boss' && ctx.phase && ctx.phase !== 'boss' && ctx.phase !== 'crash') {
    return {
      ok: false, intent: 'none', target, magnitude: 0, variant: '',
      reply: '现在还没到打王的时候。愿望先记下了，王会记住的。', raw: text,
    };
  }
  const magnitude = readMagnitude(text, intent);
  return {
    ok: intent !== 'none',
    intent,
    target,
    magnitude,
    variant,
    reply: replyFor(intent, target.name, magnitude, scan, variant),
    raw: text,
  };
}

module.exports = { parseWish, RULES, INTENT_NAMES };
