/* =====================================================================
   GEORG v21.0 - KERNEL & MODULES
   ===================================================================== */

// --- 1. FIREBASE INITIALISIERUNG ---
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

// --- 2. GLOBALE HELPER & UI LOGIK ---
function toggleCRT() { 
  document.body.classList.toggle('crt-overlay'); 
  showToast('CRT-Filter umgeschaltet'); 
  playTone(400, 'sine', 0.05); 
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => showToast("Vollbild wird nicht unterstützt."));
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function showToast(msg) { 
  const toast = document.getElementById('toastNotification'); 
  toast.textContent = msg; 
  toast.style.opacity = '1'; 
  setTimeout(() => toast.style.opacity = '0', 2200); 
}

function escapeHtml(text) { 
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]); 
}

function appendLine(html, delay = 0) {
  setTimeout(() => {
    const out = document.getElementById('terminalOutput');
    if (!out) return; 
    const line = document.createElement('div'); 
    line.innerHTML = html;
    out.appendChild(line); 
    out.scrollTop = out.scrollHeight;
    playTone(1300 + Math.random() * 300, 'sine', 0.015, 0.02);
  }, delay);
}

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
  window.addEventListener('click', unlockAudio); window.addEventListener('touchstart', unlockAudio, { passive: true });
}

// --- 3. ROOT-STYLES FÜR DIE IFRAMES BEREITSTELLEN ---
const rootStyles = document.createElement('style');
rootStyles.innerHTML = `
  .cam-zoom-in { transform: perspective(800px) scale(1.15) translate3d(0, 0, 50px); transition: 0.1s; }
  .cam-zoom-out { transform: perspective(800px) scale(0.9) translate3d(0, 0, -50px); transition: 0.1s; }
  .cam-tilt-left { transform: perspective(800px) rotateZ(-6deg) rotateY(-15deg) scale(1.1); transition: 0.1s; }
  .cam-tilt-right { transform: perspective(800px) rotateZ(6deg) rotateY(15deg) scale(1.1); transition: 0.1s; }
  .cam-speed-shake { animation: speedShake 0.1s infinite linear; }
  @keyframes speedShake { 0%, 100% { transform: translate3d(5px, 5px, 0); } 25% { transform: translate3d(-5px, -5px, 0); } 50% { transform: translate3d(-5px, 5px, 0); } 75% { transform: translate3d(5px, -5px, 0); } }
  .ramm-quake { animation: rammHeavyShake 0.1s infinite; transform-origin: center; }
  @keyframes rammHeavyShake { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(-10px, 8px) rotate(-1deg); } 50% { transform: translate(10px, -8px) rotate(1deg); } 75% { transform: translate(-8px, -6px) rotate(0deg); } }
  .wolle-3d-tilt { transform-style: preserve-3d; transform: perspective(800px) rotateX(15deg) scale(0.9); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .wolle-schunkel { animation: schunkelSway 2.5s ease-in-out infinite alternate; transform-origin: bottom center; }
  .wolle-hyper-schunkel { animation: hyperSway 1.2s ease-in-out infinite alternate; transform-origin: bottom center; }
  @keyframes schunkelSway { 0% { transform: rotate(-5deg) translateX(-20px); } 100% { transform: rotate(5deg) translateX(20px); } }
  @keyframes hyperSway { 0% { transform: perspective(800px) rotateX(10deg) rotateZ(-8deg) translateX(-40px) scale(1.1); } 100% { transform: perspective(800px) rotateX(10deg) rotateZ(8deg) translateX(40px) scale(1.1); } }
  .korn-sad-mode { filter: grayscale(0.8) sepia(0.5) hue-rotate(180deg) brightness(0.7); transition: filter 2s ease-out; }
  .brause-mode { filter: saturate(3) hue-rotate(290deg) contrast(1.5) !important; transition: filter 0.2s; }
  .brause-mode-green { filter: saturate(3) hue-rotate(90deg) contrast(1.5) !important; }
`;
document.head.appendChild(rootStyles);

// Globale Freigabe für Iframes
window.appendLine = appendLine;
window.playTone = playTone;

// --- 4. NOT-AUS SYSTEM (IFRAME KILLER) ---
document.addEventListener('click', () => { if (window.isSudoRunning && window.canSkip) emergencySkipParty(); });
document.addEventListener('touchstart', () => { if (window.isSudoRunning && window.canSkip) emergencySkipParty(); }, { passive: true });

