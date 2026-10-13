import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;

const RAGE_CONFIG = Object.assign(
  { c6_drop: 2700, duration: 8300, fadeTime: 2000 },
  SUDO_CUE_TIMINGS?.ragecage || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));

const timers = new Set();
const animationFrames = new Set();
const particles = new Set();
let sceneFinished = false;
let arena;
let sceneText;
let roundLabel;
let statusLabel;
let audioElement;

function schedule(callback, delay) {
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    if (!sceneFinished) callback();
  }, delay);
  timers.add(timer);
  return timer;
}

function repeat(callback, interval) {
  const timer = window.setInterval(() => {
    if (!sceneFinished) callback();
  }, interval);
  timers.add(timer);
  return timer;
}

function cleanup() {
  sceneFinished = true;
  timers.forEach((timer) => {
    window.clearTimeout(timer);
    window.clearInterval(timer);
  });
  timers.clear();
  animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
  animationFrames.clear();
  particles.forEach((particle) => particle.remove());
  particles.clear();
  if (root) root.classList.remove('cam-speed-shake');
  if (arena) arena.remove();
}

function makeElement(tag, className, parent = document.body) {
  const element = document.createElement(tag);
  element.className = className;
  parent.appendChild(element);
  return element;
}

function makeCup(parent, index) {
  const cup = makeElement('span', 'rage-cup', parent);
  cup.style.setProperty('--cup-index', index);
  makeElement('span', 'rage-cup__rim', cup);
  makeElement('span', 'rage-cup__mark', cup);
  return cup;
}

function createArena() {
  arena = makeElement('section', 'rage-arena');
  arena.setAttribute('aria-hidden', 'true');

  makeElement('div', 'rage-arena__backlight', arena);
  makeElement('div', 'rage-arena__floor', arena);
  makeElement('div', 'rage-arena__crowd', arena);

  const lights = makeElement('div', 'rage-lights', arena);
  for (let index = 0; index < 6; index++) {
    const beam = makeElement('span', 'rage-lights__beam', lights);
    beam.style.setProperty('--beam-left', `${7 + index * 17.2}%`);
    beam.style.setProperty('--beam-delay', `${index * -0.45}s`);
  }

  const hud = makeElement('div', 'rage-hud', arena);
  const eventLabel = makeElement('div', 'rage-hud__event', hud);
  eventLabel.innerHTML = '<span>PROJECT 21</span><span>LIVE EVENT</span>';
  const liveLabel = makeElement('div', 'rage-hud__live', hud);
  liveLabel.innerHTML = '<span></span> SYSTEM OVERLOAD';
  const meter = makeElement('div', 'rage-hud__meter', hud);
  for (let index = 0; index < 5; index++) makeElement('span', '', meter);

  const cage = makeElement('div', 'rage-cage', arena);
  makeElement('div', 'rage-cage__frame rage-cage__frame--top', cage);
  makeElement('div', 'rage-cage__frame rage-cage__frame--bottom', cage);
  makeElement('div', 'rage-cage__bars', cage);
  makeElement('div', 'rage-cage__ropes rage-cage__ropes--left', cage);
  makeElement('div', 'rage-cage__ropes rage-cage__ropes--right', cage);
  for (let index = 0; index < 12; index++) {
    const bar = makeElement('span', 'rage-cage__bar', cage);
    bar.style.setProperty('--bar-position', `${(index / 11) * 100}%`);
  }

  const stack = makeElement('div', 'rage-stack', arena);
  const rows = [1, 2, 3];
  let cupIndex = 0;
  rows.forEach((count) => {
    const row = makeElement('div', 'rage-stack__row', stack);
    for (let index = 0; index < count; index++) makeCup(row, cupIndex++);
  });

  const floorMark = makeElement('div', 'rage-floor-mark', arena);
  floorMark.innerHTML = '<span>ROUND 01</span><b>STACK OR GET STACKED</b>';
  roundLabel = floorMark.querySelector('span');
  statusLabel = floorMark.querySelector('b');

  sceneText = makeElement('div', 'rage-text', arena);
  sceneText.setAttribute('aria-hidden', 'true');
  makeElement('span', 'rage-text__eyebrow', sceneText).textContent = 'THE PARTY GAME FROM HELL';
  makeElement('strong', 'rage-text__word', sceneText);

  makeElement('div', 'rage-vignette', arena);
  makeElement('div', 'rage-grain', arena);
  return arena;
}

function restartAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}

function setWord(text) {
  const word = sceneText.querySelector('.rage-text__word');
  word.textContent = text;
  sceneText.style.setProperty('--word-len', String(Math.max(4, text.length)));
}

function showCue(text, entrance, index) {
  if (sceneFinished) return;
  setWord(text);
  sceneText.className = `rage-text rage-text--cue-${index}`;
  restartAnimation(sceneText, `${entrance} 520ms cubic-bezier(0.16, 0.8, 0.24, 1) both`);
  arena.querySelectorAll('.rage-hud__meter span').forEach((segment, segmentIndex) => {
    segment.classList.toggle('is-lit', segmentIndex < index);
  });
  arena.classList.add('is-hit');
  schedule(() => arena.classList.remove('is-hit'), 180);
}

