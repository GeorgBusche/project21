/* =====================================================================
   👾 MODUL: ABSAGEN-MINI-GAME (DAS FIECH)
   ===================================================================== */
let declineCount = 0;
let fleeInterval = null;
let trailInterval = null;
let isGameActive = false;
let currentRotation = 0; // Speichert den aktuellen Drehwinkel

const denyTexts = ["ZUGRIFF<br>VERWEIGERT", "FEHLER 403:<br>NÖ.", "MUTTI SAGT<br>NEIN", "NETTER<br>VERSUCH", "TRÄUM<br>WEITER"];

// --- 1. Verbesserte Bewegungs-Engine (Weiter & Unberechenbarer) ---
function moveDeclineButton() {
  const btn = document.getElementById('declineBtn');
  if (!btn) return;
  
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // Nutzt jetzt fast den gesamten Bildschirm aus (auch weiter oben)
  const maxLeft = vw - 70;
  const maxTop = vh - 90; 
  const minLeft = 10;
  const minTop = 60;       
  
  btn.style.left = (minLeft + Math.random() * (maxLeft - minLeft)) + 'px';
  btn.style.top = (minTop + Math.random() * (maxTop - minTop)) + 'px';
}

function spawnTrailParticle(x, y) {
  const p = document.createElement('div');
  p.className = 'trail-particle';
  p.style.width = '20px'; p.style.height = '20px';
  
  // Mathematische Korrektur: Invertiert die Koordinaten, wenn der Bildschirm auf dem Kopf steht
  let isFlipped = Math.abs((currentRotation / 180) % 2) === 1;
  
  if (isFlipped) {
    p.style.left = (window.innerWidth - x - 35) + 'px';
    p.style.top = (window.innerHeight - y - 35) + 'px';
  } else {
    p.style.left = (x + 15) + 'px';
    p.style.top = (y + 15) + 'px';
  }
  
  document.body.appendChild(p);
  requestAnimationFrame(() => { p.style.opacity = '0'; p.style.transform = 'scale(0.3)'; });
  setTimeout(() => { if(p.parentNode) p.remove(); }, 800);
}

function startTrail() {
  if (trailInterval) return;
  trailInterval = setInterval(() => {
    const btn = document.getElementById('declineBtn');
    if (btn && btn.classList.contains('btn-fiech') && declineCount >= 4) {
      const rect = btn.getBoundingClientRect();
      spawnTrailParticle(rect.left, rect.top);
    }
  }, 40);
}

