import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { buildInfoPlugin } from './scripts/build-info.mjs';

const basePath = process.env.IC_ATLAS_BASE_PATH || '';
if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) {
  throw new Error(
    'IC_ATLAS_BASE_PATH must be empty or a single /repository path.',
  );
}
export default defineConfig({
  root: fileURLToPath(new URL('./web', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  base: `${basePath}/`,
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  plugins: [buildInfoPlugin(), react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: fileURLToPath(new URL('./dist/pages', import.meta.url)),
    emptyOutDir: true,
    license: { fileName: 'bundled-dependencies.json' },
  },
});
