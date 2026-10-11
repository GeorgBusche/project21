/* =====================================================================
   🎮 2. FX ENGINE & AUDIO SYNTHESIZER
   ===================================================================== */
let fxAnimFrame = null;
let audioCtx = null;
let soundEnabled = true;

const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
let particles = [];
let lasers = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor(x, y, colorOrEmoji, size, speedX, speedY, shape) {
    this.x = x; this.y = y; this.color = colorOrEmoji; this.size = size;
    this.speedX = speedX; this.speedY = speedY;
    this.gravity = 0.35; this.friction = 0.98;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;
    this.shape = shape; this.opacity = 1;
  }
  update() {
    this.speedX *= this.friction; this.speedY *= this.friction;
    this.speedY += this.gravity; this.x += this.speedX; this.y += this.speedY;
    this.rotation += this.rotationSpeed; this.opacity -= 0.009;
  }
  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.opacity);
    c.translate(this.x, this.y); c.rotate((this.rotation * Math.PI) / 180);
    if (this.shape === 'emoji') {
      c.font = `${this.size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(this.color, 0, 0);
    } else {
      c.fillStyle = this.color; c.shadowBlur = 10; c.shadowColor = this.color;
      if (this.shape === 'rect') c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.5);
      else if (this.shape === 'circle') { c.beginPath(); c.arc(0, 0, this.size / 2, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
}

function blastConfetti(originX, originY, count, colors, emojis = []) {
  for (let i = 0; i < count; i++) {
    const useEmoji = emojis.length > 0 && Math.random() > 0.6; 
    const colorOrEmoji = useEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : colors[Math.floor(Math.random() * colors.length)];
    const shape = useEmoji ? 'emoji' : (Math.random() > 0.5 ? 'rect' : 'circle');
    const angle = Math.random() * Math.PI * 2; const velocity = 8 + Math.random() * 25;
    particles.push(new Particle(originX, originY, colorOrEmoji, useEmoji ? (30 + Math.random() * 25) : (6 + Math.random() * 12), Math.cos(angle) * velocity, Math.sin(angle) * velocity - (originY > canvas.height * 0.7 ? 16 : 4), shape));
  }
}

function fireLaserBurst() {
  const colors = ['#06b6d4', '#f43f5e', '#22c55e', '#a855f7', '#f59e0b', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI; const length = canvas.height * 1.5;
    lasers.push({ x1: canvas.width / 2, y1: canvas.height * 0.15, x2: canvas.width / 2 + Math.cos(angle) * length, y2: canvas.height * 0.15 + Math.sin(angle) * length, color: colors[Math.floor(Math.random() * colors.length)], width: 3 + Math.random() * 8, life: 1 });
  }
}

function runFxEngine() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i]; ctx.save(); ctx.globalAlpha = l.life; ctx.strokeStyle = l.color;
    ctx.shadowColor = l.color; ctx.shadowBlur = 20; ctx.lineWidth = l.width;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.restore();
    l.life -= 0.1; if (l.life <= 0) lasers.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.update(); p.draw(ctx);
    if (p.opacity <= 0 || p.y > canvas.height + 100) particles.splice(i, 1);
  }
  if (particles.length > 0 || lasers.length > 0) fxAnimFrame = requestAnimationFrame(runFxEngine);
  else { cancelAnimationFrame(fxAnimFrame); fxAnimFrame = null; }
}

function ensureFxLoop() { if (!fxAnimFrame) fxAnimFrame = requestAnimationFrame(runFxEngine); }

function triggerShockwave(color = '#22c55e') {
  const ring = document.createElement('div');
  ring.className = 'shockwave-ring'; ring.style.borderColor = color; ring.style.boxShadow = `0 0 40px ${color}, inset 0 0 40px ${color}`;
  document.body.appendChild(ring); setTimeout(() => ring.remove(), 650);
}

function showSplashText(text, color = '#ffffff') {
  const splash = document.createElement('div');
  splash.className = 'splash-text'; splash.textContent = text; splash.style.color = color;
  document.body.appendChild(splash); setTimeout(() => splash.remove(), 800);
}

function getAudioContext() {
  if (!audioCtx) { const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (AudioContextClass) audioCtx = new AudioContextClass(); }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  const icon = document.getElementById('soundIcon');
  if (soundEnabled) { icon.textContent = '🔊'; showToast('Sound aktiviert'); playTone(880, 'sine', 0.1); } 
  else { icon.textContent = '🔇'; showToast('Sound stumm'); }
}

function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
  if (!soundEnabled) return;
  try {
    const context = getAudioContext(); if (!context) return;
    const osc = context.createOscillator(); const gain = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, context.currentTime);
    gain.gain.setValueAtTime(gainVal, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(context.currentTime + duration);
  } catch (e) {}
}

function playBuzzerError() {
  if (!soundEnabled) return;
  try {
    const context = getAudioContext(); if (!context) return;
    const osc = context.createOscillator(); const gain = context.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(130, context.currentTime); osc.frequency.linearRampToValueAtTime(80, context.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(context.currentTime + 0.25);
  } catch (e) {}
}

function playSuccessChime() {
  if (!soundEnabled) return;
  [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.14, 0.08), i * 90));
}