// --- 3. Die aktualisierte Klick-Logik ---
function handleDeclineClick() {
  declineCount++; 
  playBuzzerError(); 
  if (navigator.vibrate) navigator.vibrate([100, 50, 200]); 

  const btn = document.getElementById('declineBtn');
  const root = document.getElementById('bodyRoot');
  
  // === PHASE 1 (Klick 1): Verwandlung ins schlafende Fiech ===
  if (declineCount === 1) {
    document.getElementById('declineWrapper').classList.remove('flex-1');
    document.getElementById('declineWrapper').classList.add('w-14', 'shrink-0');
    
    btn.className = "absolute inset-0 w-full h-full btn-fiech active:scale-95 transition-all duration-300 z-[60]";
    btn.innerHTML = `
      <div class="monster-eye left"></div><div class="monster-eye right"></div>
      <span class="text-3xl font-black relative z-10 leading-none" style="color: black;">X</span>
      <div class="monster-leg left"></div><div class="monster-leg right"></div>
    `;
    return; 
  } else if (declineCount < 4) {
    btn.classList.add('shake-denied'); 
    setTimeout(() => btn.classList.remove('shake-denied'), 350);
  }
  
  appendLine(`<span class='text-rose-400 font-bold'>[ABGELEHNT #${declineCount}] System verweigert die Eingabe.</span>`);

  // === SOFORTIGER SPRUNG BEI JEDEM KLICK (Ab Phase 2) ===
  if (declineCount >= 4 && declineCount < 7) {
    moveDeclineButton(); // Springt direkt weg, wenn man ihn anklickt!
  }

  // === ROTATION BEI JEDEM TREFFER (Ab Phase 3) ===
  if (declineCount >= 7 && declineCount < 15) {
    currentRotation += 180;
    document.documentElement.style.setProperty('--game-rot', `${currentRotation}deg`);
    moveDeclineButton(); // Sofortiger Sprung bei Treffer
  }

  // === PHASE 2 (Klick 4): Das Fiech erwacht ===
  if (declineCount === 4) {
    isGameActive = true;
    document.getElementById('declineGhost').style.opacity = '1';
    
    const rect = btn.getBoundingClientRect();
    btn.style.width = '55px'; btn.style.height = '45px';
    btn.style.left = rect.left + 'px'; btn.style.top = rect.top + 'px';
    btn.style.position = 'absolute'; btn.style.zIndex = '9999';
    document.body.appendChild(btn);
    
    requestAnimationFrame(() => {
      btn.classList.add('awake', 'flee-slow'); 
      startTrail();
      moveDeclineButton();
    });
    
    appendLine("<span class='text-cyan-400 font-extrabold text-sm mt-2'>[PHASE 2] Fiech ist erwacht. Fang es!</span>");
    return;
  }

  // === PHASE 3 (Klick 7): Langsames Auto-Movement & Rotation ===
  if (declineCount === 7) {
    appendLine("<span class='text-fuchsia-400 font-extrabold text-sm mt-2'>[PHASE 3] GRAVITATIONS-ANOMALIE ENTDECKT!</span>");
    root.classList.add('egg-rotate');
    
    fleeInterval = setInterval(() => {
      moveDeclineButton();
      playTone(500, 'sine', 0.05, 0.01);
    }, 1100);
    return;
  }

  // === PHASE 4 (Klick 11): Panik-Modus (Etwas fairer, aber wilder) ===
  if (declineCount === 11) {
    appendLine("<span class='text-amber-400 font-extrabold text-sm mt-2'>[PHASE 4] PANIK-MODUS! BILDSCHIRM WIRD INSTABIL!</span>");
    root.classList.add('egg-drunk'); 
    
    btn.classList.remove('flee-slow');
    btn.classList.add('flee-fast'); 
    
    clearInterval(fleeInterval);
    fleeInterval = setInterval(() => {
      moveDeclineButton();
      playTone(800, 'sawtooth', 0.05, 0.02);
    }, 700); // 700ms ist knackig, aber auf dem Handy machbar
    return;
  }

  // === PHASE 5 (Klick 15): Der Endboss ===
  if (declineCount === 15) {
    clearInterval(fleeInterval); 
    appendLine("<span class='text-emerald-400 font-extrabold text-sm mt-2'>[PHASE 5] BOSS FIGHT INITIIERT...</span>");
    triggerEastereggSudo();
    return;
  }

  if (declineCount > 15) return;

  // === VOLLBILD-GLITCH (Phase 1) ===
  if (declineCount < 4) {
    const glitch = document.createElement('div');
    glitch.className = 'fixed inset-0 z-[99999] bg-red-600/30 backdrop-blur-sm pointer-events-none flex items-center justify-center overflow-hidden';
    glitch.style.animation = 'glitchFlash 0.6s both';
    
    const stamp = document.createElement('div');
    stamp.className = 'font-black uppercase text-center leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,1)]';
    stamp.style.fontFamily = 'Impact, sans-serif'; stamp.style.fontSize = 'clamp(3rem, 15vw, 8rem)';
    stamp.style.color = '#ef4444'; stamp.style.WebkitTextStroke = '2px #000'; 
    stamp.style.animation = 'stampIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    stamp.innerHTML = denyTexts[Math.floor(Math.random() * denyTexts.length)];
    
    glitch.appendChild(stamp); document.body.appendChild(glitch);
    setTimeout(() => glitch.remove(), 600);
  }
}

// === BOSS PLATZHALTER (Mit Resets für die neuen Variablen) ===
function triggerEastereggSudo() {
  showToast("BOSS FIGHT INITIATED");
  
  setTimeout(() => {
    const root = document.getElementById('bodyRoot');
    const btn = document.getElementById('declineBtn');
    
    root.classList.remove('egg-rotate', 'egg-drunk');
    currentRotation = 0;
    document.documentElement.style.setProperty('--game-rot', '0deg');
    
    btn.classList.remove('btn-fiech', 'awake', 'flee-slow', 'flee-fast');
    document.getElementById('declineWrapper').appendChild(btn);
    btn.innerHTML = `<span id="declineIcon">❌</span> <span id="declineText">ABSAGEN</span>`;
    btn.className = "absolute inset-0 w-full h-full rounded-lg border border-rose-900/50 bg-rose-950/40 text-rose-400 font-bold active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base z-[60] shadow-md";
    
    document.getElementById('declineWrapper').classList.remove('w-14', 'shrink-0');
    document.getElementById('declineWrapper').classList.add('flex-1');
    document.getElementById('declineGhost').style.opacity = '0';
    
    declineCount = 0; isGameActive = false;
    clearInterval(trailInterval); trailInterval = null;
    appendLine("<span class='text-emerald-400 font-bold'>[SYSTEM] Neustart erfolgreich.</span>");
  }, 5000);
}