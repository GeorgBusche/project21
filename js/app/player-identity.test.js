import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { arcadeRank, getSavedPlayerName, rsvpStatus, savePlayerName } from './player-identity.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};

test('confirmed identity takes precedence and a local name draft never invents attendance', () => {
  storage.clear();
  assert.equal(getSavedPlayerName(), '');
  savePlayerName('  Ada  ');
  assert.equal(getSavedPlayerName(), 'Ada');
  assert.deepEqual(JSON.parse(localStorage.getItem('party_rsvp_data')), { name: 'Ada', status: 'unanswered' });
  assert.equal(rsvpStatus(JSON.parse(localStorage.getItem('party_rsvp_data'))), null);
  localStorage.setItem(
    'party_rsvp_data',
    JSON.stringify({ name: 'Grace', status: 'maybe', note: 'Schicht' })
  );
  assert.equal(getSavedPlayerName(), 'Ada');
  savePlayerName('Lin');
  assert.deepEqual(JSON.parse(localStorage.getItem('party_rsvp_data')), {
    name: 'Lin',
    status: 'maybe',
    note: 'Schicht'
  });
  assert.equal(localStorage.getItem('arcade_player_name'), 'Lin');
  assert.equal(localStorage.getItem('party_confirmed_name'), 'Lin');
  assert.throws(() => savePlayerName('  '), /Namen/);
});

test('only confirmations and declines are decisions; retired statuses stay undecided', () => {
  assert.equal(rsvpStatus(null), null);
  assert.equal(rsvpStatus({ name: 'Legacy' }), 'attending');
  for (const status of ['attending', 'declined'])
    assert.equal(rsvpStatus({ status }), status);
  assert.equal(rsvpStatus({ status: 'maybe' }), null);
  assert.equal(rsvpStatus({ status: 'unknown' }), null);
});

test('arcade badge thresholds support both leaderboard field generations', () => {
  assert.equal(arcadeRank({ maxPercent: 0 }), null);
  for (const value of [1, 74]) assert.equal(arcadeRank({ maxPercent: value }).kind, 'arcade');
  for (const value of [75, 99]) assert.equal(arcadeRank({ bestPercent: value }).kind, 'boss');
  assert.deepEqual(arcadeRank({ maxPercent: 100 }), {
    kind: 'legend',
    label: '👑 100% BOSS-SLAYER'
  });
});

test('renaming updates existing leaderboard and RSVP records without overwriting scores or status', async () => {
  storage.clear();
  localStorage.setItem('party_device_token', 'test-device');
  const records = {
    'arcadeLeaderboard/test-device': { name: 'Anonymes Fiech', score: 420, maxPercent: 83 },
    'rsvps/test-device': { name: 'Old', status: 'maybe', note: 'Schicht' }
  };
  const writes = [];
  function ref(path) {
    return {
      once: async () => ({ exists: () => Boolean(records[path]), val: () => records[path] }),
      child: (key) => ref(`${path}/${key}`),
      set: async (value) => {
        writes.push([path, value]);
      }
    };
  }
  globalThis.window = { firebase: { apps: [{}], database: () => ({ ref }) } };
  const { persistPlayerName, getPlayerName } = await import('./arcade/arcade-scoreboard.js');
  await persistPlayerName('  Ada  ');
  assert.equal(getPlayerName(), 'Ada');
  assert.deepEqual(writes, [
    ['arcadeLeaderboard/test-device/name', 'Ada'],
    ['rsvps/test-device/name', 'Ada']
  ]);
  assert.equal(records['arcadeLeaderboard/test-device'].score, 420);
  assert.equal(records['rsvps/test-device'].status, 'maybe');
  window.firebase.database = () => ({
    ref: () => ({
      once: async () => {
        throw new Error('offline');
      }
    })
  });
  await assert.rejects(persistPlayerName('Ada'), /offline/);
  localStorage.setItem('party_rsvp_data', JSON.stringify({ name: 'Old cloud name', status: 'maybe' }));
  assert.equal(
    getSavedPlayerName(),
    'Ada',
    'identity remains persistent when the explicit online sync needs a retry'
  );
  assert.equal(localStorage.getItem('arcade_player_name_pending'), 'Ada');
});

test('a new run never lowers a cloud record and remote bests hydrate local progress', async () => {
  storage.clear();
  localStorage.setItem('party_device_token', 'test-device');
  savePlayerName('Ada');
  let record = { name: 'Old', score: 900, maxPercent: 96, maxStage: 4 };
  window.firebase.database = () => ({
    ref: () => ({
      transaction: async (update) => {
        record = update(record);
      }
    })
  });

  const { submitRun, mergeRemoteBest, getLocalBest } =
    await import('./arcade/arcade-scoreboard.js');
  submitRun({ stage: 1, percent: 12, score: 80 });
  assert.equal(record.bestPercent, 96);
  assert.equal(record.score, 900);
  assert.equal(record.name, 'Ada');
  mergeRemoteBest(record);
  assert.deepEqual(getLocalBest(), { score: 900, maxStage: 4, maxPercent: 96 });
});

