/* =====================================================================
   🔥 SUDO MODUS: RAMMSTEIN (PYRO-PROTOKOLL / SYSTEMÜBERHITZUNG)
   ===================================================================== */
const RAMM_CONFIG = {
  // Timings für die brachialen Einschläge (in ms)
  intro: 100,           // "Sie wird heut Nacht nicht untergehen..."
  eins: 6000,           // "EINS"
  sonne1: 7000,         // "Hier kommt die Sonne"
  zwei: 12500,           // "ZWEI"
  sonne2: 13500,        // "Hier kommt die Sonne"
  drei: 18600,          // "DREI"
  stern: 19700,         // "Sie ist der hellste Stern..."
  vier: 25000,          // "VIER"
  sonne3: 26000,        // "Hier kommt die Sonne"
  
  duration: 30000,      // Gesamte Laufzeit
  fadeTime: 3000        // Fade-Out Dauer
};

// Injiziert die brutalen Industrie- und Feuer-Styles
function injectRammsteinStyles() {
  if (document.getElementById('rammStyles')) return;
  const style = document.createElement('style');
  style.id = 'rammStyles';
  style.innerHTML = `
    /* Pechschwarzer Industrie-Hintergrund mit leichter Rot-Glut */
    .ramm-darkness {
      position: fixed; inset: 0; z-index: 35; pointer-events: none; opacity: 0;
      background: radial-gradient(circle at center, #2a0808 0%, #000000 70%);
      transition: opacity 2s ease-in;
    }

    /* Brachialer Text (Zahlen) */
    .ramm-text {
      position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%);
      width: 100vw; text-align: center; 
      font-size: clamp(6rem, 25vw, 15rem); /* RIESIG */
      font-weight: 900; color: #ff3300;
      text-shadow: 0 0 40px #ff0000, 0 0 10px #ffffff;
      z-index: 9999; pointer-events: none; 
      font-family: 'Arial Black', Impact, sans-serif; text-transform: uppercase;
      line-height: 1;
    }

    /* Einschlag-Animation für die Zahlen */
    @keyframes rammStomp { 
      0% { transform: translate(-50%, -50%) scale(4); opacity: 0; filter: blur(20px); } 
      10% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; filter: blur(0px); } 
      15% { transform: translate(-50%, -50%) scale(1.1); } 
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; } 
    }
    
    /* Sonnengesang-Text */
    .ramm-sonne-text {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 90vw; text-align: center; 
      font-size: clamp(2rem, 8vw, 5rem);
      font-weight: 900; color: #ffcc00;
      text-shadow: 0 0 30px #ff6600, 0 0 60px #ff0000;
      z-index: 9999; pointer-events: none; 
      font-family: 'Arial Black', Impact, sans-serif; text-transform: uppercase;
      animation: sonneRise 1.5s ease-out forwards;
    }
    @keyframes sonneRise { 
      0% { transform: translate(-50%, -40%); opacity: 0; letter-spacing: -5px; } 
      100% { transform: translate(-50%, -50%); opacity: 1; letter-spacing: 5px; } 
    }

    /* Brutales Erdbeben */
    .ramm-quake { animation: rammHeavyShake 0.1s infinite; transform-origin: center; }
    @keyframes rammHeavyShake { 
      0%, 100% { transform: translate(0, 0) rotate(0deg); } 
      25% { transform: translate(-10px, 8px) rotate(-1deg); } 
      50% { transform: translate(10px, -8px) rotate(1deg); } 
      75% { transform: translate(-8px, -6px) rotate(0deg); } 
    }

    /* Flammenwerfer von unten */
    .ramm-flamethrower {
      position: fixed; bottom: 0; left: 0; width: 100%; height: 60vh;
      background: linear-gradient(to top, #ff0000 0%, #ff8800 40%, transparent 100%);
      z-index: 9995; pointer-events: none;
      mix-blend-mode: screen;
      transform-origin: bottom;
      animation: fireBlast 1s ease-out forwards;
    }
    @keyframes fireBlast { 
      0% { transform: scaleY(0); opacity: 0; } 
      10% { transform: scaleY(1.2); opacity: 1; } 
      100% { transform: scaleY(0.8); opacity: 0; } 
    }

    /* Die brennende Sonne im Hintergrund */
    .ramm-sun-orb {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 50vh; height: 50vh; border-radius: 50%;
      background: radial-gradient(circle, #ffffff 0%, #ffcc00 20%, #ff3300 60%, transparent 80%);
      z-index: 9990; pointer-events: none; mix-blend-mode: screen;
      animation: sunPulse 2s infinite alternate;
    }
    @keyframes sunPulse { 
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; filter: blur(20px); } 
      100% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; filter: blur(40px); } 
    }

    /* Aufsteigende Asche / Glut (Embers) */
    .ramm-ember {
      position: fixed; bottom: -10px; width: 4px; height: 4px;
      background-color: #ff6600; border-radius: 50%;
      box-shadow: 0 0 10px #ff0000, 0 0 20px #ff9900;
      z-index: 9998; pointer-events: none;
      animation: emberFloat linear forwards;
    }
    @keyframes emberFloat { 
      0% { transform: translateY(0) scale(1); opacity: 1; } 
      100% { transform: translateY(-120vh) scale(0); opacity: 0; } 
    }
  `;
  document.head.appendChild(style);
}

