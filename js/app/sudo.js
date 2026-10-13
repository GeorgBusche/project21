import { CONFIG } from '../config.js';
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
      const icon = testButton.querySelector('.cmd-icon');
      const label = testButton.querySelector('.cmd-text');
      if (icon) icon.textContent = '🎧';
      if (label) label.textContent = 'TEST';
    }
  }

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

export function triggerRandomSudoParty() {
  if (window.isSudoRunning) {
    showToast('⚠️ System eskaliert bereits!');
    return;
  }

  const testSong = CONFIG.sudoTestSong;
  if (testSong !== null && !Object.prototype.hasOwnProperty.call(SUDO_MODULES, testSong)) {
    console.error(`Invalid SUDO test song "${testSong}".`);
    showToast('⚠️ Ungültiger SUDO-Test-Song in js/config.js');
    return;
  }

  const actionBar = document.getElementById('actionbar');
  const commandGrid = document.getElementById('commandGrid');
  if (actionBar) actionBar.style.display = 'none';
  if (commandGrid) commandGrid.style.pointerEvents = 'none';

  if (testSong) {
    lastSudoParty = SUDO_MODULES[testSong];
  } else {
    const availableModules = Object.values(SUDO_MODULES).filter(
      (module) => module !== lastSudoParty
    );
    lastSudoParty = availableModules[Math.floor(Math.random() * availableModules.length)];
  }

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
