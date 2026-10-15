import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

globalThis.window = {};
const { appendLine } = await import('./ui.js');

test('boot and interactive messages append to the same visible scrolling terminal', async () => {
  const lines = [];
  const output = {
    appendChild: (line) => lines.push(line),
    scrollHeight: 100
  };
  globalThis.document = {
    getElementById: () => output,
    createElement: () => ({ innerHTML: '' })
  };
  appendLine('boot');
  await new Promise((resolve) => setTimeout(resolve, 10));
  appendLine('calendar / info');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(output.scrollTop, 100);
  assert.deepEqual(lines.map((line) => line.innerHTML), ['boot', 'calendar / info']);
});

test('homepage retains visible boot output, RSVP and Easter egg handlers without a replacement hero', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="terminalOutput"/);
  assert.doesNotMatch(html, /home-invitation|home-log|home-title-row/);
  assert.match(html, /id="commandGrid"/);
  assert.match(html, /id="bottomRsvpBtn"/);
  assert.match(html, /id="declineBtn"[\s\S]*?onclick="handleDeclineClick\(\)"/);
});
