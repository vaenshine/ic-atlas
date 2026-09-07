import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../dist/pages/', import.meta.url));
const prefix = `${process.env.IC_ATLAS_BASE_PATH || ''}/`;
const html = await readFile(resolve(directory, 'index.html'), 'utf8');
assert(
  html.includes('lang="en"'),
  'English must be the default document language',
);
assert(html.includes('IC Atlas'), 'Missing application metadata');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  (match) => match[1],
);
const javascript = [];
for (const url of references) {
  assert(
    url.startsWith(prefix),
    `Expected repository prefix ${prefix}: ${url}`,
  );
  const path = resolve(directory, decodeURIComponent(url.slice(prefix.length)));
  assert(
    !relative(directory, path).startsWith('..'),
    'Asset escaped export directory',
  );
  assert((await stat(path)).isFile(), `Missing exported asset: ${url}`);
  if (path.endsWith('.js')) javascript.push(path);
  if (path.endsWith('.css')) {
    const css = await readFile(path, 'utf8');
    assert(
      css.includes('.scene-area') && css.includes('.language-switch'),
      'Missing workbench styles',
    );
  }
}
assert(javascript.length > 0, 'Missing JavaScript entry');
const bundle = (
  await Promise.all(javascript.map((path) => readFile(path, 'utf8')))
).join('\n');
for (const unexpected of [
  'localhost:3000',
  '127.0.0.1',
  '/Users/',
  'appgprj_',
  'chatgpt.site',
]) {
  assert(
    !bundle.includes(unexpected),
    `Local hosting reference in bundle: ${unexpected}`,
  );
}
for (const required of ['cat-001', 'cat-200', 'ic-atlas-language'])
  assert(
    bundle.includes(required),
    `Missing catalog or preference: ${required}`,
  );
for (const name of [
  '.nojekyll',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'bundled-dependencies.json',
  'version.json',
])
  await stat(resolve(directory, name));
const version = JSON.parse(
  await readFile(resolve(directory, 'version.json'), 'utf8'),
);
assert(
  version.schema === 1 && version.name === 'ic-atlas',
  'Invalid public update manifest',
);
assert(
  typeof version.version === 'string' && bundle.includes(version.version),
  'Build version is missing from bundle',
);
assert(
  version.commit === null || /^[a-f0-9]{40}$/.test(version.commit),
  'Invalid build revision',
);
assert(
  bundle.includes('https://github.com/vaenshine/ic-atlas'),
  'Missing public source link',
);
const dependencies = JSON.parse(
  await readFile(resolve(directory, 'bundled-dependencies.json'), 'utf8'),
);
assert(
  Array.isArray(dependencies) && dependencies.length > 0,
  'Missing dependency license inventory',
);
console.log(
  JSON.stringify(
    {
      output: 'dist/pages',
      basePath: prefix,
      assets: references.length,
      dependencyNotices: dependencies.length,
      staticExport: 'verified',
    },
    null,
    2,
  ),
);