function addParticle(className, content, lifetime, vars) {
  if (sceneFinished || particles.size >= 110) return;
  const particle = makeElement('span', className, arena);
  particle.textContent = content;
  particle.setAttribute('aria-hidden', 'true');
  Object.entries(vars).forEach(([name, value]) => particle.style.setProperty(name, value));
  particles.add(particle);
  schedule(() => {
    particles.delete(particle);
    particle.remove();
  }, lifetime);
}

function spawnBalls(amount) {
  const scaledAmount = isMobile ? Math.max(2, Math.round(amount * 0.45)) : amount;
  for (let index = 0; index < scaledAmount; index++) {
    const bounce = 0.4 + Math.random() * 0.35;
    addParticle('rage-ball', '', 3000, {
      '--particle-x': `${Math.random() * 100}%`,
      '--particle-drift': `${(Math.random() - 0.5) * 150}vw`,
      '--bounce-time': `${bounce}s`,
      '--drift-time': `${bounce * 6}s`,
      '--ball-size': `${0.85 + Math.random() * 0.9}rem`
    });
  }
}

function spawnFlyingCups(amount) {
  const scaledAmount = isMobile ? Math.max(1, Math.round(amount * 0.45)) : amount;
  for (let index = 0; index < scaledAmount; index++) {
    const flight = 0.55 + Math.random() * 0.6;
    addParticle('rage-flying-cup', '🥤', flight * 1000, {
      '--particle-y': `${Math.random() * 100}%`,
      '--flight-time': `${flight}s`,
      '--flight-turn': `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`
    });
  }
}

function createChaosOverlays() {
  ['rage-speedlines', 'rage-hazard'].forEach((className) => {
    makeElement('div', className, arena);
  });
  return makeElement('div', 'rage-flash', arena);
}

function spawnShockwave() {
  const ring = makeElement('span', 'rage-shockwave', arena);
  ring.style.setProperty('--wave-x', `${15 + Math.random() * 70}%`);
  ring.style.setProperty('--wave-y', `${20 + Math.random() * 55}%`);
  schedule(() => ring.remove(), 700);
}

function restackCups() {
  arena.querySelectorAll('.rage-cup').forEach((cup, index) => {
    cup.classList.remove('is-scattered', 'is-dropping');
    cup.offsetHeight;
    cup.style.setProperty('--scatter-delay', `${index * 45}ms`);
    cup.classList.add('is-dropping');
  });
}

const PANIC_WORDS = [
  'WEITER!',
  'TRINK!',
  'RECHTS!',
  'LINKS!',
  'STAPELN!',
  'BALL WEITER!',
  'HOPP HOPP!',
  'SCHNELLER!'
];
const PANIC_ENTRANCES = ['rage-cue-left', 'rage-cue-right', 'rage-cue-center', 'rage-final-slam'];
const CAMERA_MOVES = [
  'rage-cam-punch',
  'rage-cam-tilt-left',
  'rage-cam-tilt-right',
  'rage-cam-drop'
];

// Jeder Beat wechselt Farbwelt, Kamera, Text und Becherturm, damit sich das Bild ständig ändert.
function runBeat(beat, { reducedMotion, flash }) {
  arena.dataset.look = String(beat % 5);

  if (!arena.classList.contains('is-finale')) {
    const entrance = PANIC_ENTRANCES[beat % PANIC_ENTRANCES.length];
    sceneText.querySelector('.rage-text__eyebrow').textContent =
      `BEAT ${String(beat + 1).padStart(2, '0')}`;
    setWord(PANIC_WORDS[beat % PANIC_WORDS.length]);
    sceneText.className = `rage-text rage-text--beat rage-text--v${beat % 4}`;
    sceneText.style.setProperty('--text-top', `${30 + Math.random() * 18}%`);
    sceneText.style.setProperty('--text-tilt', `${(Math.random() - 0.5) * 14}deg`);
    restartAnimation(sceneText, `${entrance} 380ms cubic-bezier(0.16, 0.8, 0.24, 1) both`);
  }

  if (reducedMotion) return;

  restartAnimation(arena, `${CAMERA_MOVES[beat % CAMERA_MOVES.length]} 450ms ease-out both`);
  spawnShockwave();
  if (flash) restartAnimation(flash, 'rage-flash-pop 260ms ease-out both');
  if (beat % 2 === 0) scatterStack();
  else restackCups();
}

function scatterStack() {
  const cups = arena.querySelectorAll('.rage-cup');
  cups.forEach((cup, index) => {
    cup.classList.remove('is-scattered', 'is-dropping');
    cup.offsetHeight;
    cup.style.setProperty('--scatter-x', `${(Math.random() - 0.5) * 90}vw`);
    cup.style.setProperty('--scatter-y', `${-20 - Math.random() * 45}vh`);
    cup.style.setProperty('--scatter-turn', `${Math.random() * 720 - 360}deg`);
    cup.style.setProperty('--scatter-delay', `${index * 34}ms`);
    cup.classList.add('is-scattered');
  });
}

