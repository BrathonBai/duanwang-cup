'use strict';
/* 大屏：渲染 + 解说 + 回放 */

const $ = s => document.querySelector(s);
const cv = $('#track');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const CACTUS_OK = '#6fbf3f';
const CACTUS_PRANK = '#ff3fa4';
const CACTUS_FLY = '#9ade4a';
const { rr, cactus: drawCactus, coin, heart, double: doubleIcon, battery: batteryIcon, key: drawKey, tumbleweed: drawTumbleweed, bandages: drawBandages, car: drawCar, roadster: drawRoadster, filter: drawFilter, eel: drawEel, puffer: drawPuffer, character: drawCharacter } = Cup;


function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * DPR));
  cv.height = Math.max(1, Math.round(r.height * DPR));
  W = r.width; H = r.height;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);

/* ------------------------------------------------------------------ 状态 */
let S = null;
let lastUi = 0, lobbySig = '', feedSig = '', resultShown = false;
let camFocus = null, camManual = false, wasLocalAlive = false;
const deathFx = new Map();
const flipStart = new Map();
const anims = new Map();
const parts = [];
const cam = { x: 0, pxm: 60, ground: 0 };
let shakeAmp = 12, shakeDur = 220, hurtAt = 0, flashAt = 0, flashDur = 520, carSeenAt = 0, carHintOn = false, crashFxAt = 0;

