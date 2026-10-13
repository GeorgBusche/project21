import { CONFIG } from '../config.js';
import { playBuzzerError, playSuccessChime, playTone } from './audio.js';
import { escapeHtml, showToast } from './ui.js';
import {
  getPartyModeState,
  onPartyModeChange,
  toggleGlobalPartyMode,
  togglePartyModePreview
} from './party-mode/mode-controller.js';
import {
  adminConnectSpotify,
  adminSkipToNextVote,
  adminStartNextVote,
  disconnectSpotify,
  renderSpotifyAdminState,
  syncSongsToSpotifyPlaylist
} from './party-mode/spotify-next-vote.js';

function adminOnly(action) {
  if (!isAdminAuth) return undefined;
  return action();
}

export function adminSpotifyConnect() {
  return adminOnly(adminConnectSpotify);
}
export function adminSpotifyDisconnect() {
  return adminOnly(disconnectSpotify);
}
export function adminSpotifySyncPlaylist() {
  return adminOnly(syncSongsToSpotifyPlaylist);
}
export function adminNextVoteStart() {
  return adminOnly(adminStartNextVote);
}
export function adminNextVoteSkip() {
  return adminOnly(adminSkipToNextVote);
}

function updateAdminPartyModeLabels() {
  const state = getPartyModeState();
  const globalLabel = document.getElementById('adminPartyModeGlobalState');
  const previewLabel = document.getElementById('adminPartyModePreviewState');
  if (globalLabel) {
    globalLabel.textContent = state.timeUnlocked
      ? 'Automatisch live (Freischalt-Datum erreicht)'
      : state.override
        ? '🟢 Für alle LIVE – klicken zum Sperren'
        : '🔒 Gesperrt – klicken zum Freischalten';
  }
  if (previewLabel) {
    previewLabel.textContent = state.preview ? '👁️ Vorschau AN – klicken zum Beenden' : 'Vorschau aus';
  }
}

export function adminTogglePartyModeGlobal() {
  if (!isAdminAuth) return;
  toggleGlobalPartyMode();
}

export function adminTogglePartyModePreview() {
  if (!isAdminAuth) return;
  togglePartyModePreview();
}

let isAdminAuth = false;
let databaseInstance = null;
let currentAnnouncement = '';

function getDatabase() {
  if (!databaseInstance && window.firebase && window.firebase.apps.length) {
    databaseInstance = window.firebase.database();
  }
  return databaseInstance;
}

export function initializeAdmin() {
  onPartyModeChange(updateAdminPartyModeLabels);
  updateAdminPartyModeLabels();

  // Check session storage
  try {
    if (sessionStorage.getItem('party_admin_auth') === 'true') {
      isAdminAuth = true;
    }
  } catch (_) {}

  // Check URL hash
  if (window.location.hash === '#admin') {
    openAdminModal();
  }

  // Listen for announcement
  listenToAnnouncement();
}

export function openAdminModal() {
  playTone(520, 'sine', 0.05);
  const modal = document.getElementById('adminModal');
  if (!modal) return;

  modal.classList.remove('hidden');

  if (isAdminAuth) {
    showAdminDashboard();
  } else {
    showAdminPinView();
  }
}

export function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('hidden');
}

function showAdminPinView() {
  document.getElementById('adminPinView')?.classList.remove('hidden');
  document.getElementById('adminDashboardView')?.classList.add('hidden');
  const input = document.getElementById('adminPinInput');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
}

export function verifyAdminPin() {
  const input = document.getElementById('adminPinInput');
  const entered = (input?.value || '').trim();
  const correctPin = String(CONFIG.party.adminPin || '2121');

  if (entered === correctPin) {
    isAdminAuth = true;
    try {
      sessionStorage.setItem('party_admin_auth', 'true');
    } catch (_) {}
    playSuccessChime();
    showToast('✓ Root-Zugriff gewährt! Willkommen Georg.');
    showAdminDashboard();
  } else {
    playBuzzerError();
    showToast('❌ Falscher PIN!');
    if (input) {
      input.value = '';
      input.classList.add('shake-denied');
      setTimeout(() => input.classList.remove('shake-denied'), 400);
      input.focus();
    }
  }
}

