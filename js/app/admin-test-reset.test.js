import test from 'node:test';
import assert from 'node:assert/strict';
import { resetOwnTestData } from './admin-test-reset.js';

const storage = (entries) => {
  const data = new Map(Object.entries(entries));
  return {
    getItem: (key) => data.get(key) ?? null,
    removeItem: (key) => data.delete(key),
    data
  };
};

test('reset deletes only own remote entries and targeted local progress, preserving admin and preferences', async () => {
  const local = storage({
    party_device_token: 'my-device',
    party_rsvp_data: '{}',
    party_original_name: 'Max',
    party_confirmed_name: 'Ada (Max)',
    party_profile_avatar_pending: '{"type":"emoji","value":"👑"}',
    arcade_player_name: 'Ada',
    arcade_player_name_pending: 'Ada',
    arcade_discovered: 'true',
    arcade_attempts: '5',
    arcade_highscore: '{}',
    arcade_boss_intro_seen: '1',
    party_achievements: '{}',
    audio_enabled: 'false'
  });
  const session = storage({ party_admin_auth: 'true', arcade_unlocked: 'true' });
  let updates;
  await resetOwnTestData({
    ref: () => ({
      update: async (value) => {
        assert.equal(local.getItem('party_device_token'), 'my-device');
        updates = value;
      }
    })
  }, local, session);
  assert.deepEqual(updates, {
    'rsvps/my-device': null,
    'arcadeLeaderboard/my-device': null
  });
  assert.deepEqual([...local.data], [['audio_enabled', 'false']]);
  assert.deepEqual([...session.data], [['party_admin_auth', 'true']]);
});

test('failed remote deletion retains all local data for retry', async () => {
  const local = storage({ party_device_token: 'my-device', arcade_attempts: '5' });
  const session = storage({ arcade_unlocked: 'true' });
  await assert.rejects(resetOwnTestData({
    ref: () => ({ update: async () => { throw new Error('offline'); } })
  }, local, session), /offline/);
  assert.equal(local.getItem('arcade_attempts'), '5');
  assert.equal(local.getItem('party_device_token'), 'my-device');
  assert.equal(session.getItem('arcade_unlocked'), 'true');
  await assert.rejects(resetOwnTestData(null, local, session), /Datenbankverbindung/);
});

test('reset without a token clears browser progress without accessing Firebase', async () => {
  const local = storage({ arcade_attempts: '5' });
  const session = storage({ arcade_unlocked: 'true' });
  await resetOwnTestData(null, local, session);
  assert.equal(local.data.size, 0);
  assert.equal(session.data.size, 0);
});

test('invalid tokens cannot target other Firebase paths', async () => {
  for (const token of ['../other', 'other/name', 'bad.token', 'bad#token', 'bad[token', 'bad]token', 'bad$token', 'bad\ntoken']) {
    const local = storage({ party_device_token: token });
    await assert.rejects(resetOwnTestData(null, local, storage({})), /Geräte-Token/);
    assert.equal(local.getItem('party_device_token'), token);
  }
});
