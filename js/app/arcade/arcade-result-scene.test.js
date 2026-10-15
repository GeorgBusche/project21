import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resultScene, drawResultScene } from './arcade-result-scene.js';
import { createPlayerAppearance } from './player-rig.js';

function recordingContext() {
  const calls = [];
  let depth = 0;
  const ctx = new Proxy({}, {
    get: (_target, key) => (...args) => {
      if (key === 'save') depth++;
      if (key === 'restore') depth--;
      calls.push([key, ...args]);
    },
    set: (_target, key, value) => {
      assert.ok(key !== 'shadowBlur' || value === 0, 'no expensive animated blur');
      calls.push([key, value]);
      return true;
    }
  });
  return { ctx, calls, depth: () => depth };
}

test('each actual death stage has its own scene, copy and color; victory is separate', () => {
  const scenes = [1, 2, 3, 4].map(stage => resultScene(stage));
  for (const key of ['id', 'title', 'line', 'color'])
    assert.equal(new Set(scenes.map(scene => scene[key])).size, 4);
  assert.equal(resultScene(2).id, 'flight');
  assert.equal(resultScene(3).id, 'show');
  assert.equal(resultScene(4).id, 'boss');
  assert.equal(resultScene(4, true).id, 'victory');
  assert.equal(resultScene(undefined).id, 'run');
  assert.equal(resultScene(99).id, 'boss');
});

test('all scenes draw changing animations, preserve canvas state and support static reduced motion', (t) => {
  t.mock.method(performance, 'now', () => 1000);
  const frames = [];
  for (const scene of [1, 2, 3, 4].map(stage => resultScene(stage)).concat(resultScene(4, true))) {
    const first = recordingContext();
    const later = recordingContext();
    const stillA = recordingContext();
    const stillB = recordingContext();
    const appearance = { avatar: { type: 'emoji', value: '👑' }, image: null };
    drawResultScene(first.ctx, scene, .1, appearance);
    drawResultScene(later.ctx, scene, 1.2, appearance);
    drawResultScene(stillA.ctx, scene, .1, appearance, true);
    drawResultScene(stillB.ctx, scene, 1.2, appearance, true);
    assert.notDeepEqual(first.calls, later.calls, `${scene.id} animates`);
    assert.deepEqual(stillA.calls, stillB.calls, `${scene.id} has a stable reduced-motion frame`);
    assert.equal(first.depth(), 0);
    assert.equal(later.depth(), 0);
    assert.ok(first.calls.some(call => call[0] === 'fillText' && call[1] === '👑'), 'uses profile avatar');
    frames.push(JSON.stringify(first.calls));
  }
  assert.equal(new Set(frames).size, 5);
});

test('profile photos trigger a redraw once decoded, including reduced-motion scenes', () => {
  let image;
  globalThis.Image = class {
    constructor() { image = this; this.naturalWidth = this.naturalHeight = 96; }
    set src(value) { this.source = value; }
  };
  let repaints = 0;
  const appearance = createPlayerAppearance({ name: 'Ada', avatar: { type: 'image', value: 'data:image/jpeg;base64,test' } }, () => repaints++);
  image.onload();
  assert.equal(appearance.image, image);
  assert.equal(repaints, 1);
  const frame = recordingContext();
  drawResultScene(frame.ctx, resultScene(2), 0, appearance, true);
  assert.ok(frame.calls.some(call => call[0] === 'drawImage' && call[1] === image));
});

test('engine passes actual stage rather than inferring death stage from rounded progress', async () => {
  const source = await readFile(new URL('./arcade-engine.js', import.meta.url), 'utf8');
  assert.match(source, /renderVerdict\(showScreen\(''\), \{\s+won, stage: state\.stageIndex \+ 1/);
});
