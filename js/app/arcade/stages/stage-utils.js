import { drawFiech as rigDrawFiech } from '../fiech-rig.js';

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Bewegt eine X-Position per Pfeiltasten/A-D oder Touch-/Maus-Drag.
export function moveX(engine, x, speed, dt, min, max) {
  const { keys, pointer } = engine;
  let nx = x;
  if (keys.has('arrowleft') || keys.has('a')) nx -= speed * dt;
  if (keys.has('arrowright') || keys.has('d')) nx += speed * dt;
  if (pointer.down) nx += (pointer.x - nx) * Math.min(1, dt * 18);
  return clamp(nx, min, max);
}

export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function glowText(ctx, text, x, y, size, color) {
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Kompatibilitäts-Wrapper für Stages 2-5 (alte Signatur) auf den neuen Fiech-Rig.
export function drawFiech(ctx, x, y, width, height, beatPhase = 1, mood = 'normal') {
  const hurt = mood === 'hurt';
  rigDrawFiech(ctx, x, y, width, {
    beatPhase,
    action: hurt ? 'laugh' : 'hover',
    tilt: hurt ? Math.sin(performance.now() / 25) * 0.12 : 0,
    squashY: hurt ? 0.92 : 1
  });
}

// Beat-Info mit Notlauf: laeuft die Audio-Uhr nicht, tickt ein eigener 105-BPM-Takt.
export function createBeatSource(fallbackBpm = 105) {
  const fb = { t: 0, index: 0 };
  return (beat, dt) => {
    if (beat?.running) return beat;
    fb.t += dt;
    const len = 60 / fallbackBpm;
    const idx = Math.floor(fb.t / len);
    const isBeat = idx !== fb.index;
    fb.index = idx;
    return { bpm: fallbackBpm, beatIndex: idx, beatPhase: (fb.t % len) / len, isBeat, bassEnergy: 0, running: false };
  };
}
