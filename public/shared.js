'use strict';
/* 共享绘制原语：两端（大屏 / 手机）共用，避免重复实现 */
(function () {
  function rr(cx, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    const rad = Math.min(r, w / 2, h / 2);
    cx.beginPath();
    cx.moveTo(x + rad, y);
    cx.arcTo(x + w, y, x + w, y + h, rad);
    cx.arcTo(x + w, y + h, x, y + h, rad);
    cx.arcTo(x, y + h, x, y, rad);
    cx.arcTo(x, y, x + w, y, rad);
    cx.closePath();
    cx.fill();
  }

  function cactus(cx, x, base, w, h, color, glow) {
    const tw = Math.max(7, w * 0.40);
    const aw = Math.max(5, tw * 0.58);
    const reach = tw * 1.25, upL = h * 0.40, upR = h * 0.30;
    const yL = base - h * 0.60, yR = base - h * 0.46;
    cx.save();
    if (glow) { cx.shadowColor = color; cx.shadowBlur = 18; }
    cx.fillStyle = color;
    rr(cx, x - tw / 2, base - h, tw, h, tw * 0.45);
    rr(cx, x - tw / 2 - reach, yL, reach + aw, aw, aw * 0.45);
    rr(cx, x - tw / 2 - reach, yL - upL, aw, upL + aw, aw * 0.45);
    rr(cx, x + tw / 2 - aw + aw * 0.2, yR, reach + aw, aw, aw * 0.45);
    rr(cx, x + tw / 2 + reach - aw * 0.1, yR - upR, aw, upR + aw, aw * 0.45);
    cx.restore();
  }

  function heart(cx, x, y, s, color) {
    cx.fillStyle = color;
    cx.beginPath(); cx.arc(x - s * 0.22, y - s * 0.12, s * 0.26, 0, 7); cx.fill();
    cx.beginPath(); cx.arc(x + s * 0.22, y - s * 0.12, s * 0.26, 0, 7); cx.fill();
    cx.beginPath(); cx.moveTo(x - s * 0.46, y - s * 0.02); cx.lineTo(x + s * 0.46, y - s * 0.02); cx.lineTo(x, y + s * 0.58); cx.closePath(); cx.fill();
  }

  function coin(cx, x, y, s) {
    cx.fillStyle = '#ffd23f'; cx.beginPath(); cx.arc(x, y, s, 0, 7); cx.fill();
    cx.fillStyle = '#b98900'; cx.beginPath(); cx.arc(x, y, s * 0.62, 0, 7); cx.fill();
    cx.fillStyle = '#ffd23f'; cx.beginPath(); cx.arc(x, y, s * 0.42, 0, 7); cx.fill();
  }

  function double(cx, x, y, s) {
    cx.save();
    cx.fillStyle = '#ffd23f';
    cx.shadowColor = 'rgba(255,210,63,.7)'; cx.shadowBlur = 12;
    for (let k = 0; k < 2; k++) {
      const yy = y + s * 0.42 - k * s * 0.55;
      cx.beginPath();
      cx.moveTo(x - s * 0.58, yy + s * 0.26); cx.lineTo(x, yy - s * 0.28);
      cx.lineTo(x + s * 0.58, yy + s * 0.26); cx.lineTo(x + s * 0.36, yy + s * 0.48);
      cx.lineTo(x, yy + s * 0.08); cx.lineTo(x - s * 0.36, yy + s * 0.48);
      cx.closePath(); cx.fill();
    }
    cx.restore();
  }

  function battery(cx, x, y, s) {
    cx.save();
    cx.fillStyle = '#a8e63a';
    rr(cx, x - s, y - s * 0.55, s * 2, s * 1.1, s * 0.25);
    cx.fillStyle = '#0a0a0a';
    cx.beginPath();
    cx.moveTo(x + s * 0.15, y - s * 0.45); cx.lineTo(x - s * 0.35, y + s * 0.05);
    cx.lineTo(x + s * 0.02, y + s * 0.05); cx.lineTo(x - s * 0.12, y + s * 0.48);
    cx.lineTo(x + s * 0.4, y - s * 0.1); cx.lineTo(x + s * 0.02, y - s * 0.1);
    cx.closePath(); cx.fill();
    cx.restore();
  }

  function bandages(cx, x, bottom, h, n) {
    const spots = [[-0.18, 0.42, 0.5], [0.16, 0.55, -0.35], [-0.05, 0.66, 0.25], [0.2, 0.4, 0.1]];
    cx.save();
    for (let i = 0; i < Math.min(n, 4); i++) {
      const [dx, dy, rot] = spots[i];
      cx.save();
      cx.translate(x + dx * h, bottom - dy * h);
      cx.rotate(rot);
      cx.fillStyle = '#f7e7c8';
      cx.fillRect(-h * 0.11, -h * 0.045, h * 0.22, h * 0.09);
      cx.fillStyle = '#e05a5a';
      cx.fillRect(-h * 0.018, -h * 0.045, h * 0.036, h * 0.09);
      cx.fillRect(-h * 0.11, -h * 0.016, h * 0.22, h * 0.032);
      cx.restore();
    }
    cx.restore();
  }

  function key(cx, x, y, s, now, color = '#ffd23f') {
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    cx.save();
    cx.shadowColor = color;
    cx.shadowBlur = 12 + pulse * 14;
    cx.fillStyle = color;
    cx.beginPath(); cx.arc(x - s * 0.30, y, s * 0.36, 0, 7); cx.fill();
    cx.fillStyle = '#0a0a0a';
    cx.beginPath(); cx.arc(x - s * 0.30, y, s * 0.15, 0, 7); cx.fill();
    cx.fillStyle = color;
    cx.fillRect(x + s * 0.02, y - s * 0.10, s * 1.05, s * 0.20);
    cx.fillRect(x + s * 0.72, y + s * 0.08, s * 0.11, s * 0.26);
    cx.fillRect(x + s * 0.92, y + s * 0.08, s * 0.11, s * 0.20);
    cx.restore();
  }

  function tumbleweed(cx, x, base, r, spin) {
    cx.save();
    cx.translate(x, base - r);
    cx.rotate(spin);
    cx.strokeStyle = '#c9a227';
    cx.lineWidth = Math.max(2, r * 0.17);
    cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.stroke();
    for (let i = 0; i < 3; i++) {
      cx.beginPath();
      cx.ellipse(0, 0, r * 0.92, r * 0.42, i * Math.PI / 3, 0, 7);
      cx.stroke();
    }
    cx.restore();
  }

function carVector(cx, x, ground, pxm, now) {
  const L = 5.2 * pxm, H = 2.0 * pxm;
  const X = u => x - L / 2 + u * L;
  const Y = v => ground - v * H;
  const rrp = (px, py, pw, ph, r) => {
    const rr2 = Math.min(r, pw / 2, ph / 2);
    cx.beginPath();
    cx.moveTo(px + rr2, py);
    cx.arcTo(px + pw, py, px + pw, py + ph, rr2);
    cx.arcTo(px + pw, py + ph, px, py + ph, rr2);
    cx.arcTo(px, py + ph, px, py, rr2);
    cx.arcTo(px, py, px + pw, py, rr2);
    cx.closePath();
  };
  cx.save();

  // 影子
  cx.fillStyle = 'rgba(0,0,0,.45)';
  cx.beginPath(); cx.ellipse(x, ground + 3, L * 0.46, H * 0.055, 0, 0, 7); cx.fill();

  // 车身下段（深棕）
  const bg = cx.createLinearGradient(0, Y(0.62), 0, Y(0.10));
  bg.addColorStop(0, '#8a5f3e');
  bg.addColorStop(0.45, '#6b472e');
  bg.addColorStop(1, '#37241a');
  cx.fillStyle = bg;
  cx.beginPath();
  cx.moveTo(X(0.008), Y(0.13));
  cx.lineTo(X(0.008), Y(0.50));
  cx.quadraticCurveTo(X(0.010), Y(0.585), X(0.055), Y(0.60));
  cx.quadraticCurveTo(X(0.06), Y(0.90), X(0.11), Y(0.925));
  cx.lineTo(X(0.60), Y(0.945));
  cx.quadraticCurveTo(X(0.73), Y(0.935), X(0.80), Y(0.70));
  cx.quadraticCurveTo(X(0.91), Y(0.665), X(0.975), Y(0.645));
  cx.quadraticCurveTo(X(1.0), Y(0.63), X(1.0), Y(0.50));
  cx.lineTo(X(1.0), Y(0.13));
  cx.closePath();
  cx.fill();

  // 车身上段（米色）
  const tg = cx.createLinearGradient(0, Y(0.95), 0, Y(0.55));
  tg.addColorStop(0, '#f0e5c9');
  tg.addColorStop(1, '#d2c2a1');
  cx.fillStyle = tg;
  cx.beginPath();
  cx.moveTo(X(0.012), Y(0.60));
  cx.lineTo(X(0.055), Y(0.60));
  cx.quadraticCurveTo(X(0.06), Y(0.90), X(0.11), Y(0.925));
  cx.lineTo(X(0.60), Y(0.945));
  cx.quadraticCurveTo(X(0.73), Y(0.935), X(0.80), Y(0.70));
  cx.quadraticCurveTo(X(0.91), Y(0.665), X(0.975), Y(0.645));
  cx.quadraticCurveTo(X(1.0), Y(0.63), X(1.0), Y(0.585));
  cx.closePath();
  cx.fill();

  // 玻璃
  const glassRect = (u0, u1, v0, v1, r) => {
    cx.fillStyle = '#10171c';
    rrp(X(u0), Y(v1), X(u1) - X(u0), Y(v0) - Y(v1), r);
    cx.fill();
    cx.strokeStyle = 'rgba(222,227,230,.75)';
    cx.lineWidth = Math.max(1, L * 0.0035);
    cx.stroke();
  };
  glassRect(0.082, 0.168, 0.63, 0.862, L * 0.008);
  glassRect(0.188, 0.418, 0.63, 0.878, L * 0.008);
  glassRect(0.440, 0.640, 0.63, 0.878, L * 0.008);
  // 前风挡
  cx.fillStyle = '#10171c';
  cx.beginPath();
  cx.moveTo(X(0.660), Y(0.878));
  cx.lineTo(X(0.775), Y(0.735));
  cx.lineTo(X(0.775), Y(0.630));
  cx.lineTo(X(0.660), Y(0.630));
  cx.closePath(); cx.fill();
  cx.strokeStyle = 'rgba(222,227,230,.75)';
  cx.lineWidth = Math.max(1, L * 0.0035);
  cx.stroke();

  // 腰线镀铬
  cx.strokeStyle = 'rgba(228,232,235,.75)';
  cx.lineWidth = Math.max(1.2, L * 0.004);
  cx.beginPath(); cx.moveTo(X(0.02), Y(0.575)); cx.lineTo(X(0.86), Y(0.585)); cx.stroke();

  // 下部镀铬饰条
  cx.strokeStyle = 'rgba(210,215,218,.55)';
  cx.lineWidth = Math.max(1.2, L * 0.004);
  cx.beginPath(); cx.moveTo(X(0.07), Y(0.185)); cx.lineTo(X(0.93), Y(0.185)); cx.stroke();

  // 车身高光
  cx.fillStyle = 'rgba(255,236,205,.10)';
  cx.beginPath();
  cx.moveTo(X(0.03), Y(0.34));
  cx.quadraticCurveTo(X(0.35), Y(0.40), X(0.80), Y(0.36));
  cx.lineTo(X(0.80), Y(0.30));
  cx.quadraticCurveTo(X(0.35), Y(0.33), X(0.03), Y(0.29));
  cx.closePath(); cx.fill();

  // 门缝
  cx.strokeStyle = 'rgba(0,0,0,.30)';
  cx.lineWidth = Math.max(1, L * 0.003);
  for (const u of [0.180, 0.435, 0.645]) {
    cx.beginPath(); cx.moveTo(X(u), Y(0.60)); cx.lineTo(X(u), Y(0.155)); cx.stroke();
  }

  // 门把手
  for (const u of [0.285, 0.520]) {
    cx.fillStyle = '#cfd4d7';
    rrp(X(u), Y(0.545), L * 0.055, H * 0.018, 3); cx.fill();
    cx.fillStyle = 'rgba(0,0,0,.25)';
    rrp(X(u) + L * 0.008, Y(0.538), L * 0.040, H * 0.006, 2); cx.fill();
  }

  // 后视镜
  cx.fillStyle = '#d6c7a6';
  rrp(X(0.655), Y(0.725), L * 0.045, H * 0.045, 4); cx.fill();
  cx.fillStyle = 'rgba(0,0,0,.35)';
  cx.fillRect(X(0.672), Y(0.685), L * 0.006, H * 0.03);

  // 天窗
  cx.fillStyle = 'rgba(16,23,28,.9)';
  rrp(X(0.20), Y(0.925), L * 0.20, H * 0.022, 3); cx.fill();

  // 前脸：格栅
  cx.fillStyle = '#c6cbcf';
  rrp(X(0.898), Y(0.575), X(0.997) - X(0.898), Y(0.255) - Y(0.575), 5); cx.fill();
  cx.fillStyle = '#17181c';
  for (let i = 0; i < 10; i++) {
    const u = 0.904 + i * 0.0094;
    cx.fillRect(X(u), Y(0.560), Math.max(1.4, L * 0.0046), Y(0.270) - Y(0.560));
  }
  cx.strokeStyle = 'rgba(240,244,246,.55)';
  cx.lineWidth = Math.max(1, L * 0.003);
  rrp(X(0.898), Y(0.575), X(0.997) - X(0.898), Y(0.255) - Y(0.575), 5); cx.stroke();
  // 前灯带
  cx.fillStyle = '#ffe9b5';
  rrp(X(0.838), Y(0.625), X(0.996) - X(0.838), Y(0.588) - Y(0.625), 3); cx.fill();
  cx.fillStyle = 'rgba(255,250,225,.95)';
  cx.fillRect(X(0.838), Y(0.616), X(0.996) - X(0.838), Math.max(1, H * 0.008));
  // 日行灯竖条
  cx.fillStyle = '#ffdf8a';
  rrp(X(0.958), Y(0.565), L * 0.010, H * 0.16, 2); cx.fill();

  // 下进气
  cx.fillStyle = '#0c0c0e';
  rrp(X(0.885), Y(0.255), X(0.995) - X(0.885), Y(0.155) - Y(0.255), 3); cx.fill();
  cx.strokeStyle = 'rgba(200,205,208,.5)';
  cx.lineWidth = Math.max(1, L * 0.003);
  cx.stroke();

  // 车标
  cx.fillStyle = '#d8dde0';
  rrp(X(0.952), Y(0.475), L * 0.008, H * 0.055, 2); cx.fill();

  // 轮拱 + 轮
  const r = H * 0.175;
  const wheel = u => {
    const cxp = X(u), cyp = ground - r;
    cx.fillStyle = '#070707';
    cx.beginPath(); cx.arc(cxp, cyp, r * 1.18, 0, 7); cx.fill();
    cx.fillStyle = '#111214';
    cx.beginPath(); cx.arc(cxp, cyp, r, 0, 7); cx.fill();
    cx.strokeStyle = '#2b2d30';
    cx.lineWidth = Math.max(1, r * 0.06);
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.93, 0, 7); cx.stroke();
    cx.fillStyle = '#8f969b';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.72, 0, 7); cx.fill();
    cx.fillStyle = '#c9ced2';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.66, 0, 7); cx.fill();
    cx.strokeStyle = '#7d8489';
    cx.lineWidth = Math.max(1, r * 0.035);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      cx.beginPath();
      cx.moveTo(cxp + Math.cos(a) * r * 0.24, cyp + Math.sin(a) * r * 0.24);
      cx.lineTo(cxp + Math.cos(a) * r * 0.62, cyp + Math.sin(a) * r * 0.62);
      cx.stroke();
    }
    cx.fillStyle = '#e6eaec';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.20, 0, 7); cx.fill();
    cx.fillStyle = '#9aa0a4';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.11, 0, 7); cx.fill();
  };
  wheel(0.205);
  wheel(0.795);

  // 尾灯
  cx.fillStyle = '#d33a3a';
  rrp(X(0.020), Y(0.50), L * 0.012, H * 0.06, 2); cx.fill();

  cx.restore();
}

