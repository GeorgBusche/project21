import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBossIntro, renderPyroIntro, renderIntroImpact } from './arcade-cutscenes.js';
import { introTrackElapsed, stageWindow, validateStageCues } from './arcade-timeline.js';
import { CONTENT } from '../../content.js';
import { createStage3 } from './stages/stage3-pyro.js';
import { createStage4, GLASSES } from './stages/stage4-orbit.js';
import {
  drawTitan,
  drawSongDeck,
  drawConcertStage,
  drawBossVictory,
  drawReactorOpening,
  SONG_SHOWS
} from './stages/stage4-show.js';

function canvas() {
  let depth = 0;
  const labels = [];
  const noop = (...args) => {
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
  };
  const ctx = new Proxy(
    {
      globalAlpha: 1,
      save() {
        depth++;
      },
      restore() {
        assert.ok(depth > 0);
        depth--;
      },
      fillText(value, ...args) {
        labels.push(value);
        noop(...args);
      },
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop })
    },
    {
      get: (target, key) => (key in target ? target[key] : noop)
    }
  );
  return { ctx, labels, depth: () => depth };
}

test('both cinematic stage APIs use the requested track durations without changing gameplay counts', () => {
  const pyro = createStage3();
  const boss = createStage4();
  assert.equal(pyro.trackIntroDuration, 3);
  assert.equal(boss.trackIntroDuration, 18);
  assert.equal(typeof pyro.renderIntro, 'function');
  assert.equal(typeof boss.renderIntro, 'function');
  assert.equal(GLASSES, 22);
});

test('concert escalation and all victory acts render finite coordinates with balanced Canvas state', () => {
  const { ctx, labels, depth } = canvas();
  const engine = { drawFiech() {}, drawPlayer() {} };
  for (const t of [0, 4, 17.5]) {
    drawReactorOpening(ctx, {
      t,
      hazards: [{ reactor: true, tellAt: t - 0.2, liveAt: t + 0.7, center: 0.8 }],
      angle: 0.5
    });
    assert.equal(depth(), 0);
  }
  for (const intensity of [0, 0.4, 1, 1.4]) {
    drawConcertStage(ctx, { t: 31.5, beat: { beatPhase: 0.1 }, intensity });
    assert.equal(depth(), 0);
  }
  for (const t of [0, 0.4, 0.84, 0.85, 1, 1.6, 2.5, 4, 5.2]) {
    drawBossVictory(ctx, t, engine, { beatPhase: 0.2 });
    assert.equal(depth(), 0);
  }
  assert.ok(labels.includes('REAKTOR // KOLLAPS'));
  assert.ok(labels.includes('ZERLEGT.'));
  assert.ok(labels.includes('22 / 22 // EXORZISMUS KOMPLETT'));
});

test('intro timing follows soundtrack position at fast rates, through frame hitches and changed cues', () => {
  for (const duration of [3, 18])
    for (const rate of [1, 1.12, 1.19, 1.24]) {
      const cue = 125.7;
      for (const elapsed of [
        0,
        0.1,
        duration * 0.5,
        duration - 0.0001,
        duration,
        duration + 0.75
      ]) {
        const real = elapsed / rate;
        assert.ok(
          Math.abs(
            introTrackElapsed(cue + real * rate, cue, duration) - Math.min(duration, elapsed)
          ) < 1e-9
        );
      }
    }
  const config = { ...CONTENT.arcadeAudio, stageEndSec: [35.5, 71, 125] };
  assert.equal(stageWindow(3, config).startSec, 74);
  assert.equal(stageWindow(3, config).endSec, 125);
  assert.equal(stageWindow(4, config), null);
  assert.throws(
    () => validateStageCues({ ...config, stageEndSec: [35.5, 71, 93] }),
    'Stage 3 must reserve its intro before validating playable length'
  );
});