function shake(ms, amp) {
  shakeUntil = performance.now() + ms;
  shakeDur = ms;
  shakeAmp = Math.max(shakeAmp * 0.4, amp);
}
function puff(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    parts.push({
      x, y,
      vx: (Math.random() - .5) * spd,
      vy: -Math.random() * spd * .75,
      life: 1, size: 2 + Math.random() * 3.5, color,
    });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.life -= dt * 2.6;
    if (q.life <= 0) parts.splice(i, 1);
  }
}
function drawParts() {
  for (const q of parts) {
    ctx.globalAlpha = Math.max(0, q.life) * .9;
    ctx.fillStyle = q.color;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
let shakeUntil = 0;

/* ------------------------------------------------------------------ 恐龙精灵（Chromium 官方素材切片） */
const dinoImg = new Image();
dinoImg.src = '/dino.png';
const DINO_W = 44, DINO_H = 47;
const dinoTint = new Map();

function dinoSheet(color) {
  if (!dinoImg.complete || !dinoImg.naturalWidth) return null;
  let c = dinoTint.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = DINO_W * 3 * 2; c.height = DINO_H * 2;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(dinoImg, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  dinoTint.set(color, c);
  return c;
}

function drawDino(cx, x, bottom, h, color, frame = 0, opts = {}) {
  const w = h * (DINO_W / DINO_H);
  cx.save();
  if (opts.dead) {
    cx.globalAlpha = 0.5;
    cx.translate(x, bottom);
    cx.rotate(-Math.PI / 2);
    cx.translate(-x, -bottom + h);
  }
  const sheet = dinoSheet(color);
  if (sheet) {
    cx.imageSmoothingEnabled = false;
    const f = ((frame % 3) + 3) % 3;
    cx.drawImage(sheet, f * DINO_W * 2, 0, DINO_W * 2, DINO_H * 2, x - w / 2, bottom - h, w, h);
  } else {
    cx.fillStyle = color;
    cx.fillRect(x - w / 2, bottom - h, w, h);
  }
  cx.restore();
}

function drawPlayerDino(cx, p, x, bottom, h, frame = 0) {
  if ((p.skin === 'deepseek' || p.skin === 'maid') && drawCharacter) drawCharacter(cx, x, bottom, h, p.skin, frame);
  else drawDino(cx, x, bottom, h, p.color, frame);
}

// 飞行模式的小翅膀
function drawWings(cx, x, y, w, now, color) {
  const flap = 0.5 + Math.sin(now / 70) * 0.5;
  const span = w * 0.95, rise = w * 0.55 * flap, drop = w * 0.30;
  cx.save();
  cx.fillStyle = color || '#f2eee3';
  cx.globalAlpha = 0.92;
  cx.beginPath();
  cx.moveTo(x - w * 0.30, y + w * 0.05);
  cx.lineTo(x - w * 0.30 - span, y - rise);
  cx.lineTo(x - w * 0.30 - span * 0.60, y + drop);
  cx.lineTo(x - w * 0.26, y + w * 0.22);
  cx.closePath(); cx.fill();
  cx.beginPath();
  cx.moveTo(x + w * 0.30, y + w * 0.05);
  cx.lineTo(x + w * 0.30 + span, y - rise);
  cx.lineTo(x + w * 0.30 + span * 0.60, y + drop);
  cx.lineTo(x + w * 0.26, y + w * 0.22);
  cx.closePath(); cx.fill();
  cx.restore();
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141414');
  g.addColorStop(0.62, '#0d0d0d');
  g.addColorStop(1, '#070707');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const ps = S ? (S.players || []).filter(p => p.inRound) : [];
  if (!ps.length) { drawIdle(now); return; }

  // 站位错开：只影响绘制，不影响真实名次
  const slotX = p => p.x;   // 只用于镜头取位；绘制也用它，保证和碰撞一致
  let viewM, camX, pxm;
  let ground = H * 0.78;

  const meCar = locals.length ? S.players.find(p => p.id === locals[0].pid && (p.hasCar || p.hasRoadster)) : null;
  if (!!meCar !== carHintOn) {
    carHintOn = !!meCar;
    const hint = document.getElementById('carHint');
    if (hint) hint.classList.toggle('hidden', !carHintOn);
  }

  if (S.phase === 'car' && S.car) {
    const isRoadster = S.car.type === 'roadster';
    viewM = isRoadster ? 30 : 18;
    pxm = W / viewM;
    camX = S.car.x - viewM * 0.38;
    ground = H * (isRoadster ? 0.86 : 0.80);
  } else if (S.boss) {
    // Boss 战场：固定机位，王在右，人在左
    viewM = 20;
    pxm = W / viewM;
    camX = S.raceLen - 14;
    ground = H * 0.86;
  } else {
    // 镜头：活着跟自己，死了跟别人，可手动切换
    const alive = ps.filter(p => !p.dead);
    const localP = locals.length ? alive.find(p => p.id === locals[0].pid) : null;
    let focus = null;
    if (!camManual && localP) { camFocus = localP.id; focus = localP; }
    else {
      focus = alive.find(p => p.id === camFocus) || null;
      if (!focus) {
        focus = alive.slice().sort((a, b) => b.x - a.x)[0] || null;
        if (focus) camFocus = focus.id;
      }
    }
    if (focus) {
      viewM = 16;
      pxm = W / viewM;
      camX = slotX(focus) - viewM * 0.30;
    } else {
      const lead = Math.max(...ps.map(slotX));
      const back = Math.min(...ps.map(slotX));
      const spread = Math.max(0, lead - back);
      viewM = Math.max(16, Math.min(34, 15 + spread * 1.15));
      pxm = W / viewM;
      camX = (lead + back) / 2 - viewM * 0.5;
    }
    camX = Math.max(-4, camX);
  }
  const worldX = x => (x - camX) * pxm;
  cam.x = camX; cam.pxm = pxm; cam.ground = ground;

  if (now < shakeUntil) {
    const k = Math.max(0, (shakeUntil - now) / shakeDur);
    ctx.save();
    ctx.translate((Math.random() - .5) * shakeAmp * k, (Math.random() - .5) * shakeAmp * 0.72 * k);
  }

  // 远景：城市天际线 + 云
  for (const L of [
    { spd: 0.16, h: H * 0.30, w: 110, gap: 34, color: '#151515', win: 0.05 },
    { spd: 0.4, h: H * 0.17, w: 74, gap: 22, color: '#1c1c1c', win: 0.08 },
  ]) {
    const step = L.w + L.gap;
    const off = ((camX * pxm * L.spd) % step + step) % step;
    for (let i = -1; i < W / step + 2; i++) {
      const x = i * step - off;
      const seed = Math.abs(Math.floor((x + camX * pxm * L.spd) / step));
      const hh = L.h * (0.45 + ((seed * 37) % 10) / 13);
      ctx.fillStyle = L.color;
      ctx.fillRect(x, ground - hh, L.w, hh);
      ctx.fillStyle = `rgba(255,210,63,${L.win})`;
      for (let wy = ground - hh + 16; wy < ground - 12; wy += 24) {
        for (let wx = x + 10; wx < x + L.w - 12; wx += 20) {
          if ((seed + wx * 3 + wy) % 4 === 0) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }
  ctx.fillStyle = '#191919';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 520 - camX * pxm * 0.08) % (W + 700)) - 200;
    const cy = 60 + (i % 3) * 46;
    ctx.beginPath(); ctx.ellipse(cx, cy, 70, 18, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 36, cy - 10, 46, 16, 0, 0, 7); ctx.fill();
  }

  // 地面
  const fg = ctx.createLinearGradient(0, ground, 0, H);
  fg.addColorStop(0, '#0e0e0e');
  fg.addColorStop(1, '#050505');
  ctx.fillStyle = fg;
  ctx.fillRect(0, ground, W, H - ground);
  ctx.fillStyle = 'rgba(255,210,63,.06)';
  ctx.fillRect(0, ground + 18, W, 2);
  ctx.strokeStyle = 'rgba(255,210,63,.55)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,63,.13)';
  ctx.lineWidth = 2;
  const off = ((camX * pxm) % 52 + 52) % 52;
  for (let x = -off; x < W; x += 52) {
    ctx.beginPath(); ctx.moveTo(x, ground + 8); ctx.lineTo(x + 26, ground + 8); ctx.stroke();
  }

  // 疯狂水世界：被淹的路段
  if (S.water) {
    const wx0 = worldX(S.water.from), wx1 = worldX(S.water.to);
    if (wx1 > -60 && wx0 < W + 60) {
      const x0 = Math.max(-60, wx0), x1 = Math.min(W + 60, wx1);
      const wg = ctx.createLinearGradient(0, ground, 0, H);
      wg.addColorStop(0, 'rgba(20,90,120,.95)');
      wg.addColorStop(0.25, 'rgba(8,46,70,.95)');
      wg.addColorStop(1, 'rgba(3,14,24,.98)');
      ctx.fillStyle = wg;
      ctx.fillRect(x0, ground, x1 - x0, H - ground);
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = `rgba(110,235,255,${0.30 - k * 0.055})`;
        ctx.lineWidth = k === 0 ? 2 : 1.5;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 6) {
          const y = ground + 6 + k * 11 + Math.sin((x + now * (0.05 + k * 0.01)) / 24 + k) * 3;
          if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(150,245,255,.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, ground); ctx.lineTo(x1, ground); ctx.stroke();
      ctx.fillStyle = 'rgba(220,250,255,.25)';
      for (let x = x0; x < x1; x += 18) {
        const h = 3 + Math.sin((x + now * 0.08) / 12) * 2;
        ctx.fillRect(x, ground - h, 10, h);
      }
      const sx = wx0 + 44;
      if (sx > -140 && sx < W + 140) {
        ctx.save();
        ctx.translate(sx, ground - 156);
        ctx.rotate(-0.03);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(-80, -48, 160, 82);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-86, 34, 172, 8);
        ctx.fillStyle = '#0a0a0a';
        ctx.font = '900 22px "PingFang SC",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('疯狂水世界', 0, -12);
        ctx.font = '700 11px "PingFang SC",sans-serif';
        ctx.fillText('开局一定要选海水过滤器', 0, 13);
        ctx.restore();
      }
    }
  }

  // 终点
  const fx = worldX(S.raceLen);
  if (!S.boss && fx > -140 && fx < W + 200) {
    const cw = 22;
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f2eee3' : '#111';
        ctx.fillRect(fx + j * cw * 0.55, ground - 260 + i * cw, cw * 0.55, cw);
      }
    }
    ctx.save();
    ctx.fillStyle = '#f2eee3';
    ctx.font = '900 22px "PingFang SC",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FINISH', fx + 30, ground - 200);
    ctx.restore();
  }

  // 道具
  for (const it of S.items || []) {
    const sx = worldX(it[0]);
    if (sx < -40 || sx > W + 40) continue;
    const sy = ground - it[1] * pxm + Math.sin(now / 300 + it[0]) * 4;
    const s = Math.max(9, pxm * 0.16);
    if (it[2] === 'coin') coin(ctx, sx, sy, s);
    else if (it[2] === 'heart') heart(ctx, sx, sy, s * 1.15, '#ff5aa0');
    else if (it[2] === 'battery') batteryIcon(ctx, sx, sy, s);
    else if (it[2] === 'double') doubleIcon(ctx, sx, sy, s);
    else if (it[2] === 'car') drawKey(ctx, sx, sy, s * 1.2, now);
    else if (it[2] === 'roadster') drawKey(ctx, sx, sy, s * 1.2, now, '#7fe7ff');
    else if (it[2] === 'filter') drawFilter(ctx, sx, sy, s * 0.9, now);
    else if (it[2] === 'eel') drawEel(ctx, sx, sy, s * 1.25, now);
    else if (it[2] === 'puffer') drawPuffer(ctx, sx, sy, s * 1.15, now);
  }

  // 障碍
  for (const o of S.obs || []) {
    const sx = worldX(o[0]);
    if (sx < -60 || sx > W + 60) continue;
    const base = ground - (o[5] || 0) * pxm;
    if (o[3] === 8) {
      drawTumbleweed(ctx, sx, base, o[2] * pxm * 0.5, now / 150 + o[0]);
    } else {
      const color = o[3] === 4 ? CACTUS_PRANK : (o[3] === 7 ? CACTUS_FLY : CACTUS_OK);
      drawCactus(ctx, sx, base, Math.min(4, o[1]) * pxm, Math.min(4, o[2]) * pxm, color, o[3] === 4);
      if (o[3] === 7) drawWings(ctx, sx, base - o[2] * pxm * 0.55, o[1] * pxm * 0.8, now, '#f2eee3');
    }
  }

  // 载具：尊界 V800 / Tesla Roadster
  if ((S.phase === 'car' || S.phase === 'crash') && S.car) {
    const isR = S.car.type === 'roadster';
    const carY = ground - (S.car.y || 0) * pxm;
    const riders = S.players.filter(p => p.inCar);
    if (isR) {
      const cx0 = worldX(S.car.x);
      let tilt = 0;
      if (S.phase === 'crash') tilt = -0.18;
      else if (S.car.stage === 'dive') tilt = 0.10;
      else if (S.car.stage === 'takeoff') tilt = -0.06;
      drawRoadster(ctx, cx0, carY, pxm, now, riders, {
        thrust: S.phase === 'crash' ? 0.45 : (S.car.stage === 'fly' ? 1 : 0.75),
        fly: (S.car.y || 0) > 0.8,
        tilt,
      });
      if ((S.car.y || 0) < 3 && (S.car.stage === 'hover' || S.car.stage === 'takeoff')) {
        if (Math.random() < 0.5) puff(cx0 - pxm * 1.4, ground - 4, 'rgba(190,240,255,.55)', 1, 120);
      }
    } else if (S.phase === 'crash') {
      const cx0 = worldX(S.car.x);
      ctx.save();
      const kk = Math.min(1, (now - (crashFxAt || now)) / 260);
      ctx.translate(cx0, ground);
      ctx.rotate(-0.17 * kk);
      ctx.translate(-cx0, -ground);
      drawCar(ctx, cx0, ground, pxm, now, []);
      ctx.restore();
    } else {
      if (!carSeenAt) carSeenAt = now;
      const moved = S.car.x > S.car.from + 0.5;
      const inK = moved ? 1 : Math.max(0, Math.min(1, (now - carSeenAt) / 550));
      const cx0 = worldX(S.car.x) - (1 - inK) * W * 0.78;
      drawCar(ctx, cx0, ground, pxm, now, riders);
      if (inK < 0.98) {
        ctx.fillStyle = 'rgba(255,255,255,.10)';
        ctx.fillRect(0, ground - 4, cx0 + 20, 3);
      }
    }
  } else if (S.phase !== 'car') carSeenAt = 0;

  // Boss
  if (S.boss && (S.phase === 'boss' || S.phase === 'crash')) {
    const bx = worldX(S.raceLen + 2);
    const by = ground - S.boss.y * pxm;
    const bh = 4.6 * pxm, bw = 1.9 * pxm;
    const flash = S.boss.flash;
    drawCactus(ctx, bx, by + bh * 0.5, bw, bh, flash ? '#ffffff' : '#86e04a', flash);
    // 眼睛
    ctx.save();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(bx - bw * 0.20, by - bh * 0.30, bw * 0.10, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw * 0.20, by - bh * 0.30, bw * 0.10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = Math.max(4, bw * 0.06);
    ctx.beginPath(); ctx.moveTo(bx - bw * 0.36, by - bh * 0.42); ctx.lineTo(bx - bw * 0.10, by - bh * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.36, by - bh * 0.42); ctx.lineTo(bx + bw * 0.10, by - bh * 0.34); ctx.stroke();
    // 王冠
    const cw = bw * 0.86, cy = by - bh * 0.56;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(bx - cw / 2, cy); ctx.lineTo(bx - cw / 2, cy - bh * 0.10);
    ctx.lineTo(bx - cw * 0.25, cy - bh * 0.03); ctx.lineTo(bx, cy - bh * 0.13);
    ctx.lineTo(bx + cw * 0.25, cy - bh * 0.03); ctx.lineTo(bx + cw / 2, cy - bh * 0.10);
    ctx.lineTo(bx + cw / 2, cy);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 玩家
  const sorted = ps.slice().sort((a, b) => a.x - b.x);
  for (const p of sorted) {
    if (p.dead || p.inCar) continue;
    const sx = worldX(p.x);
    if (sx < -80 || sx > W + 80) continue;
    const depth = (p.slot || 0) % 3;
    const py = ground - p.y * pxm - depth * 8;
    const dh = pxm * 1.02 * (1 - depth * 0.06);
    const frame = p.y > 0.02 ? 1 : (Math.floor(now / 105 + p.id) % 2 ? 2 : 0);
    const wet = !!(S.water && p.x >= S.water.from && p.x <= S.water.to && p.y < 0.4);

    // 本地平滑的动作状态
    let a = anims.get(p.id);
    if (!a) { a = { c: 0, s: 0, d: 0, land: 0, prevY: 0, t: now }; anims.set(p.id, a); }
    const adt = Math.min(0.05, Math.max(0.001, (now - a.t) / 1000)); a.t = now;
    const kk = 1 - Math.pow(0.0006, adt);
    a.c += ((p.crouch ? 1 : 0) - a.c) * kk;
    a.s += ((p.slide ? 1 : 0) - a.s) * Math.min(1, kk * 1.8);
    a.d += ((p.dashLeft > 0 ? 1 : 0) - a.d) * Math.min(1, kk * 2.6);
    if (p.y <= 0.02 && a.prevY > 0.25) {
      a.land = 1;
      puff(sx, py, wet ? 'rgba(120,235,255,.75)' : 'rgba(255,255,255,.55)', 6, 150);
    }
    a.land = Math.max(0, a.land - adt * 5.5);
    a.prevY = p.y;

    // 电池光环
    if (p.battery > 0) {
      ctx.save();
      const ba = 0.16 + 0.08 * Math.sin(now / 120);
      ctx.fillStyle = `rgba(168,230,58,${ba})`;
      ctx.beginPath(); ctx.arc(sx, py - dh * 0.5, dh * 0.85, 0, 7); ctx.fill();
      ctx.restore();
    }

    // 影子 / 水面涟漪
    ctx.save();
    if (wet) {
      ctx.strokeStyle = 'rgba(120,235,255,.55)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) {
        const rad = dh * (0.36 + k * 0.16) + Math.sin(now / 220 + k) * 3;
        ctx.beginPath(); ctx.ellipse(sx, ground + 4, rad, 3 + k, 0, 0, 7); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(sx, ground + 3, dh * 0.42, 5, 0, 0, 7); ctx.fill();
    }
    ctx.restore();

    // 冲刺残影 + 速度线
    if (a.d > 0.06) {
      ctx.save();
      for (let g2 = 1; g2 <= 3; g2++) {
        ctx.globalAlpha = 0.20 * a.d / g2;
        drawPlayerDino(ctx, p, sx - g2 * dh * 0.42, py, dh, frame);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.24 * a.d})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ly = py - dh * (0.15 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(sx - dh * (0.75 + i * 0.12), ly);
        ctx.lineTo(sx - dh * (1.5 + i * 0.16), ly);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 滑铲扬尘
    if (a.s > 0.25 && Math.random() < 0.55) {
      puff(sx - dh * 0.2, ground - 2, 'rgba(255,210,63,.45)', 1, 95);
    }

    ctx.save();
    const fs = flipStart.get(p.id);
    if (fs !== undefined) {
      const pr = (now - fs) / 460;
      if (pr >= 1 || p.y < 0.01) flipStart.delete(p.id);
      else {
        ctx.translate(sx, py - dh * 0.5);
        ctx.rotate(-pr * Math.PI * 2);
        ctx.translate(-sx, -(py - dh * 0.5));
      }
    }
    if (p.invuln) ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(now / 70));

    // 挤压拉伸：蹲、滑、落地、上升
    const stretch = Math.min(0.10, Math.max(0, p.vy || 0) * 0.011);
    const sy = (1 - 0.26 * a.c) * (1 - 0.22 * a.s) * (1 - 0.16 * a.land) * (1 + stretch);
    const sxk = (1 + 0.13 * a.c) * (1 + 0.20 * a.s) * (1 + 0.09 * a.land) * (1 - stretch * 0.55);
    ctx.translate(sx, py);
    ctx.scale(sxk, sy);
    if (a.s > 0.01) ctx.rotate(-0.40 * a.s);
    ctx.translate(-sx, -py);
    drawPlayerDino(ctx, p, sx, py + dh * 0.10 * a.s, dh, a.s > 0.3 ? 2 : frame);
    ctx.restore();

    if (p.hp < 5 && !p.dead) drawBandages(ctx, sx, py, dh, 5 - p.hp);

    // 名牌 + 血条
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.max(12, Math.min(17, pxm * 0.20))}px "PingFang SC",sans-serif`;
    ctx.fillStyle = p.color;
    const labelY = py - dh - 24 - (p.slot % 3) * 13;
    ctx.fillText(`${p.name}${p.double ? ' ⇈' : ''}${p.coins > 0 ? ' ✦' + p.coins : ''}`, sx, labelY);
    const pipW = 8, gap = 3;
    const total = 5 * pipW + 4 * gap;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < p.hp ? '#ff5aa0' : 'rgba(255,90,160,.18)';
      ctx.fillRect(sx - total / 2 + i * (pipW + gap), labelY + 7, pipW, 5);
    }
    ctx.restore();
  }

  drawParts();

  if (crashFxAt) {
    const k = 1 - Math.min(1, (now - crashFxAt) / 900);
    if (k > 0) {
      const bx = worldX(S.raceLen + 2);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = '#ffd23f';
      ctx.font = `900 ${Math.round(pxm * 1.9)}px "PingFang SC",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('轰！', bx - pxm * 1.2, ground - pxm * 3.4 - (1 - k) * 60);
      ctx.restore();
    }
  }

  // 投掷物 / 仙人掌刺
  for (const t of S.throws || []) {
    const sx = worldX(t[0]), sy = ground - t[1] * pxm;
    ctx.save();
    ctx.font = `${Math.max(16, pxm * 0.42)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t[2], sx, sy);
    ctx.restore();
  }
  for (const n of S.needles || []) {
    const sx = worldX(n[0]), sy = ground - n[1] * pxm;
    ctx.fillStyle = '#9ade4a';
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy); ctx.lineTo(sx + 10, sy - 7); ctx.lineTo(sx + 10, sy + 7);
    ctx.closePath(); ctx.fill();
  }

  if (now < shakeUntil) ctx.restore();

  const fa = 1 - Math.min(1, (now - flashAt) / flashDur);
  if (fa > 0) { ctx.fillStyle = `rgba(255,255,255,${fa * 0.65})`; ctx.fillRect(0, 0, W, H); }
  const ha = 1 - Math.min(1, (now - hurtAt) / 320);
  if (ha > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(255,40,80,0)');
    vg.addColorStop(1, `rgba(255,40,80,${ha * 0.5})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  if (S.boss) {
    const bw2 = W * 0.46, bx2 = (W - bw2) / 2, by2 = 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(bx2 - 3, by2 - 3, bw2 + 6, 22);
    ctx.fillStyle = '#2a0d18';
    ctx.fillRect(bx2, by2, bw2, 16);
    ctx.fillStyle = '#ff3fa4';
    ctx.fillRect(bx2, by2, bw2 * Math.max(0, S.boss.hp / S.boss.maxHp), 16);
    ctx.fillStyle = '#fff';
    ctx.font = '900 12px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`终极仙人掌王  ${S.boss.hp}/${S.boss.maxHp}`, W / 2, by2 + 12);
    ctx.restore();
  } else {
    const barY = 10, barH = 7, pad = 26;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(pad, barY, W - pad * 2, barH);
    ctx.fillStyle = 'rgba(255,210,63,.55)';
    ctx.fillRect(pad + (W - pad * 2) - 3, barY - 2, 3, barH + 4);
    for (const p of ps) {
      const px = pad + Math.min(1, p.x / S.raceLen) * (W - pad * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, barY + barH / 2, 5, 0, 7); ctx.fill();
    }
  }
}

