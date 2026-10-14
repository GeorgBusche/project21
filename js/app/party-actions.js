import { CONFIG } from '../config.js';
import {
  CONTENT,
  DRINKS_CONFIG,
  DRINK_CATEGORY_EMOJI,
  findDrinkConfig,
  resolveDrinkCategory
} from '../content.js';
import {
  getUnlockedIds,
  onAchievementsChange,
  renderBadgeIcons,
  trackFlag,
  trackShot,
  trackVote
} from './achievements.js';
import { playBuzzerError, playSuccessChime, playTone } from './audio.js';
import { isPartyModeLive } from './party-mode/mode-controller.js';
import { showRadarMap } from './radar-map.js';
import { appendLine, escapeHtml, showToast } from './ui.js';

let database;
let deviceToken;
let cachedSongs = {};
let cachedRsvps = {};
let selectedRsvpSong = null;
let currentPreviewAudio = null;
let currentPreviewTrackId = null;
const searchCache = new Map();
let rsvpSearchTimeout = null;
let musicSearchTimeout = null;
let guestSearchTimeout = null;
let latestMusicSearchResults = [];
let latestRsvpSearchResults = [];
let currentGuestFilter = 'all';
let currentGuestSort = 'newest';
let currentGuestSearchQuery = '';
let activeStatDetail = null;
let pendingWhatsAppMessage = '';
let selectedAvatar = { type: 'emoji', value: '😎' };

export function getPartyContext() {
  return {
    database,
    deviceToken,
    getCachedRsvps: () => cachedRsvps,
    getCachedSongs: () => cachedSongs
  };
}

export function initializePartyBackend() {
  const firebase = window.firebase;
  if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
  database = firebase.database();
  deviceToken = getDeviceToken();

  // Songs frühzeitig im Hintergrund synchronisieren
  listenToMusicUpdates();
  setupMusicSearchListeners();

  // RSVPs synchronisieren & Suchleiste initialisieren
  listenToRsvpUpdates();
  setupGuestSearchListeners();

  // Zusage-Button im Actionbar auf aktuellen Status synchronisieren
  updateBottomRsvpButton();
}

