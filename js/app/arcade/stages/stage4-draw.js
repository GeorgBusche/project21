const W = 360;
const H = 600;
const TAU = Math.PI * 2;
const noise = (n) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- Kulisse

// DARK INDUSTRIAL TRESEN-BUNKER: Reaktorschwarz, Blutnebel, pulsierende Traeger, Fluessigkeitstanks
export function drawBackground(ctx, s) {
  const { t, beat, accent, barPulse } = s;
  const pulse = 1 - beat.beatPhase;
  ctx.fillStyle = '#030306';
  ctx.fillRect(0, 0, W, H);

  // blutroter Volumen-Nebel
  ctx.fillStyle = '#7f1d1d';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.05 + 0.025 * Math.sin(t * 0.7 + i);
    ctx.beginPath();
    ctx.arc(60 + ((i * 97 + t * (6 + i * 2)) % 300), 120 + i * 62 + Math.sin(t * 0.5 + i * 2) * 20, 90 + i * 12, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 0.05 + 0.06 * pulse + 0.1 * barPulse;
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.arc(W / 2, 130, 170, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Fluessigkeitstanks im Hintergrund
  for (const [tx, ty, tw, th, lv] of [[10, 170, 38, 210, 0], [62, 230, 26, 150, 1], [312, 170, 38, 210, 2], [272, 230, 26, 150, 3]]) {
    ctx.fillStyle = '#07070d';
    ctx.fillRect(tx, ty, tw, th);
    const level = 0.45 + 0.2 * Math.sin(t * 0.8 + lv * 1.7);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.22 + 0.1 * pulse;
    ctx.fillRect(tx + 2, ty + th * (1 - level), tw - 4, th * level - 2);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(tx + 2, ty + th * (1 - level), tw - 4, 2);
    ctx.globalAlpha = 0.35;
    for (let b = 0; b < 4; b++) {
      const by = ty + th - ((t * (18 + b * 7) + b * 41 + lv * 13) % (th * level));
      ctx.fillRect(tx + 6 + ((b * 11 + lv * 5) % (tw - 12)), by, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1f2433';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tw, th);
    ctx.fillStyle = '#2a2f40';
    ctx.fillRect(tx - 2, ty - 5, tw + 4, 5);
    ctx.fillRect(tx - 2, ty + th, tw + 4, 5);
  }

  // Stahltraeger, im Bass pulsierend
  const steel = pulse > 0.5 ? '#2c3044' : '#1c1f2e';
  ctx.fillStyle = steel;
  ctx.fillRect(0, 0, W, 16);
  ctx.fillRect(0, 16, 14, 540);
  ctx.fillRect(W - 14, 16, 14, 540);
  ctx.fillRect(0, 300, W, 4);
  ctx.strokeStyle = '#141624';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < W; x += 36) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 18, 16);
    ctx.lineTo(x + 36, 0);
  }
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.globalAlpha = 0.35 + 0.5 * pulse;
  ctx.fillRect(0, 16, W, 2);
  ctx.fillRect(14, 300, W - 28, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.6;
  for (let y = 40; y < 556; y += 44) {
    ctx.fillRect(5, y, 4, 4);
    ctx.fillRect(W - 9, y, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Arena-Boden: Raster und Neon-Reling
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.045;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 312; y <= 540; y += 36) {
    ctx.moveTo(14, y);
    ctx.lineTo(W - 14, y);
  }
  for (let x = 36; x < W - 14; x += 36) {
    ctx.moveTo(x, 304);
    ctx.lineTo(x, 540);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 548, W, H - 548);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.5 + 0.4 * pulse;
  ctx.fillRect(0, 548, W, 2);
  ctx.globalAlpha = 1;
}

// Chromatische Aberration + Scanline-Glitches auf jedem 4. Beat
// Taktpuls: dezente Eck-Brackets und kurze Scanline-Blitze nahe der Latte statt Vollbild-Streifen
export function drawGlitch(ctx, t, barPulse, accent) {
  if (barPulse < 0.05) return;
  const n = Math.floor(t * 30);
  ctx.globalAlpha = barPulse * 0.7;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  const m = 6 + (1 - barPulse) * 10;
  const L = 26;
  for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * L);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * L, cy);
    ctx.stroke();
  }
  ctx.globalAlpha = barPulse * 0.5;
  for (let i = 0; i < 3; i++) {
    const x = noise(n + i * 11) * (W - 60);
    const y = 100 + noise(n + i * 5) * 380;
    ctx.fillStyle = i % 2 ? '#22d3ee' : '#ef4444';
    ctx.fillRect(x, y, 24 + noise(n + i) * 40, 2);
  }
  ctx.globalAlpha = 1;
}

