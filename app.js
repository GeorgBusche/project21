/* =====================================================================
   ⚙️ GEORGS PARTY-KONFIGURATION
   ===================================================================== */
const PARTY_CONFIG = {
  hostName: "Georg",
  phone: "4915174345666", 
  date: "Samstag, 19.12.2026",
  time: "Ab 19:30 Uhr bis zum Systemabsturz",
  location: "Partyraum Lohhof 49, 31600 Uchte",
  mapsUrl: "https://maps.app.goo.gl/6eNiNjvt4FKFRNZV8",
  dresscode: "Schick, verkleidet oder nackt... Mir doch egal!"
};

// Globale Sperre, damit man Sudo-Befehle nicht doppelt klickt
let isSudoRunning = false;

/* =====================================================================
   FX CANVAS ENGINE (KONFETTI, EMOJIS, LASER)
   ===================================================================== */
const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
let particles = [];
let lasers = [];
let fxAnimFrame = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor(x, y, colorOrEmoji, size, speedX, speedY, shape) {
    this.x = x;
    this.y = y;
    this.color = colorOrEmoji;
    this.size = size;
    this.speedX = speedX;
    this.speedY = speedY;
    this.gravity = 0.35;
    this.friction = 0.98;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;
    this.shape = shape;
    this.opacity = 1;
  }
  update() {
    this.speedX *= this.friction;
    this.speedY *= this.friction;
    this.speedY += this.gravity;
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.012;
  }
  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.opacity);
    c.translate(this.x, this.y);
    c.rotate((this.rotation * Math.PI) / 180);
    
    if (this.shape === 'emoji') {
      c.font = `${this.size}px Arial`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(this.color, 0, 0);
    } else {
      c.fillStyle = this.color;
      if (this.shape === 'rect') {
        c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.5);
      } else if (this.shape === 'circle') {
        c.beginPath();
        c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }
}

function blastConfetti(originX, originY, count, colors, emojis = []) {
  for (let i = 0; i < count; i++) {
    const useEmoji = emojis.length > 0 && Math.random() > 0.6; 
    const colorOrEmoji = useEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : colors[Math.floor(Math.random() * colors.length)];
    const shape = useEmoji ? 'emoji' : (Math.random() > 0.5 ? 'rect' : 'circle');
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 8 + Math.random() * 25;
    const speedX = Math.cos(angle) * velocity;
    const speedY = Math.sin(angle) * velocity - (originY > canvas.height * 0.7 ? 16 : 4);
    const size = useEmoji ? (30 + Math.random() * 25) : (6 + Math.random() * 12);
    
    particles.push(new Particle(originX, originY, colorOrEmoji, size, speedX, speedY, shape));
  }
}

function fireLaserBurst() {
  const colors = ['#06b6d4', '#f43f5e', '#22c55e', '#a855f7', '#f59e0b', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI; 
    const length = canvas.height * 1.5;
    lasers.push({
      x1: canvas.width / 2,
      y1: canvas.height * 0.15, 
      x2: canvas.width / 2 + Math.cos(angle) * length,
      y2: canvas.height * 0.15 + Math.sin(angle) * length,
      color: colors[Math.floor(Math.random() * colors.length)],
      width: 3 + Math.random() * 8,
      life: 1
    });
  }
}

function runFxEngine() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    ctx.save();
    ctx.globalAlpha = l.life;
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    
    ctx.globalAlpha = l.life * 0.4;
    ctx.lineWidth = l.width * 2.5;
    ctx.stroke();
    ctx.restore();
    
    l.life -= 0.12; 
    if (l.life <= 0) lasers.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.opacity <= 0 || p.y > canvas.height + 100) {
      particles.splice(i, 1);
    }
  }

  if (particles.length > 0 || lasers.length > 0) {
    fxAnimFrame = requestAnimationFrame(runFxEngine);
  } else {
    cancelAnimationFrame(fxAnimFrame);
    fxAnimFrame = null;
  }
}

function ensureFxLoop() {
  if (!fxAnimFrame) fxAnimFrame = requestAnimationFrame(runFxEngine);
}

function triggerShockwave(color = '#22c55e') {
  const ring = document.createElement('div');
  ring.className = 'shockwave-ring';
  ring.style.color = color; 
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 650);
}

function showSplashText(text, color = '#ffffff') {
  const splash = document.createElement('div');
  splash.className = 'splash-text';
  splash.textContent = text;
  splash.style.color = color;
  document.body.appendChild(splash);
  setTimeout(() => splash.remove(), 800);
}

