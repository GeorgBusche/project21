/* =====================================================================
   🍕 SUDO MODUS: BELLA NAPOLI (DORF-ABRISS)
   ===================================================================== */
const BELLA_CONFIG = {
  hit1: 50,         
  hit2: 1650,       
  drop: 3050,       
  duration: 7000,   
  fadeTime: 1500    
};

function fadeOutAudio(audio, fadeDuration) {
  if (!audio || audio.paused) return;
  const steps = 20;
  const intervalTime = fadeDuration / steps;
  const volumeStep = audio.volume / steps;

  const fadeInterval = setInterval(() => {
    if (audio.volume > volumeStep) {
      audio.volume -= volumeStep;
    } else {
      audio.volume = 0;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1; 
      clearInterval(fadeInterval);
    }
  }, intervalTime);
}

function playBellaNapoliSynthFallback() {
  setTimeout(() => { playTone(523, 'square', 0.35, 0.2); }, BELLA_CONFIG.hit1);
  setTimeout(() => { playTone(587, 'square', 0.35, 0.2); }, BELLA_CONFIG.hit2);
  setTimeout(() => {
    [659, 784, 880, 1046, 880, 784, 659, 880].forEach((f, idx) => setTimeout(() => playTone(f, 'sawtooth', 0.15, 0.2), idx * 180));
  }, BELLA_CONFIG.drop);
}

function triggerBellaNapoli() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  const root = document.getElementById('bodyRoot');
  const disco = document.getElementById('discoOverlay');
  const discoBall = document.getElementById('discoBallElem');
  const audioElem = document.getElementById('audioBellaNapoli');

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playBellaNapoliSynthFallback());
  } else {
    playBellaNapoliSynthFallback();
  }

  appendLine(`<span class='text-amber-300 font-bold'>[SUDO] Zünde Dorf-Abriss (Bella Napoli)...</span>`);

  discoBall.className = 'discoball-base discoball-intro';
  discoBall.classList.remove('hidden');
  disco.className = 'fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 opacity-30 bg-amber-500';

  // Hit 1
  setTimeout(() => {
    root.classList.add('fx-punch');
    setTimeout(() => root.classList.remove('fx-punch'), 280);
    showSplashText("BELLA!", "#22c55e");
    triggerShockwave("#22c55e");
    
    // Die originalen 80 Partikel für den ersten Schlag
    blastConfetti(0, canvas.height * 0.8, 80, ['#22c55e', '#ffffff', '#ef4444'], ['🍺', '🎉', '🎶', '✨']);
    ensureFxLoop();
    if (navigator.vibrate) navigator.vibrate(200);
  }, BELLA_CONFIG.hit1);

  // Hit 2
  setTimeout(() => {
    root.classList.add('fx-punch');
    setTimeout(() => root.classList.remove('fx-punch'), 280);
    discoBall.className = 'discoball-base discoball-warning';
    showSplashText("BELLA!", "#f59e0b");
    triggerShockwave("#f59e0b");
    
    // Die originalen 80 Partikel für den zweiten Schlag
    blastConfetti(canvas.width, canvas.height * 0.8, 80, ['#f59e0b', '#ffffff', '#22c55e'], ['🍻', '🔥', '💥', '🥨']);
    ensureFxLoop();
    if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
  }, BELLA_CONFIG.hit2);

  // Drop
  setTimeout(() => {
    showSplashText("NAPOLI!", "#ef4444");
    triggerShockwave("#ef4444");
    root.classList.add('fx-earthquake');
    discoBall.className = 'discoball-base discoball-party';

    // MAXIMUM OVERDRIVE: 250 Partikel für den Napoli-Drop!
    blastConfetti(canvas.width / 2, canvas.height / 2, 250, ['#ef4444', '#22c55e', '#ffffff', '#f59e0b', '#06b6d4', '#ec4899'], ['🍕', '🍻', '🥃', '🎊', '🚜', '🔥', '🚀', '🥳', '💃', '🕺', '🔊']);
    ensureFxLoop();

    let tick = 0;
    const partyTimer = setInterval(() => {
      const colors = ['bg-rose-600', 'bg-emerald-500', 'bg-white', 'bg-cyan-400'];
      disco.className = `fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 opacity-60 ${colors[tick % colors.length]}`;
      if (tick % 2 === 0) fireLaserBurst();
      tick++;
    }, 90);

    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500, 100, 800]);
    appendLine("<span class='text-rose-400 font-extrabold text-sm animate-pulse'>🎺 [DROP] NAPOLI! PARTYRAUM ERREICHT MAXIMALEN DURCHSATZ!</span>");

    setTimeout(() => {
      fadeOutAudio(audioElem, BELLA_CONFIG.fadeTime);
    }, (BELLA_CONFIG.duration - BELLA_CONFIG.drop) - BELLA_CONFIG.fadeTime);

    setTimeout(() => {
      root.classList.remove('fx-earthquake');
      clearInterval(partyTimer);
      disco.className = "fixed inset-0 pointer-events-none z-40 opacity-0";
      discoBall.className = "hidden";
      isSudoRunning = false;
      appendLine("<span class='text-emerald-400 font-bold'>[STATUS] System wieder abgekühlt.</span>");
    }, BELLA_CONFIG.duration - BELLA_CONFIG.drop);

  }, BELLA_CONFIG.drop);
}