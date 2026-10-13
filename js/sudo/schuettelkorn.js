import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';
import { fadeOutAudio } from './shared/utils.js';
import { OUTRO_MS, startLogoOutro } from './shared/logo-outro.js';
import kornLogo from '../../assets/sudo/schuettelkorn/logo.png';

const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;
const KORN_CONFIG = Object.assign(
  { c_drop: 17500, duration: 18800, fadeTime: 2500 },
  SUDO_CUE_TIMINGS?.schuettelkorn || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));

function createIllustration(source, className, description) {
  const wrapper = document.createElement('div');
  wrapper.className = className;
  wrapper.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.src = source;
  image.alt = '';
  image.setAttribute('draggable', 'false');
  wrapper.appendChild(image);
  wrapper.setAttribute('data-description', description);
  document.body.appendChild(wrapper);
  return wrapper;
}

function createShotLatte() {
  const rail = document.createElement('div');
  rail.className = 'korn-shot-latte';
  rail.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < 6; index++) {
    const shot = document.createElement('div');
    shot.className = 'korn-shot';
    shot.style.setProperty('--shot-index', index);
    shot.innerHTML = '<span class="korn-shot__rim"></span><span class="korn-shot__drink"></span>';
    rail.appendChild(shot);
  }

  const handle = document.createElement('span');
  handle.className = 'korn-shot-latte__handle';
  rail.appendChild(handle);
  document.body.appendChild(rail);
  return rail;
}

function createBottle() {
  return createIllustration(
    new URL('../../assets/sudo/schuettelkorn/strohmann.svg', import.meta.url).href,
    'korn-bottle',
    'Strohmann-Kornflasche'
  );
}

function createErhardtPortrait() {
  return createIllustration(
    new URL('../../assets/sudo/schuettelkorn/heinz-erhardt.svg', import.meta.url).href,
    'heinz-portrait',
    'Stilisierter Bühnenkomiker mit Brille und Fliege'
  );
}

function createErhardtTitle() {
  const title = document.createElement('div');
  title.className = 'heinz-stage-title';
  title.setAttribute('aria-hidden', 'true');
  title.innerHTML =
    '<span class="heinz-stage-title__name">HEINZ ERHARDT</span><span class="heinz-stage-title__tagline">ONKEL DER NATION</span>';
  document.body.appendChild(title);
  return title;
}

function createText() {
  const text = document.createElement('div');
  text.className = 'korn-text';
  text.setAttribute('aria-live', 'off');
  document.body.appendChild(text);
  return text;
}

function setText(element, value, style = 'cream', motion = 'slam') {
  element.className = `korn-text korn-text--${style} korn-text--${motion}`;
  element.textContent = value;
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
}

function createEffect(className, duration) {
  const effect = document.createElement('div');
  effect.className = className;
  effect.setAttribute('aria-hidden', 'true');
  document.body.appendChild(effect);
  window.setTimeout(() => effect.remove(), duration);
  return effect;
}

function spawnBubbles(amount, palette = 'citrus') {
  const scaledAmount = isMobile ? Math.max(3, Math.round(amount * 0.25)) : amount;
  const colors = {
    citrus: ['#e9f45a', '#9fe04c', '#fff3a6'],
    berry: ['#ff73bd', '#8f4eff', '#f8a8ff'],
    rainbow: ['#fd4b67', '#ffb545', '#fff25d', '#6fe890', '#6ddcff', '#cb7aff']
  }[palette];

  for (let index = 0; index < scaledAmount; index++) {
    const bubble = document.createElement('span');
    const size = 8 + Math.random() * 30;
    const duration = 550 + Math.random() * 950;
    bubble.className = 'brause-bubble';
    bubble.style.left = `${Math.random() * 100}vw`;
    bubble.style.setProperty('--bubble-size', `${size}px`);
    bubble.style.setProperty('--bubble-color', colors[index % colors.length]);
    bubble.style.setProperty('--bubble-drift', `${(Math.random() - 0.5) * 80}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}ms`);
    document.body.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), duration);
  }
}

