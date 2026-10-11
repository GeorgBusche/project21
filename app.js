/* =====================================================================
   🔥 FIREBASE REALTIME DATABASE & GERÄTE-IDENTIFIKATION
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDhQTJJSmk6L1XGIvwRIjR03VHY4HXUZ1A",
  authDomain: "project21-2cea0.firebaseapp.com",
  databaseURL: "https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "project21-2cea0",
  storageBucket: "project21-2cea0.firebasestorage.app",
  messagingSenderId: "879692488069",
  appId: "1:879692488069:web:82a55d6a3d5b39bfaa38ec",
  measurementId: "G-35C5HH0RF0"
};
// Initialisieren
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Eindeutiger Geräte-Token (Verhindert Mehrfach-Votes & Duplikate)
function getDeviceToken() {
  let token = localStorage.getItem('party_device_token');
  if (!token) {
    token = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('party_device_token', token);
  }
  return token;
}

const myUserToken = getDeviceToken();

// 1. Zusage speichern & synchronisieren
function saveRsvpToFirebase(data) {
  const userRef = db.ref('rsvps/' + myUserToken);
  userRef.set({
    name: data.name,
    plusOne: data.plusOne,
    plusOneName: data.plusOneName,
    drink: data.drink,
    pegel: data.pegel,
    gift: data.gift,
    timestamp: Date.now()
  });
}

// Erweitere deine bestehende dispatchRsvpWhatsApp-Funktion:
const originalDispatch = dispatchRsvpWhatsApp;
dispatchRsvpWhatsApp = function() {
  const name = document.getElementById('rsvpName').value.trim();
  if (!name) {
    showToast("⚠️ Bitte Namen angeben!");
    return;
  }

  const plusOne = document.getElementById('rsvpPlusOneToggle').checked;
  const plusOneName = document.getElementById('rsvpPlusOneName').value.trim();
  const drink = document.getElementById('rsvpDrink').value;
  const pegel = document.getElementById('rsvpPegel').value;
  const gift = document.getElementById('rsvpGift').value.trim();

  // In Firebase sichern
  saveRsvpToFirebase({ name, plusOne, plusOneName, drink, pegel, gift });

  // Original-WhatsApp-Weiterleitung ausführen
  originalDispatch();
};

// 2. Befehl: Gästeliste abrufen & Live-Board im Terminal rendern
function showGuestBoard() {
  appendLine("<span class='text-cyan-400 font-bold'>[GÄSTE-RADAR] Lade aktuelle Zusagen aus der Cloud...</span>");
  
  db.ref('rsvps').once('value', snapshot => {
    const data = snapshot.val();
    if (!data) {
      appendLine("<span class='text-neutral-500'>Noch keine Einträge. Sei der Erste!</span>");
      return;
    }

    const guests = Object.values(data);
    let output = `<div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded my-2 text-xs font-mono space-y-2'>`;
    output += `<div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1 flex justify-between'>
                 <span>ANGEMELDETE CREW (${guests.length})</span>
                 <span>PEGEL-PROGNOSE</span>
               </div>`;

    guests.forEach(g => {
      const isDriver = g.drink.includes("Fahrer");
      const statusBadge = isDriver 
        ? `<span class='text-emerald-400 font-bold'>🚗 FAHRER (0,0‰)</span>` 
        : `<span class='text-amber-400'>🥃 ${g.drink}</span>`;
      
      const companion = g.plusOne ? ` <span class='text-neutral-400'>(+1: ${g.plusOneName || 'Begleitung'})</span>` : '';

      output += `
        <div class='flex justify-between items-start py-1 border-b border-neutral-800/50'>
          <div>
            <span class='text-white font-bold'>${escapeHtml(g.name)}</span>${companion}<br>
            <span class='text-[11px] text-neutral-400'>Treibstoff: ${statusBadge}</span>
          </div>
          <div class='text-right'>
            <span class='text-emerald-400 font-bold'>${g.pegel}%</span>
          </div>
        </div>`;
    });

    output += `</div>`;
    appendLine(output);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =====================================================================
   🎵 LIVE MUSIK-RADAR (UPVOTES)
   ===================================================================== */
function openMusicModal() {
  document.getElementById('musicModal').classList.remove('hidden');
  listenToMusicUpdates();
}

function closeMusicModal() {
  document.getElementById('musicModal').classList.add('hidden');
}

