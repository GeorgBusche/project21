export function readSavedRsvp() {
  const raw = localStorage.getItem('party_rsvp_data');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Gespeicherte RSVP-Daten sind unlesbar.', error);
    return null;
  }
}

export const cleanPlayerName = (name) =>
  String(name || '')
    .trim()
    .slice(0, 83);
export const PLAYER_NAME_PENDING_KEY = 'arcade_player_name_pending';

export function invitationName(value, original = localStorage.getItem('party_original_name') || '') {
  let nickname = cleanPlayerName(value);
  const source = cleanPlayerName(original).slice(0, 40);
  if (!nickname) throw new Error('Bitte gib deinen Namen ein.');
  if (!source) return nickname.slice(0, 40);
  const suffix = ` (${source})`;
  while (nickname.toLocaleLowerCase('de').endsWith(suffix.toLocaleLowerCase('de'))) {
    nickname = nickname.slice(0, -suffix.length).trim();
  }
  if (!nickname) return source;
  nickname = nickname.slice(0, 40);
  return nickname.toLocaleLowerCase('de') === source.toLocaleLowerCase('de')
    ? nickname
    : `${nickname}${suffix}`;
}

export function getSavedPlayerName() {
  return (
    cleanPlayerName(localStorage.getItem(PLAYER_NAME_PENDING_KEY)) ||
    cleanPlayerName(localStorage.getItem('party_confirmed_name')) ||
    cleanPlayerName(readSavedRsvp()?.name) ||
    cleanPlayerName(localStorage.getItem('arcade_player_name'))
  );
}

export function savePlayerName(name) {
  const clean = invitationName(name);
  if (!clean) throw new Error('Bitte gib deinen Namen ein.');
  localStorage.setItem('arcade_player_name', clean);
  localStorage.setItem('party_confirmed_name', clean);
  if (localStorage.getItem(PLAYER_NAME_PENDING_KEY)) {
    localStorage.setItem(PLAYER_NAME_PENDING_KEY, clean);
  }
  const rsvp = readSavedRsvp();
  localStorage.setItem('party_rsvp_data', JSON.stringify({ ...(rsvp || { status: 'unanswered' }), name: clean }));
  if (globalThis.window?.dispatchEvent) window.dispatchEvent(new Event('party-name-change'));
  return clean;
}

// Legacy confirmations had no status; retired/unknown statuses never count as attendance.
export const rsvpStatus = (record) => {
  if (!record) return null;
  if (!record.status) return 'attending';
  return ['attending', 'declined'].includes(record.status) ? record.status : null;
};

export function arcadePercent(entry) {
  return Math.max(
    0,
    Math.min(100, Math.floor(Number(entry?.bestPercent ?? entry?.maxPercent) || 0))
  );
}

export function arcadeRank(entry) {
  const percent = arcadePercent(entry);
  if (percent === 100) return { kind: 'legend', label: '👑 100% BOSS-SLAYER' };
  if (percent >= 75) return { kind: 'boss', label: `🔥 BOSS-STAGE: ${percent}%` };
  if (percent > 0) return { kind: 'arcade', label: `🕹️ ARCADE: ${percent}%` };
  return null;
}
