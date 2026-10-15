import test from 'node:test';
import assert from 'node:assert/strict';

const voices = [];
const gains = [];
const parameter = () => ({
  value: 0,
  setValueAtTime() {},
  exponentialRampToValueAtTime() {}
});
globalThis.window = {
  AudioContext: class {
    state = 'running';
    currentTime = 10;
    destination = {};
    createGain() {
      const gain = { gain: parameter(), connect() {}, disconnect() { gain.disconnected = true; } };
      gains.push(gain);
      return gain;
    }
    createOscillator() {
      const voice = {
        frequency: parameter(),
        connect() {},
        start(time) { voice.startTime = time; },
        stop(time) { voice.stopTime = time; }
      };
      voices.push(voice);
      return voice;
    }
  },
  showToast() {}
};
globalThis.document = { getElementById: () => null };
const { playIdentityConfirm, toggleAudio } = await import('./audio.js');

test('identity sound is scheduled within the reveal, cancellable and respects mute', () => {
  const stop = playIdentityConfirm();
  assert.equal(typeof stop, 'function');
  assert.equal(voices.length, 5);
  assert.ok(voices.every((voice) => voice.startTime >= 10 && voice.stopTime <= 11));
  const master = gains[0];
  stop();
  assert.equal(master.disconnected, true);
  stop();
  playIdentityConfirm();
  const nextMaster = gains[6];
  toggleAudio();
  assert.equal(nextMaster.disconnected, true);
  const count = voices.length;
  assert.equal(playIdentityConfirm(), null);
  assert.equal(voices.length, count);
});
