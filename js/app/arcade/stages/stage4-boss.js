import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource } from './stage-utils.js';
import {
  W,
  H,
  R,
  GAP_W,
  PLANK_TELL,
  BOTTLE_FLIGHT,
  PACK_FALL,
  BREW,
  CAP_SPEED,
  CAP_TELL,
  LASER_TELL,
  LASER_LIVE,
  SHOCK_CHARGE,
  hazardHit,
  hazardDone,
  foamHit,
  plankY
} from './stage4-hazards.js';
import {
  drawBackground,
  drawGlitch,
  drawPillars,
  drawSchnapslatte,
  drawBossAura,
  drawCannon,
  drawRing,
  drawHazard,
  drawFoam,
  drawCapsule,
  drawCallout,
  drawBanner
} from './stage4-draw.js';

export const GLASSES = 12;
export const ARENA = { x0: 36, x1: 324, y0: 312, y1: 528 };
export const TOUCH_OFFSET_Y = 34;
export const PLAYER_SPEED = 260;
export const DASH_TIME = 0.22;
export const DASH_SPEED = 900;
export const DASH_COOLDOWN = 0.7;
export const SHOT_DAMAGE = 0.09;
export const BOSS_Y = 130;
export const FOAM_TOP = 0.82 * H;
export { W, H };

// Eis-Cyan & Blutrot / Giftgruen & Pink / Bernstein & Dunkelrot / Violett & Alarmrot
export const PHASES = [
  { accent: '#22d3ee', dark: '#7f1d1d' },
  { accent: '#4ade80', dark: '#9d174d' },
  { accent: '#f59e0b', dark: '#7f1d1d' },
  { accent: '#a855f7', dark: '#b91c1c' }
];

export const phaseOf = (glasses) => (glasses > 9 ? 0 : glasses > 6 ? 1 : glasses > 3 ? 2 : 3);

