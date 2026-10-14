import { CONTENT } from '../../content.js';
import { trackShot } from '../achievements.js';
import { playSuccessChime, playTone } from '../audio.js';
import { getPartyContext } from '../party-actions.js';
import { appendLine, escapeHtml } from '../ui.js';

const TAU = Math.PI * 2;
const SPIN_DURATION_MS = 4200;
const COLORS = ['#f59e0b', '#ef4444', '#d946ef', '#06b6d4', '#10b981', '#6366f1', '#f97316', '#ec4899'];
const PLACEHOLDER_NAMES = ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4', 'Gast 5', 'Gast 6'];
const COMBO_ACTIONS = CONTENT.partyMode.wheelCombos;

const MODE_META = {
  shots: { tab: 'wheelTabShots', title: '🥃 SHOT-RAD' },
  guests: { tab: 'wheelTabGuests', title: '👥 WER TRINKT?' },
  combo: { tab: 'wheelTabCombo', title: '🔥 ESKALATIONS-KOMBI' }
};

let mode = 'shots';
let angle = 0;
let segments = [];
let spinning = false;
let lastTickIndex = -1;

function getGuestNames() {
  const { getCachedRsvps } = getPartyContext();
  const names = Object.values(getCachedRsvps() || {})
    .map((rsvp) => String(rsvp?.name || '').trim())
    .filter(Boolean);
  const unique = [...new Set(names)];
  if (unique.length >= 3) return unique;
  const extra = PLACEHOLDER_NAMES.filter((name) => !unique.includes(name));
  return [...unique, ...extra].slice(0, Math.max(6, unique.length));
}

function buildSegments() {
  segments = mode === 'shots' ? [...CONTENT.partyMode.shotsList] : getGuestNames();
}

function shortLabel(text) {
  const clean = String(text).replace(/!+$/g, '').trim();
  return clean.length > 17 ? `${clean.slice(0, 16)}…` : clean;
}

function drawWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas || segments.length === 0) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 8;
  const arc = TAU / segments.length;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(angle);

  segments.forEach((label, index) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, index * arc, (index + 1) * arc);
    ctx.closePath();
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(index * arc + arc / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(shortLabel(label), radius - 12, 0);
    ctx.restore();
  });

  ctx.restore();

  ctx.beginPath();
  ctx.arc(center, center, 22, 0, TAU);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, center, radius + 3, 0, TAU);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Segmentindex unter dem Zeiger (oben, also bei -90°).
function indexAtPointer(currentAngle) {
  const arc = TAU / segments.length;
  const relative = (((-Math.PI / 2 - currentAngle) % TAU) + TAU) % TAU;
  return Math.floor(relative / arc) % segments.length;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function updateTabs() {
  Object.entries(MODE_META).forEach(([key, meta]) => {
    const tab = document.getElementById(meta.tab);
    if (!tab) return;
    const active = key === mode;
    tab.classList.toggle('bg-amber-500', active);
    tab.classList.toggle('text-black', active);
    tab.classList.toggle('font-bold', active);
    tab.classList.toggle('text-amber-300', !active);
  });
}

function hideResult() {
  document.getElementById('wheelResult')?.classList.add('hidden');
}

export function setWheelMode(nextMode) {
  if (spinning || !MODE_META[nextMode]) return;
  mode = nextMode;
  playTone(600, 'sine', 0.04);
  buildSegments();
  hideResult();
  updateTabs();
  drawWheel();
}

export function openWheelModal() {
  playTone(520, 'sine', 0.06);
  buildSegments();
  hideResult();
  updateTabs();
  document.getElementById('wheelModal')?.classList.remove('hidden');
  drawWheel();
}

export function closeWheelModal() {
  if (spinning) return;
  document.getElementById('wheelModal')?.classList.add('hidden');
}

function showResult(winner) {
  let html;
  let logText;
  if (mode === 'combo') {
    const action = COMBO_ACTIONS[Math.floor(Math.random() * COMBO_ACTIONS.length)];
    html = `<div class="text-[10px] text-amber-600 uppercase tracking-widest">Eskalations-Kombi</div><div class="text-lg font-extrabold text-amber-200">${escapeHtml(winner)}</div><div class="text-sm text-fuchsia-300">${escapeHtml(action)}</div>`;
    logText = `🔥 KOMBI: ${escapeHtml(winner)} – ${escapeHtml(action)}`;
  } else if (mode === 'guests') {
    html = `<div class="text-[10px] text-amber-600 uppercase tracking-widest">Wer trinkt?</div><div class="text-lg font-extrabold text-amber-200">👉 ${escapeHtml(winner)}</div>`;
    logText = `👥 GÄSTE-RAD: ${escapeHtml(winner)} trinkt!`;
  } else {
    html = `<div class="text-[10px] text-amber-600 uppercase tracking-widest">Shot-Rad</div><div class="text-base font-extrabold text-amber-200">${escapeHtml(winner)}</div>`;
    logText = `🥃 SHOT-RAD: ${escapeHtml(winner)}`;
  }

  const banner = document.getElementById('wheelResult');
  if (banner) {
    banner.innerHTML = html;
    banner.classList.remove('hidden');
  }
  appendLine(
    `<div class='bg-amber-950/50 p-2.5 rounded border border-amber-500 text-xs text-amber-200'>🎡 ${logText}</div>`
  );
  playSuccessChime();
  if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
  if (mode === 'shots') trackShot();
}

export function spinWheel() {
  if (spinning || segments.length === 0) return;
  spinning = true;
  hideResult();
  const button = document.getElementById('wheelSpinBtn');
  if (button) button.disabled = true;

  const arc = TAU / segments.length;
  const winnerIndex = Math.floor(Math.random() * segments.length);
  const offsetInSegment = 0.2 + Math.random() * 0.6;
  const targetMod = (((-Math.PI / 2 - (winnerIndex + offsetInSegment) * arc) % TAU) + TAU) % TAU;
  const startMod = ((angle % TAU) + TAU) % TAU;
  const turns = 5 + Math.floor(Math.random() * 3);
  const delta = turns * TAU + ((((targetMod - startMod) % TAU) + TAU) % TAU);

  const startAngle = angle;
  const duration = SPIN_DURATION_MS + Math.random() * 600;
  const startTime = performance.now();
  let previousAngle = angle;
  let previousTime = startTime;
  lastTickIndex = indexAtPointer(angle);

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    angle = startAngle + delta * easeOutCubic(progress);

    const tickIndex = indexAtPointer(angle);
    if (tickIndex !== lastTickIndex) {
      lastTickIndex = tickIndex;
      const elapsed = Math.max(1, now - previousTime);
      const speed = Math.min(500, ((angle - previousAngle) / elapsed) * 1000 * 8);
      playTone(300 + speed, 'triangle', 0.03);
    }
    previousAngle = angle;
    previousTime = now;

    drawWheel();
    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }
    spinning = false;
    if (button) button.disabled = false;
    showResult(segments[winnerIndex]);
  }

  requestAnimationFrame(frame);
}
