import { playBuzzerError, playSuccessChime, playTone } from './audio.js';

const BOSS_MAX_HP = 300;
const HIT_DAMAGE = 15;
const PHASE_B_HP = 180;
const PHASE_C_HP = 75;
const FIGHT_SECONDS = 25;
const BOMB_INTERVAL_MS = 1800;
const BOMB_FUSE_MS = 2500;
const BOMB_DAMAGE = 20;
const CLONE_COUNT = 3;
const PHASE_C_SHIELD_DRAIN_PER_SEC = 3;

const EXCUSES = [
  '🛋️ Sofa ruft',
  '🤕 Kopfweh',
  '👵 Oma-Geburtstag',
  '🌧️ Es regnet',
  '🐕 Hund hat Hausaufgaben',
  '📺 Serie läuft',
  '🥱 Zu müde'
];

const OVERLAY_HTML = `
  <div class="absolute inset-0 flex flex-col p-2 sm:p-3 max-w-3xl mx-auto">
    <div class="flex-shrink-0 border border-rose-700 bg-black/70 rounded-lg p-2 shadow-[0_0_25px_rgba(244,63,94,0.45)]">
      <div class="text-[11px] sm:text-sm font-extrabold text-rose-400 tracking-wide text-center">☠️ ENDGEGNER: OMEGA-FIECH v21.0 (AUSREDEN-WÄCHTER)</div>
      <div id="bossPhaseStatus" class="text-[10px] sm:text-xs text-amber-300 text-center font-mono mt-0.5 min-h-[1.2em]"></div>
      <div class="mt-1.5 h-4 rounded-full bg-neutral-900 border border-rose-900 overflow-hidden">
        <div id="bossHpBar" class="h-full w-full bg-gradient-to-r from-orange-500 to-rose-600 shadow-[0_0_14px_rgba(244,63,94,0.9)] transition-all duration-150"></div>
      </div>
      <div id="bossHpText" class="text-[11px] text-rose-300 font-mono text-center mt-0.5">HP: 300 / 300</div>
    </div>

    <div id="bossArena" class="relative flex-1 my-2 rounded-lg border border-rose-900/60 overflow-hidden touch-manipulation"></div>

    <div class="flex-shrink-0 border border-cyan-700 bg-black/70 rounded-lg p-2">
      <div class="flex justify-between text-[11px] text-cyan-300 font-bold mb-1">
        <span>🛡️ DEIN AUSREDEN-SCHILD</span>
        <span id="bossTimer" class="font-mono text-amber-300">25s</span>
      </div>
      <div class="h-3 rounded-full bg-neutral-900 border border-cyan-900 overflow-hidden">
        <div id="playerShieldBar" class="h-full w-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-150"></div>
      </div>
    </div>

    <div id="bossEndPanel" class="hidden absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center text-center p-6 gap-5">
      <div id="bossEndText" class="text-sm sm:text-base font-bold leading-relaxed max-w-md"></div>
      <button id="bossEndBtn" type="button" class="px-5 py-3 rounded-lg font-extrabold text-sm active:scale-95 transition"></button>
    </div>
  </div>
`;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function omegaFiechHtml(isReal) {
  return `
    <div class="monster-brow left"></div><div class="monster-brow right"></div>
    <div class="monster-eye left"></div><div class="monster-eye right"></div>
    ${isReal ? '<span class="omega-crown">👑</span>' : ''}
    <span class="text-3xl font-black relative z-10 leading-none" style="color: black;">X</span>
    <div class="monster-leg left"></div><div class="monster-leg right"></div>`;
}

