import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlightPlan,
  createStage2,
  flightGateGeometry,
  flightLaserPhase,
  flightDebrisGeometry,
  updateFlightLasers,
  FLIGHT_BEATS,
  FLIGHT_SPEED,
  LASER_LOCK_BEATS
} from './stage2-flappy.js';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function harness(random = seeded(1)) {
  const noop = () => {};
  let depth = 0;
  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'save') return () => depth++;
        if (key === 'restore') return () => depth--;
        if (key === 'createLinearGradient' || key === 'createRadialGradient')
          return () => ({ addColorStop: noop });
        return noop;
      },
      set() {
        return true;
      }
    }
  );
  const state = {
    x: 88,
    y: 300,
    vy: 0,
    hits: 0,
    score: 0,
    completions: 0,
    invuln: 0,
    hitBeats: []
  };
  let stage;
  const engine = {
    W: 360,
    H: 600,
    held: false,
    get invulnerable() {
      return state.invuln > 0;
    },
    hit() {
      if (state.invuln > 0) return false;
      state.hits++;
      state.hitBeats.push(stage.progress() * FLIGHT_BEATS);
      state.invuln = 1.4;
      return true;
    },
    complete() {
      state.completions++;
    },
    addScore(points) {
      state.score += points;
    },
    beep: noop,
    drawFiech(_ctx, x, y, _size, pose) {
      state.fiechX = x;
      state.fiechY = y;
      state.fiechAction = pose.action;
      state.fiechSquash = pose.squashY;
    },
    drawPlayer(_ctx, x, y) {
      state.x = x;
      state.y = y;
    }
  };
  stage = createStage2(random);
  stage.init(engine);
  return {
    stage,
    engine,
    state,
    frame(dt, clock, running = true, bpm = 111.3) {
      const before = stage.progress() * FLIGHT_BEATS;
      const beforeY = state.y;
      state.invuln = Math.max(0, state.invuln - dt);
      stage.update(dt, {
        running,
        bpm,
        beatIndex: Math.floor(clock),
        beatPhase: clock - Math.floor(clock),
        isBeat: false,
        bassEnergy: 0.3
      });
      stage.render(ctx);
      const delta = stage.progress() * FLIGHT_BEATS - before;
      if (delta > 0) state.vy = (state.y - beforeY) / delta;
      assert.equal(depth, 0, 'render must restore the canvas state');
    }
  };
}

function flightTarget(gates, position, laserTrap = false, lasers = []) {
  if (position >= 26 && position < 46) {
    const fire = [29, 33, 37, 41].find((b) => position < b + 2.6);
    if (fire === undefined) return 300;
    if (laserTrap) return 300;
    const index = ((fire - 29) / 4) * 2;
    const source = lasers[index];
    const direction = Math.sign(lasers[index + 1]?.offset ?? gates[0].side);
    if (position < fire - LASER_LOCK_BEATS) return 300;
    if (position < fire + 0.4) return (source?.y ?? 300) + direction * 100;
    return source?.y ?? 300;
  }
  const travel = gates.find((g) => g.kind === 'travel' && Math.abs(position - g.arrival) < 0.85);
  if (travel) return flightGateGeometry(travel, position + 0.12, 88).center;
  const margin = (g) => (g.kind === 'double' ? 0.18 : 0.28);
  const nextIndex = gates.findIndex((g) => g.arrival + margin(g) > position);
  if (nextIndex < 0) return 300;
  const next = gates[nextIndex];
  const previous = gates[nextIndex - 1];
  const from = previous ? previous.arrival + margin(previous) : 0;
  const to = next.arrival - (next.kind === 'travel' ? 0.85 : margin(next));
  const fraction = Math.min(1, Math.max(0, (position - from) / (to - from)));
  const ease = fraction * fraction * (3 - 2 * fraction);
  const fromY =
    previous?.kind === 'travel'
      ? previous.center + previous.travel * 0.85
      : (previous?.ringY ?? 300);
  const toY = next.kind === 'travel' ? next.center - next.travel * 0.73 : next.ringY;
  return fromY + (toY - fromY) * ease;
}

