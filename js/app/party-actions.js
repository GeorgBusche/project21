import { CONFIG } from '../config.js';
import { playBuzzerError, playSuccessChime, playTone } from './audio.js';
import { showRadarMap } from './radar-map.js';
import { appendLine, escapeHtml, showToast } from './ui.js';

let database;
let deviceToken;

export function initializePartyBackend() {
  const firebase = window.firebase;
  if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
  database = firebase.database();
  deviceToken = getDeviceToken();
}

function getDeviceToken() {
  let token = localStorage.getItem('party_device_token');
  if (!token) {
    token = `usr_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
    localStorage.setItem('party_device_token', token);
  }
  return token;
}

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

export function openMusicModal() {
  document.getElementById('musicModal').classList.remove('hidden');
  listenToMusicUpdates();
}

export function closeMusicModal() {
  document.getElementById('musicModal').classList.add('hidden');
}

export function submitSongProposal() {
  const input = document.getElementById('newSongInput');
  const title = input.value.trim();
  if (!title) return;

  database.ref(`songs/song_${Date.now()}`).set({
    title,
    votesCount: 1,
    voters: { [deviceToken]: true }
  });
  input.value = '';
  showToast('✓ Song hinzugefügt!');
}

export function toggleSongVote(songId) {
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
}

function listenToMusicUpdates() {
  database.ref('songs').on('value', (snapshot) => {
    const list = document.getElementById('songListContainer');
    if (!list) return;

    const songs = snapshot.val();
    if (!songs) {
      list.innerHTML = "<p class='text-xs text-neutral-500 text-center py-4'>Noch keine Songs.</p>";
      return;
    }

    const rankedSongs = Object.entries(songs)
      .map(([id, song]) => ({ id, ...song }))
      .sort((first, second) => second.votesCount - first.votesCount);
    list.innerHTML = rankedSongs
      .map(
        (song) => `
      <div class="flex justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800">
        <span class="text-xs font-bold text-white truncate pr-2">${escapeHtml(song.title)}</span>
        <button onclick="toggleSongVote('${song.id}')" class="px-3 py-1.5 rounded text-xs ${song.voters && song.voters[deviceToken] ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'}">🔥 ${song.votesCount || 0}</button>
      </div>`
      )
      .join('');
  });
}

export function openRsvpModal() {
  playTone(587, 'sine', 0.08);
  document.getElementById('rsvpModal').classList.remove('hidden');
  updatePegelDisplay(document.getElementById('rsvpPegel').value);
}

export function closeRsvpModal() {
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
  database.ref(`rsvps/${deviceToken}`).set({
    name,
    plusOne: hasPlusOne,
    plusOneName,
    drink,
    pegel: pegelValue,
    gift: document.getElementById('rsvpGift').value.trim(),
    timestamp: Date.now()
  });

  const message = `🚨 Zusage für deinen 21. Geburtstag! 🚨\nMoin ${CONFIG.party.hostName},\n\nBin dabei!\n👤 Name: ${name}\n👥 Begleitung: ${hasPlusOne ? plusOneName || 'Ja' : 'Nein'}\n⛽ Getränk: ${drink}\n📊 Pegel: ${CONFIG.pegelDescriptions[pegelValue]}`;
  playSuccessChime();
  closeRsvpModal();
  window.open(
    `https://wa.me/${CONFIG.party.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
    '_blank'
  );
}

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
      `<div class='border border-cyan-800 bg-neutral-900/80 p-3 rounded my-2 text-xs font-mono space-y-2'><div class='text-cyan-300 font-bold border-b border-cyan-800 pb-1'>ANGEMELDETE CREW (${guestList.length})</div>${guestList.map((guest) => `<div class='flex justify-between py-1 border-b border-neutral-800/50'><div><span class='text-white font-bold'>${escapeHtml(guest.name)}</span><br><span class='text-[11px] text-neutral-400'>${guest.drink}</span></div><span class='text-emerald-400 font-bold'>${guest.pegel}%</span></div>`).join('')}</div>`
    );
  });
}
