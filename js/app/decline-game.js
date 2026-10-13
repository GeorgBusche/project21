import { CONFIG } from '../config.js';
import { trackFlag } from './achievements.js';
import { playBuzzerError, playTone } from './audio.js';
import { startBossFight } from './boss-fight.js';
import { appendLine, showToast } from './ui.js';

let declineCount = 0;
let fleeInterval = null;
let currentRotation = 0;

function moveDeclineButton() {
  const button = document.getElementById('declineBtn');
  if (!button) return;

  const maxLeft = window.innerWidth - 80;
  const maxTop = window.innerHeight - 100;
  const minLeft = 10;
  const minTop = 60;
  button.style.left = `${minLeft + Math.random() * (maxLeft - minLeft)}px`;
  button.style.top = `${minTop + Math.random() * (maxTop - minTop)}px`;
}

export function handleDeclineClick() {
  declineCount++;
  playBuzzerError();

  const button = document.getElementById('declineBtn');
  const root = document.getElementById('bodyRoot');
  if (!button || !root) return;

  if (declineCount === 1) {
    document.getElementById('declineWrapper').classList.remove('flex-1');
    document.getElementById('declineWrapper').classList.add('w-14', 'shrink-0');
    button.className =
      'absolute inset-0 w-full h-full btn-fiech active:scale-95 transition-all duration-300 z-[60]';
    button.innerHTML =
      '<div class="monster-eye left"></div><div class="monster-eye right"></div><span class="text-3xl font-black relative z-10 leading-none" style="color: black;">X</span><div class="monster-leg left"></div><div class="monster-leg right"></div>';
    return;
  }

  if (declineCount < CONFIG.game.phase2_clicks) {
    button.classList.add('shake-denied');
    setTimeout(() => button.classList.remove('shake-denied'), 350);
  }

  const phrases = CONFIG.declinePhrases;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  appendLine(
    `<span class='text-rose-400 font-bold'>[ABGELEHNT #${declineCount}] ${phrase}</span>`
  );

  if (declineCount >= CONFIG.game.phase2_clicks && declineCount < CONFIG.game.phase3_clicks) {
    moveDeclineButton();
  }
  if (declineCount >= CONFIG.game.phase3_clicks && declineCount < CONFIG.game.phase5_clicks) {
    currentRotation += 180;
    document.documentElement.style.setProperty('--game-rot', `${currentRotation}deg`);
    moveDeclineButton();
  }

  if (declineCount === CONFIG.game.phase2_clicks) {
    document.getElementById('declineGhost').style.opacity = '1';
    const rect = button.getBoundingClientRect();
    button.style.width = '55px';
    button.style.height = '45px';
    button.style.left = `${rect.left}px`;
    button.style.top = `${rect.top}px`;
    button.style.position = 'absolute';
    button.style.zIndex = '9999';
    document.body.appendChild(button);
    requestAnimationFrame(() => {
      button.classList.add('awake', 'flee-slow');
      moveDeclineButton();
    });
    appendLine(
      "<span class='text-cyan-400 font-extrabold text-sm mt-2'>[PHASE 2] Fiech ist erwacht. Fang es!</span>"
    );
    return;
  }

  if (declineCount === CONFIG.game.phase3_clicks) {
    appendLine(
      "<span class='text-fuchsia-400 font-extrabold text-sm mt-2'>[PHASE 3] GRAVITATIONS-ANOMALIE ENTDECKT!</span>"
    );
    fleeInterval = setInterval(() => {
      moveDeclineButton();
      playTone(500, 'sine', 0.05, 0.01);
    }, CONFIG.game.jumpIntervalSlow);
    return;
  }

  if (declineCount === CONFIG.game.phase4_clicks) {
    appendLine(
      "<span class='text-amber-400 font-extrabold text-sm mt-2'>[PHASE 4] PANIK-MODUS! BILDSCHIRM WIRD INSTABIL!</span>"
    );
    root.classList.add('egg-drunk');
    button.classList.remove('flee-slow');
    button.classList.add('flee-fast');
    clearInterval(fleeInterval);
    fleeInterval = setInterval(() => {
      moveDeclineButton();
      playTone(800, 'sawtooth', 0.05, 0.02);
    }, CONFIG.game.jumpIntervalFast);
    return;
  }

  if (declineCount === CONFIG.game.phase5_clicks) {
    trackFlag('boss');
    clearInterval(fleeInterval);
    appendLine(
      "<span class='text-emerald-400 font-extrabold text-sm mt-2'>[PHASE 5] BOSS FIGHT INITIIERT...</span>"
    );
    showToast('BOSS FIGHT INITIATED');

    root.classList.remove('egg-rotate', 'egg-drunk');
    currentRotation = 0;
    document.documentElement.style.setProperty('--game-rot', '0deg');
    button.style.display = 'none';

    const onResult = (event) => {
      window.removeEventListener('boss-fight-result', onResult);
      restoreDeclineButton(button);
      if (event.detail.won) {
        appendLine(
          "<span class='text-emerald-400 font-bold'>[BOSS-KILL] Das Absage-Fiech wurde vernichtet!</span>"
        );
      } else {
        appendLine(
          "<span class='text-rose-400 font-bold'>[BOSS] Das Omega-Fiech hat gewonnen. Du ergibst dich.</span>"
        );
      }
      window.openRsvpModal?.();
    };
    window.addEventListener('boss-fight-result', onResult);
    startBossFight({ onExit: () => {} });
  }
}

function restoreDeclineButton(button) {
  const wrapper = document.getElementById('declineWrapper');
  button.classList.remove('btn-fiech', 'awake', 'flee-slow', 'flee-fast');
  button.removeAttribute('style');
  wrapper.appendChild(button);
  button.innerHTML = '<span id="declineIcon">❌</span> <span id="declineText">ABSAGEN</span>';
  button.className =
    'absolute inset-0 w-full h-full rounded-lg border border-rose-900/50 bg-rose-950/40 text-rose-400 font-bold active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm z-[60] shadow-md';
  wrapper.classList.remove('w-14', 'shrink-0');
  wrapper.classList.add('flex-1');
  document.getElementById('declineGhost').style.opacity = '0';
  declineCount = 0;
}
