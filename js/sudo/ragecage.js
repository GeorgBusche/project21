import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const playTone = window.parent.playTone;

const RAGE_CONFIG = Object.assign(
  { c6_drop: 2700, duration: 8300, fadeTime: 2000 },
  SUDO_CUE_TIMINGS?.ragecage || {}
);

function resetRageAnimation(element, animationName) {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = animationName;
}

function spawnPingPongBalls() {
  for (let i = 0; i < 5; i++) {
    const ball = document.createElement('div');
    ball.className = 'ping-pong';
    const startX = Math.random() * 100;
    ball.style.left = `${startX}vw`;
    const durY = 0.4 + Math.random() * 0.3;
    ball.style.animation = `bounceBall ${durY}s infinite alternate ease-in`;
    const drift = (Math.random() - 0.5) * 60;
    ball.style.transform = `translateX(${drift}vw)`;
    ball.style.transition = `transform ${durY * 4}s linear`;
    document.body.appendChild(ball);
    setTimeout(() => {
      if (ball.parentNode) ball.style.transform = `translateX(${drift * 3}vw)`;
    }, 50);
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
    }, 3000);
  }
}

function spawnRedCups() {
  for (let i = 0; i < 3; i++) {
    const cup = document.createElement('div');
    cup.className = 'red-cup';
    cup.textContent = '🥤';
    cup.style.top = `${Math.random() * 100}vh`;
    const dur = 0.5 + Math.random() * 0.5;
    cup.style.animation = `flyCup ${dur}s linear forwards`;
    document.body.appendChild(cup);
    setTimeout(() => {
      if (cup.parentNode) cup.remove();
    }, dur * 1000);
  }
}

window.onload = () => {
  const audioElem = document.getElementById('audioGas');
  startSudoTimeline(
    audioElem,
    () => {
      appendLine(
        `<span class='text-red-500 font-extrabold'>[RAGECAGE] SYSTEM STAPELT BECHER! BEREITMACHEN!</span>`
      );

      const speedBg = document.createElement('div');
      speedBg.className = 'rage-speedlines';
      document.body.appendChild(speedBg);
      const borders = document.createElement('div');
      borders.className = 'rage-borders';
      document.body.appendChild(borders);
      const mainText = document.createElement('div');
      mainText.className = 'rage-text';
      document.body.appendChild(mainText);

      setTimeout(() => {
        speedBg.style.opacity = '0.3';
        mainText.innerHTML = 'GAS';
        resetRageAnimation(mainText, 'smashGasLeft 0.1s ease-out forwards');
      }, RAGE_CONFIG.c1_gas1);
      setTimeout(() => {
        speedBg.style.opacity = '0.5';
        mainText.innerHTML = 'GAS';
        resetRageAnimation(mainText, 'smashGasRight 0.1s ease-out forwards');
      }, RAGE_CONFIG.c2_gas2);
      setTimeout(() => {
        speedBg.style.opacity = '0.7';
        mainText.style.color = '#ef4444';
        mainText.innerHTML = 'GAS';
        resetRageAnimation(mainText, 'smashGasLeft 0.1s ease-out forwards');
      }, RAGE_CONFIG.c3_gas3);
      setTimeout(() => {
        speedBg.style.opacity = '0.9';
        mainText.innerHTML = 'GAS';
        resetRageAnimation(mainText, 'smashGasRight 0.1s ease-out forwards');
      }, RAGE_CONFIG.c4_gas4);
      setTimeout(() => {
        speedBg.classList.add('hyper');
        borders.style.opacity = '1';
        mainText.style.color = '#ffffff';
        mainText.innerHTML = 'GAS!!!';
        resetRageAnimation(mainText, 'stompGasCenter 0.1s ease-out forwards');
      }, RAGE_CONFIG.c5_gas5);

      setTimeout(() => {
        root.classList.add('cam-speed-shake');
        const strobe = document.createElement('div');
        strobe.className = 'rage-strobe';
        document.body.appendChild(strobe);
        setInterval(spawnPingPongBalls, 200);
        setInterval(spawnRedCups, 400);

        appendLine(
          `<span class='text-yellow-400 font-extrabold text-sm animate-pulse'>🏎️ [EUROBEAT] RAGECAGE LÄUFT! WEITER WEITER WEITER!</span>`
        );

        const panicWords = [
          'WEITER!',
          'TRINK!',
          'RECHTS!',
          'LINKS!',
          'STAPELN!',
          'BALL WEITER!',
          'HOPP HOPP!'
        ];
        setInterval(() => {
          mainText.style.color = Math.random() > 0.5 ? '#ffffff' : '#fbbf24';
          mainText.innerHTML = panicWords[Math.floor(Math.random() * panicWords.length)];
          resetRageAnimation(mainText, 'textFlicker 0.2s forwards');
        }, 450);

        setTimeout(
          () => {
            if (audioElem && !audioElem.paused) {
              const fadeInterval = setInterval(() => {
                if (audioElem.volume > 0.05) audioElem.volume -= 0.05;
                else {
                  audioElem.pause();
                  clearInterval(fadeInterval);
                }
              }, RAGE_CONFIG.fadeTime / 20);
            }
          },
          RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop - RAGE_CONFIG.fadeTime
        );

        setTimeout(() => {
          window.parent.postMessage('sudo_finished', '*');
        }, RAGE_CONFIG.duration - RAGE_CONFIG.c6_drop);
      }, RAGE_CONFIG.c6_drop);
    },
    'Ragecage'
  );
};
