import { ACHIEVEMENTS, getUnlockedIds } from './achievements.js';
import { playSuccessChime } from './audio.js';
import { CONTENT, EVENT_CORE, dateFormatted, locationFull } from '../content.js';
import { getPartyContext, getPegelDescription, openRsvpModal } from './party-actions.js';
import { showToast } from './ui.js';

const W = 1080;
const H = 1920;
const TEAR_Y = 1480;
const CONTENT_TOP = 290;
const CONTENT_BOTTOM = 1455;
const BOXES_DESIGN_TOP = 890;
const BOXES_HEIGHT = 560;
const BG = '#040807';
const MONO = '"Share Tech Mono", "Courier New", monospace';

let renderId = 0;
let rendered = false;

function getOwnRsvp() {
  const { deviceToken, getCachedRsvps } = getPartyContext();
  const cached = getCachedRsvps?.()[deviceToken];
  if (cached && cached.name) return cached;
  try {
    const local = JSON.parse(localStorage.getItem('party_rsvp_data'));
    return local && local.name ? local : null;
  } catch (_) {
    return null;
  }
}

const RANK_COLORS = ['#38bdf8', '#22c55e', '#06b6d4', '#f59e0b', '#f43f5e'];

function getTheme(pegel) {
  const ranks = CONTENT.ticket.ranks;
  const found = ranks.findIndex((rank) => pegel <= rank.maxPegel);
  const rankIndex = found === -1 ? ranks.length - 1 : found;
  return { color: RANK_COLORS[Math.min(rankIndex, RANK_COLORS.length - 1)], label: ranks[rankIndex].label };
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Verkleinert die Schrift, bis der Text in die Breite passt.
function fitFont(ctx, text, weight, size, maxWidth, minSize = 14) {
  let s = size;
  ctx.font = `${weight} ${s}px ${MONO}`;
  while (s > minSize && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${MONO}`;
  }
  return s;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function truncate(ctx, text, maxWidth) {
  let t = String(text);
  if (ctx.measureText(t).width <= maxWidth) return t;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function loadImage(src, cors) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawBox(ctx, x, y, w, h, color, title) {
  roundedRectPath(ctx, x, y, w, h, 18);
  ctx.fillStyle = hexToRgba(color, 0.07);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(color, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hexToRgba(color, 0.95);
  ctx.font = `bold 24px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, x + 24, y + 38);
}

function drawBackground(ctx, color) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = hexToRgba(color, 0.06);
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(W / 2, 420, 40, W / 2, 420, 700);
  glow.addColorStop(0, hexToRgba(color, 0.22));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 1100);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
}

function drawFrame(ctx, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  roundedRectPath(ctx, 30, 30, W - 60, H - 60, 36);
  ctx.stroke();
  ctx.restore();

  // Ausgestanzte Kerben links/rechts auf Höhe der Abreißlinie
  [30, W - 30].forEach((cx) => {
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(cx, TEAR_Y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, TEAR_Y, 46, cx < W / 2 ? -Math.PI / 2 : Math.PI / 2, cx < W / 2 ? Math.PI / 2 : (Math.PI * 3) / 2);
    ctx.stroke();
    ctx.restore();
  });

  ctx.save();
  ctx.setLineDash([22, 14]);
  ctx.strokeStyle = hexToRgba(color, 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, TEAR_Y);
  ctx.lineTo(W - 100, TEAR_Y);
  ctx.stroke();
  ctx.restore();
}

function drawHeader(ctx, color) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  fitFont(ctx, CONTENT.ticket.headerLine, 'bold', 34, 900);
  ctx.fillText(CONTENT.ticket.headerLine, W / 2, 115);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  const title = `${EVENT_CORE.hostName.toUpperCase()}S ${EVENT_CORE.age}. GEBURTSTAG`;
  fitFont(ctx, title, 'bold', 78, 920);
  ctx.fillText(title, W / 2, 205);
  ctx.restore();

  ctx.fillStyle = hexToRgba(color, 0.9);
  fitFont(ctx, CONTENT.ticket.vipLine, 'bold', 30, 900);
  ctx.fillText(CONTENT.ticket.vipLine, W / 2, 262);
}

