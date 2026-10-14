import { circleRect, clamp, createBeatSource } from './stage-utils.js';
import { drawFlightScene } from './stage2-draw.js';

export const FLIGHT_BEATS = 64;
export const FLIGHT_SPEED = 130;
export const LASER_LOCK_BEATS = 0.72;
const RADIUS = 10;
const GATE_WIDTH = 38;

export function flightLaserPhase(laser, position) {
  if (position >= laser.fireBeat && position < laser.fireBeat + 0.35) return 'fire';
  if (position >= laser.fireBeat - 1.5 && position < laser.fireBeat) return 'warning';
  return 'idle';
}

export function updateFlightLasers(lasers, position, playerY, H) {
  for (const laser of lasers) {
    const source = laser.echoOf === undefined ? laser : lasers[laser.echoOf];
    if (!laser.locked) {
      if (
        laser.echoOf !== undefined &&
        source.locked &&
        (source.y + laser.offset < 100 || source.y + laser.offset > H - 80)
      ) {
        laser.offset = -laser.offset;
      }
      laser.y = laser.echoOf === undefined ? playerY : clamp(source.y + laser.offset, 100, H - 80);
      if (position >= source.fireBeat - LASER_LOCK_BEATS) laser.locked = true;
    }
  }
}

// Feste Dramaturgie mit gespiegelten Fluglinien und einem offenen Verfolgungsabschnitt.
export function buildFlightPlan(H, random = Math.random) {
  const gates = [];
  const mirror = random() < 0.5 ? -1 : 1;
  const offset = random() < 0.5 ? 0 : 15;
  const sections = [
    { start: 0, name: 'DOUBLE PIPES / BRAKE EARLY', tier: 0 },
    { start: 12, name: 'PISTONS / FOLLOW THE LOCK', tier: 1 },
    { start: 26, name: 'DOUBLE SHOT / DODGE AND REVERSE', tier: 1 },
    { start: 46, name: 'FORK / CHOOSE YOUR EXIT', tier: 2 },
    { start: 58, name: 'FINAL SPRINT / BREAK FREE', tier: 2 }
  ];
  const add = (arrival, height, kind, gap, extra = {}) => {
    const center = H / 2 + height * mirror;
    gates.push({
      arrival,
      center,
      gap,
      kind,
      tier: arrival < 12 ? 0 : arrival < 46 ? 1 : 2,
      w: kind === 'final' ? 56 : kind === 'double' ? 26 : GATE_WIDTH,
      side: mirror,
      ringY: kind === 'fork' ? center + mirror * 64 : center,
      passed: false,
      damaged: false,
      collected: false,
      ...extra
    });
  };
  add(3, -75, 'gate', 120);
  add(5, 85, 'gate', 112);
  add(7, -90, 'shutter', 106);
  add(8, -55, 'double', 108);
  add(9, 15, 'double', 108);
  add(11, 105, 'shutter', 100);
  add(14, -110 - offset, 'piston', 100, { wall: mirror > 0 ? 'bottom' : 'top' });
  add(17, 110 + offset, 'piston', 100, { wall: mirror > 0 ? 'top' : 'bottom' });
  add(20, -75, 'travel', 116, { travel: mirror * 70, w: 80 });
  add(22, 90, 'shutter', 98);
  add(24, -95, 'shutter', 94);
  add(48, 0, 'fork', 192);
  add(51, -125, 'piston', 94, { wall: mirror > 0 ? 'bottom' : 'top' });
  add(54, 45, 'double', 92);
  add(55, 105, 'double', 92);
  add(57, -95, 'shutter', 90);
  add(59, 90, 'shutter', 90);
  add(60, 55, 'double', 90);
  add(62, -30, 'final', 86);
  add(63, 25, 'double', 90);
  const lasers = [];
  for (const [i, fireBeat] of [29, 33, 37, 41].entries()) {
    const source = lasers.length;
    lasers.push({ fireBeat, y: H / 2, halfWidth: 16, locked: false, damaged: false });
    lasers.push({
      fireBeat: fireBeat + 1.1,
      echoOf: source,
      offset: mirror * (i % 2 === 0 ? 95 : -95),
      y: H / 2,
      halfWidth: 22,
      locked: false,
      damaged: false
    });
  }
  const debris = [31.6, 35.6, 39.6, 43.6].map((arrival, i) => ({
    arrival,
    y: H / 2 + mirror * (i % 2 === 0 ? -90 : 90),
    radius: 25,
    side: i % 2 === 0 ? -mirror : mirror,
    damaged: false
  }));
  return { gates, sections, lasers, debris };
}

