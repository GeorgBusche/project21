import { CONFIG } from '../config.js';
import { CONTENT } from '../content.js';
import { playBuzzerError, playTone } from './audio.js';
import { openArcadeGame } from './arcade/arcade-engine.js';
import { hasDiscoveredArcade } from './arcade/arcade-discovery.js';
import { appendLine, showToast } from './ui.js';

const ARCADE_KEY = 'arcade_unlocked';
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
  playBuzzerError();
  if (hasDiscoveredArcade()) {
    openArcadeGame({ freeplay: true });
    return;
  }
  declineCount++;

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

  const phrases = CONTENT.declineGame.declinePhrases;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  appendLine(
    `<span class='text-rose-400 font-bold'>[${CONTENT.declineGame.declinedTag} #${declineCount}] ${phrase}</span>`
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
      `<span class='text-cyan-400 font-extrabold text-sm mt-2'>${CONTENT.declineGame.phaseLogs.phase2}</span>`
    );
    return;
  }

  if (declineCount === CONFIG.game.phase3_clicks) {
    appendLine(
      `<span class='text-fuchsia-400 font-extrabold text-sm mt-2'>${CONTENT.declineGame.phaseLogs.phase3}</span>`
    );
    fleeInterval = setInterval(() => {
      moveDeclineButton();
      playTone(500, 'sine', 0.05, 0.01);
    }, CONFIG.game.jumpIntervalSlow);
    return;
  }

  if (declineCount === CONFIG.game.phase4_clicks) {
    appendLine(
      `<span class='text-amber-400 font-extrabold text-sm mt-2'>${CONTENT.declineGame.phaseLogs.phase4}</span>`
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
    clearInterval(fleeInterval);
    fleeInterval = null;
    appendLine(
      `<span class='text-emerald-400 font-extrabold text-sm mt-2'>${CONTENT.declineGame.phaseLogs.phase5}</span>`
    );
    showToast(CONTENT.declineGame.arcade.toast);

    root.classList.remove('egg-rotate', 'egg-drunk');
    currentRotation = 0;
    document.documentElement.style.setProperty('--game-rot', '0deg');
    sessionStorage.setItem(ARCADE_KEY, 'true');
    settleFiechButton(button);
    openArcadeGame();
  }
}

// Fiech-Button ruhig zurück in die Action-Bar (kein Flüchten mehr nach dem Arcade-Unlock)
function settleFiechButton(button) {
  const wrapper = document.getElementById('declineWrapper');
  button.classList.remove('awake', 'flee-slow', 'flee-fast');
  button.removeAttribute('style');
  button.className =
    'absolute inset-0 w-full h-full btn-fiech active:scale-95 transition-all duration-300 z-[60]';
  wrapper.appendChild(button);
  wrapper.classList.remove('flex-1');
  wrapper.classList.add('w-14', 'shrink-0');
  document.getElementById('declineGhost').style.opacity = '0';
}
