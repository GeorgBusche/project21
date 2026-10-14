import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4, padCenter, GLASSES, LANES } from './stage4-wave.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const proxyCtx = () =>
  new Proxy(() => {}, {
    get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : proxyCtx()),
    set: () => true,
    apply: () => proxyCtx()
  });

function runBot({ seed, fps, bpm, collect = true, maxSeconds = 150 }) {
  const random = rng(seed);
  let hits = 0;
  let done = false;
  let invuln = 0;
  const noop = () => {};
  const engine = {
    W: 360,
    H: 600,
    held: false,
    keys: new Set(),
    pointer: { x: 180, y: 300, down: false },
    hit: () => {
      if (invuln > 0) return false;
      invuln = 1.4;
      hits++;
      return true;
    },
    complete: () => {
      done = true;
    },
    addScore: noop,
    beep: noop,
    shake: noop,
    drawFiech: noop,
    drawPlayer: noop
  };
  const stage = createStage4(random);
  stage.init(engine);
  const dt = 1 / fps;
  const bl = 60 / bpm;
  let beatT = 0;
  let beatIndex = 0;
  let elapsed = 0;
  let thinkT = 0;
  const ctx = proxyCtx();
  while (!done && elapsed < maxSeconds) {
    elapsed += dt;
    invuln = Math.max(0, invuln - dt);
    beatT += dt;
    let isBeat = false;
    if (beatT >= bl) {
      beatT -= bl;
      beatIndex++;
      isBeat = true;
    }
    thinkT += dt;
    if (thinkT >= 0.12) {
      thinkT = 0;
      const d = stage.debug();
      let best = Infinity;
      let target = d.lane;
      for (let l = 0; l < LANES; l++) {
        let cost = l === d.lane ? 0 : 0.3;
        for (let a = 0; a <= 0.5; a += 0.05) if (d.dangerLane(l, a, 12)) cost += 10 / (1 + a * 3);
        if (collect && d.capsules.some((c) => c.lane === l && d.t >= c.born)) cost -= 1.5;
        if (d.hazards.some((h) => h.ring && h.safe[0] === l && d.t > h.tellAt)) cost -= 3;
        if (cost < best) {
          best = cost;
          target = l;
        }
      }
      if (target !== d.lane) {
        const c = padCenter(target);
        stage.onTouch({ type: 'down', x: c.x, y: c.y });
        stage.onTouch({ type: 'up', x: c.x, y: c.y });
      }
    }
    stage.update(dt, { running: true, beatIndex, beatPhase: beatT / bl, bpm, isBeat });
    stage.render(ctx);
  }
  return { hits, done, elapsed, progress: stage.progress() };
}

test('Stage 4 Boss ist per Spurwechsel ohne Treffer schaffbar', () => {
  for (const [seed, fps, bpm] of [[1, 60, 105], [2, 60, 120], [3, 30, 105], [4, 60, 111], [5, 30, 120], [6, 60, 100]]) {
    const r = runBot({ seed, fps, bpm });
    assert.ok(r.done, `seed ${seed}: nicht fertig (progress ${r.progress.toFixed(2)})`);
    assert.equal(r.hits, 0, `seed ${seed}: ${r.hits} Treffer bei ${r.elapsed.toFixed(1)}s`);
    assert.ok(r.elapsed > 15 && r.elapsed < 90, `seed ${seed}: Dauer ${r.elapsed.toFixed(1)}s`);
  }
});

test('ohne Kapseln laedt die Konter-Ladung den Boss in unter 50 s', () => {
  const r = runBot({ seed: 7, fps: 60, bpm: 110, collect: false });
  assert.ok(r.done && r.hits === 0, `done=${r.done} hits=${r.hits} t=${r.elapsed.toFixed(1)}`);
  assert.ok(r.elapsed < 50, `Dauer ${r.elapsed.toFixed(1)}s`);
});

test('Stage 4 hat 10 Pinnchen und 4 Spuren', () => {
  assert.equal(GLASSES, 10);
  assert.equal(LANES, 4);
});
