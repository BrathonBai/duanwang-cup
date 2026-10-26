'use strict';
/* 观众席：每位选手一个机位，拼成多画面 */

const $ = s => document.querySelector(s);
const grid = $('#grid');
let S = null;
let rosterSig = '';
let cells = new Map();   // id -> { el, cv, ctx, w, h, dpr }

/* ---------- 素材 ---------- */
const dinoImg = new Image();
dinoImg.src = '/dino.png';
const DW = 44, DH = 47;
const tint = new Map();

function sheet(color) {
  if (!dinoImg.complete || !dinoImg.naturalWidth) return null;
  let c = tint.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = DW * 3 * 2; c.height = DH * 2;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(dinoImg, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  tint.set(color, c);
  return c;
}

function dino(g, x, bottom, h, color, frame = 0, dead = false, skin = 'pixel') {
  if (!dead && (skin === 'deepseek' || skin === 'maid') && window.Cup && Cup.character) {
    Cup.character(g, x, bottom, h, skin, frame);
    return;
  }
  const w = h * (DW / DH);
  g.save();
  if (dead) {
    g.globalAlpha = .4; g.translate(x, bottom); g.rotate(-Math.PI / 2); g.translate(-x, -bottom + h);
  }
  const s = sheet(color);
  if (s) {
    g.imageSmoothingEnabled = false;
    g.drawImage(s, (frame % 3) * DW * 2, 0, DW * 2, DH * 2, x - w / 2, bottom - h, w, h);
  } else { g.fillStyle = color; g.fillRect(x - w / 2, bottom - h, w, h); }
  g.restore();
}

function rr(g, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath(); g.fill();
}

function cactus(g, x, base, w, h, color) {
  const tw = Math.max(6, w * 0.40), aw = Math.max(4, tw * 0.58);
  const reach = tw * 1.25, upL = h * 0.40, upR = h * 0.30;
  const yL = base - h * 0.60, yR = base - h * 0.46;
  g.fillStyle = color;
  rr(g, x - tw / 2, base - h, tw, h, tw * 0.45);
  rr(g, x - tw / 2 - reach, yL, reach + aw, aw, aw * 0.45);
  rr(g, x - tw / 2 - reach, yL - upL, aw, upL + aw, aw * 0.45);
  rr(g, x + tw / 2 - aw * 0.8, yR, reach + aw, aw, aw * 0.45);
  rr(g, x + tw / 2 + reach - aw * 0.9, yR - upR, aw, upR + aw, aw * 0.45);
}

function heart(g, x, y, s) {
  g.fillStyle = '#ff5aa0';
  g.beginPath(); g.arc(x - s * .22, y - s * .12, s * .26, 0, 7); g.fill();
  g.beginPath(); g.arc(x + s * .22, y - s * .12, s * .26, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x - s * .46, y - s * .02); g.lineTo(x + s * .46, y - s * .02); g.lineTo(x, y + s * .58); g.closePath(); g.fill();
}
function coin(g, x, y, s) {
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  g.fillStyle = '#b98900'; g.beginPath(); g.arc(x, y, s * .6, 0, 7); g.fill();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, s * .38, 0, 7); g.fill();
}
function doubleIcon(g, x, y, s) {
  g.fillStyle = '#ffd23f';
  for (let k = 0; k < 2; k++) {
    const yy = y + s * 0.42 - k * s * 0.55;
    g.beginPath();
    g.moveTo(x - s * 0.58, yy + s * 0.26); g.lineTo(x, yy - s * 0.28); g.lineTo(x + s * 0.58, yy + s * 0.26);
    g.lineTo(x + s * 0.36, yy + s * 0.48); g.lineTo(x, yy + s * 0.08); g.lineTo(x - s * 0.36, yy + s * 0.48);
    g.closePath(); g.fill();
  }
}

