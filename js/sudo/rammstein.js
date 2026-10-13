import { buildRammsteinLogo, buildRammsteinStage } from './rammstein-stage.js';
import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';
import { fadeOutAudio, resetAnimation as resetAnim } from './shared/utils.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const RAMM_CONFIG = Object.assign(
  { intro: 100, duration: 31000, fadeTime: 3000 },
  SUDO_CUE_TIMINGS?.rammstein || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));
const activeEmbers = new Set();

function createStage() {
  const stage = document.createElement('div');
  stage.className = 'ramm-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = buildRammsteinStage();
  document.body.appendChild(stage);
  return stage;
}

function spawnEmbers(amount, dust = false) {
  const scaledAmount = isMobile ? Math.max(1, Math.round(amount * 0.45)) : amount;
  for (let i = 0; i < scaledAmount; i++) {
    if (activeEmbers.size >= (isMobile ? 36 : 100)) break;

    const ember = document.createElement('div');
    ember.className = 'ramm-ember';
    ember.style.left = `${Math.random() * 100}vw`;

    const drift = (Math.random() - 0.5) * 40;
    ember.style.setProperty('--drift', `${drift}vw`);

    const size = dust ? 1.5 + Math.random() * 3.5 : 3 + Math.random() * 7;
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;
    if (dust) ember.style.opacity = String(0.4 + Math.random() * 0.5);

    const duration = dust ? 2.5 + Math.random() * 3 : 1 + Math.random() * 2.5;
    ember.style.animation = `emberFloat ${duration}s ease-in forwards`;
    document.body.appendChild(ember);
    activeEmbers.add(ember);
    setTimeout(() => {
      activeEmbers.delete(ember);
      ember.remove();
    }, duration * 1000);
  }
}

function firePillars(count = 3) {
  const positions =
    count === 2
      ? [28, 72]
      : Array.from({ length: count }, (_, index) => 7 + (86 / (count - 1)) * index);
  for (let i = 0; i < count; i++) {
    const pillar = document.createElement('div');
    pillar.className = 'ramm-flame-pillar';
    pillar.style.left = `${positions[i]}%`;
    pillar.style.setProperty('--jet-delay', `${i * 38}ms`);
    pillar.style.setProperty('--jet-angle', `${(Math.random() - 0.5) * 10}deg`);
    pillar.style.animation = `fireBlast ${1.2 + Math.random() * 0.3}s cubic-bezier(.2,.7,.25,1) var(--jet-delay) forwards`;
    document.body.appendChild(pillar);
    setTimeout(() => pillar.remove(), 1800);
  }

  spawnEmbers(Math.min(16, 4 + count));
}

const IMPACT_LEVELS = {
  1: {
    strobe: 0.2,
    redFlash: 0.12,
    waveScale: 2.2,
    waveOpacity: 0.5,
    secondaryWave: 0,
    jetRise: 1.05,
    jetSustain: 0.65,
    quake: 'translate3d(-2px, 2px, 0) rotate(-0.15deg)',
    quakeDuration: '150ms',
    quakeIterations: '2',
    quakeLifetime: 300
  },
  2: {
    strobe: 0.36,
    redFlash: 0.2,
    waveScale: 2.8,
    waveOpacity: 0.68,
    secondaryWave: 0.22,
    jetRise: 1.45,
    jetSustain: 0.95,
    quake: 'translate3d(-4px, 3px, 0) rotate(-0.35deg)',
    quakeDuration: '125ms',
    quakeIterations: '4',
    quakeLifetime: 520
  },
  3: {
    strobe: 0.58,
    redFlash: 0.32,
    waveScale: 3.5,
    waveOpacity: 0.82,
    secondaryWave: 0.48,
    jetRise: 1.9,
    jetSustain: 1.35,
    quake: 'translate3d(-7px, 5px, 0) rotate(-0.7deg)',
    quakeDuration: '105ms',
    quakeIterations: '6',
    quakeLifetime: 650
  },
  4: {
    strobe: 0.76,
    redFlash: 0.44,
    waveScale: 4.2,
    waveOpacity: 0.95,
    secondaryWave: 0.72,
    tertiaryWave: 0.42,
    jetRise: 2.35,
    jetSustain: 1.8,
    quake: 'translate3d(-10px, 8px, 0) rotate(-1deg)',
    quakeDuration: '90ms',
    quakeIterations: '8',
    quakeLifetime: 800
  }
};

