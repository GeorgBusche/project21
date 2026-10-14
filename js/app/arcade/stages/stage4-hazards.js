// Stage 4: reine Geometrie der Boss-Angriffe. Alles ist eine Funktion der Zeit,
// damit Zeichnen, Treffertest und der Test-Bot dieselben Positionen nutzen.
export const W = 360;
export const H = 600;
export const R = 8; // Radius der Spieler-Hitbox

export const GAP_W = 68;
export const PLANK_H = 22;
export const PLANK_Y0 = 96;
export const PLANK_VY = 235;
export const PLANK_TELL = 0.55;

export const BOTTLE_FLIGHT = 0.95;
export const BOTTLE_IMPACT_R = 34;
export const SHARD_SPEED = 70;
export const SHARD_LIFE = 1.8;

export const PACK_FALL = 0.55;
export const BREW = 0.5;
export const GEYSER_LIVE = 0.5;
export const GEYSER_W = 22;
export const GEYSER_UP = 210;

export const CAP_SPEED = 205;
export const CAP_TELL = 0.5;
export const CAP_R = 11;

export const LASER_TELL = 0.55;
export const LASER_LIVE = 0.35;
export const LASER_LEN = 900;

export const SHOCK_CHARGE = 0.5;
export const SHOCK_SPEED = 150;
export const SHOCK_GAP = 0.6; // Halbwinkel der sicheren Luecke

export const CRATES = [
  [20, 104],
  [138, 222],
  [256, 340]
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;

export function plankY(h, t) {
  return t < h.liveAt ? PLANK_Y0 : PLANK_Y0 + PLANK_VY * (t - h.liveAt);
}

export function bottlePos(h, t) {
  const u = clamp01((t - h.throwAt) / BOTTLE_FLIGHT);
  return { x: lerp(h.sx, h.tx, u), y: lerp(h.sy, h.ty, u) - 80 * Math.sin(Math.PI * u), u };
}

export function shardPos(h, k, t) {
  const a = h.rot + (k * Math.PI) / 3;
  const d = BOTTLE_IMPACT_R * 0.5 + SHARD_SPEED * (t - h.landAt);
  return { x: h.tx + Math.cos(a) * d, y: h.ty + Math.sin(a) * d };
}

export function packPos(h, t) {
  const u = clamp01((t - h.throwAt) / PACK_FALL);
  return { x: lerp(h.sx, h.tx, u), y: lerp(h.sy, h.ty, u) - 40 * Math.sin(Math.PI * u), u };
}

// Kronkorken springen an den Seitenwaenden zurueck (Dreieckswelle)
export function capPos(h, t) {
  const tau = Math.max(0, t - h.launchAt);
  const span = W - 2 * CAP_R;
  const period = 2 * span;
  let u = (h.sx - CAP_R + h.vx * tau) % period;
  if (u < 0) u += period;
  return { x: CAP_R + (u <= span ? u : period - u), y: h.sy + h.vy * tau };
}

export function laserBeams(h) {
  return h.beams.map((b) => ({
    x0: b.ox,
    y0: b.oy,
    x1: b.ox + Math.cos(b.ang) * LASER_LEN,
    y1: b.oy + Math.sin(b.ang) * LASER_LEN
  }));
}

export function shockRadius(h, t) {
  return 20 + SHOCK_SPEED * Math.max(0, t - h.startAt);
}

function segDist(px, py, s) {
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  const u = clamp01(((px - s.x0) * dx + (py - s.y0) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (s.x0 + dx * u), py - (s.y0 + dy * u));
}

function angDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function hazardDone(h, t) {
  switch (h.kind) {
    case 'plank':
      return plankY(h, t) > H + PLANK_H;
    case 'bottle':
      return t > h.landAt + SHARD_LIFE;
    case 'pack':
      return t > h.fireAt + GEYSER_LIVE;
    case 'cap':
      return t > h.launchAt && capPos(h, t).y > H + 30;
    case 'laser':
      return t > h.fireAt + LASER_LIVE;
    case 'shock':
      return t >= h.startAt && shockRadius(h, t) > 640;
    default:
      return true;
  }
}

// m = zusaetzlicher Sicherheitsabstand (nur fuer den Test-Bot)
export function hazardHit(h, t, px, py, m = 0) {
  const r = R + m;
  switch (h.kind) {
    case 'plank': {
      if (Math.abs(plankY(h, t) - py) >= PLANK_H / 2 + r - 2) return false;
      return t >= h.liveAt && (px - r < h.gx || px + r > h.gx + GAP_W);
    }
    case 'bottle': {
      if (t < h.landAt) return false;
      if (t < h.landAt + 0.3 && Math.hypot(px - h.tx, py - h.ty) < BOTTLE_IMPACT_R + r * 0.5) return true;
      if (t < h.landAt + 0.05 || t > h.landAt + SHARD_LIFE) return false;
      for (let k = 0; k < 6; k++) {
        const s = shardPos(h, k, t);
        if (Math.hypot(px - s.x, py - s.y) < 6 + r - 1) return true;
      }
      return false;
    }
    case 'pack':
      return t >= h.fireAt && t <= h.fireAt + GEYSER_LIVE && Math.abs(px - h.tx) < GEYSER_W + r - 2 && py > h.ty - GEYSER_UP - r && py < h.ty + 22 + r;
    case 'cap': {
      if (t < h.launchAt) return false;
      const c = capPos(h, t);
      return Math.hypot(px - c.x, py - c.y) < CAP_R + r - 2;
    }
    case 'laser': {
      if (t < h.fireAt || t > h.fireAt + LASER_LIVE) return false;
      return laserBeams(h).some((s) => segDist(px, py, s) < 9 + r - 2);
    }
    case 'shock': {
      if (t < h.startAt) return false;
      const d = Math.hypot(px - h.cx, py - h.cy);
      if (Math.abs(d - shockRadius(h, t)) >= 7 + r - 2) return false;
      return angDiff(Math.atan2(py - h.cy, px - h.cx), h.ga) > SHOCK_GAP;
    }
    default:
      return false;
  }
}

export function onCrate(px) {
  return CRATES.some(([x0, x1]) => px >= x0 - 6 && px <= x1 + 6);
}

export function foamHit(level, px, py) {
  return py + R * 0.5 > level && !onCrate(px);
}