// Neuer Song einreichen
function submitSongProposal() {
  const input = document.getElementById('newSongInput');
  const title = input.value.trim();
  if (!title) return;

  const songId = 'song_' + Date.now();
  db.ref('songs/' + songId).set({
    title: title,
    votesCount: 1,
    voters: {
      [myUserToken]: true // Ersteller votet automatisch
    }
  });

  input.value = '';
  showToast("✓ Song hinzugefügt & gevotet!");
}

// Upvote abgeben
function toggleSongVote(songId) {
  const songRef = db.ref('songs/' + songId);
  songRef.transaction(song => {
    if (song) {
      if (!song.voters) song.voters = {};
      
      // Hat dieser User schon gevotet?
      if (song.voters[myUserToken]) {
        // Vote zurücknehmen
        delete song.voters[myUserToken];
        song.votesCount = Math.max(0, (song.votesCount || 1) - 1);
      } else {
        // Vote hinzufügen
        song.voters[myUserToken] = true;
        song.votesCount = (song.votesCount || 0) + 1;
      }
    }
    return song;
  });
}

// Echtzeit-Listener: Aktualisiert die Liste automatisch auf allen Geräten
function listenToMusicUpdates() {
  db.ref('songs').on('value', snapshot => {
    const listEl = document.getElementById('songListContainer');
    if (!listEl) return;

    const data = snapshot.val();
    if (!data) {
      listEl.innerHTML = "<p class='text-xs text-neutral-500 text-center py-4'>Noch keine Songs. Schlag den ersten Track vor!</p>";
      return;
    }

    // Nach Votes sortieren (meiste Stimmen oben)
    const songs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    songs.sort((a, b) => b.votesCount - a.votesCount);

    let html = '';
    songs.forEach(song => {
      const hasVoted = song.voters && song.voters[myUserToken];
      const btnClass = hasVoted 
        ? "bg-emerald-500 text-black font-extrabold shadow-[0_0_10px_#22c55e]" 
        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700";

      html += `
        <div class="flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800">
          <div class="truncate pr-2">
            <span class="text-xs sm:text-sm font-bold text-white block truncate">${escapeHtml(song.title)}</span>
          </div>
          <button onclick="toggleSongVote('${song.id}')" 
                  class="px-3 py-1.5 rounded text-xs transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${btnClass}">
            <span>🔥</span>
            <span>${song.votesCount || 0}</span>
          </button>
        </div>`;
    });

    listEl.innerHTML = html;
  });
}

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

let isSudoRunning = false;

/* =====================================================================
   FX CANVAS ENGINE (VOLLE GRAFIK-POWER)
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
    this.opacity -= 0.009; // Längere Hangtime wiederhergestellt
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
      // Schatten wieder aktiv!
      c.shadowBlur = 10;
      c.shadowColor = this.color;
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
    
    // Satte Laser-Schatten zurück
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 20;
    
    ctx.lineWidth = l.width;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.restore();
    
    l.life -= 0.1; // Laser bleiben etwas länger
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
  ring.style.borderColor = color;
  ring.style.boxShadow = `0 0 40px ${color}, inset 0 0 40px ${color}`; // Extreme Leuchtkraft zurück
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
   RADAR MODAL (HUD)
   ==================================================================== */
let fakeCoordInterval = null;

function openRadarModal() {
  playTone(500, 'sine', 0.08);
  setTimeout(() => playTone(1000, 'sine', 0.1), 90);
  document.getElementById('radarModal').classList.remove('hidden');

  // Hacker-Style: Koordinaten zählen wild hoch
  const coordDisplay = document.getElementById('fakeCoords');
  if (coordDisplay) {
    fakeCoordInterval = setInterval(() => {
      // Generiert einen zufälligen Hex-Code (z.B. 0x4A7F)
      const hex = Math.floor(Math.random() * 65535).toString(16).toUpperCase();
      coordDisplay.textContent = `0x${hex.padStart(4, '0')}`;
    }, 150);
  }
}

