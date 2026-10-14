import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4, GLASSES, OMEGA, wrap } from './stage4-orbit.js';

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
    if (thinkT >= 0.08) {
      thinkT = 0;
      const d = stage.debug();
      const cost = (dir) => {
        let c = dir === d.dir ? 0 : 0.4;
        for (let a = 0; a <= 1.0; a += 0.05) {
          const ang = wrap(d.ang + dir * OMEGA * 1.08 * a);
          if (d.dangerAt(ang, a, 0.1)) c += 10 / (1 + a * 3);
        }
        if (collect) {
          for (const cap of d.capsules) {
            if (d.t < cap.born) continue;
            const diff = wrap(cap.angle - d.ang) * dir;
            if (diff > 0 && diff < 1.6) c -= 1.2 / (1 + diff);
          }
          if (d.finalCap && d.t >= d.finalCap.born) {
            const diff = wrap(d.finalCap.angle - d.ang) * dir;
            if (diff > 0 && diff < 2.4) c -= 4 / (1 + diff);
          }
        }
        return c;
      };
      const want = cost(1) < cost(-1) ? 1 : cost(-1) < cost(1) ? -1 : d.dir;
      if (want !== d.dir) {
        stage.onTouch({ type: 'down', x: 180, y: 300 });
        stage.onTouch({ type: 'up', x: 180, y: 300 });
      }
    }
    stage.update(dt, { running: true, beatIndex, beatPhase: beatT / bl, bpm, isBeat });
    stage.render(ctx);
  }
  return { hits, done, elapsed, progress: stage.progress() };
}

test('Orbit-Boss ist per Richtungswechsel ohne Treffer schaffbar', () => {
  for (const [seed, fps, bpm] of [[1, 60, 105], [2, 60, 120], [3, 30, 105], [4, 60, 111], [5, 30, 120], [6, 60, 100]]) {
    const r = runBot({ seed, fps, bpm });
    assert.ok(r.done, `seed ${seed}: nicht fertig (progress ${r.progress.toFixed(2)})`);
    assert.equal(r.hits, 0, `seed ${seed}: ${r.hits} Treffer bei ${r.elapsed.toFixed(1)}s`);
    assert.ok(r.elapsed > 15 && r.elapsed < 90, `seed ${seed}: Dauer ${r.elapsed.toFixed(1)}s`);
  }
});

test('ohne Kapseln laedt die Konter-Ladung den Boss in unter 70 s', () => {
  const r = runBot({ seed: 7, fps: 60, bpm: 110, collect: false });
  assert.ok(r.done && r.hits === 0, `done=${r.done} hits=${r.hits} t=${r.elapsed.toFixed(1)}`);
  assert.ok(r.elapsed < 70, `Dauer ${r.elapsed.toFixed(1)}s`);
});

test('Orbit-Boss hat 10 Pinnchen', () => {
  assert.equal(GLASSES, 10);
});