let spriteCache = null;
function getCarSprite() {
  if (spriteCache) return spriteCache;
  const W = 112, H = 46;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const g = off.getContext('2d');
  carVector(g, W / 2, H - 2, W / 5.4);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const PAL = [
    [240,229,201],[210,194,161],[138,95,62],[107,71,46],[55,36,26],
    [16,23,28],[230,234,236],[201,206,210],[143,150,155],[125,132,137],
    [17,18,20],[43,45,48],[255,233,181],[255,223,138],[211,58,58],[255,255,255],
  ];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    let bi = 0, bd = 1e9;
    for (let k = 0; k < PAL.length; k++) {
      const p = PAL[k];
      const dr = d[i] - p[0], dg = d[i + 1] - p[1], db = d[i + 2] - p[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bd) { bd = dist; bi = k; }
    }
    d[i] = PAL[bi][0]; d[i + 1] = PAL[bi][1]; d[i + 2] = PAL[bi][2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  spriteCache = off;
  return off;
}

function car(cx, x, ground, pxm, now, riders) {
  const sp = getCarSprite();
  const scale = Math.max(1, Math.round(5.2 * pxm / 112));
  const w = 112 * scale, h = 46 * scale;
  cx.save();
  cx.fillStyle = 'rgba(0,0,0,.45)';
  cx.beginPath(); cx.ellipse(x, ground + 3, w * 0.44, h * 0.10, 0, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,.16)';
  cx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ly = ground - h * (0.18 + i * 0.13);
    cx.beginPath();
    cx.moveTo(x - w * 0.52 - i * 14, ly);
    cx.lineTo(x - w * 0.92 - i * 24, ly);
    cx.stroke();
  }
  cx.imageSmoothingEnabled = false;
  const dx0 = Math.round(x - w / 2), dy0 = Math.round(ground - h + 2);
  cx.drawImage(sp, dx0, dy0, w, h);
  cx.imageSmoothingEnabled = true;
  if (riders && riders.length) {
    const us = [0.16, 0.30, 0.46, 0.60];
    const sz = Math.max(5, Math.round(w * 0.045));
    riders.slice(0, 4).forEach((pl, i) => {
      cx.fillStyle = pl.color;
      cx.fillRect(Math.round(dx0 + w * us[i]), Math.round(dy0 + h * 0.20), sz, sz);
    });
  }
  cx.restore();
}


