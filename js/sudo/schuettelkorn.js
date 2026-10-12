import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const KORN_CONFIG = Object.assign(
  { c_drop: 17500, duration: 18800, fadeTime: 2500 },
  SUDO_CUE_TIMINGS?.schuettelkorn || {}
);

function resetKornAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}

function spawnSadRain() {
  for (let i = 0; i < 15; i++) {
    const tear = document.createElement('div');
    tear.className = 'korn-tear';
    tear.textContent = '💧';
    tear.style.left = `${Math.random() * 100}vw`;
    tear.style.animationDuration = `${0.5 + Math.random()}s`;
    tear.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(tear);
  }
}

function spawnFizz(amount, speedMultiplier = 1) {
  for (let i = 0; i < amount; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'brause-bubble';
    const size = 10 + Math.random() * 40;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}vw`;
    const dur = (0.5 + Math.random() * 0.8) * speedMultiplier;
    bubble.style.animationDuration = `${dur}s`;
    document.body.appendChild(bubble);
    setTimeout(() => {
      if (bubble.parentNode) bubble.remove();
    }, dur * 1000);
  }
}

function spawnSchuettelItems(emojis, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const item = document.createElement('div');
      item.className = 'schuettel-item';
      item.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      item.style.left = `${5 + Math.random() * 90}vw`;
      item.style.animationDuration = `${0.6 + Math.random() * 0.6}s`;
      document.body.appendChild(item);
      setTimeout(() => {
        if (item.parentNode) item.remove();
      }, 1600);
    }, i * 50);
  }
}

window.onload = () => {
  const audioElem = document.getElementById('audioKorn');
  startSudoTimeline(
    audioElem,
    () => {
      appendLine(
        `<span class='text-blue-400 font-bold'>[THERAPIE] Melancholie erkannt. Verabreiche Gegenmittel...</span>`
      );
      root.classList.add('korn-sad-mode');
      const mainText = document.createElement('div');
      mainText.className = 'korn-text';
      document.body.appendChild(mainText);

      setTimeout(() => {
        mainText.innerHTML = 'TRAURIG...';
        resetKornAnimation(mainText, 'dropInSad 1s ease-out forwards');
        spawnSadRain();
      }, KORN_CONFIG.c1_traurig1);
      setTimeout(() => {
        root.classList.remove('korn-sad-mode');
        mainText.className = 'korn-text text-korn';
        mainText.innerHTML = '1. KORN!';
        resetKornAnimation(mainText, 'smashKorn 0.3s ease-out forwards');
        spawnSchuettelItems(['🥃', '🌾'], 8);
      }, KORN_CONFIG.c2_korn1);
      setTimeout(() => {
        mainText.className = 'korn-text';
        mainText.innerHTML = 'NOCH<br>TRAURIG?!';
        resetKornAnimation(mainText, 'dropInSad 0.5s ease-out forwards');
      }, KORN_CONFIG.c3_traurig2);
      setTimeout(() => {
        mainText.className = 'korn-text text-brause';
        mainText.innerHTML = 'AHOI<br>BRAUSE!';
        resetKornAnimation(mainText, 'smashKorn 0.2s forwards');
        root.classList.add('brause-mode');
        spawnSchuettelItems(['🍓', '🍋', '🍬', '💥'], 10);
      }, KORN_CONFIG.c4_brause_alert);
      setTimeout(() => {
        mainText.className = 'korn-text text-korn';
        mainText.innerHTML = '2. KORN!';
        resetKornAnimation(mainText, 'smashKorn 0.2s forwards');
        setInterval(() => spawnFizz(15), 200);
      }, KORN_CONFIG.c5_korn2);
      setTimeout(() => {
        root.classList.remove('brause-mode');
        root.classList.add('brause-mode-green');
        mainText.className = 'korn-text fizz-shake';
        mainText.style.color = '#ffffff';
        mainText.innerHTML = 'IMMER NOCH<br>TRAURIG?!';
      }, KORN_CONFIG.c6_traurig3);
      setTimeout(() => {
        mainText.className = 'korn-text text-brause fizz-shake';
        mainText.innerHTML = 'SCHÜTTELN!';
        mainText.style.transform = 'translate3d(-50%, -50%, 0) scale(1.5)';
        spawnFizz(50, 0.5);
        appendLine(
          `<span class='text-pink-500 font-extrabold'>[WARNUNG] DRUCK IM MUNDRAUM STEIGT KRITISCH!</span>`
        );
      }, KORN_CONFIG.c7_schuetteln);
      setTimeout(() => {
        mainText.className = 'korn-text text-korn fizz-shake';
        mainText.innerHTML = '3. KORN!';
        spawnSchuettelItems(['🥃', '💥', '💦'], 20);
      }, KORN_CONFIG.c8_korn3);
      setTimeout(() => {
        root.classList.remove('brause-mode-green');
        mainText.className = 'korn-text';
        mainText.innerHTML = 'UND DANN...';
      }, KORN_CONFIG.c9_undwenn);
      setTimeout(() => {
        mainText.className = 'korn-text korn-text-vorn';
        mainText.innerHTML = 'VON VORN!';
        resetKornAnimation(mainText, 'spinVorn 0.5s ease-in forwards');
      }, KORN_CONFIG.c11_vorn);

      setTimeout(() => {
        mainText.style.display = 'none';
        root.classList.add('fx-earthquake');
        const disco = document.getElementById('discoOverlay');
        let tick = 0;
        setInterval(() => {
          const colors = ['bg-pink-500', 'bg-green-400', 'bg-yellow-400', 'bg-transparent'];
          disco.className = `fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 opacity-70 ${colors[tick % colors.length]}`;
          if (tick % 2 === 0) spawnFizz(30, 0.4);
          if (tick % 5 === 0) spawnSchuettelItems(['🥃', '🍬', '💥', '💦', '😵‍💫'], 5);
          tick++;
        }, 80);

        appendLine(
          `<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🍬 [ZUCKERSCHOCK] SCHÜTTELKORN-OVERDRIVE ERREICHT!</span>`
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
              }, KORN_CONFIG.fadeTime / 20);
            }
          },
          KORN_CONFIG.duration - KORN_CONFIG.c_drop - KORN_CONFIG.fadeTime
        );

        setTimeout(() => {
          window.parent.postMessage('sudo_finished', '*');
        }, KORN_CONFIG.duration - KORN_CONFIG.c_drop);
      }, KORN_CONFIG.c_drop);
    },
    'Schuettelkorn'
  );
};
