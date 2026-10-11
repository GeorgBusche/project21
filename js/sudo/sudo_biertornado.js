/* =====================================================================
   🌪️ SUDO MODUS: BIERTORNADO (22-CUT DIRECTOR'S EDIT)
   ===================================================================== */
const TORNADO_CONFIG = {
  // 22 brutale Hard-Cuts! (Passe die Millisekunden auf deine MP3 an)
  c1_sturm: 100,        // "Sturm..."
  c2_ricardo: 600,      // "...tief Ricardo!"
  c3_bier: 1500,        // "Bier..."
  c4_tornado: 2100,     // "...Tornado!"
  
  c5_gib1: 2900,        // "Gib..."
  c6_mal1: 3150,        // "...mal..."
  c7_bier1: 3400,       // "...Bier!"
  
  c8_gib2: 3800,        // "Gib..."
  c9_mal2: 4050,        // "...mal..."
  c10_bier2: 4300,      // "...Bier!"
  
  c11_ladung: 4800,     // "...für die nächste Ladung!"
  
  c12_sternburg: 7000,  // "Sternburg..."
  c13_anzug: 8000,      // "...anzug..."
  c14_meine: 9000,      // "...meine..."
  c15_tarnung: 10000,    // "...Tarnung!"
  
  c16_gib3: 10400,       // "Gib..."
  c17_mal3: 10650,       // "...mal..."
  c18_bier3: 10900,      // "...Bier!"
  
  c19_gib4: 11300,       // "Gib..."
  c20_mal4: 11550,       // "...mal..."
  c21_bier4: 11800,      // "...Bier!"
  
  c22_warnung: 12300,    // "...das' die letzte Warnung!"
  
  c_drop: 12800,        // HARDSTYLE DROP!
  
  duration: 15000,      
  fadeTime: 2500        
};

