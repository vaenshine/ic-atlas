import { spawnSync } from 'node:child_process';
import { access, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'build',
    '--config',
    'vite.pages.config.ts',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  },
);
if (build.status !== 0) process.exit(build.status ?? 1);
await access(new URL('../dist/pages/index.html', import.meta.url));
await writeFile(new URL('../dist/pages/.nojekyll', import.meta.url), '');
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(
    new URL(`../${name}`, import.meta.url),
    new URL(`../dist/pages/${name}`, import.meta.url),
  );
}
console.log('GitHub Pages artifact: dist/pages');
