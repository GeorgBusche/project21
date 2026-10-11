/* =====================================================================
   🎵 MODUL: MUSIK-RADAR & VOTING
   ===================================================================== */

function openMusicModal() { 
  document.getElementById('musicModal').classList.remove('hidden'); 
  listenToMusicUpdates(); 
}

function closeMusicModal() { 
  document.getElementById('musicModal').classList.add('hidden'); 
}

function submitSongProposal() {
  const input = document.getElementById('newSongInput'); 
  const title = input.value.trim(); 
  if (!title) return;
  
  db.ref('songs/song_' + Date.now()).set({ 
    title: title, 
    votesCount: 1, 
    voters: { [myUserToken]: true } 
  });
  
  input.value = ''; 
  showToast("✓ Song hinzugefügt & gevotet!");
}

function toggleSongVote(songId) {
  db.ref('songs/' + songId).transaction(song => {
    if (song) { 
      if (!song.voters) song.voters = {}; 
      if (song.voters[myUserToken]) { 
        delete song.voters[myUserToken]; 
        song.votesCount = Math.max(0, (song.votesCount || 1) - 1); 
      } else { 
        song.voters[myUserToken] = true; 
        song.votesCount = (song.votesCount || 0) + 1; 
      } 
    }
    return song;
  });
}

function listenToMusicUpdates() {
  db.ref('songs').on('value', snapshot => {
    const listEl = document.getElementById('songListContainer'); 
    if (!listEl) return;
    
    const data = snapshot.val();
    if (!data) { 
      listEl.innerHTML = "<p class='text-xs text-neutral-500 text-center py-4'>Noch keine Songs.</p>"; 
      return; 
    }
    
    const songs = Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a, b) => b.votesCount - a.votesCount);
    
    listEl.innerHTML = songs.map(song => `
      <div class="flex justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800">
        <span class="text-xs font-bold text-white truncate pr-2">${escapeHtml(song.title)}</span>
        <button onclick="toggleSongVote('${song.id}')" class="px-3 py-1.5 rounded text-xs ${song.voters && song.voters[myUserToken] ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'}">
          🔥 ${song.votesCount || 0}
        </button>
      </div>
    `).join('');
  });
}