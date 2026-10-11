/* =====================================================================
   🏓 SUDO MODUS: RAGE CAGE (EUROBEAT "GAS GAS GAS" ESKALATION)
   ===================================================================== */
const RAGE_CONFIG = {
  // Timings anpassen auf die "Gas, gas, gas..." Kicks (in ms)
  c1_gas1: 100,       // "Gas..."
  c2_gas2: 800,       // "...gas..."
  c3_gas3: 1500,       // "...gas..."
  c4_gas4: 1900,      // "...gas..."
  c5_gas5: 2300,      // "...gas..."
  c6_drop: 2700,      // EUROBEAT DROP!
  
  duration: 8300,    // Gesamte Laufzeit
  fadeTime: 2000      // Fade-Out
};

function injectRageStyles() {
  if (document.getElementById('rageStyles')) return;
  const style = document.createElement('style');
  style.id = 'rageStyles';
  style.innerHTML = `
    /* Eurobeat Anime Speedlines */
    .rage-speedlines {
      position: fixed; inset: -50vw; z-index: 35; pointer-events: none; opacity: 0;
      background: repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255, 255, 255, 0.15) 10deg 20deg);
      animation: speedlinesSpin 3s linear infinite;
      transition: opacity 0.2s;
    }
    .rage-speedlines.hyper { animation: speedlinesSpin 0.5s linear infinite; opacity: 1; background: repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255, 0, 0, 0.4) 10deg 20deg); }
    @keyframes speedlinesSpin { 0% { transform: rotate(0deg) scale(2); } 100% { transform: rotate(360deg) scale(2); } }

    /* Kinetische Typografie - Noch aggressiver, geneigt für Speed */
    .rage-text {
      position: fixed; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0) skewX(-15deg);
      width: 100vw; text-align: center; font-size: clamp(6rem, 20vw, 16rem);
      font-weight: 900; color: #fbbf24;
      text-shadow: 6px 6px 0px #dc2626, -3px -3px 0px #000, 0 0 50px #ef4444;
      z-index: 9999; pointer-events: none; font-family: 'Impact', sans-serif; text-transform: uppercase;
      line-height: 0.9; contain: layout paint style; will-change: transform, opacity;
    }

    /* Verschiedene harte Text-Einschläge */
    @keyframes smashGasLeft { 0% { transform: translate3d(-100%, -50%, 0) skewX(-30deg) scale(2); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) skewX(-15deg) scale(1); opacity: 1; } }
    @keyframes smashGasRight { 0% { transform: translate3d(100%, -50%, 0) skewX(30deg) scale(2); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) skewX(-15deg) scale(1); opacity: 1; } }
    @keyframes stompGasCenter { 0% { transform: translate3d(-50%, -50%, 0) skewX(-15deg) scale(4); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) skewX(-15deg) scale(1); opacity: 1; } }
    @keyframes textFlicker { 0%, 100% { opacity: 1; transform: translate3d(-50%, -50%, 0) skewX(-15deg) scale(1); } 50% { opacity: 0.8; transform: translate3d(-52%, -48%, 0) skewX(-20deg) scale(1.1); } }

    /* Fliegende Ping Pong Bälle (Ragecage) */
    .ping-pong {
      position: fixed; width: 30px; height: 30px; background: radial-gradient(circle at 10px 10px, #ffffff, #d1d5db);
      border-radius: 50%; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
      z-index: 9996; pointer-events: none; will-change: transform;
    }
    @keyframes bounceBall {
      0% { transform: translate3d(0, -20vh, 0) scale(1); }
      50% { transform: translate3d(0, 100vh, 0) scale(0.9); } /* Schlägt unten auf */
      100% { transform: translate3d(0, 20vh, 0) scale(1); } /* Springt wieder hoch */
    }

    /* Rote Ragecage Becher */
    .red-cup {
      position: fixed; z-index: 9995; font-size: clamp(4rem, 10vw, 8rem);
      pointer-events: none; will-change: transform; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5));
    }
    @keyframes flyCup { 0% { transform: translate3d(-20vw, 120vh, 0) rotate(-45deg); } 100% { transform: translate3d(120vw, -20vh, 0) rotate(180deg); } }

    /* Kamera Speed-Shakes (Hochfrequenz) */
    .cam-speed-shake { animation: speedShake 0.1s infinite linear; }
    @keyframes speedShake { 0% { transform: translate3d(5px, 5px, 0); } 25% { transform: translate3d(-5px, -5px, 0); } 50% { transform: translate3d(-5px, 5px, 0); } 75% { transform: translate3d(5px, -5px, 0); } 100% { transform: translate3d(5px, 5px, 0); } }

    /* Stroboskop */
    .rage-strobe {
      position: fixed; inset: 0; z-index: 9998; pointer-events: none;
      animation: strobeFlash 0.15s infinite; opacity: 0; transform: translateZ(0);
    }
    @keyframes strobeFlash { 0%, 100% { background: transparent; opacity: 0; } 50% { background: #ef4444; opacity: 0.6; } }

    /* Warn-Balken Oben und Unten */
    .rage-borders {
      position: fixed; inset: 0; z-index: 9997; pointer-events: none;
      border-top: 30px solid #dc2626; border-bottom: 30px solid #dc2626;
      opacity: 0; transition: opacity 0.2s;
      background: repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(0,0,0,0.5) 40px, rgba(0,0,0,0.5) 80px);
    }
  `;
  document.head.appendChild(style);
}

