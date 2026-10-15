import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource } from './stage-utils.js';
import { SONGS, PLAYLISTS } from '../arcade-songs.js';
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
export const GLASSES = 22;
// Phase p laeuft, solange noch mehr als BOUNDS[p] - 1 Pinnchen uebrig sind; Phase 4 (DJ) endet per Root-Hack, Phase 5 ist das Rammstein-Finale
export const BOUNDS = [19, 16, 13, 10];
export const PLAYER_HALF = 0.03; // Winkel-Halbbreite des Spielers auf der Schiene
export const COCKPIT_Y = 445;

const TAU = Math.PI * 2;
const GLASS_R = 62;
const GLASS_SC = Math.min(0.8, (0.8 * 15) / GLASSES);
const TELL = 0.95;
const SPOKE_HALF = 0.2;
const SPOKE_DUR = 0.45;
const FLAME_DUR = 1.2;
const FLAME_HALF = 0.15;
const MEDALS = ['#cd7f32', '#e5e7eb', '#facc15'];
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
  { accent: '#e5e7eb', dark: '#450a0a' },
  { accent: '#60a5fa', dark: '#172554' },
  { accent: '#fbbf24', dark: '#451a03' },
  { accent: GREEN, dark: '#2e1065' },
  { accent: '#fb923c', dark: '#7c2d12' }
];

