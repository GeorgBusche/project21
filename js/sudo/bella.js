import { SUDO_CUE_TIMINGS, startSudoTimeline } from './shared/cue-timings.js';

const root = window.parent.document.getElementById('bodyRoot');
const appendLine = window.parent.appendLine;
const BELLA_CONFIG = Object.assign(
  { duration: 7000, fadeTime: 1500 },
  SUDO_CUE_TIMINGS?.bella || {}
);

function flashText(text, colorClass) {
  const el = document.createElement('div');
  el.className = `bella-text ${colorClass} bella-smash`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function createShockwave(colorHex) {
  const ring = document.createElement('div');
  ring.className = 'bella-ring';
  ring.style.borderColor = colorHex;
  ring.style.boxShadow = `0 0 60px ${colorHex}, inset 0 0 60px ${colorHex}`;
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 700);
}

function explodeEmojis(count) {
  const emojis = ['🍕', '🚜', '🍺', '🤌', '🔥', '🎉', '🍝', '🍷', '💥', '🇮🇹'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'bella-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 80;
    const tx = Math.cos(angle) * distance + 'vw';
    const ty = Math.sin(angle) * distance + 'vh';
    const rot = (Math.random() - 0.5) * 1440 + 'deg'; // Rotiert wie verrückt

    p.style.setProperty('--tx', tx);
    p.style.setProperty('--ty', ty);
    p.style.setProperty('--rot', rot);

    frag.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
  document.body.appendChild(frag);
}

window.onload = () => {
  const audioElem = document.getElementById('audioBellaNapoli');
  startSudoTimeline(
    audioElem,
    () => {
      appendLine(
        "<span class='text-amber-300 font-bold'>[SUDO] Zünde Dorf-Abriss (Bella Napoli)...</span>"
      );

      // 1. HIT: BELLA! (Grün)
      setTimeout(() => {
        flashText('BELLA!', 'text-green');
        createShockwave('#009246');
        explodeEmojis(25);
      }, BELLA_CONFIG.hit1);

      // 2. HIT: BELLA! (Weiß)
      setTimeout(() => {
        flashText('BELLA!', 'text-white-italy');
        createShockwave('#ffffff');
        explodeEmojis(35);
      }, BELLA_CONFIG.hit2);

      // 3. DROP: NAPOLI! (Rot + Eskalation)
      setTimeout(() => {
        flashText('NAPOLI!', 'text-red');
        createShockwave('#CE2B37');
        explodeEmojis(120); // Massive Explosion

        if (root) root.classList.add('cam-speed-shake');

        const strobe = document.createElement('div');
        strobe.className = 'bella-strobe';
        document.body.appendChild(strobe);

        let tick = 0;
        const partyTimer = setInterval(() => {
          const colors = ['#009246', '#ffffff', '#CE2B37', 'transparent'];
          strobe.style.backgroundColor = colors[tick % colors.length];
          strobe.style.opacity = tick % 4 === 3 ? '0' : '0.9'; // Harte Stroboskop-Blitze

          if (tick % 3 === 0) explodeEmojis(15);
          tick++;
        }, 90);

        appendLine(
          "<span class='text-rose-400 font-extrabold text-sm animate-pulse'>🎺 [DROP] NAPOLI! PARTYRAUM ERREICHT MAXIMALEN DURCHSATZ!</span>"
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
              }, BELLA_CONFIG.fadeTime / 20);
            }
          },
          BELLA_CONFIG.duration - BELLA_CONFIG.drop - BELLA_CONFIG.fadeTime
        );

        setTimeout(() => {
          if (root) root.classList.remove('cam-speed-shake');
          clearInterval(partyTimer);
          window.parent.postMessage('sudo_finished', '*');
        }, BELLA_CONFIG.duration - BELLA_CONFIG.drop);
      }, BELLA_CONFIG.drop);
    },
    'Bella Napoli'
  );
};
