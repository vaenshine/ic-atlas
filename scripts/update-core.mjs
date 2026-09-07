import { spawn } from 'node:child_process';
import { mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const UPSTREAM_URL = 'https://github.com/vaenshine/ic-atlas.git';
export const UPSTREAM_BRANCH = 'main';
const UPSTREAM_REF = 'refs/ic-atlas/upstream/main';
const GIT_TIMEOUT = 45_000;
const INSTALL_TIMEOUT = 10 * 60_000;
const MAX_OUTPUT = 2 * 1024 * 1024;

/** Run without a shell, with bounded output and a deadline. */
export async function runCommand(command, args, options) {
  if (options.signal?.aborted)
    return { code: 1, stdout: '', stderr: '', aborted: true };
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let outputLimited = false;
    let aborted = false;
    let stopping = false;
    let killTimer;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    });
    const stop = () => {
      if (stopping) return;
      stopping = true;
      const killTree = (signal) => {
        if (!child.pid) return;
        if (process.platform === 'win32') {
          const killer = spawn(
            'taskkill',
            ['/pid', String(child.pid), '/T', '/F'],
            { stdio: 'ignore', windowsHide: true },
          );
          killer.on('error', () => child.kill());
        } else {
          try {
            process.kill(-child.pid, signal);
          } catch {
            /* The process tree already exited. */
          }
        }
      };
      killTree('SIGTERM');
      killTimer = setTimeout(() => killTree('SIGKILL'), 2_000);
      killTimer.unref();
    };
    const abort = () => {
      aborted = true;
      stop();
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs);
    timer.unref();
    const collect = (stream) => (chunk) => {
      const text = chunk.toString();
      if (stdout.length + stderr.length + text.length > MAX_OUTPUT) {
        if (!outputLimited) stop();
        outputLimited = true;
        return;
      }
      if (stream === 'stdout') stdout += text;
      else stderr += text;
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.on('error', (error) => {
      stderr += error.message;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', abort);
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        timedOut,
        outputLimited,
        aborted,
      });
    });
  });
}

function result(status, reason, message, extra = {}) {
  return {
    status,
    reason,
    message,
    canUpdate: false,
    current: null,
    latest: null,
    ...extra,
  };
}

function commandError(command, output) {
  const error = new Error(`${command} failed`);
  error.output = output;
  return error;
}

function failure(reason, message, error, extra = {}) {
  if (error?.output?.aborted) {
    reason = 'cancelled';
    message = extra.sourceUpdated
      ? 'The source was updated. Dependency installation was interrupted; run npm ci before restarting the server.'
      : 'The operation was cancelled. Review the checkout before retrying.';
  }
  return result('error', reason, message, {
    ...extra,
    timedOut: Boolean(error?.output?.timedOut),
    aborted: Boolean(error?.output?.aborted),
  });
}

function validSha(value) {
  return /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value);
}

/**
 * Git-based updater for an explicitly supplied project root.
 * `run(command, args, {cwd, env, timeoutMs, signal})` is injectable for isolated tests.
 * Production always fetches the official HTTPS URL; remotes stay unchanged.
 */
