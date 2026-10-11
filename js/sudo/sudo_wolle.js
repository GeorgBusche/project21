/* =====================================================================
   🎸 SUDO MODUS: WOLLE PETRY (HYPER-SCHLAGER DIRECTOR'S CUT)
   ===================================================================== */
const WOLLE_CONFIG = {
  // Sehr schnelle, harte Schnitte (Passe die ms an dein MP3 an)
  cut1_bronze: 100,        // "Bronze..."
  cut2_silber: 500,        // "...Silber..."
  cut3_gold: 900,         // "...und Gold..."
  cut4_niegewollt: 1500,   // "...hab ich nie gewollt"
  
  cut5_ichwill: 4000,      // "Ich will nur dich..."
  cut6_allein: 5200,       // "...nur dich allein!"
  
  cut7_bronze2: 7100,     // "Bronze, Silber und Gold..." (Zweite Runde)
  cut8_niegewollt2: 8900, // "...hab ich nie gewollt"
  
  cut9_nureins: 11000,     // "Ich will nur eins..." (Der fehlende Cut!)
  cut10_allein2: 12200,    // "...nur dich allein!" (FINAL DROP)
  
  duration: 16000,         // Gesamte Laufzeit
  fadeTime: 2500           // Fade-Out
};

// VIVA 1998 Trash-CSS injizieren
function injectWolleStyles() {
  if (document.getElementById('wolleStyles')) return;
  const style = document.createElement('style');
  style.id = 'wolleStyles';
  style.innerHTML = `
    /* Der klassische Holzfäller */
    .wolle-flannel {
      position: fixed; inset: -20vw; z-index: 35; pointer-events: none; opacity: 0;
      transition: filter 0.1s, transform 0.3s;
      background-color: #b91c1c;
      background-image: 
        repeating-linear-gradient(transparent, transparent 50px, rgba(0,0,0,.6) 50px, rgba(0,0,0,.6) 53px, transparent 53px, transparent 63px, rgba(0,0,0,.6) 63px, rgba(0,0,0,.6) 66px, transparent 66px, transparent 116px, rgba(0,0,0,.7) 116px, rgba(0,0,0,.7) 166px, rgba(255,255,255,.2) 166px, rgba(255,255,255,.2) 169px, rgba(0,0,0,.7) 169px, rgba(0,0,0,.7) 179px, rgba(255,255,255,.2) 179px, rgba(255,255,255,.2) 182px, rgba(0,0,0,.7) 182px, rgba(0,0,0,.7) 232px, transparent 232px),
        repeating-linear-gradient(270deg, transparent, transparent 50px, rgba(0,0,0,.6) 50px, rgba(0,0,0,.6) 53px, transparent 53px, transparent 63px, rgba(0,0,0,.6) 63px, rgba(0,0,0,.6) 66px, transparent 66px, transparent 116px, rgba(0,0,0,.7) 116px, rgba(0,0,0,.7) 166px, rgba(255,255,255,.2) 166px, rgba(255,255,255,.2) 169px, rgba(0,0,0,.7) 169px, rgba(0,0,0,.7) 179px, rgba(255,255,255,.2) 179px, rgba(255,255,255,.2) 182px, rgba(0,0,0,.7) 182px, rgba(0,0,0,.7) 232px, transparent 232px);
    }
    
    /* Wilde Farbfilter */
    .wolle-silver { filter: grayscale(1) brightness(1.5); }
    .wolle-gold { filter: sepia(1) hue-rotate(5deg) saturate(3) brightness(1.2); }
    .wolle-blue { filter: hue-rotate(210deg) saturate(2); }
    .wolle-rainbow { animation: rainbowFlannel 0.3s infinite linear; }
    @keyframes rainbowFlannel { 0% { filter: hue-rotate(0deg) saturate(3); } 100% { filter: hue-rotate(360deg) saturate(3); } }

    /* 3D-Bühnen-Tilt der gesamten Website */
    .wolle-3d-tilt {
      transform-style: preserve-3d;
      transform: perspective(800px) rotateX(15deg) scale(0.9);
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Spotlights (Suchscheinwerfer) */
    .wolle-spotlight {
      position: fixed; bottom: -20vh; width: 20vw; height: 150vh;
      background: linear-gradient(to top, rgba(255,255,255,0.8), transparent);
      border-radius: 50%; filter: blur(20px); z-index: 9991; pointer-events: none;
      transform-origin: bottom center; mix-blend-mode: overlay;
    }
    .spot-left { left: 10vw; animation: sweepRight 2s infinite alternate ease-in-out; }
    .spot-right { right: 10vw; animation: sweepLeft 2.3s infinite alternate ease-in-out; }
    @keyframes sweepRight { 0% { transform: rotate(-40deg); } 100% { transform: rotate(40deg); } }
    @keyframes sweepLeft { 0% { transform: rotate(40deg); } 100% { transform: rotate(-40deg); } }

    /* Karaoke Text */
    .wolle-karaoke {
      position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%);
      width: 100vw; text-align: center; font-size: clamp(3rem, 11vw, 8rem);
      font-weight: 900; color: #ffd700;
      text-shadow: 6px 6px 0px #000, -3px -3px 0px #000, 0 0 40px rgba(255,215,0,0.9);
      z-index: 9999; pointer-events: none; font-family: 'Impact', sans-serif; text-transform: uppercase;
      line-height: 1.1;
    }

    /* Verrückte Text-Animationen */
    @keyframes smashIn { 0% { transform: translate(-50%, -50%) scale(3); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    @keyframes barrelRoll { 0% { transform: translate(-50%, -50%) rotate(180deg) scale(0); opacity: 0; } 100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 1; } }
    @keyframes heartbeatText { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.3); } }
    @keyframes shakeAggro { 0%, 100% { transform: translate(-50%, -50%) rotate(0); } 25% { transform: translate(-52%, -48%) rotate(-5deg); } 75% { transform: translate(-48%, -52%) rotate(5deg); } }

    /* Schunkeln */
    .wolle-schunkel { animation: schunkelSway 2.5s ease-in-out infinite alternate; transform-origin: bottom center; }
    .wolle-hyper-schunkel { animation: hyperSway 1.2s ease-in-out infinite alternate; transform-origin: bottom center; }
    @keyframes schunkelSway { 0% { transform: rotate(-5deg) translateX(-20px); } 100% { transform: rotate(5deg) translateX(20px); } }
    @keyframes hyperSway { 0% { transform: perspective(800px) rotateX(10deg) rotateZ(-8deg) translateX(-40px) scale(1.1); } 100% { transform: perspective(800px) rotateX(10deg) rotateZ(8deg) translateX(40px) scale(1.1); } }

    /* Stadion-Feuerzeug */
    .wolle-lighter {
      position: fixed; bottom: -5vh; font-size: clamp(4rem, 10vw, 7rem);
      z-index: 9990; pointer-events: none; filter: drop-shadow(0 -15px 35px #f59e0b);
      animation: lighterSway 2s ease-in-out infinite alternate; transform-origin: bottom center;
    }
    @keyframes lighterSway { 0% { transform: rotate(-30deg) translateY(10px); } 100% { transform: rotate(30deg) translateY(-10px); } }

    /* Fallende Objekte (Speed-Up) */
    @keyframes fallDownFast { 0% { top: -20%; transform: rotate(0deg) scale(0.5); } 100% { top: 120%; transform: rotate(720deg) scale(1.5); } }
    .wolle-falling-item {
      position: fixed; z-index: 9996; pointer-events: none; font-size: clamp(4rem, 8vw, 7rem);
      animation: fallDownFast linear forwards;
    }
    
    /* Kamera-Blitz */
    .wolle-flash {
      position: fixed; inset: 0; background: white; z-index: 99999; pointer-events: none;
      animation: flashBang 0.4s ease-out forwards;
    }
    @keyframes flashBang { 0% { opacity: 1; } 100% { opacity: 0; } }
  `;
  document.head.appendChild(style);
}

