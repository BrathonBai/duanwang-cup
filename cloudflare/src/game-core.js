import { parseWish } from './wish.js';
let BASE_URL = 'https://duanwang.fiddling.work';
function broadcast(){} // Worker wrapper owns broadcast
/* ------------------------------------------------------------------ 参数 */
const TICK_MS = 1000 / 60;    // 逻辑步长 16.67ms；用累加器驱动，不依赖 Windows 定时器精度
const DT = TICK_MS / 1000;
let tickNo = 0;
const GRAV = 36;
const JUMP_V = 12.2;
const PRANK_COST = 3;
const MAX_PLAYERS = 8;
const DECREE_EVERY = [12000, 17000];
const DECREE_MS = 4500;
const WATER_FROM = 560;        // 疯狂水世界：这一段要在水上跑
const WATER_TO = 700;
const ROADSTER_DMG = 55;       // Roadster 俯冲扣王血

const COLORS = ['#ffd23f', '#ff3fa4', '#22d3ee', '#a3e635', '#fb923c', '#c084fc', '#f8fafc', '#f87171'];
const SKINS = ['pixel', 'deepseek', 'maid'];
const DEPTS = ['财务部', '行政部', '测试组', '前台', '保安队', '食堂', '法务部', '实习生', '运维', '市场部'];
const SPONSORS = ['老张的咖啡机', '楼下便利店', '三号打印机', '前台的绿萝', '消防通道', '微波炉', '工位旁的加湿器', '年会剩余物资'];
const PRESETS = ['阿强', '小美', '老王', '翠花', '大聪明', '铁柱', '富贵', '招娣'];

