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
export const R_OUT = 136;
export const R_IN = 92;
export const OMEGA = 1.9;
export const GLASSES = 14;
export const UNLOCK_AT = 10; // ab diesem Pinnchen-Stand schaltet sich der Innenring frei
export const PLAYER_HALF = 0.03; // Winkel-Halbbreite des Spielers auf der Schiene
export const COCKPIT_Y = 445;

const TAU = Math.PI * 2;
const GLASS_R = 62;
const TELL = 0.95;
const SPOKE_HALF = 0.2;
const SPOKE_DUR = 0.45;
const FLAME_DUR = 1.0;
const FLAME_HALF = 0.15;
const GEYSER_HALF = 0.22;
const GEYSER_DUR = 0.4;
const ARC_DUR = 0.35;
const BEAM_HALF = 0.07;
const HOLD_TIME = 0.18;
const DOUBLE_TAP = 0.28;
const GAP_BEATS = 2; // mindestens 1 voller Beat Pause zwischen zwei Angriffen
const SWITCH_TIME = 0.12;
const DASH_INV = 0.16;
const LAST_BEATS = 8;
const RED = '#ef4444';
const GREEN = '#22c55e';
const GOLD = '#facc15';
const VIOLET = '#a855f7';

// Cockpit-Buttons (x-Bereiche) und gemeinsame Oberkante
const BTN_Y = COCKPIT_Y + 22;
const BTN_H = 92;
const BTN = { left: [10, 120], mid: [126, 234], right: [240, 350] };

export const PHASES = [
  { accent: '#22d3ee', dark: '#450a0a' },
  { accent: '#f59e0b', dark: '#450a0a' },
  { accent: GREEN, dark: '#2e1065' },
  { accent: '#e879f9', dark: '#450a0a' }
];

export const phaseOf = (g, djDone) => (g >= 11 ? 0 : g >= UNLOCK_AT - 2 ? 1 : djDone ? 3 : 2);
export const radOf = (ring) => (ring ? R_IN : R_OUT);
export const wrap = (a) => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const dAng = (a, b) => Math.abs(wrap(a - b));
const ringPt = (a, r = R_OUT) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
const noise = (n) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