function pulseCamera() {
  if (!root) return;
  root.classList.remove('cam-speed-shake');
  root.offsetHeight;
  root.classList.add('cam-speed-shake');
  schedule(() => root.classList.remove('cam-speed-shake'), 460);
}

function fadeOutAudio(audio, duration) {
  if (!audio || audio.paused) return;
  const startedAt = performance.now();
  const initialVolume = audio.volume;
  const fade = (now) => {
    if (sceneFinished) return;
    const progress = Math.min((now - startedAt) / duration, 1);
    audio.volume = initialVolume * (1 - progress);
    if (progress < 1) {
      const frame = window.requestAnimationFrame(fade);
      animationFrames.add(frame);
    } else {
      audio.pause();
      audio.volume = 0;
    }
  };
  animationFrames.add(window.requestAnimationFrame(fade));
}

function startChaos() {
  arena.classList.add('is-chaos');
  roundLabel.textContent = 'FINAL ROUND';
  statusLabel.textContent = 'NO RULES. NO MERCY.';
  sceneText.querySelector('.rage-text__eyebrow').textContent = 'NO RULES. NO MERCY.';
  setWord('RAGE CAGE');
  sceneText.className = 'rage-text rage-text--final';
  restartAnimation(sceneText, 'rage-final-slam 700ms cubic-bezier(0.14, 0.82, 0.22, 1) both');
  scatterStack();
  pulseCamera();

  if (typeof appendLine === 'function') {
    appendLine(
      `<span class='text-yellow-400 font-extrabold text-sm'>🏎️ [RAGECAGE] KÄFIG OFFEN. KEINER KOMMT HIER NÜCHTERN RAUS!</span>`
    );
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calls = ['WEITER!', 'BALL WEITER!', 'TRINKEN!', 'NICHT STOPPEN!'];
  let flash = null;

  if (!reducedMotion) {
    flash = createChaosOverlays();
    spawnBalls(14);
    repeat(() => spawnBalls(5), 200);
    repeat(() => spawnFlyingCups(3), 400);
  }

  let beat = 0;
  schedule(() => {
    repeat(() => {
      statusLabel.textContent = calls[beat % calls.length];
      runBeat(beat, { reducedMotion, flash });
      beat++;
    }, 450);
  }, 700);

  schedule(
    () => {
      arena.classList.add('is-finale');
      roundLabel.textContent = 'GAME OVER';
      statusLabel.textContent = 'LETZTE RUNDE!';
      sceneText.querySelector('.rage-text__eyebrow').textContent = 'DER LETZTE BECHER FÄLLT';
      setWord('LETZTE RUNDE');
      sceneText.className = 'rage-text rage-text--warning';
      sceneText.style.removeProperty('--text-top');
      sceneText.style.removeProperty('--text-tilt');
      restartAnimation(sceneText, 'rage-warning-slam 440ms cubic-bezier(0.14, 0.82, 0.22, 1) both');
      scatterStack();
      pulseCamera();
    },
    Math.max(0, RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop - RAGE_CONFIG.fadeTime)
  );

  const fadeDelay = Math.max(0, RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop - RAGE_CONFIG.fadeTime);
  schedule(() => fadeOutAudio(audioElement, RAGE_CONFIG.fadeTime), fadeDelay);
  schedule(
    () => {
      cleanup();
      window.parent.postMessage('sudo_finished', '*');
    },
    Math.max(0, RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop)
  );
}

function initializeRagecage() {
  audioElement = document.getElementById('audioGas');
  startSudoTimeline(
    audioElement,
    () => {
      createArena();
      if (typeof appendLine === 'function') {
        appendLine(
          `<span class='text-red-500 font-extrabold'>[RAGECAGE] LICHT AUS. KÄFIG AN. BECHER BEREIT.</span>`
        );
      }

      const cues = [
        ['GAS', 'rage-cue-left', RAGE_CONFIG.c1_gas1],
        ['GAS', 'rage-cue-right', RAGE_CONFIG.c2_gas2],
        ['GAS', 'rage-cue-left', RAGE_CONFIG.c3_gas3],
        ['GAS', 'rage-cue-right', RAGE_CONFIG.c4_gas4],
        ['GAS!!!', 'rage-cue-center', RAGE_CONFIG.c5_gas5]
      ];

      cues.forEach(([text, entrance, timing], index) => {
        schedule(() => {
          arena.classList.add('is-lit', `is-build-${index + 1}`);
          showCue(text, entrance, index + 1);
        }, timing);
      });

      schedule(startChaos, RAGE_CONFIG.c6_drop);
    },
    'Ragecage'
  );
}

window.addEventListener('pagehide', cleanup, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRagecage, { once: true });
} else {
  initializeRagecage();
}
