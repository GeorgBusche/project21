import { CONTENT } from '../../content.js';
import { trackFlag } from '../achievements.js';
import { playSuccessChime } from '../audio.js';
import { escapeHtml } from '../ui.js';
import { getPartyContext } from '../party-actions.js';
import { createPlayerAppearance, drawPlayer, readLocalPlayerRsvp } from './player-rig.js';
import { getBeatInfo, preloadArcadeAudio, setStage, setStressLevel, sfx, startArcadeAudio, stopArcadeAudio } from './arcade-audio.js';
import { fetchTopTen, getLocalBest, submitRun } from './arcade-scoreboard.js';
import { createStage1 } from './stages/stage1-cube.js';
import { createStage2 } from './stages/stage2-flappy.js';
import { createStage3 } from './stages/stage3-pyro.js';
import { createStage4 } from './stages/stage4-wave.js';
import { createStage5 } from './stages/stage5-overdrive.js';
import { drawFiech } from './fiech-rig.js';

export { drawFiech };

export const W = 360;
export const H = 600;
const MAX_LIVES = 3;
const INTRO_SECONDS = 1.8;
const STAGE_FACTORIES = [createStage1, createStage2, createStage3, createStage4, createStage5];
// Jede Stage = 20 % Fortschritt
const PERCENT_STARTS = [0, 20, 40, 60, 80, 100];

const state = {
  overlay: null,
  canvas: null,
  ctx: null,
  raf: 0,
  last: 0,
  mode: 'idle', // idle | intro | playing | stageClear | gameover | victory
  stageIndex: 0,
  testRun: false,
  stage: null,
  score: 0,
  lives: MAX_LIVES,
  timer: 0,
  invuln: 0,
  shakeT: 0,
  scale: 1,
  keys: new Set(),
  pointer: { x: W / 2, y: H - 80, down: false },
  stars: []
};

let playerAppearance = null;
let hudNodes = null;
let hudValues = {};
let bestScore = 0;

// API, die jede Stage nutzt
export const engine = {
  W,
  H,
  get keys() {
    return state.keys;
  },
  get pointer() {
    return state.pointer;
  },
  get lives() {
    return state.lives;
  },
  // Tap / Maus / Leertaste / Pfeil-Hoch / W gehalten
  get held() {
    const k = state.keys;
    return state.pointer.down || k.has(' ') || k.has('arrowup') || k.has('w');
  },
  drawFiech,
  drawPlayer(ctx, x, y, size, options) {
    drawPlayer(ctx, x, y, size, options, playerAppearance);
  },
  addScore(points) {
    state.score += points;
  },
  hit() {
    if (state.invuln > 0 || state.mode !== 'playing') return false;
    state.lives--;
    state.invuln = 1.4;
    state.shakeT = 0.3;
    sfx(220, 'sawtooth', 0.25, 0.09, 55);
    if (state.lives <= 0) endRun(false);
    return true;
  },
  // Geometry-Dash-Stil: sofortiger Absturz, kein Leben-Puffer
  crash() {
    if (state.mode !== 'playing') return;
    state.shakeT = 0.3;
    sfx(220, 'sawtooth', 0.25, 0.09, 55);
    endRun(false);
  },
  complete() {
    if (state.mode !== 'playing') return;
    state.score += 1000 * (state.stageIndex + 1) + state.lives * 250;
    playSuccessChime();
    if (state.testRun) {
      endRun(true);
      return;
    }
    if (state.stageIndex >= STAGE_FACTORIES.length - 1) {
      endRun(true);
    } else {
      state.mode = 'stageClear';
      state.timer = 1.2;
    }
  },
  beep(freq, type = 'square', dur = 0.06, gain = 0.03) {
    sfx(freq, type, dur, Math.min(gain, 0.05));
  },
  shake(t = 0.15) {
    state.shakeT = Math.max(state.shakeT, t);
  },
  get invulnerable() {
    return state.invuln > 0;
  },
  // Beat-Sync für Stages: { bpm, beatIndex, beatPhase, isBeat, bassEnergy }
  get beat() {
    return getBeatInfo();
  }
};

function getPercent() {
  const i = state.stageIndex;
  if (state.mode === 'victory') return 100;
  const prog = state.stage ? Math.min(1, Math.max(0, state.stage.progress())) : 0;
  return Math.floor(PERCENT_STARTS[i] + (PERCENT_STARTS[i + 1] - PERCENT_STARTS[i]) * prog);
}