function injectTornadoStyles() {
  if (document.getElementById('tornadoStyles')) return;
  const style = document.createElement('style');
  style.id = 'tornadoStyles';
  style.innerHTML = `
    .tornado-storm-bg {
      position: fixed; inset: -50vw; z-index: 35; pointer-events: none; opacity: 0;
      background: repeating-linear-gradient(105deg, #0f172a, #0f172a 40px, #020617 40px, #020617 80px);
      transition: opacity 0.5s ease-in; animation: stormPan 0.3s linear infinite;
    }
    @keyframes stormPan { 0% { background-position: 0 0; } 100% { background-position: -80px 80px; } }

    .tornado-lightning {
      position: fixed; inset: 0; background: white; z-index: 99999; pointer-events: none;
      /* Hardware-Beschleunigung für den Blitz */
      transform: translateZ(0);
      animation: lightningStrike 0.3s ease-out forwards;
    }
    @keyframes lightningStrike { 0% { opacity: 1; } 50% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 0; } }

    .flash-yellow { animation: flashColYellow 0.2s forwards; transform: translateZ(0); }
    .flash-red { animation: flashColRed 0.2s forwards; transform: translateZ(0); }
    @keyframes flashColYellow { 0% { background: #facc15; opacity: 0.8; } 100% { background: transparent; opacity: 0; } }
    @keyframes flashColRed { 0% { background: #ef4444; opacity: 0.8; } 100% { background: transparent; opacity: 0; } }

    /* OPTIMIERT: Kinetische Typografie ohne Lag */
    .tornado-text {
      position: fixed; top: 50%; left: 50%; 
      /* translate3d erzwingt das Rendering auf der GPU (Grafikkarte) */
      transform: translate3d(-50%, -50%, 0);
      width: 100vw; text-align: center; font-size: clamp(5rem, 18vw, 14rem);
      font-weight: 900; color: #ffffff;
      /* Schatten leicht optimiert für massive FPS-Steigerung */
      text-shadow: 5px 5px 0px #000, -2px -2px 0px #000, 0 0 20px #eab308;
      z-index: 9999; pointer-events: none; font-family: 'Impact', sans-serif; text-transform: uppercase;
      font-style: italic; line-height: 0.9;
      
      /* WICHTIG: Isoliert das Element. Verhindert, dass die ganze Seite neu lädt, wenn sich ein Wort ändert! */
      contain: layout paint style;
      will-change: transform, opacity, color;
    }
    .text-sternburg-red { color: #dc2626; text-shadow: 5px 5px 0px #000, 0 0 25px #ef4444; }
    .text-glitch { animation: textGlitch 0.1s infinite; color: #06b6d4; }
    @keyframes textGlitch { 
      0% { transform: translate3d(-52%, -50%, 0) skewX(10deg); } 
      50% { transform: translate3d(-48%, -52%, 0) skewX(-15deg); } 
      100% { transform: translate3d(-50%, -48%, 0) skewX(5deg); } 
    }

    /* Alle Animationen nutzen jetzt translate3d für 60 FPS */
    @keyframes smashLeft { 0% { transform: translate3d(-100%, -50%, 0) skewX(30deg); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) skewX(0); opacity: 1; } }
    @keyframes smashRight { 0% { transform: translate3d(100%, -50%, 0) skewX(-30deg); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) skewX(0); opacity: 1; } }
    @keyframes stompCenter { 0% { transform: translate3d(-50%, -50%, 0) scale(4); opacity: 0; } 100% { transform: translate3d(-50%, -50%, 0) scale(1); opacity: 1; } }
    @keyframes stompFast { 0% { transform: translate3d(-50%, -50%, 0) scale(2); } 100% { transform: translate3d(-50%, -50%, 0) scale(1); } }

    @keyframes dropCrate { 0% { transform: translate3d(0, -120vh, 0) rotate(25deg) scale(1.8); } 100% { transform: translate3d(0, 120vh, 0) rotate(-25deg) scale(0.9); } }
    .tornado-crate {
      position: fixed; z-index: 9996; font-size: clamp(6rem, 15vw, 10rem); pointer-events: none;
      animation: dropCrate 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; 
      /* Performance Boost: Box-Shadow statt Filter Drop-Shadow auf Emojis funktioniert manchmal besser, aber wir lassen filter weg für puren Speed */
      text-shadow: 0 10px 10px rgba(0,0,0,0.8);
      will-change: transform;
    }

    .sternburg-camo {
      position: fixed; inset: 0; z-index: 38; pointer-events: none; opacity: 0;
      background-image: linear-gradient(45deg, #dc2626 25%, transparent 25%, transparent 75%, #dc2626 75%, #dc2626), linear-gradient(45deg, #dc2626 25%, transparent 25%, transparent 75%, #dc2626 75%, #dc2626);
      background-size: 60px 60px; background-position: 0 0, 30px 30px; mix-blend-mode: overlay;
      animation: camoActivate 0.1s forwards, camoPulse 0.5s infinite alternate;
      transform: translateZ(0); /* GPU Fix */
    }
    @keyframes camoActivate { to { opacity: 0.65; } }
    @keyframes camoPulse { 0% { filter: hue-rotate(0deg) contrast(1); } 100% { filter: hue-rotate(25deg) contrast(1.5); } }

    .tornado-alert-border {
      position: fixed; inset: 0; z-index: 9998; pointer-events: none;
      box-shadow: inset 0 0 80px #dc2626; border: 20px solid #dc2626;
      animation: alertFlash 0.2s infinite; opacity: 0;
      transform: translateZ(0);
    }
    @keyframes alertFlash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

    .wind-blast-item {
      position: fixed; z-index: 9996; pointer-events: none; font-size: clamp(3rem, 6vw, 5rem);
      left: 120vw;
      animation: windBlast linear forwards; 
      will-change: transform;
    }
    @keyframes windBlast { 0% { transform: translate3d(0, 0, 0) rotate(-15deg); } 100% { transform: translate3d(-170vw, 100vh, 0) rotate(-45deg); } }

    /* DER 3D BIERTORNADO */
    .vortex-wrapper {
      position: fixed; bottom: -10vh; left: 50%; width: 0; height: 110vh; 
      perspective: 1200px; z-index: 9995; pointer-events: none;
      opacity: 0; transition: opacity 0.3s, transform 0.5s ease-out;
      will-change: transform, opacity;
    }
    .vortex-spin {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-style: preserve-3d;
      animation: spinTornado 1.5s linear infinite;
    }
    .vortex-spin.hyper { animation: spinTornado 0.25s linear infinite; } 
    @keyframes spinTornado { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(-360deg); } }

    .vortex-item {
      position: absolute; left: -25px; width: 50px; text-align: center;
      font-size: clamp(2.5rem, 5vw, 4rem); 
      /* WICHTIG: text-shadow ist 100x schneller als filter: drop-shadow() im 3D-Raum! */
      text-shadow: 0 0 15px rgba(250, 204, 21, 0.8);
      will-change: transform;
    }
    
    .cam-zoom-in { transform: perspective(800px) scale(1.15) translate3d(0, 0, 50px); transition: 0.1s; }
    .cam-zoom-out { transform: perspective(800px) scale(0.9) translate3d(0, 0, -50px); transition: 0.1s; }
    .cam-tilt-left { transform: perspective(800px) rotateZ(-6deg) rotateY(-15deg) scale(1.1); transition: 0.1s; }
    .cam-tilt-right { transform: perspective(800px) rotateZ(6deg) rotateY(15deg) scale(1.1); transition: 0.1s; }
  `;
  document.head.appendChild(style);
}

