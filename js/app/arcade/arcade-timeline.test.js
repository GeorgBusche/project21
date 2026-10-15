import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT } from '../../content.js';
import {
  nextStageBar,
  soundtrackSeconds,
  stageEntryBeat,
  stageWindow,
  validateStageCues
} from './arcade-timeline.js';
import { createStage1 } from './stages/stage1-cube.js';
import { SIZE } from './stages/stage1-draw.js';
import { planStage1 } from './stages/stage1-plan.js';

const config = CONTENT.arcadeAudio;

test('first drop and direct Stage 2 entry point at the same original-track position', () => {
  assert.equal(config.stageEndSec[0], 35.5);
  assert.equal(config.soundtrackSync, true);
  const position = stageEntryBeat(2, config);
  assert.equal(
    soundtrackSeconds({ beatIndex: Math.floor(position), beatPhase: position % 1 }, config),
    35.5
  );
  const offsetConfig = { ...config, beatOffsetSec: 0.2 };
  const offsetBeat = stageEntryBeat(2, offsetConfig);
  assert.ok(
    Math.abs(soundtrackSeconds({ beatIndex: 0, beatPhase: offsetBeat }, offsetConfig) - 35.5) < 1e-9
  );
});

test('later stage changes leave room for the wipe and land exactly on a four-beat bar', () => {
  for (const bpm of [105, 111.3, 125]) {
    for (const position of [0, 4, 61.999, 62.125, 110.99]) {
      const beat = { beatIndex: Math.floor(position), beatPhase: position % 1, bpm };
      const next = nextStageBar(beat, 0.6);
      assert.equal(next % 4, 0);
      assert.ok(((next - position) * 60) / bpm >= 0.6);
      assert.ok(next - position < 4 + (0.6 * bpm) / 60 + 1e-5);
    }
  }
});

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const durationBeats = stageWindow(1, config).durationBeats;

test('all timed stages and admin entries use the configured absolute cues, including offsets', () => {
  for (const beatOffsetSec of [0, 0.2, -0.17]) {
    const custom = { ...config, beatOffsetSec, stageEndSec: [35.7, 63.25, 104.13] };
    validateStageCues(custom);
    for (let stage = 1; stage <= 3; stage++) {
      const window = stageWindow(stage, custom);
      const start = stage === 1 ? 1.8 : custom.stageEndSec[stage - 2] + (stage === 3 ? 3 : 0);
      assert.equal(window.startSec, start);
      assert.equal(window.endSec, custom.stageEndSec[stage - 1]);
      assert.equal(window.durationBeats, ((window.endSec - start) * custom.baseBpm) / 60);
      const entry = stageEntryBeat(stage + 1, custom);
      assert.ok(
        Math.abs(soundtrackSeconds({ beatIndex: 0, beatPhase: entry }, custom) - window.endSec) <
          1e-9
      );
    }
    assert.equal(stageWindow(4, custom), null, 'boss remains untimed');
  }
});

test('invalid and impossibly short soundtrack windows are rejected explicitly', () => {
  for (const stageEndSec of [
    [35.5, 34, 110],
    [35.5, 40, 110],
    [35.5, 65, 70],
    [3, 65, 110],
    [35.5, NaN, 110],
    [35.5, 65],
    [35.5, '65', 110]
  ]) {
    assert.throws(() => validateStageCues({ ...config, stageEndSec }));
  }
});

test('Stage 1 fills changed cue windows, using separated repeats only for long routes', () => {
  for (const durationBeats of [45, 49.12, 58.975, 59.01, 62, 64, 90.37, 130, 240]) {
    for (let seed = 0; seed < 12; seed++) {
      const stage = createStage1({ durationBeats, random: seeded(seed) });
      stage.init({ W: 360, H: 600 });
      assert.ok(Math.abs(stage.deck.at(-1).lastAt - durationBeats + 0.1) < 1e-8);
      for (let i = 1; i < stage.deck.length; i++) {
        const previous = stage.deck[i - 1];
        const next = stage.deck[i];
        assert.notEqual(previous.id, next.id, 'no immediate repeated task');
        assert.ok(next.tier >= previous.tier);
        const gap = next.firstAt - previous.lastAt;
        assert.ok(gap >= 1 && gap <= 2, `duration ${durationBeats}: ${gap}`);
      }
    }
  }
});

