import { informationHtmlPlugin } from './scripts/info/html_plugin.mjs';
import { routes } from './src/knallblau/content.js';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { seoPlugin } from './scripts/seo_plugin.mjs';

export default defineConfig({
  plugins: [informationHtmlPlugin(), seoPlugin()],
  build: {
    rollupOptions: {
      input: {
        ...Object.fromEntries(routes.map((route,i) => [`knallblau-${i}`, fileURLToPath(new URL(`.${route.path}index.html`, import.meta.url))])),
        passung: fileURLToPath(new URL('./beispiele/passung/index.html', import.meta.url)),
        recovery: fileURLToPath(new URL('./systemintegration/index.html', import.meta.url)),
        portfolio: fileURLToPath(new URL('./index.html', import.meta.url)),
        example: fileURLToPath(new URL('./beispiel/index.html', import.meta.url)),
      },
    },
  },
});
