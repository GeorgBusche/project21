/* =====================================================================
   🧠 CORE: FIREBASE, TERMINAL & SYSTEM-BOOT
   ===================================================================== */

// Firebase Initialisierung
if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
const db = firebase.database();

// Geräte-Erkennung
function getDeviceToken() {
  let token = localStorage.getItem('party_device_token');
  if (!token) { 
    token = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36); 
    localStorage.setItem('party_device_token', token); 
  }
  return token;
}
const myUserToken = getDeviceToken();

// --- UI HELPER ---
function toggleCRT() { document.body.classList.toggle('crt-overlay'); showToast('CRT-Filter umgeschaltet'); playTone(400, 'sine', 0.05); }
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

// --- BOOT-SEQUENZ ---
window.addEventListener('DOMContentLoaded', () => {
  const bootSequence = [
    { text: "<span class='text-emerald-500'>[SYS]</span> Lade Linux kernel 6.8.0-partyraum-generic...", delay: 100 },
    { text: "<span class='text-emerald-500'>[MEM]</span> Initialisiere Hopfenspeicher & Mischen... <span class='text-emerald-400 font-bold'>[OK]</span>", delay: 350 },
    { text: "<span class='text-cyan-400'>[AUDIO]</span> Druckkammer Lohhof: 120 dB eingemessen... <span class='text-emerald-400 font-bold'>[MAX]</span>", delay: 750 },
    { text: `<span class='text-emerald-500'>[AUTH]</span> Host: <strong class='text-emerald-200'>${CONFIG.party.hostName}</strong> | Upgrade: <strong>v20.0 &rarr; v21.0</strong>`, delay: 1700 },
    { text: "------------------------------------------------------------", delay: 1950 },
    { text: `<span class='text-cyan-300 font-bold text-sm'>🚨 OFFIZIELLE EINLADUNG: ${CONFIG.party.hostName.toUpperCase()}'S 21. GEBURTSTAG 🚨</span>`, delay: 2150 },
    { text: "Wähle unten <strong class='text-emerald-300 bg-emerald-950 px-1 rounded'>[1] ZUSAGEN</strong> oder starte ein <strong class='text-amber-300'>SUDO MODUL</strong>.", delay: 2550 }
  ];
  bootSequence.forEach(item => appendLine(item.text, item.delay));
  const unlockAudio = () => { getAudioContext(); window.removeEventListener('click', unlockAudio); window.removeEventListener('touchstart', unlockAudio); };
  window.addEventListener('click', unlockAudio); window.addEventListener('touchstart', unlockAudio);
});

// --- SUDO & NOT-AUS ---
document.addEventListener('click', e => { if (isSudoRunning && canSkip) emergencySkipParty(); });
document.addEventListener('touchstart', e => { if (isSudoRunning && canSkip) emergencySkipParty(); }, { passive: true });

function emergencySkipParty() {
  for (let i = 0; i < window.setTimeout(() => {}, 0); i++) window.clearTimeout(i);
  for (let i = 0; i < window.setInterval(() => {}, 0); i++) window.clearInterval(i);
  document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
  document.querySelectorAll('.shockwave-ring, .splash-text, .wolle-flannel, .tornado-storm-bg, .rage-speedlines, .ramm-darkness, .korn-tear').forEach(el => el.remove());
  document.getElementById('bodyRoot').className = 'h-full flex flex-col justify-between p-2 sm:p-4 select-none relative crt-overlay';
  document.getElementById('bodyRoot').style.transform = 'none';
  if(document.getElementById('discoOverlay')) document.getElementById('discoOverlay').className = "fixed inset-0 pointer-events-none z-40 opacity-0";
  if(document.getElementById('discoBallElem')) document.getElementById('discoBallElem').className = "hidden";
  particles = []; lasers = []; if (fxAnimFrame) cancelAnimationFrame(fxAnimFrame); fxAnimFrame = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  isSudoRunning = false; canSkip = false; playTone(150, 'sawtooth', 0.2);
}

function triggerRandomSudoParty() {
  if (isSudoRunning) { showToast("⚠️ System eskaliert bereits!"); return; }
  const sudoModules = [triggerBellaNapoli, triggerWollePetry, triggerRammstein, triggerBiertornado, triggerRagecage, triggerSchuettelkorn];
  let available = sudoModules.filter(p => p !== lastSudoParty);
  if (!available.length) available = sudoModules;
  lastSudoParty = available[Math.floor(Math.random() * available.length)];
  lastSudoParty(); canSkip = false; setTimeout(() => { canSkip = true; }, 1000);
}