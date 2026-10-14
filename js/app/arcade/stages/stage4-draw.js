import {
  W,
  H,
  GAP_W,
  PLANK_H,
  PLANK_Y0,
  PLANK_TELL,
  BOTTLE_IMPACT_R,
  BOTTLE_FLIGHT,
  SHARD_LIFE,
  PACK_FALL,
  GEYSER_W,
  GEYSER_UP,
  GEYSER_LIVE,
  CAP_R,
  LASER_LIVE,
  LASER_LEN,
  SHOCK_GAP,
  CRATES,
  bottlePos,
  shardPos,
  packPos,
  capPos,
  plankY,
  shockRadius,
  laserBeams
} from './stage4-hazards.js';

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
export function drawGlitch(ctx, t, barPulse, accent) {
  if (barPulse < 0.05) return;
  const n = Math.floor(t * 40);
  for (let i = 0; i < 5; i++) {
    const y = noise(n + i * 7) * H;
    const h = 2 + noise(n + i * 3) * 8;
    ctx.globalAlpha = barPulse * 0.4;
    ctx.fillStyle = i % 2 ? '#22d3ee' : '#ef4444';
    ctx.fillRect(0, y, W, h);
    ctx.fillStyle = '#000000';
    ctx.fillRect((noise(n + i) - 0.5) * 20, y + h, W, 1);
  }
  ctx.globalAlpha = barPulse * 0.5;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ef4444';
  ctx.strokeRect(-3 * barPulse, 0, W, H);
  ctx.strokeStyle = '#22d3ee';
  ctx.strokeRect(3 * barPulse, 0, W, H);
  ctx.globalAlpha = 1;
}

