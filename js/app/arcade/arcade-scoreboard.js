const LOCAL_KEY = 'arcade_highscore';

function getDb() {
  try {
    return window.firebase?.apps?.length ? window.firebase.database() : null;
  } catch (_) {
    return null;
  }
}

const ANON_NAME = 'Anonymes Fiech';

function getPlayerName() {
  try {
    const rsvp = JSON.parse(localStorage.getItem('party_rsvp_data') || 'null');
    if (rsvp?.name) return String(rsvp.name).slice(0, 40);
  } catch (_) {
    /* ignorieren */
  }
  return ANON_NAME;
}

// Nach Zusage oder Umbenennung: vorhandenen Bestenlisten-Eintrag dieses Geräts auf den echten Namen setzen
export function syncLeaderboardName(name) {
  const db = getDb();
  const token = localStorage.getItem('party_device_token');
  const clean = String(name || '').trim().slice(0, 40);
  if (!db || !token || !clean) return;
  const ref = db.ref(`arcadeLeaderboard/${token}`);
  ref
    .once('value')
    .then((snap) => snap.exists() && snap.val().name !== clean && ref.child('name').set(clean))
    .catch(() => {});
}

export function getLocalBest() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return { score: raw?.score || 0, maxStage: raw?.maxStage || 0, maxPercent: raw?.maxPercent || 0 };
  } catch (_) {
    return { score: 0, maxStage: 0, maxPercent: 0 };
  }
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
  } catch (_) {
    /* ignorieren */
  }

  const db = getDb();
  const token = localStorage.getItem('party_device_token');
  if (db && token) {
    db.ref(`arcadeLeaderboard/${token}`)
      .set({ name: getPlayerName(), ...merged, updatedAt: Date.now() })
      .catch(() => {});
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
      .sort((a, b) => b.maxPercent - a.maxPercent || b.score - a.score)
      .slice(0, 10);
  } catch (_) {
    return null;
  }
}
