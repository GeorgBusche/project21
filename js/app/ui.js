import { CONFIG } from '../config.js';
import { getAudioContext, playTone } from './audio.js';

export function toggleCRT() {
  document.body.classList.toggle('crt-overlay');
  showToast('CRT-Filter umgeschaltet');
  playTone(400, 'sine', 0.05);
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .catch(() => showToast('Vollbild wird nicht unterstützt.'));
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

export function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;

  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2200);
}

export function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]
  );
}

export function appendLine(html, delay = 0) {
  setTimeout(() => {
    const output = document.getElementById('terminalOutput');
    if (!output) return;

    const line = document.createElement('div');
    line.innerHTML = html;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    playTone(1300 + Math.random() * 300, 'sine', 0.015, 0.02);
  }, delay);
}

function updatePartyCountdown() {
  const badge = document.getElementById('partyCountdown');
  if (!badge) return;

  const diff = new Date(CONFIG.party.startIso).getTime() - Date.now();
  if (Number.isNaN(diff)) {
    badge.textContent = '';
    return;
  }
  if (diff <= 0) {
    badge.textContent = '🔥 ESKALATION LÄUFT!';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  badge.textContent = `T-MINUS: ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

let countdownTimer = null;

export function startBootSequence() {
  updatePartyCountdown();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(updatePartyCountdown, 1000);
  const bootSequence = [
    {
      text: "<span class='text-emerald-500'>[SYS]</span> Lade Linux kernel 6.8.0-partyraum-generic...",
      delay: 100
    },
    {
      text: "<span class='text-emerald-500'>[MEM]</span> Initialisiere Hopfenspeicher & Mischen... <span class='text-emerald-400 font-bold'>[OK]</span>",
      delay: 350
    },
    {
      text: "<span class='text-cyan-400'>[AUDIO]</span> Druckkammer Lohhof: 120 dB eingemessen... <span class='text-emerald-400 font-bold'>[MAX]</span>",
      delay: 750
    },
    {
      text: `<span class='text-emerald-500'>[AUTH]</span> Host: <strong class='text-emerald-200'>${CONFIG.party.hostName}</strong> | Upgrade: <strong>v20.0 &rarr; v21.0</strong>`,
      delay: 1700
    },
    { text: '------------------------------------------------------------', delay: 1950 },
    {
      text: `<span class='text-cyan-300 font-bold text-sm'>🚨 OFFIZIELLE EINLADUNG: ${CONFIG.party.hostName.toUpperCase()}'S 21. GEBURTSTAG 🚨</span>`,
      delay: 2150
    },
    {
      text: "Nutze die Action-Bar unten für <strong class='text-emerald-300 bg-emerald-950 px-1 rounded'>ZUSAGEN</strong> oder <strong class='text-amber-300'>SUDO</strong>.",
      delay: 2550
    }
  ];

  bootSequence.forEach((item) => appendLine(item.text, item.delay));
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}
