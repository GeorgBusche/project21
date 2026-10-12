import { CONFIG } from '../config.js';
import { playTone } from './audio.js';
import { appendLine } from './ui.js';

let commandsCollapsed = false;

function setCommandsCollapsed(collapsed) {
  commandsCollapsed = collapsed;
  const grid = document.getElementById('commandGrid');
  const toggleButton = document.getElementById('cmdToggleBtn');
  if (!grid || !toggleButton) return;

  if (commandsCollapsed) {
    grid.className = 'grid grid-cols-8 gap-1 relative';
    toggleButton.innerHTML = '<span>▲</span> AUSKLAPPEN';
    document.querySelectorAll('.cmd-text').forEach((text) => text.classList.add('hidden'));
    document.querySelectorAll('.cmd-btn').forEach((button) => {
      button.classList.remove('py-2');
      button.classList.add('py-1.5');
    });
  } else {
    grid.className = 'grid grid-cols-2 sm:grid-cols-4 gap-1.5 transition-all relative';
    toggleButton.innerHTML = '<span>▼</span> EINKLAPPEN';
    document.querySelectorAll('.cmd-text').forEach((text) => text.classList.remove('hidden'));
    document.querySelectorAll('.cmd-btn').forEach((button) => {
      button.classList.remove('py-1.5');
      button.classList.add('py-2');
    });
  }
}

export function initializeCommands() {
  if (window.matchMedia('(max-height: 720px)').matches) {
    setCommandsCollapsed(true);
  }
}

export function toggleCommands() {
  setCommandsCollapsed(!commandsCollapsed);
}

export function runCommand(command) {
  playTone(650, 'sine', 0.05);

  switch (command) {
    case 'info':
      appendLine(
        `<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>📅 Wann: ${CONFIG.party.date}<br>⏰ Uhrzeit: ${CONFIG.party.time}<br>🏠 Wo: ${CONFIG.party.location}</div>`
      );
      break;
    case 'mathe':
      appendLine(
        "<div class='bg-neutral-900 p-3 rounded border border-yellow-600/70 text-xs text-yellow-300 font-mono'>Sei N die Menge aller Gäste. &forall; x &isin; N gilt: lim<sub>t &rarr; 03:00</sub> Promille(x) &ge; 1.8. q.e.d.</div>"
      );
      break;
    case 'shot_roulette': {
      const shot = CONFIG.shotsList[Math.floor(Math.random() * CONFIG.shotsList.length)];
      playTone(400, 'sawtooth', 0.08);
      setTimeout(() => playTone(800, 'sawtooth', 0.12), 100);
      appendLine(
        `<div class='bg-amber-950/50 p-2.5 rounded border border-amber-500 text-xs text-amber-200'>🎲 SHOT-ROULETTE: 👉 ${shot}</div>`
      );
      break;
    }
    case 'geschenke':
      appendLine(
        "<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>🎁 Bringt einfach gute Laune mit!</div>"
      );
      break;
  }
}
