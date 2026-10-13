import { CONFIG } from '../../config.js';
import { playSuccessChime, playTone } from '../audio.js';
import { getPartyContext, stopAudioPreview } from '../party-actions.js';
import { appendLine, escapeHtml, showToast } from '../ui.js';

const ROUND_MS = 90000;
const SPOTIFY_SCOPES =
  'playlist-modify-public playlist-modify-private user-modify-playback-state user-read-playback-state';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';
const WINNER_QUEUE_MAX_AGE_MS = 10 * 60 * 1000;

const LS = {
  clientId: 'spotify_client_id',
  playlistId: 'spotify_playlist_id',
  tokens: 'spotify_tokens',
  verifier: 'spotify_pkce_verifier',
  state: 'spotify_auth_state',
  lastQueued: 'spotify_last_queued_round',
  autoRotate: 'spotify_auto_rotate'
};

let round = null;
let renderedRoundId = null;
let modalOpen = false;
let advancing = false;
let tickTimer = null;

// ==========================================
// Hilfsfunktionen
// ==========================================

const byId = (id) => document.getElementById(id);

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (_) {}
}

function getClientId() {
  return readStorage(LS.clientId) || CONFIG.party.spotify?.clientId || '';
}

function getPlaylistId() {
  const raw = readStorage(LS.playlistId) || CONFIG.party.spotify?.playlistId || '';
  const match = raw.match(/playlist[/:]([A-Za-z0-9]+)/);
  return (match ? match[1] : raw).trim();
}

function getRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getTokens() {
  try {
    return JSON.parse(readStorage(LS.tokens));
  } catch (_) {
    return null;
  }
}

export function isSpotifyConnected() {
  return Boolean(getTokens()?.refresh_token || getTokens()?.access_token);
}

function isAutoRotate() {
  return readStorage(LS.autoRotate) === 'true';
}

function setSpotifyStatus(text) {
  const status = byId('spotifyStatus');
  if (status) status.textContent = text;
}

// ==========================================
// Spotify OAuth 2.0 PKCE
// ==========================================

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

async function createCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function storeTokenResponse(data, previous) {
  writeStorage(
    LS.tokens,
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token || previous?.refresh_token || '',
      expires_at: Date.now() + (data.expires_in || 3600) * 1000
    })
  );
}

export async function connectSpotify(clientIdInput, playlistInput) {
  const clientId = String(clientIdInput || getClientId()).trim();
  if (!clientId) {
    showToast('Bitte zuerst die Spotify Client ID eintragen');
    return;
  }
  if (!window.crypto?.subtle) {
    showToast('Spotify-Login braucht HTTPS oder localhost');
    return;
  }
  writeStorage(LS.clientId, clientId);
  if (playlistInput !== undefined && playlistInput !== null) {
    writeStorage(LS.playlistId, String(playlistInput).trim());
  }

  const verifier = randomString(96);
  const state = randomString(24);
  writeStorage(LS.verifier, verifier);
  writeStorage(LS.state, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: getRedirectUri(),
    state,
    code_challenge_method: 'S256',
    code_challenge: await createCodeChallenge(verifier)
  });
  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  if (!state || state !== readStorage(LS.state)) return false;

  const code = params.get('code');
  const error = params.get('error');
  const verifier = readStorage(LS.verifier);
  writeStorage(LS.state, null);
  writeStorage(LS.verifier, null);
  window.history.replaceState(null, '', window.location.pathname);

  if (error || !code || !verifier) {
    showToast('Spotify-Verbindung abgebrochen');
    return false;
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getClientId(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: verifier
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    storeTokenResponse(await response.json(), null);
    showToast('🟢 Spotify verbunden!');
    window.openAdminModal?.();
    return true;
  } catch (err) {
    console.error('Spotify token exchange failed', err);
    showToast('Spotify-Login fehlgeschlagen');
    return false;
  }
}

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refresh_token) throw new Error('no refresh token');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: getClientId()
    })
  });
  if (!response.ok) throw new Error(`refresh failed ${response.status}`);
  storeTokenResponse(await response.json(), tokens);
  return getTokens().access_token;
}