export function flightGateGeometry(gate, position, playerX) {
  const until = gate.arrival - position;
  // Druckschleusen und Kolben rasten einen Beat vor der Passage ein.
  const moving = clamp(until - 1, 0, 1);
  const center =
    gate.center +
    (gate.kind === 'travel' ? clamp(position - gate.arrival, -1, 1) * gate.travel : 0);
  const closing = gate.kind === 'shutter' || gate.kind === 'final' || gate.kind === 'piston';
  const gap =
    gate.gap +
    (closing ? moving * (gate.kind === 'final' || gate.kind === 'piston' ? 130 : 70) : 0);
  return {
    x: playerX + until * FLIGHT_SPEED - gate.w / 2,
    top: center - gap / 2,
    bottom: center + gap / 2,
    center,
    gap
  };
}

export function flightDebrisGeometry(debris, position, playerX) {
  return {
    x: playerX + (debris.arrival - position) * FLIGHT_SPEED,
    y: debris.y + Math.sin(((position - debris.arrival) * Math.PI) / 2) * 24 * debris.side
  };
}

// Stage 2: 64 Beats Raketenflucht. Halten gibt Schub, Loslassen laesst die Rakete sinken.
export function createStage2(random = Math.random) {
  let engine;
  let tick;
  let plan;
  let position = -1;
  let previousClock = null;
  let clockRunning = false;
  let completed = false;
  let combo = 0;
  let clean = 0;
  let flash = 0;
  let hitFlash = 0;
  let action = 0;
  let trailTimer = 0;
  let sectionIndex = 0;
  let announcement = 0;
  let lastBeat = -1;
  let beat = { bpm: 105, beatPhase: 1, bassEnergy: 0 };
  let particles = [];
  let trail = [];
  let rings = [];
  const player = { x: 88, y: 0, vy: 0 };

  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count && particles.length < 100; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 35 + random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        color
      });
    }
  }

  function damage(gate) {
    if (!engine.hit()) return;
    if (gate) gate.damaged = true;
    combo = 0;
    hitFlash = 0.45;
    burst(player.x, player.y, '#fb7185', 18);
  }

  function simulate(delta) {
    position += delta;
    if (position < 0) return;
    player.vy = clamp(player.vy + (engine.held ? -600 : 420) * delta, -175, 195);
    player.y += player.vy * delta;
    const minY = 64 + RADIUS;
    const maxY = engine.H - 42 - RADIUS;
    if (player.y < minY || player.y > maxY) {
      player.y = clamp(player.y, minY, maxY);
      player.vy = 0;
      damage();
    }
    updateFlightLasers(plan.lasers, position, player.y, engine.H);
    for (const laser of plan.lasers) {
      if (
        !laser.damaged &&
        flightLaserPhase(laser, position) === 'fire' &&
        Math.abs(player.y - laser.y) < RADIUS + laser.halfWidth
      )
        damage(laser);
    }
    for (const debris of plan.debris) {
      const d = flightDebrisGeometry(debris, position, player.x);
      if (
        !debris.damaged &&
        Math.hypot(d.x - player.x, d.y - player.y) < RADIUS + debris.radius - 3
      )
        damage(debris);
    }
    for (const gate of plan.gates) {
      const g = flightGateGeometry(gate, position, player.x);
      if (g.x > engine.W + gate.w || g.x + gate.w < -20) continue;
      const top =
        gate.wall !== 'bottom' &&
        circleRect(
          player.x,
          player.y,
          RADIUS,
          g.x + 3,
          64,
          gate.w - 6,
          Math.max(0, g.top - 64 - 3)
        );
      const bottom =
        gate.wall !== 'top' &&
        circleRect(
          player.x,
          player.y,
          RADIUS,
          g.x + 3,
          g.bottom + 3,
          gate.w - 6,
          engine.H - 42 - g.bottom - 3
        );
      const core =
        gate.kind === 'fork' &&
        Math.hypot(player.x - (g.x + gate.w / 2), player.y - gate.center) < RADIUS + 17;
      if (!gate.damaged && (top || bottom || core)) damage(gate);

      // Bonus erst nach der ganzen Torbreite vergeben: kein Perfect fuer einen spaeteren Streifschuss.
      if (!gate.passed && g.x + gate.w / 2 < player.x) {
        gate.passed = true;
        gate.collected =
          !gate.damaged &&
          !engine.invulnerable &&
          Math.abs(player.y - (gate.kind === 'travel' ? g.center : gate.ringY)) < 23;
      }
      if (!gate.scored && g.x + gate.w < player.x - RADIUS) {
        gate.scored = true;
        if (!gate.damaged && !engine.invulnerable) {
          clean++;
          combo++;
          engine.addScore(35 + Math.min(combo, 8) * 5 + (gate.collected ? 40 : 0));
          flash = gate.collected ? 0.5 : 0.2;
          rings.push({ x: player.x, y: player.y, life: 0.45, perfect: gate.collected });
          burst(
            player.x,
            player.y,
            gate.collected ? '#fde68a' : '#67e8f9',
            gate.collected ? 14 : 6
          );
          if (gate.collected) engine.beep(660, 'sine', 0.04, 0.015);
        } else combo = 0;
      }
    }
  }

  return {
    color: '#f59e0b',
    drawsOwnBackground: true,
    init(e) {
      engine = e;
      tick = createBeatSource();
      plan = buildFlightPlan(engine.H, random);
      player.y = engine.H / 2;
    },
    progress: () => clamp(position / FLIGHT_BEATS, 0, 1),
    stress: () =>
      clamp((Math.max(0, position) / FLIGHT_BEATS) * 0.85 + (hitFlash > 0 ? 0.15 : 0), 0, 1),
    onTouch() {},
    update(dt, beatInfo) {
      if (completed) return;
      beat = tick(beatInfo, dt);
      const clock = beat.beatIndex + beat.beatPhase;
      let delta = 0;
      if (previousClock === null) position = clock - Math.ceil(clock);
      else if (clockRunning !== beat.running || clock < previousClock) {
        // Ein spaet gestarteter Audio-Stream darf die bereits laufende Strecke nicht versetzen.
        delta = (dt * beat.bpm) / 60;
      } else delta = clock - previousClock;
      previousClock = clock;
      clockRunning = beat.running;
      const steps = Math.max(1, Math.ceil(delta / 0.025));
      for (let i = 0; i < steps; i++) simulate(delta / steps);

      const localBeat = Math.floor(position);
      if (localBeat !== lastBeat) {
        lastBeat = localBeat;
        if (plan.gates.some((g) => g.arrival - 2 === localBeat)) action = 0.4;
        if (localBeat % 4 === 0 && position >= 0) flash = Math.max(flash, 0.15);
      }
      let nextSection = 0;
      for (let i = 1; i < plan.sections.length; i++) {
        if (position >= plan.sections[i].start) nextSection = i;
      }
      if (nextSection >= 0 && nextSection !== sectionIndex) {
        sectionIndex = nextSection;
        announcement = 1.4;
      }
      flash = Math.max(0, flash - dt * 1.8);
      hitFlash = Math.max(0, hitFlash - dt);
      action = Math.max(0, action - dt);
      announcement = Math.max(0, announcement - dt);
      trailTimer += dt;
      if (trailTimer >= 0.025 && position >= 0) {
        trailTimer %= 0.025;
        trail.push({ x: player.x - 12, y: player.y, life: 0.45 });
      }
      const scroll = delta * FLIGHT_SPEED;
      for (const p of trail) {
        p.x -= scroll;
        p.life -= dt;
      }
      trail = trail.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += (p.vx - (beat.bpm / 60) * 70) * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);
      for (const r of rings) r.life -= dt;
      rings = rings.filter((r) => r.life > 0);
      if (position >= FLIGHT_BEATS) {
        completed = true;
        engine.complete();
      }
    },
    render(ctx) {
      drawFlightScene(ctx, engine, {
        position,
        beat,
        player,
        gates: plan.gates,
        debris: plan.debris.map((d) => ({ ...d, ...flightDebrisGeometry(d, position, player.x) })),
        lasers: plan.lasers.map((laser) => ({
          ...laser,
          phase: flightLaserPhase(laser, position)
        })),
        section: plan.sections[sectionIndex],
        sectionIndex,
        totalBeats: FLIGHT_BEATS,
        scroll: Math.max(0, position) * FLIGHT_SPEED,
        geometry: (gate) => flightGateGeometry(gate, position, player.x),
        combo,
        clean,
        flash,
        hitFlash,
        action,
        announcement,
        particles,
        trail,
        rings
      });
    }
  };
}