test('random Stage 1 routes fill the whole window with escalating tasks and a fixed finale', () => {
  const routes = new Set();
  const pairs = new Set();
  const selected = new Set();
  for (let i = 0; i < 100; i++) {
    const stage = createStage1({ durationBeats, random: seeded(i) });
    stage.init({ W: 360, H: 600 });
    assert.ok(stage.deck.length >= 10 && stage.deck.length <= 12);
    assert.deepEqual([...new Set(stage.deck.map((d) => d.tier))], [0, 1, 2]);
    assert.match(stage.deck.at(-1).id, /FINAL_GATE/);
    assert.equal(new Set(stage.deck.map((d) => d.id)).size, stage.deck.length);
    assert.ok(stage.deck[0].firstAt <= 2.2, 'first task starts within 1.3 seconds');
    for (let j = 1; j < stage.deck.length; j++) {
      const previous = stage.deck[j - 1];
      const next = stage.deck[j];
      assert.ok(next.tier >= previous.tier);
      const gap = next.firstAt - previous.lastAt;
      const recovery = previous.id.includes('GRAVITY') ? 1.5 : [1.4, 1.15, 1][previous.tier];
      assert.ok(gap >= recovery - 1e-9, `${previous.id} -> ${next.id}: ${gap}`);
      assert.ok(gap <= recovery + 0.5, `no empty connector: ${gap}`);
      pairs.add(`${previous.id}:${next.id}`);
      const shape = (def) => def.build().map((o) => [o.kind, o.x, o.w, o.h, o.fastMul]);
      assert.deepEqual(shape(next), shape(stage.library.find((d) => d.id === next.id)));
    }
    const final = stage.deck.at(-1);
    assert.ok(Math.abs(durationBeats - final.lastAt - 0.1) < 1e-9);
    stage.deck.forEach((d) => selected.add(d.id));
    routes.add(stage.deck.map((d) => d.id).join(','));
  }
  assert.ok(routes.size >= 95, `only ${routes.size} distinct routes`);
  assert.ok(pairs.size >= 80, `only ${pairs.size} distinct transitions`);
  assert.equal(selected.size, 20, 'all library segments remain eligible');
});

test('silent replacement clock and missed frames do not move the finale off its cue', () => {
  for (const running of [true, false]) {
    const startBeat = 3.15;
    const stage = createStage1({ durationBeats, startBeat, random: seeded(3) });
    const noop = () => {};
    stage.init({
      W: 360,
      H: 600,
      held: false,
      invulnerable: true,
      beep: noop,
      addScore: noop,
      hit: () => false,
      crash: noop,
      complete: noop
    });
    let gate;
    for (let frame = 1; frame <= 2100; frame++) {
      const elapsed = Math.min(durationBeats, ((frame / 60 + (frame > 900 ? 0.3 : 0)) * 105) / 60);
      const clock = startBeat + elapsed;
      stage.update(1 / 60, {
        running,
        bpm: 105,
        beatIndex: Math.floor(clock),
        beatPhase: clock % 1,
        isBeat: false,
        bassEnergy: 0
      });
      gate ||= stage.elements.find((o) => o.kind === 'gate');
      if (elapsed === durationBeats) break;
    }
    assert.ok(gate);
    assert.ok(Math.abs(gate.x + gate.w / 2 - (72 - 0.2 * 130)) < 1e-7);
  }
});

test('Stage 1 segment tests retain their standalone schedule and short windows fail explicitly', () => {
  const single = createStage1({ segmentId: 'H6_FINAL_GATE_BREAKER', durationBeats: 1 });
  single.init({ W: 360, H: 600 });
  assert.equal(single.deck.length, 1);
  assert.equal(single.deck[0].start, undefined);
  assert.throws(
    () =>
      planStage1(single.library, 10, {
        speed: 130,
        spawn: 280.8,
        player: 72,
        fastAt: 259.2
      }),
    /too short/
  );
});

test('actual finale geometry stays on the music clock at 20–120 FPS and fractional entry beats', () => {
  for (const fps of [20, 30, 60, 120]) {
    for (const startBeat of [3.15, 3.717, 7.031]) {
      const noop = () => {};
      const stage = createStage1({ durationBeats, startBeat, random: seeded(9) });
      let completions = 0;
      stage.init({
        W: 360,
        H: 600,
        held: false,
        invulnerable: true,
        beep: noop,
        addScore: noop,
        hit: () => false,
        crash: noop,
        complete: () => completions++
      });
      const bpm = config.baseBpm;
      let finalGate;
      let previous = startBeat;
      let lastOccupied = null;
      let longestGap = 0;
      for (let frame = 1; frame <= Math.ceil(((durationBeats * 60) / bpm) * fps); frame++) {
        const local = Math.min(durationBeats, ((frame / fps) * bpm) / 60);
        const position = startBeat + local;
        stage.update(1 / fps, {
          running: true,
          bpm,
          beatIndex: Math.floor(position),
          beatPhase: position % 1,
          isBeat: Math.floor(position) !== Math.floor(previous),
          bassEnergy: 0
        });
        previous = position;
        finalGate ||= stage.elements.find((o) => o.kind === 'gate');
        const occupied = stage.elements.some(
          (o) =>
            (o.kills || o.solids || ['pad', 'portal', 'orb', 'track'].includes(o.kind)) &&
            o.x <= 72 + SIZE / 2 &&
            o.x + o.w >= 72 - SIZE / 2
        );
        if (occupied) {
          if (lastOccupied !== null) longestGap = Math.max(longestGap, local - lastOccupied);
          lastOccupied = local;
        }
      }
      assert.ok(finalGate, 'final gate was actually spawned');
      assert.ok(Math.abs(finalGate.x + finalGate.w / 2 - (72 - 0.2 * 130)) < 1e-7);
      assert.ok(longestGap <= 2, `actual gap at ${fps} FPS: ${longestGap}`);
      assert.ok(lastOccupied >= durationBeats - 0.4, 'a real obstacle remains at the end');
      assert.equal(completions, 0, 'no premature empty finishing phase');
    }
  }
});
