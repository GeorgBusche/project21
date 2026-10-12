import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const TORNADO_CONFIG = Object.assign(
  { c_drop: 12800, duration: 15000, fadeTime: 2500 },
  SUDO_CUE_TIMINGS?.biertornado || {}
);

function resetTornadoAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}
function screenFlash(colorClass) {
  const flash = document.createElement('div');
  flash.className = `fixed inset-0 z-50 pointer-events-none ${colorClass}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 250);
}
function triggerLightning() {
  const flash = document.createElement('div');
  flash.className = 'tornado-lightning';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}
function playTornadoSynthFallback() {
  setTimeout(() => playTone(800, 'sawtooth', 0.5, 0.2), TORNADO_CONFIG.c1_sturm);
  setTimeout(() => playTone(600, 'sawtooth', 1.0, 0.3), TORNADO_CONFIG.c4_tornado);
  setTimeout(() => playTone(900, 'square', 0.5, 0.2), TORNADO_CONFIG.c12_sternburg);
}

function spawnChaoticWind() {
  const emojis = ['🍺', '🍻', '🌧️', '💨', '🌪️', '🧊', '⭐'];
  for (let i = 0; i < 30; i++) {
    const item = document.createElement('div');
    item.className = 'wind-blast-item';
    item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    item.style.top = `${-40 + Math.random() * 100}vh`;
    const dur = 0.25 + Math.random() * 0.4;
    item.style.animationDuration = `${dur}s`;
    item.style.animationDelay = `${Math.random() * 0.8}s`;
    document.body.appendChild(item);
    setTimeout(
      () => {
        if (item.parentNode) item.remove();
      },
      (dur + 1) * 1000
    );
  }
}

function spawnCrateDrop() {
  const crates = ['📦', '🍺', '🍻'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const item = document.createElement('div');
      item.className = 'tornado-crate';
      item.textContent = crates[Math.floor(Math.random() * crates.length)];
      item.style.left = `${5 + Math.random() * 90}vw`;
      document.body.appendChild(item);
      setTimeout(() => {
        if (item.parentNode) item.remove();
      }, 1200);
    }, i * 60);
  }
}

function create3DTornado() {
  const wrapper = document.createElement('div');
  wrapper.className = 'vortex-wrapper';
  wrapper.id = 'activeTornado';
  const spin = document.createElement('div');
  spin.className = 'vortex-spin';
  spin.id = 'activeTornadoSpin';
  wrapper.appendChild(spin);
  const items = ['🍺', '🍻', '⭐', '🔴', '🌪️', '📦'];
  for (let i = 0; i < 150; i++) {
    const item = document.createElement('div');
    item.className = 'vortex-item';
    item.textContent = items[Math.floor(Math.random() * items.length)];
    const yPercent = Math.random() * 100;
    const radius = 25 + Math.pow((100 - yPercent) / 10, 2.5);
    const angle = Math.random() * 360;
    item.style.top = `${yPercent}%`;
    item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px) rotateX(${Math.random() * 45}deg)`;
    spin.appendChild(item);
  }
  document.body.appendChild(wrapper);
}