function runFlight(
  randomFactory,
  {
    fps = 60,
    bpm = 111.3,
    idle = false,
    fallback = false,
    forkRoute = 'gold',
    laserTrap = false,
    hazardTrap = null,
    precisionError = 0,
    skipReverse = false
  } = {}
) {
  const plan = buildFlightPlan(600, randomFactory());
  const gates = plan.gates;
  if (forkRoute !== 'gold') {
    for (const gate of gates) {
      if (gate.kind === 'fork')
        gate.ringY = gate.center - (forkRoute === 'core' ? 0 : gate.side * 64);
    }
  }
  const h = harness(randomFactory());
  let clock = 100;
  h.frame(0, clock, !fallback, typeof bpm === 'function' ? bpm(0) : bpm);
  const dt = 1 / fps;
  for (let i = 0; i < fps * 50 && h.state.completions === 0; i++) {
    const position = h.stage.progress() * FLIGHT_BEATS;
    updateFlightLasers(plan.lasers, position, h.state.y, 600);
    let target = flightTarget(gates, position, laserTrap, plan.lasers);
    if (skipReverse && position >= 26 && position < 46) {
      const source = plan.lasers.find(
        (l) =>
          l.echoOf === undefined &&
          position >= l.fireBeat - LASER_LOCK_BEATS &&
          position < l.fireBeat + 2.6
      );
      if (source) target = source.y + plan.lasers[plan.lasers.indexOf(source) + 1].offset;
    }
    if (position < 26 || position >= 46) target += precisionError;
    if (hazardTrap === 'debris' && position > 30.8 && position < 32)
      target = flightDebrisGeometry(plan.debris[0], position, 88).y;
    if (hazardTrap === 'piston' && position > 12 && position < 14.5) {
      const piston = gates.find((g) => g.kind === 'piston');
      target = piston.center + (piston.wall === 'top' ? -110 : 110);
    }
    const braking = h.state.vy > 0 ? 600 : 420;
    const stoppingY = h.state.y + (h.state.vy * Math.abs(h.state.vy)) / (2 * braking);
    h.engine.held = !idle && stoppingY > target;
    const tempo = typeof bpm === 'function' ? bpm(i * dt) : bpm;
    clock += (dt * tempo) / 60;
    h.frame(dt, clock, !fallback, tempo);
    h.elapsed = (i + 1) * dt;
  }
  return h;
}

test('64-beat pursuit contains distinct mechanics and a longer double-shot arena', () => {
  const names = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const plan = buildFlightPlan(600, seeded(seed * 7919));
    assert.equal(FLIGHT_BEATS, 64);
    assert.equal(plan.gates.length, 20);
    assert.equal(plan.sections.length, 5);
    assert.equal(new Set(plan.sections.map((s) => s.name)).size, 5);
    assert.ok(plan.gates.some((g) => g.kind === 'fork'));
    assert.ok(plan.gates.some((g) => g.kind === 'travel'));
    assert.equal(plan.gates.filter((g) => g.kind === 'piston').length, 3);
    assert.equal(plan.gates.filter((g) => g.kind === 'double').length, 6);
    assert.ok(plan.gates.every((g) => g.arrival < 26 || g.arrival >= 46));
    assert.equal(plan.debris.length, 4);
    assert.deepEqual(
      plan.lasers.filter((l) => l.echoOf === undefined).map((l) => l.fireBeat),
      [29, 33, 37, 41]
    );
    for (const section of plan.sections) names.add(section.name);
    plan.gates.forEach((gate, i) => {
      assert.equal(gate.arrival % 1, 0);
      const atBeat = flightGateGeometry(gate, gate.arrival, 88);
      assert.equal(atBeat.x + gate.w / 2, 88);
      assert.ok(atBeat.top >= 64 && atBeat.bottom <= 558);
      const locked = flightGateGeometry(gate, gate.arrival - 1, 88);
      if (gate.kind !== 'travel') {
        assert.equal(locked.top, atBeat.top);
        assert.equal(locked.bottom, atBeat.bottom);
      }
      const before = flightGateGeometry(gate, gate.arrival - 2, 88);
      assert.equal(before.x - atBeat.x, 2 * FLIGHT_SPEED);
    });
  }
  assert.equal(names.size, 5);
});

test('pursuit finishes in approximately 34.5 seconds at Stage 2 tempo', () => {
  const h = runFlight(() => seeded(17));
  assert.ok(h.elapsed > 34 && h.elapsed < 35, `duration=${h.elapsed}`);
  assert.equal(h.state.completions, 1);
});