function triggerShockwave(level) {
  const impact = IMPACT_LEVELS[level];
  const strobe = document.createElement('div');
  strobe.className = 'ramm-strobe';
  strobe.style.setProperty('--impact-opacity', impact.strobe);
  strobe.style.animation = 'strobeFlash 0.3s ease-out forwards';
  document.body.appendChild(strobe);
  setTimeout(() => strobe.remove(), 300);

  const redFlash = document.createElement('div');
  redFlash.className = 'ramm-red-flash';
  redFlash.style.setProperty('--impact-opacity', impact.redFlash);
  redFlash.style.animation = 'redFlash 0.8s ease-out forwards';
  document.body.appendChild(redFlash);
  setTimeout(() => redFlash.remove(), 800);

  const shockwave = document.createElement('div');
  shockwave.className = 'ramm-shockwave';
  shockwave.style.setProperty('--impact-scale', impact.waveScale);
  shockwave.style.setProperty('--impact-opacity', impact.waveOpacity);
  document.body.appendChild(shockwave);
  setTimeout(() => shockwave.remove(), 900);

  if (impact.secondaryWave > 0) {
    const secondaryShockwave = document.createElement('div');
    secondaryShockwave.className = 'ramm-shockwave ramm-shockwave--secondary';
    secondaryShockwave.style.setProperty('--impact-opacity', impact.secondaryWave);
    secondaryShockwave.style.setProperty('--impact-scale', impact.waveScale + 0.35);
    document.body.appendChild(secondaryShockwave);
    setTimeout(() => secondaryShockwave.remove(), 1200);
  }

  if (impact.tertiaryWave > 0) {
    const tertiaryShockwave = document.createElement('div');
    tertiaryShockwave.className = 'ramm-shockwave ramm-shockwave--tertiary';
    tertiaryShockwave.style.setProperty('--impact-opacity', impact.tertiaryWave);
    tertiaryShockwave.style.setProperty('--impact-scale', impact.waveScale + 0.7);
    document.body.appendChild(tertiaryShockwave);
    setTimeout(() => tertiaryShockwave.remove(), 1450);
  }

  if (root) {
    root.style.setProperty('--ramm-quake-25', impact.quake);
    root.style.setProperty(
      '--ramm-quake-50',
      'translate3d(0, 0, 0) rotate(0deg)'
    );
    root.style.setProperty(
      '--ramm-quake-75',
      'translate3d(0, 0, 0) rotate(0deg)'
    );
    root.style.setProperty('--ramm-quake-duration', impact.quakeDuration);
    root.style.setProperty('--ramm-quake-iterations', impact.quakeIterations);
    root.classList.add('ramm-quake');
    setTimeout(() => {
      root.classList.remove('ramm-quake');
      root.style.removeProperty('--ramm-quake-25');
      root.style.removeProperty('--ramm-quake-50');
      root.style.removeProperty('--ramm-quake-75');
      root.style.removeProperty('--ramm-quake-duration');
      root.style.removeProperty('--ramm-quake-iterations');
    }, impact.quakeLifetime);
  }

  if (playTone) playTone(40, 'sawtooth', 0.8, 0.3);
}

let afterglowTimer = null;
let sunbeamTimer = null;

function showImpact(stage, textElement, text, level) {
  const impact = IMPACT_LEVELS[level];
  stage.classList.remove('ramm-stage--charge');
  stage.style.removeProperty('--charge-duration');
  stage.style.removeProperty('--charge-intensity');
  // Sonnen-Glühen und Bewegung klingen nach der Zahl langsam aus statt abrupt zu enden
  clearTimeout(afterglowTimer);
  afterglowTimer = setTimeout(
    () =>
      stage.classList.remove(
        'ramm-stage--sunrise',
        'ramm-stage--sunbeams',
        'ramm-stage--crowd-wave'
      ),
    2400
  );
  stage.style.setProperty('--impact-jet-rise', impact.jetRise);
  stage.style.setProperty('--impact-jet-sustain', impact.jetSustain);
  stage.classList.add('ramm-stage--impact');
  spawnEmbers(2 + level * 3);
  setTimeout(() => {
    stage.classList.remove('ramm-stage--impact');
    stage.style.removeProperty('--impact-jet-rise');
    stage.style.removeProperty('--impact-jet-sustain');
  }, isMobile ? 850 : 750);

  textElement.className = 'ramm-text';
  textElement.textContent = text;
  resetAnim(textElement, 'rammStomp 1.3s cubic-bezier(0.16, 0.8, 0.24, 1) forwards');
  triggerShockwave(level);
}

