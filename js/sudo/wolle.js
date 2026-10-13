import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';
import { fadeOutAudio, resetAnimation } from './shared/utils.js';
import { OUTRO_MS, startLogoOutro } from './shared/logo-outro.js';
import wolleLogo from '../../assets/sudo/wolle/logo.png';
import stadiumCrowdSource from '../../assets/sudo/wolle/stadium-crowd-row.svg?raw';
import wollePersonLeftSource from '../../assets/sudo/wolle/wolle-person-left.svg?raw';
import { createWolleBackScene } from './wolle-back-scene.js';
import wollePersonRightSource from '../../assets/sudo/wolle/wolle-person-right.svg?raw';

const discofoxImageUrl = new URL('../../assets/sudo/wolle/discofox-couple.svg', import.meta.url)
  .href;
const petryLogoUrl = new URL('../../assets/sudo/wolle/petry-logo.svg', import.meta.url).href;
const SVG_NS = 'http://www.w3.org/2000/svg';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;

const WOLLE_CONFIG = Object.assign(
  { duration: 16000, fadeTime: 2500 },
  SUDO_CUE_TIMINGS?.wolle || {}
);

const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));

function showCue(
  element,
  text,
  color,
  mode,
  animation = 'stageReveal 0.55s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
) {
  element.className = `wolle-karaoke ${mode}`;
  element.style.color = color;
  element.innerHTML = text;
  resetAnimation(element, animation);
}

function spawnFallingItems(icons, count, duration, className) {
  const scaledCount = isMobile ? Math.max(1, Math.round(count * 0.25)) : count;
  for (let i = 0; i < scaledCount; i++) {
    const item = document.createElement('div');
    const itemDuration = duration + Math.random() * 1.4;
    item.className = className;
    item.textContent = icons[Math.floor(Math.random() * icons.length)];
    item.style.left = `${Math.random() * 100}vw`;
    item.style.animationDuration = `${itemDuration}s`;
    item.style.animationDelay = `${Math.random() * 0.35}s`;
    if (className === 'wolle-confetti') {
      item.style.setProperty('--wolle-drift', `${(Math.random() - 0.5) * 28}vw`);
    }
    document.body.appendChild(item);
    setTimeout(() => item.remove(), (itemDuration + 0.5) * 1000);
  }
}