/* ------------------------------------------------------------------ 台词 */
// 四档情绪：0 播音腔 → 1 疑惑 → 2 挂不住 → 3 摆烂
const LINES = {
  start: {
    0: [
      '各位观众，欢迎来到断网杯。规则很简单：跑，跳，别死。',
      '断网杯，现在开始。请各位选手保持体面。',
    ],
    1: ['今晚的选手看起来都很有信心。这种信心通常维持不到十秒。'],
  },
  countdown: { 0: ['三。二。一。开始。'] },
  join: {
    0: [
      '{name}，{dept}，个人最好成绩 {pb} 秒。赞助商是{sponsor}。',
      '新选手入场。{name}，来自{dept}，赞助商{sponsor}。',
      '{name} 就位。{dept}。这是他第一次参加，也是他最后一次被记住的机会。',
    ],
    1: ['又来一位。{name}，{dept}。我不知道他能坚持多久。'],
  },
  death: {
    0: [
      '{name} 出局。这是他今晚第 {n} 次倒在仙人掌手里。',
      '{name} 与仙人掌发生了接触。比赛继续。',
      '{name} 出局。速度不等人，仙人掌也不等。',
    ],
    1: [
      '{name} 又没了。我怀疑他根本没看路。',
      '回放显示，{name} 的起跳时机存在严重问题。',
      '{name} 出局，这是他第 {n} 次。数据不会说谎。',
    ],
    2: [
      '{name}，第 {n} 次。这不是意外，这是习惯。',
      '请工作人员检查一下 {name} 的设备。我不相信这是人类操作。',
    ],
    3: ['{name} 出局。无所谓了。反正也没人在乎规则。'],
  },
  prank: {
    0: [
      '{a} 向 {b} 的赛道投放了一根仙人掌。这是规则允许的。',
      '{a} 把 {b} 的按钮改成了别的功能。{b}，祝你好运。',
      '{a} 对 {b} 使用了整蛊。本届比赛不设道德奖项。',
    ],
    1: ['{a} 又对 {b} 下手了。这是今晚第 {n} 次。'],
    2: ['我不管了。{a}，你开心就好。{b}，你自求多福。'],
  },
  defiance: {
    0: ['请注意，本赛段禁止跳跃。{name} 违规。记过一次。'],
    1: ['{name} 跳了。他明知道禁止。他就是要跳。'],
    2: ['好。很好。{name}，我记住你了。'],
    3: ['行。你们玩。'],
  },
  decree: {
    0: [
      '本赛段禁止跳跃（跳了 +3 缺德值）。',
      '接下来四秒禁止跳跃（跳了算抗命 +3）。',
      '再说一次：此区间禁止起跳（跳了 +3 缺德值）。',
    ],
    1: ['系统维护：跳跃功能暂停（骗你的，跳了 +3 缺德值）。'],
  },
  flappy: {
    0: [
      '{name} 起飞了。他不会再落地了。',
      '{name} 变成了一只鸟。这是规则允许的。',
      '各位观众，{name} 已经离开地面，并且不打算回来。',
    ],
    1: ['请注意，{name} 已经不是人了。', '{name} 飞起来了。我不知道该祝贺还是该叫救护车。'],
  },
  carStart: { 0: ['没时间解释了，快上车。', '都上来。现在。'] },
  carHit: { 0: ['进步的道路上，怎么能刹车。', '王，我们来了。'] },
  roadsterStart: {
    0: [
      '这次真的没时间解释了。Roadster，启动。',
      '请注意，这不是车。这是火箭。',
      '马斯克没来，但他的车来了。',
    ],
  },
  roadsterHit: {
    0: [
      '一飞冲天。然后一头撞了上去。',
      '王抬头看了一眼。来不及了。',
      '从天上掉下来一辆车。物理老师已经辞职。',
    ],
  },
  water: {
    0: [
      '前方路段被淹了。不要慌，这是疯狂水世界。',
      '开局一定要选海水过滤器。',
      '他们现在在水上跑。物理学不存在了。',
    ],
  },
  filter: {
    0: [
      '{name} 捡到了海水过滤器。年入百万不是梦。',
      '{name} 拿到了海水过滤器。三分钟一局，巨爽巨解压。',
    ],
  },
  eel: {
    0: [
      '{name} 捡到了电鳗发电机。他现在不是选手，是移动电源。',
      '{name} 拿到了电鳗发电机。请保持干燥，虽然已经在水里了。',
    ],
  },
  puffer: {
    0: [
      '{name} 捡到了刺豚制氧机。水下呼吸许可证到手。',
      '{name} 拿到了刺豚制氧机。这只鱼看起来比他会用肺。',
    ],
  },
  boss: {
    0: [
      '一千零二十四米。各位观众，他来了。',
      '接下来的比赛项目不是跑步。是投掷。',
      '终极仙人掌王。请各位选手拿出随身物品。',
    ],
  },
  bosswin: {
    0: ['仙人掌王倒下了。{name} 扔出了最后一击。人类赢了，暂时。'],
  },
  win: {
    0: [
      '冠军诞生。{name}。尽管发生了这一切，冠军依然是 {name}。',
      '{name} 活到了最后。恭喜。',
    ],
    1: ['{name} 赢了。我不知道该说什么。让我们把镜头交给回放。'],
    3: ['{name} 赢了。我辞职。'],
  },
  idle: {
    0: ['比赛进行到第 {t} 秒。目前一切正常。', '场上还有 {alive} 名选手。'],
    1: ['场上还剩 {alive} 人。我开始无聊了。'],
  },
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function pickTier(bank, tier) {
  const t = Math.max(0, Math.min(3, Math.round(tier)));
  for (let d = 0; d < 4; d++) {
    for (const k of [t - d, t + d]) {
      if (bank[k] && bank[k].length) return pick(bank[k]);
    }
  }
  return null;
}
function fill(s, vars) {
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
}


/* ------------------------------------------------------------------ 成就 */
// 原则：少、损、一次。丢人也算成就，而且和夺冠一样只值 1 点。
const ACH = {
  first_blood:     { name: '第一名',           desc: '全场第一个出局。你赢了，倒数的。' },
  warm_up:         { name: '热身运动',         desc: '开场五秒内出局。身体还没热，人就凉了。' },
  afk:             { name: '躺平先锋',         desc: '一次都没跳，就结束了。' },
  obstinate:       { name: '对仙人掌有执念',   desc: '两次倒在同一个位置附近。' },
  empty_jump:      { name: '跳了个寂寞',       desc: '连续三次起跳，什么都没躲过。' },
  rebel:           { name: '叛逆期',           desc: '第一次违抗解说指令。' },
  disobedient:     { name: '不听话',           desc: '一局里违抗三次。' },
  first_bad:       { name: '第一次当坏人',     desc: '第一次整蛊别人。手在抖吗？' },
  repeat_offender: { name: '惯犯',             desc: '一局里整蛊三次。' },
  regicide:        { name: '以下犯上',         desc: '把当前第一名送走了。' },
  stab:            { name: '借刀杀人',         desc: '你投送的仙人掌，当场生效。' },
  thanks:          { name: '谢谢款待',         desc: '被整之后 1.5 秒内出局。' },
  popular:         { name: '人缘很好',         desc: '一局里被整了两次。大家都喜欢你。' },
  haunt:           { name: '阴魂不散',         desc: '出局之后，还能整到人。' },
  old:             { name: '老不死',           desc: '活过 30 秒。不容易。' },
  collector:       { name: '捡破烂的',         desc: '一场拿到 100 枚金币。' },
  charged:         { name: '带电作业',         desc: '捡到一块电池，接下来十秒你是上帝。' },
  air_unlock:      { name: '牛顿管不了他',     desc: '捡到了二段跳。' },
  air_jump:        { name: '空气蹬踏',         desc: '在空中又蹬了一脚。物理老师已经报警。' },
  wish:            { name: '许愿式编程',       desc: '第一次用一句人话改写了比赛。' },
  genie:           { name: '灯神',             desc: '一局许了三次愿。说好的只许一个。' },
  carowner:        { name: '尊界车主',         desc: '召唤 V800，一头撞掉王一半血。' },
  roadster:        { name: '火星驾照',         desc: '召唤 Roadster，喷气起飞。' },
  filter:          { name: '海水过滤器',       desc: '开局一定要选海水过滤器。年入百万不是梦。' },
  eel:             { name: '电鳗发电机',       desc: '捡到电鳗发电机。你不是在跑步，你是在发电。' },
  puffer:          { name: '刺豚制氧机',       desc: '捡到刺豚制氧机。水下呼吸许可证到手。' },
  watercombo:      { name: '疯狂水世界',       desc: '海水过滤器、电鳗发电机、刺豚制氧机，三件套集齐。' },
  waterrun:        { name: '水上漂',           desc: '在疯狂水世界路段跑起来了。' },
  light:           { name: '要有光',           desc: '扔出傻瓜弹，让全场瞎了三秒。' },
  champion:        { name: '冠军',             desc: '活到了最后。也就这样。' },
  last_human:      { name: '人类最后的希望',   desc: '全人类都死了，你是最后一个。' },
};
const ACH_SAY = [
  '{name} 解锁了一个成就，「{title}」。这没什么值得骄傲的。',
  '成就解锁。{name}，「{title}」。我们真的很缺内容。',
  '恭喜 {name}。{title}。奖品是没有奖品。',
];

/* ------------------------------------------------------------------ 房间 */
const RACE_LEN = 1024;
const BOSS_HP = 160;
const THROW_CD = 240;
const PRANKS = ['cactus', 'freeze', 'flash'];
const PRANK_NAMES = { cactus: '仙人掌', freeze: '按钮失灵', flash: '傻瓜弹' };
const BASE_SPEED = 8.6;
const DASH_SPEED = 13.2;
const SLIDE_SPEED = 11.4;
const CROUCH_SPEED = 3.8;
const DASH_MS = 300, DASH_CD = 1400;
const SLIDE_MS = 470;
const MAX_HP = 5;
const BATTERY_MS = 10000;
const EEL_MS = 8000;       // 电鳗发电机：电力冲刺 + 撞碎仙人掌
const PUFFER_MS = 12000;   // 刺豚制氧机：氧气泡护盾，挡一次伤害

class Room {
  constructor() {
    this.code = 'CUP-001';
    this.phase = 'lobby';
    this.players = new Map();
    this.roster = [];
    this.nextId = 1;
    this.obs = [];
    this.items = [];
    this.genX = 0;
    this.playT = 0;
    this.countdownAt = 0;
    this.resultAt = 0;
    this.events = [];
    this.feed = [];
    this.says = [];
    this.tier = 0;
    this.decree = null;
    this.nextDecreeAt = 0;
    this.winner = null;
    this.report = '';
    this.stats = { deaths: 0, pranks: 0, defiance: 0, ach: 0, breaks: 0, coins: 0, slides: 0 };
    this.lastIdleAt = 0;
    this.achSayAt = 0;
    this.roundDeaths = 0;
    this.oldDone = false;
    this.boss = null;
    this.throws = [];
    this.needles = [];
    this.hitstopUntil = 0;
    this.flashUntil = 0;
    this.car = null;
    this.carSaid = false;
    this.carSpawned = false;
    this.wishes = [];        // 最近的许愿（大屏 / 手机页共用）
    this.wishCount = 0;
    this.wishGlobalAt = 0;   // 全场节流
  }
  player(id) { return this.players.get(Number(id)); }
  alive() { return this.roster.map(id => this.players.get(id)).filter(p => p && !p.dead && !p.finished); }
  say(ctx, vars = {}, tier = null) {
    const s = pickTier(LINES[ctx], tier === null ? this.tier : tier);
    if (s) this.says.push({ text: fill(s, vars), tier: tier === null ? Math.round(this.tier) : tier });
  }
  feedAdd(text) {
    this.feed.unshift({ text, at: Date.now() });
    this.feed.length = Math.min(this.feed.length, 7);
  }
  bump(x) { this.tier = Math.min(3, this.tier + x); }
}

const room = new Room();

function award(p, id) {
  if (!p || p.bot || p.ach.has(id)) return false;
  const a = ACH[id];
  if (!a) return false;
  p.ach.add(id);
  p.achSeq++;
  p.lastAch = { id, title: a.name, desc: a.desc, at: Date.now() };
  p.achLog.push({ seq: p.achSeq, title: a.name, desc: a.desc, at: Date.now() });
  if (p.achLog.length > 8) p.achLog.shift();
  room.stats.ach++;
  room.events.push({ type: 'ach', pid: p.id, name: p.name, color: p.color, title: a.name, desc: a.desc, pts: 1 });
  room.feedAdd(`🏆 ${p.name} 解锁「${a.name}」`);
  if (Date.now() - room.achSayAt > 8000) {
    room.achSayAt = Date.now();
    room.says.push({ text: fill(pick(ACH_SAY), { name: p.name, title: a.name }), tier: Math.min(2, Math.round(room.tier)) });
  }
  return true;
}

function makePlayer(name, bot, skin) {
  const id = room.nextId++;
  const autoSkin = SKINS[(id - 1) % SKINS.length];
  return {
    id, name, bot: !!bot,
    skin: SKINS.includes(skin) ? skin : autoSkin,
    color: COLORS[(id - 1) % COLORS.length],
    dept: bot ? 'AI 部门' : pick(DEPTS),
    sponsor: bot ? '机房空调' : pick(SPONSORS),
    pb: (25 + Math.random() * 30).toFixed(1),
    x: 0, y: 0, vy: 0, onground: true,
    hp: MAX_HP, coins: 0, batteryUntil: 0,
    dashUntil: 0, dashReadyAt: 0, slideUntil: 0, lastShiftAt: 0, crouch: false,
    invulnUntil: 0, dead: false, finished: false, finishAt: 0,
    hits: 0, slides: 0, breaks: 0, doubleJump: false, airJumped: false, flipUntil: 0,
    deaths: 0, jumps: 0, dist: 0,
    score: 3, nextScoreAt: 25,
    actQueue: [], jumpBufferedAt: 0, prankItem: pick(PRANKS), hasCar: false, hasRoadster: false, inCar: false,
    eelUntil: 0, bubbleUntil: 0, waterMask: 0,
    prankUntil: 0, prankedByName: '', lastPrankAt: 0,
    defiantThisDecree: false, defianceCount: 0,
    idleJumps: 0, prankCount: 0, pranksReceived: 0, prankedAt: 0,
    lastWishAt: 0, wishCount: 0, speedUntil: 0, speedMul: 1,
    trace: [], lastSeen: Date.now(),
    ach: new Set(), lastAch: null, achAt: 0, achLog: [], achSeq: 0,
    diedAt: 0, lastDeathX: null,
  };
}

function addBot() {
  if (room.players.size >= MAX_PLAYERS) return null;
  const n = [...room.players.values()].filter(p => p.bot).length + 1;
  const p = makePlayer(`机器人 ${String(n).padStart(2, '0')}`, true);
  p.dept = 'AI 部门';
  p.sponsor = pick(['机房空调', '算力', '显卡风扇']);
  room.players.set(p.id, p);
  return p;
}

/* ------------------------------------------------------------------ 世界生成 */
function cactus(x) {
  const r = Math.random();
  if (r < 0.18) {
    return { x, w: 0.72, h: 0.72, k: 8, fragile: true, y0: 0, drift: 1.6 + Math.random() * 2.0 };
  }
  if (r < 0.55) return { x, w: 0.58, h: 0.95, k: 0, fragile: true, y0: 0 };
  if (r < 0.82) return { x, w: 0.62, h: 1.12, k: 1, fragile: true, y0: 0 };
  if (r < 0.93) return { x, w: 1.5, h: 0.95, k: 2, fragile: false, y0: 0 };
  return { x, w: 0.9, h: 0.5, k: 7, fragile: false, y0: 0.95 };  // 低空飞行物，要滑铲或跳过
}

function spawnWorld() {
  const lead = room.roster.length
    ? Math.max(...room.roster.map(id => room.players.get(id)?.x || 0))
    : 0;
  while (room.genX < lead + 90 && room.genX < RACE_LEN + 20) {
    const late = room.genX >= WATER_TO;
    const gap = late ? 6.8 + Math.random() * 3.4 : 8.5 + Math.random() * 5.5;
    room.genX += gap;
    if (room.genX > RACE_LEN - 8) break;
    if (room.carAt && !room.carSpawned && room.genX >= room.carAt) {
      room.items.push({ x: room.carAt + 1.2, y: 0.9, type: 'car' });
      room.carSpawned = true;
    }
    if (room.roadsterAt && !room.roadsterSpawned && room.genX >= room.roadsterAt) {
      room.items.push({ x: room.roadsterAt + 1.2, y: 0.9, type: 'roadster' });
      room.roadsterSpawned = true;
    }
    if (!room.waterKitSpawned && room.genX >= WATER_FROM - 6) {
      // 疯狂水世界三件套：过滤器 / 电鳗发电机 / 刺豚制氧机
      room.items.push({ x: WATER_FROM + 2.5, y: 1.05, type: 'filter' });
      room.items.push({ x: WATER_FROM + 34, y: 0.78, type: 'eel' });
      room.items.push({ x: WATER_FROM + 78, y: 0.82, type: 'puffer' });
      room.waterKitSpawned = true;
    }
    const inWater = room.genX >= WATER_FROM && room.genX <= WATER_TO;
    if (!inWater) {
      // 后半程（水世界之后）仙人掌更密，偶尔成排
      const chance = late ? 0.94 : 0.78;
      if (Math.random() < chance) room.obs.push(cactus(room.genX));
      if (late) {
        if (Math.random() < 0.30) room.obs.push(cactus(room.genX + 1.1 + Math.random() * 0.7));
        if (Math.random() < 0.10) room.obs.push(cactus(room.genX + 2.4 + Math.random() * 0.6));
      }
    }
    // 道具
    if (inWater) {
      const wr = Math.random();
      if (wr < 0.12) room.items.push({ x: room.genX + 4 + Math.random() * 4, y: 0.45, type: 'coin' });
      else if (wr < 0.22) room.items.push({ x: room.genX + 5, y: 0.4, type: 'heart' });
      else if (wr < 0.36) room.items.push({ x: room.genX + 5, y: 0.65, type: 'filter' });
      else if (wr < 0.56) room.items.push({ x: room.genX + 6, y: 0.70, type: 'eel' });
      else if (wr < 0.76) room.items.push({ x: room.genX + 7, y: 0.75, type: 'puffer' });
      else if (wr < 0.86) room.items.push({ x: room.genX + 5, y: 0.9, type: 'double' });
    } else {
      const r = Math.random();
      if (r < 0.42) room.items.push({ x: room.genX + 4 + Math.random() * 5, y: 0.55 + Math.random() * 1.1, type: 'coin' });
      else if (r < 0.52) room.items.push({ x: room.genX + 5 + Math.random() * 4, y: 0.5, type: 'heart' });
      else if (r < 0.57) room.items.push({ x: room.genX + 6, y: 0.8 + Math.random() * 0.7, type: 'battery' });
      else if (r < 0.68) room.items.push({ x: room.genX + 5, y: 1.0 + Math.random() * 1.0, type: "double" });
    }
  }
}

/* ------------------------------------------------------------------ 局 */
function startRound() {
  const all = [...room.players.values()];
  if (!all.length) return { error: '没有选手' };
  room.roster = all.map(p => p.id);
  room.obs = []; room.items = []; room.genX = 10;
  room.playT = 0; room.genX = 10;
  room.winner = null; room.report = ''; room.decree = null;
  room.stats = { deaths: 0, pranks: 0, defiance: 0, ach: 0, breaks: 0, coins: 0, slides: 0 };
  room.roundDeaths = 0; room.oldDone = false;
  room.boss = null; room.throws = []; room.needles = []; room.flashUntil = 0;
  room.car = null; room.carSaid = false; room.carSpawned = false;
  room.roadsterSpawned = false; room.waterKitSpawned = false;
  room.wishes = []; room.wishCount = 0; room.wishGlobalAt = 0;
  // 每局最多刷一辆稀有车：尊界（地面）或 Roadster（喷气）
  room.carAt = 0; room.roadsterAt = 0;
  const vroll = Math.random();
  if (vroll < 0.30) {
    room.carAt = RACE_LEN * 0.58 + Math.random() * RACE_LEN * 0.30;
  } else if (vroll < 0.56) {
    room.roadsterAt = RACE_LEN * 0.58 + Math.random() * RACE_LEN * 0.30;
  }
  room.water = { from: WATER_FROM, to: WATER_TO };
  room.waterSaid = false;
  room.tier = 0; room.feed = []; room.says = [];
  room.phase = 'countdown';
  room.countdownAt = Date.now() + 3000;
  room.nextDecreeAt = Date.now() + DECREE_EVERY[0] + Math.random() * 4000;
  room.lastIdleAt = Date.now();
  for (const p of all) {
    p.x = 0; p.y = 0; p.vy = 0; p.onground = true;
    p.hp = MAX_HP; p.coins = 0; p.batteryUntil = 0;
    p.dashUntil = 0; p.dashReadyAt = 0; p.slideUntil = 0; p.lastShiftAt = 0; p.crouch = false;
    p.invulnUntil = 0; p.dead = false; p.finished = false; p.finishAt = 0;
    p.hits = 0; p.slides = 0; p.breaks = 0; p.doubleJump = false; p.airJumped = false; p.flipUntil = 0;
    p.deaths = 0; p.jumps = 0; p.dist = 0;
    p.score = 3; p.nextScoreAt = 25;
    p.actQueue = []; p.prankUntil = 0; p.prankedByName = ''; p.prankItem = pick(PRANKS);
    p.defiantThisDecree = false; p.defianceCount = 0; p.idleJumps = 0;
    p.speedUntil = 0; p.speedMul = 1; p.wishCount = 0;
    p.hasCar = false; p.hasRoadster = false; p.inCar = false; p.wet = false;
    p.eelUntil = 0; p.bubbleUntil = 0; p.waterMask = 0;
    p.trace = [];
  }
  spawnWorld();
  room.say('start');
  room.say('countdown', {}, 0);
  room.feedAdd('比赛开始');
  return { ok: true };
}

function rankList() {
  return room.roster.map(id => room.players.get(id)).filter(Boolean).sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return a.finishAt - b.finishAt;
    return b.x - a.x;
  });
}

