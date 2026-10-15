import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discoverArcade, hasDiscoveredArcade } from './arcade-discovery.js';

const local = new Map();
const session = new Map();
const storage = (map) => ({
  getItem: (key) => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, String(value))
});
globalThis.localStorage = storage(local);
globalThis.sessionStorage = storage(session);

test('discovery persists across visits so the decline button can reopen the game directly', () => {
  local.clear();
  session.clear();
  assert.equal(hasDiscoveredArcade(), false);
  discoverArcade();
  session.clear();
  assert.equal(
    hasDiscoveredArcade(),
    true,
    'returning player can replay through decline without repeating the Easter egg'
  );
});

test('previous unlocks and real attempts are recognized, an identity or RSVP alone does not unlock the game', () => {
  local.clear();
  session.clear();
  local.set('arcade_player_name', 'Ada');
  local.set('party_rsvp_data', '{"name":"Ada","status":"attending"}');
  assert.equal(hasDiscoveredArcade(), false);
  session.set('arcade_unlocked', 'true');
  assert.equal(hasDiscoveredArcade(), true);
  session.clear();
  local.set('arcade_attempts', '3');
  assert.equal(hasDiscoveredArcade(), true);
});

test('invitation and RSVP modals have no arcade promotion or extra game entry', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(
    html,
    /arcade-hub|arcade-launch|HIGHSCORE &amp; ACHIEVEMENTS|confirmedArcadeLaunch/
  );
  assert.doesNotMatch(html, /arcadeShortcut|openArcadeGame\(\{freeplay:true\}\)/);
  assert.match(html, /id="declineBtn"[\s\S]*?onclick="handleDeclineClick\(\)"/);
  assert.match(
    html,
    /openArcadeGame\(\{ stageMenu: true \}\)/,
    'admin stage menu remains available'
  );
});

test('RSVP exposes only attendance and decline, with a reluctant acceptance in the arcade', async () => {
  const [html, verdict] = await Promise.all([
    readFile(new URL('../../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('./arcade-verdict.js', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(html, /maybeReturnBanner|resolveMaybe|data-guest-status="maybe"/);
  assert.deepEqual(
    [...html.matchAll(/data-guest-status="([^"]+)"/g)].map((match) => match[1]),
    ['attending', 'declined']
  );
  assert.deepEqual(
    [...verdict.matchAll(/data-choice="([^"]+)"/g)].map((match) => match[1]),
    ['attending', 'declined']
  );
  assert.match(verdict, /Na gut, trotzdem zusagen/);
  assert.match(verdict, /Wirklich absagen/);
  assert.match(verdict, /Zusage behalten/);
  assert.match(verdict, /Spiel beenden & antworten/);
  assert.match(verdict, /data-decision hidden/);
  assert.match(verdict, /data-back/);
  assert.doesNotMatch(verdict, /<details|<summary|else form\.requestSubmit/);
});
