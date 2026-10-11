/* =====================================================================
   🥃 SUDO MODUS: SCHÜTTELKORN (AHOIBRAUSE-ZUCKERSCHOCK)
   ===================================================================== */
const KORN_CONFIG = {
  // Timings an den genialen Song anpassen (in ms)
  c1_traurig1: 100,      // "Immer wenn ich traurig bin..."
  c2_korn1: 2500,        // "...trink ich einen Korn."
  
  c3_traurig2: 4500,     // "Wenn ich dann noch traurig bin..."
  c4_brause_alert: 5500, // (Brause-Tütchen reißt auf!)
  c5_korn2: 7500,        // "...trink ich noch'n Korn." (Zischen beginnt)
  
  c6_traurig3: 8500,     // "Wenn ich dann noch traurig bin..."
  c7_schuetteln: 11000,   // SCHÜTTELN!
  c8_korn3: 12500,       // "...trink ich noch'n Korn." (Voller Schaum)
  
  c9_undwenn: 13500,     // "Und wenn ich dann noch..."
  c10_traurig4: 13500,   // "...traurig bin..."
  c11_vorn: 15000,       // "...fang ich an von vorn!"
  
  c_drop: 16500,         // ABSOLUTER BRAUSE-RAVE!
  
  duration: 18000,      
  fadeTime: 2500        
};

function injectKornStyles() {
  if (document.getElementById('kornStyles')) return;
  const style = document.createElement('style');
  style.id = 'kornStyles';
  style.innerHTML = `
    /* Depressiver Blau-Filter für den Anfang */
    .korn-sad-mode {
      filter: grayscale(0.8) sepia(0.5) hue-rotate(180deg) brightness(0.7);
      transition: filter 2s ease-out;
    }
    
    /* Neon Ahoibrause Farben (Himbeer / Waldmeister) */
    .brause-mode {
      filter: saturate(3) hue-rotate(290deg) contrast(1.5) !important;
      transition: filter 0.2s;
    }
    .brause-mode-green {
      filter: saturate(3) hue-rotate(90deg) contrast(1.5) !important;
    }

    /* Trauriger Regen */
    @keyframes sadRain { 0% { transform: translate3d(0, -20vh, 0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate3d(0, 120vh, 0); opacity: 0; } }
    .korn-tear {
      position: fixed; z-index: 9990; font-size: 2rem; pointer-events: none;
      animation: sadRain 1s linear infinite; opacity: 0.5; will-change: transform;
    }

    /* Das Schäumen im Mund (Hunderte kleine Bläschen steigen rasant auf) */
    @keyframes brauseFizz { 
      0% { transform: translate3d(0, 110vh, 0) scale(0.5) rotate(0deg); opacity: 1; } 
      100% { transform: translate3d(0, -10vh, 0) scale(1.5) rotate(360deg); opacity: 0; } 
    }
    .brause-bubble {
      position: fixed; z-index: 9996; pointer-events: none;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.4));
      border-radius: 50%; border: 1px solid rgba(255,255,255,0.8);
      animation: brauseFizz linear forwards; will-change: transform;
    }

    /* Kinetische Typografie (Hardware beschleunigt) */
    .korn-text {
      position: fixed; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0);
      width: 100vw; text-align: center; font-size: clamp(4rem, 15vw, 12rem);
      font-weight: 900; color: #ffffff;
      text-shadow: 4px 4px 0px #1e3a8a, 0 0 30px #3b82f6;
      z-index: 9999; pointer-events: none; font-family: 'Impact', sans-serif; text-transform: uppercase;
      line-height: 0.9; contain: layout paint style; will-change: transform, color, text-shadow;
    }
    
    .text-brause { color: #f472b6; text-shadow: 6px 6px 0px #be185d, 0 0 50px #db2777; }
    .text-korn { color: #fcd34d; text-shadow: 6px 6px 0px #b45309, 0 0 40px #d97706; }
    
    /* Zischendes Text-Beben */
    .fizz-shake { animation: fizzing 0.05s infinite; }
    @keyframes fizzing { 
      0% { transform: translate3d(-51%, -51%, 0) rotate(-1deg); } 
      100% { transform: translate3d(-49%, -49%, 0) rotate(1deg); } 
    }

    /* Text Animationen */
    @keyframes dropInSad { 0% { transform: translate3d(-50%, -150%, 0); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0); opacity: 1; } }
    @keyframes smashKorn { 0% { transform: translate3d(-50%, -50%, 0) scale(4) rotate(15deg); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) scale(1) rotate(0); opacity: 1; } }
    @keyframes spinVorn { 0% { transform: translate3d(-50%, -50%, 0) rotate(180deg) scale(0); } 100% { transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(1.5); } }
    
    /* Fallende Ahoibrause und Korn-Shots */
    @keyframes dropItem { 0% { transform: translate3d(0, -120vh, 0) rotate(25deg); } 100% { transform: translate3d(0, 120vh, 0) rotate(-25deg); } }
    .schuettel-item {
      position: fixed; z-index: 9995; font-size: clamp(4rem, 10vw, 8rem); pointer-events: none;
      animation: dropItem 1s linear forwards; will-change: transform;
    }
  `;
  document.head.appendChild(style);
}