test('all cinematic acts and the exact end render safely, with balanced Canvas state', () => {
  const engine = { drawFiech() {}, drawPlayer() {} };
  const beat = { beatPhase: 0.15, bassEnergy: 0.8 };
  for (const [render, duration] of [
    [renderPyroIntro, 3],
    [renderBossIntro, 18]
  ]) {
    const { ctx, labels, depth } = canvas();
    for (let frame = 0; frame <= duration * 60; frame++) {
      render(ctx, frame / 60, duration, beat, engine, GLASSES);
      assert.equal(depth(), 0);
    }
    if (duration === 3) assert.ok(labels.includes('// FEUER FREI! //'));
    else {
      for (const label of ['PINNCHEN 22/22 LOCKED', '// KORN', '// AHOI', '// EX ODER KELLER!']) {
        assert.ok(labels.includes(label), label);
      }
    }
    for (const elapsed of [0, 0.1, 0.4, 0.65, 1]) {
      renderIntroImpact(ctx, elapsed, duration === 18, engine, beat);
      assert.equal(depth(), 0);
    }
  }
});

test('boss initialization and cinematic rendering never start a DJ sample or scratch', () => {
  const sounds = [];
  const noop = () => {};
  const engine = {
    W: 360,
    H: 600,
    keys: new Set(),
    pointer: { down: false },
    held: false,
    drawFiech: noop,
    drawPlayer: noop,
    stopSudoSample: noop,
    warmSudoSamples: noop,
    hit: () => false,
    complete: noop,
    addScore: noop,
    shake: () => sounds.push('shake'),
    beep: () => sounds.push('beep'),
    triggerDjScratch: () => sounds.push('scratch'),
    triggerSudoSample: (id) => {
      sounds.push(id);
      return true;
    }
  };
  const boss = createStage4();
  boss.init(engine);
  const { ctx } = canvas();
  const beat = { running: true, bpm: 105, beatIndex: 200, beatPhase: 0, isBeat: true };
  for (const t of [0, 4.5, 9.5, 15.5, 17, 18]) boss.renderIntro(ctx, t, 18, beat);
  assert.deepEqual(sounds, [], 'the full quiet passage belongs exclusively to the soundtrack');
  for (let i = 0; i < 3; i++) {
    boss.update(1 / 60, { ...beat, beatIndex: 200 + i });
    assert.deepEqual(sounds, [], 'initial shield leaves the soundtrack drop audible');
  }
  boss.update(1 / 60, { ...beat, beatIndex: 203 });
  assert.deepEqual(sounds, [], 'Fiech visibly cues the record before starting it');
  let openingHazard = false;
  for (let i = 0; i < 540; i++) {
    boss.update(1 / 60, { ...beat, beatIndex: 204 + Math.floor(i / 30), isBeat: i % 30 === 0 });
    openingHazard ||= boss.debug().hazards.length > 0;
    assert.equal(boss.debug().song, null, 'the first nine seconds belong to the main soundtrack');
  }
  assert.ok(openingHazard, 'the song-free opening is an active fight, not another waiting screen');
  for (let i = 0; i < 1200; i++) {
    boss.update(1 / 60, { ...beat, beatIndex: 222 + Math.floor(i / 30), isBeat: i % 30 === 0 });
    if (sounds.includes('napoli')) break;
  }
  assert.ok(sounds.includes('scratch'));
  assert.equal(
    sounds.filter((s) => s === 'napoli').length,
    1,
    'the first phase starts exactly one DJ sample after its gesture'
  );
});

