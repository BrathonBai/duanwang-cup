import {
  room, snapshot, makePlayer, addBot, startRound, toLobby, act,
  applyWish, startCar, startRoadster, enterBoss, rankList, parseWish,
  step, award, pick, PRESETS, PRANKS, PRANK_NAMES, WISH_COOLDOWN,
} from './game-core.js';

const MAX_PLAYERS = 8;
const PRANK_COST = 3;
const RACE_LEN = 1024;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const readBody = async (req) => {
  try { return await req.json(); } catch { return {}; }
};

export class GameRoom {
  constructor(state) {
    this.state = state;
    this.clients = new Set();
    this.wishCool = new Map();
    if (room.players.size === 0) {
      addBot();
      addBot();
    }
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), 8);
  }

  frame() {
    return { type: 'frame', state: snapshot(), events: room.events, says: room.says };
  }

  push() {
    let msg = null;
    if (this.clients.size) msg = JSON.stringify(this.frame());
    for (const ws of this.clients) {
      try { ws.send(msg); } catch { this.clients.delete(ws); }
    }
    room.events = [];
    room.says = [];
  }

  tick() {
    try {
      const now = Date.now();
      let steps = 0;
      while (now - this.lastTick >= 16.666 && steps < 3) {
        step();
        this.lastTick += 16.666;
        steps++;
      }
      if (now - this.lastTick > 250) this.lastTick = now;
      if (steps) this.push();
    } catch (e) {
      // keep the room alive even if one tick throws
      room.events.push({ type: 'error', text: String(e && e.message || e) });
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      this.clients.add(server);
      const drop = () => this.clients.delete(server);
      server.addEventListener('close', drop);
      server.addEventListener('error', drop);
      server.send(JSON.stringify(this.frame()));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (p === '/api/state') return json(snapshot());

    if (p === '/api/join' && request.method === 'POST') {
      const b = await readBody(request);
      if (room.players.size >= MAX_PLAYERS) {
        const bot = [...room.players.values()].find(x => x.bot);
        if (bot && room.phase !== 'playing' && room.phase !== 'countdown') room.players.delete(bot.id);
        else return json({ error: '满员了，8 条赛道已经塞不下' }, 400);
      }
      let name = String(b.name || '').trim().slice(0, 12) || pick(PRESETS);
      const names = new Set([...room.players.values()].map(x => x.name));
      let n = name, i = 2;
      while (names.has(n)) n = `${name}${i++}`;
      const pl = makePlayer(n, false, b.skin);
      room.players.set(pl.id, pl);
      if (room.phase === 'playing' || room.phase === 'countdown') {
        pl.inRound = false;
        room.feedAdd(`${n} 已加入，下一局上场`);
      } else {
        pl.inRound = true;
        room.say('join', { name: pl.name, dept: pl.dept, pb: pl.pb, sponsor: pl.sponsor }, 0);
        room.feedAdd(`${n} 加入 · ${pl.dept}`);
      }
      return json({ ok: true, pid: pl.id, player: { id: pl.id, name: pl.name, dept: pl.dept, sponsor: pl.sponsor, pb: pl.pb, color: pl.color, skin: pl.skin } });
    }

    if ((p === '/api/jump' || p === '/api/act') && request.method === 'POST') {
      const b = await readBody(request);
      const pl = room.player(b.pid);
      if (!pl) return json({ error: 'no player' }, 404);
      pl.lastSeen = Date.now();
      const a = p === '/api/jump' ? 'jump' : (b.act || 'jump');
      if (Date.now() < pl.prankUntil) return json({ ok: true, blocked: true });
      act(pl, a, Date.now());
      return json({ ok: true });
    }

    if (p === '/api/release' && request.method === 'POST') {
      const b = await readBody(request);
      const pl = room.player(b.pid);
      if (pl) act(pl, 'crouchEnd', Date.now());
      return json({ ok: true });
    }

    if (p === '/api/prank' && request.method === 'POST') {
      const b = await readBody(request);
      const pl = room.player(b.pid);
      const now = Date.now();
      if (!pl) return json({ error: 'no player' }, 400);
      pl.lastSeen = now;
      if (room.phase !== 'playing') return json({ error: '比赛没开始' }, 400);
      if (pl.score < PRANK_COST) return json({ error: `缺德值不够，要 ${PRANK_COST}` }, 400);
      if (now - pl.lastPrankAt < 1200) return json({ error: '手太快了' }, 400);

      const kind = pl.prankItem || pick(PRANKS);
      pl.prankItem = pick(PRANKS);
      if (kind === 'flash') {
        pl.score -= PRANK_COST; pl.lastPrankAt = now; room.stats.pranks++; pl.prankCount++;
        room.flashUntil = now + 3000;
        room.feedAdd(`${pl.name} 扔出了傻瓜弹`);
        room.says.push({ text: `${pl.name} 说，要有光`, tier: 0 });
        room.events.push({ type: 'flash', by: pl.name });
        award(pl, 'light');
        if (pl.prankCount === 1) award(pl, 'first_bad');
        if (pl.prankCount >= 3) award(pl, 'repeat_offender');
        room.bump(0.4);
        return json({ ok: true, kind, target: '全场' });
      }

      const targets = room.alive().filter(x => x.id !== pl.id);
      if (!targets.length) return json({ error: '没有可以整的人' }, 400);
      const t = pick(targets);
      const leader = room.alive().slice().sort((a, b2) => b2.score - a.score)[0];
      pl.score -= PRANK_COST; pl.lastPrankAt = now; room.stats.pranks++;
      pl.prankCount++;
      if (pl.prankCount === 1) award(pl, 'first_bad');
      if (pl.prankCount >= 3) award(pl, 'repeat_offender');
      if (leader && leader.id === t.id && leader.id !== pl.id) award(pl, 'regicide');
      t.pranksReceived++;
      t.prankedAt = now;
      t.lastPrank = { by: pl.name, at: now, kind };
      if (t.pranksReceived >= 2) award(t, 'popular');
      if (kind === 'cactus') {
        const x = t.x + 9;
        room.obs.push({ x, w: 0.7, h: 1.15, k: 4, fragile: false, y0: 0, prank: true });
        room.obs.sort((a, b2) => a.x - b2.x);
        room.feedAdd(`${pl.name} 在 ${t.name} 前面放了一根仙人掌`);
      } else {
        t.prankUntil = now + 2600; t.prankedByName = pl.name;
        room.feedAdd(`${pl.name} 把 ${t.name} 的按钮改成了“提交”`);
        room.events.push({ type: 'pranked', pid: t.id, name: t.name, by: pl.name });
      }
      room.bump(0.5);
      room.say('prank', { a: pl.name, b: t.name, n: room.stats.pranks }, room.tier);
      return json({ ok: true, kind, target: t.name });
    }

    if (p === '/api/wish' && request.method === 'POST') {
      const b = await readBody(request);
      const now = Date.now();
      const text = String(b.text || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
      if (!text) return json({ error: '愿望是空的' }, 400);
      if (room.phase !== 'playing' && room.phase !== 'boss') return json({ error: '比赛开始后才能许愿' }, 400);
      const pl = b.pid ? room.player(b.pid) : null;
      const rawName = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
      if (pl) {
        pl.lastSeen = now;
        if (now - pl.lastWishAt < WISH_COOLDOWN) {
          const wait = WISH_COOLDOWN - (now - pl.lastWishAt);
          return json({ error: `愿望冷却中，${Math.ceil(wait / 1000)} 秒后再来`, wait }, 429);
        }
      } else {
        const ip = request.headers.get('cf-connecting-ip') || '';
        const key = `${rawName || '匿名'}|${ip}`;
        const next = this.wishCool.get(key) || 0;
        if (now < next) return json({ error: `愿望冷却中，${Math.ceil((next - now) / 1000)} 秒后再来`, wait: next - now }, 429);
        this.wishCool.set(key, now + WISH_COOLDOWN + 800);
        if (this.wishCool.size > 300) { for (const [k, t] of this.wishCool) if (t < now) this.wishCool.delete(k); }
      }
      if (now - room.wishGlobalAt < 450) return json({ error: '许愿池排队中，慢一点' }, 429);
      room.wishGlobalAt = now;

      const byName = pl ? pl.name : (rawName || '匿名观众');
      const w = parseWish(text, {
        selfId: pl ? pl.id : null,
        phase: room.phase,
        players: [...room.players.values()].map(x => ({ id: x.id, name: x.name, bot: x.bot, dead: x.dead, finished: x.finished, x: x.x })),
      });
      if (pl) {
        pl.lastWishAt = now; pl.wishCount++;
        award(pl, 'wish');
        if (pl.wishCount >= 3) award(pl, 'genie');
      }
      const hitName = applyWish(w, now, byName, pl || null);
      room.wishCount++;
      room.wishes.unshift({ text, by: byName, reply: w.reply, intent: w.intent, target: hitName || w.target.name, at: now });
      if (room.wishes.length > 10) room.wishes.length = 10;
      room.says.push({ text: w.reply, tier: 0 });
      room.events.push({ type: 'wish', text, by: byName, reply: w.reply, intent: w.intent, target: hitName || w.target.name });
      room.feedAdd(`✨ ${byName} 许愿：${text}`);
      return json({ ok: true, reply: w.reply, intent: w.intent, variant: w.variant || '', target: hitName || w.target.name, cooldown: WISH_COOLDOWN });
    }

    if (p === '/api/car' && request.method === 'POST') {
      const b = await readBody(request);
      const pl = room.player(b.pid);
      if (!pl) return json({ error: '没有这个选手' }, 400);
      if (pl.hasRoadster) {
        if (!startRoadster(pl, Date.now())) return json({ error: '现在不能起飞' }, 400);
        return json({ ok: true, kind: 'roadster' });
      }
      if (!pl.hasCar) return json({ error: '你还没有车' }, 400);
      if (!startCar(pl, Date.now())) return json({ error: '现在不能上车' }, 400);
      return json({ ok: true, kind: 'zunjie' });
    }

    if (p === '/api/solo' && request.method === 'POST') {
      for (const [id, pl] of [...room.players]) if (pl.bot) room.players.delete(id);
      room.roster = room.roster.filter(id => room.players.has(id));
      return json({ ok: true, left: room.players.size });
    }

    if (p === '/api/spawn' && request.method === 'POST') {
      const b = await readBody(request);
      const alive = room.alive();
      if (!alive.length) return json({ error: '没人' }, 400);
      const pl = b.pid ? room.player(b.pid) : null;
      const lead = pl || alive.slice().sort((a, b2) => b2.x - a.x)[0];
      const dx = typeof b.dx === 'number' ? b.dx : 2.2;
      room.items.push({ x: lead.x + dx, y: 0.9, type: b.type || 'car' });
      return json({ ok: true, x: lead.x + dx });
    }

    if (p === '/api/boss' && request.method === 'POST') {
      if (room.phase !== 'playing') return json({ error: '不在比赛中' }, 400);
      enterBoss(Date.now());
      return json({ ok: true });
    }

    if (p === '/api/say' && request.method === 'POST') {
      const b = await readBody(request);
      const text = String(b.text || '').slice(0, 500);
      if (!text) return json({ error: '没内容' }, 400);
      room.says.push({ text, tier: 0 });
      return json({ ok: true });
    }

    if (p === '/api/give' && request.method === 'POST') {
      const b = await readBody(request);
      const pl = room.player(b.pid);
      if (!pl) return json({ error: 'no player' }, 404);
      if (b.prank && PRANKS.includes(b.prank)) pl.prankItem = b.prank;
      if (b.car) pl.hasCar = true;
      if (b.roadster) pl.hasRoadster = true;
      if (typeof b.x === 'number') pl.x = Math.max(0, Math.min(RACE_LEN - 1, b.x));
      if (b.god) pl.godUntil = Date.now() + (b.godMs || 120000);
      if (b.double) pl.doubleJump = true;
      return json({ ok: true });
    }

    if (p === '/api/start' && request.method === 'POST') {
      if (room.phase === 'playing' || room.phase === 'countdown') return json({ error: '已经开始了' }, 400);
      return json(startRound());
    }
    if (p === '/api/reset' && request.method === 'POST') { toLobby(); return json({ ok: true }); }
    if (p === '/api/clear' && request.method === 'POST') {
      for (const [id, pl] of [...room.players]) if (!pl.bot) room.players.delete(id);
      while ([...room.players.values()].filter(x => x.bot).length < 2) addBot();
      toLobby();
      return json({ ok: true });
    }
    if (p === '/api/bot' && request.method === 'POST') {
      if (room.phase === 'playing' || room.phase === 'countdown') return json({ error: '局中不能加' }, 400);
      const b = addBot();
      return json({ ok: !!b, player: b ? { name: b.name } : null });
    }
    if (p === '/api/me') {
      const pl = room.player(url.searchParams.get('pid'));
      if (!pl) return json({ error: 'no player' }, 404);
      const now = Date.now();
      pl.lastSeen = now;
      return json({
        ok: true,
        name: pl.name, color: pl.color, dept: pl.dept, sponsor: pl.sponsor,
        score: pl.score, hp: pl.hp, coins: pl.coins, phase: room.phase, dead: pl.dead, finished: pl.finished,
        dashReady: Math.max(0, pl.dashReadyAt - now), slide: now < pl.slideUntil,
        battery: Math.max(0, pl.batteryUntil - now), eel: Math.max(0, pl.eelUntil - now), bubble: Math.max(0, pl.bubbleUntil - now),
        crouch: pl.crouch, double: pl.doubleJump,
        lastPrank: pl.lastPrank || null,
        prankItem: pl.prankItem, prankName: PRANK_NAMES[pl.prankItem] || '整蛊',
        hasCar: !!pl.hasCar, hasRoadster: !!pl.hasRoadster, skin: pl.skin || 'pixel',
        prankLeft: Math.max(0, pl.prankUntil - now),
        prankedBy: pl.prankUntil > now ? pl.prankedByName : '',
        canPrank: room.phase === 'playing' && pl.score >= PRANK_COST && room.alive().filter(x => x.id !== pl.id).length > 0,
        cost: PRANK_COST,
        aliveCount: room.alive().length,
        achCount: pl.ach.size, lastAch: pl.lastAch, achLog: pl.achLog.slice(-4),
        decree: room.decree ? { text: room.decree.text, left: Math.max(0, room.decree.until - now) } : null,
      });
    }

    return json({ error: 'not found' }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const id = env.ROOM.idFromName('main');
      return env.ROOM.get(id).fetch(request);
    }
    let path = url.pathname;
    if (path === '/') path = '/screen.html';
    else if (path === '/pad') path = '/pad.html';
    else if (path === '/wish') path = '/wish.html';
    else if (path === '/background') path = '/background.html';
    const assetUrl = new URL(request.url);
    assetUrl.pathname = path;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
