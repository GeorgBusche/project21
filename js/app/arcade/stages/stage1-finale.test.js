import assert from 'node:assert/strict';
import test from 'node:test';
import { createStage1 } from './stage1-cube.js';
import { FINAL_SEGMENT_ID } from './stage1-segments.js';
import { SIZE } from './stage1-draw.js';
import { CONTENT } from '../../../content.js';
import { stageWindow } from '../arcade-timeline.js';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function flyFinale({ fps, jumpAt, tapAt, timed = false, seed = 1 }) {
  const window = stageWindow(1, CONTENT.arcadeAudio);
  const options = timed ? { ...window, random: seeded(seed) } : { segmentId: FINAL_SEGMENT_ID };
  const stage = createStage1(options);
  const state = { hits: 0, crashes: 0, completions: 0 };
  const noop = () => {};
  let active = !timed;
  stage.init({
    W: 360,
    H: 600,
    held: false,
    get invulnerable() {
      return !active;
    },
    hit: () => {
      if (active) state.hits++;
      return false;
    },
    crash: () => {
      if (active) state.crashes++;
    },
    complete: () => state.completions++,
    beep: noop,
    addScore: noop
  });
  let jumped = false;
  let tapped = false;
  let pad;
  let orb;
  let gate;
  let lava;
  let previous = timed ? window.startBeat : 0;
  let safeLanding = false;
  const end = timed ? window.durationBeats : 16;
  for (let frame = 1; ((frame / fps) * 105) / 60 <= end; frame++) {
    const local = ((frame / fps) * 105) / 60;
    if (timed && !active && local >= stage.deck.at(-1).firstAt - 0.9) {
      // Isolate the finale from earlier tasks: enter its recovery gap in a grounded state.
      Object.assign(stage.cube, {
        y: 600 * 0.74 - SIZE,
        vy: 0,
        onGround: true,
        dir: 1,
        buffer: 0,
        coyote: 0
      });
      active = true;
    }
    if (active) {
      const block = stage.elements.find((o) => o.kind === 'block' && o.tag === '▲ RUN UP');
      pad ||= stage.elements.find((o) => o.kind === 'pad' && o.tag === 'BOOST');
      orb ||= stage.elements.find((o) => o.kind === 'orb' && o.tag === 'SMASH TAP!');
      gate ||= stage.elements.find((o) => o.kind === 'gate');
      if (gate) lava ||= stage.elements.find((o) => o.kind === 'lava' && o.w === 190);
      if (block && !jumped && block.x < jumpAt) {
        stage.onTouch({ type: 'down' });
        jumped = true;
      }
      if (orb && !tapped && orb.x < tapAt) {
        stage.onTouch({ type: 'down' });
        tapped = true;
      }
    }
    const clock = (timed ? window.startBeat : 0) + local;
    stage.update(1 / fps, {
      running: true,
      bpm: 105,
      beatIndex: Math.floor(clock),
      beatPhase: clock % 1,
      isBeat: Math.floor(clock) !== Math.floor(previous),
      bassEnergy: 0
    });
    previous = clock;
    if (gate?.dead && stage.cube.onGround && lava.x + lava.w < 72 - SIZE / 2 + 5) {
      safeLanding = true;
    }
  }
  return { ...state, pad: pad?.used, orb: orb?.used, smashed: gate?.dead, safeLanding };
}

test('final platform, pad and ring reach the gate without lava or gate damage over a usable tap window', () => {
  for (const fps of [20, 30, 60, 120]) {
    for (const jumpAt of [100, 130, 160]) {
      for (const tapAt of [100, 110, 120, 130, 140]) {
        const result = flyFinale({ fps, jumpAt, tapAt });
        const context = JSON.stringify({ fps, jumpAt, tapAt, result });
        assert.equal(result.hits, 0, context);
        assert.equal(result.crashes, 0, context);
        assert.equal(result.pad, true, context);
        assert.equal(result.orb, true, context);
        assert.equal(result.smashed, true, context);
        assert.equal(result.safeLanding, true, context);
        assert.equal(result.completions, 1, context);
      }
    }
  }
});

test('the same finale inputs remain safe in the scheduled route until the drop', () => {
  for (const fps of [20, 30, 60, 120]) {
    for (const seed of [1, 7, 19]) {
      for (const tapAt of [100, 120, 140]) {
        const result = flyFinale({ fps, jumpAt: 130, tapAt, seed, timed: true });
        const context = JSON.stringify({ fps, seed, tapAt, result });
        assert.equal(result.hits, 0, context);
        assert.equal(result.crashes, 0, context);
        assert.equal(result.pad, true, context);
        assert.equal(result.orb, true, context);
        assert.equal(result.smashed, true, context);
      }
    }
  }
});
