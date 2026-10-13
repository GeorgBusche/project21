import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';
import { fadeOutAudio, resetAnimation as resetAnim } from './shared/utils.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const TORNADO_CONFIG = Object.assign(
  {
    c_drop: 14050,
    duration: 16500,
    fadeTime: 2500
  },
  SUDO_CUE_TIMINGS?.biertornado || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));

function createEffect(className, duration) {
  const effect = document.createElement('div');
  effect.className = className;
  document.body.appendChild(effect);
  window.setTimeout(() => effect.remove(), duration);
  return effect;
}

function triggerLightning() {
  createEffect('tornado-lightning', 260);
}

function triggerShockwave() {
  createEffect('tornado-shockwave', 800);
  window.setTimeout(() => createEffect('tornado-shockwave tornado-shockwave--wide', 950), 90);
}

function triggerCameraTransition(type, storm, vortex) {
  const duration = type === 'pull' ? 1450 : 1050;
  createEffect(`tornado-camera-transition tornado-camera-transition--${type}`, duration);
  const sceneClass = `is-camera-${type}`;

  storm.classList.add(sceneClass);
  vortex.classList.add(sceneClass);
  window.setTimeout(() => {
    storm.classList.remove(sceneClass);
    vortex.classList.remove(sceneClass);
  }, duration);
}

function triggerSwallowTransition(storm, vortex, onReveal) {
  const transition = createEffect('tornado-swallow-transition', 1800);
  storm.classList.add('is-swallowing');
  vortex.classList.add('is-swallowing');

  window.setTimeout(() => {
    storm.classList.add('is-swallowed');
    vortex.classList.remove('is-swallowing');
    vortex.classList.add('is-swallowed');
    onReveal();
    transition.classList.add('is-releasing');
    vortex.classList.remove('is-swallowed');
    vortex.classList.add('is-emerging');
  }, 820);

  window.setTimeout(() => {
    storm.classList.remove('is-swallowing', 'is-swallowed');
    vortex.classList.remove('is-emerging', 'is-swallowed');
    vortex.classList.add('is-visible');
  }, 1740);
}

function spawnSuction(amount, round) {
  const scaledAmount = isMobile ? Math.max(2, Math.round(amount * 0.25)) : amount;
  const items = ['🍺', '🍻', '🥫', '🧊', '⭐'];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.48;

  for (let index = 0; index < scaledAmount; index++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const debris = document.createElement('span');
    debris.className = `tornado-suction tornado-suction--round-${round}`;
    debris.textContent = items[Math.floor(Math.random() * items.length)];
    debris.style.left = `${x}px`;
    debris.style.top = `${y}px`;
    debris.style.setProperty('--suction-x', `${centerX - x}px`);
    debris.style.setProperty('--suction-y', `${centerY - y}px`);
    debris.style.setProperty('--suction-delay', `${Math.random() * 170}ms`);
    debris.style.setProperty('--suction-spin', `${360 + Math.random() * 900}deg`);
    debris.style.setProperty('--suction-time', `${1400 - round * 170}ms`);
    document.body.appendChild(debris);
    window.setTimeout(() => debris.remove(), 1150);
  }
}

function triggerMidsectionAction(round, storm, vortex) {
  if (round < 2) return;

  const duration = round === 4 ? 1100 : 750;
  const actionClass = `is-round-${round}`;
  vortex.classList.remove('is-round-2', 'is-round-3', 'is-round-4');
  vortex.classList.add(actionClass);
  storm.classList.add('is-squall', actionClass);
  createEffect(`tornado-round-gust tornado-round-gust--${round}`, 900);
  triggerLightning();
  spawnSuction(8 + round * 5, round);

  window.setTimeout(() => {
    vortex.classList.remove(actionClass);
    storm.classList.remove(actionClass);
    if (round < 4) storm.classList.remove('is-squall');
  }, duration);

  if (round === 3) {
    triggerCameraTransition('pull', storm, vortex);
  } else if (round === 4) {
    triggerCameraTransition('whip', storm, vortex);
    spawnCrateDrop();
  }
}