function endRound(winner, now, reason) {
  room.phase = 'result';
  room.resultAt = now;
  room.winner = winner ? winner.id : null;
  const s = room.stats;
  const rank = rankList();
  const top = rank[0];
  const tail = `全场 ${s.deaths} 次出局、${s.breaks} 根仙人掌被撞碎、${s.coins} 枚金币被捡走。`;
  if (reason === 'wipe') {
    room.report = `人类全军覆没。${winner ? winner.name + ' 捡了个冠军。' : '本届没有冠军。'}${tail}`;
  } else if (reason === 'boss') {
    room.report = `${winner ? winner.name + ' 打倒了终极仙人掌王。' : '仙人掌王倒下了。'}${tail}这是一场没有体育精神的比赛。`;
  } else {
    room.report = winner
      ? `${winner.name} 第一个冲线。${tail}这是一场没有体育精神的比赛。`
      : `无人生还。${top ? top.name + ' 跑得最远。' : ''}这很合理。`;
  }
  if (winner) {
    award(winner, 'champion');
    room.say('win', { name: winner.name }, room.tier);
    room.feedAdd(reason === 'boss' ? `${winner.name} 打倒了仙人掌王` : `${winner.name} 夺冠`);
    room.events.push({ type: 'win', pid: winner.id, name: winner.name, color: winner.color, trace: winner.trace.slice(-40) });
  } else {
    room.events.push({ type: 'win', pid: null, name: '无人生还', color: '#888', trace: [] });
  }
  room.tier = Math.min(3, room.tier + 1);
  room.events.push({ type: 'report', text: room.report });
}