function drawIdle(now) {
  const ground = H * 0.76;
  ctx.strokeStyle = 'rgba(255,210,63,.18)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
  const pxm = Math.min(W / 20, 70);
  for (let k = 0; k < 4; k++) {
    drawCactus(ctx, W * 0.55 + k * 160 + Math.sin(now / 2000 + k) * 6, ground, 26, 52 + k * 4, '#243024', false);
  }
  drawDino(ctx, W * 0.22, ground, 90, '#3a3a3a', 0);
}


/* ------------------------------------------------------------------ 回放 */
const pip = $('#pipCanvas');
const pctx = pip.getContext('2d');
pip.width = 840; pip.height = 472;
pctx.setTransform(2, 0, 0, 2, 0, 0);
const PIP_W = 420, PIP_H = 236;

let replay = null, replayQ = [];

function pushReplay(item) {
  replayQ.push(item);
  if (replayQ.length > 2) replayQ.shift();
  if (!replay) startReplay();
}
function startReplay() {
  const it = replayQ.shift();
  if (!it) return;
  replay = { ...it, t0: performance.now(), dur: it.win ? 3000 : 2400 };
  $('#pip').classList.remove('hidden');
  $('#pipName').textContent = it.win ? `${it.name} · 最后时刻` : `${it.name} · 出局`;
  $('#pip').style.boxShadow = it.win ? '8px 8px 0 rgba(255,210,63,.9)' : '8px 8px 0 rgba(255,63,164,.85)';
}
function drawPip(now) {
  if (!replay) return;
  const p = Math.max(0, (now - replay.t0) / replay.dur);
  if (p >= 1) {
    replay = null;
    $('#pip').classList.add('hidden');
    setTimeout(startReplay, 260);
    return;
  }
  const frames = replay.trace && replay.trace.length ? replay.trace : null;
  pctx.clearRect(0, 0, PIP_W, PIP_H);
  pctx.fillStyle = '#050505'; pctx.fillRect(0, 0, PIP_W, PIP_H);
  const ground = PIP_H - 44;
  pctx.strokeStyle = 'rgba(255,210,63,.5)'; pctx.lineWidth = 2;
  pctx.beginPath(); pctx.moveTo(0, ground); pctx.lineTo(PIP_W, ground); pctx.stroke();
  if (!frames) {
    pctx.fillStyle = '#666'; pctx.font = '700 14px sans-serif'; pctx.textAlign = 'center';
    pctx.fillText('无信号', PIP_W / 2, PIP_H / 2);
    return;
  }
  const idx = Math.max(0, Math.min(frames.length - 1, Math.floor(p * frames.length)));
  const f = frames[idx];
  const ppm = 24, px0 = PIP_W * 0.42;
  for (const o of f.o || []) {
    const sx = px0 + (o[0] - f.x) * ppm;
    if (sx < -30 || sx > PIP_W + 30) continue;
    drawCactus(pctx, sx, ground - (o[3] || 0) * ppm, o[1] * ppm, o[2] * ppm, o[4] ? CACTUS_OK : CACTUS_PRANK, false);
  }
  for (const it of f.i || []) {
    const sx = px0 + (it[0] - f.x) * ppm;
    if (sx < -20 || sx > PIP_W + 20) continue;
    const sy = ground - it[1] * ppm;
    if (it[2] === 'coin') coin(pctx, sx, sy, 6);
    else if (it[2] === 'heart') heart(pctx, sx, sy, 7, '#ff5aa0');
    else batteryIcon(pctx, sx, sy, 6);
  }
  drawDino(pctx, px0, ground - Math.min(f.y, 2) * ppm, 36, replay.color || '#ffd23f', 0);
  // 扫描线 + 时间码
  pctx.fillStyle = 'rgba(255,255,255,.028)';
  for (let y = 0; y < PIP_H; y += 3) pctx.fillRect(0, y, PIP_W, 1);
  pctx.fillStyle = 'rgba(255,63,164,.85)';
  pctx.font = '700 11px "SF Mono",monospace'; pctx.textAlign = 'left';
  pctx.fillText(`REC  ${(0.4 + p * 1.2).toFixed(2)}x`, 10, 16);
  if (p > 0.86) {
    pctx.fillStyle = `rgba(255,63,164,${(p - 0.86) * 3})`;
    pctx.fillRect(0, 0, PIP_W, PIP_H);
  }
  // 进度条
  pctx.fillStyle = '#ff3fa4';
  pctx.fillRect(0, PIP_H - 3, PIP_W * p, 3);
}