function battery(g, x, y, s) {
  g.fillStyle = '#a8e63a'; rr(g, x - s, y - s * .55, s * 2, s * 1.1, s * .25);
  g.fillStyle = '#0a0a0a';
  g.beginPath();
  g.moveTo(x + s * .15, y - s * .45); g.lineTo(x - s * .35, y + s * .05); g.lineTo(x + s * .02, y + s * .05);
  g.lineTo(x - s * .12, y + s * .48); g.lineTo(x + s * .4, y - s * .1); g.lineTo(x + s * .02, y - s * .1);
  g.closePath(); g.fill();
}

/* ---------- 布局 ---------- */
function gridDims(n) {
  if (n <= 1) return [1, 1];
  if (n === 2) return [2, 1];
  if (n <= 4) return [2, 2];
  if (n <= 6) return [3, 2];
  return [4, 2];
}

function rebuild(roster) {
  const sig = roster.map(p => p.id + p.color).join(',');
  if (sig === rosterSig) return;
  rosterSig = sig;
  grid.innerHTML = '';
  cells = new Map();

  if (!roster.length) {
    grid.style.setProperty('--cols', 1);
    grid.style.setProperty('--rows', 1);
    grid.innerHTML = '<div class="empty"><div><b>等待选手入场</b><span>手机扫码，或在大屏点「键盘入场」</span></div></div>';
    return;
  }

  const [cols, rows] = gridDims(roster.length);
  grid.style.setProperty('--cols', cols);
  grid.style.setProperty('--rows', rows);

  for (const p of roster) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.style.setProperty('--c', p.color);
    el.innerHTML = `<canvas></canvas>
      <div class="tag"><b>${p.name}</b><u id="hp"></u><em id="coin"></em></div>
      <div class="out" style="display:none"></div>`;
    grid.appendChild(el);
    const cv = el.querySelector('canvas');
    cells.set(p.id, { el, cv, ctx: cv.getContext('2d'), w: 0, h: 0 });
  }
}

