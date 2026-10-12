/* =====================================================================
   ⌨️ MODUL: TERMINAL BEFEHLE
   ===================================================================== */

function runCommand(cmd) {
  playTone(650, 'sine', 0.05);
  switch(cmd) {
    case 'info': 
      appendLine(`<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>📅 Wann: ${CONFIG.party.date}<br>⏰ Uhrzeit: ${CONFIG.party.time}<br>🏠 Wo: ${CONFIG.party.location}</div>`); 
      break;
    case 'mathe': 
      appendLine(`<div class='bg-neutral-900 p-3 rounded border border-yellow-600/70 text-xs text-yellow-300 font-mono'>Sei N die Menge aller Gäste. &forall; x &isin; N gilt: lim<sub>t &rarr; 03:00</sub> Promille(x) &ge; 1.8. q.e.d.</div>`); 
      break;
    case 'shot_roulette': 
      const shot = CONFIG.shotsList[Math.floor(Math.random() * CONFIG.shotsList.length)]; playTone(400, 'sawtooth', 0.08); setTimeout(() => playTone(800, 'sawtooth', 0.12), 100);
      appendLine(`<div class='bg-amber-950/50 p-2.5 rounded border border-amber-500 text-xs text-amber-200'>🎲 SHOT-ROULETTE: 👉 ${shot}</div>`); 
      break;
    case 'geschenke': 
      appendLine(`<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>🎁 Bringt einfach gute Laune mit!</div>`); 
      break;
  }
}

/* =====================================================================
   🔽 UI-TOGGLE: BEFEHLE EINKLAPPEN
   ===================================================================== */
let commandsCollapsed = false;

function toggleCommands() {
  commandsCollapsed = !commandsCollapsed;
  const grid = document.getElementById('commandGrid');
  const toggleBtn = document.getElementById('cmdToggleBtn');
  const texts = document.querySelectorAll('.cmd-text');
  const btns = document.querySelectorAll('.cmd-btn');
  
  if (commandsCollapsed) {
    grid.className = "grid grid-cols-8 gap-1";
    toggleBtn.innerHTML = "<span>▲</span> AUSKLAPPEN";
    texts.forEach(t => t.classList.add('hidden'));
    btns.forEach(b => { b.classList.remove('py-2'); b.classList.add('py-1.5'); });
  } else {
    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-1.5";
    toggleBtn.innerHTML = "<span>▼</span> EINKLAPPEN";
    texts.forEach(t => t.classList.remove('hidden'));
    btns.forEach(b => { b.classList.remove('py-1.5'); b.classList.add('py-2'); });
  }
}

/* =====================================================================
   🎲 SUDO ROULETTE & UI-SPERRE
   ===================================================================== */
function triggerRandomSudoParty() {
  if (isSudoRunning) { showToast("⚠️ System eskaliert bereits!"); return; }
  
  // 1. UI SPERREN (Verhindert fehlerhafte Klicks während der Animation)
  const actionBar = document.getElementById('actionbar');
  const cmdGrid = document.getElementById('commandGrid');
  
  if (actionBar) actionBar.style.display = 'none'; // Untere Leiste verschwindet
  if (cmdGrid) cmdGrid.style.pointerEvents = 'none'; // Gitter ist nicht mehr klickbar
  
  // 2. Party auswählen und starten
  const sudoModules = [triggerBellaNapoli, triggerWollePetry, triggerRammstein, triggerBiertornado, triggerRagecage, triggerSchuettelkorn];
  let available = sudoModules.filter(p => p !== lastSudoParty);
  if (!available.length) available = sudoModules;
  lastSudoParty = available[Math.floor(Math.random() * available.length)];
  
  lastSudoParty(); 
  
  canSkip = false; 
  setTimeout(() => { canSkip = true; }, 1000); // Abbruch erst nach 1 Sekunde erlaubt

  // 3. WÄCHTER: Prüft, wann die Party vorbei ist und stellt die UI wieder her
  const sudoWatcher = setInterval(() => {
    if (!isSudoRunning) {
      if (actionBar) actionBar.style.display = 'flex';
      if (cmdGrid) cmdGrid.style.pointerEvents = 'auto';
      clearInterval(sudoWatcher);
    }
  }, 500);
}