test('hard route requires accurate flying and keeps pressure through the last beat', () => {
  const { gates, lasers, debris } = buildFlightPlan(600, seeded(17));
  assert.ok(gates.filter((g) => g.kind !== 'fork').every((g) => g.gap <= 120));
  assert.ok(gates.filter((g) => g.arrival >= 57).every((g) => g.gap <= 90));
  assert.equal(gates.at(-1).arrival, 63);
  assert.equal(gates.at(-1).arrival - gates.at(-2).arrival, 1);
  assert.ok(LASER_LOCK_BEATS <= 0.75);
  assert.ok(lasers.every((l) => l.halfWidth >= 12));
  assert.ok(debris.every((d) => d.radius >= 25));
  const precise = runFlight(() => seeded(17));
  const imprecise = runFlight(() => seeded(17), { precisionError: 45 });
  assert.equal(precise.state.hits, 0);
  assert.ok(imprecise.state.hits >= 3, `imprecise hits=${imprecise.state.hitBeats}`);
});

test('escape finale lets Fiech fall behind without crushing or squashing it', () => {
  const h = runFlight(() => seeded(17));
  assert.equal(h.state.completions, 1);
  assert.ok(h.state.fiechX > h.engine.W);
  assert.equal(h.state.fiechSquash, 1);
  assert.equal(h.state.fiechAction, 'hover');
});

test('laser telegraph is harmless, firing window is bounded and the real beam causes damage', () => {
  const plan = buildFlightPlan(600, seeded(17));
  assert.equal(plan.lasers.length, 8);
  for (const laser of plan.lasers) {
    assert.equal(flightLaserPhase(laser, laser.fireBeat - 1.51), 'idle');
    assert.equal(flightLaserPhase(laser, laser.fireBeat - 1.5), 'warning');
    assert.equal(flightLaserPhase(laser, laser.fireBeat - 0.01), 'warning');
    assert.equal(flightLaserPhase(laser, laser.fireBeat), 'fire');
    assert.equal(flightLaserPhase(laser, laser.fireBeat + 0.34), 'fire');
    assert.equal(flightLaserPhase(laser, laser.fireBeat + 0.35), 'idle');
  }
  const safe = runFlight(() => seeded(17));
  const unsafe = runFlight(() => seeded(17), { laserTrap: true });
  assert.equal(safe.state.hits, 0, `hit beats=${safe.state.hitBeats}`);
  const laserHits = unsafe.state.hitBeats.filter((p) => p >= 29 && p < 29.35);
  assert.equal(laserHits.length, 1, `hit beats=${unsafe.state.hitBeats}`);
  assert.equal(unsafe.state.hitBeats.filter((p) => p >= 33 && p < 33.35).length, 1);
  assert.ok(!unsafe.state.hitBeats.some((p) => p >= 27.5 && p < 29), 'warning must not damage');
});

test('four beat-spaced double salvos punish dodging once and staying in the escape lane', () => {
  const plan = buildFlightPlan(600, seeded(17));
  const primaries = plan.lasers.filter((l) => l.echoOf === undefined);
  assert.equal(primaries.length, 4);
  assert.equal(plan.sections[3].start - plan.sections[2].start, 20);
  for (const [i, primary] of primaries.entries()) {
    const echo = plan.lasers[i * 2 + 1];
    assert.equal(echo.echoOf, i * 2);
    assert.ok(Math.abs(echo.fireBeat - primary.fireBeat - 1.1) < 1e-9);
    assert.ok(echo.halfWidth > primary.halfWidth);
    if (i > 0) assert.equal(primary.fireBeat - primaries[i - 1].fireBeat, 4);
    const debris = plan.debris[i];
    assert.ok(debris.arrival > echo.fireBeat + 0.35);
  }
  const safe = runFlight(() => seeded(17));
  const noReverse = runFlight(() => seeded(17), { skipReverse: true });
  assert.equal(safe.state.hits, 0);
  const echoHits = noReverse.state.hitBeats.filter((p) =>
    plan.lasers.some((l) => l.echoOf !== undefined && p >= l.fireBeat && p < l.fireBeat + 0.35)
  );
  assert.ok(echoHits.length >= 3, `echo hits=${echoHits}`);
});