function emergencySkipParty() {
  window.isSudoRunning = false;
  window.canSkip = false;
  playTone(150, 'sawtooth', 0.2);

  // IFRAME VERNICHTEN
  const frame = document.getElementById('sudoIframe');
  if (frame) frame.remove();

  // Root-Element zurücksetzen
  const root = document.getElementById('bodyRoot');
  if (root) {
    root.className = 'h-full flex flex-col justify-between select-none relative crt-overlay bg-neutral-950 pb-20 overflow-hidden';
    root.style.transform = 'none';
  }

  // UI wiederherstellen
  const actionBar = document.getElementById('actionbar');
  const cmdGrid = document.getElementById('commandGrid');
  if (actionBar) actionBar.style.display = 'flex';
  if (cmdGrid) cmdGrid.style.pointerEvents = 'auto';

  appendLine("<span class='text-emerald-400 font-bold'>[SYSTEM] Eskalation abgebrochen. System stabil.</span>");
}

// --- 5. SUDO ROULETTE LOGIK (IFRAME BASIERT) ---
let lastSudoParty = null;

function triggerRandomSudoParty() {
  if (window.isSudoRunning) { showToast("⚠️ System eskaliert bereits!"); return; }
  
  const actionBar = document.getElementById('actionbar');
  const cmdGrid = document.getElementById('commandGrid');
  if (actionBar) actionBar.style.display = 'none'; 
  if (cmdGrid) cmdGrid.style.pointerEvents = 'none'; 
  
  const sudoModules = [
    'sudo_bella.html', 'sudo_wolle.html', 'sudo_rammstein.html', 
    'sudo_biertornado.html', 'sudo_ragecage.html', 'sudo_schuettelkorn.html'
  ];

  let available = sudoModules.filter(p => p !== lastSudoParty);
  if (!available.length) available = sudoModules;
  lastSudoParty = available[Math.floor(Math.random() * available.length)];
  
  window.isSudoRunning = true;
  window.canSkip = false;
  setTimeout(() => window.canSkip = true, 1000);

 // IFRAME ÜBER DIE SEITE LEGEN
  const iframe = document.createElement('iframe');
  iframe.id = 'sudoIframe';
  iframe.src = `sudo_frames/${lastSudoParty}`;
  iframe.className = "fixed inset-0 w-full h-full z-[99999] border-none pointer-events-none"; 
  
  // WICHTIG: Das macht den Iframe komplett durchsichtig!
  iframe.allowTransparency = "true";
  iframe.setAttribute("allowtransparency", "true");
  iframe.style.backgroundColor = "transparent"; // <--- HIER ÄNDERN!
  
  iframe.allow = "autoplay";
  document.body.appendChild(iframe);

  // Listener für das reguläre Ende
  const handleSudoFinish = (event) => {
    if (event.data === "sudo_finished") {
      window.removeEventListener("message", handleSudoFinish);
      if (window.isSudoRunning) emergencySkipParty();
    }
  };
  window.addEventListener("message", handleSudoFinish);
}

// --- 6. AUDIO ENGINE ---
let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  const icon = document.getElementById('soundIcon');
  if (soundEnabled) { icon.textContent = '🔊'; showToast('Sound aktiviert'); playTone(880, 'sine', 0.1); } 
  else { icon.textContent = '🔇'; showToast('Sound stumm'); }
}

function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
  if (!soundEnabled) return;
  try {
    const context = getAudioContext(); if (!context) return;
    const osc = context.createOscillator(); const gain = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, context.currentTime);
    gain.gain.setValueAtTime(gainVal, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(context.currentTime + duration);
  } catch (e) {}
}

function playBuzzerError() {
  if (!soundEnabled) return;
  try {
    const context = getAudioContext(); if (!context) return;
    const osc = context.createOscillator(); const gain = context.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(130, context.currentTime); osc.frequency.linearRampToValueAtTime(80, context.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(context.currentTime + 0.25);
  } catch (e) {}
}

function playSuccessChime() {
  if (!soundEnabled) return;
  [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.14, 0.08), i * 90));
}