export function createStage4(random = Math.random) {
  let engine;
  let tick;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let t = 0; // Weltzeit (bei Zeitlupe langsamer)
  let ts = 1;
  let hp = GLASSES;
  let phase = 0;
  let mode = 'shield'; // shield | fight | smash | ko
  let shieldBeats = 4;
  let cycle = 0;
  let beatNo = 0;
  let lastBeatT = 0;
  let prevSub = 0;
  let completed = false;

  const p = { x: W / 2, y: 460 };
  let dash = 0;
  let dashInv = 0;
  let dashCd = 0;
  let dashDir = { x: 0, y: -1 };
  let lastDir = { x: 0, y: -1 };
  let prevSpace = false;
  let lastTap = { t: 0, x: 0, y: 0 };
  let lastMove = null;
  let trail = [];

  let anchor = W / 2;
  let swayAmp = 38;
  let holdUntil = 0;
  let by = BOSS_Y;
  let byTarget = BOSS_Y;
  let tele = 0;
  let wob = 0;
  let slamT = 0;
  let foamLevel = H + 6;

  let hazards = [];
  let shots = [];
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
  let smashT = 0;
  let koT = 0;
  let lastGx = W / 2;

  const glasses = () => Math.ceil(hp - 1e-6);
  const accent = () => PHASES[phase].accent;
  const swaying = () => (t < holdUntil ? 0 : 1);
  const bossX = () => anchor + Math.sin(t * 0.9) * swayAmp;
  const beatLen = () => 60 / (beat.bpm || 105);
  const rand = (a, b) => a + random() * (b - a);

  function burst(x, y, color, count, power = 120, size = 3) {
    for (let i = 0; i < count && sparks.length < 280; i++) {
      const a = random() * Math.PI * 2;
      const v = (0.25 + random() * 0.75) * power;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + random() * 0.7, color, size: 2 + random() * size });
    }
  }

  const say = (text, color) => {
    callout = { text, color, t: 1 };
  };

  function hurt() {
    if (dashInv > 0) return;
    if (engine.hit()) flash = Math.max(flash, 0.25);
  }

  // ------------------------------------------------------------ Spieler

  function tryDash(dx, dy) {
    if (dash > 0 || dashCd > 0 || mode === 'ko') return;
    let len = Math.hypot(dx, dy);
    if (len < 1) {
      dx = lastDir.x;
      dy = lastDir.y;
      len = Math.hypot(dx, dy) || 1;
    }
    dashDir = { x: dx / len, y: dy / len };
    dash = DASH_TIME;
    dashInv = DASH_TIME;
    dashCd = DASH_COOLDOWN;
    engine.beep(660, 'sawtooth', 0.12, 0.03);
  }

  function movePlayer(dt) {
    const keys = engine.keys;
    const space = keys.has(' ');
    let kx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    let ky = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
    const ptr = engine.pointer;
    const ptrOn = ptr.down && Number.isFinite(ptr.x) && Number.isFinite(ptr.y);
    const tx = ptrOn ? clamp(ptr.x, ARENA.x0, ARENA.x1) : p.x;
    const ty = ptrOn ? clamp(ptr.y - TOUCH_OFFSET_Y, ARENA.y0, ARENA.y1) : p.y;
    if (space && !prevSpace) {
      if (kx || ky) tryDash(kx, ky);
      else if (ptrOn && Math.hypot(tx - p.x, ty - p.y) > 10) tryDash(tx - p.x, ty - p.y);
      else tryDash(0, 0);
    }
    prevSpace = space;

    const ox = p.x;
    const oy = p.y;
    if (dash > 0) {
      p.x += dashDir.x * DASH_SPEED * dt;
      p.y += dashDir.y * DASH_SPEED * dt;
      trail.push({ x: ox, y: oy, a: 1 });
    } else if (kx || ky) {
      const len = Math.hypot(kx, ky);
      p.x += (kx / len) * PLAYER_SPEED * dt;
      p.y += (ky / len) * PLAYER_SPEED * dt;
    } else if (ptrOn) {
      const k = Math.min(1, dt * 16);
      let dx = (tx - p.x) * k;
      let dy = (ty - p.y) * k;
      const max = 650 * dt;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        dx *= max / d;
        dy *= max / d;
      }
      p.x += dx;
      p.y += dy;
    }
    p.x = clamp(p.x, ARENA.x0, ARENA.x1);
    p.y = clamp(p.y, ARENA.y0, ARENA.y1);
    const mx = p.x - ox;
    const my = p.y - oy;
    if (dash <= 0 && Math.hypot(mx, my) > 0.5) lastDir = { x: mx, y: my };
    dash = Math.max(0, dash - dt);
    dashInv = Math.max(0, dashInv - dt);
    dashCd = Math.max(0, dashCd - dt);
    for (const g of trail) g.a -= dt * 5;
    trail = trail.filter((g) => g.a > 0);
  }

  // ------------------------------------------------------------ Boss-HP

  function shatter(i) {
    broken[i] = true;
    const gx = W / 2 - 150 + (300 / 12) * (i + 0.5);
    burst(gx, 50, i % 2 ? '#22d3ee' : '#fbbf24', 16, 190, 4);
    burst(gx, 50, '#e5e7eb', 8, 150, 2);
    engine.addScore(100);
    engine.shake(0.22);
    engine.beep(1200, 'square', 0.08, 0.04);
    engine.beep(300, 'sawtooth', 0.18, 0.04);
    glassFlash = 1;
  }

  function damage(amount, x, y) {
    if (mode !== 'fight' || tele > 0) return;
    const before = glasses();
    hp = Math.max(0, hp - amount);
    if (Math.abs(hp - Math.round(hp)) < 1e-6) hp = Math.round(hp);
    bossFlash = 1;
    const after = glasses();
    burst(x, y, '#ffffff', 3, 90, 2);
    for (let i = before - 1; i >= after; i--) shatter(i);
    if (after === 0) {
      startSmash();
      return;
    }
    const np = phaseOf(after);
    if (np !== phase) startShield(np);
  }

  function overcharge() {
    if (mode !== 'fight') return;
    engine.addScore(100);
    say(CONTENT.declineGame.arcade.stage4.calls.prost, '#fde047');
    overBeam = { t: 0.3, x: p.x, y: p.y };
    engine.shake(0.3);
    const n = glasses();
    damage(hp - (n - 1), bossX(), by);
  }

  // ------------------------------------------------------------ Phasen

  function startShield(np) {
    phase = np;
    mode = 'shield';
    shieldBeats = 3;
    for (const h of hazards) burst(h.tx ?? h.sx ?? W / 2, h.ty ?? h.sy ?? 300, accent(), 4, 120);
    hazards = [];
    capsules = [];
    holdUntil = 0;
    bannerT = 1;
    barPulse = 1;
    flash = 0.6;
    engine.shake(0.4);
    engine.beep(120, 'sawtooth', 0.45, 0.04, 40);
  }

  function startSmash() {
    mode = 'smash';
    smashT = 0;
    ts = 0.35;
    hazards = [];
    capsules = [];
    shots = [];
    anchor = W / 2;
    holdUntil = Infinity;
    byTarget = 250;
    flash = 0.8;
    say(CONTENT.declineGame.arcade.stage4.calls.smash, '#4ade80');
    engine.shake(0.5);
    engine.beep(90, 'sawtooth', 0.6, 0.05, 30);
  }

  function startKo() {
    mode = 'ko';
    ts = 1;
    koT = 0;
    const bx = bossX();
    burst(bx, by, '#ffffff', 22, 330, 4);
    burst(bx, by, '#ef4444', 20, 260, 5);
    burst(bx, by, '#fbbf24', 18, 300, 4);
    burst(bx, by, '#22d3ee', 14, 280, 3);
    hazards = [];
    flash = 1;
    engine.addScore(500);
    engine.shake(0.7);
    say(CONTENT.declineGame.arcade.stage4.calls.ko, '#ffffff');
    engine.beep(70, 'sawtooth', 0.8, 0.05, 25);
  }

  // ------------------------------------------------------------ Angriffe

  function teleport(x) {
    pillars.push({ x: bossX(), t0: t, life: 0.5, color: accent() }, { x, t0: t + 0.05, life: 0.5, color: accent() });
    tele = 0.32;
    anchor = x;
    engine.beep(90, 'sawtooth', 0.2, 0.03, 220);
  }

  function spawnPlank() {
    const gx = clamp(rand(20, W - 20 - GAP_W), lastGx - 170, lastGx + 170);
    lastGx = clamp(gx, 14, W - 14 - GAP_W);
    hazards.push({ kind: 'plank', gx: lastGx, tellAt: t, liveAt: t + PLANK_TELL });
    teleport(clamp(lastGx + GAP_W / 2, 70, 290));
    slamT = 0.7;
    say(CONTENT.declineGame.arcade.stage4.calls.plank, '#fecaca');
    engine.beep(140, 'square', 0.2, 0.04, 70);
  }

  function spawnBottle() {
    const bx = bossX();
    hazards.push({
      kind: 'bottle',
      sx: bx,
      sy: by + 30,
      tx: clamp(p.x + rand(-45, 45), 44, 316),
      ty: clamp(p.y + rand(-35, 35), 330, 516),
      throwAt: t,
      landAt: t + BOTTLE_FLIGHT,
      rot: rand(0, 6.28)
    });
  }

  function nextBeatAtOrAfter(time) {
    const bl = beatLen();
    const k = Math.ceil((time - lastBeatT) / bl - 1e-6);
    return lastBeatT + Math.max(1, k) * bl;
  }

  function spawnPack() {
    const tx = rand(50, 310);
    const landAt = t + PACK_FALL;
    hazards.push({
      kind: 'pack',
      sx: bossX(),
      sy: by + 30,
      tx,
      ty: rand(360, 520),
      color: Math.floor(random() * 3),
      throwAt: t,
      landAt,
      fireAt: nextBeatAtOrAfter(landAt + BREW)
    });
  }

  function spawnCap() {
    const sx = bossX();
    const sy = by + 30;
    const a = clamp(Math.atan2(p.x - sx, p.y - sy) + rand(-0.3, 0.3), -0.9, 0.9);
    hazards.push({ kind: 'cap', sx, sy, vx: CAP_SPEED * Math.sin(a), vy: CAP_SPEED * Math.cos(a), tellAt: t, launchAt: t + CAP_TELL });
    engine.beep(520, 'square', 0.05, 0.02);
  }

  function spawnLasers() {
    const spots = [70, 180, 290].filter((x) => Math.abs(x - anchor) > 20);
    const x = spots[Math.floor(random() * spots.length)];
    holdUntil = t + LASER_TELL + LASER_LIVE + 0.3;
    swayAmp = 0;
    teleport(x);
    const oy = by + 34;
    const beams = [x - 30, x + 30].map((ox) => ({ ox, oy, ang: Math.atan2(p.y - oy, p.x - ox) }));
    hazards.push({ kind: 'laser', beams, tellAt: t, fireAt: t + LASER_TELL });
    slamT = 0.9;
    say(CONTENT.declineGame.arcade.stage4.calls.laser, '#fca5a5');
    engine.beep(240, 'sawtooth', 0.4, 0.04, 600);
  }

  function spawnShock() {
    const cx = bossX();
    const side = p.x < W / 2 ? 1 : -1;
    const gapX = clamp(p.x + side * 110, 50, 310);
    hazards.push({ kind: 'shock', cx, cy: by, startAt: t + SHOCK_CHARGE, ga: Math.atan2(p.y - by, gapX - cx) });
    engine.beep(80, 'sawtooth', 0.5, 0.04, 40);
  }

  function spawnCapsule() {
    capsules.push({ x: rand(56, 304), y: rand(336, 506), life: 4.6 });
  }

  function attack(n) {
    switch (phase) {
      case 0: {
        const m = n % 4;
        if (m === 0) spawnPlank();
        else if (m === 2 || m === 3) spawnBottle();
        break;
      }
      case 1:
        if (n === 0) {
          teleport(W / 2);
          say(CONTENT.declineGame.arcade.stage4.calls.shake, '#4ade80');
        }
        if (n % 2 === 0) spawnPack();
        if (n % 8 === 4) spawnPlank();
        break;
      case 2:
        if (n % 2 === 0) spawnCap();
        break;
      default:
        if (n % 4 === 0) spawnLasers();
        if (n % 8 === 3) spawnShock();
    }
  }

  function onBeat() {
    beatNo++;
    lastBeatT = t;
    if (beatNo % 4 === 0) barPulse = 1;
    if (mode === 'shield') {
      if (--shieldBeats <= 0) {
        mode = 'fight';
        cycle = 0;
      }
      return;
    }
    if (mode !== 'fight') return;
    if (beatNo % 4 === 1 && capsules.length < 2) spawnCapsule();
    attack(cycle++);
  }

  // ------------------------------------------------------------ Update

  function updateHazards() {
    for (const h of hazards) {
      if (h.kind === 'bottle' && !h.landed && t >= h.landAt) {
        h.landed = true;
        burst(h.tx, h.ty, '#cbd5e1', 10, 150);
        engine.shake(0.12);
        engine.beep(180, 'square', 0.12, 0.04, 60);
      }
      if (h.kind === 'pack' && !h.fired && t >= h.fireAt) {
        h.fired = true;
        engine.beep(260, 'triangle', 0.25, 0.04, 700);
      }
      if (h.kind === 'laser' && !h.fired && t >= h.fireAt) {
        h.fired = true;
        engine.shake(0.25);
        engine.beep(110, 'sawtooth', 0.35, 0.05, 50);
      }
      if (h.kind === 'plank' && !h.went && t >= h.liveAt) {
        h.went = true;
        engine.beep(100, 'square', 0.15, 0.04, 50);
      }
      if (hazardHit(h, t, p.x, p.y)) hurt();
    }
    hazards = hazards.filter((h) => !hazardDone(h, t));
  }

  return {
    get color() {
      return accent();
    },
    drawsOwnBackground: true,
    init(e) {
      engine = e;
      tick = createBeatSource();
      p.x = W / 2;
      p.y = 470;
      startShield(0);
      shieldBeats = 4;
      barPulse = 0;
      flash = 0;
      bannerT = 1;
    },
    progress: () => 1 - hp / GLASSES,
    stress: () => Math.min(1, 0.4 + phase * 0.15 + (mode === 'smash' ? 0.2 : 0)),
    onTouch(ev) {
      const now = performance.now();
      if (ev.type === 'down') {
        lastMove = null;
        if (now - lastTap.t < 300 && Math.hypot(ev.x - lastTap.x, ev.y - lastTap.y) < 90) {
          tryDash(ev.x - p.x, ev.y - TOUCH_OFFSET_Y - p.y);
          lastTap.t = 0;
        } else lastTap = { t: now, x: ev.x, y: ev.y };
      } else if (ev.type === 'move') {
        if (lastMove) {
          const dtm = (now - lastMove.t) / 1000;
          const dx = ev.x - lastMove.x;
          const dy = ev.y - lastMove.y;
          if (dtm > 0.002 && dtm < 0.1 && Math.hypot(dx, dy) / dtm > 1500) tryDash(dx, dy);
        }
        lastMove = { t: now, x: ev.x, y: ev.y };
      } else lastMove = null;
    },
    debug: () => ({
      hazards,
      t,
      p,
      phase,
      hp,
      mode,
      foamLevel,
      dashCd,
      capsules,
      bossX: bossX(),
      dangerAt: (px, py, ahead, m = 0) => {
        if (hazards.some((h) => hazardHit(h, t + ahead, px, py, m))) return true;
        if (phase !== 2) return false;
        const lv = Math.min(foamLevel, Math.max(FOAM_TOP + 20, foamLevel - 70 * ahead));
        return foamHit(lv - m, px - 4, py) || foamHit(lv - m, px + 4, py);
      }
    }),
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      const wdt = dt * ts;
      t += wdt;
      movePlayer(dt);
      tele = Math.max(0, tele - dt);
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
      wob *= Math.max(0, 1 - dt * 14);
      swayAmp += (swaying() * 38 - swayAmp) * Math.min(1, dt * 3);
      by += (byTarget - by) * Math.min(1, dt * 3);
      for (const s of sparks) {
        s.x += s.vx * wdt;
        s.y += s.vy * wdt;
        s.vy += 170 * wdt;
        s.life -= wdt;
      }
      sparks = sparks.filter((s) => s.life > 0);
      pillars = pillars.filter((pl) => t - pl.t0 < pl.life);

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
        const near = Math.hypot(p.x - bossX(), p.y - by) < 74 - 6;
        if ((near && smashT >= 0.35) || smashT >= 1.2) startKo();
        return;
      }

      const sub = Math.floor(clamp(beat.beatPhase, 0, 0.9999) * 4);
      const subChanged = sub !== prevSub;
      prevSub = sub;
      if (beat.isBeat) onBeat();
      if (beat.isBeat || (subChanged && sub === 2)) {
        shots.push({ x: p.x, y: p.y - 16 });
        engine.beep(988, 'triangle', 0.025, 0.015);
      }
      if (phase === 1 && mode === 'fight' && (subChanged || beat.isBeat)) {
        wob = rand(-6, 6);
        if (beat.isBeat) engine.shake(0.06);
      }

      updateHazards();

      // Bier-Schaum steigt in Phase 3
      const foamTarget = phase === 2 && mode !== 'smash' ? FOAM_TOP + 10 + 10 * Math.sin(t * 1.8) : H + 6;
      const dy = foamTarget - foamLevel;
      foamLevel += clamp(dy, -70 * wdt, 70 * wdt);
      if (foamLevel < H && foamHit(foamLevel, p.x, p.y)) hurt();

      const bx = bossX();
      for (const s of shots) {
        s.y -= 560 * wdt;
        if (s.y > by) s.x += (bx - s.x) * Math.min(1, wdt * 3);
        if (s.y < by + 36 && Math.abs(s.x - bx) < 50 && tele <= 0) {
          s.dead = true;
          if (mode === 'fight') {
            engine.addScore(10);
            damage(SHOT_DAMAGE, s.x, s.y);
          } else burst(s.x, s.y, '#ffffff', 4, 110, 2);
        } else if (s.y < 10) s.dead = true;
      }
      shots = shots.filter((s) => !s.dead);

      for (const c of capsules) {
        c.life -= wdt;
        if (mode === 'fight' && Math.hypot(c.x - p.x, c.y - p.y) < 20) {
          c.life = 0;
          overcharge();
        }
      }
      capsules = capsules.filter((c) => c.life > 0);
    },
    render(ctx) {
      const P = PHASES[phase];
      const ac = P.accent;
      const bx = bossX();
      const dmgBroken = broken;
      drawBackground(ctx, { t, beat, accent: ac, barPulse });
      drawPillars(ctx, pillars, t);
      drawFoam(ctx, foamLevel, t);

      // Boss
      const visible = mode !== 'ko' && !(tele > 0.16 && Math.floor(tele * 60) % 2);
      if (visible) {
        const charge = clamp(hazards.some((h) => (h.kind === 'laser' || h.kind === 'shock' || h.kind === 'cap') && t < (h.fireAt ?? h.startAt ?? h.launchAt)) ? 1 : 0.15, 0, 1);
        drawBossAura(ctx, bx + wob, by, t, ac, charge, P.dark);
        drawCannon(ctx, bx - 76 + wob, by + 8, -1, t, ac, charge);
        drawCannon(ctx, bx + 76 + wob, by + 8, 1, t, ac, charge);
        const action = mode === 'smash' ? 'hover' : phase === 3 && slamT > 0 ? 'laser' : slamT > 0 ? 'slam' : phase === 1 && mode === 'fight' ? 'laugh' : 'hover';
        engine.drawFiech(ctx, bx + wob, by, 96, {
          beatPhase: beat.beatPhase,
          action,
          tilt: mode === 'smash' ? Math.sin(t * 9) * 0.35 : Math.sin(t * 2) * 0.06 + wob * 0.012
        });
        if (bossFlash > 0.05) {
          ctx.globalAlpha = bossFlash * 0.45;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx + wob, by, 46, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (mode === 'shield') drawRing(ctx, bx, by, 66 + 3 * Math.sin(t * 8), '#ffffff', 0.6, 3, [10, 8]);
        if (mode === 'smash') {
          const k = 1 + 0.06 * Math.sin(t * 24);
          drawRing(ctx, bx, by, 74 * k, '#4ade80', 1, 5);
          drawRing(ctx, bx, by, 60 * k, '#4ade80', 0.5, 2, [6, 6]);
        }
      }

      for (const h of hazards) drawHazard(ctx, h, t, ac);

      for (const c of capsules) drawCapsule(ctx, c, t);
      ctx.fillStyle = ac;
      for (const s of shots) {
        ctx.fillRect(s.x - 2, s.y - 9, 4, 14);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(s.x - 1, s.y - 7, 2, 8);
        ctx.fillStyle = ac;
      }
      if (overBeam) {
        const k = overBeam.t / 0.3;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 10 * k + 2;
        ctx.beginPath();
        ctx.moveTo(overBeam.x, overBeam.y);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * k + 1;
        ctx.stroke();
      }

      // Geisterspur und Spieler
      for (const g of trail) {
        ctx.globalAlpha = Math.max(0, g.a) * 0.5;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(g.x - 8, g.y - 8, 16, 16);
      }
      ctx.globalAlpha = 1;
      if (mode !== 'ko') {
        engine.drawPlayer(ctx, p.x, p.y, 30, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: dashInv > 0 ? '#22d3ee' : ac });
        if (dashCd <= 0) {
          ctx.fillStyle = '#22d3ee';
          ctx.globalAlpha = 0.7;
          ctx.fillRect(p.x - 7, p.y + 19, 14, 2);
          ctx.globalAlpha = 1;
        }
      }

      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life / 0.5, 0, 1);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // Schnapslatte als Boss-Lebensbalken
      const n = mode === 'ko' ? 0 : glasses();
      drawSchnapslatte(ctx, W / 2, 58, 300, {
        alive: n,
        partial: n > 0 ? hp - (n - 1) : 0,
        accent: ac,
        t,
        flash: glassFlash + bossFlash,
        broken: dmgBroken
      });


      drawGlitch(ctx, t, barPulse, ac);
      drawBanner(ctx, phase, CONTENT.declineGame.arcade.stage4, ac, mode === 'shield' ? bannerT : 0);
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

export { plankY, R };