function fadeOutAudioWolle(audio, fadeDuration) {
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

function playWolleSynthFallback() {
  setTimeout(() => { playTone(440, 'square', 0.1, 0.2); }, WOLLE_CONFIG.cut1_bronze);
  setTimeout(() => { playTone(523, 'square', 0.1, 0.2); }, WOLLE_CONFIG.cut2_silber);
  setTimeout(() => { playTone(659, 'square', 0.1, 0.2); }, WOLLE_CONFIG.cut3_gold);
  setTimeout(() => { playTone(587, 'sawtooth', 0.3, 0.2); }, WOLLE_CONFIG.cut4_niegewollt);
  setTimeout(() => { [659, 784, 880].forEach((f, idx) => setTimeout(() => playTone(f, 'square', 0.2, 0.2), idx * 250)); }, WOLLE_CONFIG.cut5_ichwill);
}

function resetAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight; 
  element.style.animation = animationName;
}

function spawnWolleRain(emojis, count, durationBase) {
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'wolle-falling-item';
    item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    item.style.left = `${(Math.random() * 120) - 10}vw`; // Breiter streuen
    const dur = durationBase + (Math.random() * 1.5);
    item.style.animationDuration = `${dur}s`;
    item.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(item);
    wolleElements.push(item);
    setTimeout(() => { if (item.parentNode) item.remove(); }, (dur + 0.5) * 1000);
  }
}

