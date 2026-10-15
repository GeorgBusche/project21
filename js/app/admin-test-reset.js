const LOCAL_KEYS = [
  'party_rsvp_data',
  'party_original_name',
  'party_confirmed_name',
  'party_profile_avatar_pending',
  'arcade_player_name',
  'arcade_player_name_pending',
  'arcade_discovered',
  'arcade_attempts',
  'arcade_highscore',
  'arcade_boss_intro_seen',
  'party_achievements',
  'party_device_token'
];

export async function resetOwnTestData(database, local, session) {
  const token = local.getItem('party_device_token');
  if (token) {
    if (/[.#$[\]/\u0000-\u001f\u007f]/.test(token)) {
      throw new Error('Ungültiger Geräte-Token. Es wurden keine Daten gelöscht.');
    }
    if (!database) throw new Error('Keine Datenbankverbindung. Bitte erneut versuchen.');
    await database.ref().update({
      [`rsvps/${token}`]: null,
      [`arcadeLeaderboard/${token}`]: null
    });
  }
  for (const key of LOCAL_KEYS) local.removeItem(key);
  session.removeItem('arcade_unlocked');
}
