import { clamp, roundRect } from './stage-utils.js';

const THEMES = [
  { title: '01 / IGNITION', accent: [245, 158, 11], secondary: '#22d3ee', dark: '#281506' },
  { title: '02 / PRESSURE CHAMBER', accent: [168, 85, 247], secondary: '#22d3ee', dark: '#1c0c2e' },
  { title: '03 / REACTOR BREACH', accent: [244, 63, 94], secondary: '#fb923c', dark: '#2e0b17' }
];
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const backgrounds = new WeakMap();

function drawStaticBackground(ctx, W, H, theme) {
  const bg = ctx.createLinearGradient(0, 64, 0, H - 42);
  bg.addColorStop(0, theme.dark);
  bg.addColorStop(0.45, '#030914');
  bg.addColorStop(1, theme.dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(theme.accent, 0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 110; y < H - 70; y += 58) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

function getBackground(ctx, W, H, tier) {
  // Node-Tests haben kein Canvas-DOM; dort wird derselbe Zeichenpfad direkt ausgefuehrt.
  if (typeof document === 'undefined') return null;
  let cache = backgrounds.get(ctx);
  const resolution = Math.max(1, Math.min(2, Math.abs(ctx.getTransform().a)));
  if (!cache || cache.W !== W || cache.H !== H || cache.resolution !== resolution) {
    cache = { W, H, resolution, layers: [] };
    backgrounds.set(ctx, cache);
  }
  if (!cache.layers[tier]) {
    const makeCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(W * resolution);
      canvas.height = Math.ceil(H * resolution);
      const context = canvas.getContext('2d');
      context.scale(resolution, resolution);
      return { canvas, context };
    };
    const base = makeCanvas();
    drawStaticBackground(base.context, W, H, THEMES[tier]);
    const glow = base.context.createRadialGradient(W * 0.8, H / 2, 10, W * 0.8, H / 2, H * 0.65);
    glow.addColorStop(0, rgba(THEMES[tier].accent, 0.13));
    glow.addColorStop(1, rgba(THEMES[tier].accent, 0));
    base.context.fillStyle = glow;
    base.context.fillRect(0, 64, W, H - 106);
    cache.layers[tier] = base.canvas;
  }
  return cache.layers[tier];
}

function label(ctx, text, x, y, size, color, align = 'left') {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawWall(ctx, x, from, to, width, tip, theme, top) {
  if (to <= from) return;
  const bevel = Math.min(8, width / 4);
  ctx.fillStyle = theme.dark;
  ctx.strokeStyle = rgba(theme.accent, 0.75);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + bevel, from);
  ctx.lineTo(x + width - bevel, from);
  ctx.lineTo(x + width, from + bevel);
  ctx.lineTo(x + width, to - bevel);
  ctx.lineTo(x + width - bevel, to);
  ctx.lineTo(x + bevel, to);
  ctx.lineTo(x, to - bevel);
  ctx.lineTo(x, from + bevel);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rgba(theme.accent, 0.14);
  for (let y = from + 16; y < to - 10; y += 26) ctx.fillRect(x + 8, y, width - 16, 9);
  ctx.strokeStyle = 'rgba(226,232,240,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 5, from + 10);
  ctx.lineTo(x + 5, to - 10);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x - 3, tip + (top ? -8 : 2), width + 6, 6);
  ctx.fillStyle = '#0f172a';
  for (let k = 1; k < width; k += 10) ctx.fillRect(x + k, tip + (top ? -8 : 2), 4, 6);
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgba(theme.accent);
  ctx.fillRect(x - 2, tip + (top ? -2 : 0), width + 4, 2);
  ctx.shadowBlur = 0;
}