function fadeOutAudioRage(audio, fadeDuration) {
  if (!audio || audio.paused) return;
  const steps = 20;
  const intervalTime = fadeDuration / steps;
  const volumeStep = audio.volume / steps;
  const fadeInterval = setInterval(() => {
    if (audio.volume > volumeStep) audio.volume -= volumeStep;
    else {
      audio.volume = 0; audio.pause(); audio.currentTime = 0; audio.volume = 1; 
      clearInterval(fadeInterval);
    }
  }, intervalTime);
}

function playRageSynthFallback() {
  setTimeout(() => { playTone(500, 'square', 0.1, 0.3); }, RAGE_CONFIG.c1_gas1);
  setTimeout(() => { playTone(550, 'square', 0.1, 0.3); }, RAGE_CONFIG.c2_gas2);
  setTimeout(() => { playTone(600, 'square', 0.1, 0.3); }, RAGE_CONFIG.c3_gas3);
  setTimeout(() => { playTone(650, 'square', 0.1, 0.3); }, RAGE_CONFIG.c4_gas4);
  setTimeout(() => { playTone(700, 'square', 0.1, 0.3); }, RAGE_CONFIG.c5_gas5);
}

function resetRageAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight; 
  element.style.animation = animationName;
}

function spawnPingPongBalls() {
  for (let i = 0; i < 5; i++) {
    const ball = document.createElement('div');
    ball.className = 'ping-pong';
    // Start X Position
    const startX = Math.random() * 100;
    ball.style.left = `${startX}vw`;
    
    // Y-Bounce Animation
    const durY = 0.4 + Math.random() * 0.3;
    ball.style.animation = `bounceBall ${durY}s infinite alternate ease-in`;
    
    // X-Drift (damit sie quer fliegen)
    const drift = (Math.random() - 0.5) * 60; // Fliegt nach links oder rechts
    ball.style.transform = `translateX(${drift}vw)`;
    ball.style.transition = `transform ${durY * 4}s linear`;

    document.body.appendChild(ball);
    rageElements.push(ball);

    // Timeout zum Auslösen des X-Drifts
    setTimeout(() => {
      if (ball.parentNode) ball.style.transform = `translateX(${drift * 3}vw)`;
    }, 50);

    setTimeout(() => { if (ball.parentNode) ball.remove(); }, 3000);
  }
}

function spawnRedCups() {
  for (let i = 0; i < 3; i++) {
    const cup = document.createElement('div');
    cup.className = 'red-cup';
    cup.textContent = '🥤';
    
    const startY = Math.random() * 100;
    cup.style.top = `${startY}vh`;
    
    const dur = 0.5 + Math.random() * 0.5;
    cup.style.animation = `flyCup ${dur}s linear forwards`;
    
    document.body.appendChild(cup);
    rageElements.push(cup);
    setTimeout(() => { if (cup.parentNode) cup.remove(); }, dur * 1000);
  }
}

let rageElements = [];
let rageInterval1 = null;
let rageInterval2 = null;
let wordInterval = null;

