import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createUpdater, runCommand, UPSTREAM_URL } from './update-core.mjs';

// Every mutation runs in a disposable repository. The real project is never updated.
async function fixture(context) {
  const temp = await realpath(
    await mkdtemp(path.join(os.tmpdir(), 'ic-atlas-updater-test-')),
  );
  context.after(() => rm(temp, { recursive: true, force: true }));
  const upstream = path.join(temp, 'upstream');
  const local = path.join(temp, 'local');
  const exec = async (cwd, args) => {
    assert.ok(cwd.startsWith(temp + path.sep));
    const response = await runCommand('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      timeoutMs: 10_000,
    });
    assert.equal(response.code, 0, `${args.join(' ')}: ${response.stderr}`);
    return response.stdout.trim();
  };
  await mkdir(upstream);
  await exec(upstream, ['init', '--initial-branch=main']);
  await exec(upstream, ['config', 'user.name', 'Updater Test']);
  await exec(upstream, ['config', 'user.email', 'updater@example.invalid']);
  await writeFile(
    path.join(upstream, 'package.json'),
    '{"name":"updater-fixture","version":"1.0.0","private":true}\n',
  );
  await writeFile(path.join(upstream, 'sample.txt'), 'base\n');
  await exec(upstream, ['add', '.']);
  await exec(upstream, ['commit', '-m', 'Initial fixture']);
  await mkdir(local);
  await exec(local, ['clone', upstream, '.']);
  await exec(local, ['config', 'user.name', 'Updater Test']);
  await exec(local, ['config', 'user.email', 'updater@example.invalid']);
  const initial = await exec(local, ['rev-parse', 'HEAD']);
  const remoteConfig = await exec(local, [
    'config',
    '--get-regexp',
    '^remote[.]',
  ]);
  let installs = 0;
  let fetches = 0;
  const run = async (command, args, options) => {
    assert.equal(await realpath(options.cwd), local);
    if (command === 'git') {
      if (args.includes('fetch')) {
        fetches++;
        assert.ok(
          args.includes(UPSTREAM_URL),
          'Production fetch URL is fixed.',
        );
        assert.equal(options.env.GIT_TERMINAL_PROMPT, '0');
        assert.ok(
          options.timeoutMs <= 60_000,
          'Network fetch has a bounded deadline.',
        );
        return runCommand(
          command,
          args.map((arg) => (arg === UPSTREAM_URL ? upstream : arg)),
          options,
        );
      }
      return runCommand(command, args, options);
    }
    assert.ok(args.includes('ci'), `Unexpected non-Git command: ${command}`);
    installs++;
    return {
      code: 0,
      stdout: 'Dependencies installed in test runner.',
      stderr: '',
    };
  };
  const advance = async (
    cwd = upstream,
    filename = 'sample.txt',
    text = 'updated\n',
  ) => {
    await writeFile(path.join(cwd, filename), text);
    await exec(cwd, ['add', filename]);
    await exec(cwd, ['commit', '-m', `Update ${filename}`]);
    return exec(cwd, ['rev-parse', 'HEAD']);
  };
  return {
    temp,
    upstream,
    local,
    initial,
    remoteConfig,
    exec,
    run,
    advance,
    get installs() {
      return installs;
    },
    get fetches() {
      return fetches;
    },
  };
}

test('checks and fast-forwards a clean main clone without changing remote configuration', async (context) => {
  const f = await fixture(context);
  const updater = createUpdater({ root: f.local, run: f.run });
  assert.equal((await updater.inspect()).status, 'ready');
  assert.equal((await updater.check()).status, 'up-to-date');
  const latest = await f.advance();
  const checked = await updater.check();
  assert.equal(checked.status, 'update-available');
  assert.equal(checked.current, f.initial);
  assert.equal(checked.latest, latest);
  assert.equal(checked.canUpdate, true);
  assert.equal(
    await f.exec(f.local, ['rev-parse', 'HEAD']),
    f.initial,
    'Checking leaves HEAD unchanged.',
  );
  const phases = [];
  const updated = await updater.apply({
    onProgress: ({ phase }) => phases.push(phase),
  });
  assert.equal(updated.status, 'updated');
  assert.equal(updated.current, latest);
  assert.equal(updated.sourceUpdated, true);
  assert.equal(updated.dependenciesInstalled, true);
  assert.equal(f.installs, 1);
  assert.deepEqual(phases, ['checking', 'updating', 'installing', 'complete']);
  assert.equal(
    await f.exec(f.local, ['config', '--get-regexp', '^remote[.]']),
    f.remoteConfig,
  );
  assert.equal(await f.exec(f.local, ['status', '--porcelain']), '');
  assert.equal(
    (await updater.check()).status,
    'up-to-date',
    'The exclusive lock is released.',
  );
});

