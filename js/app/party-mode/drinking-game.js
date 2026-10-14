import { playBuzzerError, playSuccessChime, playTone } from '../audio.js';
import { CONTENT } from '../../content.js';
import { getPartyContext } from '../party-actions.js';
import { appendLine, escapeHtml } from '../ui.js';

const BOMB_MIN_MS = 15000;
const BOMB_MAX_MS = 45000;

const BOMB_QUESTIONS = CONTENT.partyMode.bombPrompts;

const DUEL_CHALLENGES = CONTENT.partyMode.duelPrompts;

const PLACEHOLDERS = ['Gast A', 'Gast B'];

let mode = 'bomb';
let bomb = null;

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function randomFrom(list, exclude) {
  let pick;
  do {
    pick = list[Math.floor(Math.random() * list.length)];
  } while (list.length > 1 && pick === exclude);
  return pick;
}

function stopBomb() {
  if (bomb) {
    clearTimeout(bomb.beepTimer);
    clearTimeout(bomb.explodeTimer);
    bomb = null;
  }
}

function resetBombUI() {
  const screen = document.getElementById('bombScreen');
  screen?.classList.remove('bg-red-900/70', 'animate-bomb-shake');
  screen?.classList.add('bg-neutral-900');
  setText('bombQuestion', 'Bereit? Handy in die Runde geben und starten!');
  setText('bombStatus', 'Die Zündschnur ist unsichtbar...');
  document.getElementById('bombStartBtn')?.classList.remove('hidden');
  document.getElementById('bombPassBtn')?.classList.add('hidden');
}

function scheduleBeep() {
  if (!bomb) return;
  const elapsed = Date.now() - bomb.startedAt;
  const fraction = Math.min(1, elapsed / bomb.duration);
  const interval = 900 - fraction * 720;
  playTone(500 + fraction * 600, 'square', 0.04);
  bomb.beepTimer = setTimeout(scheduleBeep, interval);
}

function explodeBomb() {
  stopBomb();
  const screen = document.getElementById('bombScreen');
  screen?.classList.remove('bg-neutral-900');
  screen?.classList.add('bg-red-900/70', 'animate-bomb-shake');
  setText('bombQuestion', '💥 KERNEL PANIC!');
  setText('bombStatus', 'Wer das Handy gerade hält, muss trinken!');
  playBuzzerError();
  if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  appendLine(
    "<div class='bg-red-950/60 p-2.5 rounded border border-red-500 text-xs text-red-200'>💥 KERNEL PANIC! Wer das Handy gerade hält, muss trinken!</div>"
  );
  document.getElementById('bombPassBtn')?.classList.add('hidden');
  const start = document.getElementById('bombStartBtn');
  if (start) {
    start.textContent = '🔁 NOCH EINE RUNDE';
    start.classList.remove('hidden');
  }
}

export function startKernelBomb() {
  stopBomb();
  const screen = document.getElementById('bombScreen');
  screen?.classList.remove('bg-red-900/70', 'animate-bomb-shake');
  screen?.classList.add('bg-neutral-900');

  const duration = BOMB_MIN_MS + Math.random() * (BOMB_MAX_MS - BOMB_MIN_MS);
  bomb = { startedAt: Date.now(), duration, question: '' };
  bomb.question = randomFrom(BOMB_QUESTIONS);
  bomb.explodeTimer = setTimeout(explodeBomb, duration);

  setText('bombQuestion', bomb.question);
  setText('bombStatus', 'Antworten & weitergeben – bevor es knallt!');
  document.getElementById('bombStartBtn')?.classList.add('hidden');
  document.getElementById('bombPassBtn')?.classList.remove('hidden');
  scheduleBeep();
}

export function passKernelBomb() {
  if (!bomb) return;
  bomb.question = randomFrom(BOMB_QUESTIONS, bomb.question);
  setText('bombQuestion', bomb.question);
  playTone(900, 'sine', 0.05);
  if (navigator.vibrate) navigator.vibrate(30);
}

function pickDuelists() {
  const { getCachedRsvps } = getPartyContext();
  const names = [
    ...new Set(
      Object.values(getCachedRsvps() || {})
        .map((rsvp) => String(rsvp?.name || '').trim())
        .filter(Boolean)
    )
  ];
  const pool = names.length >= 2 ? names : [...names, ...PLACEHOLDERS.slice(0, 2 - names.length)];
  const first = Math.floor(Math.random() * pool.length);
  let second = Math.floor(Math.random() * (pool.length - 1));
  if (second >= first) second += 1;
  return [pool[first], pool[second]];
}

export function startLohhofDuel() {
  const [first, second] = pickDuelists();
  const challenge = randomFrom(DUEL_CHALLENGES);
  playSuccessChime();
  const result = document.getElementById('duelResult');
  if (result) {
    result.innerHTML = `<div class="text-xs text-rose-400 uppercase tracking-widest">⚔️ ${escapeHtml(CONTENT.partyMode.duelTitle)}</div><div class="text-lg font-extrabold text-rose-200 my-1">${escapeHtml(first)} <span class="text-neutral-500">vs</span> ${escapeHtml(second)}</div><div class="text-sm text-amber-200">${escapeHtml(challenge)}</div>`;
    result.classList.remove('hidden');
  }
  appendLine(
    `<div class='bg-rose-950/50 p-2.5 rounded border border-rose-500 text-xs text-rose-200'>⚔️ DUELL: ${escapeHtml(first)} vs ${escapeHtml(second)} – ${escapeHtml(challenge)}</div>`
  );
}

export function setDrinkingGameMode(nextMode) {
  mode = nextMode === 'duel' ? 'duel' : 'bomb';
  if (mode === 'duel') stopBomb();
  document.getElementById('drinkBombPanel')?.classList.toggle('hidden', mode !== 'bomb');
  document.getElementById('drinkDuelPanel')?.classList.toggle('hidden', mode !== 'duel');
  [
    ['drinkTabBomb', 'bomb'],
    ['drinkTabDuel', 'duel']
  ].forEach(([id, key]) => {
    const tab = document.getElementById(id);
    if (!tab) return;
    const active = key === mode;
    tab.classList.toggle('bg-rose-500', active);
    tab.classList.toggle('text-black', active);
    tab.classList.toggle('font-bold', active);
    tab.classList.toggle('text-rose-300', !active);
  });
  if (mode === 'bomb') resetBombUI();
}

export function openDrinkingGameModal() {
  playTone(480, 'sine', 0.06);
  setDrinkingGameMode(mode);
  document.getElementById('drinkingGameModal')?.classList.remove('hidden');
}

export function closeDrinkingGameModal() {
  stopBomb();
  resetBombUI();
  document.getElementById('drinkingGameModal')?.classList.add('hidden');
}
