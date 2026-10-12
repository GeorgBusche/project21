import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const WOLLE_CONFIG = Object.assign(
  { duration: 16000, fadeTime: 2500 },
  SUDO_CUE_TIMINGS?.wolle || {}
);

function resetAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}

function spawnWolleRain(emojis, count, durationBase) {
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'wolle-falling-item';
    item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    item.style.left = `${Math.random() * 120 - 10}vw`;
    const dur = durationBase + Math.random() * 1.5;
    item.style.animationDuration = `${dur}s`;
    item.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(item);
    setTimeout(
      () => {
        if (item.parentNode) item.remove();
      },
      (dur + 0.5) * 1000
    );
  }
}

function triggerCameraFlash() {
  const flash = document.createElement('div');
  flash.className = 'wolle-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 450);
}

window.onload = () => {
  const audioElem = document.getElementById('audioWolle');
  startSudoTimeline(
    audioElem,
    () => {
      appendLine(
        `<span class='text-pink-400 font-bold'>[SUDO] DIRECTOR'S CUT: VOKUHILA-OVERDRIVE INITIIERT!</span>`
      );

      const flannelBg = document.createElement('div');
      flannelBg.className = 'wolle-flannel';
      document.body.appendChild(flannelBg);
      const karaokeText = document.createElement('div');
      karaokeText.className = 'wolle-karaoke';
      document.body.appendChild(karaokeText);

      setTimeout(() => {
        flannelBg.style.opacity = '1';
        karaokeText.style.color = '#cd7f32';
        karaokeText.innerHTML = 'BRONZE';
        resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
        triggerCameraFlash();
      }, WOLLE_CONFIG.cut1_bronze);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel wolle-silver';
        karaokeText.style.color = '#c0c0c0';
        karaokeText.innerHTML = 'SILBER';
        resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
      }, WOLLE_CONFIG.cut2_silber);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel wolle-gold';
        karaokeText.style.color = '#ffd700';
        karaokeText.innerHTML = '& GOLD!';
        resetAnimation(karaokeText, 'smashIn 0.2s ease-out forwards');
        spawnWolleRain(['🥇', '🏆', '⭐'], 15, 1.2);
      }, WOLLE_CONFIG.cut3_gold);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel';
        karaokeText.style.color = '#ef4444';
        karaokeText.innerHTML = '❌ NIE<br>GEWOLLT!';
        resetAnimation(karaokeText, 'shakeAggro 0.4s infinite');
        root.classList.add('wolle-3d-tilt');
        triggerCameraFlash();
      }, WOLLE_CONFIG.cut4_niegewollt);

      setTimeout(() => {
        root.classList.remove('wolle-3d-tilt');
        flannelBg.className = 'wolle-flannel wolle-blue';
        karaokeText.style.color = '#3b82f6';
        karaokeText.innerHTML = '👀 ICH WILL<br>NUR DICH...';
        resetAnimation(karaokeText, 'popIn 0.4s forwards');
        ['spot-left', 'spot-right'].forEach((cls) => {
          const spot = document.createElement('div');
          spot.className = `wolle-spotlight ${cls}`;
          document.body.appendChild(spot);
        });
        const lighterCount = Math.floor(window.innerWidth / 80);
        for (let i = 0; i < lighterCount; i++) {
          const lighter = document.createElement('div');
          lighter.className = 'wolle-lighter';
          lighter.textContent = '🔥';
          lighter.style.left = `${i * 80 + Math.random() * 20}px`;
          lighter.style.animationDelay = `-${Math.random() * 3}s`;
          document.body.appendChild(lighter);
        }
      }, WOLLE_CONFIG.cut5_ichwill);

      setTimeout(() => {
        karaokeText.style.color = '#ec4899';
        karaokeText.innerHTML = '❤️ NUR DICH<br>ALLEIN! ❤️';
        resetAnimation(karaokeText, 'heartbeatText 0.8s infinite');
        root.classList.add('wolle-schunkel');
        spawnWolleRain(['💖', '🫶', '💋'], 25, 1.5);
      }, WOLLE_CONFIG.cut6_allein);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel wolle-gold';
        karaokeText.style.color = '#ffd700';
        karaokeText.innerHTML = 'BRONZE, SILBER<br>& GOLD...';
        resetAnimation(karaokeText, 'barrelRoll 0.6s forwards');
        triggerCameraFlash();
      }, WOLLE_CONFIG.cut7_bronze2);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel';
        karaokeText.style.color = '#ef4444';
        karaokeText.innerHTML = '❌ NIE GEWOLLT!';
        resetAnimation(karaokeText, 'shakeAggro 0.4s infinite');
        karaokeText.style.transform = 'translate(-50%, -50%) scale(1.4)';
      }, WOLLE_CONFIG.cut8_niegewollt2);
      setTimeout(() => {
        flannelBg.className = 'wolle-flannel wolle-blue';
        karaokeText.style.color = '#06b6d4';
        karaokeText.innerHTML = '☝️ ICH WILL<br>NUR EINS...';
        resetAnimation(karaokeText, 'smashIn 0.3s forwards');
      }, WOLLE_CONFIG.cut9_nureins);

      setTimeout(() => {
        triggerCameraFlash();
        flannelBg.className = 'wolle-flannel wolle-rainbow';
        karaokeText.style.color = '#ffffff';
        karaokeText.style.textShadow = '0 0 50px #ec4899, 0 0 100px #3b82f6';
        karaokeText.innerHTML = '🍻 NUR DICH<br>ALLEIN! 🍻';
        resetAnimation(karaokeText, 'heartbeatText 0.4s infinite');
        root.classList.remove('wolle-schunkel');
        root.classList.add('wolle-hyper-schunkel');
        spawnWolleRain(['🍻', '🍺', '🎸', '🪩', '🎉', '🎤'], 60, 1.2);
        appendLine(
          "<span class='text-pink-400 font-extrabold text-sm animate-pulse'>🍻 [HYPER-STADION] REGENBOGEN-FLANELL AKTIVIERT! HÖLLE HÖLLE HÖLLE!</span>"
        );

        setTimeout(
          () => {
            if (audioElem && !audioElem.paused) {
              const fadeInterval = setInterval(() => {
                if (audioElem.volume > 0.05) audioElem.volume -= 0.05;
                else {
                  audioElem.pause();
                  clearInterval(fadeInterval);
                }
              }, WOLLE_CONFIG.fadeTime / 20);
            }
          },
          WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2 - WOLLE_CONFIG.fadeTime
        );

        setTimeout(() => {
          window.parent.postMessage('sudo_finished', '*');
        }, WOLLE_CONFIG.duration - WOLLE_CONFIG.cut10_allein2);
      }, WOLLE_CONFIG.cut10_allein2);
    },
    'Wolle'
  );
};