/* ------------------------------------------------------------------ TTS */
const TTS = {
  armed: false, muted: false, voice: null, q: [], speaking: false, warned: false,
  boost: 1.3,   // 默认比浏览器 1x 快 30%；`[` / `]` 可现场微调
  pick() {
    const vs = speechSynthesis.getVoices() || [];
    const zh = vs.filter(v => /zh|chinese|ting|mei|yun|xiaoxiao/i.test(v.lang + ' ' + v.name));
    return zh.find(v => /zh[-_]CN/i.test(v.lang)) || zh[0] || null;
  },
  adjust(d) {
    this.boost = Math.max(0.9, Math.min(1.6, Math.round((this.boost + d) * 100) / 100));
    showToast(`解说语速 ${this.boost.toFixed(2)}x`);
  },
  init() {
    this.voice = this.pick();
    speechSynthesis.addEventListener('voiceschanged', () => { this.voice = this.pick(); });
    setTimeout(() => { if (!this.voice) this.voice = this.pick(); }, 600);
  },
  arm() {
    if (this.armed) return;
    this.armed = true;
    this.voice = this.pick();
    if (!this.voice && !this.warned) {
      this.warned = true;
      showToast('没找到中文语音，先看字幕');
    }
  },
  say(text, tier, censor) {
    if (!text) return;
    this.q.push({ text, tier: tier | 0, at: performance.now(), censor: !!censor });
    if (this.q.length > 3) this.q.splice(0, this.q.length - 3);
    this.pump();
  },
  pump() {
    if (this.speaking) return;
    const now = performance.now();
    while (this.q.length && now - this.q[0].at > 2800) this.q.shift();
    if (!this.q.length) return;
    const it = this.q.shift();
    showSub(it.censor ? it.text + ' ████' : it.text);
    if (!this.armed || this.muted || !this.voice) {
      this.speaking = true;
      setTimeout(() => { this.speaking = false; this.pump(); }, Math.min(4200, 900 + it.text.length * 120));
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(it.text);
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.rate = Math.min(2, ([1, 1.07, 1.15, 1.28][it.tier] || 1) * this.boost);
      u.pitch = [1, .97, .92, .86][it.tier] || 1;
      u.volume = 1;
      u.onend = () => { this.speaking = false; setTimeout(() => this.pump(), 90); };
      u.onerror = () => { this.speaking = false; setTimeout(() => this.pump(), 90); };
      this.speaking = true;
      if (it.censor) {
        let fired = false;
        const fire = () => { if (!fired) { fired = true; censorBeep(0.75); } };
        u.onboundary = ev => { if (ev.charIndex >= it.text.length - 1) setTimeout(fire, 190); };
        setTimeout(fire, Math.max(420, (it.text.length * 210 + 90) / this.boost));
      }
      speechSynthesis.speak(u);
    } catch {
      this.speaking = false;
    }
  },
  stop() { try { speechSynthesis.cancel(); } catch { } this.speaking = false; this.q = []; }
};