function spawnPour(bottle, shotLatte, glassIndex) {
  const glass = shotLatte.children[glassIndex];
  if (!glass) {
    throw new Error('Schuettelkorn pour effect requires its bottle and target shot glass.');
  }

  glass.classList.add('is-pouring');
  window.setTimeout(() => {
    const bottleStyle = getComputedStyle(bottle);
    const [originX, originY] = bottleStyle.transformOrigin.split(' ').map(parseFloat);
    const [localX, localY] = [bottle.offsetWidth / 2, bottle.offsetHeight * 0.012];
    const transform = new DOMMatrixReadOnly(bottleStyle.transform);
    const neck = new DOMPoint(localX - originX, localY - originY).matrixTransform(transform);
    const target = glass.getBoundingClientRect();
    const start = {
      x: parseFloat(bottleStyle.left) + originX + neck.x,
      y: parseFloat(bottleStyle.top) + originY + neck.y
    };
    const endX = target.left + target.width / 2;
    const endY = target.top + target.height * 0.76;
    const horizontalTravel = endX - start.x;
    const verticalTravel = endY - start.y;
    const curve = horizontalTravel * 0.28;
    const stream = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    stream.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    stream.setAttribute('aria-hidden', 'true');
    stream.classList.add('korn-pour');
    stream.innerHTML = `
      <defs>
        <linearGradient id="korn-pour-gradient" x1="0" x2="1">
          <stop offset="0" stop-color="#c77818"/>
          <stop offset=".45" stop-color="#fff0a2"/>
          <stop offset="1" stop-color="#d68b20"/>
        </linearGradient>
      </defs>
      <path class="korn-pour__stream" pathLength="1"
        d="M ${start.x} ${start.y} C ${start.x + curve} ${start.y + verticalTravel * 0.38}, ${endX - curve} ${endY - verticalTravel * 0.28}, ${endX} ${endY}"/>
      <ellipse class="korn-pour__splash" cx="${endX}" cy="${endY}" rx="2" ry="1"/>
    `;
    document.body.appendChild(stream);
    window.setTimeout(() => {
      stream.remove();
      glass.classList.remove('is-pouring');
      glass.classList.add('is-filled');
    }, 900);
  }, 220);
}

function spawnBrausePacket(color, index) {
  const packet = document.createElement('div');
  packet.className = `brause-packet brause-packet--${color}`;
  packet.style.setProperty('--packet-index', index);
  packet.textContent = 'AHOI!';
  document.body.appendChild(packet);
  window.setTimeout(() => packet.remove(), 1550);
}

function triggerFlash(color = 'gold') {
  const flash = document.createElement('div');
  flash.className = `korn-flash korn-flash--${color}`;
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 700);
}

function triggerShaker() {
  const shaker = document.createElement('div');
  shaker.className = 'korn-shaker';
  shaker.setAttribute('aria-hidden', 'true');
  shaker.innerHTML =
    '<span class="korn-shaker__lid"></span><span class="korn-shaker__body"><i></i><i></i><i></i></span><span class="korn-shaker__shine"></span>';
  document.body.appendChild(shaker);
  window.setTimeout(() => shaker.remove(), 1450);
}

function triggerFinale(scene, bottle, shotLatte, portrait, text, title) {
  setText(text, 'VON VORN!', 'cream', 'slam');
  text.classList.add('korn-text--finale');
  title.classList.remove('is-visible');

  scene.classList.remove(
    'korn-scene--cabaret',
    'korn-scene--final-act',
    'korn-scene--brause',
    'korn-scene--korn',
    'korn-scene--shaken',
    'korn-scene--surge'
  );
  scene.classList.add('korn-scene--encore', 'korn-scene--finale');
  shotLatte.classList.remove('is-bubbling', 'is-shaking');
  shotLatte.classList.add('is-loaded', 'is-encore', 'is-rewinding');
  bottle.classList.remove('is-visible', 'is-pour');
  portrait.classList.remove('is-laughing', 'is-watching', 'is-comic');
  portrait.classList.add('is-visible', 'is-center-stage', 'is-encore');

  const rewind = createEffect('korn-finale-rewind', 1500);
  rewind.innerHTML = `
    <svg viewBox="0 0 400 400" aria-hidden="true">
      <path class="korn-finale-rewind__arc"
        d="M 77 165 A 137 137 0 0 1 293 91 L 314 73 L 319 123 L 269 116"/>
      <path class="korn-finale-rewind__arc korn-finale-rewind__arc--second"
        d="M 323 237 A 137 137 0 0 1 107 311 L 86 329 L 81 279 L 131 286"/>
    </svg>
  `;
  if (playTone) playTone(130, 'sawtooth', 0.45, 0.14);
}