/* =====================================================================
   AUDIO-SYNTHESIZER (UI SOUNDS)
   ===================================================================== */
let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  const icon = document.getElementById('soundIcon');
  if (soundEnabled) {
    icon.textContent = '🔊';
    showToast('Sound aktiviert');
    playTone(880, 'sine', 0.1);
  } else {
    icon.textContent = '🔇';
    showToast('Sound stumm');
  }
}

function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playBuzzerError() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function playSuccessChime() {
  if (!soundEnabled) return;
  [523, 659, 783, 1046].forEach((f, i) => {
    setTimeout(() => playTone(f, 'sine', 0.14, 0.08), i * 90);
  });
}

/* =====================================================================
   TERMINAL & BOOT
   ===================================================================== */
const outputElem = document.getElementById('terminalOutput');

function appendLine(html, delay = 0) {
  setTimeout(() => {
    const line = document.createElement('div');
    line.innerHTML = html;
    outputElem.appendChild(line);
    outputElem.scrollTop = outputElem.scrollHeight;
    playTone(1300 + Math.random() * 300, 'sine', 0.015, 0.02);
  }, delay);
}

const bootSequence = [
  { text: "<span class='text-emerald-500'>[SYS]</span> Lade Linux kernel 6.8.0-partyraum-generic...", delay: 100 },
  { text: "<span class='text-emerald-500'>[MEM]</span> Initialisiere Hopfenspeicher & Mischen... <span class='text-emerald-400 font-bold'>[OK]</span>", delay: 350 },
  { text: "<span class='text-cyan-400'>[AUDIO]</span> Druckkammer Lohhof: 120 dB eingemessen... <span class='text-emerald-400 font-bold'>[MAX]</span>", delay: 750 },
  { text: "<span class='text-yellow-500'>[WARN]</span> Nachbarschafts-Ruhepegel: NICHT GEFUNDEN (wird ignoriert)", delay: 1100 },
  { text: "<span class='text-cyan-600'>[OMA]</span> Oma bereitet das blaue Gift vor...", delay: 1400 },
  { text: `<span class='text-emerald-500'>[AUTH]</span> Host: <strong class='text-emerald-200'>${PARTY_CONFIG.hostName}</strong> | Upgrade: <strong>v20.0 &rarr; v21.0</strong>`, delay: 1700 },
  { text: "------------------------------------------------------------", delay: 1950 },
  { text: `<span class='text-cyan-300 font-bold text-sm'>🚨 OFFIZIELLE EINLADUNG: ${PARTY_CONFIG.hostName.toUpperCase()}'S 21. GEBURTSTAG 🚨</span>`, delay: 2150 },
  { text: "Dorf-Abriss trifft Mathe-Informatik. Keine Kompromisse.", delay: 2350 },
  { text: "Wähle unten <strong class='text-emerald-300 bg-emerald-950 px-1 rounded'>[1] ZUSAGEN</strong> oder starte ein <strong class='text-amber-300'>SUDO MODUL</strong>.", delay: 2550 }
];

function runBoot() {
  bootSequence.forEach(item => appendLine(item.text, item.delay));
}

/* =====================================================================
   ABSAGEN BUTTON (SCHÜTTELN & KAPITULATION)
   ===================================================================== */
let declineCount = 0;
const declinePhrases = [
  "FEHLER 403: Recht des Gastgebers §21 Abs. 1 greift! Anwesenheitspflicht.",
  "SYSTEM FEHLER: Mutti hat bereits gekocht!",
  "SEGMENTATION FAULT: Bier-Integral divergiert ohne dich!",
  "KERNEL PANIC: Kater lässt sich nicht wegdiskutieren!",
  "WARNUNG: Wer nicht kommt ist doof!"
];

function handleDeclineClick() {
  declineCount++;
  playBuzzerError();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

  const btn = document.getElementById('declineBtn');
  btn.classList.add('shake-denied');
  setTimeout(() => btn.classList.remove('shake-denied'), 350);

  const phrase = declinePhrases[(declineCount - 1) % declinePhrases.length];
  appendLine(`<span class='text-rose-400 font-bold'>[ABGELEHNT #${declineCount}] ${phrase}</span>`);

  if (declineCount < 5) {
    btn.innerText = `❌ NICHT MÖGLICH (${5 - declineCount})`;
  } else {
    btn.innerText = "🏳️ KAPITULATION: ICH KOMME!";
    btn.className = "px-3 py-2 rounded bg-emerald-500 text-black font-extrabold text-xs sm:text-sm shadow-[0_0_15px_#22c55e] active:scale-95 transition";
    btn.onclick = () => {
      appendLine("<span class='text-emerald-300 font-bold'>[ERFOLG] Vernunft siegt! Zusage-Fenster wird geöffnet...</span>");
      openRsvpModal();
    };
    showToast("Widerstand zwecklos! Party-Modus aktiviert.");
  }
}