function fadeOutAudioTornado(audio, fadeDuration) {
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

function playTornadoSynthFallback() {
  setTimeout(() => { playTone(800, 'sawtooth', 0.5, 0.2); }, TORNADO_CONFIG.c1_sturm);
  setTimeout(() => { playTone(600, 'sawtooth', 1.0, 0.3); }, TORNADO_CONFIG.c4_tornado);
  setTimeout(() => { playTone(900, 'square', 0.5, 0.2); }, TORNADO_CONFIG.c12_sternburg);
}

function resetTornadoAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight; 
  element.style.animation = animationName;
}

function screenFlash(colorClass) {
  const flash = document.createElement('div');
  flash.className = `fixed inset-0 z-50 pointer-events-none ${colorClass}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 250);
}

function spawnChaoticWind() {
  const emojis = ['🍺', '🍻', '🌧️', '💨', '🌪️', '🧊', '⭐'];
  for (let i = 0; i < 30; i++) {
    const item = document.createElement('div');
    item.className = 'wind-blast-item';
    item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    item.style.top = `${-40 + Math.random() * 100}vh`;
    const dur = 0.25 + Math.random() * 0.4; 
    item.style.animationDuration = `${dur}s`; 
    item.style.animationDelay = `${Math.random() * 0.8}s`;
    
    document.body.appendChild(item);
    tornadoElements.push(item);
    setTimeout(() => { if (item.parentNode) item.remove(); }, (dur + 1) * 1000);
  }
}

function spawnCrateDrop() {
  const crates = ['📦', '🍺', '🍻'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const item = document.createElement('div');
      item.className = 'tornado-crate';
      item.textContent = crates[Math.floor(Math.random() * crates.length)];
      item.style.left = `${5 + Math.random() * 90}vw`;
      document.body.appendChild(item);
      tornadoElements.push(item);
      setTimeout(() => { if (item.parentNode) item.remove(); }, 1200);
    }, i * 60); 
  }
}

function create3DTornado() {
  const wrapper = document.createElement('div');
  wrapper.className = 'vortex-wrapper';
  wrapper.id = 'activeTornado';

  const spin = document.createElement('div');
  spin.className = 'vortex-spin';
  spin.id = 'activeTornadoSpin';
  wrapper.appendChild(spin);

  const items = ['🍺', '🍻', '⭐', '🔴', '🌪️', '📦']; 
  
  for(let i=0; i<150; i++) {
    const item = document.createElement('div');
    item.className = 'vortex-item';
    item.textContent = items[Math.floor(Math.random() * items.length)];
    
    const yPercent = Math.random() * 100;
    const radius = 25 + Math.pow((100 - yPercent) / 10, 2.5); 
    const angle = Math.random() * 360;

    item.style.top = `${yPercent}%`;
    item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px) rotateX(${Math.random()*45}deg)`;
    
    spin.appendChild(item);
  }

  document.body.appendChild(wrapper);
  tornadoElements.push(wrapper);
}

function triggerLightning() {
  const flash = document.createElement('div');
  flash.className = 'tornado-lightning';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}

let tornadoElements = [];
let windInterval = null;