// Teleport im SUDO-Stil: Ring-Schockwelle, Pixel-Zerfall und Daten-Bloecke um den Punkt
export function drawPillars(ctx, pillars, t) {
  for (const p of pillars) {
    const k = (t - p.t0) / p.life;
    if (k < 0 || k > 1) continue;
    const a = 1 - k;
    const cy = p.y ?? 130;
    drawRing(ctx, p.x, cy, 20 + k * 90, p.color, a * 0.9, 3);
    drawRing(ctx, p.x, cy, 10 + k * 56, '#ffffff', a * 0.7, 2, [6, 5]);
    const f = Math.floor(t * 24);
    for (let i = 0; i < 18; i++) {
      const ang = noise(i * 7 + p.x) * TAU;
      const d = (14 + noise(i * 3 + p.x) * 60) * (0.3 + k);
      const sz = 3 + Math.floor(noise(i + f * 0.2) * 7);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? p.color : '#ef4444';
      ctx.fillRect(p.x + Math.cos(ang) * d - sz / 2, cy + Math.sin(ang) * d * 0.8 - sz / 2, sz, sz);
    }
    // horizontale Daten-Schnitte durch das Fiech
    for (let i = 0; i < 4; i++) {
      const yy = cy - 40 + noise(i * 13 + f) * 80;
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = i % 2 ? p.color : '#ffffff';
      ctx.fillRect(p.x - 40 + (noise(i + f) - 0.5) * 20, yy, 80 * (0.4 + 0.6 * a), 2);
    }
  }
  ctx.globalAlpha = 1;
}
// ---------------------------------------------------------------- Party-Waffen

// Schnapslatte: dunkles Brett, Neon-Kante, 12 Pinnchen als Lebensbalken
export function drawSchnapslatte(ctx, x, y, w, s) {
  const { alive, partial, accent, t, flash, broken } = s;
  const x0 = x - w / 2;
  ctx.fillStyle = '#120a0a';
  ctx.fillRect(x0, y, w, 14);
  ctx.fillStyle = '#2a1a12';
  ctx.fillRect(x0, y, w, 4);
  ctx.fillStyle = '#17171f';
  ctx.fillRect(x0 - 6, y - 2, 6, 18);
  ctx.fillRect(x0 + w, y - 2, 6, 18);
  ctx.fillStyle = '#ef4444';
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 8);
  ctx.fillRect(x0, y + 14, w, 2);
  ctx.fillRect(x0, y - 1, w, 1);
  ctx.globalAlpha = 1;
  const count = s.count ?? 12;
  const step = w / count;
  for (let i = 0; i < count; i++) {
    const gx = x0 + step * (i + 0.5);
    const gy = y - 2;
    if (i < alive) {
      const top = i === alive - 1;
      const col = i % 2 ? '#22d3ee' : '#fbbf24';
      const lvl = top ? 0.25 + 0.75 * partial : 1;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(gx - 11, gy - 24, 22, 24);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy - 20);
      ctx.lineTo(gx + 7, gy - 20);
      ctx.lineTo(gx + 5, gy);
      ctx.lineTo(gx - 5, gy);
      ctx.closePath();
      ctx.fillStyle = '#0b1220';
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(gx - 6 + 0.6 * (1 - lvl) * 20 * 0.1, gy - 20 * lvl);
      ctx.lineTo(gx + 6 - 0.6 * (1 - lvl) * 2, gy - 20 * lvl);
      ctx.lineTo(gx + 5, gy);
      ctx.lineTo(gx - 5, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5 + (top ? flash * 0.5 : 0);
      ctx.fillRect(gx - 4, gy - 17, 2, 10);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy - 20);
      ctx.lineTo(gx - 5, gy);
      ctx.lineTo(gx + 5, gy);
      ctx.lineTo(gx + 7, gy - 20);
      ctx.stroke();
    } else {
      const age = broken[i] ? 1 : 0;
      if (!age) continue;
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(gx - 6, gy);
      ctx.lineTo(gx - 4, gy - 9);
      ctx.lineTo(gx - 1, gy - 3);
      ctx.lineTo(gx + 1, gy - 11);
      ctx.lineTo(gx + 3, gy - 4);
      ctx.lineTo(gx + 6, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(gx - 3, gy - 1, 6, 1);
      ctx.globalAlpha = 1;
    }
  }
}

