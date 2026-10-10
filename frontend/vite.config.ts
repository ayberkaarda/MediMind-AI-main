/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

function excludeMockWorker(): Plugin {
  let outputDirectory = '';
  return {
    name: 'exclude-mock-worker',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      await rm(resolve(outputDirectory, 'mockServiceWorker.js'), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), excludeMockWorker()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
