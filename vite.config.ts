import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { buildInfoPlugin } from './scripts/build-info.mjs';

// The local workbench and GitHub Pages export share the same application.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    hmr: process.env.IC_ATLAS_MANAGED_PORT
      ? { clientPort: Number(process.env.IC_ATLAS_MANAGED_PORT) }
      : undefined,
  },
  plugins: [buildInfoPlugin(), vinext()],
});
