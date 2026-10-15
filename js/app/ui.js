import { CONFIG } from '../config.js';
import { CONTENT, DRINKS_CONFIG, EVENT_CORE, locationFull } from '../content.js';
import { getAudioContext, playTone } from './audio.js';

function readPath(path) {
  return path.split('.').reduce((value, key) => value?.[key], { ...CONTENT, event: { locationFull } });
}

function renderSudoShowGrid() {
  const grid = document.getElementById('sudoShowGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(CONTENT.ui.commands.sudoShows)
    .map(
      ([key, show]) =>
        `<button type="button" onclick="triggerSpecificSudoParty('${key}')" class="p-2 rounded-lg bg-neutral-900 border border-rose-900/70 hover:border-fuchsia-400 text-left active:scale-95 transition"><div class="font-bold text-rose-300">${escapeHtml(show.title)}</div><div class="text-[10px] text-neutral-400 font-sans">${escapeHtml(show.subtitle)}</div></button>`
    )
    .join('');
}

// Befüllt statische HTML-Elemente aus CONTENT:
// data-content="ui.headerTitle" setzt den Text, data-modal-title="rsvp" den Modal-Header.
function populateDrinkSelect() {
  const select = document.getElementById('rsvpDrink');
  if (!select) return;
  select.innerHTML = '';
  DRINKS_CONFIG.forEach((drink) => {
    const option = document.createElement('option');
    option.value = drink.label;
    option.textContent = drink.label;
    option.dataset.drinkId = drink.id;
    select.appendChild(option);
  });
}

const MODAL_CLOSERS = {
  rsvpModal: () => window.closeRsvpModal?.(),
  radarModal: () => window.closeRadarModal?.(),
  musicModal: () => window.closeMusicModal?.(),
  guestModal: () => window.closeGuestModal?.(),
  guestStatsModal: () => window.closeGuestStatsModal?.(),
  adminModal: () => window.closeAdminModal?.(),
  sudoJukeboxModal: () => window.closeSudoJukebox?.(),
  achievementsModal: () => window.closeTrophies?.(),
  wheelModal: () => window.closeWheelModal?.(),
  drinkingGameModal: () => window.closeDrinkingGameModal?.(),
  nextSongModal: () => window.closeNextSongModal?.(),
  snapModal: () => window.closeSnapModal?.(),
  galleryModal: () => window.closeGalleryModal?.(),
  ticketModal: () => window.closeTicketModal?.()
};

let modalUxReady = false;

function isOpen(element) {
  return Boolean(element) && !element.classList.contains('hidden');
}

export function initializeModalUx() {
  if (modalUxReady) return;
  modalUxReady = true;
  Object.keys(MODAL_CLOSERS).forEach((id) => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('menu-overlay');
    const panel = overlay.firstElementChild;
    panel.classList.add('menu-dialog');
    const heading = panel.querySelector('[data-modal-title]');
    if (heading) {
      heading.id ||= `${id}Title`;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', heading.id);
    }
    panel.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim() === '✕') {
        const clearsSearch = button.getAttribute('onclick')?.startsWith('clear');
        if (!clearsSearch) button.classList.add('menu-close');
        button.setAttribute('aria-label', clearsSearch ? 'Suche löschen' : 'Schließen');
      }
    });
  });

  // Klick auf das äußere Overlay schließt über die jeweilige Close-Funktion (stoppt Audio, Kamera, Timer).
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'galleryLightbox') {
      window.closeGalleryLightbox?.();
      return;
    }
    const close = MODAL_CLOSERS[target.id];
    if (close && isOpen(target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isOpen(document.getElementById('galleryLightbox'))) {
      window.closeGalleryLightbox?.();
      return;
    }
    if (isOpen(document.getElementById('guestStatsModal'))) {
      window.closeGuestStatsModal?.();
      return;
    }
    // Das zuletzt im DOM stehende sichtbare Modal liegt oben.
    const open = Object.keys(MODAL_CLOSERS)
      .map((id) => document.getElementById(id))
      .filter(isOpen)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const top = open[open.length - 1];
    if (top) MODAL_CLOSERS[top.id]();
  });
}

export function applyStaticContent() {
  initializeModalUx();
  document.title = CONTENT.ui.pageTitle;
  const radarMapsLink = document.getElementById('radarMapsLink');
  if (radarMapsLink) radarMapsLink.href = EVENT_CORE.mapsUrl;
  renderSudoShowGrid();
  populateDrinkSelect();
  document.querySelectorAll('[data-content]').forEach((element) => {
    const value = readPath(element.dataset.content);
    if (typeof value === 'string') element.textContent = value;
  });

  document.querySelectorAll('[data-modal-title]').forEach((heading) => {
    const entry = CONTENT.ui.modals[heading.dataset.modalTitle];
    if (!entry) return;
    heading.textContent = entry.title;

    const subtitle = entry.subtitle || '';
    let subtitleEl = document.querySelector(
      `[data-content="ui.modals.${heading.dataset.modalTitle}.subtitle"]`
    );
    if (!subtitleEl && subtitle) {
      const wrapper = document.createElement('div');
      wrapper.className = 'min-w-0';
      heading.replaceWith(wrapper);
      wrapper.appendChild(heading);
      subtitleEl = document.createElement('p');
      subtitleEl.className = 'text-[10px] opacity-70';
      wrapper.appendChild(subtitleEl);
    }
    if (subtitleEl) {
      subtitleEl.textContent = subtitle;
      subtitleEl.classList.toggle('hidden', !subtitle);
    }
  });
}

export function toggleCRT() {
  document.body.classList.toggle('crt-overlay');
  showToast('CRT-Filter umgeschaltet');
  playTone(400, 'sine', 0.05);
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .catch(() => showToast('Vollbild wird nicht unterstützt.'));
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

export function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;

  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2200);
}

export function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]
  );
}

export function appendLine(html, delay = 0) {
  setTimeout(() => {
    const output = document.getElementById('terminalOutput');
    if (!output) return;

    const line = document.createElement('div');
    line.innerHTML = html;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    playTone(1300 + Math.random() * 300, 'sine', 0.015, 0.02);
  }, delay);
}

function updatePartyCountdown() {
  const badge = document.getElementById('partyCountdown');
  if (!badge) return;

  const diff = new Date(CONFIG.party.startIso).getTime() - Date.now();
  if (Number.isNaN(diff)) {
    badge.textContent = '';
    return;
  }
  if (diff <= 0) {
    badge.textContent = CONTENT.ui.countdown.running;
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  badge.textContent = `${CONTENT.ui.countdown.prefix} ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

let countdownTimer = null;

export function startBootSequence() {
  updatePartyCountdown();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(updatePartyCountdown, 1000);
  const bootSequence = CONTENT.bootSequence;

  bootSequence.forEach((item) => appendLine(item.text, item.delay));
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}