function fadeOutAudioRamm(audio, fadeDuration) {
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

function playRammSynthFallback() {
  // Dunkler, tiefer Industrial-Synthesizer Fallback
  setTimeout(() => { playTone(110, 'sawtooth', 1.0, 0.3); }, RAMM_CONFIG.eins);
  setTimeout(() => { playTone(110, 'sawtooth', 1.0, 0.3); }, RAMM_CONFIG.zwei);
  setTimeout(() => { playTone(110, 'sawtooth', 1.0, 0.3); }, RAMM_CONFIG.drei);
  setTimeout(() => { playTone(110, 'sawtooth', 1.0, 0.3); }, RAMM_CONFIG.vier);
}

function resetRammAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight; 
  element.style.animation = animationName;
}

// Spawnt aufsteigende Asche/Glut-Partikel
function spawnEmbers() {
  const count = 40;
  for (let i = 0; i < count; i++) {
    const ember = document.createElement('div');
    ember.className = 'ramm-ember';
    ember.style.left = `${Math.random() * 100}vw`;
    
    // Zufällige Größe und Geschwindigkeit
    const size = 2 + Math.random() * 6;
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;
    
    const dur = 1.5 + Math.random() * 3;
    ember.style.animationDuration = `${dur}s`;
    ember.style.animationDelay = `${Math.random() * 0.5}s`;
    
    document.body.appendChild(ember);
    rammElements.push(ember);
    
    setTimeout(() => { if (ember.parentNode) ember.remove(); }, (dur + 0.5) * 1000);
  }
}

// Zündet die riesigen Flammenwerfer am unteren Bildschirmrand
function firePyrotechnics() {
  const pyro = document.createElement('div');
  pyro.className = 'ramm-flamethrower';
  document.body.appendChild(pyro);
  rammElements.push(pyro);
  setTimeout(() => { if (pyro.parentNode) pyro.remove(); }, 1200);
}

let rammElements = [];
let emberInterval = null;