/* ---------- 每格渲染 ---------- */
function drawCell(cell, p, now) {
  const g = cell.ctx;
  const W = cell.w, H = cell.h;
  if (!W || !H) return;
  g.clearRect(0, 0, W, H);

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#111');
  bg.addColorStop(1, '#070707');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  const viewM = 9;
  const pxm = W / viewM;
  const camX = p.x - viewM * 0.38;
  const ground = H * 0.70;
  const wx = x => (x - camX) * pxm;

  // 地面
  g.fillStyle = '#050505';
  g.fillRect(0, ground, W, H - ground);
  g.strokeStyle = 'rgba(255,210,63,.45)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, ground); g.lineTo(W, ground); g.stroke();

  // 障碍
  for (const o of S.obs || []) {
    const sx = wx(o[0]);
    if (sx < -40 || sx > W + 40) continue;
    const base = ground - (o[5] || 0) * pxm;
    cactus(g, sx, base, o[1] * pxm, o[2] * pxm, o[3] === 4 ? '#ff3fa4' : '#6fbf3f');
  }

  // 道具
  for (const it of S.items || []) {
    const sx = wx(it[0]);
    if (sx < -20 || sx > W + 20) continue;
    const sy = ground - it[1] * pxm + Math.sin(now / 300 + it[0]) * 3;
    const s = Math.max(5, pxm * 0.16);
    if (it[2] === 'coin') coin(g, sx, sy, s);
    else if (it[2] === 'heart') heart(g, sx, sy, s * 1.15);
    else if (it[2] === 'double') doubleIcon(g, sx, sy, s);
    else battery(g, sx, sy, s);
  }

  // Boss
  if (S.boss) {
    const bx = wx(S.raceLen + 2);
    if (bx > -120 && bx < W + 200) {
      const by = ground - S.boss.y * pxm;
      const bh = 4.6 * pxm, bw = 1.9 * pxm;
      cactus(g, bx, by + bh * 0.5, bw, bh, S.boss.flash ? '#fff' : '#86e04a');
      g.fillStyle = '#0a0a0a';
      g.beginPath(); g.arc(bx - bw * .2, by - bh * .22, bw * .09, 0, 7); g.fill();
      g.beginPath(); g.arc(bx + bw * .2, by - bh * .22, bw * .09, 0, 7); g.fill();
    }
  }

  // 同屏其他选手（压暗，突出本格主角）
  g.save();
  g.globalAlpha = 0.42;
  for (const q of S.players) {
    if (!q.inRound || q.dead || q.id === p.id) continue;
    const sx = wx(q.x);
    if (sx < -40 || sx > W + 40) continue;
    const dh = pxm * 1.0;
    dino(g, sx, ground - q.y * pxm, dh, q.color, 0, false, q.skin);
  }
  g.restore();

  // 本人
  if (!p.dead) {
    const dh = pxm * 1.05;
    const frame = p.y > 0.02 ? 1 : (Math.floor(now / 105) % 2 ? 2 : 0);
    g.save();
    // 脚环：告诉你这格是谁
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(wx(p.x), ground + 2, dh * 0.44, 5, 0, 0, 7); g.stroke();
    if (p.invuln) g.globalAlpha = 0.5 + 0.4 * Math.abs(Math.sin(now / 70));
    dino(g, wx(p.x), ground - p.y * pxm, dh, p.color, frame, false, p.skin);
    g.restore();
    // 镜头框
    g.strokeStyle = 'rgba(255,255,255,.06)';
    g.lineWidth = 1;
    g.strokeRect(6, 6, W - 12, H - 12);
  }

  // 投掷物 / 刺
  for (const t of S.throws || []) {
    const sx = wx(t[0]), sy = ground - t[1] * pxm;
    if (sx < -20 || sx > W + 20) continue;
    g.font = `${Math.max(12, pxm * 0.4)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t[2], sx, sy);
  }
  for (const n of S.needles || []) {
    const sx = wx(n[0]), sy = ground - n[1] * pxm;
    if (sx < -20 || sx > W + 20) continue;
    g.fillStyle = '#9ade4a';
    g.beginPath(); g.moveTo(sx + 10, sy); g.lineTo(sx - 8, sy - 5); g.lineTo(sx - 8, sy + 5); g.closePath(); g.fill();
  }
}

/* ---------- 主循环 ---------- */
function resizeCell(cell) {
  const r = cell.cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (cell.w === w && cell.h === h) return;
  cell.w = w; cell.h = h;
  cell.cv.width = Math.round(w * dpr);
  cell.cv.height = Math.round(h * dpr);
  cell.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!S) return;
  const roster = S.players.filter(p => p.inRound);
  rebuild(roster);

  $('#phase').textContent = { lobby: '等待选手', countdown: '即将开始', playing: '比赛中', boss: 'BOSS 战', result: '已结束' }[S.phase] || S.phase;
  const t = Math.floor(S.t || 0);
  $('#clock').textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

  for (const p of roster) {
    const cell = cells.get(p.id);
    if (!cell) continue;
    resizeCell(cell);
    drawCell(cell, p, now);
    cell.el.classList.toggle('dead', !!p.dead);
    cell.el.classList.toggle('finished', !!p.finished);
    const hpEl = cell.el.querySelector('#hp');
    const coinEl = cell.el.querySelector('#coin');
    if (hpEl) hpEl.textContent = '♥'.repeat(Math.max(0, p.hp)) + '♡'.repeat(Math.max(0, 5 - p.hp));
    if (coinEl) coinEl.textContent = '✦' + p.coins;
    const out = cell.el.querySelector('.out');
    if (out) {
      if (p.dead) { out.style.display = 'grid'; out.innerHTML = `OUT<small>还能整人</small>`; }
      else if (p.finished) { out.style.display = 'grid'; out.innerHTML = `FINISH<small>已冲线</small>`; }
      else out.style.display = 'none';
    }
  }
}

function connectLive() {
  if (location.protocol === 'https:') {
    const ws = new WebSocket(`wss://${location.host}/ws`);
    ws.onmessage = e => { try { S = JSON.parse(e.data).state; } catch { } };
    ws.onclose = () => setTimeout(connectLive, 1000);
  } else {
    const es = new EventSource('/api/live');
    es.onmessage = e => { try { S = JSON.parse(e.data).state; } catch { } };
  }
}
connectLive();

requestAnimationFrame(frame);