export function createUpdater({ root, run = runCommand, signal }) {
  if (!root || !path.isAbsolute(root))
    throw new Error('An absolute project root is required.');
  const env = { ...process.env };
  // A caller's unrelated Git environment must never redirect this updater.
  for (const key of Object.keys(env))
    if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, {
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'Never',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    GIT_EDITOR: 'true',
    GIT_MERGE_AUTOEDIT: 'no',
  });

  async function git(args, { allowFailure = false } = {}) {
    const output = await run('git', args, {
      cwd: root,
      env,
      timeoutMs: GIT_TIMEOUT,
      signal,
    });
    if (
      output.aborted ||
      output.timedOut ||
      output.outputLimited ||
      (output.code !== 0 && !allowFailure)
    )
      throw commandError('git', output);
    return output;
  }

  async function installation() {
    try {
      const top = await git(['rev-parse', '--show-toplevel'], {
        allowFailure: true,
      });
      if (top.aborted) throw commandError('git', top);
      if (top.code !== 0) {
        return result(
          'manual',
          'not-git',
          'Use a Git clone to enable updates, or download the latest release manually.',
        );
      }
      const canonicalRoot = await realpath(root);
      const canonicalTop = await realpath(top.stdout.trim());
      if (canonicalRoot !== canonicalTop) {
        return result(
          'blocked',
          'wrong-root',
          'Run the updater from the root of the IC Atlas Git repository.',
        );
      }
      const current = (
        await git(['rev-parse', '--verify', 'HEAD'])
      ).stdout.trim();
      if (!validSha(current)) throw new Error('Invalid current commit.');
      const branchResult = await git(
        ['symbolic-ref', '--quiet', '--short', 'HEAD'],
        { allowFailure: true },
      );
      const branch =
        branchResult.code === 0 ? branchResult.stdout.trim() : null;
      const gitDir = (
        await git(['rev-parse', '--absolute-git-dir'])
      ).stdout.trim();
      const commonDir = path.resolve(
        root,
        (await git(['rev-parse', '--git-common-dir'])).stdout.trim(),
      );
      const extra = { current, branch, gitDir, commonDir };
      if (branch !== UPSTREAM_BRANCH) {
        return result(
          'blocked',
          'wrong-branch',
          'Switch to the main branch before updating.',
          extra,
        );
      }
      for (const marker of [
        'MERGE_HEAD',
        'CHERRY_PICK_HEAD',
        'REVERT_HEAD',
        'rebase-apply',
        'rebase-merge',
        'sequencer',
        'BISECT_START',
      ]) {
        try {
          await stat(path.join(gitDir, marker));
          return result(
            'blocked',
            'git-operation-in-progress',
            'Finish the current Git operation before updating.',
            extra,
          );
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      const dirty = (
        await git([
          'status',
          '--porcelain=v1',
          '-z',
          '--untracked-files=all',
          '--ignore-submodules=none',
        ])
      ).stdout;
      if (dirty) {
        return result(
          'blocked',
          'local-changes',
          'Commit or move local changes and untracked files before updating.',
          extra,
        );
      }
      return result(
        'ready',
        'ready',
        'This Git installation can check the official main branch for updates.',
        extra,
      );
    } catch (error) {
      return failure(
        'inspection-failed',
        'The Git installation could not be inspected.',
        error,
      );
    }
  }

  function publicResult(value) {
    const { gitDir: _gitDir, commonDir: _commonDir, ...visible } = value;
    return visible;
  }

  async function locked(operation) {
    const initial = await installation();
    if (initial.status !== 'ready') return publicResult(initial);
    const lock = path.join(initial.commonDir, 'ic-atlas-update.lock');
    try {
      await mkdir(lock);
    } catch (error) {
      if (error.code === 'EEXIST') {
        return result(
          'blocked',
          'update-in-progress',
          'Another update or check holds the update lock. After an interrupted process, remove the Git directory’s ic-atlas-update.lock folder only when no updater is running.',
          { current: initial.current, branch: initial.branch },
        );
      }
      return failure(
        'lock-failed',
        'The updater could not create its lock.',
        error,
        { current: initial.current },
      );
    }
    try {
      await writeFile(
        path.join(lock, 'owner.json'),
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
        }),
      );
      return publicResult(await operation());
    } catch (error) {
      return failure('update-failed', 'The update operation failed.', error, {
        current: initial.current,
      });
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }

  async function checkUnlocked() {
    const before = await installation();
    if (before.status !== 'ready') return before;
    try {
      await git([
        '-c',
        'credential.helper=',
        '-c',
        'core.askPass=',
        'fetch',
        '--no-tags',
        '--no-write-fetch-head',
        UPSTREAM_URL,
        `+refs/heads/${UPSTREAM_BRANCH}:${UPSTREAM_REF}`,
      ]);
    } catch (error) {
      return failure(
        'network-error',
        'The official repository could not be reached. Check your connection and try again.',
        error,
        { current: before.current, branch: before.branch },
      );
    }
    const after = await installation();
    if (after.status !== 'ready') return after;
    if (after.current !== before.current) {
      return result(
        'blocked',
        'installation-changed',
        'The checkout changed during the check. Check again.',
        { current: after.current, branch: after.branch },
      );
    }
    const latest = (
      await git(['rev-parse', '--verify', `${UPSTREAM_REF}^{commit}`])
    ).stdout.trim();
    if (!validSha(latest)) throw new Error('Invalid upstream commit.');
    const extra = { current: after.current, latest, branch: after.branch };
    if (after.current === latest)
      return result(
        'up-to-date',
        'up-to-date',
        'This installation is up to date.',
        extra,
      );
    const counts = (
      await git(['rev-list', '--left-right', '--count', `HEAD...${latest}`])
    ).stdout
      .trim()
      .split(/\s+/)
      .map(Number);
    if (
      counts.length !== 2 ||
      counts.some((count) => !Number.isSafeInteger(count) || count < 0)
    )
      throw new Error('Invalid Git commit counts.');
    if (counts[0] > 0) {
      return result(
        'blocked',
        counts[1] > 0 ? 'diverged' : 'local-ahead',
        counts[1] > 0
          ? 'Local commits diverge from the official main branch. Reconcile them manually before updating.'
          : 'This checkout contains local commits. Reconcile them with the official main branch before updating.',
        { ...extra, ahead: counts[0], behind: counts[1] },
      );
    }
    const ancestor = await git(
      ['merge-base', '--is-ancestor', after.current, latest],
      { allowFailure: true },
    );
    if (ancestor.code !== 0) {
      return result(
        'blocked',
        'non-fast-forward',
        'The upstream update requires manual Git reconciliation.',
        extra,
      );
    }
    return result(
      'update-available',
      'update-available',
      'An update is available from the official main branch.',
      { ...extra, canUpdate: true, ahead: 0, behind: counts[1] },
    );
  }

  async function apply({ onProgress } = {}) {
    const progress = (phase, message, extra = {}) => {
      try {
        onProgress?.({ phase, message, ...extra });
      } catch {
        /* Reporting cannot interrupt an update. */
      }
    };
    return locked(async () => {
      progress(
        'checking',
        'Checking the checkout and the official main branch.',
      );
      const checked = await checkUnlocked();
      if (checked.status !== 'update-available') return checked;
      const again = await installation();
      if (again.status !== 'ready') return again;
      if (again.current !== checked.current) {
        return result(
          'blocked',
          'installation-changed',
          'The checkout changed before the update. Check again.',
          { current: again.current, latest: checked.latest },
        );
      }
      const extra = {
        current: checked.current,
        latest: checked.latest,
        previous: checked.current,
        branch: UPSTREAM_BRANCH,
      };
      progress('updating', 'Fast-forwarding the local main branch.', extra);
      try {
        await git([
          'merge',
          '--ff-only',
          '--no-edit',
          '--no-autostash',
          '--no-overwrite-ignore',
          checked.latest,
        ]);
      } catch (error) {
        const observed = await installation();
        return failure(
          'fast-forward-failed',
          'Git could not fast-forward this checkout. Review its state before retrying.',
          error,
          {
            ...extra,
            current: observed.current ?? checked.current,
            sourceUpdated: observed.current === checked.latest,
          },
        );
      }
      progress(
        'installing',
        'Installing the updated dependency lockfile with npm ci.',
        { current: checked.latest, latest: checked.latest },
      );
      try {
        // Use the npm CLI already running this process, or the installed npm executable.
        let npmCli = process.env.npm_execpath;
        if (!npmCli && process.platform === 'win32') {
          npmCli = path.join(
            path.dirname(process.execPath),
            'node_modules',
            'npm',
            'bin',
            'npm-cli.js',
          );
          await stat(npmCli);
        }
        const command = npmCli ? process.execPath : 'npm';
        const args = npmCli
          ? [npmCli, 'ci', '--no-audit', '--no-fund']
          : ['ci', '--no-audit', '--no-fund'];
        const installed = await run(command, args, {
          cwd: root,
          env,
          timeoutMs: INSTALL_TIMEOUT,
          signal,
        });
        if (
          installed.code !== 0 ||
          installed.aborted ||
          installed.timedOut ||
          installed.outputLimited
        )
          throw commandError('npm ci', installed);
      } catch (error) {
        return failure(
          'dependency-install-failed',
          'The source was updated, but dependency installation failed. Run npm ci in the project directory, then restart the local server.',
          error,
          {
            ...extra,
            current: checked.latest,
            sourceUpdated: true,
            dependenciesInstalled: false,
            recoveryCommands: ['npm ci'],
          },
        );
      }
      progress('complete', 'Source and dependencies updated successfully.', {
        current: checked.latest,
        latest: checked.latest,
      });
      return result(
        'updated',
        'updated',
        'Source and dependencies updated successfully. Rebuild and restart the local server to use this version.',
        {
          ...extra,
          current: checked.latest,
          sourceUpdated: true,
          dependenciesInstalled: true,
        },
      );
    });
  }

  return {
    inspect: async () => publicResult(await installation()),
    check: () => locked(checkUnlocked),
    apply,
  };
}

export const inspectInstallation = (root) => createUpdater({ root }).inspect();
export const checkForUpdates = (root) => createUpdater({ root }).check();
export const applyUpdate = (root, options) =>
  createUpdater({ root }).apply(options);