// --- 7. TERMINAL BEFEHLE ---
let commandsCollapsed = false;
function toggleCommands() {
  commandsCollapsed = !commandsCollapsed;
  const grid = document.getElementById('commandGrid');
  const toggleBtn = document.getElementById('cmdToggleBtn');
  if (commandsCollapsed) {
    grid.className = "grid grid-cols-8 gap-1 relative";
    toggleBtn.innerHTML = "<span>▲</span> AUSKLAPPEN";
    document.querySelectorAll('.cmd-text').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.cmd-btn').forEach(b => { b.classList.remove('py-2'); b.classList.add('py-1.5'); });
  } else {
    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-1.5 transition-all relative";
    toggleBtn.innerHTML = "<span>▼</span> EINKLAPPEN";
    document.querySelectorAll('.cmd-text').forEach(t => t.classList.remove('hidden'));
    document.querySelectorAll('.cmd-btn').forEach(b => { b.classList.remove('py-1.5'); b.classList.add('py-2'); });
  }
}

function runCommand(cmd) {
  playTone(650, 'sine', 0.05);
  switch(cmd) {
    case 'info': appendLine(`<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>📅 Wann: ${CONFIG.party.date}<br>⏰ Uhrzeit: ${CONFIG.party.time}<br>🏠 Wo: ${CONFIG.party.location}</div>`); break;
    case 'mathe': appendLine(`<div class='bg-neutral-900 p-3 rounded border border-yellow-600/70 text-xs text-yellow-300 font-mono'>Sei N die Menge aller Gäste. &forall; x &isin; N gilt: lim<sub>t &rarr; 03:00</sub> Promille(x) &ge; 1.8. q.e.d.</div>`); break;
    case 'shot_roulette': 
      const shot = CONFIG.shotsList[Math.floor(Math.random() * CONFIG.shotsList.length)]; 
      playTone(400, 'sawtooth', 0.08); setTimeout(() => playTone(800, 'sawtooth', 0.12), 100);
      appendLine(`<div class='bg-amber-950/50 p-2.5 rounded border border-amber-500 text-xs text-amber-200'>🎲 SHOT-ROULETTE: 👉 ${shot}</div>`); 
      break;
    case 'geschenke': appendLine(`<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>🎁 Bringt einfach gute Laune mit!</div>`); break;
  }
}

// --- 8. ABSAGEN-MINI-GAME (Das Fiech) ---
let declineCount = 0;
let fleeInterval = null;
let currentRotation = 0;

function moveDeclineButton() {
  const btn = document.getElementById('declineBtn');
  if (!btn) return;
  const maxLeft = window.innerWidth - 80;
  const maxTop = window.innerHeight - 100; 
  const minLeft = 10, minTop = 60;       
  btn.style.left = (minLeft + Math.random() * (maxLeft - minLeft)) + 'px';
  btn.style.top = (minTop + Math.random() * (maxTop - minTop)) + 'px';
}

