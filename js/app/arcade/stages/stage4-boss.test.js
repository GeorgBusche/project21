import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4, ARENA, TOUCH_OFFSET_Y, GLASSES } from './stage4-boss.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const proxyCtx = () =>
  new Proxy(() => {}, {
    get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : proxyCtx()),
    set: () => true,
    apply: () => proxyCtx()
  });

function runBot({ seed, fps, bpm, maxSeconds = 150 }) {
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
    pointer: { x: 180, y: 480, down: true },
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
  let target = { x: 180, y: 460 };
  let beatT = 0;
  let beatIndex = 0;
  let frame = 0;
  let elapsed = 0;
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
    if (frame % 2 === 0) {
      const d = stage.debug();
      let best = Infinity;
      for (let x = ARENA.x0; x <= ARENA.x1; x += 16) {
        for (let y = ARENA.y0; y <= ARENA.y1; y += 16) {
          const dist = Math.hypot(x - d.p.x, y - d.p.y);
          let cost = dist * 0.02 + Math.abs(x - d.bossX) * 0.012 + Math.abs(y - 440) * 0.004;
          const steps = Math.max(1, Math.ceil(dist / 30));
          for (let s = 0; s <= steps + 8; s++) {
            const k = Math.min(1, s / steps);
            const px = d.p.x + (x - d.p.x) * k;
            const py = d.p.y + (y - d.p.y) * k;
            const ahead = (Math.min(s, steps) * 30) / 260 + (s > steps ? (s - steps) * 0.06 : 0);
            if (d.dangerAt(px, py, ahead, 10)) cost += 100 / (1 + ahead * 2);
          }
          if (cost < best) {
            best = cost;
            target = { x, y };
          }
        }
      }
    }
    engine.pointer.x = target.x;
    engine.pointer.y = target.y + TOUCH_OFFSET_Y;
    stage.update(dt, { running: true, beatIndex, beatPhase: beatT / bl, bpm, isBeat });
    stage.render(ctx);
    frame++;
  }
  return { hits, done, elapsed, progress: stage.progress() };
}

test('Stage 4 Boss ist mit Bot ohne Treffer schaffbar', () => {
  for (const [seed, fps, bpm] of [[1, 60, 105], [2, 60, 120], [3, 30, 105], [4, 60, 111], [5, 30, 120], [6, 60, 100]]) {
    const r = runBot({ seed, fps, bpm });
    assert.ok(r.done, `seed ${seed}: nicht fertig (progress ${r.progress.toFixed(2)})`);
    assert.equal(r.hits, 0, `seed ${seed}: ${r.hits} Treffer bei ${r.elapsed.toFixed(1)}s`);
    assert.ok(r.elapsed > 25 && r.elapsed < 130, `seed ${seed}: Dauer ${r.elapsed.toFixed(1)}s`);
  }
});

test('Stage 4 hat 12 Pinnchen', () => {
  assert.equal(GLASSES, 12);
});
