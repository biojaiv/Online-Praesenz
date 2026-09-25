import { routes } from './src/knallblau/content.js';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        ...Object.fromEntries(routes.map((route,i) => [`knallblau-${i}`, fileURLToPath(new URL(`.${route.path}index.html`, import.meta.url))])),
        recovery: fileURLToPath(new URL('./systemintegration/index.html', import.meta.url)),
        portfolio: fileURLToPath(new URL('./index.html', import.meta.url)),
        example: fileURLToPath(new URL('./beispiel/index.html', import.meta.url)),
      },
    },
  },
});