export function adminAppendPin(digit) {
  const input = document.getElementById('adminPinInput');
  if (!input) return;
  if (input.value.length < 6) {
    input.value += digit;
    playTone(400 + input.value.length * 80, 'sine', 0.03);
    if (input.value.length === 4) {
      verifyAdminPin();
    }
  }
}

export function adminClearPin() {
  const input = document.getElementById('adminPinInput');
  if (input) {
    input.value = '';
    playTone(300, 'sine', 0.03);
    input.focus();
  }
}

async function showAdminDashboard() {
  document.getElementById('adminPinView')?.classList.add('hidden');
  document.getElementById('adminDashboardView')?.classList.remove('hidden');
  renderSpotifyAdminState();

  await refreshAdminStats();
}

async function refreshAdminStats() {
  const db = getDatabase();
  if (!db) return;

  const [rsvpsSnap, songsSnap] = await Promise.all([
    db.ref('rsvps').once('value'),
    db.ref('songs').once('value')
  ]);

  const rsvps = rsvpsSnap.val() || {};
  const songs = songsSnap.val() || {};

  const rsvpsList = Object.values(rsvps);
  const totalGuests = rsvpsList.reduce((sum, r) => sum + 1 + (r.plusOne ? 1 : 0), 0);
  const totalSongs = Object.keys(songs).length;
  const totalVotes = Object.values(songs).reduce((sum, s) => sum + (s.votesCount || 0), 0);

  const statsBadge = document.getElementById('adminHeaderStats');
  if (statsBadge) {
    statsBadge.textContent = `${totalGuests} Personen (${rsvpsList.length} Zusagen) · ${totalSongs} Songs (${totalVotes} Votes)`;
  }

  // Update announcement input
  const annInput = document.getElementById('adminAnnouncementInput');
  if (annInput) {
    annInput.value = currentAnnouncement || '';
  }
}

// ==========================================
// EXPORTS
// ==========================================

export async function adminExportGuestsCsv() {
  const db = getDatabase();
  if (!db) return;

  const snap = await db.ref('rsvps').once('value');
  const rsvps = snap.val() || {};
  const list = Object.values(rsvps);

  if (list.length === 0) {
    showToast('⚠️ Keine Gästedaten vorhanden!');
    return;
  }

  const csvRows = [
    ['Name', 'Begleitung (+1)', 'Name Begleitung', 'Kraftstoff', 'Ziel-Pegel (%)', 'Songwunsch', 'Notiz / Spruch an Georg', 'Datum'].join(';')
  ];

  list.forEach((r) => {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const song = r.song ? `${r.song.title}${r.song.artist ? ' - ' + r.song.artist : ''}` : '';
    const date = r.updatedAt || r.timestamp ? new Date(r.updatedAt || r.timestamp).toLocaleString('de-DE') : '';
    csvRows.push([
      esc(r.name),
      esc(r.plusOne ? 'Ja' : 'Nein'),
      esc(r.plusOneName || ''),
      esc(r.drink || ''),
      esc(r.pegel || ''),
      esc(song),
      esc(r.note || ''),
      esc(date)
    ].join(';'));
  });

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `gaesteliste_georg21_${formatFileDate(new Date())}.csv`);
  showToast('✓ Gästeliste CSV heruntergeladen! 📊');
  playSuccessChime();
}

export async function adminCopyGuestsText() {
  const db = getDatabase();
  if (!db) return;

  const snap = await db.ref('rsvps').once('value');
  const rsvps = snap.val() || {};
  const list = Object.values(rsvps);

  if (list.length === 0) {
    showToast('⚠️ Keine Gästedaten vorhanden!');
    return;
  }

  const totalPeople = list.reduce((sum, r) => sum + 1 + (r.plusOne ? 1 : 0), 0);
  let text = `🎉 GÄSTELISTE: GEORGS 21. GEBURTSTAG 🎉\n`;
  text += `Gesamt: ${totalPeople} Personen (${list.length} Anmeldungen)\n`;
  text += `--------------------------------------------\n\n`;

  list.forEach((r, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    text += `${num}. ${r.name}${r.plusOne ? ` +1 (${r.plusOneName || 'Begleitung'})` : ''}\n`;
    text += `   ⛽ ${r.drink || 'Keine Angabe'} | 📈 ${r.pegel || 0}%\n`;
    if (r.song) text += `   🎵 ${r.song.title} - ${r.song.artist || ''}\n`;
    if (r.note) text += `   💬 "${r.note}"\n`;
    text += `\n`;
  });

  await navigator.clipboard.writeText(text);
  showToast('✓ Gästeliste für WhatsApp kopiert! 📋');
  playSuccessChime();
}