function fadeOutAudioKorn(audio, fadeDuration) {
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

function playKornSynthFallback() {
  setTimeout(() => { playTone(300, 'sine', 0.5, 0.2); }, KORN_CONFIG.c1_traurig1);
  setTimeout(() => { playTone(800, 'sawtooth', 0.2, 0.4); }, KORN_CONFIG.c2_korn1);
  setTimeout(() => { playTone(900, 'square', 0.1, 0.4); }, KORN_CONFIG.c4_brause_alert);
}

function resetKornAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight; 
  element.style.animation = animationName;
}

function spawnSadRain() {
  for (let i = 0; i < 15; i++) {
    const tear = document.createElement('div');
    tear.className = 'korn-tear';
    tear.textContent = '💧';
    tear.style.left = `${Math.random() * 100}vw`;
    tear.style.animationDuration = `${0.5 + Math.random()}s`;
    tear.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(tear);
    kornElements.push(tear);
  }
}

// Erzeugt das Brause-Zischen im Mund
function spawnFizz(amount, speedMultiplier = 1) {
  for (let i = 0; i < amount; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'brause-bubble';
    
    const size = 10 + Math.random() * 40;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    // Streuung über den ganzen Bildschirm
    bubble.style.left = `${Math.random() * 100}vw`;
    
    const dur = (0.5 + Math.random() * 0.8) * speedMultiplier;
    bubble.style.animationDuration = `${dur}s`;
    
    document.body.appendChild(bubble);
    kornElements.push(bubble);
    setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, dur * 1000);
  }
}

function spawnSchuettelItems(emojis, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const item = document.createElement('div');
      item.className = 'schuettel-item';
      item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      item.style.left = `${5 + Math.random() * 90}vw`;
      item.style.animationDuration = `${0.6 + Math.random() * 0.6}s`;
      document.body.appendChild(item);
      kornElements.push(item);
      setTimeout(() => { if (item.parentNode) item.remove(); }, 1600);
    }, i * 50); 
  }
}

let kornElements = [];
let fizzInterval = null;