function setText(element, text, entrance, variant = '') {
  if (element.textContent.trim()) {
    const previousText = element.cloneNode(true);
    previousText.classList.add('tornado-text--outgoing');
    previousText.setAttribute('aria-hidden', 'true');
    previousText.style.animation = 'word-disperse 180ms ease-in both';
    document.body.appendChild(previousText);
    window.setTimeout(() => previousText.remove(), 200);
  }

  element.className = `tornado-text ${variant}`.trim();
  element.textContent = text;
  resetAnim(element, `${entrance} 0.55s cubic-bezier(0.16, 0.8, 0.24, 1) both`);
}

function setRoundText(element, text, cue, round) {
  const treatments = [
    { entrance: 'word-sweep-left', variant: 'text-amber' },
    { entrance: 'word-slam-down', variant: 'text-red' },
    { entrance: 'word-pull-in', variant: 'text-cream' },
    { entrance: 'word-sweep-right', variant: 'text-red text-wide' }
  ];
  const treatment = treatments[round - 1];

  setText(element, text, treatment.entrance, `round-${round} ${treatment.variant}`);
  if (cue === 'bier') {
    triggerTornadoBurst(round);
  }
}

function triggerTornadoBurst(round) {
  const vortex = document.getElementById('activeTornado');
  if (vortex) {
    vortex.classList.remove('is-hit');
    vortex.offsetHeight;
    vortex.classList.add('is-hit');
    window.setTimeout(() => vortex.classList.remove('is-hit'), 520);
  }

  if (root) {
    root.classList.remove('cam-speed-shake');
    root.offsetHeight;
    root.classList.add('cam-speed-shake');
    window.setTimeout(() => root.classList.remove('cam-speed-shake'), 500);
  }

  triggerShockwave();
  spawnDebris(14 + round * 4, round);
  spawnFoamBurst(8 + round * 3);
}