/* ------------------------------------------------------------------ Tesla Roadster */
// 白色楔形车身 + 黑色座舱 + 大尾翼 + 四个喷口。侧视，车头朝右。
function roadsterVector(cx, x, ground, pxm, now, opts = {}) {
  const L = 5.0 * pxm, H = 1.55 * pxm;
  const X = u => x - L / 2 + u * L;
  const Y = v => ground - v * H;
  const rrp = (px, py, pw, ph, r) => {
    const q = Math.min(r, pw / 2, ph / 2);
    cx.beginPath();
    cx.moveTo(px + q, py);
    cx.arcTo(px + pw, py, px + pw, py + ph, q);
    cx.arcTo(px + pw, py + ph, px, py + ph, q);
    cx.arcTo(px, py + ph, px, py, q);
    cx.arcTo(px, py, px + pw, py, q);
    cx.closePath();
  };
  const thrust = opts.thrust || 0;
  cx.save();
  if (opts.tilt) { cx.translate(x, ground); cx.rotate(opts.tilt); cx.translate(-x, -ground); }

  if (!opts.fly) {
    cx.fillStyle = 'rgba(0,0,0,.45)';
    cx.beginPath(); cx.ellipse(x, ground + 3, L * 0.44, H * 0.05, 0, 0, 7); cx.fill();
  }

  // 喷口火焰
  if (thrust > 0) {
    cx.save();
    cx.shadowColor = 'rgba(90,220,255,.9)';
    cx.shadowBlur = Math.max(6, pxm * 0.5);
    const nz = [0.045, 0.080, 0.115, 0.150];
    for (let i = 0; i < nz.length; i++) {
      const nx = X(nz[i]), ny = Y(0.205);
      const fl = (0.55 + 0.35 * Math.sin(now / 55 + i * 1.7)) * H * 1.9 * thrust;
      const fg = cx.createLinearGradient(nx, ny, nx - fl, ny);
      fg.addColorStop(0, 'rgba(255,255,255,.95)');
      fg.addColorStop(0.22, 'rgba(150,245,255,.95)');
      fg.addColorStop(0.55, 'rgba(70,160,255,.65)');
      fg.addColorStop(1, 'rgba(30,70,255,0)');
      cx.fillStyle = fg;
      cx.beginPath();
      cx.moveTo(nx, ny - H * 0.085);
      cx.lineTo(nx - fl, ny);
      cx.lineTo(nx, ny + H * 0.085);
      cx.closePath(); cx.fill();
    }
    cx.restore();
  }

  // 后轮 / 前轮
  const wheel = (u, r) => {
    const cxp = X(u), cyp = Y(0.17);
    cx.fillStyle = '#050506';
    cx.beginPath(); cx.arc(cxp, cyp, r * 1.12, 0, 7); cx.fill();
    cx.fillStyle = '#15181a';
    cx.beginPath(); cx.arc(cxp, cyp, r, 0, 7); cx.fill();
    cx.strokeStyle = '#2c3134';
    cx.lineWidth = Math.max(1, r * 0.08);
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.92, 0, 7); cx.stroke();
    cx.fillStyle = '#b9c1c5';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.62, 0, 7); cx.fill();
    cx.strokeStyle = '#6f777c';
    cx.lineWidth = Math.max(1, r * 0.07);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3;
      cx.beginPath();
      cx.moveTo(cxp + Math.cos(a) * r * 0.18, cyp + Math.sin(a) * r * 0.18);
      cx.lineTo(cxp + Math.cos(a) * r * 0.60, cyp + Math.sin(a) * r * 0.60);
      cx.stroke();
    }
    cx.fillStyle = '#e9edef';
    cx.beginPath(); cx.arc(cxp, cyp, r * 0.15, 0, 7); cx.fill();
  };
  wheel(0.245, H * 0.215);
  wheel(0.795, H * 0.205);

  // 车身（白色楔形）
  const bg = cx.createLinearGradient(0, Y(0.95), 0, Y(0.10));
  bg.addColorStop(0, '#fbfdfe');
  bg.addColorStop(0.45, '#e6ebee');
  bg.addColorStop(0.75, '#c3cbd0');
  bg.addColorStop(1, '#8f999f');
  cx.fillStyle = bg;
  cx.beginPath();
  cx.moveTo(X(1.0), Y(0.31));
  cx.lineTo(X(0.94), Y(0.43));
  cx.lineTo(X(0.74), Y(0.52));
  cx.lineTo(X(0.62), Y(0.57));
  cx.lineTo(X(0.46), Y(0.88));
  cx.lineTo(X(0.30), Y(0.90));
  cx.lineTo(X(0.17), Y(0.72));
  cx.lineTo(X(0.04), Y(0.69));
  cx.lineTo(X(0.015), Y(0.54));
  cx.lineTo(X(0.02), Y(0.28));
  cx.lineTo(X(0.10), Y(0.10));
  cx.lineTo(X(0.84), Y(0.10));
  cx.lineTo(X(0.97), Y(0.19));
  cx.closePath();
  cx.fill();

  // 车尾扩散器（画在车身之后，四个喷口才露得出来）
  cx.fillStyle = '#08090a';
  cx.beginPath();
  cx.moveTo(X(0.012), Y(0.31));
  cx.lineTo(X(0.185), Y(0.31));
  cx.lineTo(X(0.175), Y(0.07));
  cx.lineTo(X(0.025), Y(0.07));
  cx.closePath(); cx.fill();
  cx.strokeStyle = 'rgba(160,175,185,.35)';
  cx.lineWidth = Math.max(1, L * 0.0025);
  cx.stroke();

  // 喷口
  for (let i = 0; i < 4; i++) {
    const nx = X(0.048 + i * 0.036), ny = Y(0.195);
    const r = H * 0.062;
    cx.fillStyle = '#1b1e21';
    cx.beginPath(); cx.arc(nx, ny, r, 0, 7); cx.fill();
    cx.strokeStyle = 'rgba(180,200,210,.45)';
    cx.lineWidth = Math.max(1, L * 0.002);
    cx.beginPath(); cx.arc(nx, ny, r, 0, 7); cx.stroke();
    cx.fillStyle = thrust > 0 ? '#bff7ff' : '#3e464b';
    cx.beginPath(); cx.arc(nx, ny, r * 0.55, 0, 7); cx.fill();
  }

  // 侧面折线
  cx.strokeStyle = 'rgba(255,255,255,.85)';
  cx.lineWidth = Math.max(1, L * 0.003);
  cx.beginPath(); cx.moveTo(X(0.02), Y(0.52)); cx.lineTo(X(0.60), Y(0.54)); cx.lineTo(X(0.96), Y(0.36)); cx.stroke();

  // 黑色座舱
  const cg = cx.createLinearGradient(0, Y(0.90), 0, Y(0.56));
  cg.addColorStop(0, '#0b0f12');
  cg.addColorStop(0.55, '#151c21');
  cg.addColorStop(1, '#2a343a');
  cx.fillStyle = cg;
  cx.beginPath();
  cx.moveTo(X(0.65), Y(0.57));
  cx.lineTo(X(0.49), Y(0.855));
  cx.lineTo(X(0.33), Y(0.875));
  cx.lineTo(X(0.22), Y(0.71));
  cx.lineTo(X(0.26), Y(0.61));
  cx.lineTo(X(0.47), Y(0.585));
  cx.closePath();
  cx.fill();
  cx.strokeStyle = 'rgba(200,235,255,.45)';
  cx.lineWidth = Math.max(1, L * 0.0035);
  cx.stroke();

  // 座舱里的选手
  if (opts.riders && opts.riders.length) {
    const us = [0.30, 0.365, 0.43, 0.495];
    const sz = Math.max(4, Math.round(H * 0.13));
    opts.riders.slice(0, 4).forEach((pl, i) => {
      cx.fillStyle = pl.color;
      cx.fillRect(Math.round(X(us[i])), Math.round(Y(0.80)), sz, sz);
    });
  }

  // 前灯
  cx.fillStyle = 'rgba(210,245,255,.95)';
  rrp(X(0.94), Y(0.40), X(1.0) - X(0.94), H * 0.022, 3); cx.fill();

  // 尾灯
  cx.fillStyle = '#ff2b3a';
  rrp(X(0.012), Y(0.59), L * 0.006, H * 0.10, 2); cx.fill();

  // 大尾翼
  cx.strokeStyle = '#20262a';
  cx.lineWidth = Math.max(2, L * 0.006);
  cx.beginPath(); cx.moveTo(X(0.085), Y(0.70)); cx.lineTo(X(0.10), Y(0.94)); cx.stroke();
  cx.beginPath(); cx.moveTo(X(0.145), Y(0.68)); cx.lineTo(X(0.15), Y(0.93)); cx.stroke();
  cx.fillStyle = '#e8edef';
  cx.beginPath();
  cx.moveTo(X(-0.03), Y(0.995));
  cx.lineTo(X(0.19), Y(0.97));
  cx.lineTo(X(0.20), Y(0.925));
  cx.lineTo(X(-0.02), Y(0.95));
  cx.closePath(); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,.8)';
  cx.lineWidth = Math.max(1, L * 0.003);
  cx.stroke();

  // ROADSTER 字样
  cx.save();
  cx.fillStyle = 'rgba(30,36,40,.75)';
  cx.font = `900 ${Math.max(5, Math.round(H * 0.075))}px "SF Mono",monospace`;
  cx.textAlign = 'center';
  cx.fillText('ROADSTER', X(0.13), Y(0.58));
  cx.restore();

  cx.restore();
}

