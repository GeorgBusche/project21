let audioContext = null;
let soundEnabled = true;

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
  const icon = document.getElementById('soundIcon');

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