export const phaseOf = (g, djDone) => {
  for (let p = 0; p < BOUNDS.length; p++) if (g >= BOUNDS[p]) return p;
  return djDone ? 5 : 4;
};
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
  // ringspezifische Angriffe treffen nur den gewaehlten Ring, der andere ist komplett sicher
  if ((h.kind === 'spokes' || h.kind === 'arcs' || h.kind === 'geys') && h.ring !== undefined && h.ring !== ring) return false;
  switch (h.kind) {
    case 'spokes':
      for (let k = 0; k < h.count; k++) if (dAng(ang, h.base + (k * TAU) / h.count) < h.half + pm) return true;
      return false;
    case 'bottle':
      return ring === h.ring && dAng(ang, h.angle) < (h.half ?? FLAME_HALF) + pm;
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
  let sunT = 0;
  let djDone = false;
  let song = null; // laufender DJ-Song {id, end}
  let songIdx = 0;
  let themeA = 0;
  let themeId = 'sonne';
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
  const capAllowed = () => {
    if (phase === 4) return glasses > 5;
    if (phase === 5) return glasses > 1 || !song;
    // das letzte Pinnchen einer Song-Phase gibt es erst, wenn der Song zu Ende ist
    return glasses > BOUNDS[phase] || !song;
  };

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
    const medal = Math.min(sudoProg, MEDALS.length - 1);
    sudoProg++;
    engine.triggerSudoSound?.('hack');
    say(calls.medals[medal], MEDALS[medal]);
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
    startShield(5);
  }

  // ---------------------------------------------------------------- Phasen

  function startShield(np) {
    const prev = phase;
    phase = np;
    song = null;
    songIdx = 0;
    engine.stopSudoSample?.();
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
    if (np === 4) {
      engine.triggerDjScratch?.();
      say(calls.djIntro, GREEN);
      sudoProg = 0;
      songIdx = 0;
      setCmd('> _');
    } else if (np === 5 && prev === 4) {
      say(calls.enough, '#fb923c');
      phones = { x: CX, y: CY - 30, vx: random() < 0.5 ? -170 : 170, vy: -280, rot: 0 };
    }
    themeId = PLAYLISTS[np][0];
    // Song startet sofort mit dem Abschnitt (nicht erst nach dem ersten Angriff)
    beginSong(np >= 4);
    gap = 5;
  }

  function startLast() {
    mode = 'last';
    song = null;
    engine.stopSudoSample?.();
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
    const wander = kind === 'gold' && phase >= 3 && random() < 0.5 ? (random() < 0.5 ? -1 : 1) * 0.4 : 0;
    capsules.push({ angle: wrap(angle), ring: capRing, born, life, kind, v: wander });
  }

  // Ringspezifische Angriffe: meist auf dem Ring des Spielers, der andere Ring ist komplett sicher (+ Kapsel dort)
  const dangerRing = () => (unlocked ? (random() < 0.75 ? ring : 1 - ring) : undefined);

  function patSpokes() {
    const hr = dangerRing();
    const base = rand(0, TAU);
    hazards.push({ kind: 'spokes', base, count: 3, half: SPOKE_HALF, ring: hr, tellAt: t, liveAt: t + TELL + 0.05 });
    if (hr === undefined) addCap(base + Math.PI / 3 + (Math.floor(random() * 3) * TAU) / 3, randRing(), t + 0.2);
    else addCap(ang + dir * 1.0, 1 - hr, t + 0.2);
    slamT = 0.7;
    say(calls.spokes, '#fecaca');
    engine.beep(140, 'square', 0.2, 0.04, 70);
  }

  // Flaschen (oder Bier-Tornado-Dosen): 3 Wuerfe, breite Flammenbereiche, bleiben ~1,2 s auf der Schiene
  function patMortar(can = false) {
    const targets = [];
    const bottleRing = unlocked ? ring : 0;
    for (let k = 0; k < 3; k++) {
      const throwAt = t + k * bl() * 1.8;
      const landAt = throwAt + 1.15;
      let target = ang + dir * OMEGA * (landAt - t) + rand(-0.35, 0.35);
      for (const o of targets) if (dAng(target, o) < 0.8) target += 1.2;
      targets.push(target);
      hazards.push({ kind: 'bottle', angle: target, ring: bottleRing, half: 0.27, can, throwAt, landAt, rot: rand(0, TAU) });
    }
    if (unlocked) addCap(ang + dir * 1.0, 1 - bottleRing, t + 0.4, 4.8);
    else addCap(targets[0] + Math.PI, 0, t + 0.4, 4.8);
    slamT = 0.7;
    if (can) say(calls.tornado, '#fbbf24');
    else say(calls.mortar, '#fca5a5');
    engine.beep(200, 'square', 0.12, 0.04, 90);
  }

  function patHalf() {
    const hr = dangerRing();
    const lead = Math.max(1.15, bl() * 1.9);
    const center = ang + Math.PI + rand(-0.5, 0.5);
    hazards.push({ kind: 'arcs', center, half: Math.PI / 2, ring: hr, tellAt: t, liveAt: t + lead });
    addCap(center + Math.PI, hr === undefined ? randRing() : 1 - hr, t + lead + 0.2, 3.6);
    shakeUntil = t + lead;
    slamT = lead;
    say(calls.shake, '#4ade80');
    engine.beep(80, 'sawtooth', 0.5, 0.04, 40);
  }

  function patGeysers(count = 4) {
    const hr = dangerRing();
    const s = random() < 0.5 ? 1 : -1;
    const a0 = rand(0, TAU);
    const step = Math.max(count > 4 ? 0.9 : 1.0, bl() * (count > 4 ? 1.6 : 1.7));
    for (let k = 0; k < count; k++) {
      const liveAt = t + 1.0 + k * step;
      hazards.push({ kind: 'geys', angle: a0 + s * k * 1.45, ring: hr, tellAt: liveAt - TELL, liveAt, color: k % 3 });
    }
    addCap(hr === undefined ? a0 + s * 0.72 : ang + dir * 1.0, hr === undefined ? randRing() : 1 - hr, t + 0.5, 4.5);
    say(count > 4 ? calls.songs.schuetteln.latte : calls.geysir, '#f43f5e');
    engine.beep(260, 'triangle', 0.25, 0.04, 700);
  }

  // Rammstein-Show: "Hier kommt die Sonne" - Sonne ueber dem Fiech, 4 Flammensaeulen auf einem Ring
  function patSonne() {
    const hr = dangerRing() ?? 0;
    const lead = Math.max(TELL, bl() * 1.8);
    hazards.push({ kind: 'spokes', skin: 'flame', base: rand(0, TAU), count: 4, half: 0.17, dur: 0.5, ring: hr, tellAt: t, liveAt: t + lead });
    addCap(ang + dir * 1.0, 1 - hr, t + 0.3, 4.6);
    sunT = lead + 0.7;
    slamT = lead;
    say(calls.sonne, '#fb923c');
  }

  // Rage-Cage-Show: ein Ring wird zum Kaefig (rot), der andere ist sicher
  function patCage() {
    const hr = unlocked ? (random() < 0.5 ? ring : 1 - ring) : 0;
    const lead = Math.max(1.0, bl() * 1.8);
    hazards.push({ kind: 'zone', ring: hr, cage: true, saw: false, tellAt: t, liveAt: t + lead, dur: bl() * 2 });
    addCap(ang + dir * 1.0, 1 - hr, t + 0.3, 4.4);
    slamT = lead;
    say(calls.cage, '#fca5a5');
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

  // DJ 2: 4 symmetrische Equalizer-Balken, dazwischen [ sudo ! ]-Kapseln (erst nach dem Song, damit er nicht abbricht)
  function patEqualizer() {
    const base = rand(0, TAU);
    const lead = Math.max(0.9, bl() * 1.3);
    hazards.push({ kind: 'spokes', eq: true, base, count: 4, half: 0.09, dur: 0.2, tellAt: t, liveAt: t + lead });
    const need = song ? 0 : Math.min(2, calls.cmd.length - sudoProg);
    const k0 = Math.floor(random() * 4);
    for (let i = 0; i < need; i++) {
      addCap(base + Math.PI / 4 + ((k0 + i * 2) % 4) * (Math.PI / 2), randRing(), t + 0.3, 5, 'sudo');
    }
    slamT = lead;
    say(calls.eq, '#86efac');
    engine.triggerSudoSound?.('type');
  }

  // Napoli: Vesuv spuckt Lava abwechselnd auf beiden Ringen
  function patVesuv() {
    const a0 = rand(0, TAU);
    const s = random() < 0.5 ? 1 : -1;
    const step = Math.max(1.05, bl() * 1.8);
    const first = random() < 0.5 ? 1 : 0;
    for (let k = 0; k < 4; k++) {
      const liveAt = t + 1.1 + k * step;
      hazards.push({ kind: 'geys', skin: 'lava', angle: a0 + s * k * 1.7, ring: unlocked ? (first + k) % 2 : 0, tellAt: liveAt - TELL, liveAt, color: 0 });
    }
    addCap(ang + dir * 1.0, ring, t + 0.5, 4.8);
    slamT = 1.4;
    shakeUntil = t + 0.7;
    say(calls.vesuv, '#f97316');
    engine.beep(90, 'sawtooth', 0.5, 0.04, 40);
  }

  // Gas: ueberholender Laser mit hoher Drehzahl, einzelner Strahl
  function patRace() {
    swDir = -swDir;
    const lead = Math.max(1.15, bl() * 1.9);
    const a0 = ang + (Math.PI / 2) * (random() < 0.5 ? 1 : -1);
    hazards.push({ kind: 'laser', single: true, race: true, a0, sw: swDir * 2.2, tellAt: t, liveAt: t + lead, dur: 2.4 });
    addCap(a0 - swDir * 1.4, randRing(), t + 0.4, 5);
    slamT = lead + 1.5;
    say(calls.race, '#e5e7eb');
    engine.beep(180, 'sawtooth', 0.4, 0.04, 900);
  }

  // Tornado: zwei gegenueberliegende Strahlen drehen langsam wie ein Wirbel
  function patTwister() {
    swDir = -swDir;
    const lead = Math.max(0.9, bl() * 1.6);
    const a0 = ang + Math.PI / 2;
    hazards.push({ kind: 'laser', single: false, storm: true, a0, sw: swDir * 1.15, tellAt: t, liveAt: t + lead, dur: 3.0 });
    addCap(a0 + Math.PI / 2, randRing(), t + 0.4, 5.2);
    slamT = lead + 2;
    say(calls.twister, '#93c5fd');
  }

  // Wolle: die Stadion-Welle - Gefahrenboegen wandern nacheinander um den Ring
  function patWelle() {
    const hr = dangerRing();
    const a0 = rand(0, TAU);
    const s = random() < 0.5 ? 1 : -1;
    const step = Math.max(1.1, bl() * 1.9);
    for (let k = 0; k < 4; k++) {
      const liveAt = t + 1.15 + k * step;
      hazards.push({ kind: 'arcs', center: a0 + s * k * 1.35, half: 0.55, ring: hr, tellAt: liveAt - 1.0, liveAt });
    }
    addCap(ang + dir * 1.0, hr === undefined ? randRing() : 1 - hr, t + 0.4, 5.5);
    slamT = 2;
    say(calls.songs.wolle.stadium, '#fbbf24');
  }

  // Rammstein-Finale: Feuersaeulen wechseln bei jedem Schlag den Ring
  function patInferno() {
    const lead = Math.max(1.1, bl() * 1.8);
    const step = Math.max(1.3, bl() * 2.4);
    const first = ring;
    for (let k = 0; k < 4; k++) {
      const liveAt = t + lead + k * step;
      hazards.push({ kind: 'spokes', skin: 'flame', base: rand(0, TAU), count: 4, half: 0.17, dur: 0.5, ring: unlocked ? (first + k) % 2 : 0, tellAt: liveAt - lead, liveAt, num: k % 3 });
    }
    addCap(ang + dir * 1.0, 1 - first, t + 0.3, 5.5);
    sunT = lead + 4;
    slamT = lead + 2;
    shakeUntil = t + lead;
    say(calls.inferno, '#f97316');
    engine.beep(70, 'sawtooth', 0.6, 0.05, 35);
  }

  // Song-Attacken (nur im DJ-Modus)
  function patSonneCount() {
    const hr = dangerRing() ?? 0;
    const lead = Math.max(1.1, bl() * 1.8);
    const step = 1.15;
    for (let k = 0; k < 3; k++) {
      const liveAt = t + lead + k * step;
      hazards.push({ kind: 'spokes', skin: 'flame', base: rand(0, TAU), count: 4, half: 0.17, dur: 0.5, ring: hr, tellAt: liveAt - lead, liveAt, num: k });
    }
    addCap(ang + dir * 1.0, 1 - hr, t + 0.3, 5);
    sunT = lead + 3;
    slamT = lead;
    say(calls.songs.sonne.count[0], '#fb923c');
  }

  function patStorm() {
    swDir = -swDir;
    const lead = Math.max(1.15, bl() * 1.9);
    const a0 = ang + (Math.PI / 2) * (random() < 0.5 ? 1 : -1);
    hazards.push({ kind: 'laser', single: true, storm: true, a0, sw: swDir * 1.3, tellAt: t, liveAt: t + lead, dur: 2.6 });
    addCap(a0 - swDir * 1.5, randRing(), t + 0.4, 5);
    slamT = lead + 2;
    say(calls.songs.tornado.storm, '#93c5fd');
  }

  function patGasPedal() {
    const lead = Math.max(1.0, bl() * 1.8);
    const tell = Math.max(0.75, bl() * 1.3);
    const dur = 0.5;
    const first = random() < 0.5 ? 1 : 0;
    for (let k = 0; k < 3; k++) {
      const liveAt = t + lead + k * (dur + tell);
      hazards.push({ kind: 'zone', ring: (first + k) % 2, cage: true, saw: false, tellAt: liveAt - (k === 0 ? lead : tell), liveAt, dur });
    }
    slamT = lead + 1.5;
    say(calls.songs.gas.pedal, '#fca5a5');
  }

  // Bass-Drop: zwei kurze Druckwellen, erst auf einem Ring, dann auf dem anderen - Ringwechsel im Takt
  function patBassDrop() {
    if (!unlocked) return patSpokes();
    const lead = Math.max(1.1, bl() * 1.9);
    const tell = Math.max(0.8, bl() * 1.4);
    const dur = 0.45;
    const first = random() < 0.5 ? 1 : 0;
    for (let k = 0; k < 2; k++) {
      const liveAt = t + lead + k * (dur + tell);
      hazards.push({ kind: 'zone', ring: (first + k) % 2, wave: true, saw: false, tellAt: liveAt - (k === 0 ? lead : tell), liveAt, dur });
    }
    slamT = lead + 1;
    shakeUntil = t + lead;
    say(calls.bassDrop, '#e879f9');
    return undefined;
  }

  // Angriffs-Pool je Boss-Phase (Index = Phase), jede Phase hat eigene Mechaniken
  const PHASE_POOLS = [
    [patSpokes, patVesuv, () => patMortar(false)],
    [patCage, patRace, patGasPedal, patBassDrop],
    [() => patMortar(true), patTwister, patStorm, patBassDrop],
    [patSpokes, patWelle, patHalf, patBassDrop],
    [() => patGeysers(5), patHalf, patEqualizer, patBassDrop],
    [patSonne, patSonneCount, patInferno, patBassDrop, patHalf, patTwister]
  ];

  function beginSong(silent = false) {
    const id = PLAYLISTS[phase][songIdx];
    song = { id, start: t, end: t + SONGS[id].len - 1.2, len: SONGS[id].len, heard: false };
    themeId = id;
    if (!silent) engine.triggerDjScratch?.();
    song.heard = engine.triggerSudoSample?.(id) !== false;
    if (!silent) say(calls.songs[id].name, GREEN);
    flash = 0.4;
    barPulse = 1;
    gap = 3;
  }

  function endSong() {
    song = null;
    songIdx++;
    gap = 3;
    attacked = false;
    // Belohnung: im DJ-Set ein [ sudo ! ]-Fragment, sonst die fehlende Konter-Kapsel
    if (phase === 4 && sudoProg < calls.cmd.length && !capsules.some((c) => c.kind === 'sudo')) {
      addCap(ang + dir * 1.1, randRing(), t, 6, 'sudo');
    } else if (capAllowed() && !capsules.some((c) => c.kind === 'gold')) addCap(ang + dir * 1.1, randRing(), t, 5);
  }
  function launch() {
    attacked = true;
    if (phase === 4 && !song) {
      patEqualizer();
      return;
    }
    const pool = PHASE_POOLS[phase];
    pool[patIdx++ % pool.length]();
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
    if (song && !song.heard) {
      // Sample war noch nicht geladen: nachholen und Songende mitverschieben
      song.heard = engine.triggerSudoSample?.(song.id) !== false;
      if (song.heard) {
        song.start = t;
        song.end = t + song.len - 1.2;
      }
    }
    if (beatNo % 4 === 0) barPulse = 1;
    if (phase === 5 && mode !== 'ko') {
      spark(rand(0, W), COCKPIT_Y - 6, '#fb923c', 4, 150, 3);
      if (beatNo % 4 === 0) engine.shake(0.15);
    }
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
    if (attacked && !capsules.some((c) => c.kind === 'gold') && capAllowed() && phase !== 4) {
      addCap(ang + dir * 1.1, randRing(), t, 4);
    }
    attacked = false;
    if (song && t >= song.end) endSong();
    if (--gap > 0) return;
    if (!song && songIdx < PLAYLISTS[phase].length) {
      beginSong();
      return;
    }
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
        if (h.num !== undefined) say(calls.songs.sonne.count[h.num], '#fb923c');
        engine.shake(0.2);
        engine.beep(h.kind === 'geys' ? 260 : 110, h.kind === 'geys' ? 'triangle' : 'sawtooth', 0.3, 0.05, 60);
      }
      if (hazardHit(h, ang, t, 0, ring)) hurt();
    }
    hazards = hazards.filter((h) => !hazardDone(h, t));
    // Sturm-Laser zielen waehrend der Vorwarnung mit 90 Grad Abstand zum Spieler: der Start ist nie unfair
    for (const h of hazards) {
      if (h.kind === 'laser' && h.storm && !h.single && t < h.liveAt) h.a0 = ang + Math.PI / 2;
      if (h.kind === 'spokes' && h.eq && t < h.liveAt) h.base = ang + Math.PI / 4;
    }
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
      engine.warmSudoSamples?.();
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
      songIdx,
      sudoProg,
      song,
      gap,
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
      sunT = Math.max(0, sunT - dt);
      themeA = clamp(themeA + (song || phase !== 4 ? dt * 2.5 : -dt * 2.5), 0, 1);
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
      const dj = phase === 4 && mode !== 'ko';
      view.unl = unlocked;
      const shk = t < shakeUntil ? Math.sin(t * 70) : 0;
      drawBackground(ctx, { t, beat, accent: ac, barPulse });
      const themed = themeA > 0.02 && mode !== 'ko';
      const tc = themed && themeA > 0.5 ? THEMES[themeId].c : GREEN;
      if (dj && !themed) drawMatrix(ctx, t);
      if (themed) {
        drawSongBg(ctx, themeId, themeA, t);
        drawSongFx(ctx, THEMES[themeId].c, themeA, t, barPulse, beat);
        drawSudoDecor(ctx, themeId, themeA, t, barPulse);
        drawPhaseExtras(ctx, themeId, themeA, t, beat);
        if (themeId === 'sonne') drawInferno(ctx, t, themeA, barPulse, beat, mode === 'last' ? 1.4 : song ? 0.4 + clamp((t - song.start) / song.len, 0, 1) : 1);
      }
      drawPillars(ctx, pillars, t);

      if (dj) drawVinylDisc(ctx, t, themed ? tc : '#14532d');
      else {
        ctx.globalAlpha = 0.22;
        drawCrownCap(ctx, CX, CY, 178, t * 0.18, '#7f1d1d');
        ctx.globalAlpha = 1;
      }
      drawRails(ctx, themed && !dj ? THEMES[themeId].c : ac, dj, unlocked, unlockT, tc);

      // Warnungen / sichere Zonen
      let safeLabel = true;
      const safeRings = new Set();
      const safeRing = (r) => {
        if (r === undefined || safeRings.has(r)) return;
        safeRings.add(r);
        drawSafeRing(ctx, r, t, calls.safe);
      };
      for (const h of hazards) {
        if (h.kind === 'zone') {
          if (t >= h.tellAt) drawZone(ctx, h, t, calls.safe);
          continue;
        }
        if (t >= liveAtOf(h)) continue;
        if (h.tellAt !== undefined && t < h.tellAt) continue;
        if (h.kind === 'spokes') {
          for (let k = 0; k < h.count; k++) {
            const a = h.base + (k * TAU) / h.count;
            drawDangerArc(ctx, a, h.half, t, h.ring);
            const g = a + TAU / h.count / 2;
            if (h.ring === undefined) {
              drawSafeArc(ctx, g, TAU / h.count / 2 - h.half, t, safeLabel ? calls.safe : '');
              safeLabel = false;
            }
          }
          if (h.ring !== undefined) safeRing(1 - h.ring);
        } else if (h.kind === 'arcs') {
          drawDangerArc(ctx, h.center, h.half, t, h.ring);
          drawSafeArc(ctx, h.center + Math.PI, Math.PI / 2, t, h.ring === undefined ? calls.safe : '', h.ring);
          if (h.ring !== undefined) safeRing(1 - h.ring);
        } else if (h.kind === 'bottle') {
          drawDangerArc(ctx, h.angle, h.half ?? FLAME_HALF, t, h.ring);
          if (unlocked) safeRing(1 - h.ring);
        } else if (h.kind === 'geys' && t >= h.tellAt) {
          drawDangerArc(ctx, h.angle, GEYSER_HALF, t, h.ring);
          if (h.ring !== undefined) safeRing(1 - h.ring);
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
        if (sunT > 0) drawSun(ctx, t, Math.min(1, sunT * 2));
        if (themed) drawSongProps(ctx, themeId, themeA, t);
        const wob = mode === 'smash' ? Math.sin(clock * 60) * 3 : shk * 4;
        engine.drawFiech(ctx, CX + wob, CY, 84, {
          beatPhase: beat.beatPhase,
          action: phase === 4 && slamT > 0 ? 'laugh' : slamT > 0 ? 'slam' : 'hover',
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
      for (const c of capsules) drawCap(ctx, c, t, calls, MEDALS[Math.min(sudoProg, MEDALS.length - 1)]);
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
      if (themed && themeA > 0.3) drawSongHud(ctx, THEMES[themeId].c, themeA, calls.songs[themeId].name, song ? clamp((t - song.start) / song.len, 0, 1) : 1, t);

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

function drawSafeArc(ctx, center, half, t, label, only) {
  if (half <= 0.02) return;
  if (only === undefined) wedge(ctx, center, half, GREEN, 0.2);
  for (const rr of railList(only)) {
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

// kompletter Ring gruen = hier bist du sicher
function drawSafeRing(ctx, r, t, label) {
  const rr = radOf(r);
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 8);
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(CX, CY, rr, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  for (const q of [rr - 13, rr + 13]) {
    ctx.beginPath();
    ctx.arc(CX, CY, q, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, CX, CY + radOf(r) + 32 - (r === 1 ? 4 : 0));
}

// Rammstein-Show: Sonne ueber dem Fiech
function drawSun(ctx, t, a) {
  ctx.globalAlpha = 0.9 * a;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(CX, CY - 62, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const an = (i * TAU) / 12 + t * 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(an) * 22, CY - 62 + Math.sin(an) * 22);
    ctx.lineTo(CX + Math.cos(an) * (30 + 4 * Math.sin(t * 12 + i)), CY - 62 + Math.sin(an) * (30 + 4 * Math.sin(t * 12 + i)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
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
  if (h.wave) {
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const p = live ? 1 : (t * 1.6 + k / 3) % 1;
      ctx.globalAlpha = live ? 0.9 : 0.6 * (1 - p);
      ctx.beginPath();
      ctx.arc(CX, CY, 30 + (rr - 30) * p, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (h.cage) {
    ctx.strokeStyle = '#fecaca';
    ctx.globalAlpha = live ? 1 : 0.5;
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const a = (i * TAU) / 18;
      const p1 = ringPt(a, rr - 13);
      const p2 = ringPt(a, rr + 13);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
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

// ---------------------------------------------------------------- Song-Themes (ganzer Bildschirm, nur waehrend ein Song laeuft)

const THEMES = {
  sonne: { c: '#fb923c', bg: '#1c0603' },
  napoli: { c: '#38bdf8', bg: '#04101c' },
  tornado: { c: '#60a5fa', bg: '#050b1a' },
  gas: { c: '#e5e7eb', bg: '#0b0b0d' },
  schuetteln: { c: '#a3e635', bg: '#04140a' },
  wolle: { c: '#fbbf24', bg: '#171000' }
};

function drawSongBg(ctx, id, a, t) {
  const th = THEMES[id];
  ctx.globalAlpha = 0.88 * a;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, COCKPIT_Y);
  ctx.globalAlpha = a;
  const fall = (i, speed, span) => (t * speed * (0.6 + noise(i)) + noise(i * 5) * span) % span;
  if (id === 'napoli') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#16a34a', '#f8fafc', '#dc2626'][i];
      ctx.globalAlpha = 0.09 * a;
      ctx.fillRect(i * 120, 0, 120, COCKPIT_Y);
    }
    ctx.fillStyle = '#292524';
    ctx.globalAlpha = 0.8 * a;
    ctx.beginPath();
    ctx.moveTo(40, 300);
    ctx.lineTo(150, 120);
    ctx.lineTo(210, 120);
    ctx.lineTo(320, 300);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    for (let i = 0; i < 22; i++) {
      ctx.globalAlpha = 0.7 * a;
      const k = (t * 0.5 + noise(i)) % 1;
      ctx.fillRect(180 + (noise(i * 3) - 0.5) * 140 * k + Math.sin(t * 2 + i) * 6, 120 - k * 110, 3, 3);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.globalAlpha = 0.5 * a;
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, COCKPIT_Y - 18 + r * 7 + Math.sin(t * 2 + x * 0.04 + r) * 5);
      ctx.stroke();
    }
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 * a;
    for (let i = 0; i < 4; i++) ctx.fillText('🍕', 50 + i * 85, 90 + 20 * Math.sin(t * 1.5 + i * 2));
  } else if (id === 'sonne') {
    // Buehnenwand wie in der SUDO-Show: dunkle Lamellen und rote Neon-Traversen
    ctx.fillStyle = '#2a0c09';
    ctx.globalAlpha = 0.7 * a;
    for (let i = 0; i < 20; i++) ctx.fillRect(0, 170 + i * 14, W, 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.45 * a;
    for (const x of [16, W - 16]) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, COCKPIT_Y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.25 * a;
    ctx.lineWidth = 1;
    for (const x of [8, W - 24]) {
      ctx.beginPath();
      for (let y = 40; y < COCKPIT_Y; y += 22) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 16, y + 22);
      }
      ctx.stroke();
    }
  } else if (id === 'tornado') {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.35 * a;
    ctx.setLineDash([26, 22]);
    for (let k = 0; k < 4; k++) {
      ctx.lineDashOffset = -(t * 120 * (k % 2 ? -1 : 1));
      ctx.beginPath();
      ctx.arc(CX, CY, 165 + k * 14, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#93c5fd';
    ctx.globalAlpha = 0.4 * a;
    for (let i = 0; i < 40; i++) {
      const x = noise(i * 3) * (W + 80) - 40;
      const y = fall(i, 420, COCKPIT_Y + 40) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 20);
      ctx.stroke();
    }
    if ((t * 1.7) % 3 < 0.14) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = a;
      const x0 = 40 + noise(Math.floor(t * 0.6)) * 280;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 - 18, 90);
      ctx.lineTo(x0 + 10, 100);
      ctx.lineTo(x0 - 14, 210);
      ctx.stroke();
    }
  } else if (id === 'gas') {
    ctx.fillStyle = '#e5e7eb';
    ctx.globalAlpha = 0.2 * a;
    for (let i = -2; i < 30; i++) {
      const y = i * 30 + ((t * 90) % 30);
      for (const x of [0, W - 24]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 24, y - 14);
        ctx.lineTo(x + 24, y + 2);
        ctx.lineTo(x, y + 16);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3 * a;
    for (let i = 0; i < 14; i++) {
      const x = 30 + noise(i) * (W - 60);
      const y = fall(i, 520, COCKPIT_Y + 60) - 40;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 44);
      ctx.stroke();
    }
    ctx.fillStyle = '#ef4444';
    ctx.globalAlpha = (0.1 + 0.08 * Math.sin(t * 12)) * a;
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAS', CX, CY + 40);
  } else if (id === 'schuetteln') {
    const cols = ['#a3e635', '#facc15', '#22d3ee', '#e879f9'];
    ctx.fillStyle = '#a3e635';
    ctx.globalAlpha = 0.12 * a;
    for (let k = 0; k < 4; k++) {
      const an = t * 0.7 + (k * TAU) / 4;
      ctx.beginPath();
      ctx.moveTo(CX, -10);
      ctx.lineTo(CX + Math.cos(an) * 420 - 40, 360 + Math.sin(an) * 120);
      ctx.lineTo(CX + Math.cos(an) * 420 + 40, 360 + Math.sin(an) * 120);
      ctx.fill();
    }
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.globalAlpha = 0.7 * a;
      ctx.fillRect(noise(i * 2) * W + Math.sin(t * 3 + i) * 10, fall(i, 70, COCKPIT_Y + 20) - 10, 5, 5);
    }
    ctx.globalAlpha = 0.55 * a;
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) ctx.fillText(i % 2 ? '🥃' : '🧂', 30 + i * 75, 100 + 18 * Math.sin(t * 2 + i) + (i % 2) * 330);
  } else if (id === 'wolle') {
    ctx.fillStyle = '#fbbf24';
    ctx.globalAlpha = 0.13 * a;
    for (const sx of [0, W]) {
      const an = Math.PI / 2 + (sx ? 0.5 : -0.5) + Math.sin(t * 1.3 + sx) * 0.4;
      ctx.beginPath();
      ctx.moveTo(sx, COCKPIT_Y);
      ctx.lineTo(sx + Math.cos(an - 0.12) * 700, COCKPIT_Y - Math.sin(an - 0.12) * 700);
      ctx.lineTo(sx + Math.cos(an + 0.12) * 700, COCKPIT_Y - Math.sin(an + 0.12) * 700);
      ctx.fill();
    }
    ctx.globalAlpha = 0.7 * a;
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = i % 3 ? '#fbbf24' : '#fef3c7';
      ctx.fillRect(noise(i * 2) * W, fall(i, 60, COCKPIT_Y + 20) - 10, 4, 6);
    }
    ctx.fillStyle = '#0a0700';
    ctx.globalAlpha = 0.9 * a;
    for (let i = 0; i < 12; i++) {
      const bob = 3 * Math.abs(Math.sin(t * 5 + i));
      ctx.beginPath();
      ctx.arc(15 + i * 30, COCKPIT_Y - 6 - bob, 11, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 0.6 * a;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🥉', 40, 130 + 10 * Math.sin(t * 2));
    ctx.fillText('🥈', W - 40, 190 + 10 * Math.sin(t * 2 + 1));
    ctx.fillText('🥇', 40, 400 + 10 * Math.sin(t * 2 + 2));
  }
  ctx.globalAlpha = 1;
}
// Beat-Rahmen und Equalizer-Saeule am Boden: der ganze Bildschirm pumpt im Takt der Musik
function drawSongFx(ctx, col, a, t, pulse, beat) {
  ctx.strokeStyle = col;
  ctx.globalAlpha = (0.35 + 0.5 * pulse) * a;
  ctx.lineWidth = 3 + 7 * pulse;
  ctx.strokeRect(1, 1, W - 2, COCKPIT_Y - 2);
  ctx.fillStyle = col;
  const ph = beat.beatPhase ?? 0;
  for (let i = 0; i < 24; i++) {
    const h = 8 + 34 * Math.abs(Math.sin(t * 3.1 + i * 0.8)) * (0.45 + 0.55 * (1 - ph));
    ctx.globalAlpha = 0.22 * a;
    ctx.fillRect(i * 15 + 2, COCKPIT_Y - h, 11, h);
  }
  ctx.globalAlpha = 1;
}

// Elemente aus den SUDO-Shows: Bella-Konfetti, Rage-Cage-Becherturm, Biertornado-Windhose, Wolle-Flanell mit Vorhang und Discokugel
function drawSudoDecor(ctx, id, a, t, pulse) {
  const fall = (i, speed, span) => (t * speed * (0.6 + noise(i)) + noise(i * 5) * span) % span;
  if (id === 'napoli') {
    const cols = ['#16a34a', '#f8fafc', '#dc2626'];
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = cols[i % 3];
      ctx.globalAlpha = 0.8 * a;
      ctx.fillRect(noise(i * 2) * W + Math.sin(t * 3 + i) * 12, fall(i, 75, COCKPIT_Y + 20) - 10, 5, 8);
    }
  } else if (id === 'gas') {
    // Warnstreifen oben und unten, Becherturm am Boden wackelt im Takt
    for (const y of [0, COCKPIT_Y - 12]) {
      for (let i = -2; i < 16; i++) {
        ctx.fillStyle = i % 2 ? '#111827' : '#ef4444';
        ctx.globalAlpha = 0.55 * a;
        const x = i * 28 + ((t * 40) % 56);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 28, y);
        ctx.lineTo(x + 20, y + 12);
        ctx.lineTo(x - 8, y + 12);
        ctx.fill();
      }
    }
    for (let row = 0; row < 3; row++) {
      for (let c = 0; c <= 2 - row; c++) {
        const x = CX - 54 + row * 18 + c * 36 + Math.sin(t * 14 + row) * pulse * 3;
        const y = COCKPIT_Y - 16 - row * 16;
        ctx.fillStyle = '#dc2626';
        ctx.globalAlpha = 0.9 * a;
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 16);
        ctx.lineTo(x + 14, y - 16);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x - 10, y);
        ctx.fill();
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(x - 14, y - 16, 28, 3);
      }
    }
  } else if (id === 'tornado') {
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.22 * a;
      ctx.beginPath();
      ctx.ellipse(CX + Math.sin(t * 2 + i * 0.7) * 14, 60 + i * 38, 150 - i * 12, 8 + i, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 16; i++) {
      ctx.globalAlpha = 0.6 * a;
      ctx.fillRect(noise(i * 4) * W, fall(i, 90, COCKPIT_Y + 20) - 10, 3, 4);
    }
  } else if (id === 'wolle') {
    // Flanell-Karo, Vorhang links/rechts, Discokugel mit Lichtpunkten
    ctx.fillStyle = '#b91c1c';
    ctx.globalAlpha = 0.1 * a;
    for (let i = 0; i < 9; i++) ctx.fillRect(i * 44, 0, 18, COCKPIT_Y);
    for (let i = 0; i < 11; i++) ctx.fillRect(0, i * 44, W, 18);
    for (const side of [0, 1]) {
      const x = side ? W - 22 : 0;
      ctx.fillStyle = '#7f1d1d';
      ctx.globalAlpha = 0.95 * a;
      ctx.fillRect(x, 0, 22, COCKPIT_Y);
      ctx.fillStyle = '#450a0a';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 7, 0, 2, COCKPIT_Y);
    }
    ctx.fillStyle = '#cbd5e1';
    ctx.globalAlpha = 0.95 * a;
    ctx.fillRect(CX - 1, 0, 2, 18);
    ctx.beginPath();
    ctx.arc(CX, 32, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 5; i++) ctx.fillRect(CX - 14 + ((i * 7 + t * 20) % 28), 22 + (i % 3) * 8, 5, 5);
    const cols = ['#fbbf24', '#f9a8d4', '#67e8f9', '#fef3c7'];
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.globalAlpha = (0.25 + 0.5 * Math.abs(Math.sin(t * 2 + i))) * a;
      const an = t * 0.6 + i * 0.35;
      ctx.fillRect(CX + Math.cos(an) * (60 + i * 8), 40 + Math.abs(Math.sin(an * 1.1 + i)) * 360, 5, 5);
    }
  }
  ctx.globalAlpha = 1;
}

