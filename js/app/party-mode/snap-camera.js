import { playSuccessChime, playTone } from '../audio.js';
import { getPartyContext } from '../party-actions.js';
import { showToast } from '../ui.js';

const W = 540;
const H = 720;

export const SNAP_FILTERS = [
  { id: 'scanner', label: '🤖 PEGEL-SCANNER' },
  { id: 'wolle', label: '🎸 WOLLE-MODUS' },
  { id: 'rammstein', label: '🔥 RAMMSTEIN-PYRO' },
  { id: 'schuettelkorn', label: '🎊 SCHÜTTELKORN-BRAUSE' },
  { id: 'polaroid', label: '📸 POLAROID LOHHOF' }
];

const SCAN_TEXTS = [
  'SCAN: PEGEL KRITISCH 🚨',
  'SCAN: PEGEL STABIL 🍻',
  'SCAN: DURST ERKANNT 💧',
  'SCAN: SCHÜTTELKORN-ALARM 🌾',
  'SCAN: TANZBEIN AKTIV 🕺'
];

let stream = null;
let video = null;
let rafId = null;
let facingMode = 'user';
let currentFilter = 'scanner';
let caption = '';
let frozen = false;
let uploadedImage = null;
let scanText = SCAN_TEXTS[0];
let bubbles = [];
let posting = false;

const byId = (id) => document.getElementById(id);

function getGuestName() {
  try {
    const saved = JSON.parse(localStorage.getItem('party_rsvp_data'));
    if (saved?.name) return String(saved.name);
  } catch (_) {}
  return 'Party-Gast';
}

function renderFilterPills() {
  const container = byId('snapFilterPills');
  if (!container) return;
  container.innerHTML = SNAP_FILTERS.map((filter) => {
    const active = filter.id === currentFilter;
    return `<button type="button" onclick="setSnapFilter('${filter.id}')" class="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-mono whitespace-nowrap active:scale-95 transition ${
      active ? 'bg-cyan-500 text-black border-cyan-300 font-bold' : 'border-cyan-800 text-cyan-300'
    }">${filter.label}</button>`;
  }).join('');
}

export function setSnapFilter(filterId) {
  if (!SNAP_FILTERS.some((filter) => filter.id === filterId)) return;
  currentFilter = filterId;
  scanText = SCAN_TEXTS[Math.floor(Math.random() * SCAN_TEXTS.length)];
  playTone(700, 'sine', 0.03);
  renderFilterPills();
  if (frozen) drawFrame();
}

export function updateSnapCaption(value) {
  caption = String(value || '').slice(0, 60);
  if (frozen) drawFrame();
}

// ==========================================
// Zeichnen
// ==========================================

