import { CONFIG } from '../config.js';
import { trackShow } from './achievements.js';
import { playTone } from './audio.js';
import { appendLine, showToast } from './ui.js';

let lastSudoParty = null;

const SUDO_MODULES = {
  bella: 'sudo_bella.html',
  wolle: 'sudo_wolle.html',
  rammstein: 'sudo_rammstein.html',
  biertornado: 'sudo_biertornado.html',
  ragecage: 'sudo_ragecage.html',
  schuettelkorn: 'sudo_schuettelkorn.html'
};

export function initializeSudo() {
  window.isSudoRunning = false;
  window.canSkip = false;
  window.appendLine = appendLine;
  window.playTone = playTone;

  if (CONFIG.sudoTestSong !== null) {
    const testButton = document.getElementById('sudoPartyBtn');
    if (testButton) {
      testButton.title = `Testmodus: spielt nur ${CONFIG.sudoTestSong}`;
      testButton.dataset.testMode = 'true';
      const icon = testButton.querySelector('.cmd-icon');
      const label = testButton.querySelector('.cmd-text');
      if (icon) icon.textContent = '🎧';
      if (label) label.textContent = 'TEST';
    }
  }

  const sudoButton = document.getElementById('sudoPartyBtn');
  if (sudoButton) setupSudoButtonGestures(sudoButton);

  document.addEventListener('click', () => {
    if (window.isSudoRunning && window.canSkip) emergencySkipParty();
  });
  document.addEventListener(
    'touchstart',
    () => {
      if (window.isSudoRunning && window.canSkip) emergencySkipParty();
    },
    { passive: true }
  );

  window.addEventListener('message', (event) => {
    if (event.data === 'sudo_finished' && window.isSudoRunning) emergencySkipParty();
  });
}

export function emergencySkipParty() {
  window.isSudoRunning = false;
  window.canSkip = false;
  playTone(150, 'sawtooth', 0.2);

  const frame = document.getElementById('sudoIframe');
  if (frame) frame.remove();

  const root = document.getElementById('bodyRoot');
  if (root) {
    root.classList.remove('sudo-running');
    root.className =
      'h-full flex flex-col justify-between select-none relative crt-overlay bg-neutral-950 pb-20 overflow-hidden';
    root.style.transform = 'none';
  }

  const actionBar = document.getElementById('actionbar');
  const commandGrid = document.getElementById('commandGrid');
  if (actionBar) actionBar.style.display = 'flex';
  if (commandGrid) commandGrid.style.pointerEvents = 'auto';

  appendLine(
    "<span class='text-emerald-400 font-bold'>[SYSTEM] Eskalation abgebrochen. System stabil.</span>"
  );
}

// Kurzer Klick = Zufalls-Show, langes Drücken = Jukebox zur Auswahl.
function setupSudoButtonGestures(button) {
  const LONG_PRESS_MS = 500;
  let timer = null;
  let longPressed = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  button.addEventListener('pointerdown', () => {
    longPressed = false;
    cancel();
    if (CONFIG.sudoTestSong !== null) return;
    timer = setTimeout(() => {
      longPressed = true;
      if (navigator.vibrate) navigator.vibrate(30);
      openSudoJukebox();
    }, LONG_PRESS_MS);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) =>
    button.addEventListener(type, cancel)
  );
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    if (longPressed) {
      longPressed = false;
      return;
    }
    triggerRandomSudoParty();
  });
}

export function openSudoJukebox() {
  if (window.isSudoRunning) {
    showToast('⚠️ System eskaliert bereits!');
    return;
  }
  if (CONFIG.sudoTestSong !== null) {
    triggerRandomSudoParty();
    return;
  }
  playTone(520, 'sine', 0.06);
  document.getElementById('sudoJukeboxModal')?.classList.remove('hidden');
}

export function closeSudoJukebox() {
  document.getElementById('sudoJukeboxModal')?.classList.add('hidden');
}

export function triggerSpecificSudoParty(songKey) {
  if (!Object.prototype.hasOwnProperty.call(SUDO_MODULES, songKey)) {
    showToast('⚠️ Unbekannte SUDO-Show');
    return;
  }
  startSudoParty(SUDO_MODULES[songKey]);
}

export function triggerRandomSudoParty() {
  const testSong = CONFIG.sudoTestSong;
  if (testSong !== null && !Object.prototype.hasOwnProperty.call(SUDO_MODULES, testSong)) {
    console.error(`Invalid SUDO test song "${testSong}".`);
    showToast('⚠️ Ungültiger SUDO-Test-Song in js/config.js');
    return;
  }

  if (testSong) {
    startSudoParty(SUDO_MODULES[testSong]);
    return;
  }

  const availableModules = Object.values(SUDO_MODULES).filter((module) => module !== lastSudoParty);
  startSudoParty(availableModules[Math.floor(Math.random() * availableModules.length)]);
}

function startSudoParty(moduleFile) {
  if (window.isSudoRunning) {
    showToast('⚠️ System eskaliert bereits!');
    return;
  }

  closeSudoJukebox();
  const showKey = Object.keys(SUDO_MODULES).find((key) => SUDO_MODULES[key] === moduleFile);
  if (showKey) trackShow(showKey);
  const actionBar = document.getElementById('actionbar');
  const commandGrid = document.getElementById('commandGrid');
  if (actionBar) actionBar.style.display = 'none';
  if (commandGrid) commandGrid.style.pointerEvents = 'none';

  lastSudoParty = moduleFile;
  window.isSudoRunning = true;
  window.canSkip = false;
  setTimeout(() => {
    window.canSkip = true;
  }, 1000);

  const root = document.getElementById('bodyRoot');
  if (root) root.classList.add('sudo-running');

  const frame = document.createElement('iframe');
  frame.id = 'sudoIframe';
  frame.src = `sudo_frames/${lastSudoParty}`;
  frame.className = 'fixed inset-0 w-full h-full z-[99999] border-none pointer-events-none';
  frame.allowTransparency = true;
  frame.setAttribute('allowtransparency', 'true');
  frame.style.backgroundColor = 'transparent';
  frame.style.willChange = 'transform';
  frame.style.transform = 'translateZ(0)';
  frame.style.contain = 'strict';
  frame.allow = 'autoplay';
  document.body.appendChild(frame);
}