function triggerSchuettelkorn() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  injectKornStyles();
  kornElements.forEach(el => el.remove());
  kornElements = []; 

  const root = document.getElementById('bodyRoot');
  const audioElem = document.getElementById('audioKorn'); // MP3 muss audioKorn heißen!

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playKornSynthFallback());
  } else {
    playKornSynthFallback();
  }

  appendLine(`<span class='text-blue-400 font-bold'>[THERAPIE] Melancholie erkannt. Verabreiche Gegenmittel...</span>`);

  // Start in Traurigkeit
  root.classList.add('korn-sad-mode');

  const mainText = document.createElement('div');
  mainText.className = 'korn-text';
  document.body.appendChild(mainText);
  kornElements.push(mainText);

  // =========================================================
  // CUT 1: "Immer wenn ich traurig bin..."
  // =========================================================
  setTimeout(() => {
    mainText.innerHTML = "TRAURIG...";
    resetKornAnimation(mainText, 'dropInSad 1s ease-out forwards');
    spawnSadRain();
  }, KORN_CONFIG.c1_traurig1);

  // =========================================================
  // CUT 2: "...trink ich einen Korn." (Die Heilung beginnt)
  // =========================================================
  setTimeout(() => {
    root.classList.remove('korn-sad-mode'); // Farbe kehrt zurück!
    mainText.className = 'korn-text text-korn';
    mainText.innerHTML = "1. KORN!";
    resetKornAnimation(mainText, 'smashKorn 0.3s ease-out forwards');
    
    spawnSchuettelItems(['🥃', '🌾'], 8);
    if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
  }, KORN_CONFIG.c2_korn1);

  // =========================================================
  // CUT 3: "Wenn ich dann noch traurig bin..."
  // =========================================================
  setTimeout(() => {
    mainText.className = 'korn-text';
    mainText.innerHTML = "NOCH<br>TRAURIG?!";
    resetKornAnimation(mainText, 'dropInSad 0.5s ease-out forwards');
  }, KORN_CONFIG.c3_traurig2);

  // =========================================================
  // CUT 4: BRAUSE ALERT (Ahoibrause Tütchen fliegt ein!)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'korn-text text-brause';
    mainText.innerHTML = "AHOI<br>BRAUSE!";
    resetKornAnimation(mainText, 'smashKorn 0.2s forwards');
    
    root.classList.add('brause-mode'); // Screen wird Neon Pink!
    spawnSchuettelItems(['🍓', '🍋', '🍬', '💥'], 10);
  }, KORN_CONFIG.c4_brause_alert);

  // =========================================================
  // CUT 5: "...trink ich noch'n Korn." (Das Zischen beginnt)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'korn-text text-korn';
    mainText.innerHTML = "2. KORN!";
    resetKornAnimation(mainText, 'smashKorn 0.2s forwards');
    
    // Das Zischen fängt an!
    fizzInterval = setInterval(() => spawnFizz(15), 200);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); // Leichtes Schäumen
  }, KORN_CONFIG.c5_korn2);

  // =========================================================
  // CUT 6: "Wenn ich dann noch traurig bin..." (Verwirrung)
  // =========================================================
  setTimeout(() => {
    root.classList.remove('brause-mode');
    root.classList.add('brause-mode-green'); // Waldmeister!
    mainText.className = 'korn-text fizz-shake'; // Text zittert
    mainText.style.color = "#ffffff";
    mainText.innerHTML = "IMMER NOCH<br>TRAURIG?!";
  }, KORN_CONFIG.c6_traurig3);

  // =========================================================
  // CUT 7: SCHÜTTELN! (Aggressives Mischen)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'korn-text text-brause fizz-shake';
    mainText.innerHTML = "SCHÜTTELN!";
    mainText.style.transform = "translate3d(-50%, -50%, 0) scale(1.5)";
    
    // Handy vibriert jetzt durchgehend (Schütteln im Mund)
    if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 50, 50, 50, 50]);
    spawnFizz(50, 0.5); // Extremer Schaum
    appendLine(`<span class='text-pink-500 font-extrabold'>[WARNUNG] DRUCK IM MUNDRAUM STEIGT KRITISCH!</span>`);
  }, KORN_CONFIG.c7_schuetteln);

  // =========================================================
  // CUT 8: "...trink ich noch'n Korn." (Kurz vorm Platzen)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'korn-text text-korn fizz-shake';
    mainText.innerHTML = "3. KORN!";
    spawnSchuettelItems(['🥃', '💥', '💦'], 20);
  }, KORN_CONFIG.c8_korn3);

  // =========================================================
  // CUT 9-11: UND WENN ICH DANN NOCH... FANG ICH AN VON VORN!
  // =========================================================
  setTimeout(() => {
    root.classList.remove('brause-mode-green');
    mainText.className = 'korn-text'; mainText.innerHTML = "UND DANN...";
  }, KORN_CONFIG.c9_undwenn);

  setTimeout(() => {
    mainText.innerHTML = "VON VORN!";
    resetKornAnimation(mainText, 'spinVorn 0.5s ease-in forwards');
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  }, KORN_CONFIG.c11_vorn);

  // =========================================================
  // CUT 12: DER ZUCKERSCHOCK DROP (RAVE)
  // =========================================================
  setTimeout(() => {
    mainText.style.display = 'none'; 
    
    // Extreme Kamera-Shakes
    root.classList.add('fx-earthquake');
    
    // Strobo-Farben (Pink, Grün, Gelb)
    const disco = document.getElementById('discoOverlay');
    let tick = 0;
    const partyTimer = setInterval(() => {
      const colors = ['bg-pink-500', 'bg-green-400', 'bg-yellow-400', 'bg-transparent'];
      disco.className = `fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 opacity-70 ${colors[tick % colors.length]}`;
      
      // Permanentes Schäumen und fliegende Korn-Shots
      if (tick % 2 === 0) spawnFizz(30, 0.4);
      if (tick % 5 === 0) spawnSchuettelItems(['🥃', '🍬', '💥', '💦', '😵‍💫'], 5);
      
      tick++;
    }, 80);

    if (navigator.vibrate) navigator.vibrate([600, 100, 600, 100, 600, 100, 1000]);
    appendLine(`<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🍬 [ZUCKERSCHOCK] SCHÜTTELKORN-OVERDRIVE ERREICHT!</span>`);

    // Fade Out
    setTimeout(() => {
      fadeOutAudioKorn(audioElem, KORN_CONFIG.fadeTime);
    }, (KORN_CONFIG.duration - KORN_CONFIG.c_drop) - KORN_CONFIG.fadeTime);

    // Sauberer Reset
    setTimeout(() => {
      root.classList.remove('fx-earthquake', 'korn-sad-mode', 'brause-mode', 'brause-mode-green');
      clearInterval(partyTimer);
      clearInterval(fizzInterval);
      disco.className = "fixed inset-0 pointer-events-none z-40 opacity-0";
      
      kornElements.forEach(el => el.remove());
      kornElements = [];
      isSudoRunning = false;
      
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
      appendLine("<span class='text-emerald-400 font-bold'>[THERAPIE] Patient erfolgreich eskaliert.</span>");
    }, KORN_CONFIG.duration - KORN_CONFIG.c_drop);

  }, KORN_CONFIG.c_drop);
}