async function getAccessToken(forceRefresh = false) {
  const tokens = getTokens();
  if (!tokens) throw new Error('not connected');
  if (!forceRefresh && tokens.access_token && tokens.expires_at - 60000 > Date.now()) {
    return tokens.access_token;
  }
  return refreshAccessToken();
}

async function spotifyFetch(url, options = {}, retried = false) {
  const token = await getAccessToken(retried);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 401 && !retried) return spotifyFetch(url, options, true);
  if (response.status === 429) {
    const wait = Number(response.headers.get('Retry-After') || 1) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 10000)));
    return spotifyFetch(url, options, retried);
  }
  return response;
}

export function disconnectSpotify() {
  writeStorage(LS.tokens, null);
  writeStorage(LS.autoRotate, null);
  showToast('Spotify getrennt');
  renderSpotifyAdminState();
}

// ==========================================
// Spotify-Playlist-Synchronisation
// ==========================================

async function searchTrackUri(title, artist) {
  const clean = (text) => String(text || '').replace(/["]/g, ' ').trim();
  const queries = [`track:${clean(title)} artist:${clean(artist)}`, `${clean(title)} ${clean(artist)}`];
  for (const query of queries) {
    const response = await spotifyFetch(
      `${API}/search?type=track&limit=1&q=${encodeURIComponent(query)}`
    );
    if (!response.ok) continue;
    const data = await response.json();
    const uri = data?.tracks?.items?.[0]?.uri;
    if (uri) return uri;
  }
  return '';
}

async function getPlaylistUris(playlistId) {
  const uris = new Set();
  let url = `${API}/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri)),next`;
  while (url) {
    const response = await spotifyFetch(url);
    if (!response.ok) throw new Error(`Playlist lesen fehlgeschlagen (${response.status})`);
    const data = await response.json();
    (data.items || []).forEach((item) => {
      if (item?.track?.uri) uris.add(item.track.uri);
    });
    url = data.next;
  }
  return uris;
}

export async function syncSongsToSpotifyPlaylist() {
  const { database } = getPartyContext();
  const playlistId = getPlaylistId();
  if (!database) return;
  if (!isSpotifyConnected()) {
    showToast('Bitte zuerst mit Spotify verbinden');
    return;
  }
  if (!playlistId) {
    showToast('Bitte Playlist-ID eintragen');
    return;
  }

  try {
    setSpotifyStatus('⏳ Synchronisiere...');
    const snapshot = await database.ref('songs').once('value');
    const songs = snapshot.val() || {};
    const entries = Object.entries(songs);
    const uris = [];
    let notFound = 0;

    for (const [songId, song] of entries) {
      let uri = song.spotifyUri || '';
      if (!uri) {
        uri = await searchTrackUri(song.title, song.artist);
        if (uri) await database.ref(`songs/${songId}/spotifyUri`).set(uri);
      }
      if (uri) uris.push(uri);
      else notFound += 1;
    }

    const existing = await getPlaylistUris(playlistId);
    const missing = [...new Set(uris)].filter((uri) => !existing.has(uri));
    for (let index = 0; index < missing.length; index += 100) {
      const response = await spotifyFetch(`${API}/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: missing.slice(index, index + 100) })
      });
      if (!response.ok) throw new Error(`Hinzufügen fehlgeschlagen (${response.status})`);
    }

    const summary = `✅ ${missing.length} neu hinzugefügt · ${uris.length - missing.length} schon vorhanden${
      notFound ? ` · ${notFound} nicht gefunden` : ''
    }`;
    setSpotifyStatus(summary);
    showToast(summary);
  } catch (err) {
    console.error('Spotify sync failed', err);
    setSpotifyStatus(`❌ ${err.message || 'Sync fehlgeschlagen'}`);
    showToast('Spotify-Sync fehlgeschlagen');
  }
}

async function queueWinnerInSpotify(winner) {
  try {
    const uri = winner.spotifyUri || (await searchTrackUri(winner.title, winner.artist));
    if (!uri) {
      showToast(`Kein Spotify-Treffer für "${winner.title}"`);
      return false;
    }
    const response = await spotifyFetch(`${API}/me/player/queue?uri=${encodeURIComponent(uri)}`, {
      method: 'POST'
    });
    if (response.ok || response.status === 204) {
      showToast(`🎧 In Spotify-Queue: ${winner.title}`);
      appendLine(
        `<span class='text-fuchsia-300 font-bold'>[NEXT SONG] ${escapeHtml(winner.title)} – ${escapeHtml(winner.artist)} läuft als Nächstes!</span>`
      );
      return true;
    }
    showToast(
      response.status === 404
        ? 'Kein aktives Spotify-Gerät – Spotify auf dem Party-Gerät starten!'
        : `Spotify-Queue fehlgeschlagen (${response.status})`
    );
  } catch (err) {
    console.error('Spotify queue failed', err);
    showToast('Spotify-Queue fehlgeschlagen');
  }
  return false;
}

// Nur der verbundene Admin-Browser schickt den Gewinner an Spotify; die Runde dient als Deduplizierung.
function maybeQueueLastWinner() {
  const winner = round?.lastWinner;
  if (!winner || !isSpotifyConnected()) return;
  const id = String(winner.roundId);
  if (readStorage(LS.lastQueued) === id) return;
  writeStorage(LS.lastQueued, id);
  if (Date.now() - (winner.decidedAt || 0) > WINNER_QUEUE_MAX_AGE_MS) return;
  queueWinnerInSpotify(winner);
}

// ==========================================
// Live 3er-Voting (Firebase `liveNextVote`)
// ==========================================

function buildPool() {
  const { getCachedSongs } = getPartyContext();
  return Object.entries(getCachedSongs() || {})
    .map(([songId, song]) => ({
      songId,
      title: song.title || '',
      artist: song.artist || '',
      cover: song.cover || '',
      previewUrl: song.previewUrl || '',
      spotifyUri: song.spotifyUri || ''
    }))
    .filter((song) => song.title);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawOptions(pool, exclude) {
  const fresh = pool.filter((song) => !exclude.has(song.songId));
  const source = fresh.length >= 3 ? fresh : pool;
  const picked = shuffle(source).slice(0, 3);
  const options = {};
  picked.forEach((song, index) => {
    options[`opt${index + 1}`] = song;
  });
  return options;
}

function countVotes(option) {
  return Object.keys(option?.votes || {}).length;
}

function pickWinner(current, now) {
  const entries = Object.values(current?.options || {});
  const max = Math.max(0, ...entries.map(countVotes));
  if (max === 0) return null;
  const tied = entries.filter((option) => countVotes(option) === max);
  const winner = tied[Math.floor(Math.random() * tied.length)];
  return {
    roundId: current.roundId,
    songId: winner.songId || '',
    title: winner.title || '',
    artist: winner.artist || '',
    cover: winner.cover || '',
    spotifyUri: winner.spotifyUri || '',
    votes: max,
    decidedAt: now
  };
}

function runRoundTransaction(force) {
  const { database } = getPartyContext();
  const pool = buildPool();
  if (!database || pool.length < 2) return Promise.resolve(false);

  return database
    .ref('liveNextVote')
    .transaction((current) => {
      const now = Date.now();
      if (!force && current && current.endsAt > now) return undefined;

      const next = {};
      const winner = current ? pickWinner(current, now) : null;
      const lastWinner = winner || current?.lastWinner;
      if (lastWinner) next.lastWinner = lastWinner;

      const exclude = new Set(Object.values(current?.options || {}).map((option) => option.songId));
      next.roundId = now;
      next.endsAt = now + ROUND_MS;
      next.options = drawOptions(pool, exclude);
      return next;
    })
    .then((result) => result.committed)
    .catch(() => false);
}

async function advanceRound(force = false) {
  if (advancing) return false;
  advancing = true;
  try {
    return await runRoundTransaction(force);
  } finally {
    setTimeout(() => {
      advancing = false;
    }, 2000);
  }
}

export function castNextVote(optionKey) {
  const { database, deviceToken } = getPartyContext();
  if (!database || !round?.options?.[optionKey]) return;
  const roundId = round.roundId;
  playTone(850, 'sine', 0.06);

  database.ref('liveNextVote').transaction((current) => {
    if (!current || current.roundId !== roundId || !current.options?.[optionKey]) return undefined;
    Object.values(current.options).forEach((option) => {
      if (option.votes) delete option.votes[deviceToken];
    });
    const target = current.options[optionKey];
    target.votes = { ...(target.votes || {}), [deviceToken]: true };
    return current;
  });
}

// ==========================================
// Gäste-UI (#nextSongModal)
// ==========================================

function getOwnVoteKey() {
  const { deviceToken } = getPartyContext();
  const entry = Object.entries(round?.options || {}).find(([, option]) => option.votes?.[deviceToken]);
  return entry ? entry[0] : null;
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderCards() {
  const container = byId('nextSongOptions');
  if (!container) return;
  stopAudioPreview();
  container.innerHTML = Object.entries(round.options)
    .map(([key, option]) => {
      const cover = option.cover
        ? `<img src="${escapeHtml(option.cover)}" alt="Cover" class="w-16 h-16 rounded object-cover border border-fuchsia-800" />`
        : '<div class="w-16 h-16 rounded bg-neutral-900 border border-fuchsia-800 flex items-center justify-center text-2xl">🎵</div>';
      const preview = option.previewUrl
        ? `<button type="button" data-preview-btn="nv_${key}" data-url="${escapeHtml(option.previewUrl)}" onclick="toggleAudioPreview(this.dataset.url, this.getAttribute('data-preview-btn'))" class="px-2.5 py-1 rounded border border-fuchsia-700 text-fuchsia-200 text-xs active:scale-95 transition" title="Hörprobe (30s)">▶️</button>`
        : '';
      return `
        <div id="nv-card-${key}" class="p-2.5 rounded-lg border border-fuchsia-900 bg-neutral-900/70 transition">
          <div class="flex items-center gap-2.5">
            ${cover}
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm text-white truncate">${escapeHtml(option.title)}</div>
              <div class="text-[11px] text-fuchsia-300 truncate">${escapeHtml(option.artist)}</div>
            </div>
            ${preview}
          </div>
          <div class="mt-2 h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div id="nv-bar-${key}" class="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-500" style="width:0%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-neutral-400 mt-0.5 font-mono">
            <span id="nv-pct-${key}">0%</span><span id="nv-count-${key}">0 Stimmen</span>
          </div>
          <button type="button" id="nv-btn-${key}" onclick="castNextVote('${key}')" class="mt-1.5 w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-extrabold text-xs active:scale-95 transition">🔥 ALS NÄCHSTES SPIELEN</button>
        </div>`;
    })
    .join('');
  renderedRoundId = round.roundId;
}

function updateVoteDisplay() {
  const options = round?.options || {};
  const total = Object.values(options).reduce((sum, option) => sum + countVotes(option), 0);
  const own = getOwnVoteKey();
  Object.entries(options).forEach(([key, option]) => {
    const votes = countVotes(option);
    const percent = total ? Math.round((votes / total) * 100) : 0;
    const bar = byId(`nv-bar-${key}`);
    if (bar) bar.style.width = `${percent}%`;
    const pct = byId(`nv-pct-${key}`);
    if (pct) pct.textContent = `${percent}%`;
    const count = byId(`nv-count-${key}`);
    if (count) count.textContent = `${votes} ${votes === 1 ? 'Stimme' : 'Stimmen'}`;
    const button = byId(`nv-btn-${key}`);
    if (button) {
      button.textContent = own === key ? '✅ DEINE WAHL' : own ? '↪️ STIMME HIERHIN WECHSELN' : '🔥 ALS NÄCHSTES SPIELEN';
    }
    byId(`nv-card-${key}`)?.classList.toggle('border-fuchsia-400', own === key);
    byId(`nv-card-${key}`)?.classList.toggle('border-fuchsia-900', own !== key);
  });
}

function renderLastWinner() {
  const element = byId('nextSongLastWinner');
  if (!element) return;
  const winner = round?.lastWinner;
  element.textContent = winner ? `🔊 Zuletzt gewonnen: ${winner.title} - ${winner.artist}` : '';
  element.classList.toggle('hidden', !winner);
}

function renderNextSong() {
  renderLastWinner();
  const container = byId('nextSongOptions');
  if (!container) return;

  if (!round?.options) {
    renderedRoundId = null;
    const poolSize = buildPool().length;
    container.innerHTML = `<div class="p-4 text-center text-xs text-neutral-400 border border-dashed border-fuchsia-900 rounded-lg">${
      poolSize < 2
        ? 'Die Playlist braucht mindestens 2 Songs für eine Abstimmung. Schlag welche vor! 🎵'
        : 'Runde wird gestartet...'
    }</div>`;
    return;
  }
  if (renderedRoundId !== round.roundId) renderCards();
  updateVoteDisplay();
}

function tick() {
  const countdown = byId('nextSongCountdown');
  const remaining = round?.endsAt ? round.endsAt - Date.now() : null;

  if (countdown && modalOpen) {
    countdown.textContent =
      remaining === null
        ? '⏱️ Warte auf Start der nächsten Runde...'
        : remaining > 0
          ? `⏱️ Nächster Song wird in ${formatRemaining(remaining)} eingereiht`
          : '⏱️ Runde wird ausgewertet...';
  }

  const expired = remaining === null || remaining <= 0;
  if (expired && (modalOpen || (isAutoRotate() && round))) {
    setTimeout(() => advanceRound(false), Math.random() * 1200);
  }
  updateAdminCountdown(remaining);
}

export function openNextSongModal() {
  playTone(520, 'sine', 0.06);
  modalOpen = true;
  byId('nextSongModal')?.classList.remove('hidden');
  renderNextSong();
  tick();
}

export function closeNextSongModal() {
  modalOpen = false;
  stopAudioPreview();
  byId('nextSongModal')?.classList.add('hidden');
}

// ==========================================
// Admin-Steuerung
// ==========================================

function updateAdminCountdown(remaining) {
  const element = byId('adminNextVoteState');
  if (!element) return;
  element.textContent = `Runde: ${
    remaining === null ? 'keine aktiv' : remaining > 0 ? formatRemaining(remaining) : 'abgelaufen'
  } · Auto-Rotation: ${isAutoRotate() ? 'AN' : 'aus'}`;
}

export function renderSpotifyAdminState() {
  const clientInput = byId('spotifyClientIdInput');
  const playlistInput = byId('spotifyPlaylistInput');
  if (clientInput && document.activeElement !== clientInput) clientInput.value = getClientId();
  if (playlistInput && document.activeElement !== playlistInput) playlistInput.value = getPlaylistId();
  const redirect = byId('spotifyRedirectUri');
  if (redirect) redirect.textContent = getRedirectUri();
  setSpotifyStatus(isSpotifyConnected() ? '🟢 Mit Spotify verbunden' : '⚪ Nicht verbunden');
  updateAdminCountdown(round?.endsAt ? round.endsAt - Date.now() : null);
}

export function adminConnectSpotify() {
  return connectSpotify(byId('spotifyClientIdInput')?.value, byId('spotifyPlaylistInput')?.value);
}

export async function adminStartNextVote() {
  if (isAutoRotate()) {
    writeStorage(LS.autoRotate, null);
    showToast('Auto-Rotation beendet');
  } else {
    writeStorage(LS.autoRotate, 'true');
    const needsRound = !round?.options || round.endsAt <= Date.now();
    if (needsRound && !(await advanceRound(false))) {
      showToast('Runde nicht gestartet – braucht mind. 2 Songs in der Playlist');
    } else {
      showToast('🎧 3er-Voting läuft – Auto-Rotation an');
    }
  }
  renderSpotifyAdminState();
}

export async function adminSkipToNextVote() {
  if (!round?.options) {
    await advanceRound(true);
    return;
  }
  const ok = await advanceRound(true);
  showToast(ok ? '⏭️ Gewinner ermittelt, neue Runde gezogen' : 'Konnte die Runde nicht wechseln');
  if (ok) playSuccessChime();
}

// ==========================================
// Initialisierung
// ==========================================

export async function initializeSpotifyNextVote() {
  const { database } = getPartyContext();
  await handleSpotifyCallback();

  if (database) {
    database.ref('liveNextVote').on('value', (snapshot) => {
      round = snapshot.val();
      renderNextSong();
      maybeQueueLastWinner();
      renderSpotifyAdminState();
    });
  }

  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 1000);
}
