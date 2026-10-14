import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { EVENT_CORE } from './js/content.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sudoPages = ['bella', 'biertornado', 'ragecage', 'rammstein', 'schuettelkorn', 'wolle'];

const input = {
  main: resolve(projectRoot, 'index.html')
};

for (const song of sudoPages) {
  input[`sudo_frames/sudo_${song}`] = resolve(projectRoot, `sudo_frames/sudo_${song}.html`);
}

// WhatsApp braucht für og:image eine absolute URL: wird aus EVENT_CORE.siteUrl gebaut.
function absoluteOgImage() {
  const siteUrl = (EVENT_CORE.siteUrl || '').replace(/\/$/, '');
  const usable = /^https?:\/\//.test(siteUrl) && !siteUrl.includes('DEIN-USERNAME');
  return {
    name: 'absolute-og-image',
    transformIndexHtml(html) {
      if (!usable) return html;
      return html.replace(/content="og-preview\.png"/g, `content="${siteUrl}/og-preview.png"`);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), absoluteOgImage()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input }
  }
});