export async function adminShowDrinkCalculator() {
  const db = getDatabase();
  if (!db) return;

  const snap = await db.ref('rsvps').once('value');
  const rsvps = snap.val() || {};
  const list = Object.values(rsvps);

  let beerDrinkers = 0;
  let kornDrinkers = 0;
  let wineDrinkers = 0;
  let driverDrinkers = 0;
  let totalPeople = 0;

  list.forEach((r) => {
    const count = 1 + (r.plusOne ? 1 : 0);
    totalPeople += count;
    const d = (r.drink || '').toLowerCase();
    if (d.includes('pils') || d.includes('bier')) beerDrinkers += count;
    else if (d.includes('korn') || d.includes('schüttelkorn') || d.includes('mische') || d.includes('omas')) kornDrinkers += count;
    else if (d.includes('wein') || d.includes('sekt')) wineDrinkers += count;
    else if (d.includes('fahrer') || d.includes('0,0') || d.includes('softdrink')) driverDrinkers += count;
    else beerDrinkers += count;
  });

  const beerCrates = Math.ceil((beerDrinkers * 4.5) / 24);
  const kornBottles = Math.ceil(kornDrinkers * 0.4);
  const colaLiters = Math.ceil(kornBottles * 2.5);
  const wineBottles = Math.ceil(wineDrinkers * 0.6);
  const softdrinkCrates = Math.ceil((totalPeople * 1.5) / 12);

  const container = document.getElementById('adminDrinkCalcResult');
  if (container) {
    container.innerHTML = `
      <div class="p-3 bg-neutral-900 border border-amber-600/60 rounded-lg space-y-2 text-xs font-mono">
        <div class="text-amber-300 font-bold border-b border-amber-800 pb-1 flex justify-between">
          <span>🛒 EINKAUFS-EMPFEHLUNG FÜR ${totalPeople} GÄSTE</span>
          <span>${list.length} Zusagen</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-200">
          <div>🍺 <strong>Bier:</strong> ca. <span class="text-emerald-400 font-bold">${beerCrates} Kisten</span> (${beerDrinkers} Biertrinker)</div>
          <div>🥃 <strong>Korn / Schnaps:</strong> ca. <span class="text-amber-400 font-bold">${kornBottles} Flaschen</span> (${kornDrinkers} Misch-Fans)</div>
          <div>🥤 <strong>Cola / Mischen:</strong> ca. <span class="text-amber-400 font-bold">${colaLiters} Liter</span></div>
          <div>🍷 <strong>Wein / Sekt:</strong> ca. <span class="text-rose-400 font-bold">${wineBottles} Flaschen</span> (${wineDrinkers} Genießer)</div>
          <div>🚗 <strong>Softdrinks & Wasser:</strong> ca. <span class="text-cyan-400 font-bold">${softdrinkCrates} Kisten</span> (${driverDrinkers} Fahrer)</div>
        </div>
        <div class="pt-1 flex gap-2">
          <button
            onclick="adminCopyDrinkPlan('${totalPeople}', '${beerCrates}', '${kornBottles}', '${colaLiters}', '${wineBottles}', '${softdrinkCrates}')"
            class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-[11px] active:scale-95 transition"
          >
            📋 Einkaufsliste kopieren
          </button>
        </div>
      </div>
    `;
    container.classList.remove('hidden');
  }
}

export async function adminCopyDrinkPlan(people, beer, korn, cola, wine, soft) {
  const text = `🛒 EINKAUFSZETTEL FÜR GEORGS 21. GEBURTSTAG (${people} Personen):\n- ${beer} Kisten Bier\n- ${korn} Flaschen Korn / Schnaps\n- ${cola} Liter Cola\n- ${wine} Flaschen Wein/Sekt\n- ${soft} Kisten Softdrinks / Wasser\n\n(Tipp: Auf Kommission kaufen!)`;
  await navigator.clipboard.writeText(text);
  showToast('✓ Einkaufszettel kopiert! 🛒');
  playSuccessChime();
}

