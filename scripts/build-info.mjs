import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function createBuildInfo() {
  const { version } = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  let commit = null;
  try {
    const git = (...args) =>
      execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).trim();
    if (
      realpathSync(git('rev-parse', '--show-toplevel')) === realpathSync(root)
    ) {
      const sha = git('rev-parse', 'HEAD');
      if (/^[a-f0-9]{40}$/.test(sha)) commit = sha;
    }
  } catch {
    /* ZIP installs keep their package version without a Git revision. */
  }
  return {
    schema: 1,
    name: 'ic-atlas',
    version,
    commit,
    builtAt: new Date().toISOString(),
  };
}

export function buildInfoPlugin() {
  const info = createBuildInfo();
  return {
    name: 'ic-atlas-build-info',
    config() {
      return { define: { __IC_ATLAS_BUILD__: JSON.stringify(info) } };
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(info, null, 2) + '\n',
      });
    },
  };
}
