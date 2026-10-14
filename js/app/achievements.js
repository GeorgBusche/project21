import { playSuccessChime, playTone } from './audio.js';
import { appendLine, showToast } from './ui.js';
import { CONTENT } from '../content.js';

const STORAGE_KEY = 'party_achievements';

export const SUDO_SHOW_KEYS = [
  'bella',
  'wolle',
  'rammstein',
  'biertornado',
  'ragecage',
  'schuettelkorn'
];

const OTHER_IDS = ['eskalierer', 'sturkopf', 'hacker', 'dj', 'vollgas'];

// Reihenfolge = Priorität für die Anzeige in der Gästeliste (wichtigste zuerst).
export const ACHIEVEMENTS = [
  {
    id: 'legende',
    icon: '👑',
    secret: false
  },
  {
    id: 'eskalierer',
    icon: '🔥',
    secret: false
  },
  {
    id: 'sturkopf',
    icon: '👹',
    secret: true
  },
  {
    id: 'hacker',
    icon: '🕵️',
    secret: true
  },
  {
    id: 'dj',
    icon: '🎧',
    secret: false
  },
  {
    id: 'vollgas',
    icon: '🍻',
    secret: false
  }
].map((achievement) => ({
  ...achievement,
  ...CONTENT.achievements[achievement.id]
}));

const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

let state = loadState();
let changeHandler = null;

function emptyState() {
  return { shows: [], cmds: [], flags: [], votes: [], shotsCount: 0, unlocked: {} };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const merged = { ...emptyState(), ...(parsed || {}) };
    ['shows', 'cmds', 'flags', 'votes'].forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    const unlocked = {};
    Object.keys(merged.unlocked || {}).forEach((id) => {
      if (ACHIEVEMENT_MAP[id]) unlocked[id] = merged.unlocked[id];
    });
    merged.unlocked = unlocked;
    return merged;
  } catch (_) {
    return emptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function hackerProgress() {
  const hasCat = state.flags.includes('cli_cat');
  const hasPhysics = state.cmds.includes('drunk') || state.cmds.includes('flip');
  return (hasCat ? 1 : 0) + (hasPhysics ? 1 : 0);
}

function isEarned(id) {
  switch (id) {
    case 'eskalierer':
      return SUDO_SHOW_KEYS.every((key) => state.shows.includes(key));
    case 'sturkopf':
      return state.flags.includes('boss');
    case 'hacker':
      return hackerProgress() === 2;
    case 'dj':
      return state.votes.length >= 3 && state.flags.includes('preview');
    case 'vollgas':
      return state.flags.includes('pegel100') || (state.shotsCount || 0) >= 5;
    case 'legende':
      return OTHER_IDS.every((other) => state.unlocked[other]);
    default:
      return false;
  }
}

function evaluate() {
  const fresh = [];
  ACHIEVEMENTS.slice()
    .reverse()
    .forEach((achievement) => {
      if (state.unlocked[achievement.id]) return;
      if (isEarned(achievement.id)) {
        state.unlocked[achievement.id] = Date.now();
        fresh.push(achievement);
      }
    });

  if (fresh.length === 0) return;
  saveState();
  fresh.forEach((achievement, index) => {
    setTimeout(() => announce(achievement), index * 1800);
  });
  if (changeHandler) changeHandler(getUnlockedIds());
  updateTrophyCounter();
}

function announce(achievement) {
  playSuccessChime();
  showToast(`🏆 ${achievement.icon} ${achievement.title} freigeschaltet!`);
  appendLine(
    `<span class='text-amber-300 font-bold'>[TROPHÄE] ${achievement.icon} ${achievement.title} – ${achievement.desc}</span>`
  );
}

function addUnique(list, value) {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

export function trackShow(showKey) {
  if (addUnique(state.shows, showKey)) saveState();
  evaluate();
}

export function trackCommand(command) {
  if (addUnique(state.cmds, command)) saveState();
  evaluate();
}

export function trackFlag(flag) {
  if (addUnique(state.flags, flag)) saveState();
  evaluate();
}

export function trackVote(songKey) {
  if (songKey === undefined || songKey === null || songKey === '') return;
  if (addUnique(state.votes, String(songKey))) saveState();
  evaluate();
}

export function trackShot() {
  state.shotsCount = (state.shotsCount || 0) + 1;
  saveState();
  evaluate();
}

export function getUnlockedIds() {
  return ACHIEVEMENTS.filter((a) => state.unlocked[a.id]).map((a) => a.id);
}

export function onAchievementsChange(handler) {
  changeHandler = handler;
}

// Liefert die Abzeichen eines Gastes für die Gästeliste (alle 6 passen ohne Abkürzung).
export function renderBadgeIcons(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return '';
  const shown = ACHIEVEMENTS.filter((a) => ids.includes(a.id)).slice(0, 6);
  if (shown.length === 0) return '';
  const icons = shown
    .map((a) => `<span title="${a.title}" class="cursor-help">${a.icon}</span>`)
    .join('');
  return `<span class="inline-flex items-center gap-0.5 text-[12px] leading-none">${icons}</span>`;
}

function updateTrophyCounter() {
  const counter = document.getElementById('trophyCount');
  if (counter) counter.textContent = String(getUnlockedIds().length);
}

function getProgressInfo(id) {
  switch (id) {
    case 'eskalierer':
      return ` (${state.shows.length}/${SUDO_SHOW_KEYS.length})`;
    case 'hacker':
      return ` (${hackerProgress()}/2)`;
    case 'dj':
      return ` (${Math.min(3, state.votes.length)}/3 Votes${
        state.flags.includes('preview') ? ' · 🎧✓' : ''
      })`;
    case 'vollgas':
      return state.shotsCount > 0 ? ` (${Math.min(5, state.shotsCount)}/5)` : '';
    default:
      return '';
  }
}

function renderTrophyList() {
  const list = document.getElementById('trophyList');
  const summary = document.getElementById('trophySummary');
  if (!list) return;

  const unlockedCount = getUnlockedIds().length;
  if (summary) summary.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} Trophäen`;

  list.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const done = Boolean(state.unlocked[achievement.id]);
    const partial = achievement.id === 'hacker' && hackerProgress() === 1;
    const hidden = !done && achievement.secret && !partial;
    const extra = done || hidden ? '' : getProgressInfo(achievement.id);
    return `
      <div class="p-2 rounded-lg border ${
        done
          ? 'border-amber-500/70 bg-amber-950/20'
          : 'border-neutral-800 bg-neutral-900/60 opacity-70'
      } flex items-center gap-2.5">
        <div class="text-2xl w-9 text-center ${done ? '' : 'grayscale'}">${hidden ? '❔' : achievement.icon}</div>
        <div class="min-w-0">
          <div class="text-xs font-bold ${done ? 'text-amber-300' : 'text-neutral-400'}">
            ${hidden ? '???' : achievement.title}${extra}
          </div>
          <div class="text-[10px] font-sans ${done ? 'text-neutral-300' : 'text-neutral-500'}">
            ${done ? achievement.desc : achievement.hint}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function openTrophies() {
  playTone(700, 'sine', 0.05);
  renderTrophyList();
  document.getElementById('achievementsModal')?.classList.remove('hidden');
}

export function closeTrophies() {
  document.getElementById('achievementsModal')?.classList.add('hidden');
}

export function initializeAchievements() {
  saveState();
  updateTrophyCounter();
  evaluate();
}