function initializeSchuettelkorn() {
  const audio = document.getElementById('audioKorn');

  startSudoTimeline(
    audio,
    () => {
      if (appendLine) {
        appendLine(
          "<span class='text-amber-300 font-bold'>[KNEIPENBÜHNE] STROTHMANN, SCHNAPSLATTE UND AHOI-BRAUSE BEREIT.</span>"
        );
      }

      const scene = document.createElement('div');
      scene.className = 'korn-scene korn-scene--melancholy';
      scene.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scene);

      const bottle = createBottle();
      const shotLatte = createShotLatte();
      const portrait = createErhardtPortrait();
      const title = createErhardtTitle();
      const text = createText();

      window.setTimeout(() => {
        scene.classList.add('is-visible');
        portrait.classList.add('is-visible');
        setText(text, 'TRAURIG...', 'blue', 'drift');
        spawnBubbles(8, 'citrus');
      }, KORN_CONFIG.c1_traurig1);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--melancholy');
        scene.classList.add('korn-scene--korn');
        bottle.classList.add('is-visible', 'is-pour');
        shotLatte.classList.add('is-loaded');
        portrait.classList.add('is-watching');
        setText(text, '1. KORN!', 'gold', 'bottle-drop');
        spawnPour(bottle, shotLatte, 1);
        triggerFlash('gold');
      }, KORN_CONFIG.c2_korn1);

      window.setTimeout(() => {
        portrait.classList.remove('is-watching');
        portrait.classList.add('is-comic');
        setText(text, 'NOCH\nTRAURIG?!', 'blue', 'tilt');
        triggerFlash('blue');
      }, KORN_CONFIG.c3_traurig2);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--korn');
        scene.classList.add('korn-scene--brause');
        bottle.classList.remove('is-pour');
        shotLatte.classList.add('is-bubbling');
        setText(text, 'AHOI\nBRAUSE!', 'berry', 'side-pop');
        spawnBrausePacket('green', 0);
        spawnBrausePacket('orange', 1);
        spawnBrausePacket('pink', 2);
        spawnBubbles(38, 'rainbow');
        triggerFlash('rainbow');
      }, KORN_CONFIG.c4_brause_alert);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--brause');
        scene.classList.add('korn-scene--korn');
        shotLatte.classList.remove('is-bubbling');
        bottle.classList.add('is-visible');
        bottle.classList.add('is-pour');
        setText(text, '2. KORN!', 'gold', 'glass-clink');
        spawnPour(bottle, shotLatte, 3);
        triggerFlash('gold');
      }, KORN_CONFIG.c5_korn2);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--korn');
        scene.classList.add('korn-scene--brause', 'korn-scene--surge');
        bottle.classList.remove('is-pour');
        portrait.classList.add('is-laughing');
        setText(text, 'IMMER NOCH\nTRAURIG?!', 'cream', 'curtain-call');
        spawnBrausePacket('green', 0);
        spawnBubbles(24, 'rainbow');
        triggerFlash('rainbow');
        if (playTone) playTone(660, 'sine', 0.35, 0.16);
      }, KORN_CONFIG.c6_traurig3);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--surge');
        scene.classList.add('korn-scene--shaken');
        shotLatte.classList.add('is-shaking');
        setText(text, 'SCHÜTTELN!', 'berry', 'slam');
        triggerShaker();
        spawnBubbles(60, 'rainbow');
        if (appendLine) {
          appendLine(
            "<span class='text-pink-400 font-extrabold'>[BRAUSE-REAKTOR] PRICKELN AUF ALLEN SECHS SPUREN!</span>"
          );
        }
        if (playTone) playTone(110, 'sawtooth', 0.55, 0.18);
      }, KORN_CONFIG.c7_schuetteln);

      window.setTimeout(() => {
        scene.classList.remove('korn-scene--shaken');
        scene.classList.add('korn-scene--korn', 'korn-scene--final-round');
        shotLatte.classList.remove('is-shaking');
        shotLatte.classList.add('is-loaded');
        bottle.classList.add('is-visible', 'is-pour');
        setText(text, '3. KORN!', 'gold', 'shot-cascade');
        spawnPour(bottle, shotLatte, 5);
        spawnBubbles(34, 'citrus');
        triggerFlash('gold');
      }, KORN_CONFIG.c8_korn3);

      window.setTimeout(() => {
        setText(text, 'UND DANN...', 'cream', 'poem');
        portrait.classList.add('is-center-stage');
        scene.classList.remove('korn-scene--final-round');
        scene.classList.add('korn-scene--cabaret', 'korn-scene--final-act');
        bottle.classList.remove('is-visible', 'is-pour');
        shotLatte.classList.remove('is-bubbling', 'is-shaking');
        shotLatte.classList.add('is-loaded', 'is-encore');
        portrait.classList.add('is-visible');
        title.classList.add('is-visible');
      }, KORN_CONFIG.c9_undwenn);

      window.setTimeout(() => {
        triggerFinale(scene, bottle, shotLatte, portrait, text, title);

        const finaleTail = Math.max(0, KORN_CONFIG.duration - KORN_CONFIG.c11_vorn);
        const fadeDelay = Math.max(0, finaleTail - KORN_CONFIG.fadeTime);
        window.setTimeout(() => fadeOutAudio(audio, KORN_CONFIG.fadeTime), fadeDelay);
        const outroMs = Math.min(OUTRO_MS, Math.round(finaleTail * 0.8));
        window.setTimeout(
          () => startLogoOutro({ logo: kornLogo, theme: 'bubbles', duration: outroMs }),
          finaleTail - outroMs
        );
        window.setTimeout(() => window.parent.postMessage('sudo_finished', '*'), finaleTail);
      }, KORN_CONFIG.c11_vorn);
    },
    'Schuettelkorn'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSchuettelkorn, { once: true });
} else {
  initializeSchuettelkorn();
}