function handleDeclineClick() {
  declineCount++; 
  playBuzzerError(); 
  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); 

  const btn = document.getElementById('declineBtn');
  const root = document.getElementById('bodyRoot');
  
  if (declineCount === 1) {
    document.getElementById('declineWrapper').classList.remove('flex-1');
    document.getElementById('declineWrapper').classList.add('w-14', 'shrink-0');
    btn.className = "absolute inset-0 w-full h-full btn-fiech active:scale-95 transition-all duration-300 z-[60]";
    btn.innerHTML = `<div class="monster-eye left"></div><div class="monster-eye right"></div><span class="text-3xl font-black relative z-10 leading-none" style="color: black;">X</span><div class="monster-leg left"></div><div class="monster-leg right"></div>`;
    return; 
  } else if (declineCount < CONFIG.game.phase2_clicks) {
    btn.classList.add('shake-denied'); 
    setTimeout(() => btn.classList.remove('shake-denied'), 350);
  }
  
  appendLine(`<span class='text-rose-400 font-bold'>[ABGELEHNT #${declineCount}] System verweigert die Eingabe.</span>`);

  if (declineCount >= CONFIG.game.phase2_clicks && declineCount < CONFIG.game.phase3_clicks) moveDeclineButton();
  if (declineCount >= CONFIG.game.phase3_clicks && declineCount < CONFIG.game.phase5_clicks) {
    currentRotation += 180;
    document.documentElement.style.setProperty('--game-rot', `${currentRotation}deg`);
    moveDeclineButton();
  }

  if (declineCount === CONFIG.game.phase2_clicks) {
    document.getElementById('declineGhost').style.opacity = '1';
    const rect = btn.getBoundingClientRect();
    btn.style.width = '55px'; btn.style.height = '45px';
    btn.style.left = rect.left + 'px'; btn.style.top = rect.top + 'px';
    btn.style.position = 'absolute'; btn.style.zIndex = '9999';
    document.body.appendChild(btn);
    requestAnimationFrame(() => { btn.classList.add('awake', 'flee-slow'); moveDeclineButton(); });
    appendLine("<span class='text-cyan-400 font-extrabold text-sm mt-2'>[PHASE 2] Fiech ist erwacht. Fang es!</span>");
    return;
  }

  if (declineCount === CONFIG.game.phase3_clicks) {
    appendLine("<span class='text-fuchsia-400 font-extrabold text-sm mt-2'>[PHASE 3] GRAVITATIONS-ANOMALIE ENTDECKT!</span>");
    fleeInterval = setInterval(() => { moveDeclineButton(); playTone(500, 'sine', 0.05, 0.01); }, CONFIG.game.jumpIntervalSlow);
    return;
  }

  if (declineCount === CONFIG.game.phase4_clicks) {
    appendLine("<span class='text-amber-400 font-extrabold text-sm mt-2'>[PHASE 4] PANIK-MODUS! BILDSCHIRM WIRD INSTABIL!</span>");
    root.classList.add('egg-drunk'); 
    btn.classList.remove('flee-slow'); btn.classList.add('flee-fast'); 
    clearInterval(fleeInterval);
    fleeInterval = setInterval(() => { moveDeclineButton(); playTone(800, 'sawtooth', 0.05, 0.02); }, CONFIG.game.jumpIntervalFast);
    return;
  }

  if (declineCount === CONFIG.game.phase5_clicks) {
    clearInterval(fleeInterval); 
    appendLine("<span class='text-emerald-400 font-extrabold text-sm mt-2'>[PHASE 5] BOSS FIGHT INITIIERT...</span>");
    showToast("BOSS FIGHT INITIATED");
    setTimeout(() => {
      root.classList.remove('egg-rotate', 'egg-drunk');
      currentRotation = 0; document.documentElement.style.setProperty('--game-rot', '0deg');
      btn.classList.remove('btn-fiech', 'awake', 'flee-slow', 'flee-fast');
      document.getElementById('declineWrapper').appendChild(btn);
      btn.innerHTML = `<span id="declineIcon">❌</span> <span id="declineText">ABSAGEN</span>`;
      btn.className = "absolute inset-0 w-full h-full rounded-lg border border-rose-900/50 bg-rose-950/40 text-rose-400 font-bold active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm z-[60] shadow-md";
      document.getElementById('declineWrapper').classList.remove('w-14', 'shrink-0');
      document.getElementById('declineWrapper').classList.add('flex-1');
      document.getElementById('declineGhost').style.opacity = '0';
      declineCount = 0;
      appendLine("<span class='text-emerald-400 font-bold'>[SYSTEM] Neustart erfolgreich.</span>");
    }, 5000);
    return;
  }
}

// --- 9. MODALS & FIREBASE LOGIK ---
let fakeCoordInterval = null;
function openRadarModal() { playTone(500, 'sine', 0.08); document.getElementById('radarModal').classList.remove('hidden'); fakeCoordInterval = setInterval(() => { document.getElementById('fakeCoords').textContent = `0x${Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')}`; }, 150); }
function closeRadarModal() { document.getElementById('radarModal').classList.add('hidden'); clearInterval(fakeCoordInterval); }
function copyAddressToClipboard() { navigator.clipboard.writeText(CONFIG.party.location).then(() => { showToast("✓ Adresse kopiert!"); playSuccessChime(); }); }

