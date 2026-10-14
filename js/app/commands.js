import { CONFIG } from '../config.js';
import { CONTENT } from '../content.js';
import { openTrophies, trackCommand, trackFlag } from './achievements.js';
import { playTone } from './audio.js';
import { openSudoJukebox, triggerSpecificSudoParty } from './sudo.js';
import { appendLine, escapeHtml } from './ui.js';

let commandsCollapsed = false;
let expandedGridClass = 'grid grid-cols-2 sm:grid-cols-3 gap-1.5';
const cliHistory = [];
let cliHistoryIndex = 0;

const SUDO_SHOWS = ['bella', 'wolle', 'rammstein', 'biertornado', 'ragecage', 'schuettelkorn'];

const VIRTUAL_FILES = CONTENT.secretCli.virtualFiles;

export function initializeCommands() {
  if (window.matchMedia('(max-height: 720px)').matches) {
    setCommandsCollapsed(true);
  }
  initializeSecretCli();
}

function isAnyModalOpen() {
  return document.querySelector('[id$="Modal"]:not(.hidden)') !== null;
}

function showSecretCli() {
  const bar = document.getElementById('secretCliBar');
  if (!bar) return;
  bar.classList.remove('hidden');
  document.getElementById('secretCliInput')?.focus();
}

function hideSecretCli() {
  const bar = document.getElementById('secretCliBar');
  if (bar) bar.classList.add('hidden');
  document.getElementById('secretCliInput')?.blur();
}

export function toggleSecretCli() {
  const bar = document.getElementById('secretCliBar');
  if (!bar) return;
  if (bar.classList.contains('hidden')) {
    playTone(500, 'square', 0.04);
    showSecretCli();
  } else {
    hideSecretCli();
  }
}

function initializeSecretCli() {
  const input = document.getElementById('secretCliInput');
  if (!input) return;

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (target?.isContentEditable || isAnyModalOpen() || window.isSudoRunning) return;
    if (!document.getElementById('secretCliBar')?.classList.contains('hidden')) return;

    if (event.key === '/' || event.key === '~') event.preventDefault();
    showSecretCli();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const value = input.value.trim();
      input.value = '';
      if (value) {
        cliHistory.push(value);
        cliHistoryIndex = cliHistory.length;
      }
      runSecretCommand(value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (cliHistoryIndex > 0) cliHistoryIndex--;
      input.value = cliHistory[cliHistoryIndex] || '';
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (cliHistoryIndex < cliHistory.length) cliHistoryIndex++;
      input.value = cliHistory[cliHistoryIndex] || '';
    } else if (event.key === 'Escape') {
      hideSecretCli();
    }
  });
}

function cliOut(text, colorClass = 'text-emerald-300') {
  appendLine(`<span class='${colorClass} whitespace-pre-wrap'>${text}</span>`);
}

function toggleBodyClass(className) {
  const root = document.getElementById('bodyRoot');
  if (!root) return false;
  return root.classList.toggle(className);
}