test('echo targeting locks with the primary shot, stays fixed, and remains inside the arena', () => {
  for (const y of [80, 300, 540]) {
    const { lasers } = buildFlightPlan(600, seeded(17));
    updateFlightLasers(lasers, 28, y, 600);
    assert.equal(lasers[0].locked, false);
    assert.equal(lasers[1].locked, false);
    updateFlightLasers(lasers, 29 - LASER_LOCK_BEATS, y, 600);
    const primaryY = lasers[0].y;
    const echoY = lasers[1].y;
    assert.equal(lasers[0].locked, true);
    assert.equal(lasers[1].locked, true);
    assert.ok(echoY >= 100 && echoY <= 520);
    assert.ok(Math.abs(echoY - primaryY) >= 40);
    updateFlightLasers(lasers, 30.2, 600 - y, 600);
    assert.equal(lasers[0].y, primaryY);
    assert.equal(lasers[1].y, echoY);
    assert.equal(flightLaserPhase(lasers[1], 29.9), 'warning');
    assert.equal(flightLaserPhase(lasers[1], 30.2), 'fire');
  }
});

test('Fiech follows during targeting, then locks before firing and stops following the player', () => {
  const h = harness(seeded(17));
  const gates = buildFlightPlan(600, seeded(17)).gates;
  let clock = 100;
  h.frame(0, clock);
  let lockedY;
  let followed = false;
  let dodged = false;
  for (let i = 0; i < 1000; i++) {
    const p = h.stage.progress() * FLIGHT_BEATS;
    const target = p >= 27.5 && p < 29 - LASER_LOCK_BEATS ? 230 : flightTarget(gates, p);
    const braking = h.state.vy > 0 ? 600 : 420;
    h.engine.held = h.state.y + (h.state.vy * Math.abs(h.state.vy)) / (2 * braking) > target;
    clock += 111.3 / 3600;
    h.frame(1 / 60, clock);
    const now = h.stage.progress() * FLIGHT_BEATS;
    if (now > 27.5 && now < 28.1) {
      assert.equal(h.state.fiechAction, 'laser');
      assert.equal(h.state.fiechY, h.state.y);
      followed = true;
    }
    if (now > 29 - LASER_LOCK_BEATS + 0.05 && now < 29.35) {
      lockedY ??= h.state.fiechY;
      assert.equal(h.state.fiechY, lockedY, 'aim must not follow after lock');
      if (Math.abs(h.state.y - lockedY) > 30) dodged = true;
    }
    if (now > 29.35) break;
  }
  assert.ok(followed && dodged);
});

test('pistons extend from just one wall; the travel passage moves through the crossing', () => {
  const { gates } = buildFlightPlan(600, seeded(17));
  for (const g of gates.filter((g) => g.kind === 'piston')) {
    assert.ok(g.wall === 'top' || g.wall === 'bottom');
    const before = flightGateGeometry(g, g.arrival - 2, 88);
    const locked = flightGateGeometry(g, g.arrival - 1, 88);
    assert.ok(before.gap > locked.gap);
  }
  const travel = gates.find((g) => g.kind === 'travel');
  const before = flightGateGeometry(travel, travel.arrival - 0.5, 88);
  const after = flightGateGeometry(travel, travel.arrival + 0.5, 88);
  assert.equal(after.center - before.center, travel.travel);
  assert.equal(before.gap, after.gap);
  const entering = flightGateGeometry(travel, travel.arrival - 0.2, 88);
  const leaving = flightGateGeometry(travel, travel.arrival + 0.2, 88);
  assert.ok(Math.abs(leaving.center - entering.center) > 20, 'opening must move during overlap');
  const unsafe = runFlight(() => seeded(17), { hazardTrap: 'piston' });
  assert.ok(
    unsafe.state.hitBeats.some((p) => p > 13.5 && p < 14.5),
    unsafe.state.hitBeats.join(',')
  );
});

test('open-arena debris has actual moving collision geometry, not just decoration', () => {
  const d = buildFlightPlan(600, seeded(17)).debris[0];
  assert.equal(flightDebrisGeometry(d, d.arrival, 88).x, 88);
  assert.equal(flightDebrisGeometry(d, d.arrival, 88).y, d.y);
  assert.notEqual(flightDebrisGeometry(d, d.arrival - 0.5, 88).y, d.y);
  const unsafe = runFlight(() => seeded(17), { hazardTrap: 'debris' });
  assert.equal(
    unsafe.state.hitBeats.filter((p) => p > 31.3 && p < 31.9).length,
    1,
    `hit beats=${unsafe.state.hitBeats}`
  );
});