function showSub(t) { $('#subtitle').innerHTML = brand(t); }

let actx = null;
function ding() {
  if (TTS.muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime;
    [880, 1318].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = t0 + i * 0.085;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.42);
    });
  } catch {}
}

function censorBeep(dur = 0.75) {
  if (TTS.muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1760, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    g.gain.setValueAtTime(0.22, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}

function pushAch(e) {
  const stack = $('#achStack');
  const el = document.createElement('div');
  el.className = 'ach';
  el.innerHTML = `<div class="ach-ico">🏆</div>
    <div class="ach-body">
      <div class="ach-kick">成 就 解 锁</div>
      <div class="ach-title">${brand(e.title)}</div>
      <div class="ach-desc">${brand(e.desc)}</div>
    </div>
    <div class="ach-pts">+${e.pts || 1}</div>`;
  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 4200);
  ding();
}
let toastTimer = 0;
function showToast(t) {
  const el = $('#toast');
  el.textContent = t; el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

/* ------------------------------------------------------------------ 本地键盘玩家 */
const KEYS = ['Space', 'KeyJ', 'KeyK'];
const KEY_LABEL = { Space: '空格', KeyJ: 'J', KeyK: 'K' };
let locals = [];

function isLocal(id) { return locals.some(l => l.pid === id); }
function saveLocals() { try { localStorage.setItem('cactus_locals', JSON.stringify(locals)); } catch {} }

function canSwitchCam() {
  if (!locals.length) return true;               // 纯手机局：主持人是观众
  if (!S) return false;
  const me = S.players.find(p => p.id === locals[0].pid);
  return !me || me.dead || me.finished;          // 只有出局/冲线后才允许切
}

function cycleFocus(dir) {
  if (!canSwitchCam()) return;
  if (!S) return;
  const alive = S.players.filter(p => p.inRound && !p.dead).sort((a, b) => b.x - a.x);
  if (!alive.length) return;
  let i = alive.findIndex(p => p.id === camFocus);
  if (i < 0) i = 0;
  else i = (i + dir + alive.length) % alive.length;
  camFocus = alive[i].id;
  camManual = true;
  lobbySig = '';
  showToast(`镜头 → ${alive[i].name}`);
}

function updateKbd() {
  lobbySig = '';
  const el = $('#kbdHint');
  if (!locals.length) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const keys = locals.map(l => KEY_LABEL[l.key]).join(' / ');
  el.innerHTML = `⌨ <b>${keys}</b> 跳 · <b>Shift</b> 冲刺 · <b>C</b> 蹲 · <b>Q</b> 整蛊`;
}

async function addLocal() {
  if (locals.length >= 3) { showToast('一台键盘最多三个人'); return; }
  const names = ['键盘侠', '键盘侠二号', '键盘侠三号'];
  const wantSkin = ['pixel', 'deepseek', 'maid'][locals.length] || 'pixel';
  const r = await post('/api/join', { name: names[locals.length], skin: wantSkin });
  if (!r.ok) { showToast(r.error || '进不来'); return; }
  const l = { pid: r.pid, name: r.player.name, key: KEYS[locals.length] };
  locals.push(l); saveLocals(); updateKbd();
  showToast(`${l.name} 入场 · ${KEY_LABEL[l.key]} 跳 · Q 整蛊`);
}

function dropLocal(pid) {
  locals = locals.filter(l => l.pid !== pid);
  saveLocals(); updateKbd();
}

async function restoreLocals() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('cactus_locals') || '[]'); } catch { }
  const out = [];
  for (const l of saved.slice(0, 3)) {
    try {
      const r = await fetch('/api/me?pid=' + l.pid).then(x => x.json());
      if (r.ok && r.name === l.name) out.push({ pid: l.pid, name: r.name });
    } catch { }
  }
  locals = out.map((l, i) => ({ ...l, key: KEYS[i] }));
  saveLocals(); updateKbd();
}

