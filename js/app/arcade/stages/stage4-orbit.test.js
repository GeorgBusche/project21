import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4, GLASSES, OMEGA, OPENING_SECONDS, phaseOf, wrap, hazardHit, liveAtOf, endOf } from './stage4-orbit.js';
import { SONGS, PLAYLISTS } from '../arcade-songs.js';

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

function runBot({ seed, fps, bpm, maxSeconds = 360, reaction = 0.08, render = true }) {
  const random = rng(seed);
  let hits = 0;
  const hitDetails = [];
  let done = false;
  let invuln = 0;
  let maxVisible = 0;
  let maxLast = 0;
  const sounds = [];
  const signatures = new Map();
  const reprises = new Set();
  let earlySample = false;
  let firstSongAt = null;
  const visitedPhases = new Set();
  const openingAttacks = new Set();
  const pressuredPhases = new Set();
  let koStart = null;
  let koDuration = 0;
  const noop = () => {};
  const engine = {
    keys: new Set(),
    pointer: { x: 180, y: 300, down: false },
    hit: () => {
      if (invuln > 0) return false;
      invuln = 1.4;
      hits++;
      const d = stage.debug();
      hitDetails.push({ phase: d.phase, t: d.t, attack: d.currentAttack,
        hazards: d.hazards.filter(h => hazardHit(h, d.ang, d.t, 0, d.ring)) });
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
    triggerDjScratch: () => {
      sounds.push('scratch');
    },
    triggerSudoSound: (k) => {
      sounds.push(k);
    },
    triggerSudoSample: (k) => {
      const queued = stage.debug().song;
      if (queued && elapsed - queued.queuedAt < 0.9 - 1e-6) earlySample = true;
      sounds.push('song:' + k);
      firstSongAt ??= elapsed;
    }
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
  const baseCtx = proxyCtx();
  const ctx = new Proxy(baseCtx, {
    get(target, key) {
      if (key === 'fillText') return (text) => assert.equal(String(text).includes('SAFE ZONE'), false, 'no safe-zone labels in any phase');
      if (key === 'fillRect') return (x, y, w, h) => assert.ok(!(x === 9 && y === 47 && w === 342 && h === 21), 'no top HP bar');
      return target[key];
    }
  });
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
    if (thinkT >= reaction) {
      thinkT = 0;
      const d = stage.debug();
      if (d.hazards.some(h => h.pressure)) pressuredPhases.add(d.opening ? 'opening' : d.phase);
      for (const h of d.hazards.filter(h => h.pressure && d.t >= h.liveAt && d.t <= endOf(h))) {
        assert.ok(h.liveAt - h.tellAt >= 0.94, 'pressure retains the full warning');
        assert.ok(d.hazards.some(other => !other.pressure && d.t >= liveAtOf(other) && d.t <= endOf(other)),
          'pressure actually overlaps its primary attack');
        const rings = d.unlocked ? [0, 1] : [0];
        for (const r of rings) {
          assert.ok(Array.from({ length: 120 }, (_, i) => i * Math.PI / 60)
            .some(a => d.hazards.some(other => hazardHit(other, a, d.t, 0, r))),
          'neither unlocked rail is entirely safe during a pressure combination');
        }
        assert.ok(rings.some(r => Array.from({ length: 120 }, (_, i) => i * Math.PI / 60)
          .some(a => !d.hazards.some(other => hazardHit(other, a, d.t, 0.03, r)))),
        'an open escape corridor remains during every observed overlap');
      }
      visitedPhases.add(d.phase);
      if (d.opening) {
        for (const h of d.hazards) {
          assert.equal(h.reactor, true, 'opening uses only its own autonomous defence patterns');
          openingAttacks.add(h.kind);
        }
        assert.equal(d.capsules.length, 0, 'opening cannot skip Napoli via early HP damage');
      }
      assert.ok(d.hazards.every(h => h.skin !== 'pizza'));
      for (const h of d.hazards) {
        if (h.reprise) reprises.add(d.phase);
        if (h.phrase === 0) {
          assert.ok(d.hazards.filter(v => v.pressure).length <= 1, 'first phrase introduces only one pressure sector');
        }
        if (h.signature && !signatures.has(d.phase)) {
          signatures.set(d.phase, d.hazards.filter((v) => v.signature).map((v) => ({
            kind: v.kind, ring: v.ring, skin: v.skin, single: v.single, count: v.count,
            song: v.song, warning: v.liveAt - v.tellAt
          })));
        }
      }
      const rings = d.unlocked ? [0, 1] : [0];
      const cost = (dir, ring, tau = 9) => {
        let c = (dir === d.dir ? 0 : 0.4) + (ring === d.ring ? 0 : 0.5);
        let predicted = d.ang;
        const initialBurst = dir !== d.dir || ring !== d.ring ? 0.12 : d.burst;
        for (let a = 0; a <= 1.8; a += 0.025) {
          const burst = a < initialBurst || (a >= tau && a < tau + 0.12);
          const speed = OMEGA * (1 + 0.08 * (1 - ((beatT + a) % bl) / bl)) * (burst ? 1.8 : 1);
          if (a > 0) predicted = wrap(predicted + dir * (a <= tau ? 1 : -1) * speed * 0.025);
          if (d.hazards.some(h => d.t >= h.tellAt && hazardHit(h, predicted, d.t + a, 0.15, ring))) c += 40 / (1 + a * 1.5);
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
          if (dir !== d.dir && (ring !== d.ring || elapsed - tapAt <= (d.unlocked ? 0.29 : 0))) continue;
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
    if (render) stage.render(ctx);
    const d = stage.debug();
    if (d.mode === 'ko') {
      koStart ??= elapsed;
      koDuration = elapsed - koStart;
    }
    const vis = d.hazards.filter((h) => d.t >= liveAtOf(h) && d.t <= endOf(h)).length;
    if (d.mode === 'last') maxLast = Math.max(maxLast, vis);
    else maxVisible = Math.max(maxVisible, vis);
  }
  return { hits, hitDetails, done, elapsed, sounds, signatures, reprises, earlySample, firstSongAt, visitedPhases, openingAttacks, pressuredPhases, koDuration, maxVisible, maxLast, progress: stage.progress() };
}

test('Orbit-Boss ist mit Richtungs- und Ringwechsel ohne Treffer schaffbar (~2-3 min)', () => {
  for (const [seed, fps, bpm] of [[1, 60, 105], [2, 60, 120], [3, 30, 105], [4, 60, 111], [5, 30, 120], [6, 60, 100]]) {
    const r = runBot({ seed, fps, bpm });
    assert.ok(r.done, `seed ${seed}: nicht fertig (progress ${r.progress.toFixed(2)})`);
    assert.equal(r.hits, 0, `seed ${seed}: ${JSON.stringify(r.hitDetails)}`);
    assert.ok(r.elapsed > 90 && r.elapsed < 280, `seed ${seed}: Dauer ${r.elapsed.toFixed(1)}s`);
  }
});

test('gezielte Angriffs-Ueberlappungen bleiben begrenzt und alle Songs werden ausgeloest', () => {
  const r = runBot({ seed: 9, fps: 60, bpm: 110 });
  assert.ok(r.done);
  assert.ok(r.maxVisible <= 3, `gleichzeitige Gefahren: ${r.maxVisible}`);
  assert.ok(r.maxLast <= 3, `Finale: ${r.maxLast}`);
  for (const k of ['scratch', 'song:napoli', 'song:sonne', 'song:tornado', 'song:gas', 'song:wolle']) assert.ok(r.sounds.includes(k), `Sound ${k} fehlt`);
  assert.equal(r.sounds.includes('song:schuetteln'), false, 'removed show never plays');
  assert.deepEqual([...r.visitedPhases], [0, 1, 2, 3, 4], 'Wolle leads directly into Sonne');
  assert.deepEqual([...r.openingAttacks].sort(), ['arcs', 'laser']);
  assert.deepEqual([...r.pressuredPhases], ['opening', 0, 1, 2, 3, 4], 'every phase has pressure combinations');
  assert.ok(r.firstSongAt >= OPENING_SECONDS + 0.9, 'Bella Napoli follows the longer reactor duel');
  assert.ok(r.koDuration >= 5.15, 'victory cinematic finishes before the results screen');
  assert.equal(r.earlySample, false, 'every sample waits for its visible 0.9-second activation');
  assert.equal(r.signatures.size, 5, 'all five performances launch an exclusive signature phrase');
  assert.deepEqual([...r.reprises], [0, 1, 2, 3, 4], 'each phase introduces its new second-phrase mechanic');
  assert.deepEqual([...r.signatures.values()].map((s) => [...new Set(s.map((h) => h.kind))]),
    [['geys', 'laser'], ['zone'], ['laser'], ['arcs'], ['spokes']]);
  for (const attacks of r.signatures.values()) {
    for (const h of attacks) {
      assert.ok(h.warning >= 0.94, 'signatures retain a full readable warning');
      assert.ok(h.song, 'each signature is tied to its actual song');
    }
  }
});

test('gestaffelte Angriffe bleiben bei weiteren Seeds, Bildraten und Reaktionsintervallen trefferfrei erreichbar', () => {
  for (let seed = 10; seed < 34; seed++) {
    const fps = [30, 60, 120][seed % 3];
    const bpm = [100, 105, 111, 120][seed % 4];
    const reaction = [0.08, 0.12, 0.16][Math.floor(seed / 3) % 3];
    const r = runBot({ seed, fps, bpm, reaction, render: false });
    assert.ok(r.done, `seed ${seed}, ${fps} FPS, ${bpm} BPM, reaction ${reaction}: unfinished`);
    assert.equal(r.hits, 0, `seed ${seed}, ${fps} FPS, ${bpm} BPM, reaction ${reaction}: ${JSON.stringify(r.hitDetails)}`);
    assert.ok(r.maxVisible <= 3, `seed ${seed}: ${r.maxVisible} simultaneous hazards`);
  }
});

test('Orbit-Boss hat 22 Pinnchen', () => {
  assert.equal(GLASSES, 22);
  assert.equal(PLAYLISTS.length, 5);
  assert.equal('schuetteln' in SONGS, false);
  assert.equal(phaseOf(7), 3);
  assert.equal(phaseOf(6), 4);
});
