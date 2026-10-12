// Gemeinsame Helfer der SUDO-Shows

export function fadeOutAudio(audio, duration) {
  if (!audio || audio.paused) return;
  const startVolume = audio.volume;
  const startTime = performance.now();
  const fade = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    audio.volume = startVolume * (1 - progress);
    if (progress < 1) window.requestAnimationFrame(fade);
    else audio.pause();
  };
  window.requestAnimationFrame(fade);
}

export function resetAnimation(element, animation) {
  element.style.animation = 'none';
  void element.offsetHeight;
  element.style.animation = animation;
}