function arcadeText() {
  return CONTENT.declineGame.arcade;
}

function buildOverlay() {
  const a = arcadeText();
  const el = document.createElement('div');
  el.id = 'arcadeOverlay';
  el.className = 'fixed inset-0 z-[99990] bg-black flex flex-col items-center select-none';
  el.style.touchAction = 'none';
  el.innerHTML = `
    <div id="arcadeHud" class="w-full max-w-[520px] flex items-center justify-between gap-2 px-3 pt-2 pb-1 font-mono text-xs text-white">
      <div class="min-w-0">
        <div id="arcadeStageName" class="font-extrabold truncate"></div>
        <div class="text-[10px] text-neutral-400">${a.title}</div>
      </div>
      <div class="text-right shrink-0">
        <div>SCORE <span id="arcadeScore" class="font-bold">0</span> · BEST <span id="arcadeBest">0</span></div>
        <div id="arcadeLives" class="text-sm leading-none"></div>
      </div>
      ${import.meta.env.DEV ? '<button id="arcadeStageMenu" class="shrink-0 px-2 h-8 rounded border border-cyan-700 text-cyan-300" aria-label="Stage-Auswahl">STAGES</button>' : ''}
      <button id="arcadeExit" class="shrink-0 w-8 h-8 rounded border border-neutral-700 text-neutral-300 hover:text-white" aria-label="Schließen">✕</button>
    </div>
    <div class="w-full max-w-[520px] px-3"><div class="h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-800"><div id="arcadeProgress" class="h-full" style="width:0%"></div></div>
      <div id="arcadePercent" class="text-[10px] font-mono text-right text-neutral-400">0%</div></div>
    <div class="relative flex-1 w-full flex items-center justify-center min-h-0">
      <canvas id="arcadeCanvas" class="rounded-lg" style="touch-action:none;"></canvas>
      <div id="arcadeScreen" class="hidden absolute inset-0 items-center justify-center bg-black/80 p-4"></div>
    </div>`;
  document.body.appendChild(el);
  state.overlay = el;
  state.canvas = el.querySelector('#arcadeCanvas');
  state.ctx = state.canvas.getContext('2d');
  hudNodes = Object.fromEntries(
    ['arcadeStageName', 'arcadeScore', 'arcadeBest', 'arcadeLives', 'arcadeProgress', 'arcadePercent']
      .map((id) => [id, el.querySelector(`#${id}`)])
  );
  hudValues = {};
  el.querySelector('#arcadeExit').addEventListener('click', closeArcadeGame);
  if (import.meta.env.DEV) el.querySelector('#arcadeStageMenu').addEventListener('click', showStageMenu);
}

function resize() {
  if (!state.canvas) return;
  const hud = state.overlay.querySelector('#arcadeHud').offsetHeight + 36;
  const availW = Math.min(window.innerWidth - 8, 520);
  const availH = window.innerHeight - hud - 8;
  state.scale = Math.max(0.3, Math.min(availW / W, availH / H));
  const dpr = renderDpr();
  state.canvas.style.width = `${W * state.scale}px`;
  state.canvas.style.height = `${H * state.scale}px`;
  state.canvas.width = Math.round(W * state.scale * dpr);
  state.canvas.height = Math.round(H * state.scale * dpr);
}

// DPR-Deckel: mehr als 1.5x kostet auf Handys viel Fillrate ohne sichtbaren Gewinn
function renderDpr() {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

function toLogical(ev) {
  const r = state.canvas.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
}

function stageTap(extra = {}) {
  if (state.mode === 'playing') state.stage?.onTouch?.({ type: 'down', ...state.pointer, ...extra });
}

const onPointerDown = (ev) => {
  ev.preventDefault();
  Object.assign(state.pointer, toLogical(ev), { down: true });
  stageTap();
};
const onPointerMove = (ev) => {
  if (!state.pointer.down && ev.pointerType !== 'mouse') return;
  Object.assign(state.pointer, toLogical(ev));
  if (state.mode === 'playing') state.stage?.onTouch?.({ type: 'move', ...state.pointer });
};
const onPointerUp = () => {
  state.pointer.down = false;
  if (state.mode === 'playing') state.stage?.onTouch?.({ type: 'up', ...state.pointer });
};
const CONTROL_KEYS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's'];
const onKeyDown = (ev) => {
  const k = ev.key.toLowerCase();
  if (k === 'escape') {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    closeArcadeGame();
    return;
  }
  if (!CONTROL_KEYS.includes(k)) return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  if (!state.keys.has(k)) {
    state.keys.add(k);
    if (k === ' ' || k === 'arrowup' || k === 'w') stageTap({ key: true });
  }
};
const onKeyUp = (ev) => state.keys.delete(ev.key.toLowerCase());