function roadster(cx, x, ground, pxm, now, riders, opts = {}) {
  roadsterVector(cx, x, ground, pxm, now, { ...opts, riders });
}

// 海水过滤器：疯狂水世界唯一指定神器
function filterIcon(cx, x, y, s, now) {
  cx.save();
  cx.shadowColor = 'rgba(90,210,255,.8)';
  cx.shadowBlur = s * 0.5;
  cx.fillStyle = '#2aa8d8';
  rr(cx, x - s * 0.6, y - s * 0.9, s * 1.2, s * 1.8, s * 0.35);
  cx.fillStyle = '#eaf7ff';
  cx.fillRect(x - s * 0.6, y - s * 0.28, s * 1.2, s * 0.24);
  cx.fillStyle = '#0a2a3a';
  cx.font = `900 ${Math.max(6, Math.round(s * 0.6))}px "SF Mono",monospace`;
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText('H₂O', x, y + s * 0.32);
  cx.restore();
}

/* ------------------------------------------------------------------ 64 位充气恐龙 */
// 参考廉价充气霸王龙演出服：橙色塑料皮、黑色虎纹、绿色眼睛、张开的红嘴。
// 纯矢量 + 渐变，和 Chrome 像素小恐龙是两种皮肤。
function shade(hex, amt) {
  const s = String(hex || '#f59e0b').replace('#', '');
  let r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  if (!isFinite(r)) { r = 245; g = 158; b = 11; }
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function inflateDino(cx, x, bottom, h, color, frame = 0) {
  const H = h;
  const X = dx => x + dx * H;
  const Y = dy => bottom - dy * H;
  // 参考图是橙色演出服：充气皮肤固定橙色，选手颜色只做领巾，避免变成“绿皮恐龙”。
  const body = '#f59e0b';
  const accent = color && color !== '#f59e0b' ? color : '#ff3fa4';
  const hi = shade(body, 0.40);
  const lo = shade(body, -0.34);
  const deep = shade(body, -0.58);
  const outline = 'rgba(62,28,10,.82)';
  const stripe = 'rgba(38,24,16,.88)';
  const frameN = ((frame % 3) + 3) % 3;
  const bob = frameN === 1 ? -0.012 * H : 0;
  const step = frameN === 1 ? 0.022 * H : frameN === 2 ? -0.018 * H : 0;

  cx.save();
  cx.translate(0, bob);
  cx.lineJoin = 'round';
  cx.lineCap = 'round';

  // 尾巴
  cx.save();
  cx.translate(X(-0.20), Y(0.25));
  cx.rotate(frameN === 1 ? 0.07 : frameN === 2 ? -0.05 : 0);
  const tg = cx.createLinearGradient(0, 0, -H * 0.55, 0);
  tg.addColorStop(0, lo); tg.addColorStop(0.6, body); tg.addColorStop(1, deep);
  cx.fillStyle = tg;
  cx.beginPath();
  cx.moveTo(0, -H * 0.05);
  cx.bezierCurveTo(-H * 0.12, -H * 0.13, -H * 0.36, -H * 0.10, -H * 0.55, -H * 0.03);
  cx.bezierCurveTo(-H * 0.42, H * 0.04, -H * 0.26, H * 0.08, -H * 0.10, H * 0.08);
  cx.bezierCurveTo(-H * 0.04, H * 0.07, 0, H * 0.03, 0, -H * 0.05);
  cx.closePath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.014; cx.stroke();
  // 尾巴虎纹
  cx.strokeStyle = stripe; cx.lineWidth = H * 0.035;
  for (let i = 0; i < 3; i++) {
    cx.beginPath();
    cx.moveTo(-H * (0.10 + i * 0.13), -H * 0.075);
    cx.quadraticCurveTo(-H * (0.14 + i * 0.13), 0, -H * (0.10 + i * 0.13), H * 0.06);
    cx.stroke();
  }
  cx.restore();

  // 后腿
  cx.fillStyle = deep;
  cx.beginPath();
  cx.moveTo(X(-0.18), Y(0.30));
  cx.bezierCurveTo(X(-0.30), Y(0.18), X(-0.28), Y(0.05), X(-0.18), Y(0.02));
  cx.bezierCurveTo(X(-0.06), Y(-0.01), X(-0.02), Y(0.08), X(-0.06), Y(0.20));
  cx.bezierCurveTo(X(-0.09), Y(0.27), X(-0.12), Y(0.31), X(-0.18), Y(0.30));
  cx.closePath(); cx.fill();
  cx.fillStyle = '#2f2118';
  cx.beginPath(); cx.ellipse(X(-0.10), Y(0.015), H * 0.10, H * 0.035, 0, 0, 7); cx.fill();

  // 身体
  const bodyPath = () => {
    cx.beginPath();
    cx.moveTo(X(-0.18), Y(0.20));
    cx.bezierCurveTo(X(-0.34), Y(0.36), X(-0.31), Y(0.66), X(-0.12), Y(0.79));
    cx.bezierCurveTo(X(0.03), Y(0.89), X(0.20), Y(0.84), X(0.27), Y(0.68));
    cx.bezierCurveTo(X(0.34), Y(0.48), X(0.28), Y(0.24), X(0.17), Y(0.09));
    cx.bezierCurveTo(X(0.05), Y(0.00), X(-0.10), Y(0.02), X(-0.18), Y(0.20));
    cx.closePath();
  };
  const bg = cx.createLinearGradient(X(-0.28), Y(0.92), X(0.26), Y(0.04));
  bg.addColorStop(0, hi); bg.addColorStop(0.38, body); bg.addColorStop(0.78, lo); bg.addColorStop(1, deep);
  cx.fillStyle = bg;
  bodyPath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.014; cx.stroke();

  // 身体虎纹（裁进身体）
  cx.save(); bodyPath(); cx.clip();
  cx.strokeStyle = stripe;
  cx.lineWidth = H * 0.042;
  const bands = [
    [-0.26, 0.68, -0.02, 0.57],
    [-0.31, 0.54, -0.07, 0.44],
    [-0.28, 0.41, -0.10, 0.34],
    [0.10, 0.31, 0.23, 0.26],
    [0.02, 0.22, 0.16, 0.18],
  ];
  for (const [x0, y0, x1, y1] of bands) {
    cx.beginPath();
    cx.moveTo(X(x0), Y(y0));
    cx.quadraticCurveTo(X((x0 + x1) / 2), Y((y0 + y1) / 2 + 0.035), X(x1), Y(y1));
    cx.stroke();
  }
  // 肚子高光
  const hg = cx.createRadialGradient(X(-0.07), Y(0.50), H * 0.01, X(-0.07), Y(0.50), H * 0.30);
  hg.addColorStop(0, 'rgba(255,255,255,.34)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = hg;
  cx.beginPath(); cx.ellipse(X(-0.07), Y(0.50), H * 0.23, H * 0.32, -0.10, 0, 7); cx.fill();
  cx.restore();

  // 腹部充气缝线
  cx.save();
  cx.strokeStyle = 'rgba(255,240,210,.30)';
  cx.lineWidth = Math.max(1, H * 0.008);
  cx.setLineDash([H * 0.025, H * 0.018]);
  cx.beginPath();
  cx.moveTo(X(-0.28), Y(0.33));
  cx.bezierCurveTo(X(-0.20), Y(0.20), X(0.02), Y(0.10), X(0.20), Y(0.16));
  cx.stroke();
  cx.restore();

  // 前腿
  cx.fillStyle = lo;
  cx.beginPath();
  cx.moveTo(X(0.00), Y(0.32));
  cx.bezierCurveTo(X(0.08), Y(0.18), X(0.16), Y(0.08), X(0.14), Y(0.02));
  cx.bezierCurveTo(X(0.12), Y(-0.02), X(-0.04), Y(-0.02), X(-0.06), Y(0.03));
  cx.bezierCurveTo(X(-0.10), Y(0.12), X(-0.10), Y(0.24), X(-0.06), Y(0.31));
  cx.closePath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.012; cx.stroke();
  cx.fillStyle = '#2f2118';
  cx.beginPath(); cx.ellipse(X(0.05) + step, Y(0.012), H * 0.10, H * 0.035, 0, 0, 7); cx.fill();
  // 脚趾
  cx.fillStyle = '#f4ead8';
  for (let i = 0; i < 3; i++) {
    cx.beginPath();
    cx.moveTo(X(0.11) + step, Y(0.02));
    cx.lineTo(X(0.18) + step + i * H * 0.01, Y(0.005));
    cx.lineTo(X(0.12) + step, Y(-0.005));
    cx.closePath(); cx.fill();
  }

  // 小短手
  cx.strokeStyle = lo; cx.lineWidth = H * 0.035;
  cx.beginPath();
  cx.moveTo(X(0.20), Y(0.60));
  cx.quadraticCurveTo(X(0.30), Y(0.54), X(0.28), Y(0.48));
  cx.stroke();
  cx.fillStyle = '#f4ead8';
  cx.beginPath(); cx.arc(X(0.285), Y(0.475), H * 0.012, 0, 7); cx.fill();
  cx.beginPath(); cx.arc(X(0.30), Y(0.49), H * 0.010, 0, 7); cx.fill();

  // 脖子 / 头
  const headShift = frameN === 1 ? H * 0.008 : 0;
  cx.save();
  cx.translate(0, -headShift);
  // 脖子
  const ng = cx.createLinearGradient(X(-0.10), Y(0.80), X(0.22), Y(0.72));
  ng.addColorStop(0, hi); ng.addColorStop(0.55, body); ng.addColorStop(1, lo);
  cx.fillStyle = ng;
  cx.beginPath();
  cx.moveTo(X(-0.12), Y(0.70));
  cx.bezierCurveTo(X(-0.10), Y(0.88), X(0.02), Y(0.96), X(0.20), Y(0.94));
  cx.lineTo(X(0.24), Y(0.82));
  cx.bezierCurveTo(X(0.10), Y(0.82), X(0.02), Y(0.76), X(0.00), Y(0.66));
  cx.closePath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.012; cx.stroke();

  // 领巾：用选手颜色，充气服本身保持参考图的橙色
  cx.fillStyle = accent;
  cx.beginPath();
  cx.moveTo(X(-0.07), Y(0.78));
  cx.lineTo(X(0.09), Y(0.745));
  cx.lineTo(X(0.00), Y(0.665));
  cx.lineTo(X(-0.10), Y(0.73));
  cx.closePath(); cx.fill();
  cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = H * 0.006; cx.stroke();

  // 上颌
  const hg2 = cx.createLinearGradient(X(-0.04), Y(1.00), X(0.40), Y(0.78));
  hg2.addColorStop(0, hi); hg2.addColorStop(0.5, body); hg2.addColorStop(1, lo);
  cx.fillStyle = hg2;
  cx.beginPath();
  cx.moveTo(X(-0.07), Y(0.92));
  cx.bezierCurveTo(X(0.02), Y(1.02), X(0.20), Y(1.03), X(0.34), Y(0.96));
  cx.bezierCurveTo(X(0.42), Y(0.92), X(0.47), Y(0.87), X(0.46), Y(0.84));
  cx.lineTo(X(0.43), Y(0.81));
  cx.lineTo(X(0.10), Y(0.80));
  cx.lineTo(X(0.01), Y(0.84));
  cx.closePath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.014; cx.stroke();

  // 下颌
  cx.fillStyle = lo;
  cx.beginPath();
  cx.moveTo(X(0.12), Y(0.80));
  cx.lineTo(X(0.43), Y(0.82));
  cx.lineTo(X(0.40), Y(0.70));
  cx.quadraticCurveTo(X(0.30), Y(0.64), X(0.18), Y(0.66));
  cx.lineTo(X(0.10), Y(0.72));
  cx.closePath(); cx.fill();
  cx.strokeStyle = outline; cx.lineWidth = H * 0.012; cx.stroke();

  // 张开的红色口腔（画在上下颌之后，才不会被牙齿/下颌盖掉）
  cx.fillStyle = '#8f1d22';
  cx.beginPath();
  cx.moveTo(X(0.12), Y(0.80));
  cx.lineTo(X(0.43), Y(0.81));
  cx.lineTo(X(0.40), Y(0.685));
  cx.lineTo(X(0.14), Y(0.70));
  cx.closePath(); cx.fill();
  // 舌头
  cx.fillStyle = '#d94a4a';
  cx.beginPath();
  cx.moveTo(X(0.17), Y(0.735));
  cx.quadraticCurveTo(X(0.28), Y(0.70), X(0.36), Y(0.735));
  cx.quadraticCurveTo(X(0.27), Y(0.755), X(0.17), Y(0.735));
  cx.fill();

  // 牙
  cx.fillStyle = '#f6ecd9';
  for (let i = 0; i < 7; i++) {
    const tx = 0.13 + i * 0.043;
    cx.beginPath();
    cx.moveTo(X(tx), Y(0.805));
    cx.lineTo(X(tx + 0.018), Y(0.775));
    cx.lineTo(X(tx + 0.032), Y(0.805));
    cx.closePath(); cx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const tx = 0.14 + i * 0.042;
    cx.beginPath();
    cx.moveTo(X(tx), Y(0.705));
    cx.lineTo(X(tx + 0.017), Y(0.735));
    cx.lineTo(X(tx + 0.031), Y(0.705));
    cx.closePath(); cx.fill();
  }

  // 眼睛
  cx.fillStyle = '#b7f23a';
  cx.beginPath(); cx.ellipse(X(0.115), Y(0.915), H * 0.038, H * 0.030, -0.12, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(30,40,10,.8)'; cx.lineWidth = H * 0.008; cx.stroke();
  cx.fillStyle = '#121a06';
  cx.beginPath(); cx.ellipse(X(0.122), Y(0.915), H * 0.012, H * 0.022, -0.12, 0, 7); cx.fill();
  cx.fillStyle = 'rgba(255,255,255,.8)';
  cx.beginPath(); cx.arc(X(0.105), Y(0.925), H * 0.007, 0, 7); cx.fill();
  // 鼻孔
  cx.fillStyle = 'rgba(50,28,14,.75)';
  cx.beginPath(); cx.ellipse(X(0.405), Y(0.875), H * 0.010, H * 0.007, 0.4, 0, 7); cx.fill();

  // 头部虎纹
  cx.strokeStyle = stripe; cx.lineWidth = H * 0.035;
  cx.beginPath(); cx.moveTo(X(-0.02), Y(0.985)); cx.quadraticCurveTo(X(0.06), Y(0.94), X(0.04), Y(0.90)); cx.stroke();
  cx.beginPath(); cx.moveTo(X(0.14), Y(1.005)); cx.quadraticCurveTo(X(0.18), Y(0.955), X(0.15), Y(0.91)); cx.stroke();
  cx.beginPath(); cx.moveTo(X(0.27), Y(0.965)); cx.quadraticCurveTo(X(0.30), Y(0.925), X(0.28), Y(0.89)); cx.stroke();
  // 头/脖子接缝高光
  cx.fillStyle = 'rgba(255,255,255,.22)';
  cx.beginPath(); cx.ellipse(X(0.02), Y(0.955), H * 0.06, H * 0.035, -0.35, 0, 7); cx.fill();
  cx.restore();

  // 大腿高光
  cx.fillStyle = 'rgba(255,255,255,.18)';
  cx.beginPath(); cx.ellipse(X(0.13), Y(0.30), H * 0.07, H * 0.10, -0.2, 0, 7); cx.fill();

  cx.restore();
}

// 电鳗发电机：水世界专属，蓝壳 + 玻璃窗里的黄色电鳗
function eelIcon(cx, x, y, s, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now / 170);
  cx.save();
  cx.shadowColor = `rgba(90,225,255,${0.55 + pulse * 0.35})`;
  cx.shadowBlur = s * (0.45 + pulse * 0.35);
  cx.fillStyle = '#0d3446';
  rr(cx, x - s * 0.78, y - s * 0.62, s * 1.56, s * 1.24, s * 0.18);
  cx.strokeStyle = '#5ee7ff'; cx.lineWidth = Math.max(1.2, s * 0.06);
  cx.beginPath();
  cx.moveTo(x - s * 0.78 + s * 0.18, y - s * 0.62);
  cx.arcTo(x + s * 0.78, y - s * 0.62, x + s * 0.78, y + s * 0.62, s * 0.18);
  cx.arcTo(x + s * 0.78, y + s * 0.62, x - s * 0.78, y + s * 0.62, s * 0.18);
  cx.arcTo(x - s * 0.78, y + s * 0.62, x - s * 0.78, y - s * 0.62, s * 0.18);
  cx.arcTo(x - s * 0.78, y - s * 0.62, x + s * 0.78, y - s * 0.62, s * 0.18);
  cx.closePath(); cx.stroke();
  cx.fillStyle = '#061a24';
  rr(cx, x - s * 0.58, y - s * 0.38, s * 1.10, s * 0.76, s * 0.10);
  cx.strokeStyle = '#ffe14d'; cx.lineWidth = Math.max(2, s * 0.10); cx.lineCap = 'round';
  cx.beginPath();
  cx.moveTo(x - s * 0.42, y + s * 0.10);
  cx.bezierCurveTo(x - s * 0.20, y - s * 0.32, x + s * 0.04, y + s * 0.32, x + s * 0.26, y - s * 0.10);
  cx.bezierCurveTo(x + s * 0.36, y - s * 0.26, x + s * 0.44, y - s * 0.10, x + s * 0.50, y - s * 0.18);
  cx.stroke();
  cx.fillStyle = '#ffe14d';
  cx.beginPath(); cx.arc(x - s * 0.42, y + s * 0.10, s * 0.055, 0, 7); cx.fill();
  cx.fillStyle = '#bff7ff';
  cx.beginPath();
  cx.moveTo(x + s * 0.05, y - s * 0.30);
  cx.lineTo(x + s * 0.22, y - s * 0.02);
  cx.lineTo(x + s * 0.10, y - s * 0.02);
  cx.lineTo(x + s * 0.20, y + s * 0.26);
  cx.lineTo(x - s * 0.02, y + s * 0.00);
  cx.lineTo(x + s * 0.09, y + s * 0.00);
  cx.closePath(); cx.fill();
  cx.fillStyle = '#d8f8ff';
  cx.beginPath(); cx.arc(x - s * 0.38, y - s * 0.70, s * 0.07, 0, 7); cx.fill();
  cx.beginPath(); cx.arc(x + s * 0.38, y - s * 0.70, s * 0.07, 0, 7); cx.fill();
  cx.restore();
}

// 刺豚制氧机：圆滚滚的刺豚 + 背上的小氧气瓶
function pufferIcon(cx, x, y, s, now) {
  const bob = Math.sin(now / 260) * s * 0.05;
  cx.save();
  cx.translate(0, bob);
  cx.shadowColor = 'rgba(255,190,80,.75)';
  cx.shadowBlur = s * 0.5;
  cx.fillStyle = '#e08a1e';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const r0 = s * 0.62, r1 = s * 0.90;
    cx.beginPath();
    cx.moveTo(x + Math.cos(a - 0.07) * r0, y + Math.sin(a - 0.07) * r0);
    cx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    cx.lineTo(x + Math.cos(a + 0.07) * r0, y + Math.sin(a + 0.07) * r0);
    cx.closePath(); cx.fill();
  }
  const bg = cx.createRadialGradient(x - s * 0.18, y - s * 0.22, s * 0.08, x, y, s * 0.70);
  bg.addColorStop(0, '#ffe28a'); bg.addColorStop(0.55, '#f5b32e'); bg.addColorStop(1, '#d97706');
  cx.fillStyle = bg;
  cx.beginPath(); cx.arc(x, y, s * 0.64, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(90,40,8,.55)'; cx.lineWidth = Math.max(1, s * 0.035); cx.stroke();
  cx.fillStyle = 'rgba(255,250,230,.88)';
  cx.beginPath(); cx.ellipse(x, y + s * 0.24, s * 0.40, s * 0.28, 0, 0, 7); cx.fill();
  cx.fillStyle = '#fff';
  cx.beginPath(); cx.arc(x - s * 0.20, y - s * 0.15, s * 0.15, 0, 7); cx.fill();
  cx.beginPath(); cx.arc(x + s * 0.20, y - s * 0.15, s * 0.15, 0, 7); cx.fill();
  cx.fillStyle = '#141414';
  cx.beginPath(); cx.arc(x - s * 0.18, y - s * 0.14, s * 0.075, 0, 7); cx.fill();
  cx.beginPath(); cx.arc(x + s * 0.22, y - s * 0.14, s * 0.075, 0, 7); cx.fill();
  cx.strokeStyle = '#7c2d12'; cx.lineWidth = Math.max(1, s * 0.05);
  cx.beginPath(); cx.arc(x, y + s * 0.10, s * 0.16, 0.2, Math.PI - 0.2); cx.stroke();
  cx.fillStyle = '#22d3ee';
  rr(cx, x + s * 0.45, y - s * 0.34, s * 0.30, s * 0.62, s * 0.10);
  cx.strokeStyle = '#d9fbff'; cx.lineWidth = Math.max(1, s * 0.025); cx.stroke();
  cx.fillStyle = '#0e4b5a';
  cx.fillRect(x + s * 0.45, y - s * 0.05, s * 0.30, s * 0.08);
  cx.strokeStyle = '#9be7f5'; cx.lineWidth = Math.max(1, s * 0.045);
  cx.beginPath();
  cx.moveTo(x + s * 0.45, y - s * 0.20);
  cx.quadraticCurveTo(x + s * 0.30, y - s * 0.48, x + s * 0.16, y - s * 0.36);
  cx.stroke();
  cx.fillStyle = 'rgba(190,245,255,.75)';
  for (let i = 0; i < 3; i++) {
    cx.beginPath();
    cx.arc(x + s * (0.58 + i * 0.08), y - s * (0.55 + i * 0.16 + (now / 900 + i) % 1 * 0.12), s * (0.05 + i * 0.012), 0, 7);
    cx.fill();
  }
  cx.restore();
}

/* ------------------------------------------------------------------ 64 位角色立绘（Deepseek Chan / 橙发女仆） */
const charImgs = {};
function preloadCharacters() {
  const src = { deepseek: '/assets/char-deepseek.png', maid: '/assets/char-maid.png' };
  for (const k of Object.keys(src)) {
    const im = new Image();
    im.src = src[k];
    charImgs[k] = im;
  }
}
preloadCharacters();

function character(cx, x, bottom, h, skin, frame = 0) {
  const w = h * 0.8;
  const img = charImgs[skin];
  const bob = frame === 1 ? -h * 0.012 : 0;
  const sway = frame === 1 ? h * 0.008 : frame === 2 ? -h * 0.008 : 0;
  cx.save();
  if (img && img.complete && img.naturalWidth) {
    cx.imageSmoothingEnabled = false;
    cx.shadowColor = skin === 'maid' ? 'rgba(255,150,90,.35)' : 'rgba(120,180,255,.35)';
    cx.shadowBlur = h * 0.07;
    cx.drawImage(img, Math.round(x - w / 2 + sway), Math.round(bottom - h + bob), Math.round(w), Math.round(h));
  } else {
    cx.fillStyle = skin === 'maid' ? '#e86a36' : '#3b5590';
    cx.fillRect(x - w / 2, bottom - h, w, h);
  }
  cx.restore();
}

window.Cup = { rr, cactus, heart, coin, double, battery, bandages, key, tumbleweed, carVector, car, roadster, roadsterVector, inflateDino, eel: eelIcon, puffer: pufferIcon, filter: filterIcon, character };



})();