function getSavedLocalRsvp() {
  try {
    const raw = localStorage.getItem('party_rsvp_data');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function syncAchievementsToGuestList(ids = getUnlockedIds()) {
  const own = cachedRsvps[deviceToken];
  if (!database || !own) return;
  const current = Array.isArray(own.achievements) ? own.achievements : [];
  if (current.length === ids.length && current.every((id) => ids.includes(id))) return;
  database.ref(`rsvps/${deviceToken}/achievements`).set(ids);
}

function listenToRsvpUpdates() {
  onAchievementsChange(syncAchievementsToGuestList);
  database.ref('rsvps').on('value', (snapshot) => {
    cachedRsvps = snapshot.val() || {};
    renderGuestListModal();
    updateGuestModalFooter();
    updateBottomRsvpButton();
    syncAchievementsToGuestList();
  });
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

  if (window.isMuted) {
    showToast('🔇 Sound ist stumm – oben rechts wieder aktivieren');
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
    trackFlag('preview');

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
  if (!cachedSongs[songId]?.voters?.[deviceToken]) trackVote(songId);
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
  trackVote(songId);
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
  trackVote(songId);
  showToast('✓ Song in die Playlist gepackt! 🔥');
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

  // Prüfen ob Gast auf diesem Gerät bereits angemeldet ist
  const existing = cachedRsvps[deviceToken] || getSavedLocalRsvp();
  const banner = document.getElementById('rsvpExistingBanner');
  const bannerName = document.getElementById('rsvpExistingName');
  const submitText = document.getElementById('rsvpSubmitBtnText');
  document.getElementById('rsvpFormView')?.classList.remove('hidden');
  document.getElementById('rsvpConfirmView')?.classList.add('hidden');

  if (existing && existing.name) {
    if (banner) banner.classList.remove('hidden');
    if (bannerName) bannerName.textContent = existing.name;
    if (submitText) submitText.textContent = '🔄 ZUSAGE AKTUALISIEREN';

    const nameInput = document.getElementById('rsvpName');
    if (nameInput) nameInput.value = existing.name;

    const drinkInput = document.getElementById('rsvpDrink');
    if (drinkInput && existing.drink) {
      const match =
        findDrinkConfig(existing.drink) ||
        DRINKS_CONFIG.find((d) => d.category === resolveDrinkCategory(existing.drink));
      if (match) drinkInput.value = match.label;
    }

    const plusOneToggle = document.getElementById('rsvpPlusOneToggle');
    if (plusOneToggle) {
      plusOneToggle.checked = Boolean(existing.plusOne);
      togglePlusOneInput();
      if (existing.plusOne && existing.plusOneName) {
        const plusOneNameInput = document.getElementById('rsvpPlusOneName');
        if (plusOneNameInput) plusOneNameInput.value = existing.plusOneName;
        handlePlusOneInput(existing.plusOneName);
      }
    }

    const pegelInput = document.getElementById('rsvpPegel');
    const pegelVal = existing.pegel !== undefined ? existing.pegel : 75;
    if (pegelInput) pegelInput.value = pegelVal;
    updatePegelDisplay(pegelVal);

    const noteInput = document.getElementById('rsvpNote');
    if (noteInput) noteInput.value = existing.note || '';

    // Avatar wiederherstellen
    if (existing.avatar) {
      if (typeof existing.avatar === 'string') {
        selectedAvatar = { type: 'emoji', value: existing.avatar };
      } else {
        selectedAvatar = existing.avatar;
      }
    } else {
      selectedAvatar = { type: 'emoji', value: '😎' };
    }
    updateAvatarPreviewUI();

    if (existing.song && typeof existing.song === 'object' && (existing.song.title || existing.song.trackName)) {
      selectedRsvpSong = {
        trackId: existing.song.trackId || null,
        trackName: existing.song.title || existing.song.trackName,
        artistName: existing.song.artist || existing.song.artistName || '',
        artworkUrl100: existing.song.cover || existing.song.artworkUrl100 || '',
        previewUrl: existing.song.previewUrl || ''
      };
      renderSelectedRsvpSong();
      document.getElementById('rsvpSongInputWrapper')?.classList.add('hidden');
    }
  } else {
    if (banner) banner.classList.add('hidden');
    if (submitText) submitText.textContent = '✅ ZUSAGE SPEICHERN';
    selectedAvatar = { type: 'emoji', value: '😎' };
    updateAvatarPreviewUI();
    const pegelInput = document.getElementById('rsvpPegel');
    updatePegelDisplay(pegelInput ? pegelInput.value : 75);
  }
}

export function selectAvatarPreset(emoji) {
  selectedAvatar = { type: 'emoji', value: emoji };
  updateAvatarPreviewUI();
  playTone(600, 'sine', 0.03);
}

export function handleAvatarPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    playBuzzerError();
    showToast('⚠️ Bitte wähle eine Bilddatei aus!');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Bild verkleinern auf max 96x96 quadratisch (Client-side Compression für schnelle Ladezeiten & Firebase DB)
      const canvas = document.createElement('canvas');
      const size = 96;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

      selectedAvatar = { type: 'image', value: compressedDataUrl };
      updateAvatarPreviewUI();
      playSuccessChime();
      showToast('✓ Profilfoto geladen!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateAvatarPreviewUI() {
  const previewEl = document.getElementById('rsvpAvatarPreview');
  if (!previewEl) return;

  if (selectedAvatar.type === 'image') {
    previewEl.innerHTML = `<img src="${selectedAvatar.value}" alt="Avatar" class="w-full h-full object-cover" />`;
  } else {
    previewEl.innerHTML = selectedAvatar.value || '😎';
  }

  // Preset Buttons hervorheben / entmarkieren
  document.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
    const av = btn.getAttribute('data-avatar');
    if (selectedAvatar.type === 'emoji' && av === selectedAvatar.value) {
      btn.className =
        'avatar-preset-btn w-7 h-7 rounded border border-emerald-400 bg-emerald-950/80 text-sm flex items-center justify-center transition active:scale-95 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    } else {
      btn.className =
        'avatar-preset-btn w-7 h-7 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-sm flex items-center justify-center transition active:scale-95';
    }
  });
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
  const checkbox = document.getElementById('rsvpPlusOneToggle');
  const enabled = checkbox ? checkbox.checked : false;
  const container = document.getElementById('plusOneContainer');
  const label = document.getElementById('plusOneToggleLabel');
  if (container) container.classList.toggle('hidden', !enabled);
  if (enabled) {
    if (label) label.textContent = '👥 +1:';
    const input = document.getElementById('rsvpPlusOneName');
    if (input) input.focus();
    playTone(700, 'sine', 0.05);
  } else if (label) {
    label.textContent = '👥 +1 Begleitung?';
    const input = document.getElementById('rsvpPlusOneName');
    if (input) input.value = '';
  }
}

export function handlePlusOneInput(value) {
  const label = document.getElementById('plusOneToggleLabel');
  if (!label) return;
  const isChecked = document.getElementById('rsvpPlusOneToggle')?.checked;
  if (isChecked) {
    label.textContent = '👥 +1:';
  } else {
    label.textContent = '👥 +1 Begleitung?';
  }
}

export function getPegelDescription(value) {
  const val = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  const thresholds = Object.keys(CONTENT.pegelDescriptions)
    .map(Number)
    .sort((a, b) => a - b);
  const match = thresholds.find((threshold) => val <= threshold);
  return CONTENT.pegelDescriptions[match ?? thresholds[thresholds.length - 1]];
}

export function updatePegelDisplay(value) {
  const val = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  const badge = document.getElementById('pegelValueBadge');
  const desc = document.getElementById('pegelDescription');

  if (badge) {
    badge.textContent = `Pegel: ${val}%`;
    let badgeColorClass = 'border-cyan-600 bg-cyan-950/80 text-cyan-300';
    if (val === 0) {
      badgeColorClass = 'border-neutral-600 bg-neutral-900 text-neutral-300';
    } else if (val <= 35) {
      badgeColorClass = 'border-emerald-600 bg-emerald-950/80 text-emerald-300';
    } else if (val <= 75) {
      badgeColorClass = 'border-cyan-600 bg-cyan-950/80 text-cyan-300';
    } else if (val <= 90) {
      badgeColorClass =
        'border-amber-500 bg-amber-950/80 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    } else {
      badgeColorClass =
        'border-rose-500 bg-rose-950/90 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse';
    }
    badge.className = `text-[11px] px-2 py-0.5 rounded font-mono font-bold transition-all border ${badgeColorClass}`;
  }

  if (desc) {
    desc.textContent = getPegelDescription(val);
  }

  playTone(200 + val * 5, 'sine', 0.02, 0.02);
}

export function rollRandomPegel() {
  playTone(450, 'square', 0.04);
  setTimeout(() => playTone(650, 'square', 0.04), 50);
  setTimeout(() => playTone(900, 'sawtooth', 0.06), 100);
  // 20 % Chance auf direkt 100 %, sonst 21 bis 99 %
  const randomPegel = Math.random() < 0.2 ? 100 : Math.floor(Math.random() * 79) + 21;
  const slider = document.getElementById('rsvpPegel');
  if (slider) {
    slider.value = randomPegel;
    updatePegelDisplay(randomPegel);
  }
  if (randomPegel === 100) trackFlag('pegel100');
  trackShot();
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

export function saveRsvp() {
  const name = document.getElementById('rsvpName').value.trim();
  if (!name) {
    playBuzzerError();
    showToast('⚠️ Bitte gib zuerst deinen Namen ein!');
    document.getElementById('rsvpName').focus();
    return;
  }

  const hasPlusOne = document.getElementById('rsvpPlusOneToggle')?.checked || false;
  const plusOneName = document.getElementById('rsvpPlusOneName')?.value.trim() || '';
  const drink = document.getElementById('rsvpDrink')?.value || DRINKS_CONFIG[0].label;
  const pegelValue = document.getElementById('rsvpPegel')?.value || 75;
  const note = (document.getElementById('rsvpNote')?.value || '').trim();

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

  // Falls zuvor ein anderer Song gevotet wurde und jetzt gewechselt wurde, alten Vote bereinigen
  const prevSong = (cachedRsvps[deviceToken] || getSavedLocalRsvp())?.song;
  if (prevSong && songPayload && prevSong.trackId && String(prevSong.trackId) !== String(songPayload.trackId)) {
    const oldSongId = `track_${prevSong.trackId}`;
    if (cachedSongs[oldSongId]) {
      database.ref(`songs/${oldSongId}`).transaction((song) => {
        if (song && song.voters && song.voters[deviceToken]) {
          delete song.voters[deviceToken];
          song.votesCount = Math.max(0, (song.votesCount || 1) - 1);
        }
        return song;
      });
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

  const wasExisting = Boolean(cachedRsvps[deviceToken] || getSavedLocalRsvp());

  if (songPayload) trackVote(songPayload.trackId || songPayload.title);
  if (parseInt(pegelValue, 10) === 100) trackFlag('pegel100');

  const rsvpRecord = {
    name,
    avatar: selectedAvatar,
    plusOne: hasPlusOne,
    plusOneName,
    drink,
    pegel: pegelValue,
    note,
    song: songPayload
      ? {
          trackId: songPayload.trackId,
          title: songPayload.title,
          artist: songPayload.artist,
          cover: songPayload.cover,
          previewUrl: songPayload.previewUrl
        }
      : null,
    deviceToken,
    achievements: getUnlockedIds(),
    updatedAt: Date.now(),
    timestamp: Date.now()
  };

  database.ref(`rsvps/${deviceToken}`).set(rsvpRecord);
  cachedRsvps[deviceToken] = rsvpRecord;
  try {
    localStorage.setItem('party_rsvp_data', JSON.stringify(rsvpRecord));
  } catch (_) {}

  updateBottomRsvpButton();
  updateGuestModalFooter();
  const pegelText = getPegelDescription(pegelValue);
  let message = CONTENT.whatsappTemplate({
    wasExisting,
    hostName: CONFIG.party.hostName,
    age: CONFIG.event.age,
    name,
    hasPlusOne,
    plusOneName,
    drink,
    pegelValue,
    pegelText,
    songPayload,
    note
  });

  pendingWhatsAppMessage = message;

  showToast(wasExisting ? '✓ Zusage aktualisiert! 🔄' : '✓ Zusage erfolgreich gespeichert! 👍');
  playSuccessChime();
  appendLine(
    `<div class="my-1 p-2 rounded border border-emerald-600 bg-emerald-950/40 text-emerald-300 text-xs">✅ ZUSAGE GESPEICHERT – Zutritt gewährt!<br><button type="button" onclick="openTicketModal()" class="mt-1.5 px-3 py-1 rounded bg-emerald-600 text-black font-bold text-xs active:scale-95 transition">🎟️ VIP-Ticket öffnen</button></div>`,
    300
  );

  stopAudioPreview();
  const rsvpResults = document.getElementById('rsvpSongSearchResults');
  if (rsvpResults) {
    rsvpResults.innerHTML = '';
    rsvpResults.classList.add('hidden');
  }
  document.getElementById('rsvpExistingBanner')?.classList.add('hidden');
  document.getElementById('rsvpFormView')?.classList.add('hidden');
  const confirmTitle = document.getElementById('rsvpConfirmTitle');
  if (confirmTitle) {
    confirmTitle.textContent = wasExisting ? 'Zusage aktualisiert!' : 'Zusage gespeichert!';
  }
  document.getElementById('rsvpConfirmView')?.classList.remove('hidden');
}

function toIcsLocal(iso) {
  return iso.replace(/[-:]/g, '').slice(0, 15);
}

function toIcsUtcNow() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

// Zeilen > 75 Oktette werden laut RFC 5545 gefaltet.
function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function downloadPartyCalendar() {
  const { startIso, endIso, location, mapsUrl, dresscode, hostName } = CONFIG.party;
  const description = [
    `${hostName} wird 21 – die Party des Jahres!`,
    `Dresscode: ${dresscode}`,
    `Ort: ${location}`,
    `Google Maps: ${mapsUrl}`
  ].join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Georg 21//Partyplanung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:georg21-party-${toIcsLocal(startIso)}@${CONTENT.calendar.uidDomain}`,
    `DTSTAMP:${toIcsUtcNow()}`,
    `DTSTART:${toIcsLocal(startIso)}`,
    `DTEND:${toIcsLocal(endIso)}`,
    `SUMMARY:${escapeIcsText(CONTENT.calendar.summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${mapsUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Morgen steigt Georgs 21. Geburtstag!',
    'TRIGGER:-PT24H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([lines.map(foldIcsLine).join('\r\n') + '\r\n'], {
    type: 'text/calendar;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'georgs_21_geburtstag.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('📅 Kalendereintrag heruntergeladen!');
}

export function sendRsvpViaWhatsApp() {
  if (!pendingWhatsAppMessage) return;
  const cleanPhone = CONFIG.party.phone.replace(/\D/g, '');
  window.open(
    `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(pendingWhatsAppMessage)}`,
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
// GÄSTE-BOARD (TERMINAL CHAT & MODAL)
// ==========================================

export function showGuestBoard() {
  playTone(600, 'sine', 0.05);
  appendLine("<span class='text-cyan-400 font-bold'>[GÄSTE-RADAR] Lade Gästedaten...</span>");

  database.ref('rsvps').once('value', (snapshot) => {
    const guestsObj = snapshot.val();
    if (!guestsObj) {
      appendLine(
        `<div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded-xl my-2 text-xs font-mono space-y-2'>
          <div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1'>ANGEMELDETE GÄSTE (0)</div>
          <div class='text-neutral-400'>Noch keine Anmeldungen in der Datenbank. Sei der Erste!</div>
          <button
            onclick="openRsvpModal()"
            class="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-black font-extrabold text-xs active:scale-95 transition"
          >
            👍 JETZT ZUSAGEN
          </button>
        </div>`
      );
      return;
    }

    const guestList = Object.entries(guestsObj)
      .map(([token, guest]) => ({ ...guest, deviceToken: token }))
      .sort((a, b) => (b.updatedAt || b.timestamp || 0) - (a.updatedAt || a.timestamp || 0));

    const totalRegistrations = guestList.length;
    const totalPersons = guestList.reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
    const avgPegel = Math.round(
      guestList.reduce((acc, g) => acc + (parseInt(g.pegel, 10) || 0), 0) / (totalRegistrations || 1)
    );

    // Erstmal nur 5 Einträge im Terminal posten
    const previewList = guestList.slice(0, 5);
    const remainingCount = totalRegistrations - previewList.length;

    appendLine(
      `<div class='border border-cyan-700 bg-neutral-950/90 p-3 rounded-xl my-2 text-xs font-mono space-y-2.5 shadow-[0_0_20px_rgba(6,182,212,0.3)]'>
        <div class='flex justify-between items-center border-b border-cyan-800/80 pb-1.5'>
          <span class='text-cyan-300 font-bold tracking-wider flex items-center gap-1.5'>
            <span>👥</span> ANGEMELDETE GÄSTE (${totalPersons} Personen)
          </span>
          <span class='text-[10px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded'>
            Ø ${avgPegel}% Pegel
          </span>
        </div>

        <div class='space-y-2 divide-y divide-neutral-800/60'>
          ${previewList
            .map(
              (guest, idx) => {
                const avatarDisplay = getGuestAvatarDisplay(guest);
                return `
            <div class='${idx > 0 ? 'pt-1.5' : ''} flex justify-between items-start gap-2'>
              <div class='flex items-center gap-2 min-w-0 flex-1'>
                <div class='w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden'>
                  ${avatarDisplay}
                </div>
                <div class='min-w-0 flex-1'>
                  <div class='flex items-center gap-1.5 flex-wrap'>
                    <span class='text-white font-bold'>${escapeHtml(guest.name)}</span>
                    ${renderBadgeIcons(guest.achievements)}
                    ${guest.plusOne ? `<span class='text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.2 rounded'>+1 (${escapeHtml(guest.plusOneName || 'Begleitung')})</span>` : ''}
                  </div>
                  <div class='text-[11px] text-neutral-400 mt-0.5'>⛽ ${escapeHtml(guest.drink)}</div>
                  ${guest.song ? `<div class='text-[10px] text-fuchsia-400 truncate mt-0.5'>🎵 ${escapeHtml(guest.song.title || guest.song)}${guest.song.artist ? ` - ${escapeHtml(guest.song.artist)}` : ''}</div>` : ''}
                  ${guest.note ? `<div class='text-[11px] text-amber-300 italic mt-0.5 font-sans'>💬 "${escapeHtml(guest.note)}"</div>` : ''}
                </div>
              </div>
              <span class='text-xs font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 ${
                (parseInt(guest.pegel, 10) || 0) >= 80
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
              }'>${guest.pegel || 0}%</span>
            </div>`;
              }
            )
            .join('')}
        </div>

        ${
          remainingCount > 0
            ? `<div class='text-[10px] text-cyan-400/80 text-center font-mono pt-1'>
                ... und <strong>${remainingCount} weitere Gäste</strong> im Verzeichnis!
               </div>`
            : ''
        }

        <!-- Auffälliger Button zum Öffnen des Menüs -->
        <button
          onclick="openGuestModal()"
          class="w-full mt-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition"
        >
          <span>👥</span> VOLLSTÄNDIGE GÄSTELISTE & GÄSTEBUCH ÖFFNEN (${totalRegistrations}) ➔
        </button>
      </div>`
    );
  });
}

// ==========================================
// GÄSTEMODAL & GÄSTEBUCH LOGIK
// ==========================================

export function openGuestModal() {
  playTone(550, 'sine', 0.06);
  const modal = document.getElementById('guestModal');
  if (modal) modal.classList.remove('hidden');
  renderGuestListModal();
  updateGuestModalFooter();
}

export function closeGuestModal() {
  stopAudioPreview();
  const modal = document.getElementById('guestModal');
  if (modal) modal.classList.add('hidden');
}

export function toggleGuestStatsModal() {
  const modal = document.getElementById('guestStatsModal');
  if (!modal) return;
  const isHidden = modal.classList.contains('hidden');
  if (isHidden) {
    playTone(620, 'sine', 0.05);
    modal.classList.remove('hidden');
    // Standardmäßig auf Gäste-Aufschlüsselung stellen falls nichts gewählt ist
    if (!activeStatDetail) {
      toggleStatDetail('guests');
    }
  } else {
    closeGuestStatsModal();
  }
}

export function closeGuestStatsModal() {
  const modal = document.getElementById('guestStatsModal');
  if (modal) modal.classList.add('hidden');
  closeStatDetail();
  playTone(450, 'sine', 0.03);
}

export function setGuestFilter(filter) {
  currentGuestFilter = filter;
  playTone(600, 'sine', 0.03);

  // Filter Chips UI aktualisieren
  document.querySelectorAll('.guest-filter-chip').forEach((btn) => {
    const isCurrent = btn.getAttribute('data-filter') === filter;
    if (isCurrent) {
      btn.className =
        'guest-filter-chip px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-500 bg-cyan-400 text-black font-bold active:scale-95 transition shadow-[0_0_8px_rgba(6,182,212,0.5)]';
    } else {
      btn.className =
        'guest-filter-chip px-2 py-0.5 rounded text-[10px] font-mono border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-cyan-300 active:scale-95 transition';
    }
  });

  renderGuestListModal();
}

export function changeGuestSort(sortVal) {
  currentGuestSort = sortVal;
  playTone(500, 'sine', 0.03);
  renderGuestListModal();
}

export function clearGuestSearch() {
  const input = document.getElementById('guestSearchInput');
  const clearBtn = document.getElementById('guestSearchClearBtn');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  currentGuestSearchQuery = '';
  renderGuestListModal();
}

function setupGuestSearchListeners() {
  const input = document.getElementById('guestSearchInput');
  const clearBtn = document.getElementById('guestSearchClearBtn');

  if (input) {
    input.addEventListener('input', (e) => {
      const query = e.target.value;
      if (clearBtn) clearBtn.classList.toggle('hidden', !query);
      clearTimeout(guestSearchTimeout);
      guestSearchTimeout = setTimeout(() => {
        currentGuestSearchQuery = query.trim().toLowerCase();
        renderGuestListModal();
      }, 160);
    });
  }
}

function getGuestAvatarDisplay(guest) {
  if (guest.avatar) {
    if (typeof guest.avatar === 'object') {
      if (guest.avatar.type === 'image' && guest.avatar.value) {
        return `<img src="${escapeHtml(guest.avatar.value)}" alt="Avatar" class="w-full h-full object-cover rounded-lg" />`;
      }
      if (guest.avatar.value) {
        return `<span class="text-sm">${escapeHtml(guest.avatar.value)}</span>`;
      }
    } else if (typeof guest.avatar === 'string' && guest.avatar.length <= 4) {
      return `<span class="text-sm">${escapeHtml(guest.avatar)}</span>`;
    }
  }

  // Fallback: dynamisch nach Pegel/Getränk
  return `<span class="text-sm">${getGuestAvatarEmoji(guest)}</span>`;
}

function getGuestAvatarEmoji(guest) {
  const pegel = parseInt(guest.pegel, 10) || 0;
  if (pegel === 100) return '👑';
  if (pegel >= 85) return '⚡';
  const category = resolveDrinkCategory(guest.drink);
  if (pegel === 0 || category === 'driver') return DRINK_CATEGORY_EMOJI.driver;
  return DRINK_CATEGORY_EMOJI[category] || '🕺';
}

function getPegelBadgeStyle(pegel) {
  const num = parseInt(pegel, 10) || 0;
  if (num === 0) return 'border-neutral-600 bg-neutral-900 text-neutral-300';
  if (num <= 35) return 'border-emerald-600 bg-emerald-950/80 text-emerald-300';
  if (num <= 75) return 'border-cyan-600 bg-cyan-950/80 text-cyan-300';
  if (num <= 90) return 'border-amber-500 bg-amber-950/80 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
  return 'border-rose-500 bg-rose-950/90 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse';
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  const d = new Date(timestamp);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
}

function renderGuestListModal() {
  const container = document.getElementById('guestListContainer');
  if (!container) return;

  const rawList = Object.entries(cachedRsvps).map(([token, guest]) => ({
    ...guest,
    deviceToken: token
  }));

  // Stats aktualisieren
  const totalCount = rawList.length;
  const totalPersons = rawList.reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
  const plusOneCount = rawList.filter((g) => Boolean(g.plusOne)).length;
  const avgPegel = totalCount
    ? Math.round(rawList.reduce((acc, g) => acc + (parseInt(g.pegel, 10) || 0), 0) / totalCount)
    : 0;
  const notesCount = rawList.filter((g) => Boolean((g.note || '').trim())).length;

  const drinkCounts = {};
  rawList.forEach((g) => {
    const d = g.drink || 'Pils';
    drinkCounts[d] = (drinkCounts[d] || 0) + 1;
  });
  let topDrink = '–';
  let maxDrinkCount = 0;
  for (const [drink, count] of Object.entries(drinkCounts)) {
    if (count > maxDrinkCount) {
      maxDrinkCount = count;
      topDrink = drink.replace(/🍺|🥃|🎊|🥶|🍷|🚗|🎒/g, '').trim();
    }
  }

  const headerBadge = document.getElementById('guestHeaderBadge');
  if (headerBadge) {
    headerBadge.textContent = `${totalPersons} ${totalPersons === 1 ? 'Gast' : 'Gäste'}`;
  }

  const statTotal = document.getElementById('statTotalGuests');
  const statTotalSub = document.getElementById('statTotalGuestsSub');
  const statAvg = document.getElementById('statAvgPegel');
  const statAvgSub = document.getElementById('statAvgPegelSub');
  const statDrink = document.getElementById('statTopDrink');
  const statDrinkSub = document.getElementById('statTopDrinkSub');
  const statNotes = document.getElementById('statNotesCount');
  const statNotesSub = document.getElementById('statNotesCountSub');

  if (statTotal) statTotal.textContent = `${totalPersons} ${totalPersons === 1 ? 'Person' : 'Personen'}`;
  if (statTotalSub) statTotalSub.textContent = `${totalCount} Zusagen · ${plusOneCount} (+1)`;
  if (statAvg) statAvg.textContent = `${avgPegel}%`;
  if (statAvgSub) statAvgSub.textContent = 'Ziel-Pegel';
  if (statDrink) statDrink.textContent = topDrink;
  if (statDrinkSub) statDrinkSub.textContent = `${maxDrinkCount}x gewählt`;
  if (statNotes) statNotes.textContent = `${notesCount} ${notesCount === 1 ? 'Spruch' : 'Sprüche'}`;
  if (statNotesSub) statNotesSub.textContent = 'Gästebuch';

  // Zusammenfassungszeile im einklappbaren Trigger
  const summaryEl = document.getElementById('guestStatsSummaryText');
  if (summaryEl) {
    const filterLabels = {
      all: 'Alle',
      beer: '🍺 Bier',
      korn: '🥃 Korn/Mische',
      driver: '🚗 0,0‰',
      notes: '💬 Sprüche',
      plusone: '👥 +1'
    };
    const activeFilterName = filterLabels[currentGuestFilter] || 'Alle';
    summaryEl.textContent = `${totalPersons} Gäste · Ø ${avgPegel}% Pegel · Filter: ${activeFilterName}`;
  }

  // Falls Detail-Panel geöffnet ist, live nachrendern
  if (activeStatDetail) {
    renderStatDetail(activeStatDetail);
  }

  // Filtern
  let filtered = rawList.filter((g) => {
    // Suchfilter
    if (currentGuestSearchQuery) {
      const q = currentGuestSearchQuery;
      const matchName = (g.name || '').toLowerCase().includes(q);
      const matchPlusOne = (g.plusOneName || '').toLowerCase().includes(q);
      const matchDrink = (g.drink || '').toLowerCase().includes(q);
      const matchNote = (g.note || '').toLowerCase().includes(q);
      const matchSong =
        g.song &&
        ((g.song.title || '').toLowerCase().includes(q) ||
          (g.song.artist || '').toLowerCase().includes(q));
      if (!matchName && !matchPlusOne && !matchDrink && !matchNote && !matchSong) {
        return false;
      }
    }

    // Kategorien-Filter
    if (currentGuestFilter === 'beer') {
      return Boolean(g.drink) && resolveDrinkCategory(g.drink) === 'beer';
    }
    if (currentGuestFilter === 'korn') {
      return Boolean(g.drink) && resolveDrinkCategory(g.drink) === 'korn';
    }
    if (currentGuestFilter === 'driver') {
      return (
        (Boolean(g.drink) && resolveDrinkCategory(g.drink) === 'driver') ||
        parseInt(g.pegel, 10) === 0
      );
    }
    if (currentGuestFilter === 'notes') {
      return Boolean((g.note || '').trim());
    }
    if (currentGuestFilter === 'plusone') {
      return Boolean(g.plusOne);
    }

    return true;
  });

  // Sortieren
  filtered.sort((a, b) => {
    if (currentGuestSort === 'pegel_desc') {
      return (parseInt(b.pegel, 10) || 0) - (parseInt(a.pegel, 10) || 0);
    }
    if (currentGuestSort === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '', 'de');
    }
    // Standard: 'newest'
    return (b.updatedAt || b.timestamp || 0) - (a.updatedAt || a.timestamp || 0);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-neutral-500 font-mono space-y-2">
        <div class="text-2xl">🔍</div>
        <div class="text-xs">Keine Gäste für diesen Filter gefunden.</div>
        <button
          onclick="setGuestFilter('all'); clearGuestSearch();"
          class="text-[11px] text-cyan-400 underline hover:text-cyan-300"
        >
          Alle Filter zurücksetzen
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((guest) => {
      const isCurrentUser = guest.deviceToken === deviceToken;
      const avatarContent = getGuestAvatarDisplay(guest);
      const pegelBadge = getPegelBadgeStyle(guest.pegel);
      const timeAgo = formatRelativeTime(guest.updatedAt || guest.timestamp);
      const noteText = (guest.note || '').trim();

      return `
        <div class="p-3 rounded-xl border ${
          isCurrentUser
            ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
        } transition">
          <!-- Top Row: Avatar, Name, Badges, Pegel -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
                ${avatarContent}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm font-bold text-white truncate">${escapeHtml(guest.name)}</span>
                  ${renderBadgeIcons(guest.achievements)}
                  ${isCurrentUser ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-400 text-black">DU</span>' : ''}
                  ${
                    guest.plusOne
                      ? `<span class="text-[10px] text-cyan-300 bg-cyan-950 border border-cyan-800/80 px-1.5 py-0.5 rounded font-mono">👥 +1: ${escapeHtml(guest.plusOneName || 'Begleitung')}</span>`
                      : ''
                  }
                </div>
                <div class="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                  <span>⛽</span>
                  <span class="text-neutral-300">${escapeHtml(guest.drink)}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded border ${pegelBadge}">
                ${guest.pegel || 0}%
              </span>
              ${timeAgo ? `<span class="text-[9px] text-neutral-500 font-mono">${timeAgo}</span>` : ''}
            </div>
          </div>

          <!-- Songwunsch (falls vorhanden) -->
          ${
            guest.song
              ? (() => {
                  const songObj = typeof guest.song === 'object' ? guest.song : { title: guest.song };
                  const songTitle = songObj.title || songObj.trackName || '';
                  const songArtist = songObj.artist || songObj.artistName || '';
                  const songCover = songObj.cover || songObj.artworkUrl100 || '';
                  const matchedCached = findExistingSong({ trackName: songTitle, artistName: songArtist, trackId: songObj.trackId }, cachedSongs);
                  const songPreviewUrl = songObj.previewUrl || matchedCached?.previewUrl || '';

                  return `
                    <div class="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2 text-[11px]">
                      <div class="flex items-center gap-2 min-w-0">
                        ${
                          songCover || matchedCached?.cover
                            ? `<img src="${escapeHtml(songCover || matchedCached.cover)}" alt="Cover" class="w-6 h-6 rounded object-cover flex-shrink-0 border border-neutral-700" />`
                            : `<span class="text-xs">🎵</span>`
                        }
                        <div class="truncate text-fuchsia-300">
                          <span class="font-bold">${escapeHtml(songTitle)}</span>
                          ${songArtist ? `<span class="text-neutral-400 text-[10px]"> · ${escapeHtml(songArtist)}</span>` : ''}
                        </div>
                      </div>
                      ${
                        songPreviewUrl
                          ? `
                          <button
                            type="button"
                            onclick="toggleAudioPreview('${songPreviewUrl}', 'guest_${guest.deviceToken}')"
                            data-preview-btn="guest_${guest.deviceToken}"
                            class="w-6 h-6 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-[11px] flex items-center justify-center flex-shrink-0 transition active:scale-95 text-neutral-300"
                            title="30s Hörprobe"
                          >
                            ▶️
                          </button>
                        `
                          : ''
                      }
                    </div>
                  `;
                })()
              : ''
          }

          <!-- Gästebuch-Ansage / Notiz -->
          ${
            noteText
              ? `
              <div class="mt-2 p-2 rounded-lg bg-neutral-950/80 border border-cyan-900/60 text-cyan-200 text-xs flex items-start gap-2 shadow-inner">
                <span class="text-cyan-400 text-xs flex-shrink-0">💬</span>
                <div class="italic leading-relaxed break-words flex-1 font-sans">
                  "${escapeHtml(noteText)}"
                </div>
              </div>
            `
              : ''
          }
        </div>
      `;
    })
    .join('');
}

function updateGuestModalFooter() {
  const myRsvp = cachedRsvps[deviceToken] || getSavedLocalRsvp();
  const userStatusEl = document.getElementById('guestUserStatus');
  const rsvpBtn = document.getElementById('guestModalRsvpBtn');

  if (myRsvp && myRsvp.name) {
    if (userStatusEl) {
      userStatusEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Angemeldet als: ${escapeHtml(myRsvp.name)}</span>`;
    }
    if (rsvpBtn) {
      rsvpBtn.innerHTML = '<span>✏️</span> Zusage anpassen';
    }
    document.getElementById('guestModalTicketBtn')?.classList.remove('hidden');
  } else {
    document.getElementById('guestModalTicketBtn')?.classList.add('hidden');
    if (userStatusEl) {
      userStatusEl.innerHTML = '<span class="text-neutral-400">Du bist noch nicht eingetragen!</span>';
    }
    if (rsvpBtn) {
      rsvpBtn.innerHTML = '<span>👍</span> Jetzt zusagen';
    }
  }
}

export function updateBottomRsvpButton() {
  const bottomRsvpBtn = document.getElementById('bottomRsvpBtn');
  const iconEl = document.getElementById('bottomRsvpBtnIcon');
  const textEl = document.getElementById('bottomRsvpBtnText');
  if (!bottomRsvpBtn) return;

  const myRsvp = cachedRsvps[deviceToken] || getSavedLocalRsvp();
  const hasRsvp = Boolean(myRsvp && myRsvp.name);
  const live = isPartyModeLive() && hasRsvp;
  const voteBtn = document.getElementById('bottomLiveVoteBtn');
  const declineWrapper = document.getElementById('declineWrapper');
  declineWrapper?.classList.toggle('hidden', live);
  if (voteBtn) {
    voteBtn.classList.toggle('hidden', !live);
    voteBtn.classList.toggle('flex', live);
    const voteIcon = document.getElementById('bottomLiveVoteBtnIcon');
    const voteText = document.getElementById('bottomLiveVoteBtnText');
    if (voteIcon) voteIcon.textContent = CONTENT.ui.actionBar.liveVote.icon;
    if (voteText) voteText.textContent = CONTENT.ui.actionBar.liveVote.label;
  }

  if (live) {
    bottomRsvpBtn.setAttribute('onclick', 'openSnapModal()');
    if (iconEl) iconEl.textContent = CONTENT.ui.actionBar.liveSnap.icon;
    if (textEl) textEl.textContent = CONTENT.ui.actionBar.liveSnap.label;
    bottomRsvpBtn.className =
      'flex-1 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-extrabold text-sm sm:text-base shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2';
    return;
  }
  bottomRsvpBtn.setAttribute('onclick', 'openRsvpModal()');

  if (hasRsvp) {
    if (iconEl) iconEl.textContent = CONTENT.ui.actionBar.rsvpEdit.icon;
    if (textEl) textEl.textContent = CONTENT.ui.actionBar.rsvpEdit.label;
    bottomRsvpBtn.className =
      'flex-1 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-extrabold text-sm sm:text-base shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2';
  } else {
    if (iconEl) iconEl.textContent = CONTENT.ui.actionBar.rsvp.icon;
    if (textEl) textEl.textContent = CONTENT.ui.actionBar.rsvp.label;
    bottomRsvpBtn.className =
      'flex-1 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 text-black font-extrabold text-sm sm:text-base shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2';
  }
}

export function toggleStatDetail(type) {
  if (activeStatDetail === type) {
    closeStatDetail();
  } else {
    activeStatDetail = type;
    renderStatDetail(type);
    playTone(650, 'sine', 0.04);
  }
}

export function closeStatDetail() {
  activeStatDetail = null;
}

export function renderStatDetail(type) {
  const titleEl = document.getElementById('guestStatDetailTitle');
  const contentEl = document.getElementById('guestStatDetailContent');
  if (!titleEl || !contentEl) return;

  const rawList = Object.entries(cachedRsvps).map(([token, guest]) => ({
    ...guest,
    deviceToken: token
  }));

  const totalCount = rawList.length;
  const totalPersons = rawList.reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
  const plusOneCount = rawList.filter((g) => Boolean(g.plusOne)).length;

  if (type === 'guests') {
    titleEl.innerHTML = `👥 GÄSTE-AUFSCHLÜSSELUNG (${totalPersons} Personen gesamt)`;
    if (totalCount === 0) {
      contentEl.innerHTML = `<div class="text-neutral-500 py-2">Noch keine Anmeldungen vorhanden.</div>`;
      return;
    }

    const rows = rawList
      .map((g) => {
        const hasPlusOne = Boolean(g.plusOne);
        return `
          <div class="flex items-center justify-between py-1 border-b border-neutral-800/60 text-[11px]">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-xs">${hasPlusOne ? '👥' : '👤'}</span>
              <div class="truncate">
                <span class="text-white font-bold">${escapeHtml(g.name)}</span>
                ${hasPlusOne ? `<span class="text-cyan-400 font-sans text-[10px]"> +1: ${escapeHtml(g.plusOneName || 'Begleitperson')}</span>` : ''}
              </div>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
              hasPlusOne
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-neutral-800 text-neutral-400'
            }">
              ${hasPlusOne ? '2 Personen' : '1 Person'}
            </span>
          </div>
        `;
      })
      .join('');

    contentEl.innerHTML = `
      <div class="text-[10px] text-cyan-400 font-mono mb-1.5 flex justify-between bg-cyan-950/40 p-1.5 rounded border border-cyan-900/40">
        <span>${totalCount} Anmeldungen</span>
        <span>${plusOneCount} mit Begleitperson (+1)</span>
      </div>
      <div class="space-y-0.5">${rows}</div>
    `;
  } else if (type === 'pegel') {
    const avgPegel = totalCount
      ? Math.round(rawList.reduce((acc, g) => acc + (parseInt(g.pegel, 10) || 0), 0) / totalCount)
      : 0;
    titleEl.innerHTML = `📈 ZIEL-PEGEL BAROMETER (Ø ${avgPegel}%)`;

    if (totalCount === 0) {
      contentEl.innerHTML = `<div class="text-neutral-500 py-2">Noch keine Daten vorhanden.</div>`;
      return;
    }

    const brackets = [
      { label: '🚨 Abriss & Trichter (91-100%)', color: 'bg-rose-500', test: (p) => p >= 91 },
      { label: '🎊 Eskalation & Schüttelkorn (76-90%)', color: 'bg-amber-500', test: (p) => p >= 76 && p <= 90 },
      { label: '🪩 Party-Modus (36-75%)', color: 'bg-cyan-500', test: (p) => p >= 36 && p <= 75 },
      { label: '🍻 Lockeres Aufwärmen (1-35%)', color: 'bg-emerald-500', test: (p) => p >= 1 && p <= 35 },
      { label: '🚗 Fahrer / 0,0‰ (0%)', color: 'bg-neutral-500', test: (p) => p === 0 }
    ];

    const bracketHtml = brackets
      .map((b) => {
        const matchingGuests = rawList.filter((g) => b.test(parseInt(g.pegel, 10) || 0));
        const pct = Math.round((matchingGuests.length / totalCount) * 100);
        const names = matchingGuests.map((g) => escapeHtml(g.name)).join(', ');

        return `
          <div class="space-y-1 py-1 border-b border-neutral-800/60">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-neutral-300 font-bold">${b.label}</span>
              <span class="text-cyan-400 font-mono">${matchingGuests.length} (${pct}%)</span>
            </div>
            <div class="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div class="${b.color} h-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>
            ${names ? `<div class="text-[9px] text-neutral-400 font-sans truncate">${names}</div>` : ''}
          </div>
        `;
      })
      .join('');

    contentEl.innerHTML = `<div class="space-y-1">${bracketHtml}</div>`;
  } else if (type === 'drinks') {
    titleEl.innerHTML = `⛽ TREIBSTOFF-HITLISTE & VERTEILUNG`;
    if (totalCount === 0) {
      contentEl.innerHTML = `<div class="text-neutral-500 py-2">Noch keine Daten vorhanden.</div>`;
      return;
    }

    const drinkMap = {};
    rawList.forEach((g) => {
      const d = g.drink || 'Pils';
      if (!drinkMap[d]) drinkMap[d] = [];
      drinkMap[d].push(g.name);
    });

    const sortedDrinks = Object.entries(drinkMap).sort((a, b) => b[1].length - a[1].length);

    const drinkHtml = sortedDrinks
      .map(([drinkName, names]) => {
        const count = names.length;
        const pct = Math.round((count / totalCount) * 100);
        return `
          <div class="space-y-1 py-1 border-b border-neutral-800/60">
            <div class="flex justify-between items-center text-[11px]">
              <span class="text-amber-300 font-bold">${escapeHtml(drinkName)}</span>
              <span class="text-cyan-400 font-mono">${count}x (${pct}%)</span>
            </div>
            <div class="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div class="bg-amber-500 h-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>
            <div class="text-[9px] text-neutral-400 font-sans truncate">${names.map((n) => escapeHtml(n)).join(', ')}</div>
          </div>
        `;
      })
      .join('');

    contentEl.innerHTML = `<div class="space-y-1">${drinkHtml}</div>`;
  } else if (type === 'quotes') {
    const quotesList = rawList.filter((g) => Boolean((g.note || '').trim()));
    titleEl.innerHTML = `💬 GÄSTEBUCH-SPRÜCHE AN GEORG (${quotesList.length})`;

    if (quotesList.length === 0) {
      contentEl.innerHTML = `<div class="text-neutral-500 py-2 text-center">Bisher hat noch niemand einen Spruch hinterlassen. Schreib den ersten in deiner Zusage!</div>`;
      return;
    }

    const quotesHtml = quotesList
      .map((g) => {
        const text = g.note || '';
        const time = formatRelativeTime(g.updatedAt || g.timestamp);
        return `
          <div class="p-2 rounded bg-neutral-950/80 border border-fuchsia-900/60 space-y-1">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-fuchsia-300 font-bold">${escapeHtml(g.name)}</span>
              <span class="text-neutral-500 text-[9px] font-mono">${time}</span>
            </div>
            <div class="text-amber-200 text-[11px] font-sans italic">"${escapeHtml(text)}"</div>
          </div>
        `;
      })
      .join('');

    contentEl.innerHTML = `<div class="space-y-1.5">${quotesHtml}</div>`;
  }
}