function triggerBiertornado() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  injectTornadoStyles();
  tornadoElements.forEach(el => el.remove());
  tornadoElements = []; 

  const root = document.getElementById('bodyRoot');
  const audioElem = document.getElementById('audioTornado');

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playTornadoSynthFallback());
  } else {
    playTornadoSynthFallback();
  }

  appendLine(`<span class='text-yellow-400 font-extrabold'>[WETTERDIENST] STURMTIEF RICARDO NÄHERT SICH!</span>`);

  const stormBg = document.createElement('div');
  stormBg.className = 'tornado-storm-bg';
  document.body.appendChild(stormBg);
  tornadoElements.push(stormBg);

  const mainText = document.createElement('div');
  mainText.className = 'tornado-text';
  document.body.appendChild(mainText);
  tornadoElements.push(mainText);

  create3DTornado();

  const resetCam = () => { root.className = 'h-full flex flex-col justify-between p-2 sm:p-4 select-none relative crt-overlay'; };

  // =========================================================
  // CUT 1-4: INTRO
  // =========================================================
  setTimeout(() => {
    stormBg.style.opacity = "1";
    mainText.innerHTML = "STURM-";
    resetTornadoAnimation(mainText, 'smashRight 0.2s ease-out forwards');
  }, TORNADO_CONFIG.c1_sturm);

  setTimeout(() => {
    mainText.style.color = "#facc15";
    mainText.innerHTML = "-TIEF RICARDO";
    resetTornadoAnimation(mainText, 'smashLeft 0.2s ease-out forwards');
    screenFlash('flash-yellow');
  }, TORNADO_CONFIG.c2_ricardo);

  setTimeout(() => {
    mainText.style.color = "#ffffff";
    mainText.innerHTML = "BIER-";
    resetTornadoAnimation(mainText, 'stompCenter 0.2s ease-out forwards');
  }, TORNADO_CONFIG.c3_bier);

  setTimeout(() => {
    triggerLightning();
    mainText.className = 'tornado-text text-sternburg-red text-huge';
    mainText.innerHTML = "TORNADO!";
    resetTornadoAnimation(mainText, 'stompCenter 0.2s ease-out forwards');
    
    const tornadoWrapper = document.getElementById('activeTornado');
    if (tornadoWrapper) tornadoWrapper.style.opacity = "1";

    windInterval = setInterval(spawnChaoticWind, 400);
    spawnChaoticWind();
    if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
  }, TORNADO_CONFIG.c4_tornado);

  // =========================================================
  // CUT 5-7: GIB MAL BIER (1)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'tornado-text'; mainText.innerHTML = "GIB";
    root.classList.add('cam-zoom-in'); resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c5_gib1);

  setTimeout(() => {
    mainText.innerHTML = "MAL";
    root.classList.remove('cam-zoom-in'); root.classList.add('cam-zoom-out');
    resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c6_mal1);

  setTimeout(() => {
    mainText.innerHTML = "BIER!";
    resetCam(); root.classList.add('cam-tilt-left'); screenFlash('flash-yellow');
    resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
  }, TORNADO_CONFIG.c7_bier1);

  // =========================================================
  // CUT 8-10: GIB MAL BIER (2)
  // =========================================================
  setTimeout(() => {
    resetCam(); mainText.innerHTML = "GIB";
    root.classList.add('cam-zoom-in'); resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c8_gib2);

  setTimeout(() => {
    mainText.innerHTML = "MAL";
    root.classList.remove('cam-zoom-in'); root.classList.add('cam-zoom-out');
    resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c9_mal2);

  setTimeout(() => {
    mainText.innerHTML = "BIER!";
    resetCam(); root.classList.add('cam-tilt-right'); screenFlash('flash-red');
    resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
  }, TORNADO_CONFIG.c10_bier2);

  // =========================================================
  // CUT 11: NÄCHSTE LADUNG
  // =========================================================
  setTimeout(() => {
    resetCam();
    mainText.style.color = "#facc15"; mainText.innerHTML = "NÄCHSTE<br>LADUNG!";
    resetTornadoAnimation(mainText, 'stompCenter 0.2s forwards');
    spawnCrateDrop();
  }, TORNADO_CONFIG.c11_ladung);

  // =========================================================
  // CUT 12-15: STERNBURGANZUG MEINE TARNUNG
  // =========================================================
  setTimeout(() => {
    mainText.className = 'tornado-text text-sternburg-red'; mainText.innerHTML = "STERNBURG";
    resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
    
    const camo = document.createElement('div');
    camo.className = 'sternburg-camo'; camo.id = 'activeCamo';
    document.body.appendChild(camo); tornadoElements.push(camo);
  }, TORNADO_CONFIG.c12_sternburg);

  setTimeout(() => {
    mainText.innerHTML = "-ANZUG!";
    resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
  }, TORNADO_CONFIG.c13_anzug);

  setTimeout(() => {
    mainText.className = 'tornado-text'; mainText.innerHTML = "MEINE";
    const camo = document.getElementById('activeCamo');
    if (camo) camo.style.filter = "invert(1)";
    resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c14_meine);

  setTimeout(() => {
    mainText.className = 'tornado-text text-glitch text-huge'; mainText.innerHTML = "TARNUNG!";
    const camo = document.getElementById('activeCamo');
    if (camo) camo.style.filter = "none";
  }, TORNADO_CONFIG.c15_tarnung);

  // =========================================================
  // CUT 16-18: GIB MAL BIER (3)
  // =========================================================
  setTimeout(() => {
    mainText.className = 'tornado-text'; mainText.innerHTML = "GIB";
    root.classList.add('cam-zoom-in'); resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c16_gib3);

  setTimeout(() => {
    mainText.innerHTML = "MAL";
    root.classList.remove('cam-zoom-in'); root.classList.add('cam-zoom-out');
    resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c17_mal3);

  setTimeout(() => {
    mainText.innerHTML = "BIER!";
    resetCam(); root.classList.add('cam-tilt-left'); screenFlash('flash-yellow');
    resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
  }, TORNADO_CONFIG.c18_bier3);

  // =========================================================
  // CUT 19-21: GIB MAL BIER (4)
  // =========================================================
  setTimeout(() => {
    resetCam(); mainText.innerHTML = "GIB";
    root.classList.add('cam-zoom-in'); resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c19_gib4);

  setTimeout(() => {
    mainText.innerHTML = "MAL";
    root.classList.remove('cam-zoom-in'); root.classList.add('cam-zoom-out');
    resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
  }, TORNADO_CONFIG.c20_mal4);

  setTimeout(() => {
    mainText.innerHTML = "BIER!";
    resetCam(); root.classList.add('cam-tilt-right'); screenFlash('flash-red');
    resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
  }, TORNADO_CONFIG.c21_bier4);

  // =========================================================
  // CUT 22: LETZTE WARNUNG (ALARM)
  // =========================================================
  setTimeout(() => {
    resetCam();
    mainText.className = 'tornado-text text-huge'; mainText.style.color = "#ffffff";
    mainText.innerHTML = "LETZTE<br>WARNUNG!";
    resetTornadoAnimation(mainText, 'stompCenter 0.2s forwards');
    
    const alertBorder = document.createElement('div');
    alertBorder.className = 'tornado-alert-border';
    document.body.appendChild(alertBorder);
    tornadoElements.push(alertBorder);

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200, 100]);
  }, TORNADO_CONFIG.c22_warnung);

  // =========================================================
  // HARDSTYLE DROP
  // =========================================================
  setTimeout(() => {
    mainText.style.display = 'none'; 
    triggerLightning();
    
    const spin = document.getElementById('activeTornadoSpin');
    if (spin) spin.classList.add('hyper');

    const disco = document.getElementById('discoOverlay');
    let tick = 0;
    const partyTimer = setInterval(() => {
      const colors = ['bg-white', 'bg-red-600', 'bg-transparent', 'bg-yellow-400'];
      disco.className = `fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 opacity-80 ${colors[tick % colors.length]}`;
      
      // Extreme Hardstyle Cam-Shakes
      if (tick % 2 === 0) {
        root.style.transform = `translate(${(Math.random()-0.5)*30}px, ${(Math.random()-0.5)*30}px) scale(1.05)`;
      }
      tick++;
    }, 80);

    if (navigator.vibrate) navigator.vibrate([600, 100, 600, 100, 600, 100, 1000]);
    appendLine(`<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🌪️ [ESKALATION] TORNADO KATEGORIE 5. RETTE SICH WER KANN!</span>`);

    // Fade Out
    setTimeout(() => {
      fadeOutAudioTornado(audioElem, TORNADO_CONFIG.fadeTime);
    }, (TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop) - TORNADO_CONFIG.fadeTime);

    // Reset
    setTimeout(() => {
      root.style.transform = 'none';
      resetCam();
      clearInterval(partyTimer);
      clearInterval(windInterval);
      disco.className = "fixed inset-0 pointer-events-none z-40 opacity-0";
      
      tornadoElements.forEach(el => el.remove());
      tornadoElements = [];
      isSudoRunning = false;
      
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
      appendLine("<span class='text-emerald-400 font-bold'>[WETTERBERICHT] Sturm zieht ab. System gesichert.</span>");
    }, TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop);

  }, TORNADO_CONFIG.c_drop);
}