setInterval(async () => {
  for (const l of [...locals]) {
    try {
      const r = await fetch('/api/me?pid=' + l.pid).then(x => x.json());
      if (!r.ok) dropLocal(l.pid);
    } catch { }
  }
}, 25000);

/* ------------------------------------------------------------------ LIVE */
function handleFrame(d) {
  S = d.state; S.at = performance.now();
  for (const ev of d.events || []) onEvent(ev);
  for (const s of d.says || []) TTS.say(s.text, s.tier, s.censor);
  const now = performance.now();
  if (now - lastUi > 90) { lastUi = now; ui(); }
}

function connect() {
  // Cloudflare 上走 WebSocket；本地 Node 包仍走 SSE
  if (location.protocol === 'https:') {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss://' : 'ws://'}${location.host}/ws`);
    ws.onmessage = e => { try { handleFrame(JSON.parse(e.data)); } catch { } };
    ws.onclose = () => setTimeout(connect, 1000);
    return;
  }
  const es = new EventSource('/api/live');
  es.onmessage = e => { try { handleFrame(JSON.parse(e.data)); } catch { } };
}

function onEvent(e) {
  if (e.type === 'death') {
    deathFx.set(e.pid, performance.now());
    shakeUntil = performance.now() + 240;
    pushReplay({ name: e.name, color: e.color, trace: e.trace });
  } else if (e.type === 'win') {
    replayQ = [];
    replay = null;
    if (e.trace && e.trace.length) pushReplay({ name: e.name, color: e.color, trace: e.trace, win: true });
    resultShown = false;
  } else if (e.type === 'ach') {
    pushAch(e);
  } else if (e.type === 'doublejump') {
    flipStart.set(e.pid, performance.now());
  } else if (e.type === 'hurt') {
    shake(300, 17);
    hurtAt = performance.now();
    if (cam.pxm) puff((e.x - cam.x) * cam.pxm, cam.ground - 6, 'rgba(255,90,120,.85)', 12, 230);
  } else if (e.type === 'break') {
    shake(140, 9);
    if (cam.pxm) puff((e.x - cam.x) * cam.pxm, cam.ground - (e.y || 0) * cam.pxm, 'rgba(168,230,58,.9)', 10, 210);
  } else if (e.type === 'dash') {
    shake(90, 4);
  } else if (e.type === 'bosshit') {
    shake(110, 7);
    if (cam.pxm) puff((e.at - cam.x) * cam.pxm, cam.ground - 3 * cam.pxm, 'rgba(255,210,63,.9)', 7, 260);
  } else if (e.type === 'bossdown') {
    shake(600, 26);
    flashAt = performance.now(); flashDur = 520;
  } else if (e.type === 'carboad') {
    shake(220, 8);
    showToast('全员上车');
  } else if (e.type === 'roadsterstart' || e.type === 'carstart') {
    const wb = $('#waterBanner');
    if (wb) wb.classList.add('hidden');
    if (e.type === 'roadsterstart') {
      shake(200, 6);
      showToast('Tesla Roadster 正在降落');
    }
  } else if (e.type === 'roadstertakeoff') {
    shake(300, 12);
    showToast('喷气起飞');
  } else if (e.type === 'cointrail') {
    if (cam.pxm) puff((e.x - cam.x) * cam.pxm, cam.ground - (e.y || 0) * cam.pxm, 'rgba(255,210,63,.85)', 2, 120);
  } else if (e.type === 'splash') {
    if (cam.pxm) puff((e.x - cam.x) * cam.pxm, cam.ground + 2, 'rgba(120,235,255,.6)', 2, 90);
  } else if (e.type === 'water') {
    showWaterBanner();
  } else if (e.type === 'carhit') {
    crashFxAt = performance.now();
    shake(520, 26);
    flashAt = performance.now(); flashDur = 280;
    for (let i = 0; i < 22; i++) puff(W * 0.74, H * 0.60, i % 3 ? 'rgba(255,210,63,.95)' : 'rgba(255,255,255,.9)', 1, 320);
  } else if (e.type === 'flash') {
    flashAt = performance.now(); flashDur = 300;
    showToast(`${e.by} 扔出了傻瓜弹`);
  } else if (e.type === 'defy') {
    showToast(`${e.name} 违抗解说 +3 缺德值`);
  } else if (e.type === 'pranked') {
    showToast(`${e.name} 的按钮被 ${e.by} 改成了「提交」`);
  } else if (e.type === 'wish') {
    showWishBanner(e);
  }
}

