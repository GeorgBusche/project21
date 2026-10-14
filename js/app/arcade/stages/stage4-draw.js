import { clamp } from './stage-utils.js';

const TAU = Math.PI * 2;
const PHASE_NAMES = ['bier', 'korn', 'brause', 'latte'];

function octagon(ctx, x, y, r, rot = Math.PI / 8) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * TAU) / 8;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Dunkler Bierkeller: Ziegel, Saeulen, Phasen-Schein, Brause-Blasen, Tresen
export function drawBossBackground(ctx, { W, H, t, beat, accent, phase }) {
  ctx.fillStyle = '#07060b';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#15121c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 40; y < 556; y += 26) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    const off = (Math.floor(y / 26) % 2) * 30;
    for (let x = off; x < W; x += 60) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 26);
    }
  }
  ctx.stroke();

  ctx.globalAlpha = 0.1 + 0.05 * (1 - beat.beatPhase);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W / 2, 130, 190, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.07;
  ctx.beginPath();
  ctx.arc(W / 2, 130, 120, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Saeulen mit Nieten
  for (const px of [0, W - 18]) {
    ctx.fillStyle = '#0d0b12';
    ctx.fillRect(px, 28, 18, 540);
    ctx.fillStyle = '#1b1726';
    ctx.fillRect(px + (px ? 0 : 15), 28, 3, 540);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.5;
    for (let y = 60; y < 556; y += 48) ctx.fillRect(px + 7, y, 4, 4);
    ctx.globalAlpha = 1;
  }

  // Aufsteigende Blasen
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const bx = 24 + ((i * 97) % (W - 48));
    const by = H - ((t * (22 + (i % 5) * 9) + i * 71) % (H + 20));
    const r = 2 + (i % 3) * 1.5;
    ctx.moveTo(bx + r, by);
    ctx.arc(bx, by, r, 0, TAU);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Spurfuehrung
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.05;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    ctx.moveTo(i * 72, 215);
    ctx.lineTo(i * 72, 556);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Tresen
  ctx.fillStyle = '#120d0a';
  ctx.fillRect(0, 556, W, H - 556);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.6 + 0.3 * (1 - beat.beatPhase);
  ctx.fillRect(0, 556, W, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a1c12';
  ctx.fillRect(0, 560, W, 5);
}

function crack(ctx, x, y, len, seed) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  let cx = x;
  let cy = y;
  for (let i = 0; i < 4; i++) {
    cx += Math.sin(seed * 12.9 + i * 2.1) * len * 0.5;
    cy += len * 0.35;
    ctx.lineTo(cx, cy);
  }
  ctx.stroke();
}

function wreck(ctx, x, y, w, h, t, seed) {
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.65;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1.5;
  crack(ctx, x - w * 0.2, y - h / 2, h * 0.5, seed);
  crack(ctx, x + w * 0.2, y - h / 2, h * 0.4, seed + 1);
  ctx.fillStyle = '#9ca3af';
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 3; i++) {
    const a = (t * 0.6 + i * 0.33) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t + i * 2) * 6, y - h / 2 - a * 26, 4 + a * 6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Bier-Fass mit Zapfhahn (links)
function podBier(ctx, x, y, c, active) {
  ctx.fillStyle = '#3b2412';
  ctx.fillRect(x - 24, y - 26, 48, 52);
  ctx.fillStyle = '#5b351c';
  ctx.fillRect(x - 24, y - 26, 48, 6);
  ctx.fillRect(x - 24, y + 20, 48, 6);
  ctx.fillRect(x - 24, y - 4, 48, 5);
  ctx.fillStyle = active ? c : '#7a5a2a';
  ctx.fillRect(x + 22, y - 2, 18, 8);
  ctx.fillRect(x + 34, y + 4, 6, 12);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(x - 12, y - 14, 24, 8);
}

// Schuettelkorn-Flasche (rechts)
function podKorn(ctx, x, y, c, active, t) {
  const sh = active ? Math.sin(t * 40) * 1.5 : 0;
  ctx.save();
  ctx.translate(x + sh, y);
  ctx.fillStyle = '#10203a';
  ctx.fillRect(-14, -8, 28, 36);
  ctx.fillRect(-6, -34, 12, 28);
  ctx.fillStyle = active ? c : '#355a6e';
  ctx.fillRect(-14, 4, 28, 14);
  ctx.fillStyle = '#7c2d92';
  ctx.fillRect(-7, -40, 14, 8);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-10, 8, 20, 6);
  ctx.restore();
}