function createVortex() {
  const vortex = document.createElement('div');
  vortex.className = 'tornado-vortex';
  vortex.id = 'activeTornado';

  const funnel = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  funnel.setAttribute('viewBox', '0 0 100 100');
  funnel.setAttribute('preserveAspectRatio', 'none');
  funnel.classList.add('tornado-funnel');

  const definitions = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  definitions.innerHTML = `
    <linearGradient id="tornado-cloud" x1="0" x2="1">
      <stop offset="0" stop-color="#202a31" stop-opacity=".2" />
      <stop offset=".25" stop-color="#667071" stop-opacity=".84" />
      <stop offset=".5" stop-color="#aeb1aa" stop-opacity=".92" />
      <stop offset=".75" stop-color="#596364" stop-opacity=".82" />
      <stop offset="1" stop-color="#202a31" stop-opacity=".2" />
    </linearGradient>
  `;
  funnel.appendChild(definitions);

  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute(
    'd',
    'M8 7 C17 0 43 1 59 5 C76 9 92 17 94 24 C96 31 86 36 76 40 C65 44 62 51 56 59 C50 68 52 77 47 85 C43 92 36 96 31 100 C40 98 47 94 52 87 C59 78 59 68 66 60 C73 51 78 47 88 41 C104 31 99 18 81 10 C60 1 23 -3 8 7 Z'
  );
  body.setAttribute('fill', 'url(#tornado-cloud)');
  body.classList.add('tornado-funnel__body');
  funnel.appendChild(body);

  const cloudRim = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  cloudRim.setAttribute('cx', '49');
  cloudRim.setAttribute('cy', '15');
  cloudRim.setAttribute('rx', '41');
  cloudRim.setAttribute('ry', '10');
  cloudRim.setAttribute('transform', 'rotate(14 49 15)');
  cloudRim.classList.add('tornado-funnel__rim');
  funnel.appendChild(cloudRim);

  const cloudEye = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  cloudEye.setAttribute('cx', '49');
  cloudEye.setAttribute('cy', '15');
  cloudEye.setAttribute('rx', '34');
  cloudEye.setAttribute('ry', '5.5');
  cloudEye.setAttribute('transform', 'rotate(14 49 15)');
  cloudEye.classList.add('tornado-funnel__eye');
  funnel.appendChild(cloudEye);

  [
    'M12 25 C29 33 59 27 82 37 S62 48 43 48 S27 55 37 60 S56 65 68 71 S51 83 36 88',
    'M87 27 C71 34 46 31 27 39 S46 47 58 52 S65 63 55 69 S39 75 31 82 S38 89 44 93',
    'M20 17 C39 23 60 22 78 29'
  ].forEach((pathData, index) => {
    const swirl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    swirl.setAttribute('d', pathData);
    swirl.classList.add('tornado-funnel__swirl', `tornado-funnel__swirl--${index + 1}`);
    funnel.appendChild(swirl);
  });

  vortex.appendChild(funnel);

  [27, 41, 55, 69, 82].forEach((height, index) => {
    const orbit = document.createElement('div');
    orbit.className = 'tornado-vortex__orbit';
    orbit.style.setProperty('--orbit-height', `${height}%`);
    orbit.style.setProperty('--orbit-width', `${78 - index * 14}%`);
    orbit.style.setProperty('--orbit-duration', `${1.9 + index * 0.32}s`);
    orbit.style.setProperty('--orbit-delay', `${index * -0.55}s`);

    const mug = document.createElement('span');
    mug.className = 'tornado-mug';
    mug.textContent = index % 2 === 0 ? '🍺' : '🥫';
    orbit.appendChild(mug);
    vortex.appendChild(orbit);
  });

  const foam = document.createElement('div');
  foam.className = 'tornado-vortex__foam';
  vortex.appendChild(foam);

  for (let index = 0; index < 3; index++) {
    const splash = document.createElement('span');
    splash.className = 'tornado-vortex__splash';
    splash.style.setProperty('--splash-angle', `${index * 120}deg`);
    vortex.appendChild(splash);
  }

  document.body.appendChild(vortex);
  return vortex;
}

