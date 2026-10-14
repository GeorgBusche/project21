import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource } from './stage-utils.js';
import {
  drawBackground,
  drawGlitch,
  drawPillars,
  drawSchnapslatte,
  drawKornBottle,
  drawCrownCap,
  drawBossAura,
  drawCannon,
  drawRing,
  drawCallout,
  drawBanner
} from './stage4-draw.js';

export const W = 360;
export const H = 600;
export const LANES = 4;
export const LANE_W = 76;
export const LANE_X0 = 28;
export const TOP = 175;
export const FLOOR = 465;
export const PLAYER_Y = 430;
export const GLASSES = 10;
export const TELL = 0.6;
export const CHARGE_TIME = 3.2;
export const PAD = { x0: 12, w: 81, gap: 4, y: 486, h: 102 };

const PLANK_V = 300;
const PLANK_HALF = 28;
const CAP_V = 330;
const RAM_V = 520;
const BEAM_LIVE = 0.32;
const TAU = Math.PI * 2;
const RED = '#ef4444';
const GREEN = '#22c55e';
const GOLD = '#facc15';
const STEEL = '#64748b';

// Akzent nur fuer Boss/Banner; Spuren bleiben neutral, damit Rot/Gruen/Gold eindeutig sind
export const PHASES = [
  { accent: '#22d3ee', dark: '#450a0a' },
  { accent: '#a855f7', dark: '#450a0a' },
  { accent: '#60a5fa', dark: '#450a0a' },
  { accent: '#e879f9', dark: '#450a0a' }
];

export const phaseOf = (g) => (g > 7 ? 0 : g > 4 ? 1 : g > 1 ? 2 : 3);
export const laneX = (i) => LANE_X0 + LANE_W * i + LANE_W / 2;
export const padCenter = (i) => ({ x: PAD.x0 + i * (PAD.w + PAD.gap) + PAD.w / 2, y: PAD.y + PAD.h / 2 });
const laneAt = (x) => clamp(Math.floor((x - LANE_X0) / LANE_W), 0, LANES - 1);
const padAt = (x) => clamp(Math.floor((x - PAD.x0) / (PAD.w + PAD.gap)), 0, LANES - 1);
const noise = (n) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

export const plankY = (h, t) => TOP - 20 + PLANK_V * (t - h.liveAt);
const capY = (h, t) => TOP + CAP_V * (t - h.liveAt);
const ramY = (h, t) => 118 + RAM_V * (t - h.liveAt);

// reine Geometrie: trifft Hazard h zum Zeitpunkt tt die Spur lane? m = Sicherheitsrand in px
export function laneHit(h, lane, tt, m = 0) {
  switch (h.kind) {
    case 'plank':
      return tt >= h.liveAt && !h.safe.includes(lane) && Math.abs(plankY(h, tt) - PLAYER_Y) < PLANK_HALF + m;
    case 'beam':
      return h.lanes.includes(lane) && tt >= h.fireAt - m / 300 && tt <= h.fireAt + BEAM_LIVE + m / 300;
    case 'cap':
      return h.lane === lane && tt >= h.liveAt && Math.abs(capY(h, tt) - PLAYER_Y) < 34 + m;
    case 'ram':
      return h.lanes.includes(lane) && tt >= h.liveAt && Math.abs(ramY(h, tt) - PLAYER_Y) < 44 + m;
    default:
      return false;
  }
}

const hazardDone = (h, t) => {
  switch (h.kind) {
    case 'plank':
      return plankY(h, t) > 540;
    case 'beam':
      return t > h.fireAt + BEAM_LIVE + 0.15;
    case 'cap':
      return capY(h, t) > 520;
    default:
      return ramY(h, t) > 560;
  }
};

const dangerLanes = (h) => (h.kind === 'plank' ? [0, 1, 2, 3].filter((l) => !h.safe.includes(l)) : h.kind === 'cap' ? [h.lane] : h.lanes);
const liveAtOf = (h) => (h.kind === 'beam' ? h.fireAt : h.liveAt);

