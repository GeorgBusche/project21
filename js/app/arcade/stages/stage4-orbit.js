import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource } from './stage-utils.js';
import {
  drawBackground,
  drawGlitch,
  drawPillars,
  drawKornBottle,
  drawAhoiPack,
  drawCrownCap,
  drawBossAura,
  drawRing,
  drawCallout,
  drawBanner
} from './stage4-draw.js';

export const W = 360;
export const H = 600;
export const CX = 180;
export const CY = 255;
export const R = 132;
export const OMEGA = 2.3;
export const GLASSES = 10;
export const CHARGE_TIME = 3.4;
export const PLAYER_HALF = 0.075; // Winkel-Halbbreite des Spielers auf der Schiene
export const COCKPIT_Y = 445;

const TAU = Math.PI * 2;
const TELL = 0.95;
const SPOKE_HALF = 0.28;
const SPOKE_DUR = 0.45;
const FLAME_DUR = 1.0;
const FLAME_HALF = 0.2;
const GEYSER_HALF = 0.3;
const GEYSER_DUR = 0.4;
const ARC_DUR = 0.35;
const BEAM_HALF = 0.1;
const HOLD_TIME = 0.18;
const RED = '#ef4444';
const GREEN = '#22c55e';
const GOLD = '#facc15';

export const PHASES = [
  { accent: '#22d3ee', dark: '#450a0a' },
  { accent: '#4ade80', dark: '#450a0a' },
  { accent: '#f59e0b', dark: '#450a0a' },
  { accent: '#e879f9', dark: '#450a0a' }
];

export const phaseOf = (g) => (g >= 8 ? 0 : g >= 5 ? 1 : g >= 2 ? 2 : 3);
export const wrap = (a) => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const dAng = (a, b) => Math.abs(wrap(a - b));
const ringPt = (a, r = R) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
const noise = (n) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

export const liveAtOf = (h) => (h.kind === 'bottle' ? h.landAt : h.liveAt);
const endOf = (h) => {
  switch (h.kind) {
    case 'spokes':
      return h.liveAt + SPOKE_DUR;
    case 'bottle':
      return h.landAt + FLAME_DUR;
    case 'arcs':
      return h.liveAt + ARC_DUR;
    case 'geys':
      return h.liveAt + GEYSER_DUR;
    default:
      return h.liveAt + h.dur;
  }
};
export const beamAngle = (h, tt) => h.a0 + h.sw * clamp((tt - h.liveAt) / h.dur, 0, 1);

// reine Geometrie: trifft Hazard h zum Zeitpunkt tt einen Spieler auf Winkel ang? m = Sicherheitsrand in rad
export function hazardHit(h, ang, tt, m = 0) {
  if (tt < liveAtOf(h) || tt > endOf(h)) return false;
  const pm = PLAYER_HALF + m;
  switch (h.kind) {
    case 'spokes':
      for (let k = 0; k < h.count; k++) if (dAng(ang, h.base + (k * TAU) / h.count) < SPOKE_HALF + pm) return true;
      return false;
    case 'bottle':
      return dAng(ang, h.angle) < FLAME_HALF + pm;
    case 'arcs':
      return dAng(ang, h.center) < h.half + pm;
    case 'geys':
      return dAng(ang, h.angle) < GEYSER_HALF + pm;
    case 'laser': {
      const b = beamAngle(h, tt);
      return dAng(ang, b) < BEAM_HALF + pm || dAng(ang, b + Math.PI) < BEAM_HALF + pm;
    }
    default:
      return false;
  }
}

const hazardDone = (h, t) => t > endOf(h);
export const glassAngle = (i, t) => -Math.PI / 2 + (i * TAU) / GLASSES + t * 0.25;

