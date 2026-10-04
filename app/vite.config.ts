/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// A new id for every build. The app compares it with /version.json on launch and reloads once when a newer build is live.
function buildId(): string {
  let sha = 'local';
  try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a git checkout */ }
  return `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}-${sha}`;
}
const BUILD_ID = buildId();

export default defineConfig({
  base: '/scheisse/',
  plugins: [
    react(),
    {
      name: 'version-file',
      apply: 'build',
      closeBundle() {
        const out = resolve(import.meta.dirname, 'dist');
        mkdirSync(out, { recursive: true });
        writeFileSync(resolve(out, 'version.json'), JSON.stringify({ build: BUILD_ID }));
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
  },
});