export function createStage4(random = Math.random) {
  const text = CONTENT.declineGame.arcade.stage4;
  const calls = text.calls;
  let engine;
  let tick;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let t = 0;
  let ts = 1;
  let glasses = GLASSES;
  let phase = 0;
  let mode = 'shield';
  let shieldBeats = 4;
  let wait = 0;
  let patIdx = 0;
  let beatNo = 0;
  let charge = 0;
  let nCounter = 0;
  let completed = false;

  let lane = 1;
  let px = laneX(1);
  let dashInv = 0;
  let squash = 0;
  let trail = [];
  let touch = null;
  let padDown = -1;
  let prevKeys = { l: false, r: false, d: [false, false, false, false] };

  let hazards = [];
  let capsules = [];
  let sparks = [];
  let pillars = [];
  let broken = {};
  let overBeam = null;
  let callout = { text: '', color: '#fff', t: 0 };
  let bannerT = 0;
  let barPulse = 0;
  let flash = 0;
  let bossFlash = 0;
  let glassFlash = 0;
  let shakeUntil = 0;
  let slamT = 0;
  let smashT = 0;
  let koT = 0;

  const rand = (a, b) => a + random() * (b - a);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  const bl = () => 60 / (beat.bpm || 105);
  const say = (s, color = '#ffffff') => {
    callout = { text: s, color, t: 1 };
  };

  function burst(x, y, color, count, power = 120, size = 3) {
    for (let i = 0; i < count && sparks.length < 300; i++) {
      const a = random() * TAU;
      const v = (0.25 + random() * 0.75) * power;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + random() * 0.7, color, size: 2 + random() * size });
    }
  }

  function hurt() {
    if (dashInv > 0) return;
    if (engine.hit()) flash = Math.max(flash, 0.3);
  }

  function setLane(l) {
    l = clamp(l, 0, LANES - 1);
    if (l === lane || mode === 'ko') return;
    lane = l;
    dashInv = 0.14;
    squash = 1;
    engine.beep(520 + l * 90, 'square', 0.05, 0.025);
  }

  // ---------------------------------------------------------------- Boss-HP

  function shatter(i) {
    broken[i] = true;
    const gx = W / 2 - 150 + 30 * (i + 0.5);
    burst(gx, 24, i % 2 ? '#22d3ee' : '#fbbf24', 18, 200, 4);
    burst(gx, 24, '#e5e7eb', 8, 160, 2);
    engine.shake(0.25);
    engine.beep(1200, 'square', 0.08, 0.04);
    engine.beep(300, 'sawtooth', 0.18, 0.04);
    glassFlash = 1;
  }

  function counter() {
    if (mode !== 'fight' || glasses <= 1) return;
    glasses--;
    shatter(glasses);
    overBeam = { t: 0.35, x: laneX(lane) };
    bossFlash = 1;
    engine.addScore(100);
    say(calls.counter[nCounter++ % calls.counter.length], GOLD);
    const np = phaseOf(glasses);
    if (np !== phase) startShield(np);
  }

  // ---------------------------------------------------------------- Phasen

  function startShield(np) {
    phase = np;
    mode = 'shield';
    shieldBeats = 3;
    for (const h of hazards) for (const l of dangerLanes(h)) burst(laneX(l), 250, RED, 3, 120);
    hazards = [];
    capsules = [];
    patIdx = 0;
    wait = 0;
    bannerT = 1;
    barPulse = 1;
    flash = 0.6;
    engine.shake(0.4);
    engine.beep(120, 'sawtooth', 0.45, 0.04, 40);
  }

  function startSmash() {
    mode = 'smash';
    ts = 0.35;
    smashT = 0;
    hazards = [];
    capsules = [];
    flash = 0.8;
    say(calls.smash, GREEN);
    engine.beep(90, 'sawtooth', 0.6, 0.05, 30);
  }

  function startKo() {
    mode = 'ko';
    ts = 1;
    koT = 0;
    glasses = 0;
    shatter(0);
    for (let i = 0; i < 60; i++) {
      const col = ['#ffffff', RED, '#fbbf24', '#22d3ee', '#e5e7eb'][i % 5];
      burst(180, 104, col, 1, 380, 5);
    }
    flash = 1;
    engine.addScore(500);
    engine.shake(0.9);
    say(calls.ko, '#ffffff');
    engine.beep(70, 'sawtooth', 0.8, 0.05, 25);
  }

  // ---------------------------------------------------------------- Angriffe (Dauer in Beats)

  function spawnCapsule(l, born, life = 3) {
    if (glasses <= 1) return;
    capsules.push({ lane: l, born, life });
  }

  function patSlam() {
    const safe = Math.floor(random() * LANES);
    hazards.push({ kind: 'plank', safe: [safe], tellAt: t, liveAt: t + TELL });
    spawnCapsule(safe, t + 0.1);
    slamT = 0.7;
    say(calls.slam, '#fecaca');
    engine.beep(140, 'square', 0.2, 0.04, 70);
    return 5;
  }

  function patBeam() {
    const lanes = [0, 1, 2, 3].sort(() => random() - 0.5).slice(0, 2);
    hazards.push({ kind: 'beam', lanes, tellAt: t, fireAt: t + TELL });
    spawnCapsule(pick([0, 1, 2, 3].filter((l) => !lanes.includes(l))), t);
    slamT = 0.7;
    say(calls.beam, '#fca5a5');
    engine.beep(240, 'sawtooth', 0.4, 0.04, 600);
    return 5;
  }

  function patShake() {
    const nb = lane === 0 ? 1 : lane === 3 ? 2 : lane + (random() < 0.5 ? -1 : 1);
    const lanes = [lane, nb];
    hazards.push({ kind: 'ram', lanes, tellAt: t, liveAt: t + 0.8 });
    for (const l of lanes) pillars.push({ x: laneX(l), y: 120, t0: t, life: 0.5, color: PHASES[phase].accent });
    shakeUntil = t + 0.9;
    slamT = 0.9;
    say(calls.shake, '#4ade80');
    engine.beep(80, 'sawtooth', 0.5, 0.04, 40);
    return 5;
  }

  function patSaw() {
    for (let w = 0; w < 2; w++) {
      const free = Math.floor(random() * LANES);
      const at = t + w * 2 * bl();
      for (let l = 0; l < LANES; l++) if (l !== free) hazards.push({ kind: 'cap', lane: l, tellAt: at, liveAt: at + TELL });
      spawnCapsule(free, at + 0.1, 2.6);
    }
    say(calls.saw, '#fca5a5');
    engine.beep(520, 'square', 0.05, 0.02);
    return 6;
  }

  function patBlitz() {
    const step = bl() < 0.55 ? 2 * bl() : bl();
    for (let k = 0; k < 4; k++) {
      const fireAt = t + TELL + k * step;
      hazards.push({ kind: 'beam', lanes: k % 2 === 0 ? [0, 2] : [1, 3], tellAt: fireAt - TELL, fireAt });
      if (k % 2 === 0) capsules.push({ lane: pick([1, 3]), born: fireAt - 0.95, life: 1.3 });
    }
    say(calls.blitz, '#fca5a5');
    slamT = 1.2;
    engine.beep(240, 'sawtooth', 0.4, 0.04, 600);
    return Math.ceil((TELL + 4 * step) / bl()) + 1;
  }

  function patFinale() {
    const s1 = Math.floor(random() * LANES);
    let s2 = Math.floor(random() * LANES);
    if (s2 === s1 && random() < 0.5) s2 = (s2 + 1) % LANES;
    hazards.push({ kind: 'plank', safe: [s1], tellAt: t, liveAt: t + TELL });
    hazards.push({ kind: 'plank', safe: [s2], ring: true, tellAt: t + TELL + 0.5, liveAt: t + TELL + 1.1 });
    slamT = 1.2;
    say(calls.slam, '#fecaca');
    engine.beep(100, 'sawtooth', 0.4, 0.05, 50);
    return 9;
  }

  const SEQ = [[patSlam, patBeam], [patShake, patSaw], [patBlitz], [patFinale]];

  function onBeat() {
    beatNo++;
    if (beatNo % 4 === 0) barPulse = 1;
    if (mode === 'shield') {
      if (--shieldBeats <= 0) {
        mode = 'fight';
        wait = 0;
      }
      return;
    }
    if (mode !== 'fight') return;
    if (--wait <= 0) {
      const seq = SEQ[phase];
      wait = seq[patIdx++ % seq.length]();
    }
  }

  // ---------------------------------------------------------------- Update

  function updateInput() {
    const keys = engine.keys;
    const l = keys.has('arrowleft') || keys.has('a');
    const r = keys.has('arrowright') || keys.has('d');
    const ds = ['1', '2', '3', '4'].map((k) => keys.has(k));
    if (l && !prevKeys.l) setLane(lane - 1);
    if (r && !prevKeys.r) setLane(lane + 1);
    ds.forEach((d, i) => d && !prevKeys.d[i] && setLane(i));
    prevKeys = { l, r, d: ds };
  }

  function updateHazards() {
    for (const h of hazards) {
      if (h.kind === 'beam' && !h.fired && t >= h.fireAt) {
        h.fired = true;
        engine.shake(0.2);
        engine.beep(110, 'sawtooth', 0.35, 0.05, 50);
      }
      if (laneHit(h, lane, t)) hurt();
      if (h.ring && mode === 'fight' && h.safe[0] === lane && t >= h.liveAt && Math.abs(plankY(h, t) - PLAYER_Y) < 34) {
        startSmash();
        return;
      }
    }
    hazards = hazards.filter((h) => !hazardDone(h, t));
  }

  return {
    get color() {
      return PHASES[phase].accent;
    },
    drawsOwnBackground: true,
    init(e) {
      engine = e;
      tick = createBeatSource();
      lane = 1;
      px = laneX(1);
      startShield(0);
      shieldBeats = 4;
      barPulse = 0;
      flash = 0;
    },
    progress: () => 1 - glasses / GLASSES,
    stress: () => Math.min(1, 0.4 + phase * 0.15),
    onTouch(ev) {
      if (mode === 'ko') return;
      if (ev.type === 'down') {
        touch = { x0: ev.x, pad: ev.y >= PAD.y - 12, moved: false };
        if (touch.pad) {
          padDown = padAt(ev.x);
          setLane(padDown);
        }
      } else if (ev.type === 'move' && touch) {
        if (touch.pad) {
          padDown = padAt(ev.x);
          setLane(padDown);
        } else if (Math.abs(ev.x - touch.x0) > 45) {
          setLane(lane + Math.sign(ev.x - touch.x0));
          touch.x0 = ev.x;
          touch.moved = true;
        }
      } else if (ev.type === 'up') {
        if (touch && !touch.pad && !touch.moved) {
          const x = touch.x0;
          if (x >= LANE_X0 && x <= LANE_X0 + LANES * LANE_W) setLane(laneAt(x));
          else setLane(lane + (x < LANE_X0 ? -1 : 1));
        }
        touch = null;
        padDown = -1;
      }
    },
    debug: () => ({
      hazards,
      capsules,
      t,
      lane,
      mode,
      phase,
      glasses,
      charge,
      dangerLane: (l, ahead, m = 0) => hazards.some((h) => laneHit(h, l, t + ahead, m))
    }),
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      const wdt = dt * ts;
      t += wdt;
      updateInput();
      px += (laneX(lane) - px) * Math.min(1, dt * 14);
      if (Math.abs(laneX(lane) - px) > 3) trail.push({ x: px, a: 1 });
      for (const g of trail) g.a -= dt * 6;
      trail = trail.filter((g) => g.a > 0);
      dashInv = Math.max(0, dashInv - dt);
      squash = Math.max(0, squash - dt * 7);
      slamT = Math.max(0, slamT - dt);
      flash = Math.max(0, flash - dt * 2.2);
      bossFlash = Math.max(0, bossFlash - dt * 5);
      glassFlash = Math.max(0, glassFlash - dt * 3);
      barPulse = Math.max(0, barPulse - dt * 2.6);
      callout.t = Math.max(0, callout.t - dt * 0.9);
      bannerT = Math.max(0, bannerT - dt * 0.42);
      if (overBeam) {
        overBeam.t -= dt;
        if (overBeam.t <= 0) overBeam = null;
      }
      for (const s of sparks) {
        s.x += s.vx * wdt;
        s.y += s.vy * wdt;
        s.vy += 170 * wdt;
        s.life -= wdt;
      }
      sparks = sparks.filter((s) => s.life > 0);
      pillars = pillars.filter((p) => t - p.t0 < p.life);

      if (mode === 'ko') {
        koT += dt;
        if (koT >= 2.4 && !completed) {
          completed = true;
          engine.complete();
        }
        return;
      }
      if (mode === 'smash') {
        smashT += dt;
        if (smashT >= 0.25 && !overBeam) overBeam = { t: 0.55, x: laneX(lane) };
        if (smashT >= 0.8) startKo();
        return;
      }

      if (beat.isBeat) onBeat();
      if (mode === 'fight' && t < shakeUntil) {
        engine.shake(0.04);
      }
      if (mode !== 'fight') return;
      updateHazards();
      if (mode !== 'fight') return;

      for (const c of capsules) {
        if (t < c.born) continue;
        const y = Math.min(PLAYER_Y, TOP + ((t - c.born) / 0.9) * (PLAYER_Y - TOP));
        if (c.lane === lane && y >= PLAYER_Y - 40) {
          c.life = 0;
          c.taken = true;
          counter();
          if (mode !== 'fight') break;
        } else if (t - c.born > c.life) c.dead = true;
      }
      capsules = capsules.filter((c) => !c.dead && !c.taken);

      if (glasses > 1) {
        charge += wdt / CHARGE_TIME;
        if (charge >= 1) {
          charge = 0;
          counter();
        }
      }
    },
    render(ctx) {
      const P = PHASES[phase];
      const ac = P.accent;
      const bx = 180 + Math.sin(t * 0.9) * 22 + (t < shakeUntil ? Math.sin(t * 70) * 5 : 0);
      const by = 116 + Math.sin(t * 1.7) * 3;
      drawBackground(ctx, { t, beat, accent: ac, barPulse });
      drawPillars(ctx, pillars, t);

      // Spuren
      ctx.fillStyle = '#06060b';
      ctx.fillRect(LANE_X0, TOP, LANES * LANE_W, FLOOR - TOP);
      ctx.fillStyle = ac;
      ctx.globalAlpha = 0.07;
      ctx.fillRect(LANE_X0 + lane * LANE_W, TOP, LANE_W, FLOOR - TOP);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = STEEL;
      ctx.lineWidth = 1;
      for (let i = 0; i <= LANES; i++) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(LANE_X0 + i * LANE_W, TOP);
        ctx.lineTo(LANE_X0 + i * LANE_W, FLOOR);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = ac;
      ctx.fillRect(LANE_X0 - 4, FLOOR, LANES * LANE_W + 8, 3);

      // Ankuendigungen
      const warned = new Set();
      for (const h of hazards) {
        if (t >= liveAtOf(h)) continue;
        for (const l of dangerLanes(h)) {
          if (warned.has(l)) continue;
          warned.add(l);
          drawDanger(ctx, l, t);
        }
        if (h.kind === 'plank') for (const s of h.safe) drawSafe(ctx, s, t, h.ring);
      }

      // Boss
      const hold = mode === 'ko' ? 0 : 1;
      if (hold) {
        const charging = hazards.some((h) => t < liveAtOf(h)) ? 1 : 0.15;
        drawBossAura(ctx, bx, by, t, ac, charging, P.dark);
        drawCannon(ctx, bx - 66, by + 8, -1, t, ac, charging);
        drawCannon(ctx, bx + 66, by + 8, 1, t, ac, charging);
        const beams = hazards.filter((h) => h.kind === 'beam' && t < h.fireAt + BEAM_LIVE);
        if (beams.length) {
          drawKornBottle(ctx, bx - 100, by + 6, -0.3, 1.5, { glow: RED });
          drawKornBottle(ctx, bx + 100, by + 6, 0.3, 1.5, { glow: RED });
        }
        engine.drawFiech(ctx, bx, by, 86, {
          beatPhase: beat.beatPhase,
          action: slamT > 0 ? 'slam' : 'hover',
          tilt: t < shakeUntil ? Math.sin(t * 70) * 0.12 : Math.sin(t * 2) * 0.05
        });
        if (bossFlash > 0.05) {
          ctx.globalAlpha = bossFlash * 0.45;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx, by, 42, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (mode === 'shield') drawRing(ctx, bx, by, 60 + 3 * Math.sin(t * 8), '#ffffff', 0.6, 3, [10, 8]);
      }

      for (const h of hazards) drawHazardBody(ctx, h, t, engine);
      for (const c of capsules) drawCapsuleLane(ctx, c, t);

      // Spieler
      for (const g of trail) {
        ctx.globalAlpha = Math.max(0, g.a) * 0.5;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(g.x - 11, PLAYER_Y - 11, 22, 22);
      }
      ctx.globalAlpha = 1;
      if (mode !== 'ko') {
        ctx.save();
        ctx.translate(px, PLAYER_Y + 14);
        ctx.scale(1 + squash * 0.25, 1 - squash * 0.2);
        engine.drawPlayer(ctx, 0, -14, 30, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: dashInv > 0 ? '#22d3ee' : '#ffffff' });
        ctx.restore();
        if (dashInv > 0) drawRing(ctx, px, PLAYER_Y, 22, '#22d3ee', 0.8, 2);
      }

      // Konter-Strahl
      if (overBeam) {
        const k = Math.min(1, overBeam.t / 0.3);
        ctx.fillStyle = GOLD;
        ctx.fillRect(overBeam.x - 10 * k - 2, by, 20 * k + 4, PLAYER_Y - by);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(overBeam.x - 3 * k - 1, by, 6 * k + 2, PLAYER_Y - by);
      }

      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life / 0.5, 0, 1);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      drawSchnapslatte(ctx, W / 2, 38, 300, {
        alive: mode === 'ko' ? 0 : glasses,
        partial: 1,
        accent: ac,
        t,
        flash: glassFlash + bossFlash,
        broken,
        count: GLASSES
      });
      drawDeck(ctx, t, ac, lane, padDown, charge, glasses > 1);
      drawGlitch(ctx, t, barPulse, ac);
      drawBanner(ctx, phase, text, ac, mode === 'shield' ? bannerT : 0);
      drawCallout(ctx, callout.text, callout.color, callout.t);
      if (flash > 0.01) {
        ctx.globalAlpha = clamp(flash, 0, 1) * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
  };
}

