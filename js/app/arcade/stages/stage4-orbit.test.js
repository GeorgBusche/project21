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

function runBot({ seed, fps, bpm, maxSeconds = 220 }) {
  const random = rng(seed);
  let hits = 0;
  let done = false;
  let invuln = 0;
  let maxVisible = 0;
  let maxLast = 0;
  const sounds = [];
  const noop = () => {};
  const engine = {
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
    drawPlayer: noop,
    triggerDjScratch: () => sounds.push('scratch'),
    triggerSudoSound: (k) => sounds.push(k),
    triggerSudoSample: (k) => sounds.push('song:' + k)
  };
  const stage = createStage4(random);
  stage.init(engine);
  const dt = 1 / fps;
  const bl = 60 / bpm;
  let beatT = 0;
  let beatIndex = 0;
  let elapsed = 0;
  let thinkT = 0;
  let tapAt = -9;
  let switchKey = 0;
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
    if (switchKey > 0 && --switchKey === 0) engine.keys.delete('w');
    thinkT += dt;
    if (thinkT >= 0.08) {
      thinkT = 0;
      const d = stage.debug();
      const rings = d.unlocked ? [0, 1] : [0];
      const cost = (dir, ring, tau = 9) => {
        let c = (dir === d.dir ? 0 : 0.4) + (ring === d.ring ? 0 : 0.5);
        for (let a = 0; a <= 1.2; a += 0.05) {
          const ang = wrap(d.ang + dir * OMEGA * 1.08 * (a <= tau ? a : 2 * tau - a));
          if (d.dangerAt(ang, a, 0.15, ring)) c += 40 / (1 + a * 1.5);
        }
        for (const cap of d.capsules) {
          if (d.t < cap.born || cap.ring !== ring) continue;
          const diff = wrap(cap.angle - d.ang) * dir;
          if (diff > 0 && diff < 1.6) c -= (cap.kind === 'sudo' ? 1.8 : 1.2) / (1 + diff);
        }
        if (d.finalCap && d.finalCap.ring === ring) {
          const diff = wrap(d.finalCap.angle - d.ang) * dir;
          if (diff > 0 && diff < 2.4) c -= 4 / (1 + diff);
        }
        return c;
      };
      let best = null;
      for (const dir of [1, -1]) {
        for (const ring of rings) {
          const c = Math.min(cost(dir, ring), cost(dir, ring, 0.3) + 0.3, cost(dir, ring, 0.5) + 0.3);
          if (!best || c < best.c - 1e-9) best = { c, dir, ring };
        }
      }
      if (best.ring !== d.ring) {
        engine.keys.add('w');
        switchKey = 2;
      }
      // Tap-Abstand > 0,4 s, sonst zaehlt es als Doppel-Tap (Ringwechsel)
      if (best.dir !== d.dir && elapsed - tapAt > (d.unlocked ? 0.29 : 0) && best.ring === d.ring) {
        tapAt = elapsed;
        stage.onTouch({ type: 'down', x: 180, y: 300 });
        stage.onTouch({ type: 'up', x: 180, y: 300 });
      }
    }
    stage.update(dt, { running: true, beatIndex, beatPhase: beatT / bl, bpm, isBeat });
    stage.render(ctx);
    const d = stage.debug();
    const vis = d.hazards.filter((h) => (h.kind === 'bottle' ? d.t >= h.landAt && d.t < h.landAt + 1.2 : d.t >= h.liveAt && d.t < h.liveAt + 0.5)).length;
    if (d.mode === 'last') maxLast = Math.max(maxLast, vis);
    else maxVisible = Math.max(maxVisible, vis);
  }
  return { hits, done, elapsed, sounds, maxVisible, maxLast, progress: stage.progress() };
}

test('Orbit-Boss ist mit Richtungs- und Ringwechsel ohne Treffer schaffbar (~100 s)', () => {
  for (const [seed, fps, bpm] of [[1, 60, 105], [2, 60, 120], [3, 30, 105], [4, 60, 111], [5, 30, 120], [6, 60, 100]]) {
    const r = runBot({ seed, fps, bpm });
    assert.ok(r.done, `seed ${seed}: nicht fertig (progress ${r.progress.toFixed(2)})`);
    assert.equal(r.hits, 0, `seed ${seed}: ${r.hits} Treffer bei ${r.elapsed.toFixed(1)}s`);
    assert.ok(r.elapsed > 40 && r.elapsed < 170, `seed ${seed}: Dauer ${r.elapsed.toFixed(1)}s`);
  }
});

test('es ist immer nur ein Angriff sichtbar, DJ-Sounds werden ausgeloest', () => {
  const r = runBot({ seed: 9, fps: 60, bpm: 110 });
  assert.ok(r.done);
  assert.ok(r.maxVisible <= 2, `gleichzeitige Gefahren: ${r.maxVisible}`);
  assert.ok(r.maxLast <= 3, `Finale: ${r.maxLast}`);
  for (const k of ['scratch', 'hack', 'execute', 'song:sonne', 'song:tornado', 'song:gas', 'song:schuetteln', 'song:wolle']) assert.ok(r.sounds.includes(k), `Sound ${k} fehlt`);
});

test('Orbit-Boss hat 14 Pinnchen', () => {
  assert.equal(GLASSES, 14);
});