// Ahoi-Brause-Tuete (oben)
function podBrause(ctx, x, y, c, active, t) {
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(x - 20, y - 22, 40, 44);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(x - 20, y - 4, 40, 12);
  ctx.fillStyle = '#fff7ed';
  ctx.fillRect(x - 12, y - 2, 6, 8);
  ctx.fillRect(x - 4, y - 2, 6, 8);
  ctx.fillRect(x + 4, y - 2, 6, 8);
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(x - 20, y - 30, 40, 8);
  if (active) {
    ctx.fillStyle = c;
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 14 + i * 14, y - 36 - ((t * 30 + i * 9) % 14), 3, 3);
  }
}

// Schnapslatte mit Shotglaesern (unten)
function podLatte(ctx, x, y, c, active) {
  ctx.fillStyle = '#7c4a1e';
  ctx.fillRect(x - 74, y - 8, 148, 14);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(x - 74, y - 8, 148, 3);
  for (let i = 0; i < 5; i++) {
    const gx = x - 60 + i * 30;
    ctx.fillStyle = active ? '#fbbf24' : '#6b5b2a';
    ctx.fillRect(gx - 7, y - 24, 14, 16);
    ctx.fillStyle = active ? c : '#4b1d1d';
    ctx.fillRect(gx - 5, y - 18, 10, 8);
  }
}

// Panzerkern, vier Getraenke-Pods, Fiech im Bullauge
export function drawBoss(ctx, s) {
  const { x, y, t, beat, phase, hp, maxHp, hurt, shield, dying, drawFiech } = s;
  const accent = ['#f59e0b', '#67e8f9', '#a3e635', '#ef4444'][phase];
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  const spread = dying * dying * 160;
  const alive = 1 - clamp(dying * 1.1 - 0.1, 0, 1);
  const shakeX = dying ? Math.sin(t * 70) * (3 + dying * 5) : 0;

  ctx.save();
  ctx.globalAlpha = alive;
  ctx.translate(x + shakeX, y);

  const pods = [
    { n: 0, px: -88 - spread, py: 6, w: 52, h: 56 },
    { n: 1, px: 88 + spread, py: 8, w: 32, h: 70 },
    { n: 2, px: 0, py: -70 - spread, w: 44, h: 52 },
    { n: 3, px: 0, py: 72 + spread, w: 150, h: 36 }
  ];
  for (const p of pods) {
    const active = p.n === phase && !dying;
    ctx.save();
    ctx.translate(p.px, p.py);
    if (dying) ctx.rotate(dying * (p.n % 2 ? 1 : -1) * 1.2);
    const f = [podBier, podKorn, podBrause, podLatte][p.n];
    f(ctx, 0, 0, accent, active, t);
    if (p.n < phase || dying) wreck(ctx, 0, 0, p.w, p.h, t, p.n + 1);
    else if (p.n > phase) {
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.35 * alive;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.globalAlpha = alive;
    }
    ctx.restore();
  }

  // Verbindungsstreben
  ctx.strokeStyle = '#1f1a2b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-70 - spread, 6);
  ctx.lineTo(70 + spread, 8);
  ctx.moveTo(0, -56 - spread);
  ctx.lineTo(0, 56 + spread);
  ctx.stroke();

  // Panzerkern
  octagon(ctx, 0, 0, 60);
  ctx.fillStyle = '#17131f';
  ctx.fill();
  octagon(ctx, 0, 0, 60);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = alive * (0.6 + 0.4 * (1 - beat.beatPhase));
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = alive;
  octagon(ctx, 0, 0, 50);
  ctx.strokeStyle = '#2d2640';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#4b4263';
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * TAU) / 8;
    ctx.fillRect(Math.cos(a) * 55 - 2, Math.sin(a) * 55 - 2, 4, 4);
  }

  // Hoerner
  ctx.fillStyle = '#e5e7eb';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * 30, -48);
    ctx.lineTo(d * 52, -80 - pulse * 2);
    ctx.lineTo(d * 18, -54);
    ctx.closePath();
    ctx.fill();
  }

  // Bullauge mit Fiech
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 2, 34, 0, TAU);
  ctx.clip();
  ctx.fillStyle = hurt > 0.3 ? '#7f1d1d' : '#2a0a0e';
  ctx.fillRect(-36, -34, 72, 72);
  drawFiech(ctx, 0, 6, 62, { beatPhase: beat.beatPhase, action: hurt > 0.3 ? 'hurt' : 'angry', tilt: Math.sin(t * 2) * 0.1 });
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 2, 34, 0, TAU);
  ctx.strokeStyle = '#0a0810';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Risse mit schwindender Huelle
  const dmg = 1 - hp / maxHp;
  ctx.strokeStyle = '#e5e7eb';
  ctx.globalAlpha = alive * 0.7;
  ctx.lineWidth = 1.5;
  if (dmg > 0.25) crack(ctx, -40, -46, 30, 3);
  if (dmg > 0.5) crack(ctx, 38, -40, 34, 5);
  if (dmg > 0.75) crack(ctx, -10, 34, 26, 8);
  ctx.globalAlpha = alive;

  // Schutzschild
  if (shield) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.5 + 0.3 * pulse;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 100, t * 2, t * 2 + TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (hurt > 0.2) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = hurt * 0.35;
    octagon(ctx, 0, 0, 60);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBossBullet(ctx, b, t, P) {
  const { x, y } = b;
  if (b.kind === 'latte') {
    for (const [x0, x1] of b.segs) {
      if (x1 - x0 < 1) continue;
      ctx.fillStyle = '#7c4a1e';
      ctx.fillRect(x0, y - 9, x1 - x0, 18);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x0, y - 9, x1 - x0, 3);
      ctx.fillStyle = '#ef4444';
      for (let gx = x0 + 10; gx < x1 - 6; gx += 36) ctx.fillRect(gx, y - 3, 14, 8);
    }
    return;
  }
  if (b.kind === 'foam') {
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(x, y + 2, b.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x - 4, y - 6, 6, 0, TAU);
    ctx.arc(x + 4, y - 7, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.accent;
    ctx.fillRect(x - 6, y, 12, 3);
  } else if (b.kind === 'flask') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 8 + b.ph) * 0.4);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-6, -4, 12, 14);
    ctx.fillRect(-3, -13, 6, 10);
    ctx.fillStyle = '#7c2d92';
    ctx.fillRect(-4, -16, 8, 4);
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(-5, 2, 10, 4);
    ctx.restore();
  } else {
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = P.accent2;
    ctx.fillRect(x - 5, y - 5, 4, 4);
    ctx.fillRect(x + 2, y + 1, 3, 3);
  }
}