function triggerCameraFlash() {
  const flash = document.createElement('div');
  flash.className = 'wolle-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

function createPetryDiscofoxGraphic() {
  const graphic = document.createElement('div');
  graphic.className = 'wolle-discofox';
  graphic.innerHTML = `
    <div class="wolle-discofox__caption">WOLLE PETRY <span>·</span> DISCOFOX</div>
    <div class="fox-dancefloor" aria-hidden="true">
      <svg class="fox-choreography" viewBox="0 0 520 420">
        <ellipse class="fox-floor-glow" cx="260" cy="370" rx="205" ry="22" />
        <path class="fox-dance-orbit" d="M64 321 C92 115 423 74 458 270 C479 388 120 407 76 291" />
        <path class="fox-turn-arrow" d="M98 206 C133 115 245 77 331 98" />
      </svg>
      <img class="fox-couple" src="${discofoxImageUrl}" alt="" />
      <div class="fox-steps"><span>1</span><span>2</span><span>3</span></div>
    </div>
  `;
  document.body.appendChild(graphic);
  return graphic;
}

function createWolleEncoreVisual() {
  const visual = document.createElement('div');
  visual.className = 'wolle-encore';
  visual.setAttribute('aria-hidden', 'true');
  visual.innerHTML = `
    <div class="wolle-encore__tour-sign">
      <span>LOHHOF 21</span>
      <b>STADION-NACHT</b>
      <span>WOLLE LIVE</span>
    </div>
    <div class="wolle-encore__heart">
      <svg viewBox="0 0 100 90">
        <path d="M50 82 12 47C-5 28 8 5 27 5c12 0 19 7 23 16C54 12 62 5 74 5c19 0 31 23 14 42z" />
      </svg>
    </div>
    <div class="wolle-encore__back"></div>
    <div class="wolle-encore__duo">
      <div class="wolle-encore__duo-figure wolle-encore__duo-figure--left"></div>
      <div class="wolle-encore__duo-figure wolle-encore__duo-figure--right"></div>
    </div>
    <div class="wolle-encore__crowd"></div>
  `;
  document.body.appendChild(visual);

  const createSvgLayer = (
    container,
    className,
    source,
    fill,
    preserveAspectRatio = 'xMidYMax meet'
  ) => {
    const sourceDocument = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (sourceDocument.querySelector('parsererror')) {
      throw new Error(`Die SVG-Ebene "${className}" konnte nicht gelesen werden.`);
    }

    const sourceSvg = sourceDocument.documentElement;
    const sourceGroup = [...sourceSvg.children].find((child) => child.localName === 'g');
    const viewBox = sourceSvg.getAttribute('viewBox');
    if (!sourceGroup || !viewBox) {
      throw new Error(`Die SVG-Ebene "${className}" braucht eine ViewBox und eine Grafikgruppe.`);
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('preserveAspectRatio', preserveAspectRatio);
    svg.classList.add(className);

    const artwork = sourceGroup.cloneNode(true);
    artwork.setAttribute('fill', fill);
    artwork.setAttribute('stroke', fill);
    svg.appendChild(artwork);
    container.appendChild(svg);

    return { svg, artwork };
  };

  visual.querySelector('.wolle-encore__back').appendChild(createWolleBackScene());

  const duoContainer = visual.querySelector('.wolle-encore__duo');
  createSvgLayer(
    duoContainer.querySelector('.wolle-encore__duo-figure--left'),
    'wolle-encore__duo-svg',
    wollePersonLeftSource,
    '#f1dfc2',
    'xMidYMax meet'
  );
  createSvgLayer(
    duoContainer.querySelector('.wolle-encore__duo-figure--right'),
    'wolle-encore__duo-svg',
    wollePersonRightSource,
    '#f1dfc2',
    'xMidYMax meet'
  );

  const crowdContainer = visual.querySelector('.wolle-encore__crowd');
  createSvgLayer(
    crowdContainer,
    'wolle-encore__crowd-svg',
    stadiumCrowdSource,
    '#f1dfc2',
    'xMidYMax meet'
  );

  return visual;
}

function initializeWolle() {
  const audioElem = document.getElementById('audioWolle');

  startSudoTimeline(
    audioElem,
    () => {
      if (appendLine) {
        appendLine(
          "<span class='text-pink-400 font-bold'>[SUDO] WOLLE LIVE: FLANELL-BÜHNE UND STADIONLICHTER AKTIV.</span>"
        );
      }

      const stage = document.createElement('div');
      stage.className = 'wolle-stage';
      document.body.appendChild(stage);

      const flannelBg = document.createElement('div');
      flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-flannel--backdrop';
      document.body.appendChild(flannelBg);

      const curtains = ['left', 'right'].map((side) => {
        const curtain = document.createElement('div');
        curtain.className = `wolle-curtain wolle-curtain--${side}`;
        document.body.appendChild(curtain);
        return curtain;
      });

      const rig = document.createElement('div');
      rig.className = 'wolle-rig';
      rig.setAttribute('aria-hidden', 'true');
      rig.innerHTML = '<span></span>'.repeat(9);
      document.body.appendChild(rig);

      const podium = document.createElement('div');
      podium.className = 'wolle-podium';
      podium.setAttribute('aria-hidden', 'true');
      podium.innerHTML =
        '<div class="wolle-podium__step wolle-podium__step--silver"><b>2</b><span>SILBER</span></div><div class="wolle-podium__step wolle-podium__step--gold"><b>1</b><span>GOLD</span></div><div class="wolle-podium__step wolle-podium__step--bronze"><b>3</b><span>BRONZE</span></div>';
      document.body.appendChild(podium);

      const rejectionMark = document.createElement('div');
      rejectionMark.className = 'wolle-rejection-mark';
      rejectionMark.textContent = '✕';
      rejectionMark.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rejectionMark);

      const discoBall = document.createElement('div');
      discoBall.className = 'wolle-disco-ball';
      discoBall.setAttribute('aria-hidden', 'true');
      document.body.appendChild(discoBall);

      const petryLogo = document.createElement('img');
      petryLogo.className = 'wolle-petry-logo';
      petryLogo.src = petryLogoUrl;
      petryLogo.alt = 'Wolfgang Petry';
      document.body.appendChild(petryLogo);

      const discofoxVisual = createPetryDiscofoxGraphic();
      const encoreVisual = createWolleEncoreVisual();

      const showTag = document.createElement('div');
      showTag.className = 'wolle-show-tag';
      showTag.textContent = 'WOLLE LIVE  /  LOHHOF 21';
      document.body.appendChild(showTag);

      const karaokeText = document.createElement('div');
      karaokeText.className = 'wolle-karaoke';
      karaokeText.setAttribute('aria-live', 'polite');
      document.body.appendChild(karaokeText);

      requestAnimationFrame(() => {
        stage.classList.add('wolle-stage--lit');
        showTag.classList.add('wolle-show-tag--on');
      });

      setTimeout(() => {
        curtains.forEach((curtain) => curtain.classList.add('wolle-curtain--open'));
        podium.classList.add('wolle-podium--on', 'wolle-podium--bronze');
        stage.classList.add('wolle-stage--gold');
        karaokeText.classList.add('wolle-karaoke--medal');
        showCue(
          karaokeText,
          'BRONZE',
          '#ffad66',
          'wolle-karaoke--medal',
          'medalSlam 0.65s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
        triggerCameraFlash();
      }, WOLLE_CONFIG.cut1_bronze);

      setTimeout(() => {
        podium.classList.remove('wolle-podium--bronze');
        podium.classList.add('wolle-podium--silver');
        flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-silver';
        showCue(
          karaokeText,
          'SILBER',
          '#e7f0ff',
          'wolle-karaoke--medal',
          'medalSlam 0.55s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
      }, WOLLE_CONFIG.cut2_silber);

      setTimeout(() => {
        podium.classList.remove('wolle-podium--silver');
        podium.classList.add('wolle-podium--gold');
        stage.classList.add('wolle-stage--gold');
        flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-gold';
        showCue(
          karaokeText,
          'GOLD!',
          '#ffe45e',
          'wolle-karaoke--medal',
          'medalSlam 0.7s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
        spawnFallingItems(['🥇', '🏆', '⭐'], 7, 1.5, 'wolle-medallion');
      }, WOLLE_CONFIG.cut3_gold);

      setTimeout(() => {
        podium.classList.remove('wolle-podium--on');
        stage.classList.remove('wolle-stage--gold');
        stage.classList.add('wolle-stage--rejection');
        flannelBg.className = 'wolle-flannel wolle-flannel--active';
        showCue(
          karaokeText,
          'NIE<br>GEWOLLT!',
          '#ff5277',
          'wolle-karaoke--reject',
          'shakeAggro 0.42s infinite'
        );
        rejectionMark.classList.remove('wolle-rejection-mark--hit');
        rejectionMark.offsetHeight;
        rejectionMark.classList.add('wolle-rejection-mark--hit');
        if (root) root.classList.add('wolle-3d-tilt');
        triggerCameraFlash();
      }, WOLLE_CONFIG.cut4_niegewollt);

      setTimeout(() => {
        if (root) root.classList.remove('wolle-3d-tilt');
        stage.classList.remove('wolle-stage--rejection');
        stage.classList.add('wolle-stage--romance');
        flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-blue';
        petryLogo.classList.add('wolle-petry-logo--on');
        discofoxVisual.classList.add('wolle-discofox--on');
        showCue(
          karaokeText,
          'ICH WILL<br>NUR DICH... <span class="wolle-karaoke__eyes" aria-hidden="true">👀</span>',
          '#72d9f2',
          'wolle-karaoke--romance',
          'stageReveal 0.85s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );

        ['spot-left', 'spot-right'].forEach((spotClass) => {
          const spotlight = document.createElement('div');
          spotlight.className = `wolle-spotlight ${spotClass}`;
          document.body.appendChild(spotlight);
          requestAnimationFrame(() => spotlight.classList.add('wolle-spotlight--on'));
        });
      }, WOLLE_CONFIG.cut5_ichwill);

      setTimeout(() => {
        discofoxVisual.classList.add('wolle-discofox--turn');
        showCue(
          karaokeText,
          'NUR DICH<br>ALLEIN!',
          '#ff65bf',
          'wolle-karaoke--love wolle-karaoke--romance',
          'heartbeatText 1s ease-in-out infinite'
        );
        if (root) root.classList.add('wolle-schunkel');
      }, WOLLE_CONFIG.cut6_allein);

      setTimeout(() => {
        discofoxVisual.classList.remove('wolle-discofox--on', 'wolle-discofox--turn');
        rejectionMark.classList.remove('wolle-rejection-mark--hit');
        stage.classList.remove('wolle-stage--romance', 'wolle-stage--rejection');
        stage.classList.add('wolle-stage--stadium');
        podium.classList.remove(
          'wolle-podium--on',
          'wolle-podium--bronze',
          'wolle-podium--silver',
          'wolle-podium--gold'
        );
        flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-flannel--stadium';
        petryLogo.classList.remove('wolle-petry-logo--on');
        discoBall.classList.remove('wolle-disco-ball--on');
        showTag.classList.remove('wolle-show-tag--on');
        encoreVisual.classList.add('wolle-encore--on', 'wolle-encore--gold', 'wolle-encore--back');
        showCue(
          karaokeText,
          'BRONZE, SILBER<br>& GOLD...',
          '#ffe36e',
          'wolle-karaoke--stadium',
          'stageReveal 0.75s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
      }, WOLLE_CONFIG.cut7_bronze2);

      setTimeout(() => {
        encoreVisual.classList.remove('wolle-encore--gold', 'wolle-encore--back');
        encoreVisual.classList.add('wolle-encore--echo', 'wolle-encore--duo');
        showCue(
          karaokeText,
          'NIE GEWOLLT!',
          '#75e8cf',
          'wolle-karaoke--stadium',
          'stageReveal 0.6s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
      }, WOLLE_CONFIG.cut8_niegewollt2);

      setTimeout(() => {
        encoreVisual.classList.remove('wolle-encore--echo', 'wolle-encore--duo');
        encoreVisual.classList.add('wolle-encore--crowd');
        showCue(
          karaokeText,
          'ICH WILL<br>NUR EINS...',
          '#ff9fca',
          'wolle-karaoke--romance wolle-karaoke--stadium',
          'medalSlam 0.55s cubic-bezier(0.16, 0.8, 0.24, 1) forwards'
        );
      }, WOLLE_CONFIG.cut9_nureins);

      setTimeout(() => {
        encoreVisual.classList.remove(
          'wolle-encore--gold',
          'wolle-encore--echo',
          'wolle-encore--back',
          'wolle-encore--duo',
          'wolle-encore--one',
          'wolle-encore--crowd'
        );
        encoreVisual.classList.add('wolle-encore--finale');
        curtains.forEach((curtain) => curtain.classList.add('wolle-curtain--finale'));
        petryLogo.classList.add('wolle-petry-logo--on');
        discoBall.classList.add('wolle-disco-ball--on');
        showTag.classList.add('wolle-show-tag--on');
        stage.classList.remove('wolle-stage--romance', 'wolle-stage--stadium');
        stage.classList.add('wolle-stage--finale');
        flannelBg.className = 'wolle-flannel wolle-flannel--active wolle-flannel--stadium';
        showTag.textContent = 'WOLLE LIVE  /  STADION-NACHT';
        showCue(
          karaokeText,
          'NUR DICH<br>ALLEIN!',
          '#fff0c7',
          'wolle-karaoke--love wolle-karaoke--stadium wolle-karaoke--finale',
          'heartbeatText 0.72s ease-in-out infinite'
        );
        if (root) {
          root.classList.remove('wolle-schunkel');
          root.classList.add('wolle-hyper-schunkel');
        }
        spawnFallingItems(['🍻', '⭐'], 10, 2, 'wolle-confetti');
        if (appendLine) {
          appendLine(
            "<span class='text-pink-400 font-extrabold text-sm animate-pulse'>🍻 [WOLLE LIVE] FLANELL-FINALE. DER GANZE LOHHOF SINGT MIT!</span>"
          );
        }

        setTimeout(
          () => fadeOutAudio(audioElem, WOLLE_CONFIG.fadeTime),
          WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2 - WOLLE_CONFIG.fadeTime
        );

        setTimeout(
          () => startLogoOutro({ logo: wolleLogo, theme: 'plaid' }),
          Math.max(0, WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2 - OUTRO_MS)
        );

        setTimeout(() => {
          window.parent.postMessage('sudo_finished', '*');
        }, WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2);
      }, WOLLE_CONFIG.cut10_allein2);
    },
    'Wolle'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWolle, { once: true });
} else {
  initializeWolle();
}