for (const kind of ['tracked', 'staged', 'untracked']) {
  test(`preserves ${kind} local changes and avoids fetching or installing`, async (context) => {
    const f = await fixture(context);
    await f.advance();
    const filename = kind === 'untracked' ? 'my-notes.txt' : 'sample.txt';
    await writeFile(path.join(f.local, filename), 'Keep my local work.\n');
    if (kind === 'staged') await f.exec(f.local, ['add', filename]);
    const before = await f.exec(f.local, ['status', '--porcelain']);
    const state = await createUpdater({ root: f.local, run: f.run }).apply();
    assert.equal(state.reason, 'local-changes');
    assert.equal(await f.exec(f.local, ['status', '--porcelain']), before);
    assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), f.initial);
    assert.equal(
      await readFile(path.join(f.local, filename), 'utf8'),
      'Keep my local work.\n',
    );
    assert.equal(f.fetches, 0);
    assert.equal(f.installs, 0);
  });
}

test('preserves a feature branch and a detached checkout', async (context) => {
  const f = await fixture(context);
  await f.exec(f.local, ['switch', '-c', 'my-work']);
  const updater = createUpdater({ root: f.local, run: f.run });
  assert.equal((await updater.apply()).reason, 'wrong-branch');
  assert.equal(await f.exec(f.local, ['branch', '--show-current']), 'my-work');
  await f.exec(f.local, ['checkout', '--detach', 'HEAD']);
  assert.equal((await updater.apply()).reason, 'wrong-branch');
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), f.initial);
  assert.equal(f.fetches, 0);
});

test('blocks ahead and diverged history without rewriting local commits', async (context) => {
  const f = await fixture(context);
  const own = await f.advance(f.local, 'local.txt', 'local contribution\n');
  const updater = createUpdater({ root: f.local, run: f.run });
  assert.equal((await updater.apply()).reason, 'local-ahead');
  await f.advance();
  assert.equal((await updater.apply()).reason, 'diverged');
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), own);
  assert.equal(f.installs, 0);
});

test('refuses a nested directory, and provides manual guidance for ZIP installations', async (context) => {
  const f = await fixture(context);
  const nested = path.join(f.local, 'nested');
  const zip = path.join(f.temp, 'zip');
  await mkdir(nested);
  await mkdir(zip);
  // Default runner is safe here: root checks return before any network fetch.
  assert.equal(
    (await createUpdater({ root: nested }).apply()).reason,
    'wrong-root',
  );
  assert.equal((await createUpdater({ root: zip }).apply()).status, 'manual');
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), f.initial);
});

test('network failures preserve the checkout and release the lock', async (context) => {
  const f = await fixture(context);
  const offline = createUpdater({
    root: f.local,
    run: (command, args, options) =>
      args.includes('fetch')
        ? Promise.resolve({
            code: 1,
            stdout: '',
            stderr: 'offline',
            timedOut: true,
          })
        : f.run(command, args, options),
  });
  const failed = await offline.apply();
  assert.equal(failed.reason, 'network-error');
  assert.equal(failed.timedOut, true);
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), f.initial);
  assert.equal(
    (await createUpdater({ root: f.local, run: f.run }).check()).status,
    'up-to-date',
  );
  assert.equal(f.installs, 0);
});

