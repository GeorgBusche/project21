/* =====================================================================
   🎫 MODUL: RSVP (ZUSAGEN) & GÄSTELISTE
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
  document.getElementById('plusOneContainer').classList.toggle('hidden', !document.getElementById('rsvpPlusOneToggle').checked); 
  if(document.getElementById('rsvpPlusOneToggle').checked) { 
    document.getElementById('rsvpPlusOneName').focus(); 
    playTone(700, 'sine', 0.05); 
  } 
}

function updatePegelDisplay(val) { 
  document.getElementById('pegelValueBadge').textContent = `Pegel: ${val}%`; 
  document.getElementById('pegelDescription').textContent = CONFIG.pegelDescriptions[val]; 
  playTone(220 + val * 5, 'sine', 0.02, 0.03); 
}

function dispatchRsvpWhatsApp() {
  const name = document.getElementById('rsvpName').value.trim();
  if (!name) { playBuzzerError(); showToast("⚠️ Bitte gib zuerst deinen Namen ein!"); document.getElementById('rsvpName').focus(); return; }
  
  const hasPlusOne = document.getElementById('rsvpPlusOneToggle').checked;
  const plusOneName = document.getElementById('rsvpPlusOneName').value.trim();
  const drink = document.getElementById('rsvpDrink').value; 
  const pegelVal = document.getElementById('rsvpPegel').value;
  
  // 1. Firebase Save
  db.ref('rsvps/' + myUserToken).set({ 
    name, 
    plusOne: hasPlusOne, 
    plusOneName, 
    drink, 
    pegel: pegelVal, 
    gift: document.getElementById('rsvpGift').value.trim(), 
    timestamp: Date.now() 
  });
  
  // 2. WhatsApp Format
  const waMsg = `🚨 Zusage für deinen 21. Geburtstag! 🚨\nMoin ${CONFIG.party.hostName},\n\nBin dabei!\n👤 Name: ${name}\n👥 Begleitung: ${hasPlusOne ? (plusOneName || 'Ja') : 'Nein'}\n⛽ Getränk: ${drink}\n📊 Pegel: ${CONFIG.pegelDescriptions[pegelVal]}`;
  
  playSuccessChime(); 
  closeRsvpModal(); 
  window.open(`https://wa.me/${(CONFIG.party.phone).replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`, '_blank');
}

function showGuestBoard() {
  appendLine("<span class='text-cyan-400 font-bold'>[GÄSTE-RADAR] Lade Daten...</span>");
  
  db.ref('rsvps').once('value', snap => {
    if (!snap.val()) return appendLine("<span class='text-neutral-500'>Noch keine Einträge.</span>");
    
    const guests = Object.values(snap.val());
    appendLine(`
      <div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded my-2 text-xs font-mono space-y-2'>
        <div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1'>ANGEMELDETE CREW (${guests.length})</div>
        ${guests.map(g => `
          <div class='flex justify-between py-1 border-b border-neutral-800/50'>
            <div>
              <span class='text-white font-bold'>${escapeHtml(g.name)}</span><br>
              <span class='text-[11px] text-neutral-400'>${g.drink}</span>
            </div>
            <span class='text-emerald-400 font-bold'>${g.pegel}%</span>
          </div>
        `).join('')}
      </div>
    `);
  });
}