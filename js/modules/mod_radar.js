/* =====================================================================
   📡 MODUL: TAKTISCHES RADAR (MAPS)
   ===================================================================== */

let fakeCoordInterval = null;

function openRadarModal() { 
  playTone(500, 'sine', 0.08); 
  document.getElementById('radarModal').classList.remove('hidden'); 
  
  fakeCoordInterval = setInterval(() => { 
    document.getElementById('fakeCoords').textContent = `0x${Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')}`; 
  }, 150); 
}

function closeRadarModal() { 
  document.getElementById('radarModal').classList.add('hidden'); 
  clearInterval(fakeCoordInterval); 
}

function copyAddressToClipboard() { 
  navigator.clipboard.writeText(CONFIG.party.location).then(() => { 
    showToast("✓ Adresse kopiert!"); 
    playSuccessChime(); 
  }); 
}