function triggerRammstein() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  injectRammsteinStyles();
  rammElements.forEach(el => el.remove());
  rammElements = []; 

  const root = document.getElementById('bodyRoot');
  // WICHTIG: Die MP3 muss als <audio id="audioRammstein" src="sonne.mp3"></audio> in der index.html liegen!
  const audioElem = document.getElementById('audioRammstein');

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playRammSynthFallback());
  } else {
    playRammSynthFallback();
  }

  appendLine(`<span class='text-red-500 font-extrabold'>[SUDO] PYRO-PROTOKOLL INITIIERT. ZÄHLVORGANG GESTARTET!</span>`);

  // 1. INTRO: Dunkelheit und stetiger Ascheregen
  const darknessBg = document.createElement('div');
  darknessBg.className = 'ramm-darkness';
  document.body.appendChild(darknessBg);
  rammElements.push(darknessBg);

  // Glut-Regen (Embers) kontinuierlich feuern
  emberInterval = setInterval(spawnEmbers, 600);

  setTimeout(() => {
    darknessBg.style.opacity = "1";
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, RAMM_CONFIG.intro);

  const mainText = document.createElement('div');
  mainText.className = 'ramm-text';
  document.body.appendChild(mainText);
  rammElements.push(mainText);

  // Hintergrund-Sonne (erst unsichtbar)
  const sunOrb = document.createElement('div');
  sunOrb.className = 'ramm-sun-orb';
  sunOrb.style.display = 'none';
  document.body.appendChild(sunOrb);
  rammElements.push(sunOrb);

  // =========================================================
  // EINS!
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'none';
    firePyrotechnics();
    spawnEmbers();
    
    mainText.style.color = "#ff3300";
    mainText.className = 'ramm-text';
    mainText.innerHTML = "EINS";
    resetRammAnimation(mainText, 'rammStomp 1.2s forwards');
    
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 600);
    if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
  }, RAMM_CONFIG.eins);

  // =========================================================
  // HIER KOMMT DIE SONNE (1)
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'block'; // Sonne taucht auf
    
    mainText.className = 'ramm-sonne-text';
    mainText.innerHTML = "HIER KOMMT DIE<br>SONNE";
    resetRammAnimation(mainText, 'sonneRise 2s forwards');
    
    appendLine(`<span class='text-orange-500 font-bold'>[WARNUNG] KRITISCHE TEMPERATUR IM PARTYRAUM!</span>`);
  }, RAMM_CONFIG.sonne1);

  // =========================================================
  // ZWEI!
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'none';
    firePyrotechnics();
    
    mainText.className = 'ramm-text';
    mainText.innerHTML = "ZWEI";
    resetRammAnimation(mainText, 'rammStomp 1.2s forwards');
    
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 600);
    if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
  }, RAMM_CONFIG.zwei);

  // =========================================================
  // HIER KOMMT DIE SONNE (2)
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'block';
    
    mainText.className = 'ramm-sonne-text';
    mainText.innerHTML = "HIER KOMMT DIE<br>SONNE";
    resetRammAnimation(mainText, 'sonneRise 2s forwards');
  }, RAMM_CONFIG.sonne2);

  // =========================================================
  // DREI!
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'none';
    firePyrotechnics();
    
    mainText.className = 'ramm-text';
    mainText.innerHTML = "DREI";
    resetRammAnimation(mainText, 'rammStomp 1.2s forwards');
    
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 600);
    if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
  }, RAMM_CONFIG.drei);

  // =========================================================
  // SIE IST DER HELLSTE STERN...
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'block';
    
    mainText.className = 'ramm-sonne-text';
    mainText.innerHTML = "SIE IST DER<br>HELLSTE STERN!";
    resetRammAnimation(mainText, 'sonneRise 2s forwards');
  }, RAMM_CONFIG.stern);

  // =========================================================
  // VIER! (FINALER SCHLAG)
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'none';
    firePyrotechnics();
    firePyrotechnics(); // Doppelter Flammenwerfer!
    spawnEmbers();
    spawnEmbers();
    
    mainText.className = 'ramm-text';
    mainText.innerHTML = "VIER";
    resetRammAnimation(mainText, 'rammStomp 1.2s forwards');
    
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 1000); // Längeres Beben
    if (navigator.vibrate) navigator.vibrate([600, 100, 600, 100, 600]);
    appendLine(`<span class='text-red-500 font-extrabold animate-pulse'>[SYSTEM FEHLER] PYRO-OVERRIDE! SYSTEM BRENNT!</span>`);
  }, RAMM_CONFIG.vier);

  // =========================================================
  // HIER KOMMT DIE SONNE (3)
  // =========================================================
  setTimeout(() => {
    sunOrb.style.display = 'block';
    sunOrb.style.animationDuration = '0.5s'; // Sonne pulsiert extrem schnell
    
    mainText.className = 'ramm-sonne-text';
    mainText.innerHTML = "HIER KOMMT DIE<br>SONNE";
    resetRammAnimation(mainText, 'sonneRise 2s forwards');
    
    // Fade Out anstoßen
    setTimeout(() => {
      fadeOutAudioRamm(audioElem, RAMM_CONFIG.fadeTime);
    }, (RAMM_CONFIG.duration - RAMM_CONFIG.sonne3) - RAMM_CONFIG.fadeTime);

    // Sauberer Reset nach der Duration
    setTimeout(() => {
      root.classList.remove('ramm-quake');
      clearInterval(emberInterval);
      rammElements.forEach(el => el.remove());
      rammElements = [];
      isSudoRunning = false;
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
      appendLine("<span class='text-emerald-400 font-bold'>[STATUS] Löschanlage erfolgreich. Partyraum gesichert.</span>");
    }, RAMM_CONFIG.duration - RAMM_CONFIG.sonne3);

  }, RAMM_CONFIG.sonne3);
}