function toLobby() {
  room.phase = 'lobby';
  room.winner = null;
  room.report = '';
  room.resultAt = 0;
  room.roster = [];
  room.obs = []; room.items = [];
  room.boss = null; room.throws = []; room.needles = []; room.flashUntil = 0;
  room.car = null; room.carSaid = false; room.carSpawned = false;
  room.roadsterSpawned = false; room.waterKitSpawned = false;
  room.wishes = []; room.wishCount = 0; room.wishGlobalAt = 0; room.carAt = 0; room.roadsterAt = 0;
  room.waterSaid = false;
  room.decree = null;
  room.playT = 0; room.tier = 0; room.feed = [];
  for (const p of room.players.values()) {
    p.dead = false; p.finished = false; p.hp = MAX_HP; p.coins = 0; p.deaths = 0; p.crouch = false;
    p.hasCar = false; p.hasRoadster = false; p.inCar = false; p.wet = false;
    p.eelUntil = 0; p.bubbleUntil = 0; p.waterMask = 0;
  }
}

/* ------------------------------------------------------------------ 动作 */
function act(p, name, now) {
  if (!p || p.dead || p.finished) return;
  if (room.phase === 'boss') {
    if (name === 'jump') p.vy = 6.2;
    else if (name === 'crouch') p.vy = -6.2;
    else if (name === 'dash' && now > (p.throwReadyAt || 0)) {
      p.throwReadyAt = now + THROW_CD;
      throwStuff(p, now);
    }
    return;
  }
  if (room.phase !== 'playing') return;
  if (name === 'jump') {
    if (p.onground) {
      p.vy = JUMP_V; p.onground = false; p.jumps++;
      const near = room.obs.some(o => o.x > p.x - 1 && o.x < p.x + 7);
      if (!near) { p.idleJumps++; if (p.idleJumps >= 3) award(p, 'empty_jump'); } else p.idleJumps = 0;
      if (room.decree && !p.defiantThisDecree) defy(p);
    } else if (p.doubleJump && !p.airJumped) {
      p.airJumped = true;
      p.vy = JUMP_V * 0.95;
      p.flipUntil = now + 480;
      room.feedAdd(`${p.name} 在空中蹬了一脚`);
      room.events.push({ type: 'doublejump', pid: p.id, x: p.x, y: p.y });
      award(p, 'air_jump');
    } else {
      p.jumpBufferedAt = now;   // 落地瞬间补跳
    }
  } else if (name === 'dash') {
    if (now >= p.dashReadyAt) {
      p.dashUntil = now + DASH_MS;
      p.dashReadyAt = now + DASH_CD;
      p.lastShiftAt = now;
      p.crouch = false;
      room.events.push({ type: 'dash', pid: p.id, x: p.x });
    }
  } else if (name === 'crouch') {
    if (now - p.lastShiftAt < 600 && p.onground) {
      p.slideUntil = now + SLIDE_MS;
      p.crouch = false;
      p.slides++; room.stats.slides++;
      room.events.push({ type: 'slide', pid: p.id, x: p.x });
    } else {
      p.crouch = true;
    }
  } else if (name === 'crouchEnd') {
    p.crouch = false;
  }
}

function speedOf(p, now) {
  let sp = BASE_SPEED;
  if (p.eelUntil > now) sp = 13.2;
  else if (p.batteryUntil > now) sp = 12.8;
  else if (p.slideUntil > now) sp = SLIDE_SPEED;
  else if (p.dashUntil > now) sp = DASH_SPEED;
  else if (p.crouch) sp = CROUCH_SPEED;
  if (p.speedUntil > now) sp *= (p.speedMul || 1);
  return sp;
}

function hurt(p, now, why) {
  if (p.dead || now < p.invulnUntil || now < (p.godUntil || 0)) return;
  if (now < p.bubbleUntil) {
    p.bubbleUntil = 0;
    p.invulnUntil = now + 900;
    room.hitstopUntil = now + 60;
    room.events.push({ type: 'bubble', pid: p.id, x: p.x });
    room.feedAdd(`${p.name} 的氧气泡挡了一下`);
    return;
  }
  p.hp--; p.hits++;
  room.hitstopUntil = now + 75;
  p.invulnUntil = now + 1300;
  p.vy = 4.2; p.y = Math.max(p.y, 0.15); p.onground = false;
  room.events.push({ type: 'hurt', pid: p.id, hp: p.hp, x: p.x, why });
  room.bump(0.25);
  if (p.hp <= 0) {
    p.dead = true; p.diedAt = now; p.deaths++; room.stats.deaths++; room.roundDeaths++;
    p.trace.push(traceFrame(p));
    room.events.push({ type: 'death', pid: p.id, name: p.name, color: p.color, trace: p.trace.slice(-30) });
    room.say('death', { name: p.name, n: p.deaths }, room.tier);
    room.feedAdd(`${p.name} 被抬走了`);
    if (room.roundDeaths === 1) award(p, 'first_blood');
    if (room.playT < 8) award(p, 'warm_up');
    if (p.jumps === 0) award(p, 'afk');
    if (p.lastDeathX !== null && Math.abs(p.lastDeathX - p.x) < 2) award(p, 'obstinate');
    p.lastDeathX = p.x;
  } else {
    room.feedAdd(`${p.name} 吃了一记 · 剩 ${p.hp} 血`);
    room.says.push({ text: `${p.name} 挨了一下。还剩 ${p.hp} 条命。`, tier: Math.min(2, Math.round(room.tier)) });
  }
}

function breakCactus(o, p, now) {
  const i = room.obs.indexOf(o);
  if (i >= 0) room.obs.splice(i, 1);
  room.stats.breaks++; p.breaks++;
  room.hitstopUntil = Math.max(room.hitstopUntil, now + 45);
  room.events.push({ type: 'break', x: o.x, y: o.y0 || 0, color: p.color, pid: p.id });
}

function collide(p, now) {
  const sliding = now < p.slideUntil;
  const pTop = p.y;
  const pBot = p.y + (sliding || p.crouch ? 0.70 : 1.05);
  for (const o of [...room.obs]) {
    if (Math.abs(o.x - p.x) > o.w / 2 + 0.40) continue;
    const y0 = o.y0 || 0;
    if (pTop >= y0 + o.h - 0.05 || pBot <= y0 + 0.05) continue;
    // 命中了
    if (p.batteryUntil > now || p.eelUntil > now) { breakCactus(o, p, now); continue; }
    if (sliding && o.fragile) {
      breakCactus(o, p, now);
      p.coins += 5; p.score += 1;
      room.feedAdd(`${p.name} 滑铲撞碎一根仙人掌`);
      continue;
    }
    if (sliding) {
      breakCactus(o, p, now);
      hurt(p, now, 'slide');
      continue;
    }
    breakCactus(o, p, now);
    hurt(p, now, 'hit');
    break;
  }
}