function drawGate(ctx, gate, c, theme, W, H) {
  const g = c.geometry(gate);
  if (g.x > W + gate.w || g.x + gate.w < -10) return;
  ctx.save();
  const anticipation = gate.arrival - c.position;
  const locked = anticipation <= 1;
  if (gate.wall !== 'bottom') drawWall(ctx, g.x, 64, g.top, gate.w, g.top, theme, true);
  if (gate.wall !== 'top') drawWall(ctx, g.x, g.bottom, H - 42, gate.w, g.bottom, theme, false);
  const cx = g.x + gate.w / 2;
  if (gate.kind === 'piston') {
    const from = gate.wall === 'top' ? 74 : g.bottom + 12;
    const to = gate.wall === 'top' ? g.top - 12 : H - 52;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 4, from, 8, Math.max(0, to - from));
  }
  if (!locked && ['shutter', 'final', 'piston'].includes(gate.kind)) {
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 1;
    if (gate.kind === 'piston') {
      const tip = gate.center + (gate.wall === 'top' ? -gate.gap / 2 : gate.gap / 2);
      ctx.strokeRect(
        g.x - 5,
        gate.wall === 'top' ? 64 : tip,
        gate.w + 10,
        gate.wall === 'top' ? tip - 64 : H - 42 - tip
      );
    } else ctx.strokeRect(g.x - 5, gate.center - gate.gap / 2, gate.w + 10, gate.gap);
    ctx.setLineDash([]);
    label(ctx, gate.kind === 'piston' ? 'PISTON' : 'LOCK', cx, g.top - 18, 8, '#fda4af', 'center');
  }
  if (gate.kind === 'travel') {
    ctx.strokeStyle = '#67e8f9';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, gate.center - Math.abs(gate.travel));
    ctx.lineTo(cx, gate.center + Math.abs(gate.travel));
    ctx.stroke();
    ctx.setLineDash([]);
    label(
      ctx,
      gate.travel > 0 ? 'FOLLOW / DOWN' : 'FOLLOW / UP',
      cx,
      g.top - 18,
      8,
      '#67e8f9',
      'center'
    );
  }
  if (gate.kind === 'fork') {
    ctx.save();
    ctx.translate(cx, gate.center);
    ctx.rotate((c.position * Math.PI) / 2);
    ctx.fillStyle = '#450a1a';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fecdd3';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  if (!gate.passed) {
    const ry = gate.kind === 'fork' ? gate.ringY : g.center;
    ctx.strokeStyle = gate.kind === 'final' ? '#ecfeff' : '#fde68a';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65 + Math.max(0, 1 - c.beat.beatPhase * 4) * 0.3;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      ry,
      gate.kind === 'final' ? 13 : 7,
      gate.kind === 'final' ? 25 : 14,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.moveTo(g.x - 13, ry - 4);
    ctx.lineTo(g.x - 8, ry);
    ctx.lineTo(g.x - 13, ry + 4);
    ctx.strokeStyle = theme.secondary;
    ctx.stroke();
    if (gate.kind === 'fork') {
      ctx.strokeStyle = 'rgba(103,232,249,0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, gate.center - gate.side * 64, 7, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (gate.kind === 'final') {
    label(ctx, 'EXIT', cx, g.top - 24, 12, '#ecfeff', 'center');
    label(ctx, 'FINAL LOCK', cx, g.bottom + 25, 9, '#fda4af', 'center');
  }
  ctx.restore();
}

