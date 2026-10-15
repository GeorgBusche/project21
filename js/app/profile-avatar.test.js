import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar, readAvatarPhoto } from './profile-avatar.js';

test('profile supports legacy emoji, photos and a default avatar', () => {
  assert.deepEqual(normalizeAvatar('😎'), { type: 'emoji', value: '😎' });
  const photo = { type: 'image', value: 'data:image/jpeg;base64,abc' };
  assert.deepEqual(normalizeAvatar(photo), photo);
  assert.deepEqual(normalizeAvatar(null), { type: 'emoji', value: '👾' });
  assert.deepEqual(normalizeAvatar({ type: 'image', value: 'javascript:alert(1)' }), { type: 'emoji', value: '👾' });
});

test('photo conversion rejects invalid, oversized, unreadable and undecodable images', async () => {
  await assert.rejects(readAvatarPhoto({ type: 'text/plain', size: 1 }), /Bilddatei/);
  await assert.rejects(readAvatarPhoto({ type: 'image/jpeg', size: 21 * 1024 * 1024 }), /20 MB/);
  globalThis.FileReader = class { readAsDataURL() { this.onerror(); } };
  await assert.rejects(readAvatarPhoto({ type: 'image/jpeg', size: 1 }), /gelesen/);
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/jpeg;base64,abc'; this.onload(); } };
  globalThis.Image = class { set src(value) { this.onerror(); } };
  await assert.rejects(readAvatarPhoto({ type: 'image/jpeg', size: 1 }), /Bildformat/);
});

test('photo conversion center-crops both orientations and compresses to 96px JPEG', async () => {
  for (const [width, height, crop] of [[400, 200, [100, 0, 200, 200]], [200, 400, [0, 100, 200, 200]]]) {
    globalThis.Image = class {
      constructor() { this.width = width; this.height = height; }
      set src(value) { this.onload(); }
    };
    let draw;
    const canvas = {
      getContext: () => ({ drawImage: (...args) => { draw = args.slice(1); } }),
      toDataURL: (type, quality) => {
        assert.equal(type, 'image/jpeg');
        assert.equal(quality, 0.75);
        return 'data:image/jpeg;base64,compressed';
      }
    };
    globalThis.document = { createElement: () => canvas };
    assert.deepEqual(await readAvatarPhoto({ type: 'image/png', size: 10 }), {
      type: 'image', value: 'data:image/jpeg;base64,compressed'
    });
    assert.equal(canvas.width, 96);
    assert.equal(canvas.height, 96);
    assert.deepEqual(draw, [...crop, 0, 0, 96, 96]);
  }
});