/* ------------------------------------------------------------------ UI */
function ui() {
  if (!S) return;
  const ph = S.phase;
  const tag = $('#phaseTag');
  const label = { lobby: '等待选手', countdown: '即将开始', playing: '比赛中', boss: 'BOSS 战', car: (S.car && S.car.type === 'roadster') ? 'Roadster 起飞中' : 'V800 加速中', crash: '撞击！', result: '已结束' }[ph] || ph;
  tag.innerHTML = brand(label);
  tag.classList.toggle('on', ph === 'playing');

  const t = Math.floor(S.t || 0);
  $('#clock').textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  $('#roomCode').textContent = S.code;
  paintJoin();

  $('#lobby').classList.toggle('hidden', ph !== 'lobby');
  if (ph === 'lobby' || ph === 'countdown') {
    camManual = false; camFocus = null;
    replayQ = []; replay = null;
    const pipEl = $('#pip'); if (pipEl) pipEl.classList.add('hidden');
    deathFx.clear();
  }
  const cd = $('#countdown');
  if (ph === 'countdown') {
    cd.classList.remove('hidden');
    $('#cdNum').textContent = Math.max(1, S.countdown);
  } else cd.classList.add('hidden');

  // 指令
  const dec = $('#decree');
  if (S.decree) {
    dec.classList.remove('hidden');
    $('#decreeText').textContent = S.decree.text;
    $('#decreeBar').style.transform = `scaleX(${Math.max(0, S.decree.left / 4500)})`;
  } else dec.classList.add('hidden');

  // 选手卡
  if (ph === 'lobby' || ph === 'countdown') renderCards();

  // 结算
  if (ph === 'result') {
    if (!resultShown) {
      resultShown = true;
      fillResult();
      setTimeout(() => { if (S && S.phase === 'result') $('#result').classList.remove('hidden'); }, 1700);
    }
  } else {
    $('#result').classList.add('hidden');
    resultShown = false;
  }

  // 观战角标
  const localMe = locals.length ? S.players.find(p => p.id === locals[0].pid) : null;
  const focusP = camFocus ? S.players.find(p => p.id === camFocus) : null;
  const spec = $('#spec');
  if (locals.length && focusP && localMe && focusP.id !== localMe.id) {
    spec.classList.remove('hidden');
    spec.innerHTML = `👁 观战 <b>${esc(focusP.name)}</b> <span>· A / D 切换</span>`;
  } else spec.classList.add('hidden');

  // 本地玩家刚死：自动把镜头交出去
  if (localMe) {
    if (wasLocalAlive && localMe.dead && !S.boss) {
      camManual = false; camFocus = null;
      const nxt = S.players.filter(p => p.inRound && !p.dead).sort((a, b) => b.x - a.x)[0];
      if (nxt) { camFocus = nxt.id; showToast(`你出局了 · 镜头跟着 ${nxt.name}`); }
    }
    wasLocalAlive = !localMe.dead;
  }

  // 缺德流
  const sig = (S.feed || []).map(f => f.text).join('|');
  if (sig !== feedSig) {
    feedSig = sig;
    $('#feed').innerHTML = (S.feed || []).slice(0, 6).map(f => `<div>${brand(f.text)}</div>`).join('');
  }
}

function renderCards() {
  const sig = S.players.map(p => p.id + p.name + p.color).join(',') + '|' + S.phase;
  if (sig === lobbySig) return;
  lobbySig = sig;
  $('#cards').innerHTML = S.players.map((p, i) => `
    <div class="card ${p.bot ? 'bot' : ''}" style="--c:${p.color};animation-delay:${i * 40}ms">
      <div class="bar"></div>
      ${p.bot ? '<div class="botflag">BOT</div>' : ''}
      ${isLocal(p.id) ? '<div class="kbdflag">⌨</div>' : ''}
      <div class="nm">${esc(p.name)}</div>
      <div class="dp">${esc(p.dept)}</div>
      <div class="row"><span>个人最好</span><b>${p.pb}s</b></div>
      <div class="row"><span>缺德值</span><b>${p.score}</b></div>
      <div class="row"><span>成就</span><b>${p.ach || 0}</b></div>
      <div class="spo">赞助商：${esc(p.sponsor)}</div>
    </div>`).join('');
}

function fillResult() {
  const w = S.winner;
  $('#rTitle').textContent = w ? '冠 军' : '全 员 阵 亡';
  $('#rName').textContent = w ? w.name : '无人生还';
  $('#rName').style.color = w ? (w.color || '#ffd23f') : '#888';
  $('#rReport').textContent = S.report || '';
  $('#rStats').innerHTML = `
    <div><b>${S.stats.deaths}</b>出局</div>
    <div><b>${S.stats.pranks}</b>整蛊</div>
    <div><b>${S.stats.defiance}</b>抗命</div>
    <div><b>${S.stats.ach || 0}</b>成就</div>
    <div><b>${Math.round(S.t)}</b>秒</div>`;
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function brand(s) { return esc(s).replace(/(尊界\s*V800|V800)/g, '<s>$1</s>'); }

/* ------------------------------------------------------------------ 交互 */
async function post(url, data) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data || {}) });
    return await r.json();
  } catch { return { error: '网络断了' }; }
}
function startGame() { if (document.activeElement) document.activeElement.blur(); post('/api/start'); }
$('#startBtn').onclick = () => { TTS.arm(); startGame(); };
$('#againBtn').onclick = () => { TTS.arm(); $('#result').classList.add('hidden'); startGame(); };
$('#kbdBtn').onclick = () => { TTS.arm(); addLocal(); };
$('#lobbyBtn').onclick = () => { post('/api/reset'); $('#result').classList.add('hidden'); resultShown = false; };
$('#botBtn').onclick = () => post('/api/bot');
$('#clearBtn').onclick = () => { if (confirm('清掉所有真人选手？')) { post('/api/clear'); locals = []; saveLocals(); updateKbd(); } };
$('#muteBtn').onclick = () => {
  TTS.muted = !TTS.muted;
  if (TTS.muted) TTS.stop();
  $('#muteBtn').textContent = TTS.muted ? '🔇 解说关' : '🔊 解说开';
};
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    if (e.code === 'Escape') closeWish();
    return;
  }
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    e.preventDefault();
    TTS.adjust(e.code === 'BracketRight' ? 0.08 : -0.08);
    return;
  }
  if (e.code === 'KeyW') {
    e.preventDefault();
    if (wishBox.classList.contains('hidden')) openWish(); else closeWish();
    return;
  }
  // 演示键：R 发 Roadster 钥匙，T 直接跳到疯狂水世界
  const demoPid = () => locals.length ? locals[0].pid
    : (S && S.players ? ((S.players.find(p => p.inRound && !p.dead && !p.bot)
      || S.players.find(p => p.inRound && !p.dead)) || {}).id : null);
  const keyPid = () => {
    if (!S || !S.players) return null;
    const p = S.players.find(x => x.inRound && !x.dead && (x.hasCar || x.hasRoadster));
    return p ? p.id : demoPid();
  };
  if (e.code === 'KeyR' && S && S.phase === 'playing' && demoPid()) {
    e.preventDefault();
    post('/api/give', { pid: demoPid(), roadster: true });
    showToast('Roadster 钥匙已发放 · 按 F 起飞');
    return;
  }
  if (e.code === 'KeyT' && S && S.phase === 'playing' && demoPid()) {
    e.preventDefault();
    post('/api/give', { pid: demoPid(), x: 600 });
    showToast('已跳到 600 米 · 疯狂水世界');
    return;
  }
  // F 呼叫载具：优先找真正拿着钥匙的人（手机玩家也行）
  if (!e.repeat && (e.code === 'KeyF' || e.code === 'KeyV') && S
      && S.phase === 'playing' && keyPid()) {
    e.preventDefault();
    post('/api/car', { pid: keyPid() });
    return;
  }
  if (S && (S.phase === 'playing' || S.phase === 'boss') && locals.length) {
    if (!e.repeat && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
      e.preventDefault();
      post('/api/act', { pid: locals[0].pid, act: 'dash' });
      return;
    }
    if (!e.repeat && e.code === 'KeyC') {
      e.preventDefault();
      post('/api/act', { pid: locals[0].pid, act: 'crouch' });
      return;
    }
    const l = locals.find(x => x.key === e.code);
    if (l) {
      e.preventDefault();
      if (!e.repeat) {
        post('/api/jump', { pid: l.pid });
        const me = S.players.find(x => x.id === l.pid);
        if (me && !me.dead && cam.pxm) puff((me.x - cam.x) * cam.pxm, cam.ground - 2, 'rgba(255,255,255,.5)', 4, 110);
      }
      return;
    }
  if (e.code === 'KeyQ') {
      e.preventDefault();
      post('/api/prank', { pid: locals[0].pid }).then(r => {
        if (r.ok) showToast(r.kind === 'cactus' ? `你给 ${r.target} 投了一根仙人掌` : `你把 ${r.target} 的按钮改成了「提交」`);
        else showToast(r.error || '整不了');
      });
      return;
    }
  }
  if (S && (e.code === 'KeyD' || e.code === 'ArrowRight') && canSwitchCam()) { e.preventDefault(); cycleFocus(1); return; }
  if (S && (e.code === 'KeyA' || e.code === 'ArrowLeft') && canSwitchCam()) { e.preventDefault(); cycleFocus(-1); return; }
  if (e.code === 'Space') {
    e.preventDefault();
    TTS.arm();
    if (S && (S.phase === 'lobby' || S.phase === 'result')) startGame();
  }
  if (e.key === 'm' || e.key === 'M') $('#muteBtn').click();
  if (e.code === 'Escape' && S && S.phase === 'result') { post('/api/reset'); $('#result').classList.add('hidden'); resultShown = false; }
  if (e.code === 'KeyB' && S && S.phase === 'playing') post('/api/boss');
});