function attachInput() {
  state.canvas.addEventListener('pointerdown', onPointerDown);
  state.canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('resize', resize);
  window.addEventListener('storage', onBestStorage);
}

function onBestStorage(event) {
  if (event.key === 'arcade_highscore' || event.key === null) bestScore = getLocalBest().score;
}

function detachInput() {
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('keyup', onKeyUp, true);
  window.removeEventListener('resize', resize);
  window.removeEventListener('storage', onBestStorage);
}

function startStage(index, segmentId = null) {
  state.stageIndex = index;
  state.stage = index === 0 && segmentId ? createStage1({ segmentId }) : STAGE_FACTORIES[index]();
  state.stage.init(engine);
  if (index === 0) startArcadeAudio(1);
  else setStage(index + 1);
  state.mode = 'intro';
  state.timer = INTRO_SECONDS;
  state.invuln = 1;
}

function startRun(index = 0, testRun = false, segmentId = null) {
  hideScreen();
  stopArcadeAudio(true);
  state.testRun = import.meta.env.DEV && testRun;
  bestScore = getLocalBest().score;
  const party = getPartyContext();
  const rsvp = party.getCachedRsvps()[party.deviceToken] || readLocalPlayerRsvp();
  playerAppearance = createPlayerAppearance(rsvp);
  state.score = 0;
  state.lives = MAX_LIVES;
  state.shakeT = 0;
  state.keys.clear();
  state.pointer = { x: W / 2, y: H - 80, down: false };
  state.segmentId = import.meta.env.DEV && testRun ? segmentId : null;
  startStage(index, state.segmentId);
}

function showStageMenu() {
  if (!import.meta.env.DEV || !state.overlay) return;
  stopArcadeAudio(true);
  state.mode = 'stageSelect';
  state.keys.clear();
  state.pointer.down = false;
  const a = arcadeText();
  showScreen(`
    <div class="font-mono max-w-sm w-full text-white">
      <div class="text-xs text-cyan-400 mb-1">TEMPORÄR / NUR LOKALE ENTWICKLUNG</div>
      <h2 class="text-xl font-black mb-2">STAGE AUSWÄHLEN</h2>
      <p class="text-xs text-neutral-400 mb-4">Direktstart mit 3 Leben und deinem Avatar. Keine Rekorde oder Achievements. Nach der Stage endet der Test.</p>
      <div class="flex flex-col gap-2">
        ${a.stageNames.map((name, index) => `
          <button type="button" data-test-stage="${index}" class="text-left px-4 py-3 rounded-lg border border-cyan-800 bg-cyan-950/60 hover:bg-cyan-900">
            <span class="block font-bold text-cyan-200">${escapeHtml(name)}</span>
            <span class="block text-[10px] text-neutral-400 mt-1">${escapeHtml(a.stageHints[index])}</span>
          </button>`).join('')}
        <button type="button" id="arcadeSegMenu" class="py-3 rounded-lg border border-emerald-700 bg-emerald-950/60 text-sm text-emerald-200">Stage 1: einzelnes Segment testen</button>
        <button type="button" id="arcadeNormalRun" class="py-3 rounded-lg border border-neutral-600 bg-neutral-800 text-sm">Normaler Run ab Stage 1</button>
      </div>
    </div>`);
  state.overlay.querySelectorAll('[data-test-stage]').forEach((button) => {
    button.addEventListener('click', () => startRun(Number(button.dataset.testStage), true));
  });
  state.overlay.querySelector('#arcadeSegMenu').addEventListener('click', showSegmentMenu);
  state.overlay.querySelector('#arcadeNormalRun').addEventListener('click', () => startRun());
}

