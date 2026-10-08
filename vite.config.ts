import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the production build also runs from a GitHub Pages
  // subpath (or any static host) without URL rewriting.
  base: './',
  server: {
    port: 5173,
    // Playwright's webServer waits on a deterministic port (playwright.config.ts).
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
