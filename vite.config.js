import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

// Kopiert die statischen Ordner aus dem Projekt-Wurzelverzeichnis
// (assets, content, icons ... liegen dort statt in public/) in den dist-Ordner.
function copyRootStatic() {
  return {
    name: 'copy-root-static',
    apply: 'build',
    closeBundle() {
      const items = ['assets', 'content', 'icons', 'manifest.webmanifest', 'service-worker.js'];
      for (const item of items) {
        const src = resolve(process.cwd(), item);
        if (existsSync(src)) {
          cpSync(src, resolve(process.cwd(), 'dist', item), { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyRootStatic()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
});
