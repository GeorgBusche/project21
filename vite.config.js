import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sudoPages = ['bella', 'biertornado', 'ragecage', 'rammstein', 'schuettelkorn', 'wolle'];

const input = {
  main: resolve(projectRoot, 'index.html')
};

for (const song of sudoPages) {
  input[`sudo_frames/sudo_${song}`] = resolve(projectRoot, `sudo_frames/sudo_${song}.html`);
}

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input }
  }
});