export function drawKornBottle(ctx, x, y, rot, scale, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  const glow = o.glow || 0;
  if (glow > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.globalAlpha = 0.25 * glow;
    ctx.fillRect(-12, -22, 24, 44);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(-3, -20);
  ctx.lineTo(3, -20);
  ctx.lineTo(3, -12);
  ctx.lineTo(8, -7);
  ctx.lineTo(8, 17);
  ctx.lineTo(-8, 17);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-3, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-8, 6, 16, 11);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-4, -23, 8, 4);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-8, -4, 16, 10);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(-8, -4, 16, 1.5);
  ctx.fillRect(-8, 4.5, 16, 1.5);
  if (scale >= 1.2) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KORN // 38%', 0, 2);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -1, 10, 2);
  }
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.45;
  ctx.fillRect(-6, -6, 2, 20);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawAhoiPack(ctx, x, y, rot, scale, color, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(-8 + i * 3.2 + 1.6, -13);
    ctx.lineTo(-8 + (i + 1) * 3.2, -11);
  }
  ctx.lineTo(8, 11);
  ctx.lineTo(-8, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#052e16';
  ctx.fillRect(-8, -3, 16, 9);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-6, -1, 12, 5);
  ctx.fillStyle = '#052e16';
  ctx.fillRect(-4, 0, 2, 3);
  ctx.fillRect(-1, 0, 2, 3);
  ctx.fillRect(2, 0, 2, 3);
  ctx.restore();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = t * 6 + i * 1.7;
    ctx.fillRect(x + Math.cos(a) * 14 * scale, y + Math.sin(a * 1.3) * 14 * scale, 2, 2);
  }
}

export function drawCrownCap(ctx, x, y, r, rot, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i * TAU) / 36;
    const rr = i % 2 ? r * 0.82 : r * 1.1;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#9ca3af';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = glow;
  ctx.stroke();
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- Boss

export function drawBossAura(ctx, x, y, t, accent, intensity, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.3 + 0.25 * intensity;
  ctx.fillStyle = dark;
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9 + t * 0.6;
    const len = 62 + 20 * Math.sin(t * 5 + i * 1.9) + 18 * intensity;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.18) * 44, Math.sin(a - 0.18) * 44);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a + 0.18) * 44, Math.sin(a + 0.18) * 44);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accent;
  for (let i = 0; i < 5; i++) {
    const gy = -50 + noise(i * 3 + Math.floor(t * 12)) * 100;
    const gx = (noise(i * 7 + Math.floor(t * 9)) - 0.5) * 110;
    ctx.fillRect(gx, gy, 6 + noise(i) * 18, 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Zapfhahn-Kanone: Cyber-Flasche mit Hahn, laedt sich vor Angriffen auf
export function drawCannon(ctx, x, y, side, t, accent, charge) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3 + side) * 3);
  ctx.scale(side, 1);
  drawKornBottle(ctx, 0, 0, 0.25, 1.35, { glow: charge });
  ctx.fillStyle = '#334155';
  ctx.fillRect(10, 14, 16, 5);
  ctx.fillRect(22, 14, 4, 14);
  ctx.fillStyle = charge > 0.5 ? '#ffffff' : accent;
  ctx.fillRect(21, 28, 6, 3 + charge * 6);
  ctx.restore();
}

export function drawRing(ctx, x, y, r, color, alpha, width = 3, dash = null) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Gefahren

function dashedLine(ctx, x0, y0, x1, y1, color, alpha, width = 2) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawPlankSegment(ctx, x0, x1, y, t, ghost) {
  if (x1 - x0 < 2) return;
  ctx.globalAlpha = ghost ? 0.4 : 1;
  ctx.fillStyle = '#1a0f0b';
  ctx.fillRect(x0, y - PLANK_H / 2, x1 - x0, PLANK_H);
  ctx.fillStyle = '#3a2418';
  ctx.fillRect(x0, y - PLANK_H / 2, x1 - x0, 4);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x0, y - PLANK_H / 2, x1 - x0, 2);
  ctx.fillRect(x0, y + PLANK_H / 2 - 2, x1 - x0, 2);
  for (let gx = x0 + 14; gx < x1 - 8; gx += 34) {
    ctx.fillStyle = (gx / 34) % 2 > 1 ? '#22d3ee' : '#fbbf24';
    ctx.fillRect(gx - 4, y - 5, 8, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx - 3, y - 4, 1, 5);
  }
  ctx.globalAlpha = 1;
}

export function drawCallout(ctx, text, color, k) {
  if (k <= 0) return;
  const a = clamp(k * 3, 0, 1);
  const sc = 1 + (1 - clamp((1 - k) * 6, 0, 1)) * 0.25;
  ctx.save();
  ctx.translate(W / 2, 232);
  ctx.scale(sc, sc);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px monospace';
  ctx.globalAlpha = a * 0.7;
  ctx.fillStyle = '#22d3ee';
  ctx.fillText(text, -2, 0);
  ctx.fillStyle = '#ef4444';
  ctx.fillText(text, 2, 1);
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawBanner(ctx, phase, text, accent, k) {
  if (k <= 0) return;
  const a = clamp(Math.min(k * 4, (1 - k) * 4 + 0.5), 0, 1);
  const p = text.phases[phase];
  ctx.globalAlpha = a * 0.85;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 262, W, 66);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 262, W, 2);
  ctx.fillRect(0, 326, W, 2);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px monospace';
  ctx.fillStyle = accent;
  ctx.fillText(p.name, W / 2 + (noise(Math.floor(k * 30)) > 0.85 ? 3 : 0), 292);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(p.hint, W / 2, 313);
  ctx.globalAlpha = 1;
}
