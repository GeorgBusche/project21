import { circleRect, clamp, createBeatSource, rectsOverlap } from './stage-utils.js';
import { FINAL_SEGMENT_ID, createSegments } from './stage1-segments.js';
import { SIZE, THEMES, drawChevrons, drawCube, drawElement, drawLayer, drawTeleFx, fx, mixRgb, rgba } from './stage1-draw.js';

// Eichung: Sprung = 0.533 s = 121 px bei 105 BPM (227.5 px/s), Höhe 85 px, 1 Beat = 130 px
const B = 130; // Pixel pro Beat (Streckengeschwindigkeit = bpm/60 * B)
const JUMP_V = -640;
const GRAVITY = 2400;
const ORB_V = -650;
const ORB_R = 42;
const COYOTE = 0.09;
const BUFFER = 0.22;
const FS = 62;
const LAND_TOL = 18;
const SEGMENT_COUNT = 14;
const TELE_T = 0.18;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Stage 1: "FIECH DER STRECKEN-BAUER" – 14 Segmente aus einem 20er-Baukasten, 3 Oberdesigns.
export function createStage1(options = {}) {
  let engine;
  let tick;
  let W = 360;
  let H = 600;
  let g = 0;
  let rail = 0;
  let ceilY = 0;
  let PX = 0;
  let SPAWN = 0;

  let t = 0;
  let beats = 0;
  let beatPos = 0;
  let flash = 0;
  let barPulse = 0;
  let shakeI = 0;
  let slowT = 0;
  let whiteFlash = 0;
  let glitchT = 0;
  let laserT = 0;
  let laserTo = null;
  let trailTimer = 0;
  let sparkTimer = 0;
  let prevHeld = false;
  let combo = 0;

  let nextBuild = 3;
  let teled = false;
  let segIdx = 0;
  let doneCount = 0;
  let finishing = false;
  let finishT = 0;
  let completed = false;
  let themeF = 0;
  let themeTarget = 0;
  let curTier = -1;
  let title = null;
  let poseCycle = 0;

  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false, bassEnergy: 0 };
  let els = [];
  let built = [];
  let deck = [];
  let particles = [];
  let rings = [];
  let callouts = [];
  let trail = [];
  let marks = [];
  // Adaptive Qualität: Handy startet ohne Glow; bricht die Framerate ein, wird weiter reduziert