export function drawFlightScene(ctx, engine, c) {
  const { W, H } = engine;
  const tier = c.section.tier;
  const theme = THEMES[tier];
  const accent = rgba(theme.accent);
  const pulse = Math.max(0, 1 - c.beat.beatPhase * 4);
  const bass = c.beat.bassEnergy || 0;
  const scroll = c.scroll;
  ctx.save();
  const cached = getBackground(ctx, W, H, tier);
  if (cached) {
    ctx.drawImage(cached, 0, 0, W, H);
  } else {
    drawStaticBackground(ctx, W, H, theme);
  }
  ctx.fillStyle = rgba(theme.accent, bass * 0.025 + c.flash * 0.04);
  ctx.fillRect(0, 64, W, H - 106);

  // Tiefe im Flugschacht: entfernte Maschinen, Schienen und schnelle Randsegmente.
  const parallax = (scroll * 0.22) % 100;
  for (let x = -parallax; x < W + 100; x += 100) {
    ctx.fillStyle = 'rgba(20,32,51,0.45)';
    ctx.fillRect(x, 105, 64, H - 190);
    ctx.strokeStyle = rgba(theme.accent, 0.1);
    ctx.strokeRect(x + 6, 115, 52, H - 210);
    ctx.fillStyle = rgba(theme.accent, 0.14 + pulse * 0.1);
    for (let y = 128; y < H - 95; y += 48) ctx.fillRect(x + 14, y, 6, 3);
  }
  label(
    ctx,
    tier === 2 ? 'CONTAINMENT LOST' : 'FIECH AIRWAYS',
    W / 2,
    H * 0.5,
    24,
    rgba(theme.accent, 0.055),
    'center'
  );

  for (const gate of c.gates) drawGate(ctx, gate, c, theme, W, H);
  for (const d of c.debris) {
    if (d.x < -30 || d.x > W + 30) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate((c.position - d.arrival) * 1.5 * d.side);
    ctx.scale(d.radius / 19, d.radius / 19);
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, -10);
    ctx.lineTo(0, -21);
    ctx.lineTo(20, -5);
    ctx.lineTo(14, 18);
    ctx.lineTo(-14, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }
  const activeLasers = c.lasers.filter((l) => l.phase !== 'idle');
  const laser = activeLasers.find((l) => l.phase === 'fire') ?? activeLasers[0];
  for (const beam of activeLasers) {
    const laser = beam;
    const firing = laser.phase === 'fire';
    ctx.fillStyle = firing ? 'rgba(244,63,94,0.28)' : 'rgba(244,63,94,0.06)';
    ctx.fillRect(0, laser.y - laser.halfWidth, W, laser.halfWidth * 2);
    ctx.strokeStyle = firing ? '#fb7185' : 'rgba(251,113,133,0.75)';
    ctx.lineWidth = firing ? laser.halfWidth * 2 : 1;
    ctx.setLineDash(firing ? [] : [7, 6]);
    ctx.beginPath();
    ctx.moveTo(0, laser.y);
    ctx.lineTo(W, laser.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (firing) {
      ctx.strokeStyle = '#fff1f2';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      label(
        ctx,
        laser.echoOf !== undefined
          ? 'NACHSCHUSS / RICHTUNG WECHSELN!'
          : laser.locked
            ? 'LOCKED / AUSWEICHEN!'
            : 'ZIELSUCHE / SCHUSS ANLOCKEN',
        W / 2,
        laser.y - 23,
        9,
        '#fda4af',
        'center'
      );
      label(
        ctx,
        `${Math.ceil((laser.fireBeat - c.position) * 10) / 10} BEATS`,
        W / 2,
        laser.y + 23,
        9,
        '#fda4af',
        'center'
      );
    }
  }
  for (const p of c.trail) {
    ctx.globalAlpha = (p.life / 0.45) * 0.6;
    ctx.fillStyle = c.beat.bassEnergy > 0.65 ? '#ecfeff' : theme.secondary;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1 + p.life * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of c.particles) {
    ctx.globalAlpha = p.life * 2;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.globalAlpha = 1;
  for (const r of c.rings) {
    ctx.strokeStyle = r.perfect ? '#fde68a' : theme.secondary;
    ctx.globalAlpha = r.life / 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12 + (1 - r.life / 0.45) * 35, 0, Math.PI * 2);
    ctx.stroke();
    if (r.perfect)
      label(ctx, 'PERFECT', r.x, r.y - 30 - (0.45 - r.life) * 20, 9, '#fde68a', 'center');
  }
  ctx.globalAlpha = 1;
  engine.drawPlayer(ctx, c.player.x, c.player.y, 32, {
    mode: 'rocket',
    tilt: clamp(c.player.vy / 330, -0.5, 0.5),
    thrust: engine.held ? 1 : 0.25,
    beatPhase: c.beat.beatPhase,
    accent
  });

  const escaped = c.position > c.totalBeats - 0.5;
  const fiechY = laser ? laser.y : 99 + Math.sin((c.position * Math.PI) / 4) * 8;
  const fiechX = W - 36 + (escaped ? (c.position - (c.totalBeats - 0.5)) * 180 : 0);
  const target = c.gates.find((g) => g.arrival > c.position && g.arrival - c.position <= 2.5);
  if (!laser && c.action > 0 && target) {
    const g = c.geometry(target);
    ctx.strokeStyle = rgba(theme.accent, c.action * 1.6);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(W - 36, fiechY + 22);
    ctx.lineTo(g.x + target.w / 2, g.top - 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  engine.drawFiech(ctx, fiechX, fiechY, 42, {
    beatPhase: c.beat.beatPhase,
    bassEnergy: bass,
    action: laser ? 'laser' : c.action > 0 ? 'slam' : c.hitFlash > 0 ? 'laugh' : 'hover',
    lookAtX: c.player.x,
    lookAtY: c.player.y,
    tilt: c.action > 0 ? -0.18 : Math.sin(c.position) * 0.04,
    squashY: c.action > 0 ? 0.87 : 1
  });

  ctx.fillStyle = '#07111d';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillRect(0, H - 42, W, 42);
  ctx.strokeStyle = rgba(theme.accent, 0.5 + pulse * 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(W, 64);
  ctx.moveTo(0, H - 42);
  ctx.lineTo(W, H - 42);
  ctx.stroke();
  const rails = scroll % 36;
  ctx.fillStyle = rgba(theme.accent, 0.55);
  for (let x = -rails; x < W; x += 36) {
    ctx.fillRect(x, 58, 18, 3);
    ctx.fillRect(x, H - 40, 18, 3);
  }
  label(ctx, theme.title, 12, 17, 11, accent);
  label(ctx, c.section.name, 12, 37, 9, '#cbd5e1');
  label(ctx, 'AIRWAYS // 02', W - 12, 17, 8, '#94a3b8', 'right');
  label(
    ctx,
    c.combo > 1 ? `CHAIN x${c.combo}` : 'HOLD = BOOST',
    W - 12,
    52,
    8,
    c.combo > 1 ? '#fde68a' : '#94a3b8',
    'right'
  );
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle =
      i === ((Math.floor(c.position) % 4) + 4) % 4 ? '#ecfeff' : rgba(theme.accent, 0.25);
    ctx.fillRect(12 + i * 14, 49, 9, 4);
  }
  label(
    ctx,
    `${Math.min(c.totalBeats, Math.max(0, Math.floor(c.position)))}/${c.totalBeats} BEATS`,
    12,
    H - 18,
    10,
    '#cbd5e1'
  );
  label(ctx, `CLEAN ${c.clean}/${c.gates.length}`, W - 12, H - 18, 10, '#cbd5e1', 'right');
  const barWidth = 100;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(W / 2 - barWidth / 2, H - 22, barWidth, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - barWidth / 2, H - 22, barWidth * clamp(c.position / c.totalBeats, 0, 1), 6);

  if (c.position < 2) {
    ctx.fillStyle = 'rgba(3,9,20,0.8)';
    roundRect(ctx, 24, H / 2 + 62, W - 48, 55, 8);
    ctx.fill();
    label(ctx, 'HALTEN = SCHUB / LOSLASSEN = SINKEN', W / 2, H / 2 + 80, 9, '#ecfeff', 'center');
    label(ctx, 'GOLDENE RINGE = PERFECT BONUS', W / 2, H / 2 + 100, 8, '#fde68a', 'center');
  } else if (c.announcement > 0) {
    label(ctx, c.section.name, W / 2, H - 63, 10, accent, 'center');
  }
  if (escaped) {
    label(ctx, 'PURSUIT LOST', W / 2, 155, 17, '#ecfeff', 'center');
    label(ctx, 'DU BIST DURCH!', W / 2, 178, 10, theme.secondary, 'center');
  }
  if (c.hitFlash > 0) {
    ctx.strokeStyle = `rgba(251,113,133,${c.hitFlash})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 67, W - 6, H - 112);
  }
  ctx.restore();
}