function pickup(p, now) {
  for (let i = room.items.length - 1; i >= 0; i--) {
    const it = room.items[i];
    if (Math.abs(it.x - p.x) > 0.9) continue;
    if (!(p.y < it.y + 0.75 && p.y + 1.25 > it.y - 0.25)) continue;
    if (it.type === 'heart') {
      if (p.hp >= MAX_HP) continue;
      p.hp++;
      room.feedAdd(`${p.name} 捡到红心 · ${p.hp}/${MAX_HP}`);
      room.events.push({ type: 'pickup', pid: p.id, kind: 'heart', x: it.x, y: it.y });
      room.items.splice(i, 1);
    } else if (it.type === 'coin') {
      p.coins += 10; room.stats.coins += 10;
      room.events.push({ type: 'pickup', pid: p.id, kind: 'coin', x: it.x, y: it.y });
      room.items.splice(i, 1);
      if (p.coins >= 100) award(p, 'collector');
    } else if (it.type === 'car') {
      if (p.bot) continue;   // 机器人不抢车，留给玩家
      p.hasCar = true;
      room.feedAdd(`${p.name} 捡到了尊界 V800`);
      room.says.push({ text: `${p.name} 捡到了一台尊`, tier: 0, censor: true });
      room.events.push({ type: 'caritem', pid: p.id, name: p.name, kind: 'zunjie' });
      room.items.splice(i, 1);
      award(p, 'carowner');
    } else if (it.type === 'roadster') {
      if (p.bot) continue;
      p.hasRoadster = true;
      room.feedAdd(`${p.name} 捡到了 Tesla Roadster 钥匙`);
      room.says.push({ text: `${p.name} 捡到了 Roadster。这次真的要起飞了。`, tier: 0 });
      room.events.push({ type: 'caritem', pid: p.id, name: p.name, kind: 'roadster' });
      room.items.splice(i, 1);
    } else if (it.type === 'filter') {
      p.coins += 50; p.hp = Math.min(MAX_HP, p.hp + 1);
      p.waterMask |= 1;
      room.feedAdd(`${p.name} 捡到海水过滤器 · 年入百万不是梦`);
      room.events.push({ type: 'wateritem', pid: p.id, kind: 'filter', x: it.x, y: it.y });
      room.items.splice(i, 1);
      room.say('filter', { name: p.name });
      award(p, 'filter');
      if ((p.waterMask & 7) === 7) award(p, 'watercombo');
    } else if (it.type === 'eel') {
      p.eelUntil = Math.max(p.eelUntil, now + EEL_MS);
      p.waterMask |= 2;
      room.feedAdd(`${p.name} 捡到电鳗发电机 · 电力冲刺 8 秒`);
      room.events.push({ type: 'wateritem', pid: p.id, kind: 'eel', x: it.x, y: it.y });
      room.items.splice(i, 1);
      room.say('eel', { name: p.name });
      award(p, 'eel');
      if ((p.waterMask & 7) === 7) award(p, 'watercombo');
    } else if (it.type === 'puffer') {
      p.hp = Math.min(MAX_HP, p.hp + 2);
      p.bubbleUntil = Math.max(p.bubbleUntil, now + PUFFER_MS);
      p.waterMask |= 4;
      room.feedAdd(`${p.name} 捡到刺豚制氧机 · 氧气泡护盾 12 秒`);
      room.events.push({ type: 'wateritem', pid: p.id, kind: 'puffer', x: it.x, y: it.y });
      room.items.splice(i, 1);
      room.say('puffer', { name: p.name });
      award(p, 'puffer');
      if ((p.waterMask & 7) === 7) award(p, 'watercombo');
    } else if (it.type === 'double') {
      p.doubleJump = true;
      room.feedAdd(`${p.name} 解锁了二段跳`);
      room.events.push({ type: 'pickup', pid: p.id, kind: 'double', x: it.x, y: it.y });
      room.items.splice(i, 1);
      room.says.push({ text: `${p.name} 拿到了二段跳。牛顿管不了他了。`, tier: 0 });
      award(p, 'air_unlock');
    } else if (it.type === 'battery') {
      p.batteryUntil = now + BATTERY_MS;
      room.feedAdd(`${p.name} 捡到电池 · 无敌冲刺 10 秒`);
      room.events.push({ type: 'pickup', pid: p.id, kind: 'battery', x: it.x, y: it.y });
      room.items.splice(i, 1);
      room.says.push({ text: `${p.name} 拿到了电池。现在没人拦得住他。`, tier: 0 });
      award(p, 'charged');
    }
  }
}



/* ------------------------------------------------------------------ 许愿池 */
const WISH_COOLDOWN = 5000;
const wishCool = new Map();   // 非选手许愿者的节流：key -> 下次可许愿时间

function wishSpawnItems(baseX, n) {
  const kinds = ['coin', 'coin', 'coin', 'heart', 'battery', 'double'];
  for (let i = 0; i < n; i++) {
    const t = kinds[Math.floor(Math.random() * kinds.length)];
    room.items.push({ x: baseX + 6 + i * 1.4, y: 0.55 + Math.random() * 1.3, type: t });
  }
  room.items.sort((a, b) => a.x - b.x);
}

function applyWish(w, now, byName, byPlayer) {
  const alive = room.alive();
  const targets = w.target.kind === 'all' ? alive
    : w.target.kind === 'none' ? []
    : alive.filter(p => p.id === w.target.id);
  const lead = alive.slice().sort((a, b) => b.x - a.x)[0] || null;
  const anchor = targets[0] || lead;
  const pickList = targets.length ? targets : (lead ? [lead] : []);

  switch (w.intent) {
    case 'cactus': {
      for (const p of pickList.slice(0, 3)) {
        for (let i = 0; i < w.magnitude; i++) {
          room.obs.push({ x: p.x + 8 + i * 1.1 + Math.random() * 1.2, w: 0.68, h: 1.1, k: 1, fragile: true, y0: 0, wish: true });
        }
      }
      room.obs.sort((a, b) => a.x - b.x);
      break;
    }
    case 'freeze':
      for (const p of targets) {
        p.prankUntil = now + w.magnitude;
        p.prankedByName = byName;
        p.lastPrank = { by: byName, at: now, kind: 'freeze' };
        room.events.push({ type: 'pranked', pid: p.id, name: p.name, by: byName });
      }
      break;
    case 'flash':
      room.flashUntil = now + 2200;
      room.events.push({ type: 'flash', by: byName });
      break;
    case 'coin':
      if (anchor) wishSpawnItems(anchor.x, Math.min(16, w.magnitude));
      break;
    case 'heart':
      for (const p of pickList) p.hp = Math.min(MAX_HP, p.hp + w.magnitude);
      break;
    case 'speed':
      for (const p of pickList) { p.speedUntil = now + w.magnitude; p.speedMul = 1.55; }
      break;
    case 'slow':
      for (const p of pickList) { p.speedUntil = now + w.magnitude; p.speedMul = 0.55; }
      break;
    case 'jump':
      for (const p of pickList) { p.vy = 15; p.onground = false; p.jumps++; p.y = Math.max(p.y, 0.01); }
      break;
    case 'car':
      if (anchor) room.items.push({ x: anchor.x + 10, y: 0.9, type: w.variant === 'roadster' ? 'roadster' : 'car' });
      break;
    case 'filter':
      if (anchor) room.items.push({ x: anchor.x + 8, y: 0.95, type: 'filter' });
      break;
    case 'item':
      if (anchor) wishSpawnItems(anchor.x, Math.min(12, w.magnitude));
      break;
    case 'boss': {
      const b = room.boss;
      if (b && b.hp > 0 && (room.phase === 'boss' || room.phase === 'crash')) {
        b.hp = Math.max(0, b.hp - w.magnitude);
        b.flashUntil = now + 160;
        if (byPlayer) b.lastHitBy = byPlayer.id;
        room.hitstopUntil = Math.max(room.hitstopUntil, now + 70);
        room.events.push({ type: 'bosshit', dmg: w.magnitude, at: RACE_LEN + 3 });
        if (b.hp <= 0) {
          const killer = byPlayer || (b.lastHitBy ? room.players.get(b.lastHitBy) : null);
          room.hitstopUntil = now + 240;
          room.events.push({ type: 'bossdown' });
          room.feedAdd('终极仙人掌王被许愿池打倒');
          room.say('bosswin', { name: killer ? killer.name : '许愿池' }, 0);
          endRound(killer || null, now, 'boss');
        }
      }
      break;
    }
  }
  return targets.length ? targets[0].name : (anchor ? anchor.name : w.target.name);
}