function triggerCameraFlash() {
  const flash = document.createElement('div');
  flash.className = 'wolle-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 450);
}

// Speicher für alle dynamischen DOM-Elemente
let wolleElements = [];

function triggerWollePetry() {
  if (isSudoRunning) return;
  isSudoRunning = true;

  injectWolleStyles();
  wolleElements.forEach(el => el.remove());
  wolleElements = []; 

  const root = document.getElementById('bodyRoot');
  const audioElem = document.getElementById('audioWolle');

  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.volume = 1; 
    audioElem.play().catch(() => playWolleSynthFallback());
  } else {
    playWolleSynthFallback();
  }

  appendLine(`<span class='text-pink-400 font-bold'>[SUDO] DIRECTOR'S CUT: VOKUHILA-OVERDRIVE INITIIERT!</span>`);

  // Flanell-Hintergrund
  const flannelBg = document.createElement('div');
  flannelBg.className = 'wolle-flannel';
  document.body.appendChild(flannelBg);
  wolleElements.push(flannelBg);

  // Text-Layer
  const karaokeText = document.createElement('div');
  karaokeText.className = 'wolle-karaoke';
  document.body.appendChild(karaokeText);
  wolleElements.push(karaokeText);

  // =========================================================
  // CUT 1: "BRONZE..."
  // =========================================================
  setTimeout(() => {
    flannelBg.style.opacity = "1";
    karaokeText.style.color = "#cd7f32"; // Bronze
    karaokeText.innerHTML = "BRONZE";
    resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
    triggerCameraFlash();
  }, WOLLE_CONFIG.cut1_bronze);

  // =========================================================
  // CUT 2: "...SILBER..."
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel wolle-silver';
    karaokeText.style.color = "#c0c0c0"; // Silber
    karaokeText.innerHTML = "SILBER";
    resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
  }, WOLLE_CONFIG.cut2_silber);

  // =========================================================
  // CUT 3: "...UND GOLD!"
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel wolle-gold';
    karaokeText.style.color = "#ffd700"; // Gold
    karaokeText.innerHTML = "& GOLD!";
    resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
    spawnWolleRain(['🥇', '🏆', '⭐'], 15, 1.2);
  }, WOLLE_CONFIG.cut3_gold);

  // =========================================================
  // CUT 4: "HAB ICH NIE GEWOLLT!"
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel'; // Zurück zu rot
    karaokeText.style.color = "#ef4444"; 
    karaokeText.innerHTML = "❌ NIE<br>GEWOLLT!";
    resetAnimation(karaokeText, 'shakeAggro 0.4s infinite');
    
    // Website kippt in den 3D Raum
    root.classList.add('wolle-3d-tilt');
    triggerCameraFlash();
  }, WOLLE_CONFIG.cut4_niegewollt);

  // =========================================================
  // CUT 5: "ICH WILL NUR DICH..." (Spotlights & Feuerzeuge)
  // =========================================================
  setTimeout(() => {
    root.classList.remove('wolle-3d-tilt');
    flannelBg.className = 'wolle-flannel wolle-blue';
    karaokeText.style.color = "#3b82f6"; 
    karaokeText.innerHTML = "👀 ICH WILL<br>NUR DICH...";
    resetAnimation(karaokeText, 'popIn 0.4s forwards');

    // Spotlights an
    ['spot-left', 'spot-right'].forEach(cls => {
      const spot = document.createElement('div');
      spot.className = `wolle-spotlight ${cls}`;
      document.body.appendChild(spot);
      wolleElements.push(spot);
    });

    // Lighters an
    const lighterCount = Math.floor(window.innerWidth / 80); 
    for (let i = 0; i < lighterCount; i++) {
      const lighter = document.createElement('div');
      lighter.className = 'wolle-lighter';
      lighter.textContent = '🔥';
      lighter.style.left = `${(i * 80) + (Math.random() * 20)}px`;
      lighter.style.animationDelay = `-${Math.random() * 3}s`;
      document.body.appendChild(lighter);
      wolleElements.push(lighter);
    }
  }, WOLLE_CONFIG.cut5_ichwill);

  // =========================================================
  // CUT 6: "NUR DICH ALLEIN!"
  // =========================================================
  setTimeout(() => {
    karaokeText.style.color = "#ec4899"; 
    karaokeText.innerHTML = "❤️ NUR DICH<br>ALLEIN! ❤️";
    resetAnimation(karaokeText, 'heartbeatText 0.8s infinite');
    root.classList.add('wolle-schunkel');
    spawnWolleRain(['💖', '🫶', '💋'], 25, 1.5);
  }, WOLLE_CONFIG.cut6_allein);

  // =========================================================
  // CUT 7: "BRONZE, SILBER, GOLD" (Wiederholung - Barrel Roll)
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel wolle-gold';
    karaokeText.style.color = "#ffd700"; 
    karaokeText.innerHTML = "BRONZE, SILBER<br>& GOLD...";
    resetAnimation(karaokeText, 'barrelRoll 0.6s forwards');
    triggerCameraFlash();
  }, WOLLE_CONFIG.cut7_bronze2);

  // =========================================================
  // CUT 8: "HAB ICH NIE GEWOLLT!" (Wiederholung)
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel';
    karaokeText.style.color = "#ef4444"; 
    karaokeText.innerHTML = "❌ NIE GEWOLLT!";
    resetAnimation(karaokeText, 'shakeAggro 0.4s infinite');
    karaokeText.style.transform = "translate(-50%, -50%) scale(1.4)";
  }, WOLLE_CONFIG.cut8_niegewollt2);

  // =========================================================
  // CUT 9: "ICH WILL NUR EINS..." (Der fehlende Cut!)
  // =========================================================
  setTimeout(() => {
    flannelBg.className = 'wolle-flannel wolle-blue';
    karaokeText.style.color = "#06b6d4"; 
    karaokeText.innerHTML = "☝️ ICH WILL<br>NUR EINS...";
    resetAnimation(karaokeText, 'smashIn 0.3s forwards');
  }, WOLLE_CONFIG.cut9_nureins);

  // =========================================================
  // CUT 10: "NUR DICH ALLEIN!" (FINAL DROP - RAINBOW & HYPER-SCHUNKEL)
  // =========================================================
  setTimeout(() => {
    triggerCameraFlash();
    flannelBg.className = 'wolle-flannel wolle-rainbow'; // Farben eskalieren
    
    karaokeText.style.color = "#ffffff"; 
    karaokeText.style.textShadow = "0 0 50px #ec4899, 0 0 100px #3b82f6";
    karaokeText.innerHTML = "🍻 NUR DICH<br>ALLEIN! 🍻";
    resetAnimation(karaokeText, 'heartbeatText 0.4s infinite');

    // Hyper-Schunkeln (extremes Wackeln im 3D-Raum)
    root.classList.remove('wolle-schunkel');
    root.classList.add('wolle-hyper-schunkel');

    // Regen aus Schlager-Utensilien
    spawnWolleRain(['🍻', '🍺', '🎸', '🪩', '🎉', '🎤'], 60, 1.2);

    appendLine("<span class='text-pink-400 font-extrabold text-sm animate-pulse'>🍻 [HYPER-STADION] REGENBOGEN-FLANELL AKTIVIERT! HÖLLE HÖLLE HÖLLE!</span>");
    if (navigator.vibrate) navigator.vibrate([400, 100, 400, 100, 600, 100, 800]);

    // Fade Out anstoßen
    setTimeout(() => {
      fadeOutAudioWolle(audioElem, WOLLE_CONFIG.fadeTime);
    }, (WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2) - WOLLE_CONFIG.fadeTime);

    // Sauberer Reset
    setTimeout(() => {
      root.classList.remove('wolle-schunkel', 'wolle-hyper-schunkel', 'wolle-3d-tilt');
      wolleElements.forEach(el => el.remove());
      wolleElements = [];
      isSudoRunning = false;
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
      appendLine("<span class='text-emerald-400 font-bold'>[STATUS] Tränen getrocknet. System stabil.</span>");
    }, WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2);

  }, WOLLE_CONFIG.cut10_allein2);
}