function showSegmentMenu() {
  if (!import.meta.env.DEV || !state.overlay) return;
  const probe = createStage1();
  probe.init(engine);
  const tiers = ['EASY', 'MEDIUM', 'HARD'];
  showScreen(`
    <div class="font-mono max-w-sm w-full text-white max-h-full overflow-y-auto">
      <div class="text-xs text-cyan-400 mb-1">TEMPORÄR / NUR LOKALE ENTWICKLUNG</div>
      <h2 class="text-xl font-black mb-2">STAGE 1 · SEGMENT</h2>
      <p class="text-xs text-neutral-400 mb-3">Bearbeiten: Segment-Id in <b>stage1-cube.js</b> unter <b>makeLibrary</b> suchen.</p>
      <div class="grid grid-cols-2 gap-2">
        ${probe.library.map((seg) => `
          <button type="button" data-test-seg="${seg.id}" class="text-left px-2 py-2 rounded border border-emerald-800 bg-emerald-950/50 hover:bg-emerald-900">
            <span class="block text-[10px] text-neutral-400">${tiers[seg.tier] || ''}</span>
            <span class="block text-xs font-bold text-emerald-200">${escapeHtml(seg.id)}</span>
          </button>`).join('')}
      </div>
      <button type="button" id="arcadeSegBack" class="mt-3 w-full py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-sm">Zurück</button>
    </div>`);
  state.overlay.querySelectorAll('[data-test-seg]').forEach((button) => {
    button.addEventListener('click', () => startRun(0, true, button.dataset.testSeg));
  });
  state.overlay.querySelector('#arcadeSegBack').addEventListener('click', showStageMenu);
}

function showScreen(html) {
  const s = state.overlay.querySelector('#arcadeScreen');
  s.innerHTML = html;
  s.classList.remove('hidden');
  s.classList.add('flex');
  return s;
}

function hideScreen() {
  const s = state.overlay?.querySelector('#arcadeScreen');
  s?.classList.add('hidden');
  s?.classList.remove('flex');
}

function endRun(won) {
  state.mode = won ? 'victory' : 'gameover';
  stopArcadeAudio();
  if (state.testRun) {
    showScreen(`
      <div class="font-mono text-center max-w-xs w-full text-white">
        <div class="text-xs text-cyan-400 mb-2">TESTLAUF / NICHT GESPEICHERT</div>
        <div class="text-2xl font-black mb-2 ${won ? 'text-emerald-400' : 'text-rose-400'}">${won ? 'STAGE CLEAR!' : 'SYSTEM CRASH'}</div>
        <div class="text-sm mb-4">${escapeHtml(arcadeText().stageNames[state.stageIndex])} · SCORE ${state.score}</div>
        <div class="flex flex-col gap-2">
          <button id="arcadeTestRetry" class="py-3 rounded-lg bg-cyan-700 font-bold">Diese Stage nochmal</button>
          <button id="arcadeTestSelect" class="py-3 rounded-lg bg-neutral-800 border border-neutral-600">Andere Stage auswählen</button>
        </div>
      </div>`);
    state.overlay.querySelector('#arcadeTestRetry').addEventListener('click', () => startRun(state.stageIndex, true, state.segmentId));
    state.overlay.querySelector('#arcadeTestSelect').addEventListener('click', showStageMenu);
    return;
  }
  const percent = getPercent();
  const result = submitRun({ stage: state.stageIndex + 1, percent, score: state.score });
  const a = arcadeText();
  const best = getLocalBest();
  bestScore = best.score;

  if (won) {
    trackFlag('boss');
    showScreen(`
      <div class="text-center font-mono max-w-xs">
        <div class="text-2xl font-black text-emerald-400 mb-1">${a.victory.title}</div>
        <div class="text-lg font-bold text-amber-300 mb-2">${a.victory.subtitle}</div>
        <div class="text-xs text-neutral-300 mb-3">${a.victory.text}</div>
        <div class="text-sm text-white mb-4">SCORE <b>${state.score}</b> · BEST <b>${best.score}</b>${result.isRecord ? ' · 🆕 REKORD' : ''}</div>
        <button id="arcadeVictoryBtn" class="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold">${a.victory.button}</button>
      </div>`);
    state.overlay.querySelector('#arcadeVictoryBtn').addEventListener('click', () => {
      closeArcadeGame();
      window.appendLine?.(`<span class='text-emerald-400 font-bold'>${a.victoryLog}</span>`);
      window.openRsvpModal?.();
    });
    return;
  }

  showScreen(`
    <div class="text-center font-mono max-w-xs w-full">
      <div class="text-2xl font-black text-rose-500 mb-2">${a.gameOver.title}</div>
      <div class="text-lg font-bold text-white">${percent}% - STAGE ${state.stageIndex + 1}</div>
      <div class="text-sm text-neutral-300 mt-1 mb-4">SCORE <b>${state.score}</b> · HIGHSCORE <b>${best.score}</b>${result.isRecord ? ' · 🆕' : ''}</div>
      <div class="flex flex-col gap-2">
        <button id="arcadeRetry" class="py-3 rounded-lg bg-cyan-600 text-white font-bold">${a.gameOver.retry}</button>
        <button id="arcadeGiveUp" class="py-3 rounded-lg bg-rose-900/60 border border-rose-700 text-rose-200 font-bold">${a.gameOver.giveUp}</button>
        <button id="arcadeBoard" class="py-3 rounded-lg bg-neutral-800 border border-neutral-600 text-amber-300 font-bold">${a.gameOver.board}</button>
      </div>
    </div>`);
  const root = state.overlay;
  root.querySelector('#arcadeRetry').addEventListener('click', () => startRun());
  root.querySelector('#arcadeGiveUp').addEventListener('click', () => {
    closeArcadeGame();
    window.appendLine?.(`<span class='text-rose-400 font-bold'>${a.giveUpLog}</span>`);
    window.openRsvpModal?.();
  });
  root.querySelector('#arcadeBoard').addEventListener('click', showBoard);
}