export async function adminExportPlaylist() {
  const db = getDatabase();
  if (!db) return;

  const snap = await db.ref('songs').once('value');
  const songs = snap.val() || {};
  const list = Object.values(songs).sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

  if (list.length === 0) {
    showToast('⚠️ Noch keine Songs in der Playlist!');
    return;
  }

  let text = `🎵 PARTY-PLAYLIST: DIE TOP-VOTES (${list.length} Tracks)\n`;
  text += `==============================================\n\n`;

  list.forEach((s, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    text += `[#${num}] (${s.votesCount || 0} Votes) ${s.title} - ${s.artist || 'Unbekannt'}\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, `party_playlist_georg21_${formatFileDate(new Date())}.txt`);
  showToast('✓ Playlist-Textdatei heruntergeladen! 🎵');
  playSuccessChime();
}

export async function adminDownloadFullBackup() {
  const db = getDatabase();
  if (!db) return;

  const [rsvpsSnap, songsSnap] = await Promise.all([
    db.ref('rsvps').once('value'),
    db.ref('songs').once('value')
  ]);

  const payload = {
    backupDate: new Date().toISOString(),
    rsvps: rsvpsSnap.val() || {},
    songs: songsSnap.val() || {},
    announcement: currentAnnouncement
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `backup_georg21_${formatFileDate(new Date())}.json`);
  showToast('✓ Vollständiges JSON-Backup heruntergeladen! 💾');
  playSuccessChime();
}

// ==========================================
// CLEAR & RESET
// ==========================================
// Löschen läuft bewusst nur über scripts/clear-db.js (mit automatischem Backup).

export async function adminHandleRestoreUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.rsvps && !data.songs) {
      showToast('❌ Ungültige Backup-Datei!');
      playBuzzerError();
      return;
    }

    if (!confirm(`Soll das Backup vom ${data.backupDate || 'unbekannt'} mit ${Object.keys(data.rsvps || {}).length} RSVPs und ${Object.keys(data.songs || {}).length} Songs eingespielt werden?`)) {
      return;
    }

    const db = getDatabase();
    if (!db) return;

    if (data.rsvps) await db.ref('rsvps').set(data.rsvps);
    if (data.songs) await db.ref('songs').set(data.songs);

    showToast('✓ Backup erfolgreich wiederhergestellt! 🔄');
    playSuccessChime();
    await refreshAdminStats();
  } catch (err) {
    console.error(err);
    showToast('❌ Fehler beim Lesen der Backup-Datei!');
    playBuzzerError();
  } finally {
    event.target.value = '';
  }
}

// ==========================================
// LIVE ANKÜNDIGUNG (BANNER)
// ==========================================

function listenToAnnouncement() {
  const db = getDatabase();
  if (!db) return;

  db.ref('announcement').on('value', (snapshot) => {
    currentAnnouncement = snapshot.val() || '';
    renderAnnouncementBanner(currentAnnouncement);
  });
}

export async function adminSaveAnnouncement() {
  const text = (document.getElementById('adminAnnouncementInput')?.value || '').trim();
  const db = getDatabase();
  if (!db) return;

  if (!text) {
    await db.ref('announcement').remove();
    showToast('✓ Ankündigung entfernt.');
  } else {
    await db.ref('announcement').set(text);
    showToast('✓ Ankündigung live geschaltet! 📢');
  }
  playSuccessChime();
}

function renderAnnouncementBanner(text) {
  let banner = document.getElementById('liveAnnouncementBanner');
  if (!banner) {
    const terminalOutput = document.getElementById('terminalOutput');
    if (!terminalOutput) return;

    banner = document.createElement('div');
    banner.id = 'liveAnnouncementBanner';
    terminalOutput.parentElement.insertBefore(banner, terminalOutput);
  }

  if (!text) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
  } else {
    banner.className = 'mb-2 p-2.5 rounded-lg bg-amber-950/80 border-2 border-amber-500 text-amber-200 text-xs font-mono shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-between gap-2';
    banner.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base animate-pulse">📢</span>
        <div>
          <strong class="text-amber-300">ANKÜNDIGUNG VON GEORG:</strong>
          <span class="text-white">${escapeHtml(text)}</span>
        </div>
      </div>
    `;
    banner.classList.remove('hidden');
  }
}

// ==========================================
// UTILS
// ==========================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatFileDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