// Strahl: erst Warn-Schraffur auf der Spur, dann Treffer-Kern
export function drawBeam(ctx, m, t, beatLen, H) {
  const tell = t < m.fireAt;
  const top = 215;
  const bottom = 556;
  const half = 30;
  if (tell) {
    const k = clamp((t - m.born) / (m.fireAt - m.born), 0, 1);
    ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 24) ** 2 + 0.15 * k;
    ctx.fillStyle = m.color;
    ctx.fillRect(m.x - half, top, half * 2, bottom - top);
    ctx.globalAlpha = 0.5 + 0.4 * k;
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = top + ((t * 90) % 24); y < bottom; y += 24) {
      ctx.moveTo(m.x - half, y);
      ctx.lineTo(m.x + half, y - 14);
    }
    ctx.moveTo(m.x - half, top);
    ctx.lineTo(m.x - half, bottom);
    ctx.moveTo(m.x + half, top);
    ctx.lineTo(m.x + half, bottom);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = m.color;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', m.x, top + 24);
  } else {
    ctx.fillStyle = m.color;
    ctx.fillRect(m.x - half, top, half * 2, bottom - top);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(m.x - 12, top, 24, bottom - top);
  }
}

export function drawBossHud(ctx, h) {
  const { W, H, hp, maxHp, phase, accent, text, mode, introLeft, introTotal, dyingT, flash, roundRect } = h;
  const bx = 44;
  const bw = W - 88;
  const by = 36;
  ctx.fillStyle = '#0a0810';
  roundRect(ctx, bx - 2, by - 2, bw + 4, 12, 3);
  ctx.fill();
  const cols = ['#f59e0b', '#67e8f9', '#a3e635', '#ef4444'];
  const seg = bw / 4;
  for (let i = 0; i < 4; i++) {
    const filled = clamp((hp - (3 - i) * (maxHp / 4)) / (maxHp / 4), 0, 1);
    ctx.fillStyle = '#1f1a2b';
    ctx.fillRect(bx + i * seg + 1, by, seg - 2, 8);
    ctx.fillStyle = cols[i];
    ctx.fillRect(bx + i * seg + 1, by, (seg - 2) * filled, 8);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${text.name} · ${text.subtitle}`, W / 2, 584);

  if (mode === 'intro' || (phase === 0 && introLeft > 0)) {
    const a = clamp(introLeft / introTotal + 0.2, 0, 1);
    const p = text.phases[phase];
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 270, W, 70);
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(p.name, W / 2, 302);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px monospace';
    ctx.fillText(p.hint, W / 2, 324);
    ctx.globalAlpha = 1;
  }
  if (mode === 'dying') {
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px monospace';
    ctx.globalAlpha = clamp(dyingT * 3, 0, 1);
    ctx.fillText(text.dying, W / 2, 330);
    ctx.globalAlpha = 1;
  }
  if (flash > 0.01) {
    ctx.globalAlpha = clamp(flash, 0, 1) * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

export { PHASE_NAMES };