const THINGS = [
  ['🩴', 3], ['⌨️', 4], ['☕', 3], ['🍜', 5], ['🧻', 2], ['🪑', 7],
  ['📺', 6], ['🧦', 2], ['🥊', 4], ['🍌', 3], ['🔌', 4], ['🎳', 9],
];

function throwStuff(p, now) {
  const [emoji, dmg] = pick(THINGS);
  room.throws.push({ x: p.x + 1.0, y: p.y + 0.6, vx: 17, emoji, dmg, from: p.id, at: now });
  room.events.push({ type: 'throw', pid: p.id, emoji });
}

function enterBoss(now) {
  if (room.phase === 'boss' || room.boss) return;
  room.phase = 'boss';
  room.boss = { hp: BOSS_HP, maxHp: BOSS_HP, y: 2.8, t: 0, flashUntil: 0, nextShotAt: now + 1200, lastHitBy: null, dying: 0 };
  room.throws = []; room.needles = [];
  const alive = room.alive();
  alive.forEach((p, i) => {
    p.x = RACE_LEN - 9 + i * 1.5;
    p.y = Math.max(2.2, Math.min(3.6, p.y));
    p.vy = 0; p.throwReadyAt = 0; p.hp = Math.max(p.hp, 2);
  });
  room.say('boss', {}, 0);
  room.feedAdd('终极仙人掌王出现了');
  room.events.push({ type: 'boss', hp: BOSS_HP });
}

function startCar(pl, now) {
  if (room.phase !== 'playing') return false;
  room.phase = 'car';
  room.car = {
    type: 'zunjie',
    x: pl.x - 4, from: pl.x - 4, to: RACE_LEN + 2,
    t0: now, boardAt: now + 750, runDur: 2900, boarded: false, by: pl.id,
  };
  room.carSaid = false;
  pl.hasCar = false;
  room.say('carStart');
  room.feedAdd(`${pl.name}：没时间解释了，快上车`);
  room.events.push({ type: 'carstart', by: pl.name });
  room.tier = 0;
  award(pl, 'carowner');
  return true;
}

/* Tesla Roadster：从天而降 → 全员上车 → 喷气起飞 → 飞越赛道 → 俯冲撞王 */
function startRoadster(pl, now) {
  if (room.phase !== 'playing') return false;
  room.phase = 'car';
  const from = pl.x - 3;
  room.car = {
    type: 'roadster',
    x: from, from, to: RACE_LEN + 2,
    y: 9, stage: 'descend', t0: now,
    boardAt: now + 1000, runDur: 5900,
    boarded: false, hit: false, coinAt: 0, by: pl.id,
  };
  pl.hasRoadster = false;
  room.carSaid = false;
  room.say('roadsterStart');
  room.feedAdd(`${pl.name}：这次真的没时间解释了`);
  room.events.push({ type: 'roadsterstart', by: pl.name });
  award(pl, 'roadster');
  return true;
}

function roadsterTick(c, now) {
  const t = now - c.t0;
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  if (t < 1000) {
    c.stage = 'descend'; c.y = 9 - 7.4 * ease(t / 1000); c.x = c.from;
  } else if (t < 1500) {
    c.stage = 'hover'; c.y = 1.6 + Math.sin(t / 160) * 0.12; c.x = c.from;
  } else if (t < 2500) {
    c.stage = 'takeoff'; c.y = 1.6 + 4.9 * ease((t - 1500) / 1000); c.x = c.from;
    if (!c.tookOff) {
      c.tookOff = true;
      room.says.push({ text: '点火。三、二、一，起飞。', tier: 0 });
      room.events.push({ type: 'roadstertakeoff' });
    }
  } else if (t < 5200) {
    c.stage = 'fly';
    const k = ease((t - 2500) / 2700);
    c.x = c.from + (c.to - c.from) * k;
    c.y = 6.5 + Math.sin(t / 300) * 0.25;
    if (t > c.coinAt) {
      c.coinAt = t + 200;
      room.events.push({ type: 'cointrail', x: c.x, y: c.y });
    }
  } else if (t < 5900) {
    c.stage = 'dive';
    const k = ease((t - 5200) / 700);
    c.y = 6.5 - 5.2 * k; c.x = c.to;
  } else if (!c.hit) {
    c.hit = true; c.stage = 'hit'; c.crash = true;
    c.x = RACE_LEN - 0.6; c.y = 1.2;
    for (const id of room.roster) {
      const p = room.players.get(id);
      if (!p || p.dead) continue;
      p.inCar = false; p.hp = Math.max(p.hp, 4); p.coins += 25;
    }
    enterBoss(now);
    room.phase = 'crash';
    room.crashAt = now;
    room.crashUntil = now + 1250;
    if (room.boss) {
      room.boss.hp = Math.max(1, room.boss.hp - ROADSTER_DMG);
      room.boss.flashUntil = now + 520;
    }
    room.hitstopUntil = now + 520;
    let bi = 0;
    for (const id of room.roster) {
      const p = room.players.get(id);
      if (!p || p.dead) continue;
      p.x = RACE_LEN - 10 + bi * 1.5;
      p.y = 1.5 + Math.random() * 0.9;
      p.vy = 4.5 + Math.random() * 2.5;
      p.onground = false;
      p.inCar = false;
      bi++;
    }
    room.say('roadsterHit');
    room.feedAdd('Roadster 从王头顶俯冲下来');
    room.events.push({ type: 'carhit', car: 'roadster' });
    room.car = c;
    return;
  }

  if (!c.boarded && now >= c.boardAt) {
    c.boarded = true;
    for (const id of room.roster) {
      const p = room.players.get(id);
      if (p && !p.dead) p.inCar = true;
    }
    room.events.push({ type: 'carboad' });
    room.feedAdd('全员上车');
  }
}

function bossTick(now) {
  const b = room.boss;
  if (!b) return;
  b.t += DT;
  room.playT += DT;
  b.y = 2.7 + Math.sin(b.t * 1.1) * 0.8;

  for (const id of room.roster) {
    const p = room.players.get(id);
    if (!p || p.dead || p.finished) continue;
    p.vy += (2.3 - p.y) * 5 * DT;   // 悬浮回中，像在飞
    p.vy *= 0.92;
    p.y += p.vy * DT;
    if (p.y < 0.35) { p.y = 0.35; p.vy = 0; }
    if (p.y > 4.6) { p.y = 4.6; p.vy = 0; }
  }

  // 机器人也会扔东西
  for (const id of room.roster) {
    const p = room.players.get(id);
    if (!p || p.dead || p.finished || !p.bot) continue;
    if (now > (p.throwReadyAt || 0) && Math.random() < 0.5) {
      p.throwReadyAt = now + 650 + Math.random() * 600;
      throwStuff(p, now);
    }
  }

  // 王丢刺
  if (now > b.nextShotAt && b.hp > 0) {
    b.nextShotAt = now + 850 + Math.random() * 550;
    const targets = room.alive();
    const n = 1 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const t = targets.length ? pick(targets) : null;
      room.needles.push({ x: RACE_LEN + 2.2, y: b.y + (Math.random() - 0.5) * 1.1, vx: -7.6, ty: t ? t.y + 0.6 : 0.8 });
    }
  }

  for (let i = room.needles.length - 1; i >= 0; i--) {
    const n = room.needles[i];
    n.x += n.vx * DT;
    n.y += (n.ty - n.y) * Math.min(1, DT * 1.6);
    if (n.x < RACE_LEN - 22) { room.needles.splice(i, 1); continue; }
    for (const id of room.roster) {
      const p = room.players.get(id);
      if (!p || p.dead || p.finished) continue;
      if (Math.abs(n.x - p.x) < 0.5 && Math.abs(n.y - (p.y + 0.6)) < 0.75) {
        hurt(p, now, 'needle');
        room.needles.splice(i, 1);
        break;
      }
    }
  }

  // 全灭
  if (!room.alive().length && b.hp > 0) { endRound(null, now); return; }

  // 飞行道具
  for (let i = room.throws.length - 1; i >= 0; i--) {
    const t = room.throws[i];
    t.x += t.vx * DT;
    if (t.x > RACE_LEN + 5.5) { room.throws.splice(i, 1); continue; }
    if (b.hp > 0 && Math.abs(t.x - (RACE_LEN + 3)) < 1.5 && Math.abs(t.y - b.y) < 1.9) {
      b.hp = Math.max(0, b.hp - t.dmg);
      b.flashUntil = now + 90;
      room.hitstopUntil = Math.max(room.hitstopUntil, now + 26);
      b.lastHitBy = t.from;
      room.stats.breaks++;
      room.events.push({ type: 'bosshit', dmg: t.dmg, at: t.x });
      room.throws.splice(i, 1);
      if (b.hp <= 0) {
        const killer = room.players.get(b.lastHitBy) || null;
        room.hitstopUntil = now + 240;
        room.events.push({ type: 'bossdown' });
        room.feedAdd('终极仙人掌王倒了');
        room.say('bosswin', { name: killer ? killer.name : '大家' }, 0);
        endRound(killer, now, 'boss');
        return;
      }
    }
  }
}

