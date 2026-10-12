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

function createStage() {
  const stage = document.createElement('div');
  stage.className = 'ramm-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = buildRammsteinStage();
  document.body.appendChild(stage);
  return stage;
}

function spawnEmbers(amount, dust = false) {
  for (let i = 0; i < amount; i++) {
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
    setTimeout(() => ember.remove(), duration * 1000);
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

function triggerShockwave(soft = false) {
  if (!soft) {
    const strobe = document.createElement('div');
    strobe.className = 'ramm-strobe';
    strobe.style.animation = 'strobeFlash 0.3s ease-out forwards';
    document.body.appendChild(strobe);
    setTimeout(() => strobe.remove(), 300);
  }

  const redFlash = document.createElement('div');
  redFlash.className = 'ramm-red-flash';
  redFlash.style.animation = 'redFlash 0.8s ease-out forwards';
  document.body.appendChild(redFlash);
  setTimeout(() => redFlash.remove(), 800);

  const shockwave = document.createElement('div');
  shockwave.className = 'ramm-shockwave';
  document.body.appendChild(shockwave);
  setTimeout(() => shockwave.remove(), 900);

  if (root && !soft) {
    root.classList.add('ramm-quake');
    setTimeout(() => root.classList.remove('ramm-quake'), 800);
  }

  if (playTone) playTone(40, 'sawtooth', 0.8, 0.3);
}

let afterglowTimer = null;

function showImpact(stage, textElement, text, soft = false) {
  // Sonnen-Glühen und Bewegung klingen nach der Zahl langsam aus statt abrupt zu enden
  clearTimeout(afterglowTimer);
  afterglowTimer = setTimeout(() => stage.classList.remove('ramm-stage--sunrise'), 2400);
  stage.classList.add('ramm-stage--impact');
  setTimeout(() => stage.classList.remove('ramm-stage--impact'), 500);

  textElement.className = 'ramm-text';
  textElement.textContent = text;
  resetAnim(textElement, 'rammStomp 1.3s cubic-bezier(0.16, 0.8, 0.24, 1) forwards');
  triggerShockwave(soft);
}

function showSunrise(stage, sunOrb, textElement, text, duration = 2.5) {
  clearTimeout(afterglowTimer);  stage.classList.remove('ramm-stage--impact');
  stage.classList.add('ramm-stage--sunrise');
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
      const dustInterval = setInterval(() => spawnEmbers(3, true), 140);
      const emberInterval = setInterval(() => spawnEmbers(1), 650);
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
        showImpact(stage, mainText, 'ZWEI', true);
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
        firePillars(2);
        spawnEmbers(16);
        stage.classList.add('ramm-stage--finale');
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