// Rammstein-Finale im Stil der SUDO-Buehnenshow: Scheinwerfer-Kegel, Feuersaeulen aus dem Boden, Publikum mit Handylichtern, Schockwellen und Strobe
function drawInferno(ctx, t, a, pulse, beat, lvl) {
  const ph = beat.beatPhase ?? 0;
  const k = Math.min(1.4, 0.5 + 0.5 * lvl);
  const base = COCKPIT_Y;
  // roter Buehnennebel am Boden
  ctx.fillStyle = '#7f1d1d';
  ctx.globalAlpha = 0.28 * a * k;
  ctx.fillRect(0, base - 150, W, 150);
  ctx.fillStyle = '#ef4444';
  ctx.globalAlpha = (0.05 + 0.08 * pulse) * a * k;
  ctx.fillRect(0, base - 90, W, 90);
  // Scheinwerfer-Kegel schwenken von den Lampen am Boden
  for (let i = 0; i < 5; i++) {
    const x = 36 + i * 72;
    const lean = Math.sin(t * 0.9 + i * 1.3) * 110;
    ctx.fillStyle = '#ffe8c2';
    ctx.globalAlpha = 0.06 * a * k;
    ctx.beginPath();
    ctx.moveTo(x - 4, base);
    ctx.lineTo(x + lean - 46, base - 470);
    ctx.lineTo(x + lean + 46, base - 470);
    ctx.lineTo(x + 4, base);
    ctx.fill();
    ctx.globalAlpha = 0.1 * a * k;
    ctx.beginPath();
    ctx.moveTo(x - 1, base);
    ctx.lineTo(x + lean - 12, base - 470);
    ctx.lineTo(x + lean + 12, base - 470);
    ctx.lineTo(x + 1, base);
    ctx.fill();
  }
  // Feuersaeulen: gross auf jedem 4. Schlag, kleine auf jedem Schlag im spaeten Song
  const env = Math.max(pulse * pulse, lvl > 0.75 ? (1 - ph) * (1 - ph) * 0.5 : 0);
  if (env > 0.04) {
    const xs = lvl > 1.1 ? [34, 104, 180, 256, 326] : [52, 128, 232, 308];
    const hgt = (70 + 120 * Math.min(1.2, lvl)) * env + 14;
    for (let i = 0; i < xs.length; i++) {
      const hh = hgt * (0.8 + 0.2 * Math.sin(t * 20 + i * 2));
      ctx.save();
      ctx.translate(xs[i], base);
      ctx.scale(2.1, hh / 82);
      ctx.fillStyle = '#c2410c';
      ctx.globalAlpha = 0.7 * a;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.bezierCurveTo(-11, -26, -3, -46, -6, -82);
      ctx.bezierCurveTo(4, -56, 4, -30, 0, -12);
      ctx.bezierCurveTo(5, -36, 10, -48, 12, -72);
      ctx.bezierCurveTo(18, -40, 12, -14, 7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.globalAlpha = 0.85 * a;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.bezierCurveTo(-5, -18, -1, -30, -2, -50);
      ctx.bezierCurveTo(3, -30, 4, -16, 4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // Schockwelle vom Fiech auf jedem 4. Schlag
  if (pulse > 0.05) {
    ctx.strokeStyle = '#fff1c9';
    ctx.lineWidth = 2 + 5 * pulse;
    ctx.globalAlpha = pulse * 0.5 * a;
    ctx.beginPath();
    ctx.arc(CX, CY, 60 + (1 - pulse) * 300, 0, TAU);
    ctx.stroke();
  }
  // Publikum: Silhouetten mit Handy-Lichtern
  for (let i = 0; i < 15; i++) {
    const x = 12 + i * 24 + (i % 2) * 3;
    const hs = 14 + (i % 3) * 5 + Math.abs(Math.sin(t * 4 + i)) * 3 * (1 - ph);
    ctx.fillStyle = '#050203';
    ctx.globalAlpha = 0.95 * a;
    ctx.fillRect(x - 8, base - hs, 16, hs);
    ctx.beginPath();
    ctx.arc(x, base - hs - 4, 6, 0, TAU);
    ctx.fill();
    if (i % 3 === 0) {
      ctx.fillStyle = Math.sin(t * 6 + i) > -0.3 ? '#f8fafc' : '#94a3b8';
      ctx.fillRect(x + 4, base - hs - 20, 4, 7);
    }
  }
  // Glut
  ctx.fillStyle = '#fdba74';
  for (let i = 0; i < 30; i++) {
    const sp = 30 + noise(i) * 60;
    ctx.globalAlpha = 0.7 * a * k;
    ctx.fillRect(noise(i * 2) * W + Math.sin(t * 2 + i) * 10, base - ((t * sp + noise(i * 7) * 600) % base), 3, 3);
  }
  // Strobe
  if (pulse > 0.75) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = (pulse - 0.75) * 0.35 * a * k;
    ctx.fillRect(0, 0, W, base);
  }
  ctx.globalAlpha = 1;
}

// Phasenspezifische Zusatzeffekte (ohne Gradienten/Schatten)
function drawPhaseExtras(ctx, id, a, t, beat) {
  const ph = beat.beatPhase ?? 0;
  if (id === 'gas') {
    // Drehzahlmesser: Nadel springt im Takt in den roten Bereich
    const x = 312;
    const y = 86;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.8 * a;
    ctx.strokeStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(x, y, 24, Math.PI, TAU);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.arc(x, y, 24, Math.PI * 1.75, TAU);
    ctx.stroke();
    const na = Math.PI + Math.PI * clamp(0.55 + 0.4 * Math.sin(t * 6) * (1 - ph) + 0.1, 0, 1);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(na) * 22, y + Math.sin(na) * 22);
    ctx.stroke();
    // Tempo-Streifen
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.25 * a;
    for (let i = 0; i < 10; i++) {
      const yy = 110 + noise(i * 3) * 300;
      const xx = ((t * 600 * (0.6 + noise(i)) + noise(i * 9) * W) % (W + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - 46, yy);
      ctx.stroke();
    }
  } else if (id === 'tornado') {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85 * a;
    for (let i = 0; i < 5; i++) {
      const an = t * 1.6 + i * 1.25;
      const rr = 150 + 34 * Math.sin(t * 0.7 + i);
      ctx.fillText(i % 2 ? '🍺' : '🥫', CX + Math.cos(an) * rr, CY + Math.sin(an) * rr * 0.55 - 120 + (i * 60) % 240);
    }
  } else if (id === 'napoli') {
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8 * a;
    for (let i = 0; i < 6; i++) {
      const y = ((t * 55 * (0.7 + noise(i)) + noise(i * 4) * COCKPIT_Y) % (COCKPIT_Y + 30)) - 15;
      ctx.fillText(i % 3 ? '🍕' : '🍝', 24 + noise(i * 6) * (W - 48), y);
    }
  } else if (id === 'wolle') {
    // Wellen-Welle: Arme gehen nacheinander hoch
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 * a;
    for (let i = 0; i < 12; i++) {
      const up = Math.max(0, Math.sin(t * 3 - i * 0.6));
      const x = 15 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, COCKPIT_Y - 14);
      ctx.lineTo(x + 3, COCKPIT_Y - 14 - 6 - 18 * up);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
// Song-Requisiten kreisen um das Fiech
function drawSongProps(ctx, id, a, t) {
  const icon = { napoli: '🍕', sonne: '☀️', tornado: '🌪️', gas: '🏁', schuetteln: '🥃', wolle: '🏅' }[id];
  ctx.globalAlpha = 0.9 * a;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  const spin = id === 'gas' ? -2.6 : 1.4;
  for (let i = 0; i < 4; i++) {
    const an = t * spin + (i * TAU) / 4;
    ctx.fillText(icon, CX + Math.cos(an) * 66, CY + Math.sin(an) * 66 + 6);
  }
  ctx.globalAlpha = 1;
}

// Plattenspieler-HUD: kreisende Platte mit Song-Fortschritt und Songname
function drawSongHud(ctx, col, a, name, prog, t) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#05050a';
  ctx.beginPath();
  ctx.arc(26, 70, 14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(26, 70, 14, -Math.PI / 2, -Math.PI / 2 + TAU * prog);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(26, 70, 8, t * 5, t * 5 + 2.2);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(26, 70, 2.5, 0, TAU);
  ctx.fill();
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(name, 46, 74);
  ctx.globalAlpha = 1;
}

function drawRails(ctx, ac, dj, unl, unlockT, tc = GREEN) {
  const rails = unl ? [[R_OUT, 15], [R_IN, 13]] : [[R_OUT, 15]];
  for (const [rr, w] of rails) {
    ctx.strokeStyle = '#05050a';
    ctx.lineWidth = w * 2;
    ctx.beginPath();
    ctx.arc(CX, CY, rr, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = dj ? tc : ac;
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

function drawVinylDisc(ctx, t, col = '#14532d') {
  ctx.fillStyle = '#04060a';
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUT + 24, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.globalAlpha = col === '#14532d' ? 0.5 : 0.3;
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
    ctx.scale(GLASS_SC, GLASS_SC);
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

// DJ-Look: Kopfhoerer ueber dem Kopf, Sonnenbrille mit >_ und kleines DJ-Pult am Bauch
function drawDjGear(ctx, t, beat) {
  const pulse = 1 - beat.beatPhase;
  // Kopfhoerer-Buegel + Muscheln
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#05070a';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(CX, CY - 4, 47, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const s of [-1, 1]) {
    const x = CX + s * 47;
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(x, CY - 6, 13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = VIOLET;
    ctx.globalAlpha = 0.4 + 0.6 * pulse;
    ctx.beginPath();
    ctx.arc(x, CY - 6, 6 + 3 * pulse, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Sonnenbrille mit >_ (ueber den Augen am oberen Rand)
  ctx.fillStyle = '#05070a';
  ctx.fillRect(CX - 30, CY - 50, 28, 14);
  ctx.fillRect(CX + 2, CY - 50, 28, 14);
  ctx.fillRect(CX - 4, CY - 46, 8, 3);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1;
  ctx.strokeRect(CX - 29.5, CY - 49.5, 27, 13);
  ctx.strokeRect(CX + 2.5, CY - 49.5, 27, 13);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('>_', CX - 16, CY - 39);
  if (Math.floor(t * 3) % 2) ctx.fillText('_', CX + 16, CY - 39);
  // DJ-Pult
  ctx.fillStyle = '#05070a';
  ctx.fillRect(CX - 36, CY + 24, 72, 18);
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 2;
  ctx.strokeRect(CX - 35, CY + 25, 70, 16);
  for (const s of [-1, 1]) {
    const x = CX + s * 22;
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(x, CY + 33, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, CY + 33);
    ctx.lineTo(x + Math.cos(t * 6 * s) * 6, CY + 33 + Math.sin(t * 6 * s) * 6);
    ctx.stroke();
  }
  ctx.fillStyle = '#374151';
  ctx.fillRect(CX - 1.5, CY + 27, 3, 12);
  ctx.fillStyle = GOLD;
  ctx.fillRect(CX - 5, CY + 28 + pulse * 7, 10, 3);
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

function drawFlameBand(ctx, a, half, rr, t, ring) {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = RED;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(CX, CY, rr, a - half, a + half);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#fb923c';
  const n = Math.max(3, Math.round((half * 2 * rr) / 14));
  for (let i = 0; i < n; i++) {
    const q = ringPt(a - half + ((i + 0.5) / n) * half * 2, rr + 12);
    ctx.beginPath();
    ctx.moveTo(q.x - 5, q.y + 6);
    ctx.lineTo(q.x + 5, q.y + 6);
    ctx.lineTo(q.x, q.y - 12 - 8 * Math.abs(Math.sin(t * 20 + i)));
    ctx.fill();
  }
}

function drawBody(ctx, h, t) {
  const live = t >= liveAtOf(h);
  if (h.kind === 'spokes') {
    if (!live) return;
    if (h.ring !== undefined) {
      for (let k = 0; k < h.count; k++) drawFlameBand(ctx, h.base + (k * TAU) / h.count, h.half, radOf(h.ring), t, h.ring);
      return;
    }
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
      if (h.can) drawCan(ctx, x, y, h.rot + t * 9);
      else drawKornBottle(ctx, x, y, h.rot + t * 9, 1.1);
    } else {
      drawFlameBand(ctx, h.angle, h.half ?? FLAME_HALF, rr, t, h.ring);
    }
  } else if (h.kind === 'arcs') {
    if (!live) return;
    const k = (t - h.liveAt) / ARC_DUR;
    if (h.ring === undefined) drawRing(ctx, CX, CY, 30 + k * (R_OUT - 10), RED, 1 - k * 0.5, 6);
    for (const rr of railList(h.ring)) {
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
    if (h.ring !== undefined) {
      drawFlameBand(ctx, h.angle, GEYSER_HALF, radOf(h.ring), t, h.ring);
      return;
    }
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

function drawCan(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-7, -11, 14, 22);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-7, -4, 14, 7);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(-7, -12, 14, 3);
  ctx.fillRect(-7, 9, 14, 3);
  ctx.restore();
}

function drawCap(ctx, c, t, calls, medal = GOLD) {
  if (t < c.born) return;
  const left = c.life - (t - c.born);
  if (left < 0.8 && Math.floor(t * 12) % 2) return;
  const rr = radOf(c.ring);
  const p = ringPt(c.angle, rr);
  if (c.kind === 'sudo') {
    ctx.fillStyle = '#02130a';
    ctx.fillRect(p.x - 27, p.y - 10, 54, 20);
    ctx.strokeStyle = Math.floor(t * 6) % 2 ? medal : GREEN;
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
