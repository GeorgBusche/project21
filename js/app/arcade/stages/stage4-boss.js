import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource, moveX, roundRect } from './stage-utils.js';
import { drawBossBackground, drawBoss, drawBossBullet, drawBeam, drawBossHud } from './stage4-draw.js';

export const MAX_HP = 20;
export const PHASE_HP = 5;
export const LANES = 5;
export const LANE_W = 72;
export const PLAYER_Y_OFFSET = 100;
const SPAWN_Y = 215;
const BEAM_TELL = 1.6; // Beats Vorwarnung
const BEAM_FIRE = 0.4; // Beats aktiv
const DYING_SECONDS = 2.6;
const INTRO_BEATS = 3;

// Jede Phase = eine Waffe des Kolosses: Bier-Kanone, Korn-Flasche, Ahoi-Brause, Schnapslatte.
export const PHASES = [
  { kind: 'foam', accent: '#f59e0b', accent2: '#fde68a', rowEvery: 2, beamEvery: 0, win: 3, speed: 215, wobble: 0 },
  { kind: 'flask', accent: '#67e8f9', accent2: '#e0f2fe', rowEvery: 2, beamEvery: 6, win: 2, speed: 235, wobble: 0 },
  { kind: 'bubble', accent: '#a3e635', accent2: '#fb923c', rowEvery: 1, beamEvery: 0, win: 2, speed: 250, wobble: 14 },
  { kind: 'latte', accent: '#ef4444', accent2: '#fbbf24', rowEvery: 1, beamEvery: 7, win: 2, speed: 265, wobble: 0 }
];

export const laneX = (i) => LANE_W * (i + 0.5);
export const laneOf = (x) => clamp(Math.round(x / LANE_W - 0.5), 0, LANES - 1);