window.onload = () => {
  const audioElem = document.getElementById('audioTornado');
  const startTimeline = () => {
    const resetCam = () => {
      root.className =
        'h-full flex flex-col justify-between select-none relative crt-overlay bg-neutral-950 pb-20';
    };
    appendLine(
      `<span class='text-yellow-400 font-extrabold'>[WETTERDIENST] STURMTIEF RICARDO NÄHERT SICH!</span>`
    );

    const stormBg = document.createElement('div');
    stormBg.className = 'tornado-storm-bg';
    document.body.appendChild(stormBg);
    const mainText = document.createElement('div');
    mainText.className = 'tornado-text';
    document.body.appendChild(mainText);
    create3DTornado();

    setTimeout(() => {
      stormBg.style.opacity = '1';
      mainText.innerHTML = 'STURM-';
      resetTornadoAnimation(mainText, 'smashRight 0.2s ease-out forwards');
    }, TORNADO_CONFIG.c1_sturm);
    setTimeout(() => {
      mainText.style.color = '#facc15';
      mainText.innerHTML = '-TIEF RICARDO';
      resetTornadoAnimation(mainText, 'smashLeft 0.2s ease-out forwards');
      screenFlash('flash-yellow');
    }, TORNADO_CONFIG.c2_ricardo);
    setTimeout(() => {
      mainText.style.color = '#ffffff';
      mainText.innerHTML = 'BIER-';
      resetTornadoAnimation(mainText, 'stompCenter 0.2s ease-out forwards');
    }, TORNADO_CONFIG.c3_bier);
    setTimeout(() => {
      triggerLightning();
      mainText.className = 'tornado-text text-sternburg-red text-huge';
      mainText.innerHTML = 'TORNADO!';
      resetTornadoAnimation(mainText, 'stompCenter 0.2s ease-out forwards');
      const tornadoWrapper = document.getElementById('activeTornado');
      if (tornadoWrapper) tornadoWrapper.style.opacity = '1';
      setInterval(spawnChaoticWind, 400);
      spawnChaoticWind();
    }, TORNADO_CONFIG.c4_tornado);

    setTimeout(() => {
      mainText.className = 'tornado-text';
      mainText.innerHTML = 'GIB';
      root.classList.add('cam-zoom-in');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c5_gib1);
    setTimeout(() => {
      mainText.innerHTML = 'MAL';
      root.classList.remove('cam-zoom-in');
      root.classList.add('cam-zoom-out');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c6_mal1);
    setTimeout(() => {
      mainText.innerHTML = 'BIER!';
      resetCam();
      root.classList.add('cam-tilt-left');
      screenFlash('flash-yellow');
      resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
    }, TORNADO_CONFIG.c7_bier1);

    setTimeout(() => {
      resetCam();
      mainText.innerHTML = 'GIB';
      root.classList.add('cam-zoom-in');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c8_gib2);
    setTimeout(() => {
      mainText.innerHTML = 'MAL';
      root.classList.remove('cam-zoom-in');
      root.classList.add('cam-zoom-out');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c9_mal2);
    setTimeout(() => {
      mainText.innerHTML = 'BIER!';
      resetCam();
      root.classList.add('cam-tilt-right');
      screenFlash('flash-red');
      resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
    }, TORNADO_CONFIG.c10_bier2);

    setTimeout(() => {
      resetCam();
      mainText.style.color = '#facc15';
      mainText.innerHTML = 'NÄCHSTE<br>LADUNG!';
      resetTornadoAnimation(mainText, 'stompCenter 0.2s forwards');
      spawnCrateDrop();
    }, TORNADO_CONFIG.c11_ladung);

    setTimeout(() => {
      mainText.className = 'tornado-text text-sternburg-red';
      mainText.innerHTML = 'STERNBURG';
      resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
      const camo = document.createElement('div');
      camo.className = 'sternburg-camo';
      camo.id = 'activeCamo';
      document.body.appendChild(camo);
    }, TORNADO_CONFIG.c12_sternburg);
    setTimeout(() => {
      mainText.innerHTML = '-ANZUG!';
      resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
    }, TORNADO_CONFIG.c13_anzug);
    setTimeout(() => {
      mainText.className = 'tornado-text';
      mainText.innerHTML = 'MEINE';
      const camo = document.getElementById('activeCamo');
      if (camo) camo.style.filter = 'invert(1)';
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c14_meine);
    setTimeout(() => {
      mainText.className = 'tornado-text text-glitch text-huge';
      mainText.innerHTML = 'TARNUNG!';
      const camo = document.getElementById('activeCamo');
      if (camo) camo.style.filter = 'none';
    }, TORNADO_CONFIG.c15_tarnung);

    setTimeout(() => {
      mainText.className = 'tornado-text';
      mainText.innerHTML = 'GIB';
      root.classList.add('cam-zoom-in');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c16_gib3);
    setTimeout(() => {
      mainText.innerHTML = 'MAL';
      root.classList.remove('cam-zoom-in');
      root.classList.add('cam-zoom-out');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c17_mal3);
    setTimeout(() => {
      mainText.innerHTML = 'BIER!';
      resetCam();
      root.classList.add('cam-tilt-left');
      screenFlash('flash-yellow');
      resetTornadoAnimation(mainText, 'smashLeft 0.1s forwards');
    }, TORNADO_CONFIG.c18_bier3);

    setTimeout(() => {
      resetCam();
      mainText.innerHTML = 'GIB';
      root.classList.add('cam-zoom-in');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c19_gib4);
    setTimeout(() => {
      mainText.innerHTML = 'MAL';
      root.classList.remove('cam-zoom-in');
      root.classList.add('cam-zoom-out');
      resetTornadoAnimation(mainText, 'stompFast 0.1s forwards');
    }, TORNADO_CONFIG.c20_mal4);
    setTimeout(() => {
      mainText.innerHTML = 'BIER!';
      resetCam();
      root.classList.add('cam-tilt-right');
      screenFlash('flash-red');
      resetTornadoAnimation(mainText, 'smashRight 0.1s forwards');
    }, TORNADO_CONFIG.c21_bier4);

    setTimeout(() => {
      resetCam();
      mainText.className = 'tornado-text text-huge';
      mainText.style.color = '#ffffff';
      mainText.innerHTML = 'LETZTE<br>WARNUNG!';
      resetTornadoAnimation(mainText, 'stompCenter 0.2s forwards');
      const alertBorder = document.createElement('div');
      alertBorder.className = 'tornado-alert-border';
      document.body.appendChild(alertBorder);
    }, TORNADO_CONFIG.c22_warnung);

    setTimeout(() => {
      mainText.style.display = 'none';
      triggerLightning();
      const spin = document.getElementById('activeTornadoSpin');
      if (spin) spin.classList.add('hyper');
      const disco = document.getElementById('discoOverlay');
      let tick = 0;
      setInterval(() => {
        const colors = ['bg-white', 'bg-red-600', 'bg-transparent', 'bg-yellow-400'];
        disco.className = `fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 opacity-80 ${colors[tick % colors.length]}`;
        if (tick % 2 === 0)
          root.style.transform = `translate(${(Math.random() - 0.5) * 30}px, ${(Math.random() - 0.5) * 30}px) scale(1.05)`;
        tick++;
      }, 80);

      appendLine(
        `<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🌪️ [ESKALATION] TORNADO KATEGORIE 5. RETTE SICH WER KANN!</span>`
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
            }, TORNADO_CONFIG.fadeTime / 20);
          }
        },
        TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop - TORNADO_CONFIG.fadeTime
      );

      setTimeout(() => {
        window.parent.postMessage('sudo_finished', '*');
      }, TORNADO_CONFIG.duration - TORNADO_CONFIG.c_drop);
    }, TORNADO_CONFIG.c_drop);
  };

  startSudoTimeline(audioElem, startTimeline, 'Biertornado', playTornadoSynthFallback);
};
