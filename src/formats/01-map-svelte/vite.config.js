import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
// Format 1 of 17: map and timeline, rebuilt in Svelte 5. Output is plain static files in formats/01-map-svelte/ (the site is served as-is).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)), base: './', plugins: [svelte()],
  build: { outDir: fileURLToPath(new URL('../../../formats/01-map-svelte', import.meta.url)), emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 700 },
});