export function drawPillars(ctx, pillars, t) {
  for (const p of pillars) {
    const k = (t - p.t0) / p.life;
    if (k < 0 || k > 1) continue;
    const a = 1 - k;
    for (let i = 0; i < 6; i++) {
      const w = 3 + noise(i * 5 + p.x) * 14;
      const ox = (noise(i * 9 + p.x + Math.floor(t * 30)) - 0.5) * 46;
      ctx.globalAlpha = a * 0.75;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? p.color : '#ef4444';
      ctx.fillRect(p.x + ox - w / 2, 0, w, H * (0.35 + 0.65 * Math.min(1, k * 4)));
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
  const step = w / 12;
  for (let i = 0; i < 12; i++) {
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

export function drawHazard(ctx, h, t, ac) {
  switch (h.kind) {
    case 'plank': {
      const live = t >= h.liveAt;
      const y = plankY(h, t);
      const pulse = 0.5 + 0.5 * Math.sin(t * 14);
      // gruene SAFE-Spur durch die Luecke
      ctx.fillStyle = '#4ade80';
      ctx.globalAlpha = (live ? 0.08 : 0.14) + 0.07 * pulse;
      ctx.fillRect(h.gx, PLANK_Y0, GAP_W, 540 - PLANK_Y0);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(h.gx - 2, y - PLANK_H / 2, 2, PLANK_H);
      ctx.fillRect(h.gx + GAP_W, y - PLANK_H / 2, 2, PLANK_H);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(h.gx, PLANK_Y0);
      ctx.lineTo(h.gx, 540);
      ctx.moveTo(h.gx + GAP_W, PLANK_Y0);
      ctx.lineTo(h.gx + GAP_W, 540);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (y < 500) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SAFE', h.gx + GAP_W / 2, Math.max(y + 26, 400));
      }
      drawPlankSegment(ctx, 0, h.gx, y, t, !live);
      drawPlankSegment(ctx, h.gx + GAP_W, W, y, t, !live);
      break;
    }
    case 'bottle': {
      const u = clamp((t - h.throwAt) / BOTTLE_FLIGHT, 0, 1);
      if (t < h.landAt) {
        const warn = u > 0.5 ? 1 : 0.55;
        drawRing(ctx, h.tx, h.ty, BOTTLE_IMPACT_R, '#ef4444', warn, 2, [5, 4]);
        ctx.globalAlpha = 0.05 + 0.2 * u;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(h.tx, h.ty, BOTTLE_IMPACT_R, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        drawRing(ctx, h.tx, h.ty, BOTTLE_IMPACT_R * (1 - u), '#ffffff', 0.8, 2);
        const p = bottlePos(h, t);
        drawKornBottle(ctx, p.x, p.y, t * 9, 1.1);
      } else {
        const k = (t - h.landAt) / 0.3;
        if (k < 1) {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = '#fecaca';
          ctx.beginPath();
          ctx.arc(h.tx, h.ty, BOTTLE_IMPACT_R * (0.7 + 0.3 * k), 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (t < h.landAt + SHARD_LIFE) {
          const fade = clamp((h.landAt + SHARD_LIFE - t) / 0.4, 0, 1);
          for (let i = 0; i < 6; i++) {
            const s = shardPos(h, i, t);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(t * 5 + i);
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            for (let j = 0; j < 8; j++) {
              const rr = j % 2 ? 2.5 : 8;
              const a = (j * TAU) / 8;
              if (j === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
              else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(-1.5, -1.5, 3, 3);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }
      }
      break;
    }
    case 'pack': {
      const colors = ['#4ade80', '#fde047', '#f43f5e'];
      const col = colors[h.color % 3];
      const landed = t >= h.landAt;
      if (!landed) {
        drawRing(ctx, h.tx, h.ty + 10, 24, col, 0.7, 2, [4, 4]);
        const p = packPos(h, t);
        drawAhoiPack(ctx, p.x, p.y, t * 6, 1.2, col, t);
      } else if (t < h.fireAt) {
        const k = clamp((t - h.landAt) / (h.fireAt - h.landAt), 0, 1);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.18 + 0.2 * Math.sin(t * 22) ** 2;
        ctx.fillRect(h.tx - GEYSER_W, h.ty - GEYSER_UP, GEYSER_W * 2, GEYSER_UP + 22);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(h.tx, h.ty + 10, 24 + 4 * Math.sin(t * 20), 9, 0, 0, TAU);
        ctx.fill();
        for (let i = 0; i < 6; i++) {
          const by = h.ty + 8 - ((t * 60 + i * 25) % 40);
          ctx.fillRect(h.tx - 18 + i * 7, by, 3, 3);
        }
        ctx.globalAlpha = 1;
        drawRing(ctx, h.tx, h.ty + 10, 30 * (1 - k * 0.5), '#ffffff', 0.9, 2);
        dashedLine(ctx, h.tx - GEYSER_W, h.ty - GEYSER_UP, h.tx - GEYSER_W, h.ty + 20, col, 0.8);
        dashedLine(ctx, h.tx + GEYSER_W, h.ty - GEYSER_UP, h.tx + GEYSER_W, h.ty + 20, col, 0.8);
      } else if (t < h.fireAt + GEYSER_LIVE) {
        const k = (t - h.fireAt) / GEYSER_LIVE;
        const hgt = GEYSER_UP * Math.min(1, k * 5);
        ctx.fillStyle = col;
        ctx.fillRect(h.tx - GEYSER_W, h.ty + 22 - hgt, GEYSER_W * 2, hgt);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(h.tx - 6, h.ty + 22 - hgt, 12, hgt);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f9a8d4';
        for (let i = 0; i < 7; i++) {
          ctx.beginPath();
          ctx.arc(h.tx - 18 + i * 6, h.ty + 22 - hgt + Math.sin(t * 30 + i) * 4, 6 + (i % 3), 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    case 'cap': {
      if (t < h.launchAt) {
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 30) ** 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        for (let i = 0; i <= 18; i++) {
          const p = capPos(h, h.launchAt + i * 0.08);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        drawCrownCap(ctx, h.sx, h.sy, CAP_R + 2, t * 20, '#ef4444');
      } else {
        const p = capPos(h, t);
        drawCrownCap(ctx, p.x, p.y, CAP_R, t * 16, '#f59e0b');
      }
      break;
    }
    case 'laser': {
      const beams = laserBeams(h);
      if (t < h.fireAt) {
        const k = (t - h.tellAt) / (h.fireAt - h.tellAt);
        for (const b of beams) {
          dashedLine(ctx, b.x0, b.y0, b.x1, b.y1, '#ffffff', 0.35 + 0.5 * k, 1.5);
          drawRing(ctx, b.x0, b.y0, 6 + 10 * (1 - k), '#ef4444', 1, 2);
        }
      } else if (t < h.fireAt + LASER_LIVE) {
        const k = 1 - (t - h.fireAt) / LASER_LIVE;
        for (const b of beams) {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 22 * (0.5 + 0.5 * k);
          ctx.beginPath();
          ctx.moveTo(b.x0, b.y0);
          ctx.lineTo(b.x1, b.y1);
          ctx.stroke();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 15 * (0.5 + 0.5 * k);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5 * k + 1;
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }
      break;
    }
    case 'shock': {
      const gapA = h.ga - SHOCK_GAP;
      const gapB = h.ga + SHOCK_GAP;
      const r = t < h.startAt ? 22 + 4 * Math.sin(t * 40) : shockRadius(h, t);
      const live = t >= h.startAt;
      ctx.strokeStyle = live ? ac : '#ffffff';
      ctx.globalAlpha = live ? 1 : 0.6;
      ctx.lineWidth = live ? 12 : 3;
      ctx.beginPath();
      ctx.arc(h.cx, h.cy, r, gapB, gapA + TAU);
      ctx.stroke();
      if (live) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, r, gapB, gapA + TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // gruene Luecken-Markierung
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3;
      const rr = Math.min(r, 400);
      ctx.beginPath();
      ctx.moveTo(h.cx + Math.cos(gapA) * (rr - 14), h.cy + Math.sin(gapA) * (rr - 14));
      ctx.lineTo(h.cx + Math.cos(gapA) * (rr + 14), h.cy + Math.sin(gapA) * (rr + 14));
      ctx.moveTo(h.cx + Math.cos(gapB) * (rr - 14), h.cy + Math.sin(gapB) * (rr - 14));
      ctx.lineTo(h.cx + Math.cos(gapB) * (rr + 14), h.cy + Math.sin(gapB) * (rr + 14));
      ctx.stroke();
      break;
    }
    default:
  }
}

// Bier-Schaum mit Kisten-Inseln
export function drawFoam(ctx, level, t) {
  if (level >= H) return;
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, level, W, H - level);
  ctx.fillStyle = '#b45309';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, level + 6, W, H - level);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fbbf24';
  for (let x = 0; x <= W + 10; x += 12) {
    const r = 7 + 3 * Math.sin(t * 3 + x * 0.35);
    ctx.beginPath();
    ctx.arc(x, level + Math.sin(t * 2 + x * 0.2) * 3, r, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#fef3c7';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(10 + ((i * 53) % 340), level + 4 + ((t * 20 + i * 17) % 40), 3, 3);
  }
  for (const [x0, x1] of CRATES) {
    const y = level - 10;
    ctx.fillStyle = '#1a0f0b';
    ctx.fillRect(x0, y, x1 - x0, 46);
    ctx.fillStyle = '#3a2418';
    for (let x = x0 + 14; x < x1; x += 22) ctx.fillRect(x, y + 3, 2, 40);
    ctx.fillStyle = '#fbbf24';
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6);
    ctx.fillRect(x0, y, x1 - x0, 3);
    ctx.fillRect(x0, y + 43, x1 - x0, 3);
    ctx.fillRect(x0, y, 3, 46);
    ctx.fillRect(x1 - 3, y, 3, 46);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- HUD / Effekte

export function drawCapsule(ctx, c, t) {
  const left = c.life;
  if (left < 1.2 && Math.floor(t * 12) % 2) return;
  const bob = Math.sin(t * 5 + c.x) * 3;
  drawRing(ctx, c.x, c.y + bob, 18 + 3 * Math.sin(t * 8), '#fde047', 0.6, 2);
  drawCrownCap(ctx, c.x, c.y + bob, 11, t * 3, '#fde047');
  ctx.fillStyle = '#fde047';
  ctx.fillRect(c.x - 1, c.y + bob - 5, 2, 10);
  ctx.beginPath();
  ctx.moveTo(c.x - 4, c.y + bob - 2);
  ctx.lineTo(c.x, c.y + bob - 7);
  ctx.lineTo(c.x + 4, c.y + bob - 2);
  ctx.fill();
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
