/* =====================================================================
   ⌨️ MODUL: TERMINAL BEFEHLE & ABSAGEN
   ===================================================================== */

let declineCount = 0;

function handleDeclineClick() {
  declineCount++; playBuzzerError(); if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  const btn = document.getElementById('declineBtn');
  btn.classList.add('shake-denied'); setTimeout(() => btn.classList.remove('shake-denied'), 350);
  
  appendLine(`<span class='text-rose-400 font-bold'>[ABGELEHNT #${declineCount}] ${CONFIG.declinePhrases[(declineCount - 1) % CONFIG.declinePhrases.length]}</span>`);
  
  if (declineCount < 5) {
    btn.innerText = `❌ NICHT MÖGLICH (${5 - declineCount})`;
  } else {
    btn.innerText = "🏳️ KAPITULATION: ICH KOMME!"; 
    btn.className = "px-3 py-2 rounded bg-emerald-500 text-black font-extrabold shadow-[0_0_15px_#22c55e]";
    btn.onclick = () => { appendLine("<span class='text-emerald-300 font-bold'>[ERFOLG] Vernunft siegt!</span>"); openRsvpModal(); };
  }
}

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