function showSunrise(stage, sunOrb, textElement, text, duration = 2.5) {
  clearTimeout(afterglowTimer);
  clearTimeout(sunbeamTimer);
  stage.classList.remove('ramm-stage--impact', 'ramm-stage--charge');
  stage.style.removeProperty('--charge-duration');
  stage.style.removeProperty('--charge-intensity');
  stage.classList.add('ramm-stage--sunrise');
  stage.classList.remove('ramm-stage--crowd-wave');
  if (text.includes('HIER KOMMT')) {
    stage.classList.add('ramm-stage--sunbeams');
    requestAnimationFrame(() => stage.classList.add('ramm-stage--crowd-wave'));
    sunbeamTimer = setTimeout(() => {
      stage.classList.remove('ramm-stage--sunbeams', 'ramm-stage--crowd-wave');
    }, duration * 1000);
  } else {
    stage.classList.remove('ramm-stage--sunbeams');
  }
  resetAnim(sunOrb, `sunPulse ${duration}s cubic-bezier(0.16, 0.72, 0.24, 1) forwards`);

  textElement.className = 'ramm-sonne-text';
  textElement.innerHTML = text;
  textElement.style.color = '';
  textElement.style.textShadow = '';
  resetAnim(textElement, `sonneRise ${duration}s cubic-bezier(0.16, 0.72, 0.24, 1) forwards`);
}

// Abwechslung innerhalb der langen Abschnitte (Farbstimmung, Kamera-Punch, Stroboskop)
function tint(color, ms = 1600) {
  const el = document.createElement('div');
  el.className = 'ramm-tint';
  el.style.setProperty('--tint', color);
  el.style.setProperty('--tint-ms', `${ms}ms`);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms + 100);
}

function cameraPunch(stage) {
  resetAnim(stage, 'rammPunch 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)');
}

function chargeUp(stage, level) {
  const duration = 980 - level * 150;
  stage.style.setProperty('--charge-duration', `${duration}ms`);
  stage.style.setProperty('--charge-intensity', String(0.45 + level * 0.12));
  stage.classList.add('ramm-stage--charge');
}

function strobeBurst(times = 3, gap = 140) {
  for (let i = 0; i < times; i++) {
    setTimeout(() => {
      const strobe = document.createElement('div');
      strobe.className = 'ramm-strobe';
      strobe.style.animation = 'strobeFlash 0.2s ease-out forwards';
      document.body.appendChild(strobe);
      setTimeout(() => strobe.remove(), 220);
    }, i * gap);
  }
}

// Plant Aktionen relativ zu einem Cue-Zeitpunkt
function schedule(base, steps) {
  steps.forEach(([offset, action]) => setTimeout(action, base + offset));
}

function createOutro(duration) {
  const outro = document.createElement('div');
  outro.className = 'ramm-outro';
  outro.style.setProperty('--outro', `${duration}ms`);
  outro.innerHTML = `
    <div class="ramm-outro__glow"></div>
    ${buildRammsteinLogo()}
    <div class="ramm-outro__black"></div>
  `;
  document.body.appendChild(outro);
  return outro;
}

