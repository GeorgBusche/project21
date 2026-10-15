import { getSavedPlayerName, savePlayerName, cleanPlayerName, PLAYER_NAME_PENDING_KEY } from '../player-identity.js';
import { PROFILE_AVATAR_PENDING_KEY } from '../profile-avatar.js';
export { getSavedPlayerName } from '../player-identity.js';
const LOCAL_KEY = 'arcade_highscore';

function getDb() {
  try {
    return window.firebase?.apps?.length ? window.firebase.database() : null;
  } catch (error) {
    console.error('Bestenliste konnte nicht geladen werden.', error);
    return null;
  }
}

const ANON_NAME = 'Anonymes Fiech';

export const getPlayerName = () => getSavedPlayerName() || ANON_NAME;

export async function persistPlayerName(name) {
  const clean = savePlayerName(name);
  localStorage.setItem(PLAYER_NAME_PENDING_KEY, clean);
  await syncLeaderboardName(clean);
  return clean;
}

// Name separat schreiben, damit Rekorde und RSVP-Status unveraendert bleiben.
export async function syncLeaderboardName(name) {
  const db = getDb();
  const token = localStorage.getItem('party_device_token');
  const clean = cleanPlayerName(name);
  if (!clean) throw new Error('Bitte gib deinen Namen ein.');
  if (!db || !token) throw new Error('Keine Verbindung zur Bestenliste.');
  const ref = db.ref(`arcadeLeaderboard/${token}`);
  await ref.once('value');
  await ref.child('name').set(clean);
  const own = await db.ref(`rsvps/${token}`).once('value');
  if (own.exists()) await db.ref(`rsvps/${token}/name`).set(clean);
  const pendingAvatar = localStorage.getItem(PROFILE_AVATAR_PENDING_KEY);
  if (pendingAvatar) {
    if (own.exists()) await db.ref(`rsvps/${token}/avatar`).set(JSON.parse(pendingAvatar));
    if (localStorage.getItem(PROFILE_AVATAR_PENDING_KEY) === pendingAvatar)
      localStorage.removeItem(PROFILE_AVATAR_PENDING_KEY);
  }
  if (localStorage.getItem(PLAYER_NAME_PENDING_KEY) === clean)
    localStorage.removeItem(PLAYER_NAME_PENDING_KEY);
}

export function getLocalBest() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return {
      score: raw?.score || 0,
      maxStage: raw?.maxStage || 0,
      maxPercent: raw?.maxPercent || 0
    };
  } catch (_) {
    return { score: 0, maxStage: 0, maxPercent: 0 };
  }
}

export function mergeRemoteBest(entry) {
  if (!entry) return;
  const best = getLocalBest();
  const merged = {
    score: Math.max(best.score, Number(entry.score) || 0),
    maxStage: Math.max(best.maxStage, Number(entry.maxStage) || 0),
    maxPercent: Math.max(best.maxPercent, Number(entry.bestPercent ?? entry.maxPercent) || 0)
  };
  localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
}

// Speichert Run lokal + in Firebase (nur bei neuem Rekord). Gibt zurück, ob es ein Rekord war.
export function submitRun({ stage, percent, score }) {
  const best = getLocalBest();
  const isRecord = score > best.score || percent > best.maxPercent;
  if (!isRecord) return { isRecord: false, best };

  const merged = {
    score: Math.max(score, best.score),
    maxStage: Math.max(stage, best.maxStage),
    maxPercent: Math.max(percent, best.maxPercent)
  };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Arcade-Rekord konnte nicht lokal gespeichert werden.', error);
    window.showToast?.('⚠️ Lokaler Rekord nicht gespeichert. Bitte Browser-Speicher prüfen.');
  }

  const db = getDb();
  const token = localStorage.getItem('party_device_token');
  if (db && token) {
    db.ref(`arcadeLeaderboard/${token}`)
      .transaction((current) => {
        const maxPercent = Math.max(
          merged.maxPercent,
          Number(current?.bestPercent ?? current?.maxPercent) || 0
        );
        return {
          ...current,
          name: getSavedPlayerName() || current?.name || ANON_NAME,
          score: Math.max(merged.score, Number(current?.score) || 0),
          maxStage: Math.max(merged.maxStage, Number(current?.maxStage) || 0),
          maxPercent,
          bestPercent: maxPercent,
          updatedAt: Date.now()
        };
      })
      .catch((error) => {
        console.error('Arcade-Rekord konnte nicht synchronisiert werden.', error);
        window.showToast?.('⚠️ Rekord nur lokal gespeichert. Bitte Verbindung prüfen.');
      });
  } else {
    console.warn('Arcade-Rekord nur lokal: keine Firebase-Verbindung oder Geräte-ID.');
    window.showToast?.('⚠️ Rekord nur lokal gespeichert. Keine Verbindung zur Bestenliste.');
  }
  return { isRecord: true, best: merged };
}

export async function fetchTopTen() {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await db.ref('arcadeLeaderboard').once('value');
    const own = localStorage.getItem('party_device_token');
    const ownName = getPlayerName();
    return Object.entries(snap.val() || {})
      .map(([token, e]) => (token === own && ownName !== ANON_NAME ? { ...e, name: ownName } : e))
      .map((entry) => ({ ...entry, maxPercent: entry.bestPercent ?? entry.maxPercent ?? 0 }))
      .sort((a, b) => b.maxPercent - a.maxPercent || b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Bestenliste konnte nicht geladen werden.', error);
    return null;
  }
}