test('all pattern variants and mirrors can be flown without taking damage', () => {
  for (const variant of [0.05, 0.4, 0.8]) {
    for (const mirror of [0.1, 0.9]) {
      const randomFactory = () => {
        let call = 0;
        return () => (call++ % 2 === 0 ? variant : mirror);
      };
      const h = runFlight(randomFactory);
      assert.equal(h.state.completions, 1);
      assert.equal(
        h.state.hits,
        0,
        `variant=${variant}, mirror=${mirror}, hits=${h.state.hitBeats}`
      );
      assert.ok(h.state.score > 1500);
    }
  }
});

test('random complete routes remain solvable across tempos and frame rates', () => {
  for (const fps of [20, 30, 60, 120]) {
    for (const bpm of [105, 111.3, 116]) {
      for (const seed of [3, 17, 42]) {
        const h = runFlight(() => seeded(seed * 7919), { fps, bpm });
        assert.equal(h.state.completions, 1);
        assert.equal(
          h.state.hits,
          0,
          `fps=${fps}, bpm=${bpm}, seed=${seed}, hits=${h.state.hitBeats}`
        );
      }
    }
  }
});

test('a continuous soundtrack tempo ramp preserves solvability and score', () => {
  const h = runFlight(() => seeded(17), { bpm: (seconds) => 105 + Math.min(1, seconds / 25) * 11 });
  assert.equal(h.state.hits, 0);
  assert.equal(h.state.completions, 1);
  assert.ok(h.state.score >= 2080 && h.state.score <= 2160, `score=${h.state.score}`);
  assert.equal(
    (2160 - h.state.score) % 40,
    0,
    'only missed perfect rings reduce a clean-run score'
  );
});

test('forks have two safe routes, only the golden route grants the perfect bonus', () => {
  const perfect = runFlight(() => seeded(17));
  const alternate = runFlight(() => seeded(17), { forkRoute: 'alternate' });
  const count = buildFlightPlan(600, seeded(17)).gates.filter((g) => g.kind === 'fork').length;
  assert.ok(count > 0);
  assert.equal(alternate.state.hits, 0);
  assert.equal(alternate.state.completions, 1);
  assert.equal(perfect.state.score - alternate.state.score, count * 40);
});

test('fork cores cause real damage and damaged gates never grant clean bonuses', () => {
  const perfect = runFlight(() => seeded(17));
  const unsafe = runFlight(() => seeded(17), { forkRoute: 'core' });
  const count = buildFlightPlan(600, seeded(17)).gates.filter((g) => g.kind === 'fork').length;
  assert.equal(unsafe.state.hits, count);
  assert.ok(unsafe.state.score < perfect.state.score - count * 40);
});

test('a fractional stage entry aligns local passages to the next global beat', () => {
  const h = harness();
  h.frame(0, 100.3);
  assert.equal(h.stage.progress(), 0);
  h.frame(0.05, 101);
  assert.equal(h.stage.progress(), 0);
  h.frame(0.05, 105);
  assert.ok(Math.abs(h.stage.progress() * FLIGHT_BEATS - 4) < 1e-10);
});

test('neither no input nor permanent boost can survive, fallback remains playable', () => {
  const idle = runFlight(() => seeded(7), { idle: true });
  assert.ok(idle.state.hits >= 3, 'doing nothing must lose all three lives');
  const boosted = harness();
  for (let frame = 0; frame < 600; frame++) {
    boosted.engine.held = true;
    boosted.frame(1 / 60, ((frame / 60) * 111.3) / 60);
  }
  assert.ok(boosted.state.hits >= 3, 'permanent boost must lose all three lives');
  const fallback = runFlight(() => seeded(7), { fallback: true, bpm: 105 });
  assert.equal(fallback.state.hits, 0);
  assert.equal(fallback.state.completions, 1);
});

test('audio starts mid-run without jumping the course; completion fires exactly once', () => {
  const h = harness();
  for (let frame = 0; frame < 120; frame++) h.frame(1 / 60, 0, false);
  const before = h.stage.progress();
  h.frame(1 / 60, 300.2, true);
  assert.ok(h.stage.progress() - before < 0.001);
  let clock = 300.2;
  for (let frame = 0; frame < 2400; frame++) {
    const bpm = frame < 1000 ? 111.3 : 116;
    clock += ((1 / 60) * bpm) / 60;
    h.frame(1 / 60, clock, true, bpm);
  }
  assert.equal(h.stage.progress(), 1);
  assert.equal(h.state.completions, 1);
});