function runSecretCommand(rawInput) {
  appendLine(
    `<span class='text-emerald-500'>${escapeHtml(CONTENT.secretCli.prompt)}</span> <span class='text-emerald-200'>${escapeHtml(rawInput)}</span>`
  );
  if (!rawInput) return;

  const [command, ...args] = rawInput.split(/\s+/);
  const argument = args.join(' ').toLowerCase();
  const name = command.toLowerCase();

  const COMMAND_ALIASES = { barrelroll: 'flip', cls: 'clear', su: 'root', achievements: 'trophies' };
  const KNOWN_COMMANDS = ['help', 'sudo', 'drunk', 'flip', 'ls', 'cat', 'whoami', 'ping', 'clear', 'root', 'trophies'];
  const canonical = COMMAND_ALIASES[name] || name;
  if (KNOWN_COMMANDS.includes(canonical) && (canonical !== 'ping' || argument === CONTENT.secretCli.pingTarget)) {
    trackCommand(canonical);
  }

  switch (name) {
    case 'trophies':
    case 'achievements':
      openTrophies();
      break;
    case 'help':
      cliOut(
        CONTENT.secretCli.helpLines.map(escapeHtml).join('\n'),
        'text-cyan-300'
      );
      break;
    case 'sudo':
      if (!argument) {
        cliOut('[SUDO] Öffne Jukebox...', 'text-amber-300');
        openSudoJukebox();
      } else if (SUDO_SHOWS.includes(argument)) {
        cliOut(`[SUDO] Starte ${escapeHtml(argument)}...`, 'text-amber-300');
        hideSecretCli();
        triggerSpecificSudoParty(argument);
      } else {
        cliOut(
          `sudo: Show '${escapeHtml(argument)}' unbekannt. Probiere: ${SUDO_SHOWS.join(', ')}`,
          'text-rose-400'
        );
      }
      break;
    case 'drunk':
      cliOut(
        toggleBodyClass('egg-drunk')
          ? CONTENT.secretCli.drunkOn
          : CONTENT.secretCli.drunkOff,
        'text-amber-300'
      );
      break;
    case 'flip':
    case 'barrelroll':
      cliOut(
        toggleBodyClass('egg-flip')
          ? CONTENT.secretCli.flipOn
          : CONTENT.secretCli.flipOff,
        'text-amber-300'
      );
      break;
    case 'ls':
      cliOut(Object.keys(VIRTUAL_FILES).join('   '), 'text-cyan-300');
      break;
    case 'cat':
      if (!argument) {
        cliOut('cat: Dateiname fehlt', 'text-rose-400');
      } else if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, argument)) {
        cliOut(escapeHtml(VIRTUAL_FILES[argument]));
        trackFlag('cli_cat');
      } else {
        cliOut(`cat: ${escapeHtml(argument)}: Datei oder Verzeichnis nicht gefunden`, 'text-rose-400');
      }
      break;
    case 'whoami': {
      let profile = null;
      try {
        profile = JSON.parse(localStorage.getItem('party_rsvp_data'));
      } catch (_) {}
      if (profile && profile.name) {
        cliOut(
          `user:    ${escapeHtml(profile.name)}\nkraftstoff: ${escapeHtml(profile.drink || 'unbekannt')}\nziel-pegel: ${escapeHtml(String(profile.pegel ?? '?'))}%\nstatus:  zugesagt ✔`
        );
      } else {
        cliOut('unregistrierter_durstiger_gast');
      }
      break;
    }
    case 'ping':
      if (argument === CONTENT.secretCli.pingTarget) {
        cliOut(
          [1, 2, 3]
            .map(() => CONTENT.secretCli.pingReply)
            .join('\n')
        );
      } else {
        cliOut(`ping: ${escapeHtml(argument || '(kein Ziel)')}: Name oder Dienst unbekannt`, 'text-rose-400');
      }
      break;
    case 'clear':
    case 'cls': {
      const output = document.getElementById('terminalOutput');
      if (output) output.innerHTML = '';
      break;
    }
    case 'root':
    case 'su':
      if (window.openAdminModal) window.openAdminModal();
      break;
    case 'mathe':
      appendLine(
        "<div class='bg-neutral-900 p-3 rounded border border-yellow-600/70 text-xs text-yellow-300 font-mono'>" + CONTENT.secretCli.matheFormula + "</div>"
      );
      break;
    case 'exit':
      hideSecretCli();
      break;
    default:
      cliOut(`${escapeHtml(command)}: Befehl nicht gefunden. Tipp: help`, 'text-rose-400');
  }
}
function setCommandsCollapsed(collapsed) {
  commandsCollapsed = collapsed;
  const grid = document.getElementById('commandGrid');
  const toggleButton = document.getElementById('cmdToggleBtn');
  if (!grid || !toggleButton) return;

  if (commandsCollapsed) {
    grid.className = 'grid grid-cols-6 gap-1 relative';
    toggleButton.textContent = CONTENT.ui.commandsExpand;
    document.querySelectorAll('.cmd-text').forEach((text) => text.classList.add('hidden'));
    document.querySelectorAll('.cmd-btn').forEach((button) => {
      button.classList.remove('py-2');
      button.classList.add('py-1.5');
    });
  } else {
    grid.className = `${expandedGridClass} transition-all relative`;
    toggleButton.textContent = CONTENT.ui.commandsCollapse;
    document.querySelectorAll('.cmd-text').forEach((text) => text.classList.remove('hidden'));
    document.querySelectorAll('.cmd-btn').forEach((button) => {
      button.classList.remove('py-1.5');
      button.classList.add('py-2');
    });
  }
}

export function toggleCommands() {
  setCommandsCollapsed(!commandsCollapsed);
}

// Wird vom Modus-Controller nach dem Umbau des Befehlsgitters aufgerufen.
export function refreshCommandGridLayout(gridClass) {
  expandedGridClass = gridClass;
  setCommandsCollapsed(commandsCollapsed);
}

export function runCommand(command) {
  playTone(650, 'sine', 0.05);

  switch (command) {
    case 'info':
      appendLine(
        `<div class='bg-emerald-950/40 p-3 rounded border border-emerald-600 text-xs text-emerald-200'>📅 Wann: ${CONFIG.party.date}<br>⏰ Uhrzeit: ${CONFIG.party.time}<br>🏠 Wo: ${CONFIG.party.location}<br>👔 Dresscode: ${CONFIG.party.dresscode}<br>🎁 Geschenke: ${CONFIG.party.gifts}<br><button type='button' onclick='downloadPartyCalendar()' class='mt-2 px-2 py-1 rounded border border-cyan-600 bg-cyan-950/40 text-cyan-300 font-bold active:scale-95 transition'>📅 Termin in Kalender speichern (.ics)</button></div>`
      );
      break;
    case 'admin':
    case 'root':
      if (window.openAdminModal) window.openAdminModal();
      break;
  }
}