async function showBoard() {
  const a = arcadeText();
  showScreen(`<div class="text-neutral-300 font-mono text-sm">…</div>`);
  const list = await fetchTopTen();
  if (!state.overlay) return;
  const rows =
    list === null || list.length === 0
      ? `<div class="text-neutral-400 text-sm py-4">${a.boardEmpty}</div>`
      : list
          .map(
            (e, i) => `<div class="flex justify-between gap-3 py-1 border-b border-neutral-800 text-sm">
              <span class="truncate">${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${escapeHtml(e.name || '?')}</span>
              <span class="shrink-0 text-amber-300">${e.maxPercent}% · ${e.score}</span></div>`
          )
          .join('');
  showScreen(`
    <div class="font-mono max-w-xs w-full text-white">
      <div class="text-lg font-black text-amber-300 text-center mb-2">${a.boardTitle}</div>
      <div class="mb-3">${rows}</div>
      <button id="arcadeBoardBack" class="w-full py-3 rounded-lg bg-neutral-800 border border-neutral-600 font-bold">${a.gameOver.back}</button>
    </div>`);
  state.overlay.querySelector('#arcadeBoardBack').addEventListener('click', () => endRun(false));
}

function updateHud() {
  const a = arcadeText();
  const color = state.stage?.color || '#22c55e';
  const percent = getPercent();
  const name = state.mode === 'stageSelect' ? 'STAGE-AUSWAHL' : `${state.testRun ? 'TEST · ' : ''}${a.stageNames[state.stageIndex]}`;
  if (hudValues.name !== name) {
    hudNodes.arcadeStageName.textContent = name;
    hudValues.name = name;
  }
  if (hudValues.color !== color) {
    hudNodes.arcadeStageName.style.color = color;
    hudNodes.arcadeProgress.style.background = color;
    hudValues.color = color;
  }
  if (hudValues.score !== state.score) {
    hudNodes.arcadeScore.textContent = state.score;
    hudValues.score = state.score;
  }
  const best = Math.max(bestScore, state.score);
  if (hudValues.best !== best) {
    hudNodes.arcadeBest.textContent = best;
    hudValues.best = best;
  }
  if (hudValues.lives !== state.lives) {
    hudNodes.arcadeLives.textContent = '❤️'.repeat(Math.max(0, state.lives)) + '🖤'.repeat(Math.max(0, MAX_LIVES - state.lives));
    hudValues.lives = state.lives;
  }
  if (hudValues.percent !== percent) {
    hudNodes.arcadeProgress.style.width = `${percent}%`;
    hudNodes.arcadePercent.textContent = `${percent}%`;
    hudValues.percent = percent;
  }
}

// Stress 0..1 für den Soundtrack: Stage-Fortschritt, Stage-Nummer und verlorene Leben.
// Eine Stage kann mit einer eigenen stress()-Funktion überschreiben.
function computeStress() {
  const own = state.stage?.stress?.();
  if (typeof own === 'number') return own;
  const progress = Math.min(1, Math.max(0, state.stage?.progress?.() ?? 0));
  return Math.min(1, progress);
}

