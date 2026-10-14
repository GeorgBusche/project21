import assert from 'node:assert/strict';
import test from 'node:test';
import { createStage4, laneX, MAX_HP, LANES } from './stage4-boss.js';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeCtx() {
  const noop = () => {};
  return new Proxy({}, { get: () => noop, set: () => true });
}

// Ausweich-Bot: waehlt die Spur mit der geringsten Gefahr in den naechsten Sekunden
function runBot({ seed, fps, bpm, maxSeconds = 120 }) {
  const state = { hits: 0, done: false };
  const pointer = { x: 180, down: true };
  const engine = {
    W: 360,
    H: 600,
    keys: new Set(),
    held: {},
    pointer,
    hit: () => { state.hits++; const d = stage.debug(); if (process.env.DBG) console.log("HIT", seed, d.phase, d.t.toFixed(2), d.playerX.toFixed(0), JSON.stringify(d.beams.map(m=>m.x)), d.bullets.filter(b=>Math.abs(b.y-d.playerY)<30).map(b=>b.kind+":"+(b.x??"L")+":"+b.y.toFixed(0))); },
    complete: () => (state.done = true),
    addScore() {},
    beep() {},
    shake() {},
    drawFiech() {},
    drawPlayer() {}
  };
  const stage = createStage4(seeded(seed));
  stage.init(engine);
  const dt = 1 / fps;
  const beatLen = 60 / bpm;
  let nextBeat = beatLen;
  let time = 0;
  let beatIndex = 0;
  const ctx = makeCtx();
  const seen = new Set();
  while (!state.done && time < maxSeconds) {
    time += dt;
    let isBeat = false;
    if (time >= nextBeat) {
      nextBeat += beatLen;
      isBeat = true;
      beatIndex++;
    }
    const d = stage.debug();
    let best = 0;
    let bestCost = Infinity;
    for (let l = 0; l < LANES; l++) {
      const x = laneX(l);
      let cost = Math.abs(x - d.playerX) * 0.02 + Math.abs(x - d.bossX) * 0.03;
      const reach = Math.abs(x - d.playerX) / 330;
      for (const b of d.bullets) {
        const tt = (d.playerY - b.y) / b.vy;
        if (tt < -0.12 || tt > 1.5) continue;
        let blocked;
        if (b.kind === 'latte') blocked = b.segs.some(([x0, x1]) => x + 20 > x0 && x - 20 < x1);
        else blocked = Math.abs(b.x - x) < 34;
        if (blocked) cost += 50 / (tt + 0.3);
        if (blocked && tt < reach + 0.1) cost += 200;
      }
      for (const m of d.beams) {
        if (Math.abs(m.x - x) < 52 && d.t < m.endAt + 0.15) cost += 400;
        const lo = Math.min(x, d.playerX) - 40;
        const hi = Math.max(x, d.playerX) + 40;
        if (m.x > lo && m.x < hi && Math.abs(m.x - x) >= 52 && d.t > m.fireAt - reach - 0.35 && d.t < m.endAt + 0.1) cost += 300;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = x;
      }
    }
    pointer.x = best;
    stage.update(dt, { bpm, beatIndex, beatPhase: (time % beatLen) / beatLen, isBeat });
    stage.render(ctx);
    seen.add(`${d.phase}`);
  }
  return { ...state, time, seen: seen.size };
}

test('Stage 4: Bot besiegt den Boss ohne Treffer, alle 4 Phasen', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const [fps, bpm] of [[60, 105], [30, 105], [60, 120]]) {
      const r = runBot({ seed, fps, bpm });
      assert.equal(r.done, true, `seed ${seed} fps ${fps} nicht abgeschlossen (${r.time.toFixed(1)}s)`);
      assert.equal(r.hits, 0, `seed ${seed} fps ${fps} bpm ${bpm}: ${r.hits} Treffer`);
      assert.equal(r.seen, 4);
    }
  }
});

test('Stage 4: Dauer und Fortschritt', () => {
  const r = runBot({ seed: 11, fps: 60, bpm: 105 });
  assert.ok(r.time > 30 && r.time < 75, `Dauer ${r.time.toFixed(1)}s`);
  assert.equal(MAX_HP, 20);
});
