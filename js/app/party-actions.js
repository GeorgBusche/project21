import { CONFIG } from '../config.js';
import { playBuzzerError, playSuccessChime, playTone } from './audio.js';
import { showRadarMap } from './radar-map.js';
import { appendLine, escapeHtml, showToast } from './ui.js';

let database;
let deviceToken;
let cachedSongs = {};
let selectedRsvpSong = null;
let currentPreviewAudio = null;
let currentPreviewTrackId = null;
const searchCache = new Map();
let rsvpSearchTimeout = null;
let musicSearchTimeout = null;
let latestMusicSearchResults = [];
let latestRsvpSearchResults = [];

export function initializePartyBackend() {
  const firebase = window.firebase;
  if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
  database = firebase.database();
  deviceToken = getDeviceToken();

  // Songs frühzeitig im Hintergrund synchronisieren
  listenToMusicUpdates();
  setupMusicSearchListeners();
}

function getDeviceToken() {
  let token = localStorage.getItem('party_device_token');
  if (!token) {
    token = `usr_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
    localStorage.setItem('party_device_token', token);
  }
  return token;
}

// ==========================================
// RADAR MODAL & ADRESSE
// ==========================================

export function openRadarModal() {
  playTone(500, 'sine', 0.08);
  document.getElementById('radarModal').classList.remove('hidden');
  showRadarMap();
}

export function closeRadarModal() {
  document.getElementById('radarModal').classList.add('hidden');
}

export async function copyAddressToClipboard() {
  try {
    await navigator.clipboard.writeText(CONFIG.party.location);
    showToast('✓ Adresse kopiert!');
    playSuccessChime();
  } catch (error) {
    console.error('Unable to copy the party address.', error);
    showToast('⚠️ Adresse konnte nicht kopiert werden.');
  }
}

// ==========================================
// MUSIK SUCHE & DUPLIKAT-ERKENNUNG
// ==========================================

function normalizeSongKey(title, artist = '') {
  return `${title} ${artist}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

export function findExistingSong(track, songs = cachedSongs) {
  if (!songs || !track) return null;
  const songList = Object.entries(songs).map(([id, song]) => ({ id, ...song }));

  // 1. Priorität: Exakte iTunes trackId
  if (track.trackId) {
    const byTrackId = songList.find(
      (s) => s.trackId && String(s.trackId) === String(track.trackId)
    );
    if (byTrackId) return byTrackId;

    const byKey = songList.find((s) => s.id === `track_${track.trackId}`);
    if (byKey) return byKey;
  }

  // 2. Priorität: Normalisierter Titel & Interpret
  const queryTitle = track.trackName || track.title || '';
  const queryArtist = track.artistName || track.artist || '';
  const queryKey = normalizeSongKey(queryTitle, queryArtist);
  if (!queryKey) return null;

  return (
    songList.find((s) => {
      const sKey = normalizeSongKey(s.title || '', s.artist || '');
      if (sKey === queryKey) return true;

      // Falls nur Titel vorhanden ist
      const normS = normalizeSongKey(s.title || '');
      const normQ = normalizeSongKey(queryTitle);
      return normS && normQ && normS === normQ;
    }) || null
  );
}

async function searchMusicApi(query) {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const cacheKey = clean.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=song&limit=10&country=DE`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const results = (data.results || []).map((item) => ({
      trackId: item.trackId,
      trackName: item.trackName,
      artistName: item.artistName,
      artworkUrl100: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '200x200bb') : '',
      previewUrl: item.previewUrl || ''
    }));
    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Music search failed:', error);
    return [];
  }
}

// ==========================================
// AUDIO PREVIEWS (30s Hörprobe)
// ==========================================

export function toggleAudioPreview(previewUrl, trackId) {
  if (!previewUrl) {
    showToast('Keine Hörprobe verfügbar');
    return;
  }

  if (currentPreviewAudio && String(currentPreviewTrackId) === String(trackId)) {
    stopAudioPreview();
    return;
  }

  stopAudioPreview();

  try {
    const audio = new Audio(previewUrl);
    audio.volume = 0.6;
    currentPreviewAudio = audio;
    currentPreviewTrackId = trackId;

    audio.play().catch(() => {
      showToast('Hörprobe konnte nicht abgespielt werden');
      stopAudioPreview();
    });

    audio.onended = () => {
      stopAudioPreview();
    };

    updateAudioPreviewUi();
  } catch (err) {
    console.error('Audio preview error', err);
    stopAudioPreview();
  }
}

export function stopAudioPreview() {
  if (currentPreviewAudio) {
    try {
      currentPreviewAudio.pause();
    } catch (_) {}
    currentPreviewAudio = null;
  }
  currentPreviewTrackId = null;
  updateAudioPreviewUi();
}

function updateAudioPreviewUi() {
  document.querySelectorAll('[data-preview-btn]').forEach((btn) => {
    const btnTrackId = btn.getAttribute('data-preview-btn');
    const isPlaying = String(btnTrackId) === String(currentPreviewTrackId);
    btn.innerHTML = isPlaying ? '⏸️' : '▶️';
    btn.classList.toggle('bg-fuchsia-600', isPlaying);
    btn.classList.toggle('text-white', isPlaying);
    btn.classList.toggle('animate-pulse', isPlaying);
  });
}

// ==========================================
// MUSIK MODAL (PLAYLIST & LIVE VOTING)
// ==========================================

export function openMusicModal() {
  document.getElementById('musicModal').classList.remove('hidden');
  renderPlaylist();
}

export function closeMusicModal() {
  stopAudioPreview();
  clearMusicSearch();
  document.getElementById('musicModal').classList.add('hidden');
}

export function clearMusicSearch() {
  const input = document.getElementById('musicSearchInput');
  const clearBtn = document.getElementById('musicSearchClearBtn');
  const resultsContainer = document.getElementById('musicSearchResults');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('hidden');
  }
  latestMusicSearchResults = [];
}

export function toggleSongVote(songId) {
  if (!database) return;
  database.ref(`songs/${songId}`).transaction((song) => {
    if (song) {
      if (!song.voters) song.voters = {};
      if (song.voters[deviceToken]) {
        delete song.voters[deviceToken];
        song.votesCount = Math.max(0, (song.votesCount || 1) - 1);
      } else {
        song.voters[deviceToken] = true;
        song.votesCount = (song.votesCount || 0) + 1;
      }
    }
    return song;
  });
  playTone(600, 'sine', 0.05);
}

export function addSongVote(songId) {
  if (!database) return;
  database.ref(`songs/${songId}`).transaction((song) => {
    if (song) {
      if (!song.voters) song.voters = {};
      if (!song.voters[deviceToken]) {
        song.voters[deviceToken] = true;
        song.votesCount = (song.votesCount || 0) + 1;
      }
    }
    return song;
  });
  playTone(850, 'sine', 0.06);
  showToast('✓ Stimme für diesen Song gezählt! 🔥');
}

export function addSongFromSearch(trackId) {
  const track = latestMusicSearchResults.find((t) => String(t.trackId) === String(trackId));
  if (!track || !database) return;

  const existing = findExistingSong(track, cachedSongs);
  if (existing) {
    if (existing.voters && existing.voters[deviceToken]) {
      showToast('Diesen Song hast du bereits gevotet!');
      return;
    }
    addSongVote(existing.id);
    return;
  }

  const songId = `track_${track.trackId}`;
  database.ref(`songs/${songId}`).set({
    trackId: track.trackId,
    title: track.trackName,
    artist: track.artistName,
    cover: track.artworkUrl100,
    previewUrl: track.previewUrl,
    votesCount: 1,
    voters: { [deviceToken]: true },
    addedAt: Date.now()
  });

  playSuccessChime();
  showToast('✓ Song in die Playlist gepackt! 🔥');
}

// Fallback für alte Freitext-Eingaben
export function submitSongProposal() {
  const input = document.getElementById('musicSearchInput');
  const title = input ? input.value.trim() : '';
  if (!title) return;

  database.ref(`songs/song_${Date.now()}`).set({
    title,
    artist: 'Gast-Wunsch',
    votesCount: 1,
    voters: { [deviceToken]: true },
    addedAt: Date.now()
  });
  clearMusicSearch();
  showToast('✓ Song hinzugefügt! 🔥');
}

function listenToMusicUpdates() {
  database.ref('songs').on('value', (snapshot) => {
    cachedSongs = snapshot.val() || {};
    renderPlaylist();

    // Falls Suchergebnisse aktiv sind, Status darin live aktualisieren
    if (latestMusicSearchResults.length > 0) {
      renderMusicSearchResults(latestMusicSearchResults);
    }
    if (latestRsvpSearchResults.length > 0) {
      renderRsvpSearchResults(latestRsvpSearchResults);
    }
    if (selectedRsvpSong) {
      renderSelectedRsvpSong();
    }
  });
}

function renderPlaylist() {
  const container = document.getElementById('songListContainer');
  const statsText = document.getElementById('playlistStatsText');
  if (!container) return;

  const songs = Object.entries(cachedSongs)
    .map(([id, song]) => ({ id, ...song }))
    .sort((a, b) => {
      const diff = (b.votesCount || 0) - (a.votesCount || 0);
      if (diff !== 0) return diff;
      return (a.addedAt || 0) - (b.addedAt || 0);
    });

  const totalVotes = songs.reduce((sum, s) => sum + (s.votesCount || 0), 0);
  if (statsText) {
    statsText.textContent = `🔥 AKTUELL GEVOTET (${songs.length} Tracks | ${totalVotes} Votes)`;
  }

  if (songs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-neutral-500 font-mono space-y-2">
        <div class="text-2xl">📻</div>
        <div class="text-xs">Noch keine Songs in der Playlist.</div>
        <div class="text-[11px] text-neutral-600">Suche oben nach deinem Lieblings-Track!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = songs
    .map((song, index) => {
      const hasVoted = Boolean(song.voters && song.voters[deviceToken]);
      const votes = song.votesCount || 0;

      let rankDisplay = '';
      if (index === 0) {
        rankDisplay = '<span class="text-amber-400 font-extrabold text-sm sm:text-base">🥇</span>';
      } else if (index === 1) {
        rankDisplay = '<span class="text-slate-300 font-extrabold text-sm sm:text-base">🥈</span>';
      } else if (index === 2) {
        rankDisplay = '<span class="text-amber-600 font-extrabold text-sm sm:text-base">🥉</span>';
      } else {
        rankDisplay = `<span class="text-neutral-500 font-mono text-xs w-5 text-center font-bold">#${index + 1}</span>`;
      }

      const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent((song.artist ? `${song.artist} ` : '') + song.title)}`;

      const previewBtnHtml = song.previewUrl
        ? `<button
             type="button"
             data-preview-btn="${song.id}"
             onclick="toggleAudioPreview('${song.previewUrl}', '${song.id}')"
             class="absolute inset-0 bg-black/60 hover:bg-black/40 text-white rounded flex items-center justify-center text-xs transition"
             title="Hörprobe (30s)"
           >
             ${String(currentPreviewTrackId) === String(song.id) ? '⏸️' : '▶️'}
           </button>`
        : '';

      const coverHtml = song.cover
        ? `<div class="relative w-10 h-10 flex-shrink-0">
             <img src="${escapeHtml(song.cover)}" alt="Cover" class="w-10 h-10 rounded object-cover border border-neutral-800" />
             ${previewBtnHtml}
           </div>`
        : `<div class="w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-base flex-shrink-0">🎵</div>`;

      return `
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/90 border ${
          hasVoted
            ? 'border-emerald-500/70 bg-emerald-950/20'
            : 'border-neutral-800/80 hover:border-neutral-700'
        } transition">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="w-6 flex items-center justify-center flex-shrink-0">
              ${rankDisplay}
            </div>
            ${coverHtml}
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span class="truncate">${escapeHtml(song.title)}</span>
              </div>
              <div class="text-[11px] text-neutral-400 truncate">
                ${escapeHtml(song.artist || 'Gast-Wunsch')}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a
              href="${spotifyUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-7 h-7 rounded border border-neutral-800 bg-neutral-950/60 hover:bg-emerald-950 hover:border-emerald-600 text-neutral-400 hover:text-emerald-400 flex items-center justify-center text-xs transition"
              title="Auf Spotify suchen"
            >
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </a>
            <button
              onclick="toggleSongVote('${song.id}')"
              class="px-2.5 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                hasVoted
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }"
              title="${hasVoted ? 'Deine Stimme zurückziehen' : 'Dafür stimmen'}"
            >
              <span>🔥</span>
              <span>${votes}</span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderMusicSearchResults(results) {
  const container = document.getElementById('musicSearchResults');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-neutral-400 font-mono">
        Keine Songs gefunden. Probiere einen anderen Suchbegriff!
      </div>
    `;
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = results
    .map((track) => {
      const existing = findExistingSong(track, cachedSongs);
      const hasVoted = existing && existing.voters && existing.voters[deviceToken];
      const votes = existing ? existing.votesCount || 1 : 0;

      let actionHtml = '';
      if (!existing) {
        actionHtml = `
          <button
            onclick="addSongFromSearch('${track.trackId}')"
            class="px-2.5 py-1.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-[11px] active:scale-95 transition whitespace-nowrap shadow-[0_0_8px_rgba(217,70,239,0.4)]"
          >
            + IN PLAYLIST
          </button>
        `;
      } else if (!hasVoted) {
        actionHtml = `
          <button
            onclick="addSongVote('${existing.id}')"
            class="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] active:scale-95 transition whitespace-nowrap shadow-[0_0_8px_rgba(245,158,11,0.4)]"
          >
            🔥 +1 VOTE (${votes})
          </button>
        `;
      } else {
        actionHtml = `
          <span class="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold text-[10px] whitespace-nowrap">
            ✓ GEVOTET (${votes})
          </span>
        `;
      }

      const previewBtnHtml = track.previewUrl
        ? `<button
             type="button"
             data-preview-btn="${track.trackId}"
             onclick="toggleAudioPreview('${track.previewUrl}', '${track.trackId}')"
             class="absolute inset-0 bg-black/60 hover:bg-black/40 text-white rounded flex items-center justify-center text-xs transition"
             title="Hörprobe (30s)"
           >
             ${String(currentPreviewTrackId) === String(track.trackId) ? '⏸️' : '▶️'}
           </button>`
        : '';

      return `
        <div class="flex items-center justify-between gap-2.5 p-2 hover:bg-neutral-900 transition">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="relative w-10 h-10 flex-shrink-0">
              <img src="${escapeHtml(track.artworkUrl100)}" alt="Cover" class="w-10 h-10 rounded object-cover border border-neutral-800" />
              ${previewBtnHtml}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white truncate">${escapeHtml(track.trackName)}</div>
              <div class="text-[11px] text-neutral-400 truncate">${escapeHtml(track.artistName)}</div>
              <div class="text-[9px] mt-0.5">
                ${
                  !existing
                    ? '<span class="text-emerald-400">✨ Neu</span>'
                    : hasVoted
                      ? '<span class="text-neutral-400">✓ Schon von dir gevotet</span>'
                      : `<span class="text-amber-400 font-bold">🔥 In Playlist (${votes} Votes)</span>`
                }
              </div>
            </div>
          </div>
          <div class="flex-shrink-0">
            ${actionHtml}
          </div>
        </div>
      `;
    })
    .join('');

  container.classList.remove('hidden');
}

// ==========================================
// ZUSAGE (RSVP) & SONGWUNSCH INTEGRATION
// ==========================================

export function openRsvpModal() {
  playTone(587, 'sine', 0.08);
  document.getElementById('rsvpModal').classList.remove('hidden');
  updatePegelDisplay(document.getElementById('rsvpPegel').value);
}

export function closeRsvpModal() {
  stopAudioPreview();
  const rsvpResults = document.getElementById('rsvpSongSearchResults');
  if (rsvpResults) {
    rsvpResults.innerHTML = '';
    rsvpResults.classList.add('hidden');
  }
  document.getElementById('rsvpModal').classList.add('hidden');
}

export function togglePlusOneInput() {
  const enabled = document.getElementById('rsvpPlusOneToggle').checked;
  document.getElementById('plusOneContainer').classList.toggle('hidden', !enabled);
  if (enabled) {
    document.getElementById('rsvpPlusOneName').focus();
    playTone(700, 'sine', 0.05);
  }
}

export function updatePegelDisplay(value) {
  document.getElementById('pegelValueBadge').textContent = `Pegel: ${value}%`;
  document.getElementById('pegelDescription').textContent = CONFIG.pegelDescriptions[value];
  playTone(220 + value * 5, 'sine', 0.02, 0.03);
}

export function selectRsvpSong(trackId) {
  const track = latestRsvpSearchResults.find((t) => String(t.trackId) === String(trackId));
  if (!track) return;

  selectedRsvpSong = track;
  renderSelectedRsvpSong();

  const searchInput = document.getElementById('rsvpSongSearchInput');
  const resultsContainer = document.getElementById('rsvpSongSearchResults');
  if (searchInput) searchInput.value = '';
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('hidden');
  }
  document.getElementById('rsvpSongInputWrapper')?.classList.add('hidden');
  playTone(720, 'sine', 0.05);
}

export function clearSelectedRsvpSong() {
  selectedRsvpSong = null;
  const container = document.getElementById('rsvpSelectedSongContainer');
  if (container) {
    container.innerHTML = '';
    container.classList.add('hidden');
  }
  const wrapper = document.getElementById('rsvpSongInputWrapper');
  if (wrapper) wrapper.classList.remove('hidden');
  const input = document.getElementById('rsvpSongSearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  playTone(400, 'sine', 0.04);
}

function renderSelectedRsvpSong() {
  const container = document.getElementById('rsvpSelectedSongContainer');
  if (!container || !selectedRsvpSong) return;

  const existing = findExistingSong(selectedRsvpSong, cachedSongs);
  const hasVoted = existing && existing.voters && existing.voters[deviceToken];

  let statusHtml = '';
  if (existing) {
    if (hasVoted) {
      statusHtml = `<span class="text-[10px] text-emerald-400 font-bold">✓ Bereits von dir gevotet (${existing.votesCount || 1} Votes)</span>`;
    } else {
      statusHtml = `<span class="text-[10px] text-amber-300 font-bold">🔥 Bereits in Playlist (${existing.votesCount || 1} Votes) – erhält deinen Zusatz-Vote!</span>`;
    }
  } else {
    statusHtml = `<span class="text-[10px] text-emerald-400 font-bold">✨ Neu in der Playlist – erhält deine Stimme bei Zusage!</span>`;
  }

  container.innerHTML = `
    <div class="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-600/80 shadow-md">
      ${
        selectedRsvpSong.artworkUrl100
          ? `<img src="${escapeHtml(selectedRsvpSong.artworkUrl100)}" alt="Cover" class="w-11 h-11 rounded object-cover flex-shrink-0 border border-emerald-800" />`
          : `<div class="w-11 h-11 rounded bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-lg flex-shrink-0">🎵</div>`
      }
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold text-white truncate">${escapeHtml(selectedRsvpSong.trackName)}</div>
        <div class="text-[11px] text-emerald-300 truncate">${escapeHtml(selectedRsvpSong.artistName)}</div>
        <div class="mt-0.5">${statusHtml}</div>
      </div>
      <button
        type="button"
        onclick="clearSelectedRsvpSong()"
        class="text-xs px-2 py-1 rounded border border-emerald-700 text-emerald-400 hover:text-white hover:bg-emerald-900/40 active:scale-95 transition"
        title="Anderen Song wählen"
      >
        Ändern ✕
      </button>
    </div>
  `;
  container.classList.remove('hidden');
}

function renderRsvpSearchResults(results) {
  const container = document.getElementById('rsvpSongSearchResults');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-neutral-400 font-mono">
        Keine Songs gefunden. Du kannst deinen Wunsch trotzdem eintragen!
      </div>
    `;
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = results
    .map((track) => {
      const existing = findExistingSong(track, cachedSongs);
      const hasVoted = existing && existing.voters && existing.voters[deviceToken];
      const votes = existing ? existing.votesCount || 1 : 0;

      let badge = '';
      if (!existing) {
        badge =
          '<span class="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded">✨ Neu</span>';
      } else if (hasVoted) {
        badge = `<span class="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">✓ Gevotet (${votes})</span>`;
      } else {
        badge = `<span class="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.5 rounded font-bold">🔥 In Playlist (${votes} Votes)</span>`;
      }

      return `
        <div
          onclick="selectRsvpSong('${track.trackId}')"
          class="flex items-center justify-between gap-2.5 p-2 hover:bg-neutral-800 cursor-pointer transition"
        >
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="${escapeHtml(track.artworkUrl100)}" alt="Cover" class="w-9 h-9 rounded object-cover flex-shrink-0 border border-neutral-700" />
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white truncate">${escapeHtml(track.trackName)}</div>
              <div class="text-[11px] text-emerald-300 truncate">${escapeHtml(track.artistName)}</div>
            </div>
          </div>
          <div class="flex-shrink-0 text-right">
            ${badge}
          </div>
        </div>
      `;
    })
    .join('');

  container.classList.remove('hidden');
}