function drawBackground(ctx, t, beat) {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, W, H);
  const color = state.stage?.color || '#22c55e';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35;
  for (const s of state.stars) {
    const y = (s.y + t * s.v) % H;
    ctx.fillRect(s.x, y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  // Hintergrund pulsiert mit dem echten Bass und dem Beat
  const pulse = Math.max(beat.bassEnergy, Math.max(0, 1 - beat.beatPhase * 4) * (beat.running ? 0.8 : 0));
  if (pulse > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = pulse * 0.12;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function frame(now) {
  if (!state.ctx) return;
  state.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - state.last) / 1000 || 0);
  state.last = now;
  const ctx = state.ctx;
  const k = state.scale * renderDpr();
  const beat = getBeatInfo();

  if (state.invuln > 0) state.invuln -= dt;
  if (state.shakeT > 0) state.shakeT -= dt;

  if (state.mode === 'intro') {
    state.timer -= dt;
    if (state.timer <= 0) state.mode = 'playing';
  } else if (state.mode === 'playing') {
    state.stage.update(dt, beat, { keys: state.keys, pointer: state.pointer, held: engine.held });
    setStressLevel(computeStress());
  } else if (state.mode === 'stageClear') {
    setStressLevel(0);
    state.timer -= dt;
    if (state.timer <= 0) startStage(state.stageIndex + 1);
  }

  ctx.setTransform(k, 0, 0, k, 0, 0);
  const sh = state.shakeT > 0 ? (Math.random() - 0.5) * 8 : 0;
  ctx.save();
  ctx.translate(sh, sh);
  if (!state.stage?.drawsOwnBackground) drawBackground(ctx, now / 1000, beat);
  else {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
  }
  if (state.stage) {
    if (state.invuln > 0 && state.mode === 'playing' && Math.floor(now / 80) % 2) ctx.globalAlpha = 0.85;
    state.stage.render(ctx);
    ctx.globalAlpha = 1;
  }
  if (state.mode === 'intro' || state.mode === 'stageClear') drawBanner(ctx);
  ctx.restore();
  updateHud();
}

function drawBanner(ctx) {
  const a = arcadeText();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, H / 2 - 60, W, 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = state.stage.color;
  ctx.font = 'bold 20px monospace';
  if (state.mode === 'intro') {
    ctx.fillText(a.stageNames[state.stageIndex], W / 2, H / 2 - 10);
    ctx.fillStyle = '#d4d4d8';
    ctx.font = '12px monospace';
    ctx.fillText(a.stageHints[state.stageIndex], W / 2, H / 2 + 20);
  } else {
    ctx.fillText('STAGE CLEAR!', W / 2, H / 2 + 6);
  }
}

export function openArcadeGame({ stageMenu = false } = {}) {
  if (state.overlay) return;
  document.getElementById('bodyRoot')?.classList.remove('egg-rotate', 'egg-drunk');
  document.documentElement.style.setProperty('--game-rot', '0deg');
  state.stars = Array.from({ length: 50 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: 1 + Math.random() * 2,
    v: 10 + Math.random() * 50
  }));
  buildOverlay();
  bestScore = getLocalBest().score;
  preloadArcadeAudio();
  attachInput();
  resize();
  if (import.meta.env.DEV && stageMenu) showStageMenu();
  else startRun();
  state.last = performance.now();
  state.raf = requestAnimationFrame(frame);
}

export function closeArcadeGame() {
  cancelAnimationFrame(state.raf);
  stopArcadeAudio();
  detachInput();
  state.overlay?.remove();
  Object.assign(state, { overlay: null, canvas: null, ctx: null, stage: null, mode: 'idle', testRun: false });
  state.keys.clear();
  playerAppearance = null;
  hudNodes = null;
  hudValues = {};
}

export function isArcadeOpen() {
  return Boolean(state.overlay);
}

if (import.meta.env.DEV) {
  document.getElementById('arcadeDevLauncher')?.remove();
  const launcher = document.createElement('button');
  launcher.id = 'arcadeDevLauncher';
  launcher.type = 'button';
  launcher.textContent = 'DEV · STAGES';
  launcher.className = 'fixed right-3 top-20 z-[99980] px-3 py-2 rounded-lg border border-cyan-600 bg-neutral-950 text-cyan-300 font-mono text-xs shadow-lg';
  launcher.addEventListener('click', () => {
    if (!state.overlay) openArcadeGame({ stageMenu: true });
    else showStageMenu();
  });
  document.body.appendChild(launcher);
}
