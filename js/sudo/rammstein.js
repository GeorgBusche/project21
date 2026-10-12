import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const RAMM_CONFIG = Object.assign(
  { intro: 100, duration: 31000, fadeTime: 3000 },
  SUDO_CUE_TIMINGS?.rammstein || {}
);

function fadeOutAudioRamm(audio, fadeDuration) {
  if (!audio || audio.paused) return;

  const steps = 20;
  const intervalTime = fadeDuration / steps;
  const volumeStep = audio.volume / steps;
  const fadeInterval = setInterval(() => {
    if (audio.volume > volumeStep) {
      audio.volume -= volumeStep;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fadeInterval);
    }
  }, intervalTime);
}

function resetAnim(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}

function spawnEmbers(amount) {
  for (let i = 0; i < amount; i++) {
    const ember = document.createElement('div');
    ember.className = 'ramm-ember';
    ember.style.left = `${Math.random() * 100}vw`;

    const drift = (Math.random() - 0.5) * 40;
    ember.style.setProperty('--drift', `${drift}vw`);

    const size = 3 + Math.random() * 7;
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;

    const duration = 1 + Math.random() * 2.5;
    ember.style.animation = `emberFloat ${duration}s ease-in forwards`;
    document.body.appendChild(ember);
    setTimeout(() => ember.remove(), duration * 1000);
  }
}

function firePillars(count = 3) {
  for (let i = 0; i < count; i++) {
    const pillar = document.createElement('div');
    pillar.className = 'ramm-flame-pillar';
    pillar.style.left = `${(100 / (count + 1)) * (i + 1) - 7.5}vw`;
    pillar.style.animation = `fireBlast ${1.2 + Math.random() * 0.3}s ease-out forwards`;
    document.body.appendChild(pillar);
    setTimeout(() => pillar.remove(), 1500);
  }

  spawnEmbers(30);
}

function triggerShockwave() {
  const strobe = document.createElement('div');
  strobe.className = 'ramm-strobe';
  strobe.style.animation = 'strobeFlash 0.3s ease-out forwards';
  document.body.appendChild(strobe);
  setTimeout(() => strobe.remove(), 300);

  const redFlash = document.createElement('div');
  redFlash.className = 'ramm-red-flash';
  redFlash.style.animation = 'redFlash 0.8s ease-out forwards';
  document.body.appendChild(redFlash);
  setTimeout(() => redFlash.remove(), 800);

  const shockwave = document.createElement('div');
  shockwave.className = 'ramm-shockwave';
  document.body.appendChild(shockwave);
  setTimeout(() => shockwave.remove(), 900);

  if (root) {
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 800);
  }

  if (playTone) playTone(40, 'sawtooth', 0.8, 0.3);
}

function showImpact(stage, textElement, text) {
  stage.classList.remove('ramm-stage--sunrise');
  stage.classList.add('ramm-stage--impact');
  setTimeout(() => stage.classList.remove('ramm-stage--impact'), 500);

  textElement.className = 'ramm-text';
  textElement.textContent = text;
  resetAnim(textElement, 'rammStomp 1.3s cubic-bezier(0.16, 0.8, 0.24, 1) forwards');
  triggerShockwave();
}

function showSunrise(stage, sunOrb, textElement, text, duration = 2.5) {
  stage.classList.remove('ramm-stage--impact');
  stage.classList.add('ramm-stage--sunrise');
  resetAnim(sunOrb, `sunPulse ${duration}s cubic-bezier(0.16, 0.72, 0.24, 1) forwards`);

  textElement.className = 'ramm-sonne-text';
  textElement.innerHTML = text;
  textElement.style.color = '';
  textElement.style.textShadow = '';
  resetAnim(textElement, `sonneRise ${duration}s cubic-bezier(0.16, 0.72, 0.24, 1) forwards`);
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

      const stage = document.createElement('div');
      stage.className = 'ramm-stage';
      document.body.appendChild(stage);

      const emberInterval = setInterval(() => spawnEmbers(2), 200);
      stage.classList.add('ramm-stage--lit');

      setTimeout(() => {
        darkness.style.opacity = '1';
        stage.style.opacity = '0.7';
        if (appendLine) {
          appendLine(
            "<span class='text-neutral-500 font-mono'>System: Licht aus. Traversen hochgefahren.</span>"
          );
        }
      }, RAMM_CONFIG.intro);

      const mainText = document.createElement('div');
      mainText.className = 'ramm-text';
      document.body.appendChild(mainText);

      const sunOrb = document.createElement('div');
      sunOrb.className = 'ramm-sun-orb';
      document.body.appendChild(sunOrb);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(2);
        showImpact(stage, mainText, 'EINS');
        if (appendLine) appendLine("<span class='text-red-500 font-bold'>[1] IGNITION.</span>");
      }, RAMM_CONFIG.eins);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'HIER KOMMT DIE<br>SONNE', 2.8);
        if (playTone) playTone(60, 'sine', 2, 0.2);
      }, RAMM_CONFIG.sonne1);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(2);
        showImpact(stage, mainText, 'ZWEI');
        if (appendLine)
          appendLine("<span class='text-red-500 font-bold'>[2] TEMPERATURE RISING.</span>");
      }, RAMM_CONFIG.zwei);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'HIER KOMMT DIE<br>SONNE', 2.8);
      }, RAMM_CONFIG.sonne2);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(4);
        showImpact(stage, mainText, 'DREI');
        if (appendLine)
          appendLine("<span class='text-orange-500 font-bold'>[3] CRITICAL HEAT WARNING.</span>");
      }, RAMM_CONFIG.drei);

      setTimeout(() => {
        showSunrise(stage, sunOrb, mainText, 'SIE IST DER<br>HELLSTE STERN!', 4);
      }, RAMM_CONFIG.stern);

      setTimeout(() => {
        sunOrb.style.animation = 'none';
        sunOrb.style.opacity = '0';
        firePillars(7);
        spawnEmbers(100);
        showImpact(stage, mainText, 'VIER');

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
        resetAnim(sunOrb, 'sunGodMode 3s cubic-bezier(0.16, 0.72, 0.24, 1) forwards');
        mainText.style.color = 'black';
        mainText.style.textShadow = '0 0 20px white';

        if (root) root.classList.add('ramm-quake');

        setTimeout(
          () => fadeOutAudioRamm(audioElement, RAMM_CONFIG.fadeTime),
          RAMM_CONFIG.duration - RAMM_CONFIG.sonne3 - RAMM_CONFIG.fadeTime
        );

        setTimeout(() => {
          clearInterval(emberInterval);
          if (root) root.classList.remove('ramm-quake');
          window.parent.postMessage('sudo_finished', '*');
        }, RAMM_CONFIG.duration - RAMM_CONFIG.sonne3);
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