export function startBossFight({ onExit }) {
  let overlay = document.getElementById('bossFightOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bossFightOverlay';
    overlay.className =
      'fixed inset-0 z-[99990] hidden select-none overflow-hidden bg-black/85 backdrop-blur-sm';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = OVERLAY_HTML;

  const arena = overlay.querySelector('#bossArena');
  const hpBar = overlay.querySelector('#bossHpBar');
  const hpText = overlay.querySelector('#bossHpText');
  const shieldBar = overlay.querySelector('#playerShieldBar');
  const timerEl = overlay.querySelector('#bossTimer');
  const statusEl = overlay.querySelector('#bossPhaseStatus');
  const endPanel = overlay.querySelector('#bossEndPanel');
  const endText = overlay.querySelector('#bossEndText');
  const endBtn = overlay.querySelector('#bossEndBtn');

  let hp = BOSS_MAX_HP;
  let shield = 100;
  let phase = 'intro';
  let timeLeft = FIGHT_SECONDS;
  let boss = null;
  let clones = [];
  const bombs = new Set();
  const timeouts = new Set();
  const intervals = new Set();

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timeouts.delete(id);
      fn();
    }, ms);
    timeouts.add(id);
    return id;
  };
  const every = (fn, ms) => {
    const id = setInterval(fn, ms);
    intervals.add(id);
    return id;
  };

  function cleanupTimers() {
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    timeouts.clear();
    intervals.clear();
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateHud() {
    hpBar.style.width = `${(hp / BOSS_MAX_HP) * 100}%`;
    hpText.textContent = `HP: ${Math.max(0, hp)} / ${BOSS_MAX_HP}`;
    shieldBar.style.width = `${Math.max(0, shield)}%`;
    timerEl.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;
  }

  function arenaSize() {
    const rect = arena.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function randomSpot(avoid = []) {
    const { w, h } = arenaSize();
    for (let i = 0; i < 25; i++) {
      const x = rand(40, Math.max(41, w - 130));
      const y = rand(40, Math.max(41, h - 110));
      if (avoid.every((p) => Math.hypot(p.x - x, p.y - y) > 110)) return { x, y };
    }
    return { x: rand(40, Math.max(41, w - 130)), y: rand(40, Math.max(41, h - 110)) };
  }

  function placeAt(el, spot) {
    el.style.left = `${spot.x}px`;
    el.style.top = `${spot.y}px`;
  }

  function placeAll() {
    const used = [];
    [boss, ...clones].forEach((el) => {
      const spot = randomSpot(used);
      used.push(spot);
      placeAt(el, spot);
    });
  }

  function shake(ms = 350) {
    overlay.classList.add('cam-speed-shake');
    later(() => overlay.classList.remove('cam-speed-shake'), ms);
  }

  function floatText(text, x, y, className) {
    const rect = arena.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `boss-float-text ${className || ''}`;
    el.textContent = text;
    el.style.left = `${x - rect.left}px`;
    el.style.top = `${y - rect.top}px`;
    arena.appendChild(el);
    later(() => el.remove(), 900);
  }

  function damageShield(amount) {
    shield = Math.max(0, shield - amount);
    updateHud();
    if (shield <= 0) endFight(false);
  }

  function spawnBomb() {
    if (phase !== 'A' && phase !== 'B') return;
    const { w, h } = arenaSize();
    const bomb = document.createElement('button');
    bomb.type = 'button';
    bomb.className = 'boss-bomb';
    bomb.textContent = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
    bomb.style.left = `${rand(10, Math.max(11, w - 150))}px`;
    bomb.style.top = `${rand(10, Math.max(11, h - 60))}px`;
    bomb.style.animationDuration = `${BOMB_FUSE_MS}ms`;
    arena.appendChild(bomb);
    bombs.add(bomb);
    playTone(220, 'square', 0.06, 0.03);

    const fuse = later(() => {
      if (!bombs.delete(bomb)) return;
      const rect = bomb.getBoundingClientRect();
      bomb.remove();
      floatText('💥 -20% SCHILD', rect.left + rect.width / 2, rect.top, 'boss-float-bad');
      playBuzzerError();
      shake();
      damageShield(BOMB_DAMAGE);
    }, BOMB_FUSE_MS);

    const defuse = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!bombs.delete(bomb)) return;
      clearTimeout(fuse);
      timeouts.delete(fuse);
      const rect = bomb.getBoundingClientRect();
      bomb.remove();
      floatText('✔ ENTSCHÄRFT', rect.left + rect.width / 2, rect.top, 'boss-float-good');
      playTone(1000, 'triangle', 0.05, 0.04);
    };
    bomb.addEventListener('pointerdown', defuse);
  }

  function hitBoss(event) {
    event.preventDefault();
    event.stopPropagation();
    if (phase !== 'A' && phase !== 'B' && phase !== 'C') return;

    hp = Math.max(0, hp - HIT_DAMAGE);
    const crit = Math.random() < 0.2;
    floatText(crit ? 'KRITISCH! -15' : '-15', event.clientX, event.clientY, crit ? 'boss-float-crit' : 'boss-float-hit');
    playTone(crit ? 1500 : 900, 'sawtooth', 0.06, 0.05);
    playTone(crit ? 700 : 400, 'square', 0.05, 0.03);
    boss.classList.remove('omega-hit');
    void boss.offsetWidth;
    boss.classList.add('omega-hit');
    updateHud();

    if (hp <= 0) {
      endFight(true);
      return;
    }

    if (phase === 'A' && hp <= PHASE_B_HP) {
      enterPhaseB();
    } else if (phase === 'B' && hp <= PHASE_C_HP) {
      enterPhaseC();
    } else if (phase === 'A' || phase === 'B') {
      placeAll();
    }
  }

  function hitClone(event) {
    event.preventDefault();
    event.stopPropagation();
    if (phase !== 'B') return;
    hp = Math.min(BOSS_MAX_HP, hp + HIT_DAMAGE);
    floatText('HA HA! +15 HP', event.clientX, event.clientY, 'boss-float-bad');
    playBuzzerError();
    updateHud();
    placeAll();
  }

  function makeFiech(isReal) {
    const el = document.createElement('button');
    el.type = 'button';
    el.innerHTML = omegaFiechHtml(isReal);
    if (isReal) {
      el.id = 'omegaFiechBtn';
      el.className = 'btn-fiech awake omega-fiech';
      el.addEventListener('pointerdown', hitBoss);
    } else {
      el.className = 'btn-fiech awake omega-fiech omega-clone';
      el.addEventListener('pointerdown', hitClone);
    }
    arena.appendChild(el);
    return el;
  }

  function enterPhaseB() {
    phase = 'B';
    setStatus('PHASE B: SCHATTEN-KLONE – nur das 👑-Fiech ist echt!');
    playTone(160, 'sawtooth', 0.4, 0.06);
    floatText(
      '[WARNUNG] OMEGA-FIECH NUTZT SCHATTEN-KLONE!',
      arena.getBoundingClientRect().left + arenaSize().w / 2,
      arena.getBoundingClientRect().top + 40,
      'boss-float-warn'
    );
    clones = Array.from({ length: CLONE_COUNT }, () => makeFiech(false));
    placeAll();
  }

  function enterPhaseC() {
    phase = 'C';
    clones.forEach((c) => c.remove());
    clones = [];
    bombs.forEach((b) => b.remove());
    bombs.clear();
    setStatus('⚡ SCHILD GEBROCHEN! SPAM-KLICK AUF DAS FIECH ZUM FINISHER!');
    boss.classList.add('omega-berserk');
    const { w, h } = arenaSize();
    boss.style.left = `${w / 2 - 45}px`;
    boss.style.top = `${h / 2 - 38}px`;
    playTone(70, 'sawtooth', 0.8, 0.08);
    shake(600);
    every(() => {
      if (phase !== 'C') return;
      playTone(rand(500, 900), 'square', 0.03, 0.02);
    }, 250);
  }

  function tick() {
    timeLeft -= 0.1;
    if (phase === 'C') shield -= PHASE_C_SHIELD_DRAIN_PER_SEC * 0.1;
    updateHud();
    if (shield <= 0) endFight(false);
    else if (timeLeft <= 0) endFight(false);
  }

  function finish() {
    cleanupTimers();
    overlay.classList.add('hidden');
    overlay.classList.remove('cam-speed-shake');
    overlay.innerHTML = '';
    onExit();
  }

  function endFight(won) {
    if (phase === 'over') return;
    phase = 'over';
    cleanupTimers();
    bombs.forEach((b) => b.remove());
    bombs.clear();
    clones.forEach((c) => c.remove());
    clones = [];
    updateHud();

    endPanel.classList.remove('hidden');
    endPanel.classList.add('flex');
    if (won) {
      setStatus('🏆 OMEGA-FIECH BESIEGT');
      boss.remove();
      playSuccessChime();
      explode();
      endText.className = 'text-sm sm:text-base font-bold leading-relaxed max-w-md text-emerald-300 boss-slowmo';
      endText.textContent =
        '🏆 OMEGA-FIECH ZERSTÖRT! ... Leider ist bei der Explosion auch das Absage-Modul der Webseite komplett abgebrannt.';
      endBtn.className =
        'px-5 py-3 rounded-lg font-extrabold text-sm active:scale-95 transition bg-gradient-to-r from-emerald-500 to-cyan-400 text-black';
      endBtn.textContent = '👍 Na gut, dann halt ZUSAGEN (Ehren-Gast)';
      endBtn.onclick = () => {
        finish();
        window.dispatchEvent(new CustomEvent('boss-fight-result', { detail: { won: true } }));
      };
    } else {
      setStatus('💀 NIEDERLAGE');
      playBuzzerError();
      shake(500);
      endText.className = 'text-sm sm:text-base font-bold leading-relaxed max-w-md text-rose-300';
      endText.textContent =
        '👹 AUSREDEN-SCHILD GEBROCHEN! Widerstand gegen Georgs 21. Geburtstag ist zwecklos!';
      endBtn.className =
        'px-5 py-3 rounded-lg font-extrabold text-sm active:scale-95 transition bg-gradient-to-r from-rose-600 to-orange-500 text-white';
      endBtn.textContent = '🏳️ Ich ergebe mich & sage zu';
      endBtn.onclick = () => {
        finish();
        window.dispatchEvent(new CustomEvent('boss-fight-result', { detail: { won: false } }));
      };
    }
  }

  function explode() {
    const rect = overlay.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const colors = ['#f43f5e', '#f59e0b', '#22d3ee', '#22c55e', '#e879f9', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'boss-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = rand(80, Math.max(rect.width, rect.height) * 0.6);
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      overlay.appendChild(p);
      setTimeout(() => p.remove(), 1600);
    }
  }

  // Intro: Sirene, Kamerawackeln, dann Kampfstart
  overlay.classList.remove('hidden');
  shake(1500);
  setStatus('⚠️ ALARM! ENDGEGNER ERSCHEINT...');
  playTone(55, 'sawtooth', 1.4, 0.1);
  for (let i = 0; i < 10; i++) {
    later(() => playTone(300 + i * 70 + (i % 2) * 60, 'sawtooth', 0.12, 0.05), i * 140);
  }
  updateHud();

  later(() => {
    phase = 'A';
    setStatus('PHASE A: TELEPORT & AUSREDEN-HAGEL – klick die Bomben weg!');
    boss = makeFiech(true);
    placeAt(boss, randomSpot());
    every(spawnBomb, BOMB_INTERVAL_MS);
    every(tick, 100);
  }, 1500);
}
