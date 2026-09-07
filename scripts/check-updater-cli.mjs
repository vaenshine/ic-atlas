import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const scripts = fileURLToPath(new URL('./', import.meta.url));
const git =
  process.platform === 'win32'
    ? ''
    : execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
const gitExecutable =
  process.platform === 'win32'
    ? ''
    : execFileSync('which', ['git'], { encoding: 'utf8' }).trim();

// CLI signal cleanup is exercised against disposable Git clones and local tools.
// The official network is never contacted and dependency scripts are never run.
for (const phase of ['fetch', 'install']) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    test(
      `CLI ${signal} waits for ${phase} process cleanup and releases its lock`,
      { skip: process.platform === 'win32', timeout: 15_000 },
      async (context) => {
        const temp = await realpath(
          await mkdtemp(path.join(os.tmpdir(), 'ic-atlas-cli-test-')),
        );
        context.after(() => rm(temp, { recursive: true, force: true }));
        const upstream = path.join(temp, 'upstream');
        const root = path.join(temp, 'checkout');
        const bin = path.join(temp, 'bin');
        const ready = path.join(temp, 'child-ready');
        const cleaned = path.join(temp, 'child-cleaned');
        await mkdir(path.join(upstream, 'scripts'), { recursive: true });
        await mkdir(bin);
        for (const name of ['update-core.mjs', 'update.mjs'])
          await copyFile(
            path.join(scripts, name),
            path.join(upstream, 'scripts', name),
          );
        const runGit = (cwd, args) =>
          execFileSync(gitExecutable, args, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }).trim();
        runGit(upstream, ['init', '--initial-branch=main']);
        runGit(upstream, ['config', 'user.name', 'CLI Test']);
        runGit(upstream, ['config', 'user.email', 'cli@example.invalid']);
        runGit(upstream, ['add', '.']);
        runGit(upstream, ['commit', '-m', 'Test fixture']);
        runGit(temp, ['clone', upstream, root]);
        await writeFile(
          path.join(upstream, 'new-version.txt'),
          'new version\n',
        );
        runGit(upstream, ['add', '.']);
        runGit(upstream, ['commit', '-m', 'New version']);
        const before = runGit(root, ['rev-parse', 'HEAD']);
        const latest = runGit(upstream, ['rev-parse', 'HEAD']);
        const fakeTool = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const isGit = path.basename(process.argv[1]) === 'git';
const blocks = isGit ? args.includes('fetch') && process.env.CLI_TEST_PHASE === 'fetch' : true;
if (blocks) {
  const keepAlive = setInterval(() => {}, 1000);
  process.on('SIGTERM', () => setTimeout(() => {
    fs.writeFileSync(process.env.CLI_TEST_CLEANED, 'cleaned');
    clearInterval(keepAlive);
    process.exit(0);
  }, 120));
  fs.writeFileSync(process.env.CLI_TEST_READY, String(process.pid));
} else {
  const result = spawnSync(process.env.CLI_TEST_GIT, args.map(arg => arg === 'https://github.com/vaenshine/ic-atlas.git' ? process.env.CLI_TEST_UPSTREAM : arg), { stdio: 'inherit', env: { ...process.env, GIT_EXEC_PATH: process.env.CLI_TEST_GIT_EXEC_PATH } });
  process.exit(result.status ?? 1);
}
`;
        for (const name of ['git', 'npm'])
          await writeFile(path.join(bin, name), fakeTool, { mode: 0o755 });
        const env = {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          CLI_TEST_PHASE: phase,
          CLI_TEST_READY: ready,
          CLI_TEST_CLEANED: cleaned,
          CLI_TEST_GIT: gitExecutable,
          CLI_TEST_GIT_EXEC_PATH: git,
          CLI_TEST_UPSTREAM: upstream,
        };
        delete env.npm_execpath;
        const child = spawn(
          process.execPath,
          ['scripts/update.mjs', '--json'],
          { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
          stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
        });
        context.after(() => {
          if (child.exitCode === null && child.signalCode === null)
            child.kill('SIGTERM');
        });
        const completion = new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', (code, exitSignal) =>
            resolve({ code, signal: exitSignal }),
          );
        });
        const start = Date.now();
        while (true) {
          try {
            await readFile(ready);
            break;
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
          assert.ok(
            Date.now() - start < 10_000,
            `CLI did not reach ${phase}: ${stderr}`,
          );
          assert.equal(child.exitCode, null, stdout + stderr);
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        child.kill(signal);
        // Repeated signals must leave cleanup running.
        await new Promise((resolve) => setTimeout(resolve, 25));
        child.kill(signal);
        const stopped = await completion;
        assert.equal(
          stopped.code,
          signal === 'SIGINT' ? 130 : 143,
          stdout + stderr,
        );
        assert.equal(stopped.signal, null);
        assert.equal(await readFile(cleaned, 'utf8'), 'cleaned');
        await assert.rejects(
          readFile(
            path.join(root, '.git', 'ic-atlas-update.lock', 'owner.json'),
          ),
          { code: 'ENOENT' },
        );
        const state = JSON.parse(stdout);
        assert.equal(state.reason, 'cancelled');
        assert.equal(
          runGit(root, ['rev-parse', 'HEAD']),
          phase === 'fetch' ? before : latest,
        );
        if (phase === 'install') {
          assert.equal(state.sourceUpdated, true);
          assert.equal(state.dependenciesInstalled, false);
        }
      },
    );
  }
}