export function createStage4(random = Math.random) {
  const text = CONTENT.declineGame.arcade.stage4;
  const calls = text.calls;
  let engine;
  let tick;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let t = 0;
  let clock = 0;
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

  let ang = Math.PI / 2;
  let dir = 1;
  let burst = 0;
  let trail = [];
  let down = null;
  let holdDir = 0;
  let prevKeys = { l: false, r: false, s: false };

  let hazards = [];
  let capsules = [];
  let finalCap = null;
  let sparks = [];
  let pillars = [];
  let broken = {};
  let overBeam = null;
  let callout = { text: '', color: '#fff', t: 0 };
  let bannerT = 0;
  let barPulse = 0;
  let flash = 0;
  let bossFlash = 0;
  let shakeUntil = 0;
  let slamT = 0;
  let smashT = 0;
  let smashFrom = 0;
  let koT = 0;
  let swDir = 1;

  const rand = (a, b) => a + random() * (b - a);
  const bl = () => 60 / (beat.bpm || 105);
  const say = (s, color = '#ffffff') => {
    callout = { text: s, color, t: 1 };
  };

  function spark(x, y, color, count, power = 120, size = 3) {
    for (let i = 0; i < count && sparks.length < 320; i++) {
      const a = random() * TAU;
      const v = (0.25 + random() * 0.75) * power;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + random() * 0.7, color, size: 2 + random() * size });
    }
  }

  function hurt() {
    if (engine.hit()) flash = Math.max(flash, 0.3);
  }

  function reverse() {
    dir = -dir;
    burst = 0.12;
    engine.beep(440, 'square', 0.04, 0.02);
  }

  // ---------------------------------------------------------------- Boss-HP

  function shatter(i) {
    broken[i] = true;
    const p = ringPt(glassAngle(i, t), 66);
    spark(p.x, p.y, i % 2 ? '#22d3ee' : '#fbbf24', 18, 210, 4);
    spark(p.x, p.y, '#e5e7eb', 8, 160, 2);
    engine.shake(0.25);
    engine.beep(1200, 'square', 0.08, 0.04);
    engine.beep(300, 'sawtooth', 0.18, 0.04);
  }

  function counter() {
    if (mode !== 'fight' || glasses <= 1) return;
    glasses--;
    shatter(glasses);
    const p = ringPt(ang);
    overBeam = { t: 0.35, x: p.x, y: p.y };
    bossFlash = 1;
    charge = 0;
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
    for (const h of hazards) {
      const p = ringPt(h.angle ?? h.center ?? h.base ?? h.a0 ?? 0);
      spark(p.x, p.y, RED, 4, 120);
    }
    hazards = [];
    capsules = [];
    finalCap = null;
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
    smashFrom = ang;
    hazards = [];
    capsules = [];
    finalCap = null;
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
    for (let i = 0; i < 70; i++) spark(CX, CY, ['#ffffff', RED, '#fbbf24', '#22d3ee', '#e5e7eb', '#fb923c'][i % 6], 1, 400, 5);
    flash = 1;
    engine.addScore(500);
    engine.shake(0.9);
    say(calls.ko, '#ffffff');
    engine.beep(70, 'sawtooth', 0.8, 0.05, 25);
  }

  // ---------------------------------------------------------------- Angriffe (Rueckgabe: Beats bis zum naechsten Angriff)

  function addCap(angle, born, life = 3) {
    if (glasses > 1) capsules.push({ angle, born, life });
  }

  function patSpokes() {
    const base = rand(0, TAU);
    hazards.push({ kind: 'spokes', base, count: 3, tellAt: t, liveAt: t + TELL + 0.05 });
    addCap(base + Math.PI / 3 + (Math.floor(random() * 3) * TAU) / 3, t + 0.2);
    slamT = 0.7;
    say(calls.spokes, '#fecaca');
    engine.beep(140, 'square', 0.2, 0.04, 70);
    return 6;
  }

  function predictAng(after) {
    return ang + dir * OMEGA * after;
  }

  function patMortar() {
    const targets = [];
    for (let k = 0; k < 2; k++) {
      const throwAt = t + k * 1.1 * bl() * 2;
      const landAt = throwAt + 1.15;
      let target = predictAng(landAt - t) + rand(-0.4, 0.4);
      if (k === 1 && dAng(target, targets[0]) < 0.9) target += 1.4;
      targets.push(target);
      hazards.push({ kind: 'bottle', angle: target, throwAt, landAt, rot: rand(0, TAU) });
    }
    addCap(targets[0] + Math.PI, t + 0.4, 3.4);
    slamT = 0.7;
    say(calls.mortar, '#fca5a5');
    engine.beep(200, 'square', 0.12, 0.04, 90);
    return 7;
  }

  function patHalf() {
    const lead = Math.max(1.15, bl() * 1.9);
    const center = ang + Math.PI + rand(-0.5, 0.5);
    hazards.push({ kind: 'arcs', center, half: Math.PI / 2, tellAt: t, liveAt: t + lead });
    addCap(center + Math.PI, t + lead + 0.2, 3);
    shakeUntil = t + lead;
    slamT = lead;
    say(calls.shake, '#4ade80');
    engine.beep(80, 'sawtooth', 0.5, 0.04, 40);
    return 7;
  }

  function patGeysers() {
    const s = random() < 0.5 ? 1 : -1;
    const a0 = rand(0, TAU);
    for (let k = 0; k < 4; k++) {
      const liveAt = t + 1.0 + k * bl() * 1.3;
      hazards.push({ kind: 'geys', angle: a0 + s * k * 1.45, tellAt: liveAt - TELL, liveAt, color: k % 3 });
    }
    addCap(a0 + s * 0.72, t + 0.5, 3);
    addCap(a0 + s * 2.18, t + 0.5 + bl() * 2.4, 3);
    say(calls.geysir, '#f43f5e');
    engine.beep(260, 'triangle', 0.25, 0.04, 700);
    return 9;
  }

  function patLaser() {
    swDir = -swDir;
    const lead = Math.max(1.15, bl() * 1.9);
    const dur = Math.max(1.8, bl() * 3.2);
    const a0 = ang + Math.PI / 2 * (random() < 0.5 ? 1 : -1);
    hazards.push({ kind: 'laser', a0, sw: swDir * 2.44, tellAt: t, liveAt: t + lead, dur });
    addCap(a0 + Math.PI / 2, t + lead * 0.5, 2.2);
    addCap(a0 + (3 * Math.PI) / 2 + swDir * 1.2, t + lead + dur * 0.4, 2.2);
    slamT = lead + dur;
    say(calls.laser, '#fca5a5');
    engine.beep(240, 'sawtooth', 0.4, 0.04, 600);
    return Math.ceil((lead + dur) / bl()) + 2;
  }

  function patFinale() {
    const base = rand(0, TAU);
    const l1 = t + TELL + 0.05;
    const l2 = l1 + 1.4;
    hazards.push({ kind: 'spokes', base, count: 3, tellAt: t, liveAt: l1 });
    hazards.push({ kind: 'spokes', base: base + Math.PI / 3, count: 3, tellAt: l2 - TELL - 0.05, liveAt: l2 });
    finalCap = { angle: base + Math.PI / 3 + Math.PI / 3, born: l1 + SPOKE_DUR + 0.15, life: 3.2 };
    slamT = 1.4;
    say(calls.spokes, '#fecaca');
    engine.beep(100, 'sawtooth', 0.4, 0.05, 50);
    return 9;
  }

  const SEQ = [[patSpokes, patMortar], [patHalf, patGeysers], [patLaser], [patFinale]];

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

  function updateInput(dt) {
    const keys = engine.keys;
    const l = keys.has('arrowleft') || keys.has('a');
    const r = keys.has('arrowright') || keys.has('d');
    const s = keys.has(' ');
    if (l && !prevKeys.l) {
      if (dir !== -1) reverse();
    } else if (r && !prevKeys.r) {
      if (dir !== 1) reverse();
    }
    if (s && !prevKeys.s) reverse();
    prevKeys = { l, r, s };
    // Gedrueckthalten: linke/rechte Bildschirmhaelfte gibt die Richtung vor
    if (down && clock - down.at >= HOLD_TIME) {
      down.held = true;
      const px = engine.pointer?.x;
      if (Number.isFinite(px)) {
        const want = px < W / 2 ? -1 : 1;
        if (want !== dir) reverse();
        holdDir = want;
      }
    }
  }

  function updateHazards() {
    const p = ang;
    for (const h of hazards) {
      if (h.kind === 'bottle' && !h.landed && t >= h.landAt) {
        h.landed = true;
        const q = ringPt(h.angle);
        spark(q.x, q.y, '#cbd5e1', 10, 150);
        engine.shake(0.12);
        engine.beep(180, 'square', 0.12, 0.04, 60);
      }
      if ((h.kind === 'laser' || h.kind === 'geys' || h.kind === 'arcs') && !h.fired && t >= h.liveAt) {
        h.fired = true;
        engine.shake(0.2);
        engine.beep(h.kind === 'geys' ? 260 : 110, h.kind === 'geys' ? 'triangle' : 'sawtooth', 0.3, 0.05, 60);
      }
      if (h.kind === 'spokes' && !h.fired && t >= h.liveAt) {
        h.fired = true;
        engine.shake(0.2);
        engine.beep(100, 'square', 0.15, 0.04, 50);
      }
      if (hazardHit(h, p, t)) hurt();
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
      startShield(0);
      shieldBeats = 4;
      barPulse = 0;
      flash = 0;
    },
    progress: () => 1 - glasses / GLASSES,
    stress: () => Math.min(1, 0.4 + phase * 0.15),
    onTouch(ev) {
      if (mode === 'ko' || mode === 'smash') return;
      if (ev.type === 'down') down = { at: clock, held: false };
      else if (ev.type === 'up') {
        if (down && !down.held) reverse();
        down = null;
        holdDir = 0;
      }
    },
    debug: () => ({
      hazards,
      capsules,
      finalCap,
      t,
      ang,
      dir,
      mode,
      phase,
      glasses,
      dangerAt: (a, ahead, m = 0) => hazards.some((h) => hazardHit(h, a, t + ahead, m))
    }),
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      clock += dt;
      const wdt = dt * ts;
      t += wdt;
      updateInput(dt);
      burst = Math.max(0, burst - dt);
      slamT = Math.max(0, slamT - dt);
      flash = Math.max(0, flash - dt * 2.2);
      bossFlash = Math.max(0, bossFlash - dt * 5);
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
      for (const g of trail) g.al -= dt * 6;
      trail = trail.filter((g) => g.al > 0);

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
        if (smashT >= 0.8) startKo();
        return;
      }

      const speed = OMEGA * (1 + 0.08 * (1 - beat.beatPhase)) * (burst > 0 ? 1.8 : 1);
      ang = wrap(ang + dir * speed * dt);
      trail.push({ a: ang, al: 1 });

      if (beat.isBeat) onBeat();
      if (mode === 'fight' && t < shakeUntil) engine.shake(0.04);
      if (mode !== 'fight') return;
      updateHazards();

      for (const c of capsules) {
        if (t < c.born) continue;
        if (dAng(ang, c.angle) < 0.2) {
          c.taken = true;
          counter();
          if (mode !== 'fight') return;
        } else if (t - c.born > c.life) c.taken = true;
      }
      capsules = capsules.filter((c) => !c.taken);

      if (finalCap && t >= finalCap.born) {
        if (dAng(ang, finalCap.angle) < 0.22) {
          finalCap = null;
          startSmash();
          return;
        }
        if (t - finalCap.born > finalCap.life) finalCap = null;
      }

      if (glasses > 1) {
        charge += wdt / CHARGE_TIME;
        if (charge >= 1) counter();
      }
    },
    render(ctx) {
      const P = PHASES[phase];
      const ac = P.accent;
      const shk = t < shakeUntil ? Math.sin(t * 70) : 0;
      drawBackground(ctx, { t, beat, accent: ac, barPulse });
      drawPillars(ctx, pillars, t);

      // rotierende Kronkorken-Zacken im Hintergrund
      ctx.globalAlpha = 0.22;
      drawCrownCap(ctx, CX, CY, 178, t * 0.18, '#7f1d1d');
      ctx.globalAlpha = 1;

      // Orbit-Schiene
      ctx.strokeStyle = '#05050a';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = ac;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      for (const rr of [R - 15, R + 15]) {
        ctx.beginPath();
        ctx.arc(CX, CY, rr, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Warnungen / sichere Zonen
      let safeLabel = true;
      for (const h of hazards) {
        if (t >= liveAtOf(h) || (h.kind === 'bottle' && false)) continue;
        if (h.kind === 'spokes') {
          for (let k = 0; k < h.count; k++) {
            const a = h.base + (k * TAU) / h.count;
            drawDangerArc(ctx, a, SPOKE_HALF, t);
            const g = a + TAU / h.count / 2;
            drawSafeArc(ctx, g, TAU / h.count / 2 - SPOKE_HALF, t, safeLabel ? calls.safe : '');
            safeLabel = false;
          }
        } else if (h.kind === 'arcs') {
          drawDangerArc(ctx, h.center, h.half, t);
          drawSafeArc(ctx, h.center + Math.PI, Math.PI / 2, t, calls.safe);
        } else if (h.kind === 'bottle') {
          drawDangerArc(ctx, h.angle, FLAME_HALF, t);
        } else if (h.kind === 'geys' && t >= h.tellAt) {
          drawDangerArc(ctx, h.angle, GEYSER_HALF, t);
        } else if (h.kind === 'laser') {
          for (const b of [h.a0, h.a0 + Math.PI]) {
            drawDangerArc(ctx, b, BEAM_HALF + 0.05, t);
            ctx.strokeStyle = RED;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            const p = ringPt(b, R + 12);
            ctx.beginPath();
            ctx.moveTo(CX, CY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Boss-Kern, Schnapslatten-Ring, Fiech
      const bossAlpha = mode === 'ko' ? 0 : 1;
      if (bossAlpha) {
        const charging = hazards.some((h) => t < liveAtOf(h)) ? 1 : 0.15;
        drawBossAura(ctx, CX, CY, t, ac, charging, P.dark);
        ctx.globalAlpha = 0.9;
        drawCrownCap(ctx, CX, CY, 56, t * 0.9, ac);
        ctx.globalAlpha = 1;
        drawGlassRing(ctx, t, ac, glasses, broken, bossFlash);
        engine.drawFiech(ctx, CX + shk * 4, CY, 84, {
          beatPhase: beat.beatPhase,
          action: phase === 2 && slamT > 0 ? 'laser' : slamT > 0 ? 'slam' : 'hover',
          tilt: t < shakeUntil ? shk * 0.12 : Math.sin(t * 2) * 0.05
        });
        if (bossFlash > 0.05) {
          ctx.globalAlpha = bossFlash * 0.4;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(CX, CY, 42, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (mode === 'shield') drawRing(ctx, CX, CY, 78 + 3 * Math.sin(t * 8), '#ffffff', 0.6, 3, [10, 8]);
      }

      for (const h of hazards) drawBody(ctx, h, t);
      for (const c of capsules) drawCap(ctx, c, t, false);
      if (finalCap && t >= finalCap.born) drawFinal(ctx, finalCap, t);
      else if (finalCap) {
        const k = clamp((finalCap.born - t) / 0.6, 0, 1);
        if (k < 1) drawFinal(ctx, finalCap, t, 0.3);
      }

      // Spieler
      if (mode === 'smash') {
        const k = clamp(smashT / 0.8, 0, 1);
        const from = ringPt(smashFrom);
        const x = from.x + (CX - from.x) * k;
        const y = from.y + (CY - from.y) * k;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10 * (1 - k * 0.4);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, TAU);
        ctx.fill();
      } else if (mode !== 'ko') {
        for (const g of trail) {
          const q = ringPt(g.a);
          ctx.globalAlpha = Math.max(0, g.al) * 0.45;
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(q.x - 6, q.y - 6, 12, 12);
        }
        ctx.globalAlpha = 1;
        const p = ringPt(ang);
        drawRing(ctx, p.x, p.y, 22, '#ffffff', 0.9, 2);
        engine.drawPlayer(ctx, p.x, p.y, 26, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: burst > 0 ? '#22d3ee' : '#ffffff' });
        // Richtungspfeil in Fahrtrichtung
        const ta = ang + dir * 0.2;
        const tip = ringPt(ta, R);
        const lft = ringPt(ta - dir * 0.07, R + 8);
        const rgt = ringPt(ta - dir * 0.07, R - 8);
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(lft.x, lft.y);
        ctx.lineTo(rgt.x, rgt.y);
        ctx.closePath();
        ctx.fill();
      }

      // Konter-Strahl
      if (overBeam) {
        const k = Math.min(1, overBeam.t / 0.3);
        ctx.lineCap = 'round';
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 16 * k + 3;
        ctx.beginPath();
        ctx.moveTo(overBeam.x, overBeam.y);
        ctx.lineTo(CX, CY);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5 * k + 1;
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life / 0.5, 0, 1);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${text.name} // ${text.subtitle}`, W / 2, 30);
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px monospace';
      ctx.fillText(`PINNCHEN ${glasses}/${GLASSES}`, W / 2, 44);

      drawCockpit(ctx, t, ac, dir, charge, glasses > 1, down && down.held ? holdDir : 0);
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

function wedge(ctx, center, half, color, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.arc(CX, CY, R + 16, center - half, center + half);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawDangerArc(ctx, center, half, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 16);
  wedge(ctx, center, half, RED, 0.16 + 0.1 * pulse);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 0.3 + 0.2 * pulse;
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.arc(CX, CY, R, center - half, center + half);
  ctx.stroke();
  ctx.strokeStyle = '#fecaca';
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 8;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -(t * 40);
  ctx.beginPath();
  ctx.arc(CX, CY, R, center - half, center + half);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  for (const rr of [R - 17, R + 17]) {
    ctx.beginPath();
    ctx.arc(CX, CY, rr, center - half, center + half);
    ctx.stroke();
  }
  // rotes Ausrufezeichen
  const n = Math.max(1, Math.round((half * 2 * R) / 110));
  if (pulse > 0.25) {
    for (let i = 0; i < n; i++) {
      const a = center - half + ((i + 0.5) / n) * half * 2;
      const p = ringPt(a);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', p.x, p.y + 6);
    }
  }
}

function drawSafeArc(ctx, center, half, t, label) {
  if (half <= 0.02) return;
  wedge(ctx, center, half, GREEN, 0.2);
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 8);
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(CX, CY, R, center - half, center + half);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  for (const rr of [R - 14, R + 14]) {
    ctx.beginPath();
    ctx.arc(CX, CY, rr, center - half, center + half);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (label) {
    const p = ringPt(center, R + 32);
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, clamp(p.x, 36, W - 36), p.y + 4);
  }
}

function drawGlassRing(ctx, t, ac, glasses, broken, flash) {
  const rr = 66;
  ctx.strokeStyle = '#1f1f2b';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(CX, CY, rr, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 0.7 + 0.2 * Math.sin(t * 6);
  ctx.lineWidth = 2;
  for (const q of [rr - 6, rr + 6]) {
    ctx.beginPath();
    ctx.arc(CX, CY, q, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < GLASSES; i++) {
    const a = glassAngle(i, t);
    const p = ringPt(a, rr);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a + Math.PI / 2);
    if (i < glasses) {
      const col = i % 2 ? '#22d3ee' : '#fbbf24';
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.2 + flash * 0.3;
      ctx.fillRect(-11, -22, 22, 28);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0b1220';
      ctx.beginPath();
      ctx.moveTo(-7, -18);
      ctx.lineTo(7, -18);
      ctx.lineTo(5, 4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-6, -13);
      ctx.lineTo(6, -13);
      ctx.lineTo(5, 4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-4, -11, 2, 10);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -18);
      ctx.lineTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.lineTo(7, -18);
      ctx.stroke();
    } else if (broken[i]) {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-1, 0);
      ctx.lineTo(1, -8);
      ctx.lineTo(3, -1);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBody(ctx, h, t) {
  const live = t >= liveAtOf(h);
  if (h.kind === 'spokes') {
    if (!live) return;
    for (let k = 0; k < h.count; k++) {
      const a = h.base + (k * TAU) / h.count;
      const l1 = ringPt(a - SPOKE_HALF, R + 16);
      const l2 = ringPt(a + SPOKE_HALF, R + 16);
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a - 0.3) * 20, CY + Math.sin(a - 0.3) * 20);
      ctx.lineTo(l1.x, l1.y);
      ctx.lineTo(l2.x, l2.y);
      ctx.lineTo(CX + Math.cos(a + 0.3) * 20, CY + Math.sin(a + 0.3) * 20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = RED;
      ctx.lineWidth = 3;
      ctx.stroke();
      const e = ringPt(a, R + 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      // rot glühende Todes-Pinnchen
      for (let i = 0; i < 4; i++) {
        const q = ringPt(a + (i % 2 ? 0.14 : -0.14), 54 + i * 24);
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
      }
    }
  } else if (h.kind === 'bottle') {
    if (t < h.landAt) {
      const u = clamp((t - h.throwAt) / (h.landAt - h.throwAt), 0, 1);
      if (u <= 0) return;
      const e = ringPt(h.angle);
      const x = CX + (e.x - CX) * u;
      const y = CY + (e.y - CY) * u - Math.sin(u * Math.PI) * 60;
      drawRing(ctx, e.x, e.y, 22 * (1 - u * 0.5), '#ffffff', 0.8, 2);
      drawKornBottle(ctx, x, y, h.rot + t * 9, 1.1);
    } else {
      const k = 1 - (t - h.landAt) / FLAME_DUR;
      const p = ringPt(h.angle);
      ctx.strokeStyle = RED;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(CX, CY, R, h.angle - FLAME_HALF, h.angle + FLAME_HALF);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      for (let i = -2; i <= 2; i++) {
        const q = ringPt(h.angle + i * 0.08, R + 12);
        ctx.beginPath();
        ctx.moveTo(q.x - 5, q.y + 6);
        ctx.lineTo(q.x + 5, q.y + 6);
        ctx.lineTo(q.x, q.y - 12 - 8 * Math.abs(Math.sin(t * 20 + i)) * k);
        ctx.fill();
      }
      void p;
    }
  } else if (h.kind === 'arcs') {
    if (!live) return;
    const k = (t - h.liveAt) / ARC_DUR;
    drawRing(ctx, CX, CY, 30 + k * (R - 10), RED, 1 - k * 0.5, 6);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(CX, CY, R, h.center - h.half, h.center + h.half);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke();
  } else if (h.kind === 'geys') {
    if (t < h.tellAt) return;
    const p = ringPt(h.angle);
    if (!live) {
      drawAhoiPack(ctx, p.x, p.y, 0.4, 0.8, ['#4ade80', '#fde047', '#f43f5e'][h.color], t);
      return;
    }
    const k = (t - h.liveAt) / GEYSER_DUR;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(h.angle);
    ctx.fillStyle = RED;
    ctx.fillRect(-52, -22, 100 + k * 20, 44);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-48, -8, 92, 16);
    ctx.fillStyle = ['#4ade80', '#fde047', '#f43f5e'][h.color];
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-30 + i * 18, Math.sin(t * 30 + i) * 12, 7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  } else if (h.kind === 'laser') {
    if (!live) return;
    const b = beamAngle(h, t);
    for (const a of [b, b + Math.PI]) {
      const e = ringPt(a, R + 16);
      ctx.lineCap = 'round';
      ctx.strokeStyle = RED;
      ctx.lineWidth = 22 + (Math.floor(t * 40) % 2) * 4;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
}

function drawCap(ctx, c, t) {
  if (t < c.born) return;
  const left = c.life - (t - c.born);
  if (left < 0.8 && Math.floor(t * 12) % 2) return;
  const p = ringPt(c.angle);
  drawRing(ctx, p.x, p.y, 20 + 3 * Math.sin(t * 8), GOLD, 0.85, 3);
  drawCrownCap(ctx, p.x, p.y, 12, t * 3, GOLD);
  const q = ringPt(c.angle, R + 36);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(CONTENT.declineGame.arcade.stage4.calls.fire, clamp(q.x, 34, W - 34), q.y + 4);
}

function drawFinal(ctx, c, t, alpha = 1) {
  const p = ringPt(c.angle);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 14 + 3 * Math.sin(t * 10);
  ctx.setLineDash([14, 8]);
  ctx.lineDashOffset = -(t * 60);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(CX, CY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  drawRing(ctx, p.x, p.y, 24 + 3 * Math.sin(t * 9), GREEN, 1, 4);
  drawRing(ctx, p.x, p.y, 16, GOLD, 1, 3);
  drawCrownCap(ctx, p.x, p.y, 13, t * 4, GREEN);
  const q = ringPt(c.angle, R + 36);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(CONTENT.declineGame.arcade.stage4.calls.smashHint, clamp(q.x, 44, W - 44), q.y + 4);
  ctx.globalAlpha = 1;
}

// Daumen-Cockpit: links/rechts halten = Richtung, Tap = umkehren
function drawCockpit(ctx, t, ac, dir, charge, charging, holdDir) {
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, COCKPIT_Y, W, H - COCKPIT_Y);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, COCKPIT_Y, W, 1);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(28, COCKPIT_Y + 10, 304, 7);
  ctx.fillStyle = GOLD;
  ctx.fillRect(28, COCKPIT_Y + 10, 304 * (charging ? charge : 1), 7);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KONTER-LADUNG', W / 2, COCKPIT_Y + 29);
  for (const [i, x, label] of [[-1, 12, '◄'], [1, 188, '►']]) {
    const on = dir === i;
    ctx.fillStyle = on ? ac : '#0f1018';
    ctx.globalAlpha = on ? 0.9 : 1;
    ctx.fillRect(x, COCKPIT_Y + 38, 160, 92);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = on ? '#ffffff' : ac;
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeRect(x + 1, COCKPIT_Y + 39, 158, 90);
    ctx.fillStyle = on ? '#02040a' : ac;
    ctx.font = 'bold 44px monospace';
    ctx.fillText(label, x + 80, COCKPIT_Y + 86);
    ctx.font = 'bold 10px monospace';
    ctx.fillText(i < 0 ? 'GEGEN UHRZEIGER' : 'UHRZEIGER', x + 80, COCKPIT_Y + 118);
    if (holdDir === i) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 20, COCKPIT_Y + 44, 120, 3);
    }
  }
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('TAP = RICHTUNG WECHSELN · HALTEN = RICHTUNG WÄHLEN', W / 2, COCKPIT_Y + 146);
}