test('reports source changes honestly when npm ci fails', async (context) => {
  const f = await fixture(context);
  const latest = await f.advance();
  const updater = createUpdater({
    root: f.local,
    run: (command, args, options) =>
      command === 'git'
        ? f.run(command, args, options)
        : Promise.resolve({
            code: 1,
            stdout: '',
            stderr: 'registry unavailable',
          }),
  });
  const failed = await updater.apply();
  assert.equal(failed.reason, 'dependency-install-failed');
  assert.equal(failed.sourceUpdated, true);
  assert.equal(failed.dependenciesInstalled, false);
  assert.deepEqual(failed.recoveryCommands, ['npm ci']);
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), latest);
  assert.equal(failed.current, latest);
});

test('protects ignored local files when upstream starts tracking the same path', async (context) => {
  const f = await fixture(context);
  await f.advance(f.upstream, '.gitignore', '*.local\n');
  const updater = createUpdater({ root: f.local, run: f.run });
  assert.equal((await updater.apply()).status, 'updated');
  const before = await f.exec(f.local, ['rev-parse', 'HEAD']);
  await writeFile(
    path.join(f.local, 'settings.local'),
    'Keep local settings.\n',
  );
  await writeFile(
    path.join(f.upstream, 'settings.local'),
    'Upstream settings.\n',
  );
  await f.exec(f.upstream, ['add', '--force', 'settings.local']);
  await f.exec(f.upstream, ['commit', '-m', 'Track new settings']);
  const blocked = await updater.apply();
  assert.equal(blocked.reason, 'fast-forward-failed');
  assert.equal(blocked.sourceUpdated, false);
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), before);
  assert.equal(
    await readFile(path.join(f.local, 'settings.local'), 'utf8'),
    'Keep local settings.\n',
  );
});

test('a second updater cannot run while a check owns the Git-directory lock', async (context) => {
  const f = await fixture(context);
  let entered;
  const arrived = new Promise((resolve) => {
    entered = resolve;
  });
  let resume;
  const gate = new Promise((resolve) => {
    resume = resolve;
  });
  const slow = createUpdater({
    root: f.local,
    run: async (command, args, options) => {
      if (args.includes('fetch')) {
        entered();
        await gate;
      }
      return f.run(command, args, options);
    },
  });
  const first = slow.check();
  try {
    await arrived;
    assert.equal(
      (await createUpdater({ root: f.local, run: f.run }).apply()).reason,
      'update-in-progress',
    );
  } finally {
    resume();
  }
  assert.equal((await first).status, 'up-to-date');
});

test('rechecks changes made during a network check before applying', async (context) => {
  const f = await fixture(context);
  await f.advance();
  const updater = createUpdater({
    root: f.local,
    run: async (command, args, options) => {
      const output = await f.run(command, args, options);
      if (args.includes('fetch'))
        await writeFile(
          path.join(f.local, 'new-note.txt'),
          'typed while checking\n',
        );
      return output;
    },
  });
  assert.equal((await updater.apply()).reason, 'local-changes');
  assert.equal(await f.exec(f.local, ['rev-parse', 'HEAD']), f.initial);
  assert.equal(f.installs, 0);
});

test('an existing Git operation blocks the updater', async (context) => {
  const f = await fixture(context);
  await writeFile(path.join(f.local, '.git', 'MERGE_HEAD'), `${f.initial}\n`);
  assert.equal(
    (await createUpdater({ root: f.local, run: f.run }).apply()).reason,
    'git-operation-in-progress',
  );
  assert.equal(f.fetches, 0);
});

test('the runner cancels spawned work promptly and enforces deadlines', async () => {
  const controller = new AbortController();
  const cancel = setTimeout(() => controller.abort(), 100);
  try {
    const cancelled = await runCommand(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        cwd: os.tmpdir(),
        env: process.env,
        timeoutMs: 5_000,
        signal: controller.signal,
      },
    );
    assert.equal(cancelled.aborted, true);
    assert.notEqual(cancelled.code, 0);
  } finally {
    clearTimeout(cancel);
  }
  const expired = await runCommand(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    { cwd: os.tmpdir(), env: process.env, timeoutMs: 100 },
  );
  assert.equal(expired.timedOut, true);
  assert.notEqual(expired.code, 0);
});
