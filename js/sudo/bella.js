import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';
import { fadeOutAudio } from './shared/utils.js';
import { OUTRO_MS, startLogoOutro } from './shared/logo-outro.js';
import bellaLogo from '../../assets/sudo/bella/logo.png';
import birdsSvg from '../../assets/sudo/bella/birds.svg?raw';
import ribbonsSvg from '../../assets/sudo/bella/ribbons.svg?raw';
import baySvg from '../../assets/sudo/bella/bay.svg?raw';
import eruptionSvg from '../../assets/sudo/bella/eruption.svg?raw';
import fireworksSvg from '../../assets/sudo/bella/fireworks.svg?raw';
import pizzaSvg from '../../assets/sudo/bella/pizza.svg?raw';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;
const BELLA_CONFIG = Object.assign(
  { duration: 7000, fadeTime: 1500 },
  SUDO_CUE_TIMINGS?.bella || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));

function createPiazza() {
  const scene = document.createElement('div');
  scene.className = 'bella-piazza';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `
    <div class="bella-piazza__moon"></div>
    <div class="bella-cloud bella-cloud--left"></div>
    <div class="bella-cloud bella-cloud--right"></div>
    <div class="bella-searchlight bella-searchlight--left"></div>
    <div class="bella-searchlight bella-searchlight--right"></div>
    <div class="bella-pennants"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    ${birdsSvg}
    ${ribbonsSvg}
    ${baySvg}
    ${eruptionSvg}
    ${fireworksSvg}
    ${pizzaSvg}
    <div class="bella-ground"></div>
    <div class="bella-lantern bella-lantern--left"></div>
    <div class="bella-lantern bella-lantern--right"></div>
  `;
  document.body.appendChild(scene);
  return scene;
}

function createTitle() {
  const title = document.createElement('div');
  title.className = 'bella-title';
  title.setAttribute('aria-hidden', 'true');
  document.body.appendChild(title);
  return title;
}

function showTitle(title, text, colorClass, motionClass) {
  title.className = `bella-title ${colorClass} ${motionClass}`;
  title.textContent = text;
  title.dataset.label = text;
  title.style.animation = 'none';
  void title.offsetWidth;
  title.style.animation = '';
}

function spawnFlagConfetti(count, palette = ['#009246', '#fff6dc', '#ce2b37']) {
  const scaledCount = isMobile ? Math.max(3, Math.round(count * 0.2)) : count;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < scaledCount; index++) {
    const piece = document.createElement('span');
    const duration = 1100 + Math.random() * 900;
    piece.className = 'bella-confetti';
    piece.style.left = `${8 + Math.random() * 84}vw`;
    piece.style.setProperty('--confetti-color', palette[index % palette.length]);
    piece.style.setProperty('--confetti-drift', `${(Math.random() - 0.5) * 28}vw`);
    piece.style.setProperty('--confetti-rotation', `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty('--confetti-duration', `${duration}ms`);
    fragment.appendChild(piece);
    window.setTimeout(() => piece.remove(), duration);
  }
  document.body.appendChild(fragment);
}

function createImpact() {
  const impact = document.createElement('div');
  impact.className = 'bella-impact';
  impact.setAttribute('aria-hidden', 'true');
  document.body.appendChild(impact);
  window.setTimeout(() => impact.remove(), 950);
}

function initializeBella() {
  const audio = document.getElementById('audioBellaNapoli');

  startSudoTimeline(
    audio,
    () => {
      if (appendLine) {
        appendLine(
          "<span class='text-amber-300 font-bold'>[SUDO] Zünde Dorf-Abriss (Bella Napoli)...</span>"
        );
      }

      const scene = createPiazza();
      const title = createTitle();
      window.requestAnimationFrame(() => scene.classList.add('is-visible'));

      window.setTimeout(() => {
        showTitle(title, 'BELLA!', 'bella-title--green', 'bella-title--hit');
        scene.classList.add('is-first-hit');
        createImpact();
      }, BELLA_CONFIG.hit1);

      window.setTimeout(() => {
        showTitle(title, 'BELLA!', 'bella-title--white', 'bella-title--hit');
        scene.classList.remove('is-first-hit');
        scene.classList.add('is-second-hit');
        spawnFlagConfetti(24);
        createImpact();
      }, BELLA_CONFIG.hit2);

      window.setTimeout(() => {
        showTitle(title, 'NAPOLI!', 'bella-title--red', 'bella-title--drop');
        scene.classList.remove('is-second-hit');
        scene.classList.add('is-drop');
        if (root) root.classList.add('cam-speed-shake');
        window.setTimeout(() => {
          if (root) root.classList.remove('cam-speed-shake');
        }, 750);
        spawnFlagConfetti(74);
        window.setTimeout(() => spawnFlagConfetti(34), 280);
        createImpact();
        if (playTone) playTone(110, 'sawtooth', 0.35, 0.16);

        if (appendLine) {
          appendLine(
            "<span class='text-rose-400 font-extrabold text-sm animate-pulse'>🎺 [DROP] NAPOLI! PARTYRAUM ERREICHT MAXIMALEN DURCHSATZ!</span>"
          );
        }

        const finaleTail = Math.max(0, BELLA_CONFIG.duration - BELLA_CONFIG.drop);
        const fadeDelay = Math.max(0, finaleTail - BELLA_CONFIG.fadeTime);
        window.setTimeout(() => fadeOutAudio(audio, BELLA_CONFIG.fadeTime), fadeDelay);
        const outroMs = Math.min(OUTRO_MS, Math.round(finaleTail * 0.7));
        window.setTimeout(
          () => startLogoOutro({ logo: bellaLogo, theme: 'tricolor', duration: outroMs }),
          finaleTail - outroMs
        );
        window.setTimeout(() => {
          scene.classList.add('is-ending');
          window.setTimeout(() => {
            if (scene.isConnected) scene.remove();
            if (title.isConnected) title.remove();
            if (root) root.classList.remove('cam-speed-shake');
            window.parent.postMessage('sudo_finished', '*');
          }, 450);
        }, finaleTail);
      }, BELLA_CONFIG.drop);
    },
    'Bella Napoli'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBella, { once: true });
} else {
  initializeBella();
}