/* ------------------------------------------------------------------ 指令 */
function updateDecree(now) {
  if (room.decree) {
    if (now > room.decree.until) {
      room.decree = null;
      room.nextDecreeAt = now + DECREE_EVERY[0] + Math.random() * (DECREE_EVERY[1] - DECREE_EVERY[0]);
      for (const id of room.roster) { const p = room.players.get(id); if (p) p.defiantThisDecree = false; }
      room.feedAdd('跳跃功能恢复（其实一直能跳）');
    }
    return;
  }
  if (now < room.nextDecreeAt) return;
  const dtext = pickTier(LINES.decree, room.tier) || '本赛段禁止跳跃。';
  room.decree = { text: dtext, until: now + DECREE_MS };
  for (const id of room.roster) { const p = room.players.get(id); if (p) p.defiantThisDecree = false; }
  room.says.push({ text: dtext, tier: Math.min(1, Math.round(room.tier)) });
  room.feedAdd('解说：禁止跳跃（跳了 +3 缺德值）');
  room.events.push({ type: 'decree', text: dtext, until: room.decree.until });
}

function defy(p) {
  p.defiantThisDecree = true;
  p.defianceCount++;
  p.score += 3; room.stats.defiance++;
  room.bump(0.55);
  room.say('defiance', { name: p.name }, room.tier);
  room.feedAdd(`${p.name} 违抗指令 +3 缺德值`);
  room.events.push({ type: 'defy', name: p.name });
  if (p.defianceCount === 1) award(p, 'rebel');
  if (p.defianceCount >= 3) award(p, 'disobedient');
}

/* ------------------------------------------------------------------ 轨迹 */
function traceFrame(p) {
  const obs = room.obs.filter(o => o.x > p.x - 12 && o.x < p.x + 16)
    .map(o => [Math.round(o.x * 10) / 10, o.w, o.h, o.y0 || 0, o.fragile ? 1 : 0]);
  const items = room.items.filter(i => i.x > p.x - 12 && i.x < p.x + 16)
    .map(i => [Math.round(i.x * 10) / 10, i.y, i.type]);
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 100) / 100, o: obs, i: items };
}

/* ------------------------------------------------------------------ 机器人 */
function botThink(p, now) {
  const ahead = room.obs.filter(o => o.x > p.x - 0.3 && o.x < p.x + 14).sort((a, b) => a.x - b.x)[0];
  if (ahead && p.onground) {
    const d = ahead.x - p.x;
    const trigger = 1.4 + speedOf(p, now) * 0.10;
    if (d < trigger) {
      const pressure = Math.min(1, room.playT / 55);
      if (Math.random() > 0.04 + pressure * 0.05) p.actQueue.push('jump');
    }
  }
  const item = room.items.filter(i => i.x > p.x && i.x < p.x + 6 && i.type !== 'coin').sort((a, b) => a.x - b.x)[0];
  if (item && p.onground && item.y > 1.0) p.actQueue.push('jump');
  if (now >= p.dashReadyAt && Math.random() < 0.008) p.actQueue.push('dash');
}

/* ------------------------------------------------------------------ 主循环 */
let lastSweep = 0;