export const liveAtOf = (h) => (h.kind === 'bottle' ? h.landAt : h.liveAt);
export const endOf = (h) => {
  switch (h.kind) {
    case 'spokes':
      return h.liveAt + (h.dur ?? SPOKE_DUR);
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

// reine Geometrie: trifft Hazard h zum Zeitpunkt tt einen Spieler auf Winkel ang / Ring ring? m = Sicherheitsrand in rad
export function hazardHit(h, ang, tt, m = 0, ring = 0) {
  if (tt < liveAtOf(h) || tt > endOf(h)) return false;
  const pm = PLAYER_HALF + m;
  switch (h.kind) {
    case 'spokes':
      for (let k = 0; k < h.count; k++) if (dAng(ang, h.base + (k * TAU) / h.count) < h.half + pm) return true;
      return false;
    case 'bottle':
      return ring === h.ring && dAng(ang, h.angle) < FLAME_HALF + pm;
    case 'arcs':
      return dAng(ang, h.center) < h.half + pm;
    case 'geys':
      return dAng(ang, h.angle) < GEYSER_HALF + pm;
    case 'laser': {
      const b = beamAngle(h, tt);
      return dAng(ang, b) < BEAM_HALF + pm || (!h.single && dAng(ang, b + Math.PI) < BEAM_HALF + pm);
    }
    case 'zone':
      return ring === h.ring;
    default:
      return false;
  }
}

const hazardDone = (h, t) => t > endOf(h);
export const glassAngle = (i, t) => -Math.PI / 2 + (i * TAU) / GLASSES + t * 0.25;
const view = { unl: false }; // pro Frame gesetzt: ist der Innenring sichtbar?

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
  let mode = 'shield'; // shield | fight | last | smash | ko
  let shieldBeats = 4;
  let gap = GAP_BEATS;
  let patIdx = 0;
  let djToggle = false;
  let djDone = false;
  let sudoProg = 0;
  let attacked = false;
  let beatNo = 0;
  let nCounter = 0;
  let completed = false;
  let unlocked = false;
  let unlockT = 0;

  let ang = Math.PI / 2;
  let dir = 1;
  let ring = 0;
  let rad = R_OUT;
  let ringFrom = R_OUT;
  let ringAnim = 0;
  let dashInv = 0;
  let burst = 0;
  let trail = [];
  let down = null;
  let holdDir = 0;
  let lastTapAt = -9;
  let prevKeys = { l: false, r: false, u: false };

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
  let slashDone = -1;
  let koT = 0;
  let swDir = 1;
  let lastBeats = 0;
  let lastZones = 0;
  let phones = null;
  let cmd = { target: '', shown: 0, acc: 0, life: 0 };

  const rand = (a, b) => a + random() * (b - a);
  const bl = () => 60 / (beat.bpm || 105);
  const say = (s, color = '#ffffff') => {
    callout = { text: s, color, t: 1 };
  };
  const randRing = () => (unlocked && random() < 0.5 ? 1 : 0);
  const capAllowed = () => (phase === 2 ? glasses > 5 : glasses >= 1);

  function spark(x, y, color, count, power = 120, size = 3, chars = false) {
    for (let i = 0; i < count && sparks.length < 420; i++) {
      const a = random() * TAU;
      const v = (0.25 + random() * 0.75) * power;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        life: 0.5 + random() * 0.8,
        color,
        size: 2 + random() * size,
        ch: chars ? (random() < 0.5 ? '0' : '1') : ''
      });
    }
  }

  function hurt() {
    if (dashInv > 0) return;
    if (engine.hit()) flash = Math.max(flash, 0.3);
  }

  function reverse() {
    dir = -dir;
    burst = 0.12;
    engine.beep(440, 'square', 0.04, 0.02);
  }

  function switchRing() {
    if (!unlocked || mode === 'smash' || mode === 'ko') return;
    ring = 1 - ring;
    ringFrom = rad;
    ringAnim = SWITCH_TIME;
    dashInv = DASH_INV;
    burst = 0.12;
    const p = ringPt(ang, rad);
    spark(p.x, p.y, '#22d3ee', 6, 90, 2);
    engine.beep(660, 'triangle', 0.07, 0.03, 330);
  }

  // ---------------------------------------------------------------- Boss-HP

  function shatter(i) {
    broken[i] = true;
    const p = ringPt(glassAngle(i, t), GLASS_R);
    spark(p.x, p.y, i % 2 ? '#22d3ee' : '#fbbf24', 16, 200, 4);
    spark(p.x, p.y, '#e5e7eb', 6, 150, 2);
    engine.shake(0.25);
    engine.beep(1200, 'square', 0.08, 0.04);
    engine.beep(300, 'sawtooth', 0.18, 0.04);
  }

  function counter() {
    if (mode !== 'fight') return;
    glasses--;
    shatter(glasses);
    const p = ringPt(ang, rad);
    overBeam = { t: 0.35, x: p.x, y: p.y, exec: false };
    bossFlash = 1;
    engine.addScore(100);
    say(calls.counter[nCounter++ % calls.counter.length], GOLD);
    if (glasses <= 0) {
      startLast();
      return;
    }
    const np = phaseOf(glasses, djDone);
    if (np !== phase) startShield(np);
  }

  function setCmd(s) {
    cmd = { target: s, shown: 0, acc: 0, life: 6 };
  }

  function takeSudo() {
    sudoProg++;
    engine.triggerSudoSound?.('hack');
    engine.addScore(50);
    const p = ringPt(ang, rad);
    spark(p.x, p.y, GREEN, 10, 120, 3, true);
    setCmd(calls.cmd[Math.min(sudoProg, calls.cmd.length) - 1]);
    if (sudoProg >= calls.cmd.length) execute();
  }

  function execute() {
    engine.triggerSudoSound?.('execute');
    const p = ringPt(ang, rad);
    overBeam = { t: 0.6, x: p.x, y: p.y, exec: true };
    for (let k = 0; k < 2 && glasses > 1; k++) {
      glasses--;
      shatter(glasses);
    }
    bossFlash = 1;
    flash = 0.7;
    engine.addScore(300);
    engine.shake(0.6);
    spark(CX, CY, GREEN, 30, 300, 4, true);
    djDone = true;
    cmd.life = 2.5;
    startShield(3);
  }

  // ---------------------------------------------------------------- Phasen

  function startShield(np) {
    const prev = phase;
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
    gap = GAP_BEATS;
    attacked = false;
    bannerT = 1;
    barPulse = 1;
    flash = 0.6;
    engine.shake(0.4);
    engine.beep(120, 'sawtooth', 0.45, 0.04, 40);
    if (np >= 1 && !unlocked) {
      unlocked = true;
      unlockT = 1.4;
      say(calls.unlock, '#22d3ee');
    }
    if (np === 2) {
      engine.triggerDjScratch?.();
      say(calls.djIntro, GREEN);
      djToggle = false;
      sudoProg = 0;
      setCmd('> _');
    } else if (np === 3 && prev === 2) {
      say(calls.enough, '#e879f9');
      phones = { x: CX, y: CY - 30, vx: random() < 0.5 ? -170 : 170, vy: -280, rot: 0 };
    }
  }

  function startLast() {
    mode = 'last';
    hazards = [];
    capsules = [];
    finalCap = null;
    lastBeats = 0;
    lastZones = 0;
    swDir = -swDir;
    hazards.push({ kind: 'laser', single: true, a0: ang + (Math.PI / 2) * swDir, sw: swDir * 3.9, tellAt: t, liveAt: t + TELL + 0.2, dur: LAST_BEATS * bl() + 0.9 });
    flash = 0.6;
    bannerT = 0;
    say(calls.last, '#fca5a5');
    engine.shake(0.5);
    engine.beep(100, 'sawtooth', 0.5, 0.05, 45);
  }

  function startSmash() {
    mode = 'smash';
    ts = 0.3;
    smashT = 0;
    slashDone = -1;
    smashFrom = ang;
    hazards = [];
    capsules = [];
    finalCap = null;
    flash = 0.8;
    say(calls.smash, GREEN);
    engine.beep(90, 'sawtooth', 0.6, 0.05, 30);
  }

  function slashFx(i) {
    flash = 0.55;
    bossFlash = 1;
    engine.shake(0.35);
    engine.beep(700 + i * 220, 'sawtooth', 0.12, 0.05, 200);
    spark(CX, CY, '#ffffff', 14, 260, 4);
    spark(CX, CY, GREEN, 10, 220, 3, true);
  }

  function startKo() {
    mode = 'ko';
    ts = 1;
    koT = 0;
    glasses = 0;
    for (let i = 0; i < GLASSES; i++) {
      if (!broken[i]) shatter(i);
    }
    for (let i = 0; i < 80; i++) spark(CX, CY, ['#ffffff', RED, '#fbbf24', '#22d3ee', '#e5e7eb', '#fb923c'][i % 6], 1, 420, 5);
    spark(CX, CY, GREEN, 90, 380, 3, true);
    flash = 1;
    engine.addScore(500);
    engine.shake(0.9);
    say(calls.ko, '#ffffff');
    engine.beep(70, 'sawtooth', 0.8, 0.05, 25);
  }

  // ---------------------------------------------------------------- Angriffe: immer nur einer gleichzeitig

  function addCap(angle, capRing, born, life = 4, kind = 'gold') {
    if (kind === 'gold' && !capAllowed()) return;
    const wander = kind === 'gold' && glasses <= 7 && random() < 0.5 ? (random() < 0.5 ? -1 : 1) * 0.4 : 0;
    capsules.push({ angle: wrap(angle), ring: capRing, born, life, kind, v: wander });
  }

  function patSpokes() {
    const base = rand(0, TAU);
    hazards.push({ kind: 'spokes', base, count: 3, half: SPOKE_HALF, tellAt: t, liveAt: t + TELL + 0.05 });
    addCap(base + Math.PI / 3 + (Math.floor(random() * 3) * TAU) / 3, randRing(), t + 0.2);
    slamT = 0.7;
    say(calls.spokes, '#fecaca');
    engine.beep(140, 'square', 0.2, 0.04, 70);
  }

  function patMortar() {
    const targets = [];
    const bottleRing = unlocked ? ring : 0;
    for (let k = 0; k < 2; k++) {
      const throwAt = t + k * bl() * 2.2;
      const landAt = throwAt + 1.15;
      let target = ang + dir * OMEGA * (landAt - t) + rand(-0.4, 0.4);
      if (k === 1 && dAng(target, targets[0]) < 0.9) target += 1.4;
      targets.push(target);
      hazards.push({ kind: 'bottle', angle: target, ring: bottleRing, throwAt, landAt, rot: rand(0, TAU) });
    }
    addCap(targets[0] + Math.PI, bottleRing, t + 0.4, 4.4);
    slamT = 0.7;
    say(calls.mortar, '#fca5a5');
    engine.beep(200, 'square', 0.12, 0.04, 90);
  }

  function patHalf() {
    const lead = Math.max(1.15, bl() * 1.9);
    const center = ang + Math.PI + rand(-0.5, 0.5);
    hazards.push({ kind: 'arcs', center, half: Math.PI / 2, tellAt: t, liveAt: t + lead });
    addCap(center + Math.PI, randRing(), t + lead + 0.2, 3.6);
    shakeUntil = t + lead;
    slamT = lead;
    say(calls.shake, '#4ade80');
    engine.beep(80, 'sawtooth', 0.5, 0.04, 40);
  }

  function patGeysers() {
    const s = random() < 0.5 ? 1 : -1;
    const a0 = rand(0, TAU);
    const step = Math.max(1.0, bl() * 1.7);
    for (let k = 0; k < 4; k++) {
      const liveAt = t + 1.0 + k * step;
      hazards.push({ kind: 'geys', angle: a0 + s * k * 1.45, tellAt: liveAt - TELL, liveAt, color: k % 3 });
    }
    addCap(a0 + s * 0.72, randRing(), t + 0.5, 4.5);
    say(calls.geysir, '#f43f5e');
    engine.beep(260, 'triangle', 0.25, 0.04, 700);
  }

  // Innen rot, Aussen gruen: Spieler muss nach aussen wechseln und dort die Kapsel holen
  function patFoam() {
    const lead = Math.max(1.0, bl() * 1.8);
    hazards.push({ kind: 'zone', ring: 1, saw: false, tellAt: t, liveAt: t + lead, dur: bl() * 2 });
    addCap(ang + dir * 1.0, 0, t + 0.3, 4.4);
    slamT = lead;
    say(calls.foam, '#fbbf24');
    engine.beep(150, 'sawtooth', 0.4, 0.04, 60);
  }

  // Aussen rot (Kronkorken-Saegen), Innen gruen: Spieler wechselt nach innen ans Fiech
  function patFraese() {
    const lead = Math.max(1.0, bl() * 1.8);
    hazards.push({ kind: 'zone', ring: 0, saw: true, tellAt: t, liveAt: t + lead, dur: bl() * 2 });
    addCap(ang + dir * 1.0, 1, t + 0.3, 4.4);
    slamT = lead;
    say(calls.fraese, '#fca5a5');
    engine.beep(200, 'sawtooth', 0.4, 0.04, 500);
  }

  // DJ 1: einzelner Tonarm-Laser + rhythmischer Vor-/Rueckwaerts-Schub
  function patScratch() {
    swDir = -swDir;
    const lead = Math.max(1.15, bl() * 1.9);
    const dur = Math.max(2.0, bl() * 3.5);
    const a0 = ang + (Math.PI / 2) * (random() < 0.5 ? 1 : -1);
    hazards.push({ kind: 'laser', single: true, scratch: true, a0, sw: swDir * 2.44, tellAt: t, liveAt: t + lead, dur });
    addCap(a0 - swDir * 1.5, randRing(), t + 0.4, 5);
    slamT = lead + dur;
    say(calls.scratch, GREEN);
    engine.triggerDjScratch?.();
  }

  // DJ 2: 4 symmetrische Equalizer-Balken, dazwischen [ sudo ! ]-Kapseln
  function patEqualizer() {
    const base = rand(0, TAU);
    const lead = Math.max(TELL, bl() * 1.2);
    hazards.push({ kind: 'spokes', eq: true, base, count: 4, half: 0.11, dur: 0.3, tellAt: t, liveAt: t + lead });
    const need = Math.min(2, calls.cmd.length - sudoProg);
    const k0 = Math.floor(random() * 4);
    for (let i = 0; i < need; i++) {
      addCap(base + Math.PI / 4 + ((k0 + i * 2) % 4) * (Math.PI / 2), randRing(), t + 0.3, 5, 'sudo');
    }
    slamT = lead;
    say(calls.eq, '#86efac');
    engine.triggerSudoSound?.('type');
  }

  function launch() {
    attacked = true;
    if (phase === 0) [patSpokes, patMortar][patIdx++ % 2]();
    else if (phase === 1) [patFoam, patFraese, patHalf, patGeysers][patIdx++ % 4]();
    else if (phase === 2) {
      djToggle = !djToggle;
      if (djToggle && glasses > 5) patScratch();
      else patEqualizer();
    } else [patHalf, patSpokes][patIdx++ % 2]();
  }

  function lastBeat() {
    lastBeats++;
    if (lastBeats % 2 === 1 && lastZones < 4) {
      // jeder 2. Beat: 1 Beat Ankuendigung, 1 Beat aktiv, Ring im Wechsel
      hazards.push({ kind: 'zone', ring: lastZones % 2 === 0 ? 1 : 0, saw: lastZones % 2 === 1, tellAt: t, liveAt: t + bl(), dur: bl() * 0.95 });
      lastZones++;
    }
  }

  function onBeat() {
    beatNo++;
    if (beatNo % 4 === 0) barPulse = 1;
    if (mode === 'shield') {
      if (--shieldBeats <= 0) mode = 'fight';
      return;
    }
    if (mode === 'last') {
      lastBeat();
      return;
    }
    if (mode !== 'fight') return;
    if (hazards.length > 0) {
      gap = GAP_BEATS;
      return;
    }
    // nach jedem ueberstandenen Angriff liegt garantiert eine Konter-Kapsel bereit
    if (attacked && !capsules.some((c) => c.kind === 'gold') && capAllowed() && phase !== 2) {
      addCap(ang + dir * 1.1, randRing(), t, 4);
    }
    attacked = false;
    if (--gap > 0) return;
    launch();
  }

  // ---------------------------------------------------------------- Update

  function updateInput() {
    const keys = engine.keys;
    const l = keys.has('arrowleft') || keys.has('a');
    const r = keys.has('arrowright') || keys.has('d');
    const u = keys.has(' ') || keys.has('w') || keys.has('arrowup');
    if (l && !prevKeys.l && dir !== -1) reverse();
    else if (r && !prevKeys.r && dir !== 1) reverse();
    if (u && !prevKeys.u) switchRing();
    prevKeys = { l, r, u };
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
    for (const h of hazards) {
      if (h.kind === 'bottle' && !h.landed && t >= h.landAt) {
        h.landed = true;
        const q = ringPt(h.angle, radOf(h.ring));
        spark(q.x, q.y, '#cbd5e1', 10, 150);
        engine.shake(0.12);
        engine.beep(180, 'square', 0.12, 0.04, 60);
      }
      if (h.kind !== 'bottle' && !h.fired && t >= h.liveAt) {
        h.fired = true;
        engine.shake(0.2);
        engine.beep(h.kind === 'geys' ? 260 : 110, h.kind === 'geys' ? 'triangle' : 'sawtooth', 0.3, 0.05, 60);
      }
      if (hazardHit(h, ang, t, 0, ring)) hurt();
    }
    hazards = hazards.filter((h) => !hazardDone(h, t));
  }

  function pickCapsules(dt) {
    for (const c of capsules) {
      if (t < c.born) continue;
      if (c.v) c.angle = wrap(c.angle + c.v * dt);
      if (c.ring === ring && dAng(ang, c.angle) < (c.kind === 'sudo' ? 0.24 : 0.2)) {
        c.taken = true;
        if (c.kind === 'sudo') takeSudo();
        else counter();
        if (mode !== 'fight') return;
      } else if (t - c.born > c.life) c.taken = true;
    }
    capsules = capsules.filter((c) => !c.taken);
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
    progress: () => (mode === 'ko' ? 1 : clamp(1 - glasses / GLASSES, 0, 0.96)),
    stress: () => Math.min(1, 0.4 + phase * 0.15),
    onTouch(ev) {
      if (mode === 'ko' || mode === 'smash') return;
      if (ev.type === 'down') {
        if (Number.isFinite(ev.x) && Number.isFinite(ev.y) && ev.y >= BTN_Y && ev.x >= BTN.mid[0] && ev.x <= BTN.mid[1]) {
          switchRing();
          down = null;
          return;
        }
        down = { at: clock, held: false };
      } else if (ev.type === 'up') {
        if (down && !down.held) {
          if (unlocked && clock - lastTapAt < DOUBLE_TAP) {
            dir = -dir; // erster Tap des Doppel-Taps wird zurueckgenommen
            switchRing();
            lastTapAt = -9;
          } else {
            reverse();
            lastTapAt = clock;
          }
        }
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
      ring,
      mode,
      phase,
      glasses,
      unlocked,
      dangerAt: (a, ahead, m = 0, r = ring) => hazards.some((h) => hazardHit(h, a, t + ahead, m, r))
    }),
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      clock += dt;
      const wdt = dt * ts;
      t += wdt;
      updateInput();
      burst = Math.max(0, burst - dt);
      dashInv = Math.max(0, dashInv - dt);
      slamT = Math.max(0, slamT - dt);
      unlockT = Math.max(0, unlockT - dt);
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
      if (phones) {
        phones.x += phones.vx * dt;
        phones.y += phones.vy * dt;
        phones.vy += 700 * dt;
        phones.rot += dt * 9;
        if (phones.y > H + 40) phones = null;
      }
      // SUDO-Befehl tippt sich Zeichen fuer Zeichen
      if (cmd.target) {
        if (cmd.shown < cmd.target.length) {
          cmd.acc += dt;
          while (cmd.acc >= 0.03 && cmd.shown < cmd.target.length) {
            cmd.acc -= 0.03;
            cmd.shown++;
            if (cmd.shown % 3 === 0) engine.triggerSudoSound?.('type');
          }
        } else if (djDone) {
          cmd.life -= dt;
          if (cmd.life <= 0) cmd = { target: '', shown: 0, acc: 0, life: 0 };
        }
      }

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
        const idx = Math.min(2, Math.floor(smashT / 0.4));
        if (idx > slashDone) {
          slashDone = idx;
          slashFx(idx);
        }
        if (smashT >= 1.2) startKo();
        return;
      }

      // Ringwechsel gleitet in 0,12 s
      if (ringAnim > 0) {
        ringAnim = Math.max(0, ringAnim - dt);
        rad = radOf(ring) + (ringFrom - radOf(ring)) * (ringAnim / SWITCH_TIME);
      } else rad = radOf(ring);

      const scratching = hazards.some((h) => h.scratch && t <= endOf(h));
      const push = scratching ? 0.5 * Math.sin(Math.PI * (beatNo + beat.beatPhase)) : 0;
      const speed = OMEGA * (1 + 0.08 * (1 - beat.beatPhase)) * (burst > 0 ? 1.8 : 1) * (down && down.held ? 0.55 : 1);
      ang = wrap(ang + dir * speed * dt + push * dt);
      trail.push({ a: ang, r: rad, al: 1 });

      if (beat.isBeat) onBeat();
      if (mode === 'fight' && t < shakeUntil) engine.shake(0.04);
      if (mode !== 'fight' && mode !== 'last') return;
      updateHazards();

      if (mode === 'fight') {
        pickCapsules(wdt);
      } else if (mode === 'last') {
        if (!finalCap && lastBeats >= LAST_BEATS && hazards.length === 0) {
          finalCap = { angle: ang + dir * 1.3, ring: randRing(), born: t };
          say(calls.smash, GREEN);
          engine.beep(880, 'triangle', 0.2, 0.05, 1320);
        }
        if (finalCap && finalCap.ring === ring && dAng(ang, finalCap.angle) < 0.26) startSmash();
      }
    },
    render(ctx) {
      const P = PHASES[phase];
      const ac = P.accent;
      const dj = phase === 2 && mode !== 'ko';
      view.unl = unlocked;
      const shk = t < shakeUntil ? Math.sin(t * 70) : 0;
      drawBackground(ctx, { t, beat, accent: ac, barPulse });
      if (dj) drawMatrix(ctx, t);
      drawPillars(ctx, pillars, t);

      if (dj) drawVinylDisc(ctx, t);
      else {
        ctx.globalAlpha = 0.22;
        drawCrownCap(ctx, CX, CY, 178, t * 0.18, '#7f1d1d');
        ctx.globalAlpha = 1;
      }
      drawRails(ctx, ac, dj, unlocked, unlockT);

      // Warnungen / sichere Zonen
      let safeLabel = true;
      for (const h of hazards) {
        if (h.kind === 'zone') {
          drawZone(ctx, h, t, calls.safe);
          continue;
        }
        if (t >= liveAtOf(h)) continue;
        if (h.kind === 'spokes') {
          for (let k = 0; k < h.count; k++) {
            const a = h.base + (k * TAU) / h.count;
            drawDangerArc(ctx, a, h.half, t);
            const g = a + TAU / h.count / 2;
            drawSafeArc(ctx, g, TAU / h.count / 2 - h.half, t, safeLabel ? calls.safe : '');
            safeLabel = false;
          }
        } else if (h.kind === 'arcs') {
          drawDangerArc(ctx, h.center, h.half, t);
          drawSafeArc(ctx, h.center + Math.PI, Math.PI / 2, t, calls.safe);
        } else if (h.kind === 'bottle') {
          drawDangerArc(ctx, h.angle, FLAME_HALF, t, h.ring);
        } else if (h.kind === 'geys' && t >= h.tellAt) {
          drawDangerArc(ctx, h.angle, GEYSER_HALF, t);
        } else if (h.kind === 'laser') {
          for (const b of h.single ? [h.a0] : [h.a0, h.a0 + Math.PI]) {
            drawDangerArc(ctx, b, BEAM_HALF + 0.05, t);
            ctx.strokeStyle = RED;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            const p = ringPt(b, R_OUT + 12);
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
      if (mode !== 'ko') {
        const charging = hazards.some((h) => t < liveAtOf(h)) ? 1 : 0.15;
        drawBossAura(ctx, CX, CY, t, ac, charging, P.dark);
        ctx.globalAlpha = 0.9;
        drawCrownCap(ctx, CX, CY, 56, t * 0.9, ac);
        ctx.globalAlpha = 1;
        drawGlassRing(ctx, t, glasses, broken, bossFlash);
        const wob = mode === 'smash' ? Math.sin(clock * 60) * 3 : shk * 4;
        engine.drawFiech(ctx, CX + wob, CY, 84, {
          beatPhase: beat.beatPhase,
          action: phase === 2 && slamT > 0 ? 'laugh' : slamT > 0 ? 'slam' : 'hover',
          tilt: t < shakeUntil ? shk * 0.12 : Math.sin(t * 2) * 0.05
        });
        if (dj) drawDjGear(ctx, t, beat);
        if (phones) drawPhones(ctx, phones);
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
      for (const c of capsules) drawCap(ctx, c, t, calls);
      if (finalCap) drawFinal(ctx, finalCap, t, calls.smashHint);

      // Spieler
      if (mode === 'smash') {
        for (let i = 0; i <= slashDone; i++) {
          const a = smashFrom + (i * TAU) / 3;
          const p1 = ringPt(a, R_OUT);
          const p2 = ringPt(a + Math.PI, R_OUT);
          const k = clamp((smashT - i * 0.4) / 0.4, 0, 1);
          const x = p1.x + (p2.x - p1.x) * k;
          const y = p1.y + (p2.y - p1.y) * k;
          ctx.globalAlpha = i === slashDone ? 1 : 0.35;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.strokeStyle = GREEN;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.lineCap = 'butt';
          if (i === slashDone) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      } else if (mode !== 'ko') {
        for (const g of trail) {
          const q = ringPt(g.a, g.r);
          ctx.globalAlpha = Math.max(0, g.al) * 0.45;
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(q.x - 5, q.y - 5, 10, 10);
        }
        ctx.globalAlpha = 1;
        const p = ringPt(ang, rad);
        if (dashInv > 0) drawRing(ctx, p.x, p.y, 22, '#22d3ee', 0.9, 3);
        drawRing(ctx, p.x, p.y, 17, '#ffffff', 0.9, 2);
        engine.drawPlayer(ctx, p.x, p.y, 20, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: burst > 0 ? '#22d3ee' : '#ffffff' });
        // Richtungspfeil in Fahrtrichtung
        const ta = ang + dir * 0.2 * (R_OUT / rad);
        const tip = ringPt(ta, rad);
        const lft = ringPt(ta - dir * 0.07 * (R_OUT / rad), rad + 8);
        const rgt = ringPt(ta - dir * 0.07 * (R_OUT / rad), rad - 8);
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(lft.x, lft.y);
        ctx.lineTo(rgt.x, rgt.y);
        ctx.closePath();
        ctx.fill();
      }

      // Konter-/Execute-Strahl
      if (overBeam) {
        const k = Math.min(1, overBeam.t / 0.3);
        ctx.lineCap = 'round';
        ctx.strokeStyle = overBeam.exec ? GREEN : GOLD;
        ctx.lineWidth = (overBeam.exec ? 26 : 16) * k + 3;
        ctx.beginPath();
        ctx.moveTo(overBeam.x, overBeam.y);
        ctx.lineTo(CX, CY);
        ctx.stroke();
        ctx.strokeStyle = overBeam.exec ? GOLD : '#ffffff';
        ctx.lineWidth = (overBeam.exec ? 12 : 5) * k + 1;
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life / 0.5, 0, 1);
        ctx.fillStyle = s.color;
        if (s.ch) {
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(s.ch, s.x, s.y);
        } else ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${text.name} // ${text.subtitle}`, W / 2, 30);
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px monospace';
      ctx.fillText(`PINNCHEN ${glasses}/${GLASSES}`, W / 2, 44);
      if (cmd.target) drawCmd(ctx, cmd, clock);

      drawCockpit(ctx, text.cockpit, ac, dir, unlocked, ring, down && down.held ? holdDir : 0, t);
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
  ctx.arc(CX, CY, R_OUT + 16, center - half, center + half);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

const railList = (only) => (only !== undefined ? [radOf(only)] : view.unl ? [R_OUT, R_IN] : [R_OUT]);

function drawDangerArc(ctx, center, half, t, only) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 16);
  if (only === undefined) wedge(ctx, center, half, RED, 0.16 + 0.1 * pulse);
  ctx.lineCap = 'butt';
  for (const rr of railList(only)) {
    ctx.strokeStyle = RED;
    ctx.globalAlpha = 0.3 + 0.2 * pulse;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(CX, CY, rr, center - half, center + half);
    ctx.stroke();
    ctx.strokeStyle = '#fecaca';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 7;
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -(t * 40);
    ctx.beginPath();
    ctx.arc(CX, CY, rr, center - half, center + half);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.globalAlpha = 1;
    if (pulse > 0.25) {
      const n = Math.max(1, Math.round((half * 2 * rr) / 110));
      for (let i = 0; i < n; i++) {
        const p = ringPt(center - half + ((i + 0.5) / n) * half * 2, rr);
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', p.x, p.y + 6);
      }
    }
  }
}

function drawSafeArc(ctx, center, half, t, label) {
  if (half <= 0.02) return;
  wedge(ctx, center, half, GREEN, 0.2);
  for (const rr of railList()) {
    ctx.strokeStyle = GREEN;
    ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 8);
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(CX, CY, rr, center - half, center + half);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    for (const q of [rr - 13, rr + 13]) {
      ctx.beginPath();
      ctx.arc(CX, CY, q, center - half, center + half);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (label) {
    const p = ringPt(center, R_OUT + 32);
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, clamp(p.x, 36, W - 36), p.y + 4);
  }
}

// ganzer Ring rot (Gefahr), der andere Ring gruen (sicher)
function drawZone(ctx, h, t, safeText) {
  const live = t >= h.liveAt;
  const pulse = 0.5 + 0.5 * Math.sin(t * 16);
  const rr = radOf(h.ring);
  const safe = radOf(1 - h.ring);
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 8);
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(CX, CY, safe, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  for (const q of [safe - 13, safe + 13]) {
    ctx.beginPath();
    ctx.arc(CX, CY, q, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(safeText, CX, CY + R_OUT + 32);

  ctx.strokeStyle = RED;
  ctx.globalAlpha = live ? 0.85 : 0.3 + 0.2 * pulse;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.arc(CX, CY, rr, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = live ? '#ffffff' : '#fecaca';
  ctx.globalAlpha = live ? 0.9 : 0.55;
  ctx.lineWidth = 7;
  ctx.setLineDash([9, 9]);
  ctx.lineDashOffset = -(t * 50);
  ctx.beginPath();
  ctx.arc(CX, CY, rr, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;
  if (!live && pulse > 0.25) {
    for (let i = 0; i < 6; i++) {
      const p = ringPt((i * TAU) / 6 + 0.3, rr);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('!', p.x, p.y + 6);
    }
  }
  if (h.saw) {
    ctx.globalAlpha = live ? 1 : 0.4;
    for (let i = 0; i < 8; i++) {
      const p = ringPt((i * TAU) / 8 + t * (live ? 2.2 : 0.8), rr);
      drawCrownCap(ctx, p.x, p.y, 15, t * 7 + i, RED);
    }
    ctx.globalAlpha = 1;
  }
}

function drawRails(ctx, ac, dj, unl, unlockT) {
  const rails = unl ? [[R_OUT, 15], [R_IN, 13]] : [[R_OUT, 15]];
  for (const [rr, w] of rails) {
    ctx.strokeStyle = '#05050a';
    ctx.lineWidth = w * 2;
    ctx.beginPath();
    ctx.arc(CX, CY, rr, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = dj ? GREEN : ac;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    for (const q of [rr - w, rr + w]) {
      ctx.beginPath();
      ctx.arc(CX, CY, q, 0, TAU);
      ctx.stroke();
    }
    if (dj) {
      // Tonrillen der Schallplatte
      ctx.strokeStyle = VIOLET;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      for (const q of [rr - w * 0.5, rr, rr + w * 0.5]) {
        ctx.beginPath();
        ctx.arc(CX, CY, q, 0, TAU);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.arc(CX, CY, rr, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
  if (unlockT > 0) drawRing(ctx, CX, CY, R_IN, '#ffffff', clamp(unlockT, 0, 1), 4);
}

function drawVinylDisc(ctx, t) {
  ctx.fillStyle = '#04060a';
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUT + 24, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#14532d';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let r = 54; r < R_OUT + 22; r += 7) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Lichtreflex, der mit der Platte kreist
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUT - 30, t * 0.8, t * 0.8 + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUT - 30, t * 0.8 + Math.PI, t * 0.8 + Math.PI + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawMatrix(ctx, t) {
  ctx.fillStyle = '#020405';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, W, COCKPIT_Y);
  ctx.fillStyle = '#2e1065';
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, 0, W, COCKPIT_Y);
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = GREEN;
  for (let i = 0; i < 12; i++) {
    const y0 = (t * (40 + noise(i) * 50) + noise(i * 3) * 600) % 560;
    for (let j = 0; j < 6; j++) {
      ctx.globalAlpha = 0.32 * (1 - j / 6);
      ctx.fillText((i * 7 + Math.floor((y0 - j * 12) / 12) + Math.floor(t * 3)) % 2 ? '1' : '0', 15 + i * 30, y0 - j * 12 - 10);
    }
  }
  ctx.globalAlpha = 1;
}

function drawGlassRing(ctx, t, glasses, broken, flash) {
  ctx.strokeStyle = '#1f1f2b';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(CX, CY, GLASS_R, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 0.7 + 0.2 * Math.sin(t * 6);
  ctx.lineWidth = 2;
  for (const q of [GLASS_R - 6, GLASS_R + 6]) {
    ctx.beginPath();
    ctx.arc(CX, CY, q, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < GLASSES; i++) {
    const a = glassAngle(i, t);
    const p = ringPt(a, GLASS_R);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a + Math.PI / 2);
    ctx.scale(0.8, 0.8);
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

// Cyber-Kopfhoerer, Sonnenbrille mit >_ und zwei kleine Turntables mit Fadern
function drawDjGear(ctx, t, beat) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(CX, CY - 4, 41, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const s of [-1, 1]) {
    ctx.fillStyle = VIOLET;
    ctx.fillRect(CX + s * 41 - 6, CY - 14, 12, 26);
    ctx.fillStyle = GREEN;
    ctx.fillRect(CX + s * 41 - 2, CY - 9, 4, 16);
  }
  ctx.fillStyle = '#05070a';
  ctx.fillRect(CX - 30, CY - 22, 28, 15);
  ctx.fillRect(CX + 2, CY - 22, 28, 15);
  ctx.fillRect(CX - 3, CY - 18, 6, 3);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1;
  ctx.strokeRect(CX - 30, CY - 22, 28, 15);
  ctx.strokeRect(CX + 2, CY - 22, 28, 15);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('>_', CX - 16, CY - 11);
  if (Math.floor(t * 3) % 2) ctx.fillText('_', CX + 16, CY - 11);
  const pulse = 1 - beat.beatPhase;
  for (const s of [-1, 1]) {
    const x = CX + s * 114;
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(x, CY, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = VIOLET;
    ctx.beginPath();
    ctx.moveTo(x, CY);
    ctx.lineTo(x + Math.cos(t * 5 * s) * 10, CY + Math.sin(t * 5 * s) * 10);
    ctx.stroke();
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x - 3, CY + 18, 6, 26);
    ctx.fillStyle = GOLD;
    ctx.fillRect(x - 6, CY + 22 + pulse * 14 * (s > 0 ? 1 : 0.6), 12, 5);
  }
}

function drawPhones(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 22, Math.PI, TAU);
  ctx.stroke();
  ctx.fillStyle = VIOLET;
  ctx.fillRect(-27, -4, 10, 22);
  ctx.fillRect(17, -4, 10, 22);
  ctx.restore();
}

function drawCmd(ctx, cmd, clock) {
  ctx.fillStyle = '#02130a';
  ctx.globalAlpha = 0.85;
  ctx.fillRect(18, 52, W - 36, 24);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1;
  ctx.strokeRect(18.5, 52.5, W - 37, 23);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(cmd.target.slice(0, cmd.shown) + (Math.floor(clock * 3) % 2 ? '█' : ''), 26, 68);
  ctx.textAlign = 'center';
}

function drawBody(ctx, h, t) {
  const live = t >= liveAtOf(h);
  if (h.kind === 'spokes') {
    if (!live) return;
    for (let k = 0; k < h.count; k++) {
      const a = h.base + (k * TAU) / h.count;
      const rr = R_OUT + 16;
      if (h.eq) {
        // Equalizer-Balken, wie ein runder Audio-Visualizer
        for (let j = 0; j < 8; j++) {
          const p = ringPt(a, 38 + j * 16);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(a);
          ctx.fillStyle = j % 2 ? '#7f1d1d' : RED;
          ctx.fillRect(-7, -9, 14, 18);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2, -3, 4, 6);
          ctx.restore();
        }
        continue;
      }
      const l1 = ringPt(a - h.half, rr);
      const l2 = ringPt(a + h.half, rr);
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
      const e = ringPt(a, rr);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const q = ringPt(a + (i % 2 ? 0.12 : -0.12), 54 + i * 24);
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
      }
    }
  } else if (h.kind === 'bottle') {
    const rr = radOf(h.ring);
    if (t < h.landAt) {
      const u = clamp((t - h.throwAt) / (h.landAt - h.throwAt), 0, 1);
      if (u <= 0) return;
      const e = ringPt(h.angle, rr);
      const x = CX + (e.x - CX) * u;
      const y = CY + (e.y - CY) * u - Math.sin(u * Math.PI) * 60;
      drawRing(ctx, e.x, e.y, 22 * (1 - u * 0.5), '#ffffff', 0.8, 2);
      drawKornBottle(ctx, x, y, h.rot + t * 9, 1.1);
    } else {
      const k = 1 - (t - h.landAt) / FLAME_DUR;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(CX, CY, rr, h.angle - FLAME_HALF, h.angle + FLAME_HALF);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      for (let i = -2; i <= 2; i++) {
        const q = ringPt(h.angle + i * 0.08, rr + 12);
        ctx.beginPath();
        ctx.moveTo(q.x - 5, q.y + 6);
        ctx.lineTo(q.x + 5, q.y + 6);
        ctx.lineTo(q.x, q.y - 12 - 8 * Math.abs(Math.sin(t * 20 + i)) * k);
        ctx.fill();
      }
    }
  } else if (h.kind === 'arcs') {
    if (!live) return;
    const k = (t - h.liveAt) / ARC_DUR;
    drawRing(ctx, CX, CY, 30 + k * (R_OUT - 10), RED, 1 - k * 0.5, 6);
    for (const rr of railList()) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(CX, CY, rr, h.center - h.half, h.center + h.half);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
  } else if (h.kind === 'geys') {
    if (t < h.tellAt) return;
    const p = ringPt(h.angle);
    const col = ['#4ade80', '#fde047', '#f43f5e'][h.color];
    if (!live) {
      drawAhoiPack(ctx, p.x, p.y, 0.4, 0.8, col, t);
      return;
    }
    const k = (t - h.liveAt) / GEYSER_DUR;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(h.angle);
    ctx.fillStyle = RED;
    ctx.fillRect(34, -22, R_OUT - 18 + k * 20, 44);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(38, -8, R_OUT - 26, 16);
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(52 + i * 17, Math.sin(t * 30 + i) * 12, 7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  } else if (h.kind === 'laser') {
    if (!live) return;
    const b = beamAngle(h, t);
    for (const a of h.single ? [b] : [b, b + Math.PI]) {
      const e = ringPt(a, R_OUT + 16);
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
      if (h.scratch) {
        // Tonarm-Kopf
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(e.x - 8, e.y - 8, 16, 16);
        ctx.fillStyle = RED;
        ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
      }
    }
  }
}

function drawCap(ctx, c, t, calls) {
  if (t < c.born) return;
  const left = c.life - (t - c.born);
  if (left < 0.8 && Math.floor(t * 12) % 2) return;
  const rr = radOf(c.ring);
  const p = ringPt(c.angle, rr);
  if (c.kind === 'sudo') {
    ctx.fillStyle = '#02130a';
    ctx.fillRect(p.x - 27, p.y - 10, 54, 20);
    ctx.strokeStyle = Math.floor(t * 6) % 2 ? GREEN : GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 26, p.y - 9, 52, 18);
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(calls.sudoCap, p.x, p.y + 4);
    return;
  }
  drawRing(ctx, p.x, p.y, 20 + 3 * Math.sin(t * 8), GOLD, 0.85, 3);
  drawCrownCap(ctx, p.x, p.y, 12, t * 3, GOLD);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(calls.fire, clamp(p.x, 34, W - 34), p.y - 24);
}

function drawFinal(ctx, c, t, label) {
  const p = ringPt(c.angle, radOf(c.ring));
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 12 + 3 * Math.sin(t * 10);
  ctx.setLineDash([14, 8]);
  ctx.lineDashOffset = -(t * 60);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(CX, CY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  drawRing(ctx, p.x, p.y, 26 + 3 * Math.sin(t * 9), GREEN, 1, 4);
  drawRing(ctx, p.x, p.y, 17, GOLD, 1, 3);
  drawCrownCap(ctx, p.x, p.y, 13, t * 4, GREEN);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, clamp(p.x, 54, W - 54), p.y - 32);
}

// Daumen-Cockpit: links / Ring wechseln / rechts. Tap = Richtung, Halten = lenken
function drawCockpit(ctx, tx, ac, dir, unl, ring, holdDir, t) {
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, COCKPIT_Y, W, H - COCKPIT_Y);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, COCKPIT_Y, W, 1);
  ctx.textAlign = 'center';
  const btns = [
    ['left', -1, '◄', tx.left],
    ['mid', 0, '⇅', unl ? tx.ring : tx.ringLocked],
    ['right', 1, '►', tx.right]
  ];
  for (const [key, side, icon, label] of btns) {
    const x = BTN[key][0];
    const w = BTN[key][1] - x;
    const on = side !== 0 && dir === side;
    const dim = side === 0 && !unl;
    ctx.fillStyle = on ? ac : '#0f1018';
    ctx.globalAlpha = dim ? 0.5 : on ? 0.9 : 1;
    ctx.fillRect(x, BTN_Y, w, BTN_H);
    ctx.globalAlpha = dim ? 0.5 : 1;
    ctx.strokeStyle = on ? '#ffffff' : side === 0 ? GOLD : ac;
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeRect(x + 1, BTN_Y + 1, w - 2, BTN_H - 2);
    ctx.fillStyle = on ? '#02040a' : side === 0 ? GOLD : ac;
    ctx.font = 'bold 40px monospace';
    ctx.fillText(side === 0 && !unl ? '🔒' : icon, x + w / 2, BTN_Y + 52);
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, x + w / 2, BTN_Y + 82);
    ctx.globalAlpha = 1;
    if (side === 0 && unl) {
      ctx.fillStyle = ac;
      ctx.fillRect(x + 12, BTN_Y + 8 + (ring ? 10 : 0), w - 24, 3);
    }
    if (holdDir === side && side !== 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 12, BTN_Y + 6, w - 24, 3);
    }
  }
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 8px monospace';
  ctx.fillText(tx.hint, W / 2, COCKPIT_Y + 134);
}