test('profile avatar sync updates only an existing guest, retries failures and never creates an RSVP', async () => {
    storage.clear();
    localStorage.setItem('party_device_token', 'profile-device');
    const avatar = { type: 'image', value: 'data:image/jpeg;base64,photo' };
    const pending = JSON.stringify(avatar);
    const writes = [];
    let exists = true;
    let fail = true;
    const ref = (path) => ({
      once: async () => ({ exists: () => exists }),
      child: (key) => ref(`${path}/${key}`),
      set: async (value) => {
        if (path.endsWith('/avatar') && fail) throw new Error('offline');
        writes.push([path, value]);
      }
    });
    window.firebase.database = () => ({ ref });
    const { syncLeaderboardName } = await import('./arcade/arcade-scoreboard.js');
    localStorage.setItem('party_profile_avatar_pending', pending);
    await assert.rejects(syncLeaderboardName('Ada'), /offline/);
    assert.equal(localStorage.getItem('party_profile_avatar_pending'), pending);
    fail = false;
    writes.length = 0;
    await syncLeaderboardName('Ada');
    assert.deepEqual(writes, [
      ['arcadeLeaderboard/profile-device/name', 'Ada'],
      ['rsvps/profile-device/name', 'Ada'],
      ['rsvps/profile-device/avatar', avatar]
    ]);
    assert.equal(localStorage.getItem('party_profile_avatar_pending'), null);
    exists = false;
    writes.length = 0;
    localStorage.setItem('party_profile_avatar_pending', pending);
    await syncLeaderboardName('Ada');
    assert.deepEqual(writes, [['arcadeLeaderboard/profile-device/name', 'Ada']]);
});

test('first confirmation creates only a leaderboard name and keeps the full bracketed identity', async () => {
  storage.clear();
  localStorage.setItem('party_device_token', 'new-device');
  localStorage.setItem('party_original_name', 'M'.repeat(40));
  const writes = [];
  const ref = (path) => ({
    once: async () => ({ exists: () => false }),
    child: (key) => ref(`${path}/${key}`),
    set: async (value) => writes.push([path, value])
  });
  window.firebase.database = () => ({ ref });
  const { persistPlayerName } = await import('./arcade/arcade-scoreboard.js');
  const name = await persistPlayerName('N'.repeat(40));
  assert.equal(name.length, 83);
  assert.deepEqual(writes, [['arcadeLeaderboard/new-device/name', name]]);
  assert.equal(localStorage.getItem('party_confirmed_name'), name);
  assert.equal(localStorage.getItem('arcade_player_name_pending'), null);
  assert.equal(rsvpStatus(JSON.parse(localStorage.getItem('party_rsvp_data'))), null);
});

test('inline decisions preserve guest extras, require a decline note and report failed writes', async () => {
  storage.clear();
  localStorage.setItem('party_device_token', 'test-device');
  globalThis.document = { getElementById: () => null, querySelectorAll: () => [] };
  const data = {
    rsvps: {
      'test-device': {
        name: 'Ada',
        status: 'attending',
        avatar: '😎',
        plusOne: true,
        plusOneName: 'Bea',
        achievements: []
      }
    },
    arcadeLeaderboard: { 'test-device': { name: 'Ada', maxPercent: 83 } }
  };
  let fail = false;
  const read = (path) => path.split('/').reduce((v, k) => v?.[k], data);
  const ref = (path) => ({
    once: async () => ({ exists: () => Boolean(read(path)), val: () => read(path) }),
    child: (key) => ref(`${path}/${key}`),
    on: (event, callback) => callback({ val: () => read(path) }),
    set: async (value) => {
      if (fail) throw new Error('offline');
      const keys = path.split('/');
      const parent = keys.slice(0, -1).reduce((v, k) => v[k], data);
      parent[keys.at(-1)] = value;
    }
  });
  window.firebase.database = () => ({ ref });
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === './radar-map.js')
        return {
          url: 'data:text/javascript,export function showRadarMap() {}',
          shortCircuit: true
        };
      return nextResolve(specifier, context);
    }
  });
  const { initializePartyBackend, saveGuestDecision } = await import('./party-actions.js');
  hook.deregister();
  initializePartyBackend();
  await assert.rejects(
    saveGuestDecision({ status: 'declined', name: 'Ada', note: ' ' }),
    /Ausrede/
  );
  assert.equal(data.rsvps['test-device'].status, 'attending');
  await assert.rejects(saveGuestDecision({ status: 'attending', name: ' ' }), /Namen/);
  await assert.rejects(
    saveGuestDecision({ status: 'maybe', name: 'Ada', note: 'Schichtplan' }),
    /Ungültiger RSVP-Status/
  );
  assert.equal(data.rsvps['test-device'].status, 'attending');
  await saveGuestDecision({ status: 'declined', name: 'Ada', note: 'Klausur' });
  assert.equal(data.rsvps['test-device'].status, 'declined');
  const confirmed = await saveGuestDecision({ status: 'attending', name: 'Ada' });
  assert.equal(confirmed.bestPercent, 83);
  assert.equal(confirmed.avatar, '😎');
  assert.equal(confirmed.plusOneName, 'Bea');
  assert.equal(JSON.parse(localStorage.getItem('party_rsvp_data')).status, 'attending');
  await saveGuestDecision({ status: 'declined', name: 'Ada', note: 'Klausur' });
  fail = true;
  await assert.rejects(saveGuestDecision({ status: 'attending', name: 'Ada' }), /offline/);
  assert.equal(JSON.parse(localStorage.getItem('party_rsvp_data')).status, 'declined');
});