function initializeRammstein() {
  const audioElement = document.getElementById('audioRammstein');

  startSudoTimeline(
    audioElement,
    () => {
      if (appendLine) {
        appendLine(
          "<span class='text-red-500 font-extrabold text-sm'>[SUDO] STADION-MODUS AKTIV. PYROTECHNIK ENTRIEGELT.</span>"
        );
      }

      const darkness = document.createElement('div');
      darkness.className = 'ramm-darkness';
      document.body.appendChild(darkness);

      const stage = createStage();
      stage.classList.add('ramm-stage--intro');

      // Intro: viele Partikel steigen von unten auf, danach taucht die Bühne dunkel auf
      const introEnd = Math.max(RAMM_CONFIG.eins - 400, 3000);
      const dustInterval = setInterval(
        () => spawnEmbers(isMobile ? 4 : 3, true),
        isMobile ? 220 : 140
      );
      const emberInterval = setInterval(() => spawnEmbers(1), isMobile ? 1200 : 650);
      setTimeout(() => clearInterval(dustInterval), introEnd);
      setTimeout(() => stage.classList.add('ramm-stage--emerge'), 1600);
      setTimeout(() => {
        stage.classList.remove('ramm-stage--intro', 'ramm-stage--emerge');
        stage.classList.add('ramm-stage--lit');
      }, Math.max(introEnd - 2200, 2600));

      setTimeout(() => {
        darkness.style.opacity = '1';
        stage.style.opacity = '1';
        if (appendLine) {
          appendLine(
            "<span class='text-neutral-500 font-mono'>System: Licht aus. Traversen hochgefahren.</span>"
          );
        }
      }, RAMM_CONFIG.intro);

      const mainText = document.createElement('div');
      mainText.className = 'ramm-text';
      document.body.appendChild(mainText);

      [RAMM_CONFIG.eins, RAMM_CONFIG.zwei, RAMM_CONFIG.drei, RAMM_CONFIG.vier].forEach(
        (cue, index) => {
          const level = index + 1;
          setTimeout(() => chargeUp(stage, level), Math.max(0, cue - (980 - level * 150)));
        }
      );

      // Zwischenaktionen: Flammenwerfer sitzen auf den Wortakzenten, dazwischen Farbwechsel/Laser/Strobo
      const GOLD = 'rgba(255, 150, 20, 0.34)';
      const DEEP = 'rgba(190, 0, 20, 0.38)';
      const ICE = 'rgba(120, 170, 255, 0.28)';
      schedule(RAMM_CONFIG.sonne1, [
        [1500, () => tint(GOLD, 2200)],
        [3000, () => { cameraPunch(stage); firePillars(2); }]
      ]);
      schedule(RAMM_CONFIG.sonne2, [
        [2000, () => tint(DEEP, 2000)],
        [3200, () => { cameraPunch(stage); firePillars(3); }]
      ]);
      schedule(RAMM_CONFIG.drei, [[0, () => tint(DEEP, 900)]]);
      schedule(RAMM_CONFIG.stern, [
        [700, () => tint(ICE, 2000)],
        [3200, () => tint(GOLD, 2000)],
        [4200, () => { strobeBurst(4, 110); firePillars(3); }]
      ]);

      const sunOrb = document.createElement('div');
      sunOrb.className = 'ramm-sun-orb';
      document.body.appendChild(sunOrb);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(2);
        showImpact(stage, mainText, 'EINS', 1);
        if (appendLine) appendLine("<span class='text-red-500 font-bold'>[1] IGNITION.</span>");
      }, RAMM_CONFIG.eins);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'HIER KOMMT DIE<br>SONNE', 2.8);
        if (playTone) playTone(60, 'sine', 2, 0.2);
      }, RAMM_CONFIG.sonne1);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(3);
        showImpact(stage, mainText, 'ZWEI', 2);
        if (appendLine)
          appendLine("<span class='text-red-500 font-bold'>[2] TEMPERATURE RISING.</span>");
      }, RAMM_CONFIG.zwei);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'HIER KOMMT DIE<br>SONNE', 2.8);
      }, RAMM_CONFIG.sonne2);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(3);
        showImpact(stage, mainText, 'DREI', 3);
        if (appendLine)
          appendLine("<span class='text-orange-500 font-bold'>[3] CRITICAL HEAT WARNING.</span>");
      }, RAMM_CONFIG.drei);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'SIE IST DER<br>HELLSTE STERN!', 4);
      }, RAMM_CONFIG.stern);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(4);
        spawnEmbers(16);
        stage.classList.add('ramm-stage--finale');
        showImpact(stage, mainText, 'VIER', 4);

        for (let i = 0; i < 4; i++) {
          const laser = document.createElement('div');
          laser.className = 'ramm-laser';
          laser.style.left = `${20 + i * 20}vw`;
          laser.style.animation = `laserSweep ${1.5 + Math.random()}s infinite alternate ease-in-out`;
          document.body.appendChild(laser);
        }

        if (appendLine) {
          appendLine(
            "<span class='text-yellow-400 font-extrabold bg-red-900 px-2'>[4] TOTAL INFERNO!!!</span>"
          );
        }
      }, RAMM_CONFIG.vier);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'HIER KOMMT DIE<br>SONNE', 3);

        if (root) root.classList.add('ramm-quake');

        // Outro: Bildschirm glüht langsam rot, das Logo erscheint, dann Schwarz
        const outroTime = RAMM_CONFIG.duration - RAMM_CONFIG.sonne3 + 1200;
        const outro = createOutro(outroTime);

        setTimeout(
          () => fadeOutAudio(audioElement, RAMM_CONFIG.fadeTime),
          RAMM_CONFIG.duration - RAMM_CONFIG.sonne3 - RAMM_CONFIG.fadeTime
        );

        setTimeout(() => {
          clearInterval(emberInterval);
          if (root) root.classList.remove('ramm-quake');
          stage.remove();
          darkness.remove();
          mainText.remove();
          sunOrb.remove();
          outro.remove();
          window.parent.postMessage('sudo_finished', '*');
        }, outroTime);
      }, RAMM_CONFIG.sonne3);
    },
    'Rammstein'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRammstein, { once: true });
} else {
  initializeRammstein();
}