function openMusicModal() { document.getElementById('musicModal').classList.remove('hidden'); listenToMusicUpdates(); }
function closeMusicModal() { document.getElementById('musicModal').classList.add('hidden'); }
function submitSongProposal() { const input = document.getElementById('newSongInput'); const title = input.value.trim(); if (!title) return; db.ref('songs/song_' + Date.now()).set({ title: title, votesCount: 1, voters: { [myUserToken]: true } }); input.value = ''; showToast("✓ Song hinzugefügt!"); }
function toggleSongVote(songId) { db.ref('songs/' + songId).transaction(song => { if (song) { if (!song.voters) song.voters = {}; if (song.voters[myUserToken]) { delete song.voters[myUserToken]; song.votesCount = Math.max(0, (song.votesCount || 1) - 1); } else { song.voters[myUserToken] = true; song.votesCount = (song.votesCount || 0) + 1; } } return song; }); }
function listenToMusicUpdates() { db.ref('songs').on('value', snapshot => { const listEl = document.getElementById('songListContainer'); if (!listEl) return; const data = snapshot.val(); if (!data) { listEl.innerHTML = "<p class='text-xs text-neutral-500 text-center py-4'>Noch keine Songs.</p>"; return; } const songs = Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a, b) => b.votesCount - a.votesCount); listEl.innerHTML = songs.map(song => `<div class="flex justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800"><span class="text-xs font-bold text-white truncate pr-2">${escapeHtml(song.title)}</span><button onclick="toggleSongVote('${song.id}')" class="px-3 py-1.5 rounded text-xs ${song.voters && song.voters[myUserToken] ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'}">🔥 ${song.votesCount || 0}</button></div>`).join(''); }); }

function openRsvpModal() { playTone(587, 'sine', 0.08); document.getElementById('rsvpModal').classList.remove('hidden'); updatePegelDisplay(document.getElementById('rsvpPegel').value); }
function closeRsvpModal() { document.getElementById('rsvpModal').classList.add('hidden'); }
function togglePlusOneInput() { document.getElementById('plusOneContainer').classList.toggle('hidden', !document.getElementById('rsvpPlusOneToggle').checked); if(document.getElementById('rsvpPlusOneToggle').checked) { document.getElementById('rsvpPlusOneName').focus(); playTone(700, 'sine', 0.05); } }
function updatePegelDisplay(val) { document.getElementById('pegelValueBadge').textContent = `Pegel: ${val}%`; document.getElementById('pegelDescription').textContent = CONFIG.pegelDescriptions[val]; playTone(220 + val * 5, 'sine', 0.02, 0.03); }
function dispatchRsvpWhatsApp() { const name = document.getElementById('rsvpName').value.trim(); if (!name) { playBuzzerError(); showToast("⚠️ Bitte gib zuerst deinen Namen ein!"); document.getElementById('rsvpName').focus(); return; } const hasPlusOne = document.getElementById('rsvpPlusOneToggle').checked; const plusOneName = document.getElementById('rsvpPlusOneName').value.trim(); const drink = document.getElementById('rsvpDrink').value; const pegelVal = document.getElementById('rsvpPegel').value; db.ref('rsvps/' + myUserToken).set({ name, plusOne: hasPlusOne, plusOneName, drink, pegel: pegelVal, gift: document.getElementById('rsvpGift').value.trim(), timestamp: Date.now() }); const waMsg = `🚨 Zusage für deinen 21. Geburtstag! 🚨\nMoin ${CONFIG.party.hostName},\n\nBin dabei!\n👤 Name: ${name}\n👥 Begleitung: ${hasPlusOne ? (plusOneName || 'Ja') : 'Nein'}\n⛽ Getränk: ${drink}\n📊 Pegel: ${CONFIG.pegelDescriptions[pegelVal]}`; playSuccessChime(); closeRsvpModal(); window.open(`https://wa.me/${(CONFIG.party.phone).replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`, '_blank'); }
function showGuestBoard() { appendLine("<span class='text-cyan-400 font-bold'>[GÄSTE-RADAR] Lade Daten...</span>"); db.ref('rsvps').once('value', snap => { if (!snap.val()) return appendLine("<span class='text-neutral-500'>Noch keine Einträge.</span>"); const guests = Object.values(snap.val()); appendLine(`<div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded my-2 text-xs font-mono space-y-2'><div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1'>ANGEMELDETE CREW (${guests.length})</div>${guests.map(g => `<div class='flex justify-between py-1 border-b border-neutral-800/50'><div><span class='text-white font-bold'>${escapeHtml(g.name)}</span><br><span class='text-[11px] text-neutral-400'>${g.drink}</span></div><span class='text-emerald-400 font-bold'>${g.pegel}%</span></div>`).join('')}</div>`); }); }

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  startBootSequence();
});