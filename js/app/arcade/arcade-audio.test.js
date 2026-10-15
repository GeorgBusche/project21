import assert from 'node:assert/strict';
import test from 'node:test';
import { soundtrackSeconds } from './arcade-timeline.js';
import { CONTENT } from '../../content.js';

test('audio clock keeps original tempo, waits for decode and never restarts on a stage handoff', async (t) => {
  const voices = [];
  const filters = [];
  let drops = 0;
  let tick;
  const param = () => ({
    value: 1,
    ramps: [],
    setValueAtTime(value) {
      this.value = value;
    },
    linearRampToValueAtTime(value, at) {
      this.value = value;
      this.ramps.push({ value, at });
    },
    exponentialRampToValueAtTime(value) {
      this.value = value;
    },
    setTargetAtTime(value) {
      this.value = value;
    },
    cancelScheduledValues() {}
  });
  const node = () => ({
    connect(destination) {
      this.destination = destination;
    },
    disconnect() {},
    gain: param(),
    frequency: param(),
    Q: param(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param()
  });
  const buffer = {
    duration: 180,
    sampleRate: 100,
    length: 18000,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(18000)
  };
  const ctx = {
    currentTime: 0,
    outputLatency: 0.1,
    sampleRate: 48000,
    state: 'running',
    resume() {},
    destination: {},
    createGain: node,
    createDynamicsCompressor: node,
    createBiquadFilter() {
      const filter = node();
      filters.push(filter);
      return filter;
    },
    createAnalyser: () => ({ ...node(), frequencyBinCount: 128, getByteFrequencyData() {} }),
    decodeAudioData: async () => buffer,
    createOscillator: () => ({
      ...node(),
      start() {
        drops++;
      },
      stop() {}
    }),
    createBufferSource() {
      const voice = {
        ...node(),
        playbackRate: param(),
        start(at, offset) {
          this.at = at;
          this.offset = offset;
        },
        stop() {}
      };
      voices.push(voice);
      return voice;
    }
  };
  const previousWindow = globalThis.window;
  globalThis.window = {
    AudioContext: function () {
      return ctx;
    },
    isMuted: false
  };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(0)
  }));
  t.mock.method(globalThis, 'setInterval', (fn) => {
    tick = fn;
    return 0;
  });
  const audio = await import('./arcade-audio.js');
  t.after(() => audio.stopArcadeAudio(true));
  audio.startArcadeAudio();
  assert.equal(audio.getBeatInfo().ready, false);
  await audio.preloadArcadeAudio();
  await Promise.resolve();
  assert.equal(voices.length, 1);
  assert.equal(voices[0].offset, 0);
  const barSec = 240 / CONTENT.arcadeAudio.baseBpm;
  assert.equal(voices[0].loop, true);
  assert.ok(voices[0].loopStart > buffer.duration * 0.7, 'loop never returns to the calm opening');
  assert.ok(
    Math.abs((voices[0].loopEnd - voices[0].loopStart) / barSec - 16) < 1e-9,
    'the late loop spans exactly sixteen complete bars'
  );
  assert.ok(
    Math.abs(voices[0].loopStart / barSec - Math.round(voices[0].loopStart / barSec)) < 1e-9
  );
  ctx.currentTime = 10;
  audio.setStressLevel(1);
  tick();
  assert.equal(voices[0].playbackRate.value, 1);
  assert.equal(audio.getBeatInfo().rate, 1);
  ctx.currentTime = voices[0].at + ctx.outputLatency + 35.5;
  assert.equal(audio.getBeatInfo().ready, true);
  assert.ok(Math.abs(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) - 35.5) < 1e-9);
  audio.setStage(2);
  audio.setStage(3);
  assert.equal(voices.length, 1, 'handoffs must reuse the original source');
  assert.equal(voices[0].playbackRate.value, 1);
  ctx.currentTime = voices[0].at + ctx.outputLatency + voices[0].loopEnd + 5;
  tick();
  assert.equal(voices.length, 1, 'native tail loop does not restart or layer main sources');
  assert.ok(
    soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) > voices[0].loopEnd,
    'the gameplay clock stays monotonic across the audio loop'
  );
  audio.stopArcadeAudio(true);
  audio.setStage(2);
  await Promise.resolve();
  assert.equal(voices.length, 2);
  assert.equal(voices[1].offset, 35.5, 'direct Stage 2 test starts at the configured drop');
  audio.stopArcadeAudio(true);
  const originalOffset = CONTENT.arcadeAudio.beatOffsetSec;
  CONTENT.arcadeAudio.beatOffsetSec = 0.2;
  t.after(() => {
    CONTENT.arcadeAudio.beatOffsetSec = originalOffset;
  });
  audio.setStage(2);
  await Promise.resolve();
  assert.equal(voices[2].offset, 35.5);
  ctx.currentTime = voices[2].at + ctx.outputLatency;
  assert.ok(Math.abs(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) - 35.5) < 1e-9);
  audio.stopArcadeAudio(true);
  CONTENT.arcadeAudio.beatOffsetSec = originalOffset;
  const originalCues = CONTENT.arcadeAudio.stageEndSec;
  t.after(() => {
    CONTENT.arcadeAudio.stageEndSec = originalCues;
  });
  CONTENT.arcadeAudio.stageEndSec = [36.7, 68.3, 111.4];
  for (const stage of [2, 3, 4]) {
    audio.setStage(stage);
    await Promise.resolve();
    assert.ok(Math.abs(voices.at(-1).offset - CONTENT.arcadeAudio.stageEndSec[stage - 2]) < 1e-9);
    audio.stopArcadeAudio(true);
  }
  CONTENT.arcadeAudio.stageEndSec = originalCues;
  const originalSync = CONTENT.arcadeAudio.soundtrackSync;
  t.after(() => {
    CONTENT.arcadeAudio.soundtrackSync = originalSync;
  });
  CONTENT.arcadeAudio.soundtrackSync = false;
  for (const [stage, duration] of [
    [3, 3],
    [4, 18]
  ]) {
    const cue = originalCues[stage - 2];
    const rate = CONTENT.arcadeAudio.stages[stage].rate;
    audio.startArcadeAudio(stage, stageEntry(stage), { intro: true });
    await Promise.resolve();
    const voice = voices.at(-1);
    const filter = filters.at(-1);
    assert.ok(filter.frequency.value < 5000);
    ctx.currentTime = voice.at + ctx.outputLatency + duration / rate - 0.001;
    assert.equal(audio.getBeatInfo().rate, rate);
    assert.ok(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) < cue + duration);
    ctx.currentTime += 0.001;
    assert.ok(
      Math.abs(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) - cue - duration) < 1e-8
    );
    audio.setStageIntroProgress(0.8);
    audio.setStressLevel(1);
    tick();
    assert.ok(filter.frequency.value < 5000, 'stress cannot open the cinematic filter');
    audio.setStressLevel(0);
    const beforeDrop = drops;
    audio.finishStageIntro();
    assert.equal(filter.frequency.value, 20000);
    assert.equal(drops, beforeDrop + 1);
    audio.finishStageIntro();
    assert.equal(drops, beforeDrop + 1, 'drop fires only once');
    audio.stopArcadeAudio(true);
  }
  function stageEntry(stage) {
    return (
      ((originalCues[stage - 2] - CONTENT.arcadeAudio.beatOffsetSec) *
        CONTENT.arcadeAudio.baseBpm) /
      60
    );
  }
  audio.startArcadeAudio(3, stageEntry(3), { intro: true });
  await Promise.resolve();
  ctx.currentTime = voices.at(-1).at + 1;
  ctx.outputLatency = 0;
  const beforeRamp = soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio);
  const rampAt = ctx.currentTime;
  const sourcesBeforeHandoff = voices.length;
  audio.setStage(4, { intro: true });
  ctx.currentTime = rampAt + 0.225;
  assert.ok(Math.abs(audio.getBeatInfo().rate - 1.155) < 1e-9);
  assert.ok(
    Math.abs(
      soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) -
        beforeRamp -
        (0.225 * (1.12 + 1.155)) / 2
    ) < 1e-9
  );
  ctx.currentTime = rampAt + 1.225;
  const rampArea = (0.45 * (1.12 + 1.19)) / 2 + 0.775 * 1.19;
  assert.ok(
    Math.abs(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) - beforeRamp - rampArea) <
      1e-9
  );
  assert.equal(voices.length, sourcesBeforeHandoff);
  ctx.outputLatency = 0.1;
  const bossDrop = originalCues[2] + 18;
  audio.skipArcadeIntro(bossDrop);
  await Promise.resolve();
  assert.equal(
    voices.length,
    sourcesBeforeHandoff + 1,
    'only a deliberate skip replaces the source'
  );
  assert.equal(voices.at(-1).offset, bossDrop);
  assert.equal(audio.getBeatInfo().ready, false, 'seek waits for audible source start');
  ctx.currentTime = voices.at(-1).at + ctx.outputLatency;
  assert.ok(
    Math.abs(soundtrackSeconds(audio.getBeatInfo(), CONTENT.arcadeAudio) - bossDrop) < 1e-9
  );
  audio.finishStageIntro();
  assert.equal(filters.at(-1).frequency.value, 20000);
  const mainFilter = filters.at(-1);
  const mainSource = voices.at(-1);
  const sampleData = new Float32Array(18000).fill(0.25);
  ctx.decodeAudioData = async () => ({ ...buffer, getChannelData: () => sampleData });
  audio.warmSudoSamples();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  const beforeSample = voices.length;
  assert.equal(audio.triggerSudoSample('napoli'), true);
  assert.equal(voices.length, beforeSample + 1);
  const sample = voices.at(-1);
  const highpass = sample.destination;
  const lowpass = highpass.destination;
  const sampleGain = lowpass.destination;
  assert.equal(highpass.type, 'highpass');
  assert.equal(highpass.frequency.value, 180);
  assert.equal(lowpass.type, 'lowpass');
  // The fake AudioParam stores its last scheduled value, including the fade-out.
  assert.equal(sampleGain.gain.value, 0.0001);
  assert.equal(
    sampleGain.gain.ramps[0].value,
    0.24,
    'sample RMS is 0.06, slightly louder but still below the main track target of 0.14'
  );
  assert.equal(
    sampleGain.gain.ramps[0].at,
    sample.at + 0.18,
    'soft attack avoids a jarring clip entrance'
  );
  assert.equal(mainFilter.frequency.value, 20000, 'song mix must not muffle the main track');
  audio.triggerDjScratch();
  assert.equal(
    mainFilter.frequency.value,
    20000,
    'boss record-start scratch preserves the main track'
  );
  ctx.currentTime += 1;
  tick();
  assert.equal(
    mainSource,
    voices[beforeSample - 1],
    'song activation never replaces the main source'
  );
  assert.equal(mainFilter.frequency.value, 20000);
  audio.stopArcadeAudio(true);
  CONTENT.arcadeAudio.soundtrackSync = originalSync;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }));
  const notice = t.mock.method(console, 'info', () => {});
  const fallback = await import('./arcade-audio.js?fallback-test');
  t.after(() => fallback.stopArcadeAudio(true));
  fallback.startArcadeAudio();
  ctx.currentTime += 5;
  assert.equal(fallback.getBeatInfo().ready, false);
  await fallback.preloadArcadeAudio();
  await Promise.resolve();
  ctx.currentTime += 0.15;
  const silentBeat = fallback.getBeatInfo();
  assert.equal(silentBeat.ready, true);
  assert.equal(silentBeat.bpm, 105);
  assert.ok(
    soundtrackSeconds(silentBeat, CONTENT.arcadeAudio) < 0.01,
    'failed decode time must not consume the intro'
  );
  assert.equal(notice.mock.callCount(), 1, 'missing audio must be reported');
  const sampleFailure = t.mock.method(console, 'warn', () => {});
  assert.equal(fallback.triggerSudoSample('napoli'), false);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.equal(fallback.triggerSudoSample('napoli'), 'unavailable');
  assert.equal(sampleFailure.mock.callCount(), 5, 'each failed song is reported once');
  fallback.warmSudoSamples();
  assert.equal(fallback.triggerSudoSample('napoli'), 'unavailable');
  assert.equal(sampleFailure.mock.callCount(), 5, 'a permanent failure must not retry every beat');
});