test('the awakened cinematic Fiech keeps its size, eyes and reactor identity in gameplay', () => {
  const appearances = [];
  const engine = {
    drawFiech(_ctx, _x, _y, size, options) {
      appearances.push({ size, options });
    },
    drawPlayer() {},
    warmSudoSamples() {},
    stopSudoSample() {},
    keys: new Set(),
    pointer: { down: false }
  };
  const { ctx, depth } = canvas();
  const beat = { beatPhase: 0.5, bassEnergy: 0 };
  renderBossIntro(ctx, 18, 18, beat, engine, GLASSES);
  const cinematic = appearances.at(-1);
  const boss = createStage4();
  boss.init(engine);
  boss.render(ctx);
  const gameplay = appearances.at(-1);
  assert.equal(cinematic.size, 88);
  assert.equal(gameplay.size, cinematic.size);
  assert.equal(gameplay.options.bodyColor, cinematic.options.bodyColor);
  assert.deepEqual(gameplay.options.eyeColors, ['#ff2346', '#67edff']);
  assert.deepEqual(gameplay.options.eyeColors, cinematic.options.eyeColors);
  for (const [phase, id] of Object.keys(SONG_SHOWS).entries()) {
    for (const cue of [0, 0.3, 0.7, 1]) {
      drawTitan(ctx, engine, { phase, t: 18.5, beat, activation: cue, recoil: 0.5 });
      drawSongDeck(ctx, { id, t: 0.5, beat, cue, playing: cue === 1 });
      assert.equal(depth(), 0);
    }
  }
});

test('a late-loading sample keeps its visible cue and cannot launch unannounced attacks', () => {
  let loaded = false;
  let starts = 0;
  const noop = () => {};
  const boss = createStage4();
  boss.init({
    keys: new Set(),
    pointer: { down: false },
    hit: () => false,
    warmSudoSamples: noop,
    stopSudoSample: noop,
    beep: noop,
    shake: noop,
    addScore: noop,
    triggerSudoSample: () => {
      if (!loaded) return false;
      starts++;
      return true;
    },
    triggerDjScratch: noop
  });
  for (let i = 0; i < 1800; i++) {
    boss.update(1 / 60, {
      running: true,
      bpm: 105,
      beatIndex: Math.floor(i / 30),
      beatPhase: (i % 30) / 30,
      isBeat: i % 30 === 0
    });
  }
  assert.equal(starts, 0);
  assert.equal(boss.debug().song.heard, false);
  assert.equal(boss.debug().songCue, 0.98);
  assert.equal(boss.debug().hazards.length, 0);
  loaded = true;
  for (let i = 0; i < 120; i++) {
    boss.update(1 / 60, {
      running: true,
      bpm: 105,
      beatIndex: 60 + Math.floor(i / 30),
      beatPhase: (i % 30) / 30,
      isBeat: i % 30 === 0
    });
  }
  assert.equal(starts, 1);
  assert.equal(boss.debug().song.heard, true);
  assert.equal(boss.debug().songCue, 1);
});

test('a failed sample is visibly offline, not reported as playing, and cannot stall the fight', () => {
  const noop = () => {};
  let starts = 0;
  const boss = createStage4();
  boss.init({
    keys: new Set(),
    pointer: { down: false },
    hit: () => false,
    drawFiech: noop,
    drawPlayer: noop,
    warmSudoSamples: noop,
    stopSudoSample: noop,
    beep: noop,
    shake: noop,
    addScore: noop,
    triggerSudoSample: () => {
      starts++;
      return 'unavailable';
    },
    triggerDjScratch: () => assert.fail('no scratch for a failed recording')
  });
  for (let i = 0; i < 1800; i++) {
    boss.update(1 / 60, {
      running: true,
      bpm: 105,
      beatIndex: Math.floor(i / 30),
      beatPhase: (i % 30) / 30,
      isBeat: i % 30 === 0
    });
    if (boss.debug().song?.unavailable && boss.debug().hazards.length > 0) break;
  }
  assert.equal(starts, 1);
  assert.equal(boss.debug().song.started, true);
  assert.equal(boss.debug().song.heard, false);
  assert.equal(boss.debug().song.unavailable, true);
  assert.ok(boss.debug().hazards.length > 0, 'announced attacks continue after failure');
  const { ctx, labels, depth } = canvas();
  boss.render(ctx);
  assert.ok(labels.some((label) => label.startsWith('SAMPLE OFFLINE')));
  assert.equal(depth(), 0);
});
