let audioContext = null;
let soundEnabled = true;
let stopIdentitySound = null;
window.isMuted = false;

export function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }

  if (audioContext?.state === 'suspended') audioContext.resume();
  return audioContext;
}

export function toggleAudio() {
  soundEnabled = !soundEnabled;
  window.isMuted = !soundEnabled;
  if (!soundEnabled) stopIdentitySound?.();
  const icon = document.getElementById('soundIcon');

  if (window.isMuted) window.stopAudioPreview?.();
  try {
    document
      .getElementById('sudoIframe')
      ?.contentDocument?.querySelectorAll('audio')
      .forEach((audio) => {
        audio.muted = window.isMuted;
      });
  } catch (_) {}

  if (icon) icon.textContent = soundEnabled ? '🔊' : '🔇';
  window.showToast(soundEnabled ? 'Sound aktiviert' : 'Sound stumm');
  if (soundEnabled) playTone(880, 'sine', 0.1);
}

export function playTone(frequency, type = 'sine', duration = 0.08, gainValue = 0.06) {
  if (!soundEnabled) return;

  try {
    const context = getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (error) {
    console.error('Unable to play interface tone.', error);
  }
}

export function playBuzzerError() {
  if (!soundEnabled) return;

  try {
    const context = getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(130, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(80, context.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
  } catch (error) {
    console.error('Unable to play error tone.', error);
  }
}

export function playSuccessChime() {
  if (!soundEnabled) return;

  [523, 659, 783, 1046].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, 'sine', 0.14, 0.08), index * 90);
  });
}

export function playIdentityConfirm() {
  stopIdentitySound?.();
  if (!soundEnabled) return null;
  try {
    const context = getAudioContext();
    if (!context) return null;
    const start = context.currentTime;
    const master = context.createGain();
    master.gain.value = 0.45;
    master.connect(context.destination);
    const voices = [];
    const voice = (frequency, endFrequency, offset, duration, volume, type = 'sine') => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start + offset);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + offset + duration);
      envelope.gain.setValueAtTime(0.0001, start + offset);
      envelope.gain.exponentialRampToValueAtTime(volume, start + offset + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + duration);
      voices.push(oscillator);
    };
    voice(260, 1100, 0, 0.32, 0.07, 'triangle');
    voice(95, 48, 0.32, 0.24, 0.14);
    [659.25, 987.77, 1318.51].forEach((frequency, index) => {
      voice(frequency, frequency, 0.34 + index * 0.075, 0.48, 0.06);
    });
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      master.disconnect();
      if (stopIdentitySound === stop) stopIdentitySound = null;
    };
    voices.at(-1).onended = stop;
    stopIdentitySound = stop;
    return stop;
  } catch (error) {
    console.error('Identitäts-Sound konnte nicht abgespielt werden.', error);
    return null;
  }
}
