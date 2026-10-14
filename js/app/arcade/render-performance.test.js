import assert from 'node:assert/strict';
import test from 'node:test';
import { drawFiech } from './fiech-rig.js';
import { drawPlayer } from './player-rig.js';
import { createStage2 } from './stages/stage2-flappy.js';
import { createStage4 } from './stages/stage4-wave.js';

function context(stats) {
  let depth = 0;
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'save') return () => depth++;
        if (key === 'restore') return () => depth--;
        if (key === 'getTransform') return () => ({ a: stats.scale });
        if (key === 'createLinearGradient' || key === 'createRadialGradient') {
          return () => {
            stats.gradients++;
            return { addColorStop() {} };
          };
        }
        if (key === 'depth') return depth;
        return () => {};
      },
      set(_target, key, value) {
        if (key === 'shadowBlur' && value > 0) stats.shadows++;
        return true;
      }
    }
  );
}

test('shared player and Fiech preserve animation without gradient or blur filters', () => {
  const stats = { gradients: 0, shadows: 0, scale: 1 };
  const ctx = context(stats);
  for (const action of ['hover', 'slam', 'laser', 'laugh']) {
    drawFiech(ctx, 300, 100, 64, {
      action,
      beatPhase: 0.1,
      bassEnergy: 1,
      lookAtX: 88,
      lookAtY: 300
    });
  }
  for (const mode of ['runner', 'rocket', 'ship', 'wave']) {
    drawPlayer(ctx, 88, 300, 32, { mode, beatPhase: 0.1, thrust: 1 });
  }
  assert.equal(stats.gradients, 0);
  assert.equal(stats.shadows, 0);
  assert.equal(ctx.depth, 0);
});

test('Stage 2 rasterizes each sector once and invalidates cache on canvas scaling', () => {
  const previous = globalThis.document;
  const stats = { gradients: 0, shadows: 0, scale: 1.5 };
  let canvases = 0;
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      canvases++;
      return { getContext: () => context(stats) };
    }
  };
  try {
    const ctx = context(stats);
    const noop = () => {};
    const engine = {
      W: 360,
      H: 600,
      held: false,
      hit: () => false,
      complete: noop,
      addScore: noop,
      beep: noop,
      drawFiech: noop,
      drawPlayer: noop
    };
    const stage = createStage2(() => 0.4);
    stage.init(engine);
    stage.update(0, { running: true, beatIndex: 100, beatPhase: 0, bpm: 111.3 });
    stage.render(ctx);
    assert.equal(stats.gradients, 2);
    assert.equal(canvases, 1);
    for (let i = 0; i < 60; i++) stage.render(ctx);
    assert.equal(stats.gradients, 2, 'no gradients should be allocated on warm frames');
    stage.update(0.05, { running: true, beatIndex: 112, beatPhase: 0, bpm: 111.3 });
    stage.render(ctx);
    assert.equal(canvases, 2);
    assert.equal(stats.gradients, 4);
    stats.scale = 1;
    stage.render(ctx);
    assert.equal(canvases, 3);
    assert.equal(stats.gradients, 6);
    stage.update(0.05, { running: true, beatIndex: 128, beatPhase: 0.8, bpm: 111.3 });
    for (let i = 0; i < 60; i++) stage.render(ctx);
    assert.equal(stats.gradients, 6, 'targeting uses the existing sector bitmap');
    stage.update(0.05, { running: true, beatIndex: 163, beatPhase: 0.8, bpm: 111.3 });
    for (let i = 0; i < 60; i++) stage.render(ctx);
    assert.equal(canvases, 4);
    assert.equal(stats.gradients, 8, 'the finale only allocates its sector background once');
    assert.equal(stats.shadows, 0);
    assert.equal(ctx.depth, 0);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

test('Stage 4 effects have no blur filters and restore canvas state', () => {
  const stats = { gradients: 0, shadows: 0, scale: 1 };
  const ctx = context(stats);
  const noop = () => {};
  const engine = {
    W: 360,
    H: 600,
    held: false,
    keys: new Set(),
    pointer: { down: false },
    hit: () => false,
    complete: noop,
    addScore: noop,
    beep: noop,
    shake: noop,
    drawFiech,
    drawPlayer
  };
  for (const create of [createStage4]) {
    const stage = create();
    stage.init(engine);
    for (let i = 0; i < 60; i++) {
      stage.update(1 / 60, {
        running: true,
        beatIndex: 100 + Math.floor(i / 30),
        beatPhase: (i % 30) / 30,
        bpm: 111.3,
        isBeat: i % 30 === 0
      });
      stage.render(ctx);
      assert.equal(ctx.depth, 0);
    }
  }
  assert.equal(stats.shadows, 0);
});