function spawnDebris(amount, round = 0) {
  const scaledAmount = isMobile ? Math.max(2, Math.round(amount * 0.25)) : amount;
  const items = ['🍺', '🍻', '🍺', '🍺', '🧊', '⭐'];

  for (let index = 0; index < scaledAmount; index++) {
    const debris = document.createElement('span');
    debris.className = 'tornado-debris';
    debris.textContent = items[Math.floor(Math.random() * items.length)];
    debris.style.left = `${12 + Math.random() * 76}vw`;
    debris.style.top = `${25 + Math.random() * 60}vh`;
    debris.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 70}vw`);
    debris.style.setProperty('--drift-y', `${-20 - Math.random() * 45}vh`);
    debris.style.setProperty('--spin', `${Math.random() * 500 - 250}deg`);
    debris.style.setProperty('--flight-time', `${650 + Math.random() * 550}ms`);
    debris.classList.add(`debris-round-${round || 1}`);
    document.body.appendChild(debris);
    window.setTimeout(() => debris.remove(), 1300);
  }
}

function spawnFoamBurst(amount) {
  const scaledAmount = isMobile ? Math.max(2, Math.round(amount * 0.25)) : amount;
  for (let index = 0; index < scaledAmount; index++) {
    const drop = document.createElement('span');
    drop.className = 'tornado-foam-drop';
    drop.style.left = `${38 + Math.random() * 24}vw`;
    drop.style.top = `${38 + Math.random() * 26}vh`;
    drop.style.setProperty('--foam-x', `${(Math.random() - 0.5) * 90}vw`);
    drop.style.setProperty('--foam-y', `${-25 - Math.random() * 40}vh`);
    drop.style.setProperty('--foam-size', `${5 + Math.random() * 15}px`);
    drop.style.setProperty('--foam-time', `${450 + Math.random() * 450}ms`);
    document.body.appendChild(drop);
    window.setTimeout(() => drop.remove(), 1000);
  }
}

function spawnCrateDrop() {
  for (let index = 0; index < 7; index++) {
    const crate = document.createElement('span');
    crate.className = 'tornado-crate';
    crate.textContent = index === 3 ? '🍻' : '📦';
    crate.style.left = `${8 + index * 14}vw`;
    crate.style.setProperty('--crate-delay', `${index * 75}ms`);
    document.body.appendChild(crate);
    window.setTimeout(() => crate.remove(), 1500);
  }
}

function playTornadoSynthFallback() {
  [
    ['c1_sturm', 800, 'sawtooth', 0.5, 0.2],
    ['c4_tornado', 600, 'sawtooth', 1, 0.3],
    ['c12_sternburg', 900, 'square', 0.5, 0.2]
  ].forEach(([cue, frequency, type, duration, volume]) => {
    window.setTimeout(() => {
      if (playTone) playTone(frequency, type, duration, volume);
    }, TORNADO_CONFIG[cue]);
  });
}

function initializeTornado() {
  const audioElement = document.getElementById('audioTornado');

  startSudoTimeline(
    audioElement,
    () => {
      if (appendLine) {
        appendLine(
          "<span class='text-yellow-400 font-extrabold'>[WETTERDIENST] STURMTIEF RICARDO NÄHERT SICH!</span>"
        );
      }

      const storm = document.createElement('div');
      storm.className = 'tornado-storm';
      document.body.appendChild(storm);

      const mainText = document.createElement('div');
      mainText.className = 'tornado-text';
      document.body.appendChild(mainText);

      const vortex = createVortex();
      const camouflage = document.createElement('div');
      camouflage.className = 'sternburg-camo';
      document.body.appendChild(camouflage);

      const triggerWord = (text, cueTime, entrance, variant = '') => {
        window.setTimeout(() => setText(mainText, text, entrance, variant), cueTime);
      };
      const showRoundText = (text, cue, round) => {
        if (cue === 'gib') triggerMidsectionAction(round, storm, vortex);
        setRoundText(mainText, text, cue, round);
      };

      window.setTimeout(() => {
        storm.classList.add('is-active');
        setText(mainText, 'STURM-', 'word-sweep-right', 'text-cream');
      }, TORNADO_CONFIG.c1_sturm);

      window.setTimeout(() => {
        triggerLightning();
        setText(mainText, 'TIEF RICARDO', 'word-slam-down', 'text-amber');
        storm.classList.add('is-squall');
      }, TORNADO_CONFIG.c2_ricardo);

      window.setTimeout(() => {
        setText(mainText, 'BIER-', 'word-pull-in', 'text-cream');
        vortex.classList.add('is-forming');
      }, TORNADO_CONFIG.c3_bier);

      window.setTimeout(() => {
        triggerLightning();
        vortex.classList.add('is-visible');
        setText(mainText, 'TORNADO!', 'word-slam-down', 'text-red text-huge');
        triggerTornadoBurst(2);
        triggerCameraTransition('pull', storm, vortex);
        if (root) {
          root.classList.add('cam-speed-shake');
          window.setTimeout(() => root.classList.remove('cam-speed-shake'), 650);
        }
      }, TORNADO_CONFIG.c4_tornado);

      window.setTimeout(() => showRoundText('GIB', 'gib', 1), TORNADO_CONFIG.c5_gib1);
      window.setTimeout(() => showRoundText('MAL', 'mal', 1), TORNADO_CONFIG.c6_mal1);
      window.setTimeout(() => showRoundText('BIER!', 'bier', 1), TORNADO_CONFIG.c7_bier1);

      window.setTimeout(() => {
        vortex.classList.add('is-charged');
        showRoundText('GIB', 'gib', 2);
      }, TORNADO_CONFIG.c8_gib2);
      window.setTimeout(() => showRoundText('MAL', 'mal', 2), TORNADO_CONFIG.c9_mal2);
      window.setTimeout(() => showRoundText('BIER!', 'bier', 2), TORNADO_CONFIG.c10_bier2);

      window.setTimeout(() => {
        storm.classList.remove('is-squall');
        setText(mainText, 'NÄCHSTE\nLADUNG!', 'word-slam-down', 'text-amber text-stacked');
        spawnCrateDrop();
        triggerShockwave();
        triggerSwallowTransition(storm, vortex, () => {
          storm.classList.add('is-new-scene');
          vortex.classList.remove('is-forming', 'is-visible', 'is-charged', 'is-surging');
        });
      }, TORNADO_CONFIG.c11_ladung);

      window.setTimeout(() => {
        camouflage.classList.add('is-active');
        vortex.classList.add('is-camouflage');
        setText(mainText, 'STERNBURG', 'word-sweep-left', 'text-red text-wide');
      }, TORNADO_CONFIG.c12_sternburg);

      triggerWord('-ANZUG!', TORNADO_CONFIG.c13_anzug, 'word-sweep-right', 'text-red text-wide');

      window.setTimeout(() => {
        camouflage.classList.add('is-inverted');
        setText(mainText, 'MEINE', 'word-pull-in', 'text-cream');
      }, TORNADO_CONFIG.c14_meine);

      window.setTimeout(() => {
        camouflage.classList.remove('is-inverted');
        camouflage.classList.add('is-burst');
        setText(mainText, 'TARNUNG!', 'word-glitch-hit', 'text-amber text-huge');
        spawnDebris(9, 3);
      }, TORNADO_CONFIG.c15_tarnung);

      window.setTimeout(() => {
        vortex.classList.remove('is-camouflage');
        vortex.classList.add('is-surging');
        showRoundText('GIB', 'gib', 3);
      }, TORNADO_CONFIG.c16_gib3);
      window.setTimeout(() => showRoundText('MAL', 'mal', 3), TORNADO_CONFIG.c17_mal3);
      window.setTimeout(() => showRoundText('BIER!', 'bier', 3), TORNADO_CONFIG.c18_bier3);

      window.setTimeout(() => showRoundText('GIB', 'gib', 4), TORNADO_CONFIG.c19_gib4);
      window.setTimeout(() => showRoundText('MAL', 'mal', 4), TORNADO_CONFIG.c20_mal4);
      window.setTimeout(() => showRoundText('BIER!', 'bier', 4), TORNADO_CONFIG.c21_bier4);

      const alert = document.createElement('div');
      alert.className = 'tornado-alert';
      document.body.appendChild(alert);

      window.setTimeout(() => {
        alert.classList.add('is-active');
        setText(mainText, 'LETZTE\nWARNUNG!', 'word-slam-down', 'text-cream text-stacked');
        if (playTone) playTone(120, 'sawtooth', 0.8, 0.4);
      }, TORNADO_CONFIG.c22_warnung);

      window.setTimeout(
        () => {
          mainText.classList.add('is-hidden');
          storm.classList.add('is-finale');
          vortex.classList.add('is-finale');
          alert.classList.remove('is-active');
          triggerCameraTransition('pull', storm, vortex);
          triggerLightning();
          triggerShockwave();
          spawnDebris(24, 4);
          if (appendLine) {
            appendLine(
              "<span class='text-yellow-400 font-extrabold text-sm'>🌪️ [ESKALATION] TORNADO KATEGORIE 5. RETTE SICH WER KANN!</span>"
            );
          }

          const fadeDelay = Math.max(
            0,
            TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop - TORNADO_CONFIG.fadeTime
          );
          window.setTimeout(() => fadeOutAudio(audioElement, TORNADO_CONFIG.fadeTime), fadeDelay);

          window.setTimeout(
            () => {
              window.parent.postMessage('sudo_finished', '*');
            },
            Math.max(0, TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop)
          );
        },
        Math.max(TORNADO_CONFIG.c_drop, TORNADO_CONFIG.c22_warnung + 500)
      );
    },
    'Biertornado',
    playTornadoSynthFallback
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTornado, { once: true });
} else {
  initializeTornado();
}