function drawSource(ctx, source, mirror) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh) return false;
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.save();
  if (mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

function stamp(ctx, text, y, color, size = 34, rotate = -0.06) {
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(rotate);
  ctx.font = `900 ${size}px Impact, Haettenschweiler, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function filterScanner(ctx, now) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,255,120,0.08)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
  const sweep = ((now / 18) % (H + 80)) - 40;
  const gradient = ctx.createLinearGradient(0, sweep - 30, 0, sweep + 30);
  gradient.addColorStop(0, 'rgba(0,255,120,0)');
  gradient.addColorStop(0.5, 'rgba(0,255,120,0.28)');
  gradient.addColorStop(1, 'rgba(0,255,120,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, sweep - 30, W, 60);

  ctx.strokeStyle = '#34ff9b';
  ctx.lineWidth = 2.5;
  const cx = W / 2;
  const cy = H / 2 - 30;
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.moveTo(cx - 100, cy);
  ctx.lineTo(cx - 40, cy);
  ctx.moveTo(cx + 40, cy);
  ctx.lineTo(cx + 100, cy);
  ctx.moveTo(cx, cy - 100);
  ctx.lineTo(cx, cy - 40);
  ctx.moveTo(cx, cy + 40);
  ctx.lineTo(cx, cy + 100);
  ctx.stroke();

  const corner = 46;
  [
    [14, 14, 1, 1],
    [W - 14, 14, -1, 1],
    [14, H - 14, 1, -1],
    [W - 14, H - 14, -1, -1]
  ].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * corner, y);
    ctx.stroke();
  });

  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillStyle = '#34ff9b';
  ctx.textAlign = 'left';
  const clock = new Date().toLocaleTimeString('de-DE');
  ctx.fillText('LOHHOF_49 // CAM_01', 26, 48);
  ctx.fillText(clock, 26, 74);
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.fillStyle = Math.floor(now / 500) % 2 ? '#ff4d4d' : '#34ff9b';
  ctx.fillText(scanText, W / 2, cy + 130);
  ctx.restore();
}

function filterWolle(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,170,40,0.22)';
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  const band = 64;
  const tile = 32;
  [0, H - band].forEach((top) => {
    for (let x = 0; x < W; x += tile) {
      for (let y = 0; y < band; y += tile) {
        const dark = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = dark ? '#8f0f14' : '#141414';
        ctx.fillRect(x, top + y, tile, tile);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, top + band / 2 - 1, W, 2);
  });
  ctx.fillStyle = '#e8b64a';
  ctx.fillRect(0, band - 4, W, 4);
  ctx.fillRect(0, H - band, W, 4);
  stamp(ctx, 'WAHNSINN! 🎸', 150, '#ffd24a', 52);
  ctx.restore();
}

function filterRammstein(ctx, now) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  const flicker = 0.85 + Math.sin(now / 90) * 0.1 + Math.random() * 0.05;
  const fire = ctx.createLinearGradient(0, H, 0, H * 0.45);
  fire.addColorStop(0, `rgba(255,120,0,${0.85 * flicker})`);
  fire.addColorStop(0.35, `rgba(220,30,0,${0.5 * flicker})`);
  fire.addColorStop(1, 'rgba(120,0,0,0)');
  ctx.fillStyle = fire;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 14; i += 1) {
    const x = (i * 83 + now / 6) % W;
    const y = H - ((now / 4 + i * 97) % (H * 0.5));
    ctx.fillStyle = `rgba(255,${150 + (i % 4) * 25},40,0.8)`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(10,10,10,0.8)';
  ctx.fillRect(0, 36, W, 56);
  stamp(ctx, 'FEUER FREI // GEORG 21', 64, '#ff5a1f', 32, 0);
  ctx.restore();
}

function ensureBubbles() {
  if (bubbles.length) return;
  bubbles = Array.from({ length: 28 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 4 + Math.random() * 14,
    speed: 0.6 + Math.random() * 1.8,
    drift: Math.random() * Math.PI * 2
  }));
}

function filterSchuettelkorn(ctx, now) {
  ensureBubbles();
  ctx.save();
  const colors = ['#ff2d95', '#22d3ee', '#a3e635', '#fbbf24'];
  ctx.lineWidth = 12;
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    const inset = 6 + index * 0;
    const dash = 60;
    ctx.setLineDash([dash, dash * 0.6]);
    ctx.lineDashOffset = -(now / 20) - index * 40;
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  });
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  bubbles.forEach((bubble) => {
    bubble.y -= bubble.speed;
    bubble.x += Math.sin(now / 400 + bubble.drift) * 0.6;
    if (bubble.y < -20) {
      bubble.y = H + 20;
      bubble.x = Math.random() * W;
    }
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bubble.x - bubble.r * 0.3, bubble.y - bubble.r * 0.3, bubble.r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 44, W, 56);
  stamp(ctx, 'ERST SCHÜTTELN, DANN TRINKEN! 🌾', 72, '#fde047', 28, 0);
  ctx.restore();
}

function drawPolaroidFrame(ctx) {
  const frameTop = 26;
  const frameSide = 26;
  const frameBottom = 130;
  ctx.save();
  ctx.fillStyle = '#f6f2e8';
  ctx.fillRect(0, 0, W, frameTop);
  ctx.fillRect(0, 0, frameSide, H);
  ctx.fillRect(W - frameSide, 0, frameSide, H);
  ctx.fillRect(0, H - frameBottom, W, frameBottom);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(frameSide, frameTop, W - frameSide * 2, H - frameTop - frameBottom);
  ctx.fillStyle = '#1f1f1f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillText('GEORGS 21. GEBURTSTAG', W / 2, H - frameBottom + 48);
  ctx.font = '22px "Courier New", monospace';
  ctx.fillText('19.12.2026 · LOHHOF', W / 2, H - frameBottom + 84);
  ctx.restore();
}

function drawCaptionBar(ctx) {
  const text = caption.trim();
  if (!text) return;
  const barHeight = 64;
  const y = currentFilter === 'polaroid' ? H - 130 - barHeight - 20 : Math.round(H * 0.7);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, y, W, barHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 30;
  ctx.font = `bold ${size}px sans-serif`;
  while (ctx.measureText(text).width > W - 40 && size > 14) {
    size -= 2;
    ctx.font = `bold ${size}px sans-serif`;
  }
  ctx.fillText(text, W / 2, y + barHeight / 2);
  ctx.restore();
}

function drawFrame(now = performance.now()) {
  const canvas = byId('snapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  let drawn = false;
  if (uploadedImage) drawn = drawSource(ctx, uploadedImage, false);
  else if (video && video.readyState >= 2) drawn = drawSource(ctx, video, facingMode === 'user');

  if (!drawn) {
    ctx.fillStyle = '#34d399';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('📷 Kamera startet...', W / 2, H / 2);
    return;
  }

  switch (currentFilter) {
    case 'scanner':
      filterScanner(ctx, now);
      break;
    case 'wolle':
      filterWolle(ctx);
      break;
    case 'rammstein':
      filterRammstein(ctx, now);
      break;
    case 'schuettelkorn':
      filterSchuettelkorn(ctx, now);
      break;
    case 'polaroid':
      drawPolaroidFrame(ctx);
      break;
    default:
  }
  drawCaptionBar(ctx);
}

function loop(now) {
  if (frozen) return;
  drawFrame(now);
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

// ==========================================
// Kamera
// ==========================================

function stopStream() {
  cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  if (video) {
    video.srcObject = null;
    video = null;
  }
}

async function startCamera() {
  stopStream();
  uploadedImage = null;
  if (!navigator.mediaDevices?.getUserMedia) {
    showUploadFallback('Kamera wird auf diesem Gerät nicht unterstützt.');
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 720 }, height: { ideal: 960 } },
      audio: false
    });
    // Falls das Modal während der Berechtigungsabfrage geschlossen wurde.
    if (byId('snapModal')?.classList.contains('hidden')) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
      return;
    }
    video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    byId('snapUploadFallback')?.classList.add('hidden');
    startLoop();
  } catch (err) {
    console.warn('Kamera nicht verfügbar', err);
    showUploadFallback('Kamera-Zugriff verweigert – wähle stattdessen ein Foto aus.');
  }
}

function showUploadFallback(message) {
  const box = byId('snapUploadFallback');
  const text = byId('snapUploadMessage');
  if (text) text.textContent = message;
  box?.classList.remove('hidden');
  drawFrame();
}

export function handleSnapFileUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    uploadedImage = image;
    byId('snapUploadFallback')?.classList.add('hidden');
    startLoop();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Bild konnte nicht geladen werden');
  };
  image.src = url;
  event.target.value = '';
}

export function switchSnapCamera() {
  if (frozen) return;
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  playTone(600, 'sine', 0.04);
  startCamera();
}

// ==========================================
// Modal, Auslöser, Posten
// ==========================================

function setFrozenUi(isFrozen) {
  frozen = isFrozen;
  byId('snapShutterRow')?.classList.toggle('hidden', isFrozen);
  byId('snapResultRow')?.classList.toggle('hidden', !isFrozen);
  byId('snapFilterPills')?.classList.toggle('hidden', isFrozen);
  byId('snapCaptionWrap')?.classList.toggle('hidden', isFrozen);
}

export function openSnapModal() {
  playTone(520, 'sine', 0.06);
  caption = '';
  const input = byId('snapCaptionInput');
  if (input) input.value = '';
  setFrozenUi(false);
  renderFilterPills();
  byId('snapModal')?.classList.remove('hidden');
  startCamera();
}

export function closeSnapModal() {
  stopStream();
  uploadedImage = null;
  setFrozenUi(false);
  byId('snapModal')?.classList.add('hidden');
}

export function takeSnap() {
  if (frozen) return;
  if (!video && !uploadedImage) {
    showToast('Noch kein Kamerabild – wähle ein Foto oder erlaube die Kamera');
    return;
  }
  drawFrame();
  setFrozenUi(true);
  cancelAnimationFrame(rafId);
  playTone(1800, 'square', 0.02);
  setTimeout(() => playTone(900, 'square', 0.04), 60);
  if (navigator.vibrate) navigator.vibrate(40);
  const flash = byId('snapFlash');
  if (flash) {
    flash.classList.remove('opacity-0');
    setTimeout(() => flash.classList.add('opacity-0'), 90);
  }
}

export function retakeSnap() {
  setFrozenUi(false);
  startLoop();
}

export function saveSnapToDevice() {
  const canvas = byId('snapCanvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.download = `lohhof_snap_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('💾 Foto gespeichert');
}

export async function postSnap() {
  const { database } = getPartyContext();
  const canvas = byId('snapCanvas');
  if (!database || !canvas || posting) return;
  posting = true;
  const button = byId('snapPostBtn');
  if (button) button.disabled = true;
  try {
    const id = `snap_${Date.now()}`;
    await database.ref(`snaps/${id}`).set({
      imageData: canvas.toDataURL('image/jpeg', 0.72),
      author: getGuestName(),
      filter: currentFilter,
      createdAt: Date.now(),
      likes: {}
    });
    playSuccessChime();
    showToast('🚀 Foto in der Galerie gepostet!');
    closeSnapModal();
    window.openGalleryModal?.();
  } catch (err) {
    console.error('Snap post failed', err);
    showToast('Posten fehlgeschlagen – Verbindung prüfen');
  } finally {
    posting = false;
    if (button) button.disabled = false;
  }
}