/* =====================================================================
   BEFEHLE (INFO, MATHE, SHOTS, GESCHENKE)
   ===================================================================== */
const shotsList = [
  "🗼 Der Hubiturm muss wachsen!",
  "🎊 SCHÜTTELKORN!!!",
  "😩 Ich trink Ouzo was trinkst du so? ",
  "🍞 ET GIBT KORN!!!",
  "🫎 JÄGERMEISTER!",
  "🥃 Vodka is auch ne Option..."
];

function runCommand(cmd) {
  playTone(650, 'sine', 0.05);

  switch(cmd) {
    case 'info':
      appendLine(`
        <div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 space-y-1 text-xs text-emerald-200'>
          <div class='text-cyan-300 font-bold text-sm'>📍 PATCH-NOTES: 21.0 DEPLOYMENT</div>
          <div>📅 <strong>Wann:</strong> ${PARTY_CONFIG.date}</div>
          <div>⏰ <strong>Uhrzeit:</strong> ${PARTY_CONFIG.time}</div>
          <div>🏠 <strong>Wo:</strong> ${PARTY_CONFIG.location}</div>
          <div>👕 <strong>Dresscode:</strong> ${PARTY_CONFIG.dresscode}</div>
          <div>🍻 <strong>Versorgung:</strong> Fassbier, Korn, Hubis, Softdrinks & was zu futtern ist gesichert.</div>
        </div>
      `);
      break;

    case 'mathe':
      appendLine(`
        <div class='bg-neutral-900 p-3 rounded border border-yellow-600/70 text-xs text-yellow-300 font-mono space-y-1'>
          <div class='font-bold text-white'>SATZ VOM ESKALIERENDEN PARTYRAUM:</div>
          <div>Sei N die Menge aller Gäste. &forall; x &isin; N gilt: lim<sub>t &rarr; 03:00</sub> Promille(x) &ge; 1.8.</div>
          <div class='text-cyan-300 font-bold mt-1'>Beweis durch vollständige Induktion:</div>
          <div>1. Induktionsanfang: Runde n = 1 schmeckt hervorragend.</div>
          <div>2. Induktionsvoraussetzung: Nach Runde n herrscht beste Laune.</div>
          <div>3. Induktionsschluss: Aus Runde n folgt Runde n + 1 (Dorf-Axiom: "Einer geht noch!").</div>
          <div class='text-emerald-400 font-bold'>q.e.d. (quod erat demonstrandum - was zu bechern war).</div>
        </div>
      `);
      break;

    case 'shot_roulette':
      const shot = shotsList[Math.floor(Math.random() * shotsList.length)];
      playTone(400, 'sawtooth', 0.08);
      setTimeout(() => playTone(800, 'sawtooth', 0.12), 100);
      appendLine(`
        <div class='bg-amber-950/50 p-2.5 rounded border border-amber-500 text-xs text-amber-200 font-mono'>
          <div class='text-amber-400 font-bold'>🎲 SHOT-ROULETTE HAT ENTSCHIEDEN:</div>
          <div class='text-white text-sm font-bold mt-1'>👉 ${shot}</div>
          <div class='text-[10px] text-amber-500 mt-1'>Schnapp dir ein Glas und runter damit!</div>
        </div>
      `);
      break;

    case 'geschenke':
      appendLine(`
        <div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200 space-y-1.5'>
          <div class='text-emerald-300 font-bold text-sm'>🎁 GESCHENKE & MITBRINGSEL?</div>
          <p>Ganz ehrlich: Macht euch keinen Kopf. Das Wichtigste ist, dass ihr da seid und Bock habt, ordentlich zu feiern!</p>
          <p>Wer trotzdem was mitbringen möchte: Bringt einfach 'ne Kiste Bier, Mische oder irgendeinen lustigen Quatsch mit. Alles entspannt!</p>
        </div>
      `);
      break;
  }
}

/* =====================================================================
   RADAR MODAL
   ==================================================================== */
function openRadarModal() {
  playTone(500, 'sine', 0.08);
  setTimeout(() => playTone(1000, 'sine', 0.1), 90);
  document.getElementById('radarModal').classList.remove('hidden');
}