function closeRadarModal() {
  document.getElementById('radarModal').classList.add('hidden');
  if (fakeCoordInterval) {
    clearInterval(fakeCoordInterval);
  }
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

/* =====================================================================
   🛑 SUDO KILL-SWITCH (NOT-AUS / SKIP FUNKTION)
   ===================================================================== */
let canSkip = false;

document.addEventListener('click', handleSkipAttempt);
document.addEventListener('touchstart', handleSkipAttempt, { passive: true });

function handleSkipAttempt(e) {
  if (isSudoRunning && canSkip) {
    emergencySkipParty();
  }
}

function emergencySkipParty() {
  // 1. Timeouts und Intervalle killen
  let highestTimeoutId = window.setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) window.clearTimeout(i);
  
  let highestIntervalId = window.setInterval(() => {}, 0);
  for (let i = 0; i < highestIntervalId; i++) window.clearInterval(i);

  // 2. Audio stoppen
  document.querySelectorAll('audio').forEach(a => {
    a.pause();
    a.currentTime = 0;
  });

  // 3. Alle DOM-Elemente (Effekte) der Partys vom Bildschirm fegen
  const fxClasses = [
    '.shockwave-ring', '.splash-text', '.wolle-flannel', '.wolle-karaoke', 
    '.wolle-lighter', '.wolle-band', '.wolle-falling-item', '.wolle-flash',
    '.ramm-darkness', '.ramm-text', '.ramm-sonne-text', '.ramm-flamethrower',
    '.ramm-sun-orb', '.ramm-ember', '.tornado-storm-bg', '.tornado-lightning',
    '.tornado-text', '.tornado-crate', '.sternburg-camo', '.tornado-alert-border',
    '.wind-blast-item', '.vortex-wrapper', '.rage-speedlines', '.ping-pong',
    '.red-cup', '.rage-strobe', '.rage-borders', '.korn-tear', '.brause-bubble',
    '.schuettel-item', '.korn-text', '.rage-text' 
  ];
  
  fxClasses.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove());
  });

  if (window.wolleElements) window.wolleElements = [];
  if (window.rammElements) window.rammElements = [];
  if (window.tornadoElements) window.tornadoElements = [];
  if (window.rageElements) window.rageElements = [];
  if (window.kornElements) window.kornElements = [];

  // 4. Styles und Klassen zurücksetzen
  const root = document.getElementById('bodyRoot');
  root.className = 'h-full flex flex-col justify-between p-2 sm:p-4 select-none relative crt-overlay';
  root.style.transform = 'none';

  const disco = document.getElementById('discoOverlay');
  if (disco) disco.className = "fixed inset-0 pointer-events-none z-40 opacity-0";
  const discoBall = document.getElementById('discoBallElem');
  if (discoBall) discoBall.className = "hidden";

  // 5. Canvas (Konfetti/Laser) säubern
  particles = [];
  lasers = [];
  if (fxAnimFrame) {
    cancelAnimationFrame(fxAnimFrame);
    fxAnimFrame = null;
  }
  const canvas = document.getElementById('fxCanvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  // 6. System normalisieren
  isSudoRunning = false;
  canSkip = false;
  
  appendLine("<span class='text-rose-500 font-extrabold'>[ABBRUCH] Eskalation manuell gestoppt! System normalisiert.</span>");
  playTone(150, 'sawtooth', 0.2);
}

/* =====================================================================
   🎲 SUDO ROULETTE (OHNE DOPPELUNGEN)
   ===================================================================== */
let lastSudoParty = null; // Merkt sich, was als letztes lief

function triggerRandomSudoParty() {
  if (isSudoRunning) {
    showToast("⚠️ System eskaliert bereits!");
    return;
  }
  
  // Liste aller verfügbaren Partys
  const sudoModules = [
    triggerBellaNapoli,
    triggerWollePetry,
    triggerRammstein,
    triggerBiertornado,
    triggerRagecage,
    triggerSchuettelkorn
  ];

  // Filtere die Party heraus, die direkt davor lief
  let availableParties = sudoModules.filter(party => party !== lastSudoParty);
  
  // Sicherheitsnetz (sollte nie passieren, aber sicher ist sicher)
  if (availableParties.length === 0) availableParties = sudoModules;

  // Wähle aus den verbleibenden Partys
  const randomParty = availableParties[Math.floor(Math.random() * availableParties.length)];
  
  // Speichere die aktuelle Wahl für den nächsten Klick
  lastSudoParty = randomParty;
  
  // Abfahrt!
  randomParty();

  canSkip = false;
  setTimeout(() => { canSkip = true; }, 1000);
}