function step() {
  const now = Date.now();
  const r = room;
  tickNo++;

  // 命中停顿：整个世界冻一下
  if (now < r.hitstopUntil) { broadcast(); return; }


  if (r.phase === 'countdown' && now >= r.countdownAt) {
    r.phase = 'playing';
    r.playT = 0;
  }

  if (r.phase === 'crash') {
    for (const id of r.roster) {
      const p = r.players.get(id);
      if (!p || p.dead) continue;
      if (!p.onground) {
        p.vy -= GRAV * DT;
        p.y += p.vy * DT;
        if (p.y <= 0) { p.y = 0; p.vy = 0; p.onground = true; }
      }
    }
    if (now >= r.crashUntil) {
      r.phase = 'boss';
      if (r.boss) r.boss.nextShotAt = now + 700;
    }
  }

  if (r.phase === 'result' && r.resultAt && now - r.resultAt > 45000) {
    toLobby();
  }

  if (r.phase === 'car' && r.car) {
    const c = r.car;
    if (c.type === 'roadster') { roadsterTick(c, now); }
    else {
    if (!c.boarded && now >= c.boardAt) {
      c.boarded = true;
      for (const id of r.roster) {
        const p = r.players.get(id);
        if (p && !p.dead) p.inCar = true;
      }
      r.events.push({ type: 'carboad' });
      r.feedAdd('全员上车');
    }
    const pr = Math.min(1, Math.max(0, now - c.boardAt) / c.runDur);
    c.x = c.from + (c.to - c.from) * (pr * pr * (3 - 2 * pr));
    for (const o of [...r.obs]) {
      if (o.x < c.x + 2) {
        const idx = r.obs.indexOf(o);
        if (idx >= 0) r.obs.splice(idx, 1);
        room.events.push({ type: 'break', x: o.x, y: o.y0 || 0, color: '#ffd23f', pid: null });
      }
    }
    for (let i = r.items.length - 1; i >= 0; i--) {
      const it = r.items[i];
      if (it.x < c.x + 2) {
        r.items.splice(i, 1);
        room.events.push({ type: 'pickup', kind: it.type, x: it.x, y: it.y, pid: null });
      }
    }
    if (!r.carSaid && pr > 0.55) {
      r.carSaid = true;
      room.says.push({ text: '进步的道路上，怎么能刹车。', tier: 0 });
    }
    if (now >= c.boardAt + c.runDur) {
      for (const id of r.roster) {
        const p = r.players.get(id);
        if (!p || p.dead) continue;
        p.inCar = false; p.hp = Math.max(p.hp, 4); p.coins += 15;
      }
      enterBoss(now);
      room.phase = 'crash';
      room.crashAt = now;
      room.crashUntil = now + 1250;
      if (room.boss) {
        room.boss.hp = Math.max(1, Math.floor(room.boss.maxHp * 0.5));
        room.boss.flashUntil = now + 480;
      }
      room.hitstopUntil = now + 420;
      // 全员从车里弹出来
      let bi = 0;
      for (const id of r.roster) {
        const p = r.players.get(id);
        if (!p || p.dead) continue;
        p.x = RACE_LEN - 10 + bi * 1.5;
        p.y = 1.4 + Math.random() * 0.9;
        p.vy = 4.5 + Math.random() * 2.5;
        p.onground = false;
        p.inCar = false;
        bi++;
      }
      c.x = RACE_LEN - 0.6;
      c.crash = true;
      room.say('carHit');
      room.feedAdd('尊界 V800 一头撞进了仙人掌王');
      room.events.push({ type: 'carhit' });
      room.car = c;
    }
    }
  }

  if (r.phase === 'playing') {
    r.playT += DT;
    updateDecree(now);

    for (const id of r.roster) {
      const p = r.players.get(id);
      if (!p || p.dead || p.finished) continue;

      if (p.bot) botThink(p, now);
      while (p.actQueue.length) {
        const a = p.actQueue.shift();
        if (a === 'jump' && r.decree && !p.defiantThisDecree) { act(p, a, now); defy(p); }
        else act(p, a, now);
      }

      const sp = speedOf(p, now);
      p.x += sp * DT;
      p.dist += sp * DT;

      // 疯狂水世界：这一段在水上跑
      const inWater = p.x >= r.water.from && p.x <= r.water.to;
      if (inWater && p.y < 0.7) {
        if (!p.wet) {
          p.wet = true;
          room.events.push({ type: 'splash', pid: p.id, x: p.x, y: 0 });
        }
        if (p.onground && now > (p.splashAt || 0)) {
          p.splashAt = now + 220;
          room.events.push({ type: 'splash', pid: p.id, x: p.x, y: 0 });
        }
      } else p.wet = false;
      if (!r.waterSaid && p.x >= r.water.from) {
        r.waterSaid = true;
        room.say('water');
        room.feedAdd('前方路段被淹了 · 疯狂水世界，启动！');
        room.events.push({ type: 'water' });
        award(p, 'waterrun');
      }

      p.vy -= GRAV * DT;
      p.y += p.vy * DT;
      if (p.y <= 0) {
        p.y = 0; p.vy = 0; p.onground = true; p.airJumped = false;
        if (p.jumpBufferedAt && now - p.jumpBufferedAt < 140) {
          p.jumpBufferedAt = 0;
          p.vy = JUMP_V; p.onground = false; p.jumps++;
        }
      } else p.onground = false;

      if (p.dist >= p.nextScoreAt) { p.score++; p.nextScoreAt += 25; }

      if (p.x >= RACE_LEN && room.phase === 'playing') {
        enterBoss(now);
        return;
      }
    }

    // 世界
    spawnWorld();
    for (const o of r.obs) if (o.k === 8) o.x -= (o.drift || 2) * DT;
    for (const id of r.roster) {
      const p = r.players.get(id);
      if (!p || p.dead || p.finished) continue;
      collide(p, now);
      pickup(p, now);
    }

    // 清理身后的东西
    const back = Math.min(...r.roster.map(id => r.players.get(id)?.x ?? 0));
    while (r.obs.length && r.obs[0].x < back - 16) r.obs.shift();
    while (r.items.length && r.items[0].x < back - 16) r.items.shift();

    for (const id of r.roster) {
      const p = r.players.get(id);
      if (!p || p.dead) continue;
      p.trace.push(traceFrame(p));
      if (p.trace.length > 45) p.trace.splice(0, p.trace.length - 45);
    }

    if (!r.oldDone && r.playT >= 30) {
      r.oldDone = true;
      for (const id of r.roster) {
        const p = r.players.get(id);
        if (p && !p.dead && !p.finished) award(p, 'old');
      }
    }

    // 全灭
    const humans = r.roster.map(id => r.players.get(id)).filter(p => p && !p.bot);
    if (humans.length && humans.every(p => p.dead) && r.phase === 'playing') {
      const last = humans.slice().sort((a, b) => b.diedAt - a.diedAt)[0];
      award(last, 'last_human');
      const bots = r.alive();
      endRound(bots[0] || null, now, 'wipe');
    }

    r.tier = Math.max(0, r.tier - DT * 0.06);
    if (now - r.lastIdleAt > 8000 && r.phase === 'playing') {
      r.lastIdleAt = now;
      const aliveN = r.alive().length;
      r.say('idle', { t: Math.round(r.playT), alive: aliveN }, Math.min(1, Math.round(r.tier)));
    }
  }

  if (r.phase === 'boss') bossTick(now);

  if (r.phase === 'result' && now - r.resultAt > 30000) toLobby();

  if (now - lastSweep > 5000) {
    lastSweep = now;
    if (r.phase === 'lobby' || r.phase === 'result') {
      for (const [id, p] of r.players) {
        if (!p.bot && now - p.lastSeen > 90000) r.players.delete(id);
      }
    }
  }

  // 60Hz 快照：PC 和手机拿同一份状态，减少“最后一帧”延迟；
  // 慢客户端由 broadcast() 里的 64KB 背压丢帧处理，不会越积越卡。
  broadcast();
}

/* ------------------------------------------------------------------ 快照 */
function snapshot() {
  const now = Date.now();
  const players = [...room.players.values()].map(p => ({
    id: p.id, name: p.name, color: p.color, dept: p.dept, sponsor: p.sponsor, pb: p.pb,
    skin: p.skin || 'pixel',
    bot: p.bot, inRound: room.roster.includes(p.id), slot: Math.max(0, room.roster.indexOf(p.id)),
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
    vy: Math.round(p.vy * 100) / 100,
    hp: p.hp, coins: p.coins, dead: p.dead, finished: p.finished, inCar: !!p.inCar,
    hasCar: !!p.hasCar, hasRoadster: !!p.hasRoadster, wet: !!p.wet,
    battery: Math.max(0, p.batteryUntil - now),
    eel: Math.max(0, p.eelUntil - now),
    bubble: Math.max(0, p.bubbleUntil - now),
    double: p.doubleJump,
    dashLeft: Math.max(0, p.dashUntil - now),
    slide: now < p.slideUntil,
    crouch: p.crouch,
    invuln: now < p.invulnUntil,
    score: p.score, jumps: p.jumps, ach: p.ach.size,
    prankLeft: Math.max(0, p.prankUntil - now),
    prankedBy: p.prankUntil > now ? p.prankedByName : '',
  }));
  const obs = room.obs
    .filter(o => o.x > -10 && o.x < RACE_LEN + 30)
    .map(o => [Math.round(o.x * 100) / 100, o.w, o.h, o.k, o.fragile ? 1 : 0, o.y0 || 0]);
  const items = room.items.map(i => [Math.round(i.x * 100) / 100, i.y, i.type]);
  const winner = room.winner ? room.players.get(room.winner) : null;
  return {
    code: room.code, phase: room.phase,
    t: Math.round(room.playT * 10) / 10,
    flashLeft: Math.max(0, room.flashUntil - now),
    carAt: room.carAt || 0,
    roadsterAt: room.roadsterAt || 0,
    water: room.water || { from: WATER_FROM, to: WATER_TO },
    car: room.car ? {
      x: Math.round(room.car.x * 100) / 100,
      y: Math.round((room.car.y || 0) * 100) / 100,
      from: room.car.from, to: room.car.to, t0: room.car.t0,
      boardAt: room.car.boardAt, dur: room.car.runDur,
      type: room.car.type || 'zunjie', stage: room.car.stage || '',
    } : null,
    boss: room.boss ? { hp: room.boss.hp, maxHp: room.boss.maxHp, y: Math.round(room.boss.y * 100) / 100, flash: room.boss.flashUntil > now } : null,
    throws: room.throws.map(t => [Math.round(t.x * 100) / 100, Math.round(t.y * 100) / 100, t.emoji]),
    needles: room.needles.map(n => [Math.round(n.x * 100) / 100, Math.round(n.y * 100) / 100]),
    raceLen: RACE_LEN,
    countdown: Math.max(0, Math.ceil((room.countdownAt - now) / 1000)),
    players, obs, items,
    wishes: room.wishes.slice(0, 6),
    wishCount: room.wishCount,
    feed: room.feed,
    decree: room.decree ? { text: room.decree.text, left: Math.max(0, room.decree.until - now) } : null,
    winner: winner ? { id: winner.id, name: winner.name, color: winner.color } : null,
    report: room.report,
    stats: room.stats,
    tier: Math.round(room.tier),
    lan: '', port: 443, baseUrl: BASE_URL,
  };
}



export { room, Room, snapshot, makePlayer, addBot, startRound, toLobby, act, applyWish, startCar, startRoadster, enterBoss, endRound, rankList, parseWish, BASE_URL, step, award, pick, PRESETS, PRANKS, PRANK_NAMES, WISH_COOLDOWN };
