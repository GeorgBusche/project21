import { CONFIG } from '../../config.js';
import { playTone } from '../audio.js';
import { refreshCommandGridLayout } from '../commands.js';
import { getPartyContext } from '../party-actions.js';
import { showToast } from '../ui.js';

const PREVIEW_KEY = 'party_mode_preview';
const GRID_CLASS = 'grid grid-cols-2 sm:grid-cols-3 gap-1.5';

let overrideActive = false;
let currentIsLive = null;
let timeCheckTimer = null;
const changeListeners = [];

const BUTTON_BASE =
  'cmd-btn select-none py-2 rounded border text-[11px] active:scale-95 transition flex items-center justify-center gap-1.5';

const INVITE_BUTTONS = [
  { handler: "runCommand('info')", icon: 'ℹ️', text: 'INFOS', style: 'border-emerald-800 bg-emerald-950/30 text-emerald-300' },
  { handler: 'openRadarModal()', icon: '📡', text: 'RADAR', style: 'border-cyan-800 bg-cyan-950/30 text-cyan-300' },
  { handler: 'showGuestBoard()', icon: '👥', text: 'GÄSTE', style: 'border-cyan-800 bg-cyan-950/30 text-cyan-300' },
  { handler: 'openMusicModal()', icon: '🎵', text: 'PLAYLIST', style: 'border-fuchsia-800 bg-fuchsia-950/30 text-fuchsia-300' },
  'SUDO',
  {
    handler: "showToast('🔒 Party-Features (Glücksrad, Trinkspiel, Live-Voting &amp; Snap-Cam) starten am 10.12.!')",
    icon: '🔒',
    text: 'PARTY-MODUS (10.12.)',
    style: 'border-neutral-700 bg-neutral-900/50 text-neutral-500 opacity-70'
  }
];

const LIVE_BUTTONS = [
  { handler: 'openNextSongModal()', icon: '🎧', text: 'NEXT SONG', style: 'border-fuchsia-600 bg-fuchsia-950/40 text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.35)]' },
  { handler: 'openWheelModal()', icon: '🎡', text: 'GLÜCKSRAD', style: 'border-amber-600 bg-amber-950/40 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.35)]' },
  { handler: 'openDrinkingGameModal()', icon: '💣', text: 'TRINKSPIEL', style: 'border-rose-600 bg-rose-950/40 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.35)]' },
  { handler: 'openSnapModal()', icon: '📸', text: 'PARTY-SNAP', style: 'border-cyan-600 bg-cyan-950/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.35)]' },
  { handler: 'openGalleryModal()', icon: '🖼️', text: 'GALERIE', style: 'border-emerald-600 bg-emerald-950/40 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.35)]' },
  'SUDO'
];

const MINI_PILLS = [
  { handler: "runCommand('info')", label: 'ℹ️ INFOS' },
  { handler: 'openRadarModal()', label: '📡 RADAR' },
  { handler: 'showGuestBoard()', label: '👥 GÄSTE' }
];

function isPreviewActive() {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

function isTimeUnlocked() {
  const unlockAt = new Date(CONFIG.party.partyModeUnlockIso).getTime();
  return Number.isFinite(unlockAt) && Date.now() >= unlockAt;
}

export function isPartyModeLive() {
  return isTimeUnlocked() || overrideActive || isPreviewActive();
}

export function getPartyModeState() {
  return {
    live: isPartyModeLive(),
    timeUnlocked: isTimeUnlocked(),
    override: overrideActive,
    preview: isPreviewActive()
  };
}

export function onPartyModeChange(listener) {
  changeListeners.push(listener);
}

function notifyListeners() {
  const state = getPartyModeState();
  changeListeners.forEach((listener) => listener(state));
}

function buildButton(def) {
  return `<button type="button" onclick="${def.handler}" class="${BUTTON_BASE} ${def.style}"><span class="cmd-icon text-sm">${def.icon}</span><span class="cmd-text font-bold">${def.text}</span></button>`;
}

function syncMiniBar(grid, isLive) {
  let bar = document.getElementById('commandMiniBar');
  if (!isLive) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'commandMiniBar';
    bar.className = 'flex items-center gap-1.5 mb-1.5';
    grid.parentNode.insertBefore(bar, grid);
  }
  bar.innerHTML =
    '<span class="text-[9px] text-fuchsia-500 font-bold uppercase tracking-widest mr-auto">🔥 Live</span>' +
    MINI_PILLS.map(
      (pill) =>
        `<button type="button" onclick="${pill.handler}" class="px-2 py-0.5 rounded-full border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-[10px] active:scale-95 transition">${pill.label}</button>`
    ).join('');
}

export function applyPartyModeUI(isLive) {
  const grid = document.getElementById('commandGrid');
  if (!grid) return;
  currentIsLive = isLive;

  // Der SUDO-Button bleibt erhalten, damit seine Gesten-Listener nicht verloren gehen.
  const sudoButton = document.getElementById('sudoPartyBtn');
  sudoButton?.remove();

  const layout = isLive ? LIVE_BUTTONS : INVITE_BUTTONS;
  grid.innerHTML = layout
    .map((def) => (def === 'SUDO' ? '<span data-sudo-slot></span>' : buildButton(def)))
    .join('');
  const slot = grid.querySelector('[data-sudo-slot]');
  if (slot && sudoButton) slot.replaceWith(sudoButton);

  syncMiniBar(grid, isLive);
  refreshCommandGridLayout(GRID_CLASS);

  const status = document.getElementById('terminalStatusText');
  if (status) {
    status.textContent = isLive ? '🔥 PARTY LIVE' : 'BEREIT 🍻';
    status.className = `${isLive ? 'text-fuchsia-400' : 'text-emerald-400'} font-bold animate-pulse`;
  }
}

function reevaluate(announce = false) {
  const live = isPartyModeLive();
  if (live !== currentIsLive) {
    const wasKnown = currentIsLive !== null;
    applyPartyModeUI(live);
    if (announce && wasKnown && live) showToast('🔥 PARTY-MODUS AKTIV! Neue Features freigeschaltet.');
  }
  notifyListeners();
}

export function initializeModeController() {
  const { database } = getPartyContext();
  reevaluate();

  if (database) {
    database.ref('partyModeOverride').on('value', (snapshot) => {
      overrideActive = snapshot.val() === true;
      reevaluate(true);
    });
  }

  clearInterval(timeCheckTimer);
  timeCheckTimer = setInterval(() => reevaluate(true), 30000);
}

export function toggleGlobalPartyMode() {
  const { database } = getPartyContext();
  if (!database) return Promise.resolve(false);
  const next = !overrideActive;
  return database
    .ref('partyModeOverride')
    .set(next)
    .then(() => {
      showToast(next ? '🌐 Party-Modus für ALLE live geschaltet' : '🔒 Party-Modus für alle gesperrt');
      return next;
    })
    .catch(() => {
      showToast('Fehler beim Schreiben in die Datenbank');
      return overrideActive;
    });
}

export function togglePartyModePreview() {
  const next = !isPreviewActive();
  try {
    if (next) sessionStorage.setItem(PREVIEW_KEY, 'true');
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch (_) {}
  playTone(next ? 880 : 440, 'sine', 0.06);
  showToast(next ? '👁️ Vorschau aktiv (nur für dich)' : 'Vorschau beendet');
  applyPartyModeUI(isPartyModeLive());
  notifyListeners();
  return next;
}