addEventListener('keyup', e => {
  if (e.code === 'KeyC' && locals.length) { post('/api/act', { pid: locals[0].pid, act: 'crouchEnd' }); return; }
  const l = locals.find(x => x.key === e.code);
  if (l) post('/api/release', { pid: l.pid });
});
addEventListener('pointerdown', () => TTS.arm(), { once: true });

/* ------------------------------------------------------------------ 二维码 */
let qrTab = 'pad';
let joinSig = '';
const qrCanvas = $('#qr');

function joinURL(kind) {
  // 大屏在本机/内网打开时，二维码优先指向局域网地址：即使服务端带了 PUBLIC_URL（线上演示用的公网域名），
  // 现场手机也应该走局域网，否则每一帧都要绕公网 + 隧道，必然卡。
  // 只有大屏本身是从公网域名打开时，才用公网地址（远端观众扫码用）。
  const h = location.hostname;
  const localScreen = /^(localhost|127\.0\.0\.1|\[?::1\]?|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  const lanBase = (S && S.lan) ? `http://${S.lan}:${S.port || 3000}` : '';
  const base = (localScreen && lanBase)
    ? lanBase
    : ((S && S.baseUrl) || lanBase || `http://${h}:${(S && S.port) || location.port || 3000}`);
  return `${base}${kind === 'wish' ? '/wish' : '/pad'}`;
}

function renderQR(text) {
  if (!qrCanvas) return;
  const g = qrCanvas.getContext('2d');
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const cell = Math.max(3, Math.floor(320 / (count + 8)));
    const n = cell * (count + 8);      // 四周各留 4 个模块的静区
    qrCanvas.width = n; qrCanvas.height = n;
    g.fillStyle = '#fffdf5'; g.fillRect(0, 0, n, n);
    g.fillStyle = '#0b0b0b';
    const off = cell * 4;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) g.fillRect(off + c * cell, off + r * cell, cell, cell);
      }
    }
  } catch {
    qrCanvas.width = 240; qrCanvas.height = 240;
    g.fillStyle = '#fffdf5'; g.fillRect(0, 0, 240, 240);
    g.fillStyle = '#0b0b0b';
    g.font = '700 14px sans-serif';
    g.textAlign = 'center';
    g.fillText('二维码生成失败', 120, 120);
  }
}

function paintJoin() {
  const url = joinURL(qrTab);
  if (url !== joinSig) {
    joinSig = url;
    renderQR(url);
    $('#joinUrl').textContent = url.replace(/^https?:\/\//, '');
    $('#joinHint').textContent = qrTab === 'wish'
      ? '扫码 → 写一句人话 → 立刻生效'
      : '扫码 → 输入名字 → 开跑';
  }
  $('#tabPad').classList.toggle('on', qrTab === 'pad');
  $('#tabWish').classList.toggle('on', qrTab === 'wish');
}

$('#tabPad').onclick = () => { qrTab = 'pad'; paintJoin(); };
$('#tabWish').onclick = () => { qrTab = 'wish'; paintJoin(); };
paintJoin();

/* ------------------------------------------------------------------ 许愿池 */
const wishBox = $('#wishBox');
const wishInput = $('#wishInput');
const wishMsg = $('#wishMsg');
let wishBannerTimer = 0;

function openWish() {
  if (!S || (S.phase !== 'playing' && S.phase !== 'boss')) { showToast('比赛开始后才能许愿'); return; }
  TTS.arm();
  wishBox.classList.remove('hidden');
  wishMsg.textContent = '';
  wishInput.value = '';
  setTimeout(() => wishInput.focus(), 30);
}
function closeWish() {
  wishBox.classList.add('hidden');
  wishInput.blur();
}
async function submitWish() {
  const text = wishInput.value.trim();
  if (!text) { wishMsg.textContent = '先写一句愿望'; return; }
  const r = await post('/api/wish', { text, name: '导演' });
  if (r.ok) {
    wishMsg.textContent = '✓ ' + r.reply;
    wishInput.value = '';
    setTimeout(closeWish, 450);
  } else {
    wishMsg.textContent = '✗ ' + (r.error || '许愿失败');
  }
}
wishInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') { e.preventDefault(); submitWish(); }
  if (e.code === 'Escape') { e.preventDefault(); closeWish(); }
});

function showWishBanner(e) {
  const el = $('#wishBanner');
  el.innerHTML = `<div class="wb1">✨ 许愿池 · ${esc(e.by || '匿名')}</div>
    <div class="wb2">「${esc(e.text)}」<br><em>${esc(e.reply)}</em></div>`;
  el.classList.remove('hidden');
  clearTimeout(wishBannerTimer);
  wishBannerTimer = setTimeout(() => el.classList.add('hidden'), 5200);
  shake(180, 5);
}

let waterBannerTimer = 0;
function showWaterBanner() {
  const el = $('#waterBanner');
  if (!el) return;
  el.classList.remove('hidden');
  clearTimeout(waterBannerTimer);
  waterBannerTimer = setTimeout(() => el.classList.add('hidden'), 4200);
  shake(220, 7);
}

/* ------------------------------------------------------------------ 启动 */
resize();
TTS.init();
connect();
restoreLocals();
let __last = 0;
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0.001, (now - (__last || now)) / 1000));
  __last = now;
  if (S) {
    updateParts(dt);
    draw(now);
    drawPip(now);
  }
})();

// 大厅里的 URL / 二维码由 paintJoin() 统一维护