function triggerRagecage() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  injectRageStyles();
  rageElements.forEach(el => el.remove());
  rageElements = []; 

  const root = document.getElementById('bodyRoot');
  const audioElem = document.getElementById('audioGas'); // MP3 muss audioGas heißen!

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playRageSynthFallback());
  } else {
    playRageSynthFallback();
  }

  appendLine(`<span class='text-red-500 font-extrabold'>[RAGECAGE] SYSTEM STAPELT BECHER! BEREITMACHEN!</span>`);

  // Speedlines Hintergrund
  const speedBg = document.createElement('div');
  speedBg.className = 'rage-speedlines';
  document.body.appendChild(speedBg);
  rageElements.push(speedBg);

  // Warn-Balken
  const borders = document.createElement('div');
  borders.className = 'rage-borders';
  document.body.appendChild(borders);
  rageElements.push(borders);

  const mainText = document.createElement('div');
  mainText.className = 'rage-text';
  document.body.appendChild(mainText);
  rageElements.push(mainText);

  // =========================================================
  // CUT 1-5: GAS GAS GAS GAS GAS
  // =========================================================
  setTimeout(() => {
    speedBg.style.opacity = "0.3";
    mainText.innerHTML = "GAS";
    resetRageAnimation(mainText, 'smashGasLeft 0.1s ease-out forwards');
    if (navigator.vibrate) navigator.vibrate(100);
  }, RAGE_CONFIG.c1_gas1);

  setTimeout(() => {
    speedBg.style.opacity = "0.5";
    mainText.innerHTML = "GAS";
    resetRageAnimation(mainText, 'smashGasRight 0.1s ease-out forwards');
    if (navigator.vibrate) navigator.vibrate(100);
  }, RAGE_CONFIG.c2_gas2);

  setTimeout(() => {
    speedBg.style.opacity = "0.7";
    mainText.style.color = "#ef4444"; // Wechsel auf Rot
    mainText.innerHTML = "GAS";
    resetRageAnimation(mainText, 'smashGasLeft 0.1s ease-out forwards');
    if (navigator.vibrate) navigator.vibrate(100);
  }, RAGE_CONFIG.c3_gas3);

  setTimeout(() => {
    speedBg.style.opacity = "0.9";
    mainText.innerHTML = "GAS";
    resetRageAnimation(mainText, 'smashGasRight 0.1s ease-out forwards');
    if (navigator.vibrate) navigator.vibrate(100);
  }, RAGE_CONFIG.c4_gas4);

  setTimeout(() => {
    speedBg.classList.add('hyper');
    borders.style.opacity = "1";
    mainText.style.color = "#ffffff";
    mainText.innerHTML = "GAS!!!";
    resetRageAnimation(mainText, 'stompGasCenter 0.1s ease-out forwards');
    if (navigator.vibrate) navigator.vibrate([200, 50, 200]);
  }, RAGE_CONFIG.c5_gas5);

  // =========================================================
  // CUT 6: EUROBEAT DROP (RAGECAGE ESKALATION)
  // =========================================================
  setTimeout(() => {
    root.classList.add('cam-speed-shake');
    
    // Rotes Stroboskop
    const strobe = document.createElement('div');
    strobe.className = 'rage-strobe';
    document.body.appendChild(strobe);
    rageElements.push(strobe);

    // Chaos Engine starten
    rageInterval1 = setInterval(spawnPingPongBalls, 200); // Sehr viele Ping Pong Bälle
    rageInterval2 = setInterval(spawnRedCups, 400); // Rote Becher

    if (navigator.vibrate) navigator.vibrate([600, 100, 600, 100, 600, 100, 1000]);
    appendLine(`<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🏎️ [EUROBEAT] RAGECAGE LÄUFT! WEITER WEITER WEITER!</span>`);

    // Dynamischer Text-Wechsel während des Drops (Panik-Befehle!)
    const panicWords = ["WEITER!", "TRINK!", "RECHTS!", "LINKS!", "STAPELN!", "BALL WEITER!", "HOPP HOPP!"];
    wordInterval = setInterval(() => {
      mainText.style.color = Math.random() > 0.5 ? "#ffffff" : "#fbbf24";
      mainText.innerHTML = panicWords[Math.floor(Math.random() * panicWords.length)];
      resetRageAnimation(mainText, 'textFlicker 0.2s forwards');
    }, 450); // Alle 450ms ein neuer Befehl

    // Fade Out
    setTimeout(() => {
      fadeOutAudioRage(audioElem, RAGE_CONFIG.fadeTime);
    }, (RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop) - RAGE_CONFIG.fadeTime);

    // Reset
    setTimeout(() => {
      root.classList.remove('cam-speed-shake');
      clearInterval(rageInterval1);
      clearInterval(rageInterval2);
      clearInterval(wordInterval);
      
      rageElements.forEach(el => el.remove());
      rageElements = [];
      isSudoRunning = false;
      
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
      appendLine("<span class='text-emerald-400 font-bold'>[STATUS] Becher leer. Ragecage beendet.</span>");
    }, RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop);

  }, RAGE_CONFIG.c6_drop);
}