export function dispatchRsvpWhatsApp() {
  const name = document.getElementById('rsvpName').value.trim();
  if (!name) {
    playBuzzerError();
    showToast('⚠️ Bitte gib zuerst deinen Namen ein!');
    document.getElementById('rsvpName').focus();
    return;
  }

  const hasPlusOne = document.getElementById('rsvpPlusOneToggle').checked;
  const plusOneName = document.getElementById('rsvpPlusOneName').value.trim();
  const drink = document.getElementById('rsvpDrink').value;
  const pegelValue = document.getElementById('rsvpPegel').value;
  const gift = document.getElementById('rsvpGift')?.value.trim() || '';

  // Gewählten Song oder getippten Fallback erfassen
  let songPayload = null;
  if (selectedRsvpSong) {
    songPayload = {
      trackId: selectedRsvpSong.trackId,
      title: selectedRsvpSong.trackName,
      artist: selectedRsvpSong.artistName,
      cover: selectedRsvpSong.artworkUrl100,
      previewUrl: selectedRsvpSong.previewUrl
    };
  } else {
    const rawInput = document.getElementById('rsvpSongSearchInput')?.value.trim();
    if (rawInput) {
      songPayload = {
        trackId: null,
        title: rawInput,
        artist: 'Wunsch',
        cover: '',
        previewUrl: ''
      };
    }
  }

  // Falls Song gewählt wurde, in Playlist eintragen oder bestehenden Song voten
  if (songPayload) {
    const existing = findExistingSong(songPayload, cachedSongs);
    if (existing) {
      if (!existing.voters || !existing.voters[deviceToken]) {
        database.ref(`songs/${existing.id}`).transaction((song) => {
          if (song) {
            if (!song.voters) song.voters = {};
            song.voters[deviceToken] = true;
            song.votesCount = (song.votesCount || 0) + 1;
          }
          return song;
        });
      }
    } else {
      const songId = songPayload.trackId ? `track_${songPayload.trackId}` : `song_${Date.now()}`;
      database.ref(`songs/${songId}`).set({
        trackId: songPayload.trackId,
        title: songPayload.title,
        artist: songPayload.artist,
        cover: songPayload.cover,
        previewUrl: songPayload.previewUrl,
        votesCount: 1,
        voters: { [deviceToken]: true },
        addedAt: Date.now()
      });
    }
  }

  database.ref(`rsvps/${deviceToken}`).set({
    name,
    plusOne: hasPlusOne,
    plusOneName,
    drink,
    pegel: pegelValue,
    gift,
    song: songPayload
      ? {
          title: songPayload.title,
          artist: songPayload.artist,
          cover: songPayload.cover
        }
      : null,
    timestamp: Date.now()
  });

  let message = `🚨 Zusage für deinen 21. Geburtstag! 🚨\nMoin ${CONFIG.party.hostName},\n\nBin dabei!\n👤 Name: ${name}\n👥 Begleitung: ${hasPlusOne ? plusOneName || 'Ja' : 'Nein'}\n⛽ Getränk: ${drink}\n📊 Pegel: ${CONFIG.pegelDescriptions[pegelValue]}`;
  if (songPayload) {
    message += `\n🎵 Party-Playlist: ${songPayload.title}${songPayload.artist ? ` - ${songPayload.artist}` : ''}`;
  }
  if (gift) {
    message += `\n🎁 Mitbringsel: ${gift}`;
  }

  playSuccessChime();
  closeRsvpModal();
  window.open(
    `https://wa.me/${CONFIG.party.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
    '_blank'
  );
}

// ==========================================
// SEARCH INPUT LISTENERS WIRING
// ==========================================

function setupMusicSearchListeners() {
  const musicInput = document.getElementById('musicSearchInput');
  const clearBtn = document.getElementById('musicSearchClearBtn');

  if (musicInput) {
    musicInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (clearBtn) clearBtn.classList.toggle('hidden', !query);
      clearTimeout(musicSearchTimeout);
      if (!query || query.trim().length < 2) {
        const resultsContainer = document.getElementById('musicSearchResults');
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
          resultsContainer.classList.add('hidden');
        }
        latestMusicSearchResults = [];
        return;
      }
      musicSearchTimeout = setTimeout(async () => {
        const container = document.getElementById('musicSearchResults');
        if (container) {
          container.innerHTML = `<div class="p-3 text-center text-xs text-fuchsia-300 font-mono animate-pulse">🔎 Suche nach "${escapeHtml(query.trim())}"...</div>`;
          container.classList.remove('hidden');
        }
        const results = await searchMusicApi(query);
        latestMusicSearchResults = results;
        renderMusicSearchResults(results);
      }, 280);
    });
  }

  const rsvpInput = document.getElementById('rsvpSongSearchInput');
  if (rsvpInput) {
    rsvpInput.addEventListener('input', (e) => {
      const query = e.target.value;
      clearTimeout(rsvpSearchTimeout);
      if (!query || query.trim().length < 2) {
        const resultsContainer = document.getElementById('rsvpSongSearchResults');
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
          resultsContainer.classList.add('hidden');
        }
        latestRsvpSearchResults = [];
        return;
      }
      rsvpSearchTimeout = setTimeout(async () => {
        const container = document.getElementById('rsvpSongSearchResults');
        if (container) {
          container.innerHTML = `<div class="p-2.5 text-center text-xs text-emerald-300 font-mono animate-pulse">🔎 Suche nach "${escapeHtml(query.trim())}"...</div>`;
          container.classList.remove('hidden');
        }
        const results = await searchMusicApi(query);
        latestRsvpSearchResults = results;
        renderRsvpSearchResults(results);
      }, 280);
    });
  }
}

// ==========================================
// GÄSTE-BOARD
// ==========================================

export function showGuestBoard() {
  appendLine("<span class='text-cyan-400 font-bold'>[GÄSTE-RADAR] Lade Daten...</span>");
  database.ref('rsvps').once('value', (snapshot) => {
    const guests = snapshot.val();
    if (!guests) {
      appendLine("<span class='text-neutral-500'>Noch keine Einträge.</span>");
      return;
    }

    const guestList = Object.values(guests);
    appendLine(
      `<div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded my-2 text-xs font-mono space-y-2'>
        <div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1'>ANGEMELDETE CREW (${guestList.length})</div>
        ${guestList
          .map(
            (guest) => `
          <div class='flex justify-between py-1 border-b border-neutral-800/50'>
            <div class='min-w-0 pr-2'>
              <span class='text-white font-bold'>${escapeHtml(guest.name)}</span>
              ${guest.plusOne ? `<span class='text-[10px] text-cyan-300 ml-1'>+1 (${escapeHtml(guest.plusOneName || 'Begleitung')})</span>` : ''}
              <br>
              <span class='text-[11px] text-neutral-400'>${escapeHtml(guest.drink)}</span>
              ${guest.song ? `<br><span class='text-[10px] text-fuchsia-400 truncate'>🎵 ${escapeHtml(guest.song.title || guest.song)}${guest.song.artist ? ` - ${escapeHtml(guest.song.artist)}` : ''}</span>` : ''}
            </div>
            <span class='text-emerald-400 font-bold flex-shrink-0'>${guest.pegel}%</span>
          </div>`
          )
          .join('')}
      </div>`
    );
  });
}
