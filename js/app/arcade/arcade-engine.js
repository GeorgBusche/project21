import { CONTENT } from '../../content.js';
import { trackFlag } from '../achievements.js';
import { playSuccessChime } from '../audio.js';
import { escapeHtml } from '../ui.js';
import { getPartyContext } from '../party-actions.js';
import { createPlayerAppearance, drawPlayer, readLocalPlayerRsvp } from './player-rig.js';
import { getBeatInfo, preloadArcadeAudio, setStage, setStressLevel, sfx, startArcadeAudio, triggerDjScratch, triggerSudoSound, triggerSudoSample, stopSudoSample, warmSudoSamples, stopArcadeAudio } from './arcade-audio.js';
import { fetchTopTen, getLocalBest, submitRun } from './arcade-scoreboard.js';
import { createStage1 } from './stages/stage1-cube.js';
import { createStage2 } from './stages/stage2-flappy.js';
import { createStage3 } from './stages/stage3-pyro.js';
import { createStage4 } from './stages/stage4-orbit.js';
import { drawFiech } from './fiech-rig.js';

export { drawFiech };

export const W = 360;
export const H = 600;
const MAX_LIVES = 3;
const DEV_LIVES_OPTIONS = [3, 5, 10, 99];
let devLives = MAX_LIVES; // nur im Admin-Testmodus (Stage-Menue)
let runMaxLives = MAX_LIVES;
const INTRO_SECONDS = 1.8;
const STAGE_INTRO_SECONDS = 3;
const CLEAR_SECONDS = 2.6;
const WIPE_SECONDS = 0.6;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const STAGE_FACTORIES = [createStage1, createStage2, createStage3, createStage4];
// Jede Stage = 20 % Fortschritt
const PERCENT_STARTS = [0, 25, 50, 75, 100];

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
  modeDur: 1,
  clearBonus: 0,
  lastCount: 0,
  shakeT: 0,
  hurtT: 0,
  scale: 1,
  view: { cssW: 360, cssH: 600, offX: 0, offY: 0, dpr: 1 },
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
    state.shakeT = 0.45;
    state.hurtT = HURT_SECONDS;
    sfx(220, 'sawtooth', 0.3, 0.1, 55);
    sfx(90, 'square', 0.22, 0.08, 40);
    try { navigator.vibrate?.(state.lives <= 0 ? [80, 40, 160] : 90); } catch { /* ignore */ }
    if (state.lives <= 0) endRun(false);
    return true;
  },
  // Geometry-Dash-Stil: sofortiger Absturz, kein Leben-Puffer
  crash() {
    if (state.mode !== 'playing') return;
    state.shakeT = 0.45;
    state.hurtT = HURT_SECONDS;
    sfx(220, 'sawtooth', 0.3, 0.1, 55);
    try { navigator.vibrate?.(160); } catch { /* ignore */ }
    endRun(false);
  },
  complete() {
    if (state.mode !== 'playing') return;
    state.clearBonus = 1000 * (state.stageIndex + 1) + state.lives * 250;
    state.score += state.clearBonus;
    playSuccessChime();
    if (state.testRun) {
      endRun(true);
      return;
    }
    if (state.stageIndex >= STAGE_FACTORIES.length - 1) {
      endRun(true);
    } else {
      state.mode = 'stageClear';
      state.timer = CLEAR_SECONDS;
      state.modeDur = CLEAR_SECONDS;
    }
  },
  beep(freq, type = 'square', dur = 0.06, gain = 0.03) {
    sfx(freq, type, dur, Math.min(gain, 0.05));
  },
  triggerDjScratch() {
    triggerDjScratch();
  },
  triggerSudoSound(kind) {
    triggerSudoSound(kind);
  },
  triggerSudoSample(name) {
    return triggerSudoSample(name);
  },
  stopSudoSample() {
    stopSudoSample();
  },
  warmSudoSamples() {
    warmSudoSamples();
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
  el.className = 'fixed inset-0 z-[99990] bg-black select-none overflow-hidden';
  el.style.touchAction = 'none';
  el.innerHTML = `
    <div id="arcadeTop" class="absolute z-10 pointer-events-none font-mono text-white" style="left:0;width:100%;top:0">
      <div class="flex items-center gap-2 px-2 h-7 bg-black/55">
        <button id="arcadeOptions" class="pointer-events-auto shrink-0 w-7 h-6 rounded text-neutral-200 hover:text-white bg-white/10 text-sm leading-none" aria-label="Optionen" aria-haspopup="true">⚙</button>
        <div class="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden"><div id="arcadeProgress" class="h-full rounded-full" style="width:0%"></div></div>
        <div id="arcadePercent" class="text-[10px] text-neutral-300 w-8 text-right">0%</div>
        <div class="text-[11px] font-bold tabular-nums"><span id="arcadeScore">0</span></div>
        <div id="arcadeLives" class="text-[11px] leading-none whitespace-nowrap"></div>
      </div>
      <div id="arcadeMenu" class="hidden pointer-events-auto absolute left-2 top-8 w-52 rounded-lg border border-neutral-700 bg-neutral-950/95 p-1 text-sm shadow-xl">
        <button data-act="resume" class="w-full text-left px-3 py-2 rounded hover:bg-white/10">▶ Weiter</button>
        <button data-act="fullscreen" id="arcadeFsBtn" class="w-full text-left px-3 py-2 rounded hover:bg-white/10">⛶ Vollbild</button>
        ${state.adminMenu ? '<button data-act="stages" id="arcadeStageMenu" class="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-cyan-300">👾 Stages</button>' : ''}
        <button data-act="exit" id="arcadeExit" class="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-rose-300">✕ Verlassen</button>
      </div>
    </div>
    <div class="absolute inset-0">
      <canvas id="arcadeCanvas" style="touch-action:none;display:block"></canvas>
    </div>
    <div id="arcadeScreen" class="hidden absolute inset-0 z-20 items-center justify-center bg-black/80 p-4"></div>`;  document.body.appendChild(el);
  state.overlay = el;
  state.canvas = el.querySelector('#arcadeCanvas');
  state.ctx = state.canvas.getContext('2d');
  hudNodes = Object.fromEntries(
    ['arcadeScore', 'arcadeLives', 'arcadeProgress', 'arcadePercent']
      .map((id) => [id, el.querySelector(`#${id}`)])
  );
  hudValues = {};
  setupOptionsMenu(el);
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function setupOptionsMenu(el) {
  const menu = el.querySelector('#arcadeMenu');
  const fsBtn = el.querySelector('#arcadeFsBtn');
  const canFs = Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  if (!canFs) fsBtn.remove();
  const syncFs = () => {
    if (fsBtn.isConnected) fsBtn.textContent = fullscreenElement() ? '⛶ Vollbild beenden' : '⛶ Vollbild';
  };
  document.addEventListener('fullscreenchange', syncFs);
  state.fsSync = syncFs;
  el.querySelector('#arcadeOptions').addEventListener('click', (ev) => {
    ev.stopPropagation();
    syncFs();
    menu.classList.toggle('hidden');
    state.menuOpen = !menu.classList.contains('hidden');
  });
  el.addEventListener('pointerdown', (ev) => {
    if (!menu.classList.contains('hidden') && !ev.target.closest('#arcadeMenu, #arcadeOptions')) {
      menu.classList.add('hidden');
      state.menuOpen = false;
    }
  });
  menu.addEventListener('click', (ev) => {
    const act = ev.target.closest('button')?.dataset.act;
    if (!act) return;
    menu.classList.add('hidden');
    state.menuOpen = false;
    if (act === 'fullscreen') {
      if (fullscreenElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else if (act === 'stages') showStageMenu();
    else if (act === 'exit') closeArcadeGame();
  });
}
// Das Spielfeld (360x600) wird so gross wie moeglich skaliert. Hochformat (Handy): oben unter der schlanken Leiste,
// der Rest unten ist die Daumenzone. Querformat (PC): mittig. Freie Raender werden aus den Feldkanten aufgefuellt.
function resize() {
  if (!state.canvas) return;
  const bar = state.overlay.querySelector('#arcadeTop');
  const topH = 28;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const availH = cssH - topH;
  const scale = Math.max(0.3, Math.min(cssW / W, availH / H));
  const dpr = renderDpr();
  const boxW = W * scale;
  const boxH = H * scale;
  const landscape = cssW > cssH * 0.8;
  const offX = (cssW - boxW) / 2;
  const offY = topH + (landscape ? Math.max(0, (availH - boxH) / 2) : 0);
  state.scale = scale;
  state.view = { cssW, cssH, offX, offY, dpr };
  state.canvas.style.width = `${cssW}px`;
  state.canvas.style.height = `${cssH}px`;
  state.canvas.width = Math.round(cssW * dpr);
  state.canvas.height = Math.round(cssH * dpr);
  bar.style.left = `${offX}px`;
  bar.style.width = `${boxW}px`;
  bar.style.top = `${offY - topH}px`;
}
// Auf Handys (DPR 2-3) wirkt 1.5 unscharf; 2 ist noch günstig genug
const HURT_SECONDS = 0.7;

function renderDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

// Streckt die Randzeilen des Spielfelds in den freien Bereich und dunkelt die Daumenzone ab
function extendEdges(ctx) {
  const { offX, offY, dpr } = state.view;
  const k = state.scale * dpr;
  const cw = state.canvas.width;
  const ch = state.canvas.height;
  const bx = Math.round(offX * dpr);
  const by = Math.round(offY * dpr);
  const bw = Math.max(1, Math.min(cw - bx, Math.round(W * k)));
  const bh = Math.max(1, Math.min(ch - by, Math.round(H * k)));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bottom = ch - (by + bh);
  if (bottom > 0) ctx.drawImage(state.canvas, bx, by + bh - 2, bw, 2, bx, by + bh, bw, bottom);
  if (by > 0) ctx.drawImage(state.canvas, bx, by, bw, 2, bx, 0, bw, by);
  if (bx > 0) {
    ctx.drawImage(state.canvas, bx, 0, 2, ch, 0, 0, bx, ch);
    ctx.drawImage(state.canvas, bx + bw - 2, 0, 2, ch, bx + bw, 0, cw - bx - bw, ch);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  if (bottom > 0) ctx.fillRect(0, by + bh, cw, bottom);
  if (by > 0) ctx.fillRect(0, 0, cw, by);
  if (bx > 0) {
    ctx.fillRect(0, by, bx, bh);
    ctx.fillRect(bx + bw, by, cw - bx - bw, bh);
  }
}
function toLogical(ev) {
  const r = state.canvas.getBoundingClientRect();
  const { offX, offY } = state.view;
  return { x: (ev.clientX - r.left - offX) / state.scale, y: (ev.clientY - r.top - offY) / state.scale };
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
  state.modeDur = index === 0 || state.segmentId ? INTRO_SECONDS : STAGE_INTRO_SECONDS;
  state.timer = state.modeDur;
  state.lastCount = 0;
  state.invuln = 1;
}

function startRun(index = 0, testRun = false, segmentId = null) {
  hideScreen();
  stopArcadeAudio(true);
  state.testRun = state.adminMenu && testRun;
  bestScore = getLocalBest().score;
  const party = getPartyContext();
  const rsvp = party.getCachedRsvps()[party.deviceToken] || readLocalPlayerRsvp();
  playerAppearance = createPlayerAppearance(rsvp);
  state.score = 0;
  runMaxLives = state.testRun ? devLives : MAX_LIVES;
  state.lives = runMaxLives;
  state.shakeT = 0;
  state.hurtT = 0;
  state.keys.clear();
  state.pointer = { x: W / 2, y: H - 80, down: false };
  state.segmentId = state.adminMenu && testRun ? segmentId : null;
  startStage(index, state.segmentId);
}

function showStageMenu() {
  if (!state.adminMenu || !state.overlay) return;
  stopArcadeAudio(true);
  state.mode = 'stageSelect';
  state.keys.clear();
  state.pointer.down = false;
  const a = arcadeText();
  showScreen(`
    <div class="font-mono max-w-sm w-full text-white">
      <div class="text-xs text-cyan-400 mb-1">ADMIN · TESTMODUS</div>
      <h2 class="text-xl font-black mb-2">STAGE AUSWÄHLEN</h2>
      <p class="text-xs text-neutral-400 mb-4">Direktstart mit deinem Avatar und der gewählten Lebenszahl. Keine Rekorde oder Achievements. Nach der Stage endet der Test.</p>
      <div class="flex items-center gap-2 mb-3 text-xs">
        <span class="text-neutral-400">LEBEN</span>
        ${DEV_LIVES_OPTIONS.map((n) => `<button type="button" data-dev-lives="${n}" class="flex-1 py-2 rounded border ${n === devLives ? 'border-rose-400 bg-rose-900 text-white' : 'border-neutral-600 bg-neutral-800 text-neutral-300'}">${n}</button>`).join('')}
      </div>
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
  state.overlay.querySelectorAll('[data-dev-lives]').forEach((button) => {
    button.addEventListener('click', () => {
      devLives = Number(button.dataset.devLives);
      showStageMenu();
    });
  });
  state.overlay.querySelectorAll('[data-test-stage]').forEach((button) => {
    button.addEventListener('click', () => startRun(Number(button.dataset.testStage), true));
  });
  state.overlay.querySelector('#arcadeSegMenu').addEventListener('click', showSegmentMenu);
  state.overlay.querySelector('#arcadeNormalRun').addEventListener('click', () => startRun());
}

function showSegmentMenu() {
  if (!state.adminMenu || !state.overlay) return;
  const probe = createStage1();
  probe.init(engine);
  const tiers = ['EASY', 'MEDIUM', 'HARD'];
  showScreen(`
    <div class="font-mono max-w-sm w-full text-white max-h-full overflow-y-auto">
      <div class="text-xs text-cyan-400 mb-1">ADMIN · TESTMODUS</div>
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
  const color = state.stage?.color || '#22c55e';
  const percent = getPercent();
  if (hudValues.color !== color) {
    hudNodes.arcadeProgress.style.background = color;
    hudValues.color = color;
  }
  if (hudValues.score !== state.score) {
    hudNodes.arcadeScore.textContent = state.score;
    hudValues.score = state.score;
  }
  if (hudValues.lives !== state.lives) {
    hudNodes.arcadeLives.textContent = runMaxLives > 5 ? `❤️ ${Math.max(0, state.lives)}` : '❤️'.repeat(Math.max(0, state.lives)) + '🖤'.repeat(Math.max(0, runMaxLives - state.lives));
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
  const { dpr, offX, offY } = state.view;
  const k = state.scale * dpr;
  const beat = getBeatInfo();

  if (state.menuOpen && state.mode === 'playing') state.invuln = Math.max(state.invuln, 0.2); // Menue offen = kein Schaden
  if (state.invuln > 0) state.invuln -= dt;
  if (state.shakeT > 0) state.shakeT -= dt;
  if (state.hurtT > 0) state.hurtT -= dt;

  if (state.mode === 'intro') {
    state.timer -= dt;
    const left = Math.ceil(state.timer);
    if (state.modeDur > INTRO_SECONDS && left >= 1 && left <= 3 && left !== state.lastCount) {
      state.lastCount = left;
      sfx(left === 1 ? 880 : 520, 'square', 0.09, 0.04);
    }
    if (state.timer <= 0) {
      state.mode = 'playing';
      sfx(1040, 'square', 0.18, 0.05);
    }
  } else if (state.mode === 'playing') {
    state.stage.update(dt, beat, { keys: state.keys, pointer: state.pointer, held: engine.held });
    setStressLevel(computeStress());
  } else if (state.mode === 'stageClear') {
    setStressLevel(0);
    state.timer -= dt;
    if (state.timer <= 0) startStage(state.stageIndex + 1);
  }

  ctx.setTransform(k, 0, 0, k, offX * dpr, offY * dpr);
  const sh = state.shakeT > 0 ? (Math.random() - 0.5) * (state.hurtT > 0 ? 16 : 8) : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
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
  drawHurt(ctx);
  extendEdges(ctx);
  updateHud();
}

// Treffer-Feedback: roter Blitz, dicker Rahmen, Schadenszahl - unabhaengig von der Stage
function drawHurt(ctx) {
  if (state.hurtT <= 0) return;
  const p = clamp01(state.hurtT / HURT_SECONDS);
  ctx.save();
  ctx.fillStyle = '#ef4444';
  ctx.globalAlpha = 0.38 * p * p;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = Math.min(1, p * 1.4);
  const b = 14 + 16 * p;
  ctx.fillRect(0, 0, W, b);
  ctx.fillRect(0, H - b, W, b);
  ctx.fillRect(0, 0, b, H);
  ctx.fillRect(W - b, 0, b, H);
  if (state.mode === 'playing' || state.lives <= 0) {
    ctx.globalAlpha = Math.min(1, p * 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px monospace';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000';
    const y = 92 - (1 - p) * 26;
    ctx.strokeText('-1 ❤', W / 2, y);
    ctx.fillStyle = '#fff';
    ctx.fillText('-1 ❤', W / 2, y);
  }
  ctx.restore();
}

function drawWipe(ctx, p, color) {
  if (p <= 0) return;
  const half = (W / 2) * Math.min(1, p);
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, half, H);
  ctx.fillRect(W - half, 0, half, H);
  if (p < 1) {
    ctx.fillStyle = color;
    ctx.fillRect(half - 2, 0, 3, H);
    ctx.fillRect(W - half - 1, 0, 3, H);
  }
}

function drawBanner(ctx) {
  const a = arcadeText();
  const color = state.stage.color;
  const elapsed = state.modeDur - state.timer;
  ctx.textAlign = 'center';
  if (state.mode === 'stageClear') {
    const k = clamp01(elapsed / 0.4);
    const ease = 1 - (1 - k) * (1 - k);
    const wipe = clamp01((elapsed - (state.modeDur - WIPE_SECONDS)) / WIPE_SECONDS);
    ctx.fillStyle = `rgba(0,0,0,${0.65 * ease})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(16 + 12 * ease)}px monospace`;
    ctx.fillText(`STAGE ${state.stageIndex + 1} CLEAR`, W / 2, H / 2 - 24);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px monospace';
    ctx.globalAlpha = clamp01((elapsed - 0.3) / 0.3);
    ctx.fillText(`+${Math.round(state.clearBonus * clamp01((elapsed - 0.3) / 0.8))}`, W / 2, H / 2 + 8);
    ctx.fillStyle = '#d4d4d8';
    ctx.font = '12px monospace';
    ctx.globalAlpha = clamp01((elapsed - 0.9) / 0.4);
    ctx.fillText(`NÄCHSTE: ${a.stageNames[state.stageIndex + 1] ?? ''}`, W / 2, H / 2 + 38);
    ctx.globalAlpha = 1;
    drawWipe(ctx, wipe, color);
    return;
  }
  const first = state.modeDur <= INTRO_SECONDS;
  const slide = clamp01(elapsed / 0.45);
  const ease = 1 - Math.pow(1 - slide, 3);
  const open = first ? 0 : 1 - clamp01(elapsed / WIPE_SECONDS);
  ctx.fillStyle = `rgba(0,0,0,${first ? 0.6 : 0.55})`;
  ctx.fillRect(0, H / 2 - 70, W, 140);
  ctx.fillStyle = color;
  ctx.fillRect(0, H / 2 - 70, W * ease, 2);
  ctx.fillRect(W - W * ease, H / 2 + 68, W * ease, 2);
  ctx.font = 'bold 20px monospace';
  ctx.globalAlpha = ease;
  ctx.fillText(a.stageNames[state.stageIndex], W / 2 + (1 - ease) * 60, H / 2 - 22);
  ctx.fillStyle = '#d4d4d8';
  ctx.font = '12px monospace';
  ctx.fillText(a.stageHints[state.stageIndex], W / 2 - (1 - ease) * 60, H / 2 + 6);
  ctx.globalAlpha = 1;
  if (!first) {
    const n = Math.ceil(state.timer);
    if (n >= 1 && n <= 3) {
      const phase = 1 - (state.timer - Math.floor(state.timer));
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1 - phase * 0.7;
      ctx.font = `bold ${Math.round(34 + (1 - phase) * 14)}px monospace`;
      ctx.fillText(String(n), W / 2, H / 2 + 50);
      ctx.globalAlpha = 1;
    }
    drawWipe(ctx, open, color);
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
  state.adminMenu = stageMenu;
  buildOverlay();
  bestScore = getLocalBest().score;
  preloadArcadeAudio();
  attachInput();
  resize();
  if (stageMenu) showStageMenu();
  else startRun();
  state.last = performance.now();
  state.raf = requestAnimationFrame(frame);
}

export function closeArcadeGame() {
  cancelAnimationFrame(state.raf);
  if (state.fsSync) document.removeEventListener('fullscreenchange', state.fsSync);
  if (fullscreenElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  stopArcadeAudio();
  detachInput();
  state.overlay?.remove();
  Object.assign(state, { adminMenu: false, menuOpen: false, overlay: null, canvas: null, ctx: null, stage: null, mode: 'idle', testRun: false });
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