const maxParticles = () => (fx.glow > 0 ? 240 : 90);
if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
  fx.glow = 0;
  fx.rain = 0.5;
}
let slowFrames = 0;
let fastFrames = 0;
function adaptQuality(dtRaw) {
  if (dtRaw > 0.026) {
    slowFrames++;
    fastFrames = 0;
  } else {
    fastFrames++;
    slowFrames = Math.max(0, slowFrames - 0.25);
  }
  if (slowFrames > 25 && fx.glow > 0) {
    fx.glow = 0;
    fx.rain = 0.5;
    slowFrames = 0;
  }
}
let teleFx = [];
  let lib = [];

  const cube = { y: 0, vy: 0, rot: 0, onGround: true, buffer: 0, coyote: 0, heldT: 99, squash: 0, dir: 1, comet: 0 };
  const fiech = {
    x: 0,
    y: 0,
    size: FS,
    alpha: 1,
    tilt: 0,
    sx: 1,
    sy: 1,
    action: 'hover',
    actionT: 0,
    pose: 'mid',
    home: 'mid',
    pending: null,
    teleState: 'visible',
    teleT: 0
  };

  const X = (dx) => SPAWN + dx;
  let segCount = SEGMENT_COUNT;
  const progressNow = () => clamp(doneCount / segCount, 0, 1);
  const fiechVisible = () => fiech.teleState === 'visible' || fiech.teleState === 'in';
  const bodyActive = () => els.some((o) => o.usesFiechBody && !o.dead && o.x + o.w > PX);

  // ---------- Effekte ----------
  function say(text, x, y, color = '#fde047', size = 16) {
    callouts.push({ text, x, y, color, size, life: 0.9, max: 0.9 });
  }

  function burst(x, y, n, colors, speed = 160, up = 0, force = false) {
    for (let i = 0; i < n && (force || particles.length < maxParticles()); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - up,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 1.5 + Math.random() * 2.5,
        color: colors[i % colors.length]
      });
    }
  }

  const addRing = (x, y, color, max = 70) => rings.push({ x, y, r: 6, max, life: 0.45, color });
  const addTeleFx = (x, y, color = '#a855f7') => teleFx.push({ x, y, life: 0.4, max: 0.4, color });

  // ---------- Element-Baukasten (Positionen in px relativ zum Spawnpunkt) ----------
  const el = (o) => ({ rise: 0, speedMul: 1, ...o });

  function spike(dx, { w = 30, h = 30, up = true, by, tag } = {}) {
    const o = el({ kind: 'spike', x: X(dx), w, h, up, by: by ?? (up ? g : ceilY), tag });
    o.kills = () => (o.hidden || o.rise < 0.5 ? [] : [{ x: o.x + w * 0.25, y: up ? o.by - h * 0.6 : o.by, w: w * 0.5, h: h * 0.6 }]);
    if (tag) o.tagY = () => o.by - h - 12;
    return o;
  }

  function pop(dx, w) {
    const o = el({ kind: 'pop', x: X(dx), w, hidden: true });
    o.trigX = PX + 150;
    o.onTrig = () => {
      o.hidden = false;
      engine.beep(420, 'square', 0.05, 0.02);
    };
    o.kills = () => (o.hidden || o.rise < 0.5 ? [] : [{ x: o.x + 5, y: g - 24, w: o.w - 10, h: 19 }]);
    return o;
  }

  function block(dx, w, h, { top, tag, crate, tagColor } = {}) {
    const o = el({ kind: 'block', x: X(dx), w, h, top: top ?? g - h, crate });
    // Nur Front-/Kernzone ist gefährlich: ein Streifschuss an der Oberkante kostet nie ein Leben
    o.kills = () => (o.rise > 0.5 ? [{ x: o.x + 4, y: o.top + 18, w: o.w - 8, h: Math.max(0, o.h - 18) }] : []);
    o.solids = () => (o.rise > 0.5 ? [{ x: o.x, w: o.w, top: o.top }] : []);
    if (tag) {
      o.tag = tag;
      o.tagColor = tagColor;
      o.tagY = () => o.top - 10;
    }
    return o;
  }

  // Hub-Plattform, die im Takt auf und ab fährt
  function lift(dx, w, ph) {
    const o = block(dx, w, 50, { crate: false });
    o.step = () => {
      o.top = g - 50 + Math.sin(((PX - o.x) / B) * Math.PI + ph) * 20;
      o.h = g - o.top;
    };
    return o;
  }

  function pad(dx, v, { color = '#facc15', base, tag } = {}) {
    const o = el({ kind: 'pad', x: X(dx), w: 34, h: 8, v, color, base: base ?? g, rise: 1 });
    if (tag) {
      o.tag = tag;
      o.tagY = () => o.base - 22;
    }
    return o;
  }

  // Blauer Decken-Abpraller: drückt den Würfel sofort wieder nach unten
  function bumper(dx, base = ceilY + 40) {
    const o = pad(dx, 0, { color: '#38bdf8', base });
    o.ceil = true;
    return o;
  }

  function orb(dx, y, tag, { vanishDistance, revealAfterBait } = {}) {
    const o = el({ kind: 'orb', x: X(dx), w: 36, y, rise: 1, tag });
    o.tagY = () => y - 32;
    // Alternativ-Ring: unsichtbar und nicht nutzbar, bis ein Köder-Ring davor verschwunden ist
    if (revealAfterBait) {
      o.hidden = true;
      o.reveal = 0;
      o.step = (_, dt) => {
        if (o.hidden && els.some((e) => e.kind === 'orb' && e.vanishing && e.x < o.x)) {
          o.hidden = false;
          addRing(o.x + 18, o.y, '#fde047', 40);
        }
        if (!o.hidden) o.reveal = Math.min(1, o.reveal + dt / 0.25);
      };
    }
    // Köder-Ring: verschwindet in einer Animation, sobald er näher als vanishDistance px ist
    if (vanishDistance) {
      o.step = (_, dt) => {
        if (!o.vanishing && !o.used && o.x + 18 - (PX + SIZE / 2) < vanishDistance) {
          o.vanishing = true;
          o.used = true;
          o.fade = 1;
          addRing(o.x + 18, o.y, '#fde047', 40);
          burst(o.x + 18, o.y, 8, ['#fde047', '#ffffff'], 110);
        }
        if (o.vanishing) o.fade = Math.max(0, o.fade - dt / 0.3);
      };
    }
    return o;
  }

  function saw(dx, y) {
    const o = el({ kind: 'saw', x: X(dx), w: 34, r: 17, y, spin: 0, rise: 1 });
    o.step = (_, dt) => {
      o.spin += dt * 14;
    };
    o.kills = () => [{ cx: o.x + 17, cy: o.y, r: 14 }];
    return o;
  }

  function beam(dx, w, y, h, { armT = 0.4, tag } = {}) {
    const o = el({ kind: 'beam', x: X(dx), w, y, h, live: false, armT, rise: 1, tag });
    o.step = (_, dt) => {
      if (o.armT > 0) {
        o.armT -= dt;
        if (o.armT <= 0) o.live = true;
      }
    };
    o.kills = () => (o.live ? [{ x: o.x, y: o.y, w: o.w, h: o.h }] : []);
    o.tagY = () => (o.y > g - 30 ? o.y - 16 : o.y + o.h + 14);
    return o;
  }

  function stomper(dx, w, bottom, tag) {
    const o = el({ kind: 'stomper', x: X(dx), w, bot: rail, target: bottom, tag, tagColor: '#4ade80' });
    o.tagY = () => g - 26;
    o.step = () => {
      o.bot = rail + (o.target - rail) * Math.min(1, o.rise);
    };
    o.kills = () => (o.rise > 0.4 ? [{ x: o.x, y: rail, w: o.w, h: o.bot - rail + 2 }] : []);
    return o;
  }

  function keg(dx) {
    const o = el({ kind: 'keg', x: X(dx), w: 32, spin: 0, fastMul: 1.35, rise: 1 });
    o.step = (_, dt) => {
      o.spin -= dt * 11;
      if (Math.random() < dt * 22) particles.push({ x: o.x + 30, y: g - 2, vx: 40, vy: -20, life: 0.4, max: 0.4, size: 3, color: 'rgba(180,160,140,0.6)' });
    };
    o.kills = () => [{ cx: o.x + 16, cy: g - 16, r: 13 }];
    return o;
  }

  function wave(dx, w, h, fastMul) {
    const o = el({ kind: 'wave', x: X(dx), w, h, fastMul, rise: 1 });
    o.kills = () => [{ x: o.x + 6, y: g - h * 0.8, w: w - 12, h: h * 0.8 }];
    return o;
  }

  function guillotine(dx, w, h) {
    const o = el({ kind: 'guillotine', x: X(dx), w, h, y: rail + 60, vy: 0, state: 'hang', rise: 1 });
    o.trigX = W * 0.75;
    o.onTrig = () => {
      o.state = 'fall';
    };
    o.step = (_, dt) => {
      if (o.state !== 'fall') return;
      o.vy += 2600 * dt;
      o.y += o.vy * dt;
      if (o.y + o.h >= g) {
        o.y = g - o.h;
        o.state = 'down';
        shakeI = Math.max(shakeI, 6);
        burst(o.x + o.w / 2, g, 12, ['#ef4444', '#f97316', '#fde047'], 200, 100);
        addRing(o.x + o.w / 2, g, '#ef4444', 60);
        engine.beep(80, 'sine', 0.12, 0.05);
      }
    };
    o.kills = () =>
      o.state === 'down' ? [{ x: o.x + 4, y: o.y + 18, w: o.w - 8, h: Math.max(0, o.h - 18) }] : [{ x: o.x, y: o.y, w: o.w, h: o.h + 8 }];
    o.solids = () => (o.state === 'down' ? [{ x: o.x, w: o.w, top: o.y }] : []);
    return o;
  }

  // Das Fiech selbst ist die Abrissbirne (usesFiechBody)
  function pend(dx, ph, L = 195) {
    const o = el({ kind: 'pend', x: X(dx), w: 240, rise: 1, usesFiechBody: true });
    o.pivot = () => ({ x: o.x + 120 });
    o.ball = () => {
      const th = 0.45 * Math.sin((((PX - o.x) / B) * Math.PI) / 2 + ph);
      return { x: o.x + 120 + L * Math.sin(th), y: rail + L * Math.cos(th), th };
    };
    o.kills = () => {
      const b = o.ball();
      return [{ cx: b.x, cy: b.y, r: 19 }];
    };
    return o;
  }

  function lava(dx, w) {
    const o = el({ kind: 'lava', x: X(dx), w, rise: 1, instantDeath: true });
    o.kills = () => [{ x: o.x, y: g - 10, w: o.w, h: 60 }];
    return o;
  }

  function portal(dx, flip) {
    return el({ kind: 'portal', x: X(dx), w: 18, flip, y: flip === 'down' ? g - 150 : ceilY - 4, h: 150, rise: 1 });
  }

  const track = (dx, w) => el({ kind: 'track', x: X(dx), w, rise: 1 });

  // Schere: schließt ihre Lücke oben ('high') oder in der Mitte ('mid') – nie am Boden
  function scis(dx, mode, ph) {
    const target = mode === 'high' ? g - 118 : g - 78;
    const o = el({ kind: 'scis', x: X(dx), w: 10, c: g - 78, locked: false, rise: 1 });
    o.trigX = PX + 200;
    o.onTrig = () => {
      o.locked = true;
    };
    o.gapTop = () => o.c - 62;
    o.gapBot = () => o.c + 62;
    o.step = (_, dt) => {
      if (!o.locked) o.c = g - 78 + 40 * Math.sin(((o.x - PX) / B) * Math.PI + ph);
      else o.c += (target - o.c) * Math.min(1, dt * 12);
    };
    o.kills = () => {
      const r = [{ x: o.x + 2, y: rail, w: 6, h: o.gapTop() - rail }];
      if (o.gapBot() < g) r.push({ x: o.x + 2, y: o.gapBot(), w: 6, h: g - o.gapBot() });
      return r;
    };
    return o;
  }

  function gate(dx) {
    const o = el({ kind: 'gate', x: X(dx), w: 26, rise: 1, tag: 'SMASH!', tagColor: '#4ade80' });
    o.tagY = () => g - 176;
    o.kills = () => [
      { x: o.x, y: g - 50, w: o.w, h: 50 },
      { x: o.x, y: rail, w: o.w, h: g - 165 - rail }
    ];
    return o;
  }

  // Das Fiech selbst rast als Rammbock über die Strecke (usesFiechBody)
  const runner = (dx, fastMul = 1.6) => {
    const o = el({ kind: 'runner', x: X(dx), w: 56, fastMul, rise: 1, usesFiechBody: true });
    o.kills = () => [{ x: o.x + 8, y: g - 62, w: 40, h: 56 }];
    return o;
  };

  // ---------- Segment-Baukasten: benannte Parameter -> interne Elemente ----------
  // Die Segmente selbst stehen in stage1-segments.js
  function makeLibrary() {
    const kit = {
      spike: ({ x, width = 30, height = 30, onCeiling = false, baseHeightAboveGround, hangsFromCeiling = 0, label }) =>
        spike(x, {
          w: width,
          h: height,
          up: !onCeiling,
          by: baseHeightAboveGround !== undefined ? g - baseHeightAboveGround : onCeiling ? ceilY + hangsFromCeiling : undefined,
          tag: label
        }),
      spikeRow: ({ from, to, spacing = 30 }) => {
        const out = [];
        for (let d = from; d <= to; d += spacing) out.push(spike(d));
        return out;
      },
      block: ({ x, width, height, crate, label, labelColor }) => block(x, width, height, { crate, tag: label, tagColor: labelColor }),
      lift: ({ x, width, phase = 0 }) => lift(x, width, phase),
      pad: ({ x, power, standsOnHeight = 0, color, label }) => pad(x, power, { color, base: g - standsOnHeight, tag: label }),
      bumper: ({ x, heightAboveGround }) => bumper(x, heightAboveGround === undefined ? undefined : g - heightAboveGround),
      orb: ({ x, heightAboveGround, heightBelowCeiling = 65, label, vanishesWhenCloserThan, appearsWhenBaitVanishes }) =>
        orb(x, heightAboveGround !== undefined ? g - heightAboveGround : ceilY + heightBelowCeiling, label, { vanishDistance: vanishesWhenCloserThan, revealAfterBait: appearsWhenBaitVanishes }),
      saw: ({ x, heightAboveGround }) => saw(x, g - heightAboveGround),
      beam: ({ x, width, heightAboveGround, thickness = 10, armTime = 0.4, label }) => beam(x, width, g - heightAboveGround, thickness, { armT: armTime, tag: label }),
      stomper: ({ x, width, stopsAboveGround = 50, label }) => stomper(x, width, g - stopsAboveGround, label),
      guillotine: ({ x, width, height }) => guillotine(x, width, height),
      keg: ({ x }) => keg(x),
      wave: ({ x, width, height, speed = 1.15 }) => wave(x, width, height, speed),
      pendulum: ({ x, phase = 0, length = 195 }) => pend(x, phase, length),
      runner: ({ x, speed = 1.6 }) => runner(x, speed),
      lava: ({ x, width }) => lava(x, width),
      popup: ({ x, width }) => pop(x, width),
      scissors: ({ x, closesAt = 'high', phase = 0 }) => scis(x, closesAt, phase),
      portal: ({ x, direction }) => portal(x, direction),
      track: ({ x, width }) => track(x, width),
      gate: ({ x }) => gate(x)
    };
    return createSegments(kit);
  }
  function pickDeck() {
    const pool = (tier) => shuffle(lib.filter((s) => s.tier === tier && s.id !== FINAL_SEGMENT_ID));
    return [...pool(0).slice(0, 4), ...pool(1).slice(0, 5), ...pool(2).slice(0, 4), lib.find((s) => s.id === FINAL_SEGMENT_ID)];
  }

  // ---------- Fiech-Posen & Teleport ----------
  function poseTarget(name) {
    switch (name) {
      case 'ground':
        return { x: W * 0.8, y: g - FS / 2 - 14, size: FS, alpha: 1, tilt: 0 };
      case 'ceil':
        return { x: W * 0.68 + Math.sin(t * 1.1) * W * 0.15, y: rail + FS / 2 + 14, size: FS, alpha: 1, tilt: Math.PI };
      case 'top':
        return { x: W * 0.78, y: rail + FS / 2 + 14, size: FS, alpha: 1, tilt: 0 };
      case 'right':
        return { x: W * 0.86, y: H * 0.45, size: FS, alpha: 1, tilt: 0 };
      case 'topRight':
        return { x: W * 0.82, y: rail + FS / 2 + 14, size: FS, alpha: 1, tilt: 0 };
      case 'leftTop':
        return { x: W * 0.14, y: rail + FS / 2 + 18, size: FS, alpha: 1, tilt: 0 };
      case 'bg':
        return { x: W * 0.5, y: H * 0.4, size: 170, alpha: 0.4, tilt: 0 };
      default:
        return { x: W * 0.82 + Math.sin(t * 1.3) * W * 0.04, y: g - 105 + Math.sin(t * 2.2) * 5, size: FS, alpha: 1, tilt: 0 };
    }
  }

  function teleportOut(tx, ty) {
    addRing(fiech.x, fiech.y, '#a855f7', 65);
    burst(fiech.x, fiech.y, 12, ['#22d3ee', '#a855f7'], 200, 0, true);
    addTeleFx(fiech.x, fiech.y, '#a855f7');
    if (tx !== undefined) addTeleFx(tx, ty ?? fiech.y, '#22d3ee');
    glitchT = 0.2;
    fiech.teleState = 'out';
    fiech.teleT = 0;
    fiech.action = 'hover';
    fiech.actionT = 0;
    laserT = 0;
    engine.beep(240, 'square', 0.06, 0.02);
  }

  function teleportIn(name) {
    fiech.pose = name;
    fiech.home = name;
    const tg = poseTarget(name);
    Object.assign(fiech, { x: tg.x, y: tg.y, size: tg.size, tilt: tg.tilt, alpha: 0 });
    addTeleFx(tg.x, tg.y, '#22d3ee');
    addRing(tg.x, tg.y, '#ef4444', 60);
    burst(tg.x, tg.y, 8, ['#22d3ee', '#a855f7'], 160, 0, true);
    glitchT = 0.2;
    fiech.teleState = 'in';
    fiech.teleT = 0;
    engine.beep(360, 'square', 0.06, 0.02);
  }

  // Große Positionswechsel laufen immer als Teleport, nie als Gleitflug
  function requestPose(name) {
    fiech.home = name;
    if (bodyActive() || fiech.teleState === 'hidden' || fiech.teleState === 'out') {
      fiech.pending = name;
      return;
    }
    const a = poseTarget(fiech.pose);
    const b = poseTarget(name);
    if (Math.hypot(a.x - b.x, a.y - b.y) > 70 || a.size !== b.size) {
      fiech.pending = name;
      teleportOut(b.x, b.y);
    } else {
      fiech.pose = name;
    }
  }

  function updateFiech(dt) {
    const tg = poseTarget(fiech.pose);
    const st = fiech.teleState;
    if (st === 'out') {
      fiech.teleT += dt;
      const p = clamp(fiech.teleT / TELE_T, 0, 1);
      fiech.sx = 1 - 0.92 * p;
      fiech.sy = 1 + 1.4 * p;
      fiech.alpha = tg.alpha * (1 - p);
      if (p >= 1) {
        fiech.teleState = 'hidden';
        fiech.alpha = 0;
      }
      return;
    }
    if (st === 'hidden') {
      if (!bodyActive()) {
        const name = fiech.pending ?? fiech.home;
        fiech.pending = null;
        teleportIn(name);
      }
      return;
    }
    if (st === 'in') {
      fiech.teleT += dt;
      const p = clamp(fiech.teleT / TELE_T, 0, 1);
      if (p < 0.5) {
        const q = p / 0.5;
        fiech.sx = 0.1 + 1.05 * q;
        fiech.sy = 2.2 - 1.35 * q;
      } else {
        const q = (p - 0.5) / 0.5;
        fiech.sx = 1.15 - 0.15 * q;
        fiech.sy = 0.85 + 0.15 * q;
      }
      fiech.alpha = tg.alpha * p;
      fiech.x = tg.x;
      fiech.y = tg.y;
      fiech.tilt = tg.tilt;
      if (p >= 1) fiech.teleState = 'visible';
      return;
    }
    const k = Math.min(1, dt * 8);
    fiech.x += (tg.x - fiech.x) * k;
    fiech.y += (tg.y - fiech.y) * k;
    fiech.size += (tg.size - fiech.size) * k;
    fiech.alpha += (tg.alpha - fiech.alpha) * k;
    fiech.tilt += (tg.tilt - fiech.tilt) * Math.min(1, dt * 6);
    fiech.sx += (1 - fiech.sx) * Math.min(1, dt * 12);
    fiech.sy += (1 - fiech.sy) * Math.min(1, dt * 12);
    if (fiech.actionT > 0) {
      fiech.actionT -= dt;
      if (fiech.actionT <= 0) fiech.action = 'hover';
    }
  }

  // ---------- Segment-Ablauf ----------
  function tele(def) {
    if (def.tier !== curTier) {
      curTier = def.tier;
      themeTarget = def.tier;
      title = { text: THEMES[def.tier].name, t: 0 };
      glitchT = 0.4;
      engine.beep(140, 'sawtooth', 0.15, 0.03);
    }
    let pose = def.pose;
    if (!pose) {
      const cycle = ['right', 'topRight', 'leftTop', 'bg'];
      pose = cycle[poseCycle++ % cycle.length];
    }
    requestPose(pose);
    if (fiechVisible()) {
      if (def.act === 'laser') {
        fiech.action = 'laser';
        fiech.actionT = 0.55;
      } else if (def.act === 'laugh') {
        fiech.action = 'laugh';
        fiech.actionT = 0.5;
      }
    }
    for (const [dx, y, w] of def.mk || []) {
      marks.push({ x: X(dx), y: y === 'g' ? g - 4 : rail + 2, w, h: 5, life: 0.6 });
    }
  }

  function build(def) {
    const list = def.build();
    for (const o of list) els.push(o);
    built.push({ def, els: list });
    const maxR = Math.max(...list.map((o) => o.x + o.w)) - SPAWN;
    // Beat-Raster: nächstes Segment startet 1 Beat nach dem Ende dieses Segments
    nextBuild = beats + Math.max(4, def.len ?? 0, Math.ceil(maxR / B)) + 1;
    const body = list.find((o) => o.usesFiechBody);
    if (body) {
      // Das Fiech steckt jetzt im Hindernis: Boss-Fiech verschwindet per Teleport
      addTeleFx(body.x + body.w / 2, (rail + g) / 2, '#ef4444');
      fiech.pending = fiech.home;
      if (fiechVisible()) teleportOut();
      engine.beep(70, 'sine', 0.12, 0.05);
      shakeI = Math.max(shakeI, 5);
    }
    const first = list[0];
    const cx = first.x + first.w / 2;
    const vis = fiechVisible() && !body;
    if (vis) {
      switch (def.act) {
        case 'slam':
          fiech.sy = 0.62;
          fiech.sx = 1.25;
          fiech.action = 'slam';
          fiech.actionT = 0.3;
          shakeI = Math.max(shakeI, 7);
          addRing(SPAWN, g, '#ef4444', 80);
          addRing(SPAWN, g, '#f97316', 46);
          burst(SPAWN, g, 14, ['#ef4444', '#f97316', '#fde047'], 220, 120);
          engine.beep(70, 'sine', 0.12, 0.05);
          break;
        case 'crush':
          fiech.action = 'slam';
          fiech.actionT = 0.3;
          shakeI = Math.max(shakeI, 5);
          addRing(fiech.x, fiech.y, '#f97316', 60);
          engine.beep(90, 'sine', 0.1, 0.05);
          break;
        case 'laser':
          fiech.action = 'laser';
          fiech.actionT = 0.35;
          laserT = 0.3;
          laserTo = { x: cx, y: first.y ?? g - 8 };
          addRing(laserTo.x, laserTo.y, '#67e8f9', 50);
          burst(laserTo.x, laserTo.y, 10, ['#67e8f9', '#fde047', '#ffffff'], 150);
          engine.beep(880, 'triangle', 0.1, 0.03);
          break;
        case 'laugh':
          fiech.action = 'laugh';
          fiech.actionT = 0.45;
          engine.beep(300, 'sawtooth', 0.08, 0.025);
          break;
        default:
          shakeI = Math.max(shakeI, 2);
          break;
      }
    }
    say(def.call, clamp(fiech.x - 20, 60, W - 60), clamp(fiech.y + fiech.size * 0.7, rail + 20, g - 70), '#f97316', 18);
  }

  function onBeat() {
    beats++;
    flash = 1;
    if (beats % 4 === 1) {
      barPulse = 1;
      engine.beep(110, 'sine', 0.08, 0.03);
    }
    if (curTier === 2 && fiech.teleState === 'visible' && fiech.actionT <= 0) {
      fiech.action = 'laugh';
      fiech.actionT = 0.25;
    }
    if (segIdx >= deck.length) return;
    if (!teled && beats >= nextBuild - 1) {
      tele(deck[segIdx]);
      teled = true;
    }
    if (teled && beats >= nextBuild) {
      build(deck[segIdx]);
      segIdx++;
      teled = false;
    }
  }

  // ---------- Würfel ----------
  function jump() {
    cube.vy = JUMP_V * cube.dir;
    cube.onGround = false;
    cube.buffer = 0;
    cube.coyote = 0;
    engine.beep(660, 'triangle', 0.05, 0.03);
  }

  function land(y) {
    cube.y = y - SIZE;
    cube.vy = 0;
    cube.onGround = true;
    cube.coyote = 0;
    cube.rot = Math.round(cube.rot / (Math.PI / 2)) * (Math.PI / 2);
    cube.squash = 1;
    burst(PX + SIZE / 2, y, 7, ['#6ee7b7', '#67e8f9', '#ffffff'], 120);
    shakeI = Math.max(shakeI, 2);
    engine.beep(180, 'sine', 0.04, 0.03);
  }

  function landCeil() {
    cube.y = ceilY;
    cube.vy = 0;
    cube.onGround = true;
    cube.rot = Math.round(cube.rot / (Math.PI / 2)) * (Math.PI / 2);
    cube.squash = 1;
    burst(PX + SIZE / 2, ceilY, 7, ['#38bdf8', '#e0f2fe'], 120);
    shakeI = Math.max(shakeI, 2);
  }

  function hurt(o) {
    // Lava ist sofort tödlich (kein Leben-Abzug, direkter Absturz)
    if (o.instantDeath) {
      if (!engine.invulnerable) engine.crash();
      return;
    }
    if (!engine.hit()) return;
    o.hitDone = true;
    combo = 0;
    burst(PX + SIZE / 2, cube.y + SIZE / 2, 16, ['#ef4444', '#f97316', '#fef08a'], 260);
    shakeI = 9;
    say('AUA!', PX + 10, cube.y - 18, '#ef4444', 18);
  }

  function smash(o) {
    o.dead = true;
    burst(o.x + o.w / 2, g - 90, 30, ['#ef4444', '#fde047', '#4ade80', '#ffffff'], 320, 60, true);
    addRing(o.x + o.w / 2, g - 106, '#4ade80', 120);
    shakeI = 14;
    slowT = 0.6;
    whiteFlash = 1;
    cube.comet = 0.9;
    say('SECTOR CLEARED!', W / 2, H * 0.3, '#4ade80', 22);
    engine.addScore(300);
    engine.beep(520, 'triangle', 0.2, 0.05);
  }

  return {
    color: '#22c55e',
    init(e) {
      engine = e;
      tick = createBeatSource();
      W = engine.W;
      H = engine.H;
      g = H * 0.74;
      rail = H * 0.16;
      ceilY = H * 0.27;
      PX = W * 0.2 - SIZE / 2;
      SPAWN = W * 0.78;
      cube.y = g - SIZE;
      lib = makeLibrary();
      deck = pickDeck();
      const only = options.segmentId && lib.find((x) => x.id === options.segmentId);
      if (only) deck = [only];
      segCount = deck.length;
      const tg = poseTarget('mid');
      fiech.x = tg.x;
      fiech.y = tg.y;
    },
    progress: () => progressNow(),
    get elements() {
      return els;
    },
    get cube() {
      return cube;
    },
    get deck() {
      return deck;
    },
    get library() {
      return lib;
    },
    get fiechState() {
      return fiech;
    },
    get segmentsDone() {
      return doneCount;
    },
    onTouch(ev) {
      if (ev.type === 'down') cube.buffer = BUFFER;
    },
    update(dtRaw, beatInfo) {
      adaptQuality(dtRaw);
      beat = tick(beatInfo, dtRaw);
      let dt = dtRaw;
      if (slowT > 0) {
        slowT -= dtRaw;
        dt = dtRaw * 0.3;
      }
      t += dt;
      beatPos = beat.beatIndex + beat.beatPhase;
      if (beat.isBeat) onBeat();
      flash = Math.max(0, flash - dt * 5);
      barPulse = Math.max(0, barPulse - dt * 1.8);
      shakeI = Math.max(0, shakeI - dt * 30);
      laserT = Math.max(0, laserT - dt);
      whiteFlash = Math.max(0, whiteFlash - dt * 2.5);
      glitchT = Math.max(0, glitchT - dt);
      cube.squash = Math.max(0, cube.squash - dt * 6);
      cube.comet = Math.max(0, cube.comet - dt);
      if (title) {
        title.t += dtRaw;
        if (title.t > 1.9) title = null;
      }
      const dTheme = themeTarget - themeF;
      themeF += Math.sign(dTheme) * Math.min(Math.abs(dTheme), dtRaw * 2);
      updateFiech(dt);

      const held = engine.held;
      if (held && !prevHeld) {
        cube.buffer = BUFFER;
        cube.heldT = 0;
      }
      if (held) cube.heldT += dt;
      prevHeld = held;
      if (cube.buffer > 0) cube.buffer -= dt;
      if (cube.coyote > 0) cube.coyote -= dt;

      // Strecke bewegen
      const speed = (beat.bpm / 60) * B;
      for (const o of els) {
        // Schnelle Gegner sprinten erst, wenn sie im Bild sind – das Segment-Layout bleibt so exakt erhalten
        if (o.fastMul > 1 && o.speedMul === 1 && o.x <= W * 0.72) o.speedMul = o.fastMul;
        o.x -= speed * dt * o.speedMul;
        if (!o.hidden && o.rise < 1) o.rise = Math.min(1, o.rise + dt * (o.kind === 'pop' ? 8 : 6));
        if (o.trigX !== undefined && !o.fired && o.x <= o.trigX) {
          o.fired = true;
          o.onTrig(o);
        }
        if (o.step) o.step(o, dt);
      }

      // Physik: Landen auf Blöcken/Plattformen, Decken-Lauf
      const sol = [];
      for (const o of els) if (o.solids) for (const s of o.solids()) sol.push(s);
      const left = PX + 3;
      const right = PX + SIZE - 3;
      if (cube.onGround && cube.dir === 1 && cube.y + SIZE < g - 0.5) {
        // mit fahrenden Plattformen mitfahren
        const s = sol.find((q) => q.x < right && q.x + q.w > left && Math.abs(q.top - (cube.y + SIZE)) < 6);
        if (s) cube.y = s.top - SIZE;
      }
      const trackAbove = () => els.some((o) => o.kind === 'track' && o.x < right && o.x + o.w > left);
      const standing = () =>
        cube.dir === 1
          ? cube.y + SIZE >= g - 0.5 || sol.some((s) => s.x < right && s.x + s.w > left && Math.abs(s.top - (cube.y + SIZE)) < 2)
          : cube.y <= ceilY + 0.5 && trackAbove();
      if (cube.onGround && !standing()) {
        cube.onGround = false;
        cube.coyote = COYOTE;
      }
      if ((cube.onGround || cube.coyote > 0) && (cube.buffer > 0 || held)) jump();
      if (!cube.onGround) {
        const prevBottom = cube.y + SIZE;
        cube.vy += GRAVITY * cube.dir * dt;
        cube.y += cube.vy * dt;
        cube.rot += ((Math.PI / 2) / ((2 * -JUMP_V) / GRAVITY)) * dt;
        if (cube.dir === 1) {
          const nb = cube.y + SIZE;
          let top = null;
          if (cube.vy >= 0) {
            for (const s of sol) {
              if (s.x >= right || s.x + s.w <= left) continue;
              if (prevBottom <= s.top + LAND_TOL && nb >= s.top && (top === null || s.top < top)) top = s.top;
            }
          }
          if (top !== null) land(top);
          else if (nb >= g) land(g);
        } else if (cube.y <= ceilY && trackAbove()) {
          landCeil();
          } else if (cube.y + SIZE < 0) {
          // Ohne Deckenstrecke fliegt der Würfel in den Himmel
          engine.crash();
        }
      }

      // Interaktion: Tödliches, Pads, Ringe, Portale, Tor
      const hb = { x: PX + 5, y: cube.y + 5, w: SIZE - 10, h: SIZE - 10 };
      for (const o of els) {
        if (o.dead) continue;
        if (!o.hitDone && o.kills) {
          for (const k of o.kills()) {
            const hit = k.r !== undefined ? circleRect(k.cx, k.cy, k.r, hb.x, hb.y, hb.w, hb.h) : rectsOverlap(hb, k);
            if (hit) {
              hurt(o);
              break;
            }
          }
        }
        if (o.kind === 'pad' && o.ceil) {
          if (!o.used && cube.dir === 1 && !cube.onGround && cube.y <= o.base + o.h + 4 && o.x < PX + SIZE && o.x + o.w > PX) {
            o.used = true;
            cube.vy = 520;
            addRing(o.x + o.w / 2, o.base + o.h, o.color, 50);
            burst(o.x + o.w / 2, o.base + o.h, 10, ['#38bdf8', '#e0f2fe'], 150);
            say('BOING!', PX + 20, cube.y + 50, '#7dd3fc', 15);
            engine.addScore(25);
            engine.beep(300, 'triangle', 0.1, 0.04);
          }
        } else if (o.kind === 'pad') {
          if (!o.used && rectsOverlap(hb, { x: o.x, y: o.base - o.h, w: o.w, h: o.h })) {
            o.used = true;
            cube.vy = o.v * cube.dir;
            cube.onGround = false;
            cube.rot += 0.2;
            burst(o.x + o.w / 2, o.base, 12, ['#fde047', '#fef9c3'], 180, 100);
            addRing(o.x + o.w / 2, o.base, o.color, 50);
            say('BOOST!', PX + 20, cube.y - 30, '#fde047', 16);
            engine.addScore(25);
            engine.beep(520, 'triangle', 0.1, 0.04);
          }
        } else if (o.kind === 'orb') {
          const cx = o.x + 18;
          const ready = cube.buffer > 0;
          if (!o.used && !o.hidden && !cube.onGround && ready && circleRect(cx, o.y, ORB_R, hb.x, hb.y, hb.w, hb.h)) {
            o.used = true;
            cube.vy = ORB_V * cube.dir;
            // Magnet: zieht den Würfel auf die Ideallinie des Rings
            cube.y = cube.dir === 1 ? Math.min(cube.y, o.y + 6) : Math.max(cube.y, o.y - SIZE - 6);
            cube.buffer = 0;
            addRing(cx, o.y, '#fde047', 56);
            burst(cx, o.y, 10, ['#fde047', '#ffffff'], 150);
            say('DOUBLE JUMP!', PX + 30, cube.y - 28, '#fde047', 15);
            engine.addScore(25);
            engine.beep(740, 'triangle', 0.08, 0.04);
          }
        } else if (o.kind === 'portal') {
          if (!o.used && rectsOverlap(hb, { x: o.x, y: o.y, w: o.w, h: o.h })) {
            o.used = true;
            cube.dir = o.flip === 'down' ? -1 : 1;
            cube.onGround = false;
            cube.vy = o.flip === 'down' ? -250 : 250;
            addRing(o.x + 9, cube.y + 16, '#38bdf8', 60);
            say(o.flip === 'down' ? 'FLIP!' : 'BACK!', PX + 24, cube.y - 24, '#7dd3fc', 16);
            engine.beep(460, 'sine', 0.12, 0.04);
          }
        } else if (o.kind === 'gate') {
          if (circleRect(o.x + o.w / 2, g - 106, 48, hb.x, hb.y, hb.w, hb.h)) smash(o);
        }
      }

      // Segmente abrechnen
      for (const s of built) {
        if (!s.done && s.els.every((o) => o.dead || o.x + o.w < PX - 2)) {
          s.done = true;
          doneCount++;
          combo++;
          engine.addScore(50 + 10 * Math.min(combo, 10));
          if (combo >= 3 && doneCount < segCount) say(`x${combo} COMBO`, PX + 24, cube.y - 26, '#fde047', 15);
        }
      }
      els = els.filter((o) => !o.dead && o.x + o.w > -140);
      if (doneCount >= segCount && !finishing) {
        finishing = true;
        finishT = 0.9;
      }
      if (finishing && !completed) {
        finishT -= dtRaw;
        if (finishT <= 0) {
          completed = true;
          engine.complete();
        }
      }

      // Spur, Funken, Partikel
      trailTimer += dt;
      if (trailTimer > 0.03) {
        trailTimer = 0;
        trail.unshift({ y: cube.y, rot: cube.rot, age: 0 });
        trail.length = Math.min(trail.length, 8);
      }
      for (const tr of trail) tr.age += dt;
      sparkTimer += dt;
      if (cube.onGround && sparkTimer > 0.035 && particles.length < maxParticles()) {
        sparkTimer = 0;
        const sy = cube.dir === 1 ? cube.y + SIZE : cube.y;
        particles.push({
          x: PX + 4,
          y: sy,
          vx: -90 - Math.random() * 90,
          vy: (-30 - Math.random() * 110) * cube.dir,
          life: 0.3,
          max: 0.3,
          size: 1.5 + Math.random() * 1.5,
          color: Math.random() < 0.5 ? '#fde047' : '#f97316'
        });
      }
      const w1 = clamp(1 - Math.abs(themeF - 1), 0, 1);
      if (w1 > 0.3 && Math.random() < dt * 16 && particles.length < maxParticles()) {
        particles.push({ x: Math.random() * W, y: rail + 2, vx: (Math.random() - 0.5) * 50, vy: 30 + Math.random() * 70, life: 0.7, max: 0.7, size: 2, color: '#fbbf24' });
      }
      for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 500 * dt;
      }
      particles = particles.filter((p) => p.life > 0);
      for (const r of rings) {
        r.life -= dt;
        r.r += ((r.max - r.r) * dt) / 0.12;
      }
      rings = rings.filter((r) => r.life > 0);
      for (const c of callouts) {
        c.life -= dt;
        c.y -= 22 * dt;
      }
      callouts = callouts.filter((c) => c.life > 0);
      for (const m of marks) m.life -= dt;
      marks = marks.filter((m) => m.life > 0);
      for (const f of teleFx) f.life -= dt;
      teleFx = teleFx.filter((f) => f.life > 0);
    },
    render(ctx) {
      const speed = (beat.bpm / 60) * B;
      const scroll = t * speed;
      const bass = beat.bassEnergy || 0;
      const lo = Math.min(1, Math.floor(themeF));
      const acc = mixRgb(THEMES[lo].accent, THEMES[Math.min(2, lo + 1)].accent, themeF - lo);
      const w2 = clamp(1 - Math.abs(themeF - 2), 0, 1);
      const info = { W, H, g, rail, ceilY, scroll, t, bass, flash, barPulse, beatPos, beatPhase: beat.beatPhase, drawFiech: engine.drawFiech, px: PX };

      ctx.save();
      if (shakeI > 0.1) ctx.translate((Math.random() - 0.5) * shakeI, (Math.random() - 0.5) * shakeI);
      if (w2 > 0.01) {
        const z = 1 + w2 * (0.012 * flash + 0.01 * bass);
        ctx.translate(W / 2, H / 2);
        ctx.scale(z, z);
        ctx.translate(-W / 2, -H / 2);
      }

      ctx.fillStyle = '#03050a';
      ctx.fillRect(-20, -20, W + 40, H + 40);
      for (let i = 0; i < 3; i++) {
        const w = clamp(1 - Math.abs(themeF - i), 0, 1);
        if (w > 0.01) drawLayer(ctx, i, w, info);
      }

      // Decken-Schiene und Bodenlinie
      ctx.fillStyle = '#05080e';
      ctx.fillRect(-20, -20, W + 40, rail + 20);
      ctx.strokeStyle = flash > 0.3 ? '#fed7aa' : rgba(mixRgb(acc, [251, 146, 60], 0.5), 1);
      ctx.lineWidth = 3;
      ctx.shadowColor = rgba(acc, 1);
      ctx.shadowBlur = fx.glow * (5 + flash * 10);
      ctx.beginPath();
      ctx.moveTo(0, rail);
      ctx.lineTo(W, rail);
      ctx.stroke();
      ctx.strokeStyle = flash > 0.2 ? '#f0fdfa' : rgba(acc, 1);
      ctx.shadowBlur = fx.glow * (6 + flash * 16 + bass * 10);
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(W, g);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Takt-Chevrons auf der Fahrbahn: 1 Beat = 120 px, passend zum Spawn-Raster
      drawChevrons(ctx, { g, SPAWN, B, grid: (beatPos % 1) * B, flash, acc });

      // Telegraph-Markierungen
      for (const m of marks) {
        const on = Math.floor(t * 18) % 2 === 0;
        ctx.fillStyle = on ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.3)';
        ctx.fillRect(m.x, m.y, m.w, m.h);
      }

      const fiechState = {
        beatPhase: beat.beatPhase,
        bassEnergy: bass,
        action: fiech.action,
        lookAtX: PX + SIZE / 2,
        lookAtY: cube.y + SIZE / 2,
        tilt: fiech.tilt,
        squashX: fiech.sx,
        squashY: fiech.sy
      };
      if (Math.abs(fiech.tilt) > 2) {
        fiechState.lookAtX = 2 * fiech.x - (PX + SIZE / 2);
        fiechState.lookAtY = 2 * fiech.y - (cube.y + SIZE / 2);
      }
      const showFiech = fiech.teleState !== 'hidden' && fiech.alpha > 0.02;
      const bgFiech = fiech.size > 100;
      if (bgFiech && showFiech) {
        ctx.globalAlpha = fiech.alpha;
        engine.drawFiech(ctx, fiech.x, fiech.y, fiech.size, fiechState);
        ctx.globalAlpha = 1;
      }

      for (const o of els) drawElement(ctx, o, info);
      drawTeleFx(ctx, teleFx, rail, g);

      for (let i = 0; i < trail.length; i++) {
        const tr = trail[i];
        ctx.save();
        ctx.translate(PX + SIZE / 2 - tr.age * speed, tr.y + SIZE / 2);
        ctx.rotate(tr.rot);
        ctx.globalAlpha = (cube.comet > 0 ? 0.5 : 0.28) * (1 - i / trail.length);
        ctx.fillStyle = cube.comet > 0 ? '#ffffff' : '#34d399';
        ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
        ctx.restore();
      }
      drawCube(ctx, PX, cube, engine.invulnerable, engine, info.beatPhase);

      if (!bgFiech && showFiech) {
        ctx.globalAlpha = fiech.alpha;
        engine.drawFiech(ctx, fiech.x, fiech.y, fiech.size, fiechState);
        ctx.globalAlpha = 1;
      }

      if (laserT > 0 && laserTo && fiechVisible()) {
        const a = laserT / 0.3;
        ctx.strokeStyle = `rgba(207,250,254,${a})`;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = fx.glow * (16);
        ctx.lineWidth = 3 + a * 5;
        ctx.beginPath();
        ctx.moveTo(fiech.x, fiech.y);
        ctx.lineTo(laserTo.x, laserTo.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      for (const r of rings) {
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = clamp(r.life / 0.45, 0, 1);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const q of particles) {
        ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x, q.y, q.size, q.size);
      }
      ctx.globalAlpha = 1;

      // Chromatische Aberration / Glitch im dritten Oberdesign und beim Teleport
      if ((w2 > 0.3 && flash > 0.5) || glitchT > 0) {
        for (let k = 0; k < 4; k++) {
          const y = rail + Math.random() * (g - rail);
          ctx.fillStyle = k % 2 ? 'rgba(168,85,247,0.2)' : 'rgba(34,211,238,0.18)';
          ctx.fillRect((Math.random() - 0.5) * 16, y, W, 2 + Math.random() * 5);
        }
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const c of callouts) {
        const a = clamp(c.life / c.max, 0, 1);
        ctx.globalAlpha = a;
        ctx.font = `900 ${c.size}px sans-serif`;
        const jx = a > 0.8 ? (Math.random() - 0.5) * 3 : 0;
        ctx.fillStyle = 'rgba(239,68,68,0.8)';
        ctx.fillText(c.text, c.x + 1.5 + jx, c.y + 1.5);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, c.x + jx, c.y);
      }
      ctx.globalAlpha = 1;

      // Segment-Zähler
      const n = Math.min(segCount, doneCount + 1);
      const label = options.segmentId ? options.segmentId : n === segCount ? 'FINAL GATE' : n <= 4 ? 'EASY' : n <= 9 ? 'MEDIUM' : 'HARD';
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = rgba(acc, 0.95);
      ctx.fillText(`SEGMENT ${n} / ${segCount} (${label})`, W - 8, rail * 0.5);

      // Phasen-Titel
      if (title) {
        const a = title.t < 0.3 ? title.t / 0.3 : title.t > 1.5 ? (1.9 - title.t) / 0.4 : 1;
        const [big, sub] = title.text.split(' // ');
        ctx.textAlign = 'center';
        ctx.globalAlpha = clamp(a, 0, 1);
        const gj = title.t < 0.6 ? 4 : 1;
        for (const [dx, col] of [
          [-gj, 'rgba(34,211,238,0.8)'],
          [gj, 'rgba(239,68,68,0.8)'],
          [0, '#ffffff']
        ]) {
          ctx.fillStyle = col;
          ctx.font = '900 30px sans-serif';
          ctx.fillText(big, W / 2 + dx, H * 0.27);
          ctx.font = 'bold 13px monospace';
          ctx.fillText(sub, W / 2 + dx, H * 0.27 + 28);
        }
        ctx.globalAlpha = 1;
      }

      if (whiteFlash > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${whiteFlash * 0.7})`;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
      ctx.strokeStyle = rgba(acc, 0.18 + flash * 0.7);
      ctx.lineWidth = 3 + flash * 3;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.restore();
    }
  };
}