// Stage 4: Omega-Fiech. Vier Waffen-Phasen, Spieler feuert im Beat, Ausweichen nach Spuren.
export function createStage4(random = Math.random) {
  let engine;
  let tick;
  let t = 0;
  let hp = MAX_HP;
  let hurt = 0;
  let phase = 0;
  let mode = 'fight'; // fight | intro | dying
  let introBeats = 0;
  let beatNo = 0;
  let phaseBeat0 = 1;
  let beamBusyUntil = 0;
  let rowId = 0;
  let prevStart = 1;
  let lastRowBeat = -9;
  let sameStreak = 0;
  let dyingT = 0;
  let completed = false;
  let flash = 0;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let bullets = [];
  let shots = [];
  let beams = [];
  let sparks = [];
  const player = { x: 180 };
  const playerY = () => engine.H - PLAYER_Y_OFFSET;
  const bossSpeed = () => 0.8 + phase * 0.22;
  const bossX = () => engine.W / 2 + Math.sin(t * bossSpeed()) * 70;
  const beatLen = () => 60 / (beat.bpm || 105);

  function burst(x, y, color, count, power = 120) {
    for (let i = 0; i < count && sparks.length < 220; i++) {
      const a = random() * Math.PI * 2;
      const v = (0.3 + random() * 0.7) * power;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.5 + random() * 0.5, color, size: 2 + random() * 3 });
    }
  }

  function startPhase(next) {
    phase = next;
    mode = 'intro';
    introBeats = INTRO_BEATS;
    phaseBeat0 = beatNo + INTRO_BEATS + 1;
    beamBusyUntil = 0;
    for (const b of bullets) burst(b.x ?? engine.W / 2, b.y, PHASES[next].accent, 3, 90);
    bullets = [];
    beams = [];
    flash = 1;
    engine.shake(0.3);
    engine.beep(130, 'sawtooth', 0.4, 0.04);
  }

  function spawnRow(P) {
    const sinceLast = beatNo - lastRowBeat;
    const maxStart = LANES - P.win;
    const maxShift = sinceLast >= 2 ? 2 : 1;
    const options = [];
    for (let s = 0; s <= maxStart; s++) {
      if (Math.abs(s - prevStart) > maxShift) continue;
      if (s === prevStart && sameStreak >= 1) continue;
      options.push(s);
    }
    const start = options.length ? options[Math.floor(random() * options.length)] : Math.min(prevStart, maxStart);
    sameStreak = start === prevStart ? sameStreak + 1 : 0;
    prevStart = start;
    lastRowBeat = beatNo;
    rowId++;
    if (P.kind === 'latte') {
      bullets.push({ kind: 'latte', row: rowId, y: SPAWN_Y, vy: P.speed, segs: [[0, start * LANE_W], [(start + P.win) * LANE_W, engine.W]], start, win: P.win });
      return;
    }
    for (let l = 0; l < LANES; l++) {
      if (l >= start && l < start + P.win) continue;
      bullets.push({ kind: P.kind, row: rowId, x: laneX(l), x0: laneX(l), y: SPAWN_Y, vy: P.speed, r: 11, ph: random() * 6.28, wob: P.wobble });
    }
  }

  // Strahl zielt auf die aktuelle Spur des Spielers und rastet vor dem Schuss ein
  function spawnBeam(P) {
    const lane = laneOf(player.x);
    const len = beatLen();
    beams.push({ x: laneX(lane), lane, born: t, fireAt: t + BEAM_TELL * len, endAt: t + (BEAM_TELL + BEAM_FIRE) * len, color: P.accent });
    beamBusyUntil = beatNo + 3;
    engine.beep(300, 'sawtooth', 0.25, 0.03, 90);
  }

  function scheduleBeat() {
    const P = PHASES[phase];
    const n = beatNo - phaseBeat0;
    if (n < 0) return;
    if (P.beamEvery && n > 0 && n % P.beamEvery === 0 && beamBusyUntil <= beatNo) {
      spawnBeam(P);
      return;
    }
    if (beamBusyUntil > beatNo) return;
    if (n % P.rowEvery === 0) spawnRow(P);
  }

  function damageBoss(x, y) {
    hp = Math.max(0, hp - 1);
    hurt = 1;
    flash = Math.max(flash, 0.35);
    engine.addScore(50);
    engine.shake(0.1);
    burst(x, y, PHASES[phase].accent2, 8, 170);
    if (hp <= 0) {
      mode = 'dying';
      dyingT = 0;
      bullets = [];
      beams = [];
      engine.shake(0.5);
      return;
    }
    if (hp % PHASE_HP === 0) startPhase(phase + 1);
  }

  function updateDying(dt) {
    const before = dyingT;
    dyingT += dt;
    const bx = bossX();
    if (Math.floor(before * 10) !== Math.floor(dyingT * 10)) {
      burst(bx + (random() - 0.5) * 150, 120 + (random() - 0.5) * 120, random() < 0.5 ? '#fde68a' : PHASES[Math.floor(random() * 4)].accent, 12, 200);
      engine.beep(100 + random() * 160, 'sawtooth', 0.12, 0.03, 40);
      engine.shake(0.08);
    }
    if (dyingT >= DYING_SECONDS && !completed) {
      completed = true;
      flash = 1;
      engine.complete();
    }
  }

  return {
    get color() {
      return PHASES[phase].accent;
    },
    drawsOwnBackground: true,
    init(e) {
      engine = e;
      tick = createBeatSource();
      player.x = engine.W / 2;
      mode = 'intro';
      introBeats = INTRO_BEATS;
      phaseBeat0 = INTRO_BEATS + 1;
    },
    progress: () => 1 - hp / MAX_HP,
    debug: () => ({ bossX: bossX(), bullets, beams, t, phase, hp, mode, playerX: player.x, playerY: playerY() }),
    onTouch() {},
    stress: () => Math.min(1, 0.35 + (phase / 3) * 0.5 + (mode === 'dying' ? 0.15 : 0)),
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      t += dt;
      const { W, H } = engine;
      player.x = moveX(engine, player.x, 330, dt, 20, W - 20);
      hurt = Math.max(0, hurt - dt * 4);
      flash = Math.max(0, flash - dt * 2.5);
      for (const s of sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 160 * dt;
        s.life -= dt;
      }
      sparks = sparks.filter((s) => s.life > 0);

      if (mode === 'dying') {
        for (const s of shots) s.y -= 600 * dt;
        shots = shots.filter((s) => s.y > -10);
        updateDying(dt);
        return;
      }

      if (beat.isBeat) {
        beatNo++;
        if (beatNo % 2 === 0) {
          shots.push({ x: player.x, y: playerY() - 16 });
          engine.beep(988, 'triangle', 0.03, 0.02);
        }
        if (mode === 'intro') {
          introBeats--;
          if (introBeats <= 0) mode = 'fight';
        } else {
          scheduleBeat();
        }
      }

      const py = playerY();
      for (const b of bullets) {
        b.y += b.vy * dt;
        if (b.kind === 'latte') {
          if (!b.hit && Math.abs(b.y - py) < 15) {
            for (const [x0, x1] of b.segs) {
              if (player.x + 9 > x0 && player.x - 9 < x1) {
                b.hit = true;
                engine.hit();
                break;
              }
            }
          }
          continue;
        }
        if (b.wob) b.x = b.x0 + Math.sin(t * 4 + b.ph) * b.wob;
        if (Math.abs(b.x - player.x) < b.r + 9 && Math.abs(b.y - py) < b.r + 9) {
          b.dead = true;
          burst(b.x, b.y, PHASES[phase].accent2, 6, 110);
          engine.hit();
        }
      }
      for (const m of beams) {
        if (!m.hit && t >= m.fireAt && t <= m.endAt && Math.abs(player.x - m.x) < 39) {
          m.hit = true;
          engine.hit();
        }
      }

      const bx = bossX();
      for (const s of shots) {
        s.y -= 620 * dt;
        if (s.dead) continue;
        if (s.y < 225 && Math.abs(s.x - bx) < 44) {
          s.dead = true;
          if (mode === 'fight') damageBoss(s.x, s.y);
          else burst(s.x, s.y, '#ffffff', 5, 120);
        } else if (s.y < 60) s.dead = true;
      }
      bullets = bullets.filter((b) => !b.dead && b.y < H + 30);
      shots = shots.filter((s) => !s.dead && s.y > -10);
      beams = beams.filter((m) => t <= m.endAt);
    },
    render(ctx) {
      const { W, H } = engine;
      const P = PHASES[phase];
      const bx = bossX();
      drawBossBackground(ctx, { W, H, t, beat, accent: P.accent, phase });
      drawBoss(ctx, {
        x: bx,
        y: 118,
        t,
        beat,
        phase,
        hp,
        maxHp: MAX_HP,
        hurt,
        shield: mode === 'intro',
        dying: mode === 'dying' ? dyingT / DYING_SECONDS : 0,
        armed: beams.length > 0,
        drawFiech: engine.drawFiech
      });
      for (const m of beams) drawBeam(ctx, m, t, beatLen(), H);
      for (const b of bullets) drawBossBullet(ctx, b, t, P);
      for (const s of shots) {
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(s.x - 2, s.y - 9, 4, 14);
        ctx.fillStyle = P.accent2;
        ctx.fillRect(s.x - 1, s.y + 4, 2, 6);
      }
      if (mode !== 'dying') {
        engine.drawPlayer(ctx, player.x, playerY(), 32, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: P.accent });
      }
      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life / 0.6, 0, 1);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1;
      drawBossHud(ctx, {
        W,
        H,
        hp,
        maxHp: MAX_HP,
        phase,
        accent: P.accent,
        text: CONTENT.declineGame.arcade.stage4,
        mode,
        introLeft: introBeats,
        introTotal: INTRO_BEATS,
        dyingT: dyingT / DYING_SECONDS,
        beat,
        flash,
        roundRect
      });
    }
  };
}
