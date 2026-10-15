import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('menu initialization shares dialog styling, labels close controls and remains idempotent', async () => {
  globalThis.window = {};
  const element = (extra = {}) => {
    const classes = new Set();
    const attributes = {};
    return {
      classes, attributes,
      classList: { add: (value) => classes.add(value) },
      setAttribute: (key, value) => { attributes[key] = value; },
      ...extra
    };
  };
  const heading = element({ id: '' });
  const close = element({ textContent: '✕', getAttribute: () => 'closeGuestModal()' });
  const clear = element({ textContent: '✕', getAttribute: () => 'clearGuestSearch()' });
  const panel = element({
    querySelector: () => heading,
    querySelectorAll: () => [close, clear]
  });
  const overlay = element({ firstElementChild: panel });
  let listeners = 0;
  globalThis.document = {
    getElementById: (id) => id === 'guestModal' ? overlay : null,
    addEventListener: () => listeners++
  };
  const { initializeModalUx } = await import('./ui.js');
  initializeModalUx();
  initializeModalUx();
  assert.equal(listeners, 2);
  assert.ok(overlay.classes.has('menu-overlay'));
  assert.ok(panel.classes.has('menu-dialog'));
  assert.equal(panel.attributes.role, 'dialog');
  assert.equal(panel.attributes['aria-labelledby'], heading.id);
  assert.equal(close.attributes['aria-label'], 'Schließen');
  assert.equal(clear.attributes['aria-label'], 'Suche löschen');
  assert.ok(close.classes.has('menu-close'));
  assert.ok(!clear.classes.has('menu-close'), 'a hidden search-clear control must not be forced visible');
});

test('RSVP delegates identity to profile, keeps extras optional and guests open directly', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const actions = await readFile(new URL('./party-actions.js', import.meta.url), 'utf8');
  const commands = await readFile(new URL('./party-mode/mode-controller.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /rsvpPhotoUpload|rsvpAvatarPicker|DEIN AVATAR \/ ICON/);
  assert.match(html, /data-rsvp-name-edit>✎ Profil bearbeiten/);
  assert.match(html, /<details id="rsvpExtras" class="menu-disclosure">/);
  for (const id of ['rsvpDrink', 'rsvpPlusOneToggle', 'rsvpPegel', 'rsvpSongSearchInput', 'rsvpNote', 'rsvpSubmitBtn'])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(actions, /avatar: normalizeAvatar\(readSavedRsvp\(\)\?\.avatar/);
  assert.doesNotMatch(actions, /selectedAvatar|selectAvatarPreset|handleAvatarPhotoUpload/);
  assert.match(commands, /handler: 'openGuestModal\(\)'/);
  assert.ok(html.indexOf('class="guest-status-tabs"') < html.indexOf('id="guestSearchInput"'));
});

test('arcade uses the profile name without edit controls and retains only missing-identity recovery', async () => {
  const verdict = await readFile(new URL('./arcade/arcade-verdict.js', import.meta.url), 'utf8');
  assert.doesNotMatch(verdict, /data-edit-name|data-save-name|Name ändern|Namen speichern/);
  assert.doesNotMatch(verdict, /verdict-report|Du entscheidest/);
  assert.match(verdict, /const playerName = \(\) => getSavedPlayerName\(\)/);
  assert.match(verdict, /name \? '' : `<label data-name-label>/);
  assert.match(verdict, /if \(getSavedPlayerName\(\)\) \{\s+next\(\);/);
});
