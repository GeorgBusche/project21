/* =====================================================================
   🧠 CORE: FIREBASE, TERMINAL & SYSTEM-BOOT
   ===================================================================== */

if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
const db = firebase.database();

function getDeviceToken() {
  let token = localStorage.getItem('party_device_token');
  if (!token) { 
    token = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36); 
    localStorage.setItem('party_device_token', token); 
  }
  return token;
}
const myUserToken = getDeviceToken();

function toggleCRT() { 
  document.body.classList.toggle('crt-overlay'); 
  showToast('CRT-Filter umgeschaltet'); 
  playTone(400, 'sine', 0.05); 
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast("Vollbild wird von deinem Browser nicht unterstützt.");
    });
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}
function showToast(msg) { const toast = document.getElementById('toastNotification'); toast.textContent = msg; toast.style.opacity = '1'; setTimeout(() => { toast.style.opacity = '0'; }, 2200); }
function escapeHtml(text) { return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]); }

const outputElem = document.getElementById('terminalOutput');
function appendLine(html, delay = 0) {
  setTimeout(() => {
    const line = document.createElement('div'); line.innerHTML = html;
    outputElem.appendChild(line); outputElem.scrollTop = outputElem.scrollHeight;
    playTone(1300 + Math.random() * 300, 'sine', 0.015, 0.02);
  }, delay);
}

// --- FIX: KUGELSICHERE BOOT-SEQUENZ ---
function startBootSequence() {
  const bootSequence = [
    { text: "<span class='text-emerald-500'>[SYS]</span> Lade Linux kernel 6.8.0-partyraum-generic...", delay: 100 },
    { text: "<span class='text-emerald-500'>[MEM]</span> Initialisiere Hopfenspeicher & Mischen... <span class='text-emerald-400 font-bold'>[OK]</span>", delay: 350 },
    { text: "<span class='text-cyan-400'>[AUDIO]</span> Druckkammer Lohhof: 120 dB eingemessen... <span class='text-emerald-400 font-bold'>[MAX]</span>", delay: 750 },
    { text: `<span class='text-emerald-500'>[AUTH]</span> Host: <strong class='text-emerald-200'>${CONFIG.party.hostName}</strong> | Upgrade: <strong>v20.0 &rarr; v21.0</strong>`, delay: 1700 },
    { text: "------------------------------------------------------------", delay: 1950 },
    { text: `<span class='text-cyan-300 font-bold text-sm'>🚨 OFFIZIELLE EINLADUNG: ${CONFIG.party.hostName.toUpperCase()}'S 21. GEBURTSTAG 🚨</span>`, delay: 2150 },
    { text: "Nutze die Action-Bar unten für <strong class='text-emerald-300 bg-emerald-950 px-1 rounded'>ZUSAGEN</strong> oder <strong class='text-amber-300'>SUDO</strong>.", delay: 2550 }
  ];
  bootSequence.forEach(item => appendLine(item.text, item.delay));
  const unlockAudio = () => { getAudioContext(); window.removeEventListener('click', unlockAudio); window.removeEventListener('touchstart', unlockAudio); };
  window.addEventListener('click', unlockAudio); window.addEventListener('touchstart', unlockAudio);
}

// Beseitigt den Git-Lade-Bug: Prüft so lange, bis das Terminal wirklich existiert
function initApp() {
  if (document.getElementById('terminalOutput')) {
    startBootSequence();
  } else {
    setTimeout(initApp, 50);
  }
}
initApp(); // Direkt starten!

// --- FIX: SUDO & NOT-AUS ---
document.addEventListener('click', e => { if (isSudoRunning && canSkip) emergencySkipParty(); });
document.addEventListener('touchstart', e => { if (isSudoRunning && canSkip) emergencySkipParty(); }, { passive: true });

function emergencySkipParty() {
  // 1. Alle Timer radikal beenden
  const maxTimeout = window.setTimeout(() => {}, 0);
  for (let i = 0; i < maxTimeout; i++) window.clearTimeout(i);
  const maxInterval = window.setInterval(() => {}, 0);
  for (let i = 0; i < maxInterval; i++) window.clearInterval(i);

  // 2. Audio & Synths killen
  document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
  if (audioCtx && audioCtx.state !== 'closed') { audioCtx.suspend(); setTimeout(() => audioCtx.resume(), 100); }

  // 3. Sudo-Elemente aus dem DOM fegen
  document.querySelectorAll('[class*="wolle-"], [class*="ramm-"], [class*="tornado-"], [class*="rage-"], [class*="korn-"], .shockwave-ring, .splash-text, .brause-bubble, .ping-pong, .red-cup, .schuettel-item').forEach(el => el.remove());

  // 4. Body aufräumen
  const root = document.getElementById('bodyRoot');
  root.classList.remove('fx-earthquake', 'korn-sad-mode', 'brause-mode', 'brause-mode-green', 'wolle-3d-tilt', 'wolle-schunkel', 'wolle-hyper-schunkel', 'ramm-quake');
  root.style.transform = 'none'; // Wichtig, falls Rammstein die Seite gedreht hat
  
  // 5. DEN SCHWARZEN BILDSCHIRM FIXEN (Disco Overlay hart zurücksetzen)
  const disco = document.getElementById('discoOverlay');
  if (disco) {
    disco.className = "fixed inset-0 pointer-events-none z-40 opacity-0";
    disco.style.opacity = '0';
    disco.style.backgroundColor = 'transparent';
  }
  
  const discoBall = document.getElementById('discoBallElem');
  if (discoBall) discoBall.className = "hidden";

  // 6. Canvas leeren
  particles = []; lasers = []; if (fxAnimFrame) cancelAnimationFrame(fxAnimFrame); fxAnimFrame = null;
  if(canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 7. System entriegeln
  isSudoRunning = false; canSkip = false; playTone(150, 'sawtooth', 0.2);
}

function triggerRandomSudoParty() {
  if (isSudoRunning) { showToast("⚠️ System eskaliert bereits!"); return; }
  const sudoModules = [triggerBellaNapoli, triggerWollePetry, triggerRammstein, triggerBiertornado, triggerRagecage, triggerSchuettelkorn];
  let available = sudoModules.filter(p => p !== lastSudoParty);
  if (!available.length) available = sudoModules;
  lastSudoParty = available[Math.floor(Math.random() * available.length)];
  
  lastSudoParty(); 
  
  canSkip = false; 
  setTimeout(() => { canSkip = true; }, 1000);
}