import assert from 'node:assert/strict';
import test from 'node:test';
import { generateWaves, validateWaves, WAVE_DEFS } from './stage3-waves.js';
import { createStage3 } from './stage3-pyro.js';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('timed shows vary row counts, retain warnings and end in the five-lane finale', () => {
  for (const duration of [35, 40.12, 51.625, 78.75, 130.37, 240]) {
    const routes = new Set();
    for (let seed = 0; seed < 20; seed++) {
      const waves = generateWaves(seeded(seed), duration);
      assert.ok(validateWaves(waves), `duration ${duration}, seed ${seed}`);
      assert.equal(waves.length, 5);
      waves.forEach((wave, index) => {
        assert.equal(wave.gap, WAVE_DEFS[index].gap, 'never speed up row cadence');
        assert.equal(wave.fall, WAVE_DEFS[index].fall, 'retain readable flight time');
        assert.equal(wave.lanes, index === 4 ? 5 : 3);
        if (index) {
          const previous = waves[index - 1];
          const last = previous.start + (previous.rows.length - 1) * previous.gap;
          assert.ok(wave.start - last >= (index === 4 ? 5.6 : 2.2) - 1e-9);
          assert.ok(wave.start - last < (index === 4 ? 5.8 : 2.4));
        }
      });
      const last = waves.at(-1);
      assert.ok(Math.abs(last.start + (last.rows.length - 1) * last.gap - (duration - 0.9)) < 1e-8);
      routes.add(waves.flatMap((w) => w.rows).join('/'));
    }
    assert.ok(routes.size >= 18);
  }
});

test('actual show completion follows absolute audio or silent clock at every FPS', () => {
  for (const durationBeats of [35, 78.75, 130.37]) {
    for (const fps of [20, 60, 120]) {
      for (const running of [true, false]) {
        const noop = () => {};
        const startBeat = 113.731;
        const stage = createStage3({ durationBeats, startBeat, random: seeded(7) });
        let completions = 0;
        stage.init({
          W: 360,
          H: 600,
          keys: new Set(),
          pointer: { down: false },
          beep: noop,
          addScore: noop,
          hit: () => false,
          complete: () => completions++
        });
        for (let frame = 1; frame < (durationBeats * fps * 60) / 105; frame++) {
          const local = ((frame / fps) * 105) / 60;
          const clock = startBeat + local;
          stage.update(1 / fps, {
            running,
            bpm: 105,
            beatIndex: Math.floor(clock),
            beatPhase: clock % 1,
            isBeat: false,
            bassEnergy: 0
          });
          assert.ok(Math.abs(stage.position - local) < 1e-9);
          assert.equal(completions, 0);
        }
        const end = startBeat + durationBeats + 1e-9;
        const beat = {
          running,
          bpm: 105,
          beatIndex: Math.floor(end),
          beatPhase: end % 1,
          isBeat: false,
          bassEnergy: 0
        };
        stage.update(1 / fps, beat);
        stage.update(1 / fps, beat);
        assert.equal(completions, 1);
      }
    }
  }
});