// ---------------------------------------------------------------- Zeichnen

function drawDanger(ctx, l, t) {
  const x = LANE_X0 + l * LANE_W;
  const pulse = 0.5 + 0.5 * Math.sin(t * 16);
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.18 + 0.12 * pulse;
  ctx.fillRect(x, TOP, LANE_W, FLOOR - TOP);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, TOP, LANE_W, FLOOR - TOP);
  ctx.clip();
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 6;
  const off = (t * 50) % 28;
  ctx.beginPath();
  for (let o = -300; o < LANE_W; o += 28) {
    ctx.moveTo(x + o + off, FLOOR);
    ctx.lineTo(x + o + off + 290, TOP);
  }
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, TOP + 1, LANE_W - 2, FLOOR - TOP - 2);
  // Warndreieck auf Spielerhoehe
  if (pulse > 0.25) {
    const cx = x + LANE_W / 2;
    ctx.globalAlpha = 1;
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.moveTo(cx, 372);
    ctx.lineTo(cx + 22, 410);
    ctx.lineTo(cx - 22, 410);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, 383, 4, 14);
    ctx.fillRect(cx - 2, 401, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawSafe(ctx, l, t, ring) {
  const x = LANE_X0 + l * LANE_W;
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.13 + 0.06 * Math.sin(t * 8);
  ctx.fillRect(x, TOP, LANE_W, FLOOR - TOP);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, TOP + 2, LANE_W - 4, FLOOR - TOP - 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ring ? '★ SMASH' : CONTENT.declineGame.arcade.stage4.calls.safe, x + LANE_W / 2, 395);
}

