import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitation, decodeInvitationName } from './personal-links.js';
import { invitationName, savePlayerName, getSavedPlayerName, rsvpStatus } from './player-identity.js';

const data = new Map();
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, String(value))
};

test('personal links round trip UTF-8 names and preserve deployment subpath', () => {
  for (const name of ['Max', 'Jörg', 'Zoë 🍻', '李明', 'A+B & C']) {
    const { link, message } = createInvitation(name, 'https://example.org/project21/?admin=links#admin');
    const url = new URL(link);
    assert.equal(url.pathname, '/project21/');
    assert.equal(url.hash, '');
    assert.equal(url.searchParams.has('admin'), false);
    assert.equal(decodeInvitationName(url.search), name);
    assert.ok(message.startsWith(`Moin ${name}! Georg wird 21`));
    assert.ok(message.includes('Uchte'));
    assert.ok(message.includes(link));
    assert.doesNotMatch(message, /undefined|Arcade|Highscore/);
  }
  assert.equal(decodeInvitationName('?u=J%C3%B6rg'), 'Jörg');
  assert.equal(decodeInvitationName('?admin=links'), null);
  assert.throws(() => decodeInvitationName('?id=%%%'), /ungültig/);
  assert.throws(() => decodeInvitationName('?id='), /fehlt/);
});

test('nickname retains original once, ignoring case and preserving complete long display names', () => {
  assert.equal(invitationName('Bierkönig', 'Max'), 'Bierkönig (Max)');
  assert.equal(invitationName('max', 'Max'), 'max');
  assert.equal(invitationName('Bierkönig (MAX) (Max)', 'Max'), 'Bierkönig (Max)');
  assert.equal(invitationName('Anna', ''), 'Anna');
  const result = invitationName('N'.repeat(40), 'O'.repeat(40));
  assert.equal(result.length, 83);
  assert.equal(invitationName(result, 'O'.repeat(40)), result);
  assert.throws(() => invitationName(' ', 'Max'), /Namen/);
});

test('identity persistence and subsequent name changes consistently apply the original name', () => {
  data.clear();
  localStorage.setItem('party_original_name', 'Max');
  assert.equal(savePlayerName('Bierkönig'), 'Bierkönig (Max)');
  assert.equal(getSavedPlayerName(), 'Bierkönig (Max)');
  const draft = JSON.parse(localStorage.getItem('party_rsvp_data'));
  assert.equal(draft.name, 'Bierkönig (Max)');
  assert.equal(rsvpStatus(draft), null);
  localStorage.setItem('party_rsvp_data', JSON.stringify({ ...draft, status: 'attending', plusOne: true }));
  savePlayerName('König (Max)');
  assert.deepEqual(JSON.parse(localStorage.getItem('party_rsvp_data')), {
    name: 'König (Max)', status: 'attending', plusOne: true
  });
});
