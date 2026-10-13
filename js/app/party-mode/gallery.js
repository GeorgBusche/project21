import { formatRelativeTime, getPartyContext } from '../party-actions.js';
import { playTone } from '../audio.js';
import { escapeHtml, showToast } from '../ui.js';

let snaps = {};
let listening = false;
let lightboxId = null;

const byId = (id) => document.getElementById(id);

function isAdmin() {
  try {
    return sessionStorage.getItem('party_admin_auth') === 'true';
  } catch (_) {
    return false;
  }
}

function sortedSnaps() {
  return Object.entries(snaps)
    .map(([id, snap]) => ({ id, ...snap }))
    .filter((snap) => typeof snap.imageData === 'string' && snap.imageData.startsWith('data:image/'))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function startListening() {
  const { database } = getPartyContext();
  if (listening || !database) return;
  listening = true;
  database.ref('snaps').on('value', (snapshot) => {
    snaps = snapshot.val() || {};
    renderGallery();
    if (lightboxId) {
      if (snaps[lightboxId]) renderLightbox();
      else closeLightbox();
    }
  });
}

function renderGallery() {
  const grid = byId('galleryGrid');
  const count = byId('galleryCount');
  const list = sortedSnaps();
  if (count) count.textContent = `${list.length} ${list.length === 1 ? 'Foto' : 'Fotos'}`;
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML =
      '<div class="col-span-2 p-6 text-center text-xs text-neutral-400 border border-dashed border-emerald-900 rounded-lg">Noch keine Fotos. Knips das erste! 📸</div>';
    return;
  }

  const { deviceToken } = getPartyContext();
  grid.innerHTML = list
    .map((snap) => {
      const likeCount = Object.keys(snap.likes || {}).length;
      const liked = Boolean(snap.likes?.[deviceToken]);
      return `
        <div class="rounded-lg overflow-hidden border border-emerald-900 bg-neutral-900">
          <button type="button" onclick="openGalleryLightbox('${snap.id}')" class="block w-full aspect-[3/4] bg-black">
            <img src="${snap.imageData}" alt="Foto von ${escapeHtml(snap.author || 'Gast')}" loading="lazy" class="w-full h-full object-cover" />
          </button>
          <div class="p-1.5 flex items-center justify-between gap-1">
            <div class="min-w-0">
              <div class="text-[11px] font-bold text-emerald-200 truncate">${escapeHtml(snap.author || 'Party-Gast')}</div>
              <div class="text-[9px] text-neutral-500">${escapeHtml(formatRelativeTime(snap.createdAt))}</div>
            </div>
            <button type="button" onclick="toggleSnapLike('${snap.id}')" class="flex-shrink-0 px-2 py-1 rounded-full border text-[11px] active:scale-90 transition ${
              liked ? 'border-orange-500 bg-orange-950/50 text-orange-300' : 'border-neutral-700 text-neutral-300'
            }">🔥 ${likeCount}</button>
          </div>
        </div>`;
    })
    .join('');
}

export function toggleSnapLike(snapId) {
  const { database, deviceToken } = getPartyContext();
  if (!database || !snaps[snapId]) return;
  playTone(780, 'sine', 0.04);
  database.ref(`snaps/${snapId}/likes/${deviceToken}`).transaction((current) => (current ? null : true));
}

function renderLightbox() {
  const snap = snaps[lightboxId];
  const box = byId('galleryLightbox');
  if (!snap || !box) return;
  const image = byId('galleryLightboxImg');
  if (image) image.src = snap.imageData;
  const meta = byId('galleryLightboxMeta');
  if (meta) {
    meta.textContent = `${snap.author || 'Party-Gast'} · ${formatRelativeTime(snap.createdAt)} · 🔥 ${Object.keys(snap.likes || {}).length}`;
  }
  byId('galleryDeleteBtn')?.classList.toggle('hidden', !isAdmin());
  box.classList.remove('hidden');
}

export function openGalleryLightbox(snapId) {
  if (!snaps[snapId]) return;
  lightboxId = snapId;
  playTone(600, 'sine', 0.04);
  renderLightbox();
}

function closeLightbox() {
  lightboxId = null;
  byId('galleryLightbox')?.classList.add('hidden');
}

export function closeGalleryLightbox() {
  closeLightbox();
}

export function downloadGalleryPhoto() {
  const snap = snaps[lightboxId];
  if (!snap) return;
  const link = document.createElement('a');
  link.href = snap.imageData;
  link.download = `lohhof_${lightboxId}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function deleteGalleryPhoto() {
  const { database } = getPartyContext();
  if (!database || !lightboxId || !isAdmin()) return;
  if (!window.confirm('Dieses Foto wirklich löschen?')) return;
  const id = lightboxId;
  database
    .ref(`snaps/${id}`)
    .remove()
    .then(() => showToast('🗑️ Foto gelöscht'))
    .catch(() => showToast('Löschen fehlgeschlagen'));
}

export function openGalleryModal() {
  playTone(520, 'sine', 0.06);
  startListening();
  renderGallery();
  byId('galleryModal')?.classList.remove('hidden');
}

export function closeGalleryModal() {
  closeLightbox();
  byId('galleryModal')?.classList.add('hidden');
}

export function openSnapFromGallery() {
  closeGalleryModal();
  window.openSnapModal?.();
}