function drawPlankBlock(ctx, x, y, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#450a0a';
  ctx.fillRect(x + 2, y - 17, LANE_W - 4, 34);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(x + 4, y - 15, LANE_W - 8, 30);
  ctx.fillStyle = '#fee2e2';
  ctx.fillRect(x + 12, y - 7, LANE_W - 24, 14);
  ctx.fillStyle = RED;
  for (let k = 0; k < 5; k++) {
    const sx = x + 6 + k * 13;
    ctx.beginPath();
    ctx.moveTo(sx, y + 15);
    ctx.lineTo(sx + 12, y + 15);
    ctx.lineTo(sx + 6, y + 26);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#7f1d1d';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + 12 + k * 22, y - 17);
    ctx.lineTo(x + 28 + k * 22, y - 17);
    ctx.lineTo(x + 26 + k * 22, y - 27);
    ctx.lineTo(x + 14 + k * 22, y - 27);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHazardBody(ctx, h, t, engine) {
  const live = t >= liveAtOf(h);
  if (h.kind === 'plank') {
    const y = live ? plankY(h, t) : TOP - 20;
    ctx.fillStyle = '#1c1210';
    ctx.globalAlpha = live ? 1 : 0.5;
    ctx.fillRect(LANE_X0, y - 5, LANES * LANE_W, 10);
    for (let l = 0; l < LANES; l++) if (!h.safe.includes(l)) drawPlankBlock(ctx, LANE_X0 + l * LANE_W, y, live ? 1 : 0.5);
    ctx.globalAlpha = 1;
    if (h.ring && live) {
      const cx = laneX(h.safe[0]);
      drawRing(ctx, cx, y, 30 + 3 * Math.sin(t * 12), GREEN, 1, 4);
      drawRing(ctx, cx, y, 20, GOLD, 1, 3, [6, 5]);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FINAL SMASH!', cx, y - 38);
    }
  } else if (h.kind === 'beam') {
    if (!live || t > h.fireAt + BEAM_LIVE) return;
    for (const l of h.lanes) {
      const x = laneX(l);
      const f = Math.floor(t * 40) % 2 ? 4 : 0;
      ctx.fillStyle = RED;
      ctx.fillRect(x - 26 - f, TOP, 52 + 2 * f, FLOOR - TOP);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 9, TOP, 18, FLOOR - TOP);
    }
  } else if (h.kind === 'cap') {
    if (!live) return;
    const y = capY(h, t);
    const x = laneX(h.lane);
    drawCrownCap(ctx, x, y, 26, t * 9, RED);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
  } else if (h.kind === 'ram') {
    const y = live ? ramY(h, t) : 118;
    for (const l of h.lanes) {
      const x = laneX(l);
      ctx.globalAlpha = live ? 1 : 0.35;
      engine.drawFiech(ctx, x, y, 64, { beatPhase: 0, action: 'slam', tilt: 0 });
      ctx.globalAlpha = 1;
      drawRing(ctx, x, y, 40, RED, live ? 1 : 0.5, 3, [6, 5]);
      if (live) {
        ctx.fillStyle = RED;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(x + k * 18 - 7, y + 34);
          ctx.lineTo(x + k * 18 + 7, y + 34);
          ctx.lineTo(x + k * 18, y + 48);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

function drawCapsuleLane(ctx, c, t) {
  if (t < c.born) return;
  const k = Math.min(1, (t - c.born) / 0.9);
  const y = TOP + k * (PLAYER_Y - TOP);
  const x = laneX(c.lane);
  const left = c.life - (t - c.born);
  if (left < 0.8 && Math.floor(t * 12) % 2) return;
  drawRing(ctx, x, y, 22 + 3 * Math.sin(t * 8), GOLD, 0.8, 3);
  drawCrownCap(ctx, x, y, 13, t * 3, GOLD);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(CONTENT.declineGame.arcade.stage4.calls.hit, x, y - 30);
}

// Cyber-Deck in der Daumen-Zone
function drawDeck(ctx, t, ac, lane, padDown, charge, charging) {
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, FLOOR + 4, W, H - FLOOR - 4);
  ctx.fillStyle = STEEL;
  ctx.fillRect(0, FLOOR + 4, W, 1);
  // Konter-Ladung
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(28, 473, 304, 6);
  ctx.fillStyle = GOLD;
  ctx.fillRect(28, 473, 304 * (charging ? charge : 1), 6);
  for (let i = 0; i < LANES; i++) {
    const x = PAD.x0 + i * (PAD.w + PAD.gap);
    const on = lane === i;
    ctx.fillStyle = on ? ac : '#0f1018';
    ctx.globalAlpha = on ? 0.95 : 1;
    ctx.fillRect(x, PAD.y, PAD.w, PAD.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = on ? '#ffffff' : padDown === i ? '#ffffff' : ac;
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeRect(x + 1, PAD.y + 1, PAD.w - 2, PAD.h - 2);
    ctx.fillStyle = on ? '#02040a' : ac;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + PAD.w / 2, PAD.y + PAD.h / 2 + 12);
    if (on) {
      ctx.fillRect(x + 10, PAD.y + 8, PAD.w - 20, 3);
    }
  }
}