function closeRadarModal() {
  document.getElementById('radarModal').classList.add('hidden');
}

function copyAddressToClipboard() {
  navigator.clipboard.writeText(PARTY_CONFIG.location).then(() => {
    showToast("✓ Adresse kopiert!");
    playSuccessChime();
  }).catch(() => {
    showToast("Lohhof 49, 31600 Uchte");
  });
}

/* =====================================================================
   RSVP & WHATSAPP GENERATOR
   ===================================================================== */
function openRsvpModal() {
  playTone(587, 'sine', 0.08);
  document.getElementById('rsvpModal').classList.remove('hidden');
  updatePegelDisplay(document.getElementById('rsvpPegel').value);
}

function closeRsvpModal() {
  document.getElementById('rsvpModal').classList.add('hidden');
}

function togglePlusOneInput() {
  const isChecked = document.getElementById('rsvpPlusOneToggle').checked;
  const container = document.getElementById('plusOneContainer');
  if (isChecked) {
    container.classList.remove('hidden');
    document.getElementById('rsvpPlusOneName').focus();
    playTone(700, 'sine', 0.05);
  } else {
    container.classList.add('hidden');
  }
}

const pegelDescriptions = {
  0: "p = 0.0 : Also ich bleibe nüchtern! (Fahrer / Softdrinks)",
  25: "p = √2 : 1-2 Bierchen und dann mal sehen...",
  50: "p = e¹ : Die Tanzfläche ist mein! Wo is der DJ?",
  75: "p = π² : Lass mal ne Runde Meiern!",
  100: "p → ∞ : WO IST DER TRICHTER? (VOLLGAS!)"
};

function updatePegelDisplay(val) {
  const badge = document.getElementById('pegelValueBadge');
  const desc = document.getElementById('pegelDescription');
  badge.textContent = `Pegel: ${val}%`;
  desc.textContent = pegelDescriptions[val] || `Pegel: ${val}%`;
  playTone(220 + val * 5, 'sine', 0.02, 0.03);
}

function dispatchRsvpWhatsApp() {
  const name = document.getElementById('rsvpName').value.trim();
  if (!name) {
    playBuzzerError();
    showToast("⚠️ Bitte gib zuerst deinen Namen ein!");
    document.getElementById('rsvpName').focus();
    return;
  }

  const hasPlusOne = document.getElementById('rsvpPlusOneToggle').checked;
  const plusOneName = document.getElementById('rsvpPlusOneName').value.trim();
  let besatzungsText = "Komme alleine";
  if (hasPlusOne) {
    besatzungsText = plusOneName ? `Bringt mit: ${plusOneName}` : "Bringt eine Begleitperson mit";
  }

  const drink = document.getElementById('rsvpDrink').value;
  const pegelVal = document.getElementById('rsvpPegel').value;
  const pegelText = pegelDescriptions[pegelVal] || `${pegelVal}%`;
  const giftPlan = document.getElementById('rsvpGift').value.trim() || 'Gute Laune';
  const song = document.getElementById('rsvpSong').value.trim() || 'Bella Napoli';

  const phoneClean = (PARTY_CONFIG.phone || "").replace(/\D/g, '');

  const waMessage = 
`🚨 Zusage für deinen 21. Geburtstag! 🚨
Moin ${PARTY_CONFIG.hostName},

ich bin bei deiner Feier im Partyraum am Start!

👤 Name: ${name}
👥 Begleitung: ${besatzungsText}
⛽ Bevorzugtes Getränk: ${drink}
📊 Ziel-Pegel: ${pegelText}
🎁 Mitbringsel: ${giftPlan}
🎶 Song-Wunsch: ${song}

Freu mich schon drauf! Bis dann 🍻`;

  const encodedMsg = encodeURIComponent(waMessage);
  const waUrl = `https://wa.me/${phoneClean}?text=${encodedMsg}`;

  playSuccessChime();
  closeRsvpModal();
  
  appendLine(`<span class='text-emerald-300 font-bold'>[✓] Zusage generiert für '${escapeHtml(name)}'! WhatsApp wird geöffnet...</span>`);
  window.open(waUrl, '_blank');
}

/* =====================================================================
   HELPER
   ===================================================================== */
function toggleCRT() {
  document.body.classList.toggle('crt-overlay');
  showToast('CRT-Filter umgeschaltet');
  playTone(400, 'sine', 0.05);
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

window.addEventListener('DOMContentLoaded', () => {
  runBoot();
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
});