// Verteilt alle Sektionen oberhalb der Abreißlinie gleichmäßig zwischen Header und TEAR_Y.
function computeLayout(rsvp, unlockedIcons) {
  const hasPlusOne = rsvp.plusOne === true;
  const hasTrophies = unlockedIcons.length > 0;
  const r = hasPlusOne || hasTrophies ? (hasPlusOne && hasTrophies ? 95 : 102) : 110;
  const heights = {
    avatar: 2 * r + 20,
    name: 84,
    badge: 52,
    plusOne: hasPlusOne ? 56 : 0,
    trophies: hasTrophies ? 110 : 0,
    boxes: BOXES_HEIGHT
  };
  const order = ['avatar', 'name', 'badge', 'plusOne', 'trophies', 'boxes'].filter((key) => heights[key] > 0);
  const total = order.reduce((sum, key) => sum + heights[key], 0);
  const gap = Math.max(12, (CONTENT_BOTTOM - CONTENT_TOP - total) / (order.length + 1));
  const tops = {};
  let y = CONTENT_TOP + gap;
  order.forEach((key) => {
    tops[key] = y;
    y += heights[key] + gap;
  });
  return { r, tops, hasPlusOne, hasTrophies };
}

function drawProfile(ctx, rsvp, theme, avatarImg, unlockedIcons, layout) {
  const { color } = theme;
  const { r, tops } = layout;
  const cx = W / 2;
  const cy = tops.avatar + r + 10;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 36;
  ctx.fillStyle = hexToRgba(color, 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (avatarImg) {
    const size = Math.min(avatarImg.width, avatarImg.height);
    ctx.drawImage(
      avatarImg,
      (avatarImg.width - size) / 2,
      (avatarImg.height - size) / 2,
      size,
      size,
      cx - r,
      cy - r,
      r * 2,
      r * 2
    );
  } else {
    const emoji = (rsvp.avatar && rsvp.avatar.value) || (typeof rsvp.avatar === 'string' ? rsvp.avatar : '😎');
    ctx.font = `${Math.round(r * 1.16)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emoji, cx, cy + 6);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  const name = String(rsvp.name || 'Party-Gast').toUpperCase();
  fitFont(ctx, name, 'bold', 84, 900, 32);
  ctx.fillText(name, cx, tops.name + 66);
  ctx.restore();

  // Rang-Label
  ctx.font = `bold 28px ${MONO}`;
  const labelW = ctx.measureText(theme.label).width + 60;
  roundedRectPath(ctx, cx - labelW / 2, tops.badge, labelW, 52, 26);
  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.label, cx, tops.badge + 27);
  ctx.textBaseline = 'alphabetic';

  if (layout.hasPlusOne) {
    const text = truncate(ctx, `👥 INKL. +1 BEGLEITUNG (${rsvp.plusOneName || 'VIP'})`, 840);
    ctx.font = `bold 28px ${MONO}`;
    const w = Math.min(920, ctx.measureText(text).width + 60);
    roundedRectPath(ctx, cx - w / 2, tops.plusOne, w, 56, 28);
    ctx.save();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(34,211,238,0.16)';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#67e8f9';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, tops.plusOne + 29);
    ctx.textBaseline = 'alphabetic';
  }

  if (layout.hasTrophies) {
    ctx.fillStyle = hexToRgba(color, 0.9);
    ctx.font = `bold 24px ${MONO}`;
    ctx.fillText(CONTENT.ticket.unlockedRanksTitle, cx, tops.trophies + 22);
    const gap = 96;
    const startX = cx - ((unlockedIcons.length - 1) * gap) / 2;
    ctx.font = '58px sans-serif';
    ctx.textBaseline = 'middle';
    unlockedIcons.forEach((icon, i) => ctx.fillText(icon, startX + i * gap, tops.trophies + 79));
    ctx.textBaseline = 'alphabetic';
  }
}

function drawInfoBoxes(ctx, rsvp, theme, pegel, coverImg) {
  const { color } = theme;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Datum & Ort
  drawBox(ctx, 70, 890, 450, 130, color, CONTENT.ticket.boxes.date);
  ctx.fillStyle = '#ffffff';
  fitFont(ctx, dateFormatted.toUpperCase(), 'bold', 32, 400);
  ctx.fillText(dateFormatted.toUpperCase(), 94, 972);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `bold 20px ${MONO}`;
  wrapText(ctx, EVENT_CORE.timeLabel.toUpperCase(), 400).forEach((line, i) =>
    ctx.fillText(line, 94, 996 + i * 22)
  );

  drawBox(ctx, 560, 890, 450, 130, color, CONTENT.ticket.boxes.location);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px ${MONO}`;
  wrapText(ctx, locationFull.toUpperCase(), 400).forEach((line, i) =>
    ctx.fillText(line, 584, 972 + i * 30)
  );

  // Kraftstoff
  drawBox(ctx, 70, 1040, 940, 90, color, CONTENT.ticket.boxes.drink);
  ctx.fillStyle = '#ffffff';
  const drink = String(rsvp.drink || CONTENT.ticket.drinkFallback).toUpperCase();
  fitFont(ctx, drink, 'bold', 32, 600, 18);
  ctx.textAlign = 'right';
  ctx.fillText(truncate(ctx, drink, 600), 986, 1096);
  ctx.textAlign = 'left';

  // Pegel
  drawBox(ctx, 70, 1150, 940, 150, color, CONTENT.ticket.boxes.pegel);
  ctx.fillStyle = color;
  ctx.font = `bold 38px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${pegel}%`, 986, 1196);
  ctx.textAlign = 'left';
  roundedRectPath(ctx, 94, 1212, 892, 30, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  if (pegel > 0) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    roundedRectPath(ctx, 94, 1212, Math.max(30, (892 * pegel) / 100), 30, 15);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#cbd5e1';
  const pegelDesc = `„${getPegelDescription(pegel)}“`;
  fitFont(ctx, pegelDesc, 'normal', 22, 890, 14);
  ctx.fillText(truncate(ctx, pegelDesc, 890), 94, 1278);

  // Hymne
  drawBox(ctx, 70, 1320, 940, 130, color, CONTENT.ticket.boxes.song);
  const coverX = 94;
  const coverY = 1342;
  const coverSize = 90;
  const hasSong = rsvp.song && rsvp.song.title;
  if (hasSong) {
    roundedRectPath(ctx, coverX, coverY + 12, coverSize - 22, coverSize - 22, 10);
    ctx.save();
    ctx.clip();
    if (coverImg) {
      ctx.drawImage(coverImg, coverX, coverY + 12, coverSize - 22, coverSize - 22);
    } else {
      ctx.fillStyle = hexToRgba(color, 0.2);
      ctx.fillRect(coverX, coverY + 12, coverSize - 22, coverSize - 22);
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🎵', coverX + (coverSize - 22) / 2, coverY + 12 + (coverSize - 22) / 2 + 3);
    }
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const textX = coverX + coverSize - 22 + 24;
    const maxW = 986 - textX;
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, rsvp.song.title, 'bold', 32, maxW, 18);
    ctx.fillText(truncate(ctx, rsvp.song.title, maxW), textX, 1392);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${MONO}`;
    ctx.fillText(truncate(ctx, rsvp.song.artist || CONTENT.ticket.unknownArtist, maxW), textX, 1426);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `24px ${MONO}`;
    ctx.fillText(CONTENT.ticket.noSong, 94, 1410);
  }
}

function drawCoupon(ctx, theme, deviceToken) {
  const { color } = theme;
  const cx = W / 2;

  ctx.save();
  ctx.translate(cx, 1585);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  roundedRectPath(ctx, -400, -62, 800, 124, 20);
  ctx.fillStyle = hexToRgba(color, 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, CONTENT.ticket.stamp, 'bold', 74, 740);
  ctx.fillText(CONTENT.ticket.stamp, 0, 4);
  ctx.restore();

  // Strichcode aus dem deviceToken
  const rand = seededRandom(hashSeed(deviceToken || 'LOH21'));
  let x = 170;
  ctx.fillStyle = '#e2e8f0';
  while (x < W - 170) {
    const bar = 2 + Math.floor(rand() * 6);
    const space = 2 + Math.floor(rand() * 5);
    if (x + bar > W - 170) break;
    ctx.fillRect(x, 1690, bar, 100);
    x += bar + space;
  }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  const serial = `TICKET-ID: #LOH21-${String(deviceToken || 'GUEST000').slice(-6).toUpperCase()}`;
  fitFont(ctx, serial, 'bold', 32, 800);
  ctx.fillText(serial, cx, 1838);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `20px ${MONO}`;
  ctx.fillText(CONTENT.ticket.footerLines[0], cx, 1872);
  ctx.fillText(CONTENT.ticket.footerLines[1], cx, 1898);
}

async function renderTicket() {
  const canvas = document.getElementById('ticketCanvas');
  const rsvp = getOwnRsvp();
  if (!canvas || !rsvp) return false;

  const myRender = ++renderId;
  const { deviceToken } = getPartyContext();
  const pegel = Math.min(100, Math.max(0, parseInt(rsvp.pegel, 10) || 0));
  const theme = getTheme(pegel);

  try {
    await document.fonts?.load?.(`bold 30px "Share Tech Mono"`);
  } catch (_) {}

  const avatarImg =
    rsvp.avatar && rsvp.avatar.type === 'image' ? await loadImage(rsvp.avatar.value, false) : null;
  const coverImg = rsvp.song && rsvp.song.cover ? await loadImage(rsvp.song.cover, true) : null;
  if (myRender !== renderId) return false;

  const ownIds = getUnlockedIds();
  const ids = ownIds.length > 0 ? ownIds : Array.isArray(rsvp.achievements) ? rsvp.achievements : [];
  const icons = ACHIEVEMENTS.filter((a) => ids.includes(a.id)).map((a) => a.icon);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, theme.color);
  drawHeader(ctx, theme.color);
  const layout = computeLayout(rsvp, icons);
  drawProfile(ctx, rsvp, theme, avatarImg, icons, layout);
  // Info-Boxen sind auf y = 890 gezeichnet und werden an die berechnete Position verschoben.
  ctx.save();
  ctx.translate(0, layout.tops.boxes - BOXES_DESIGN_TOP);
  drawInfoBoxes(ctx, rsvp, theme, pegel, coverImg);
  ctx.restore();
  drawFrame(ctx, theme.color);
  drawCoupon(ctx, theme, deviceToken);
  rendered = true;
  return true;
}

export async function openTicketModal() {
  if (!getOwnRsvp()) {
    showToast('⚠️ Bitte sag zuerst zu, um dein VIP-Ticket zu generieren!');
    openRsvpModal();
    return;
  }
  document.getElementById('ticketModal')?.classList.remove('hidden');
  rendered = false;
  const ok = await renderTicket();
  if (ok) playSuccessChime();
}

export function closeTicketModal() {
  renderId++;
  document.getElementById('ticketModal')?.classList.add('hidden');
}

function getTicketBlob() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('ticketCanvas');
    if (!canvas || !rendered) return resolve(null);
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function downloadTicketImage() {
  const blob = await getTicketBlob();
  if (!blob) {
    showToast('⚠️ Ticket wird noch erstellt – gleich nochmal versuchen.');
    return;
  }
  const name = String(getOwnRsvp()?.name || 'gast')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `georg21_vip_ticket_${name || 'gast'}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('💾 Ticket gespeichert!');
}

export async function shareTicketImage() {
  const blob = await getTicketBlob();
  if (!blob) {
    showToast('⚠️ Ticket wird noch erstellt – gleich nochmal versuchen.');
    return;
  }
  const file = new File([blob], 'georg21_vip_ticket.png', { type: 'image/png' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mein VIP-Ticket für Georgs 21. Geburtstag!' });
    } catch (error) {
      if (error && error.name !== 'AbortError') downloadTicketImage();
    }
    return;
  }
  downloadTicketImage();
}
