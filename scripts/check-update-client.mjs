import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkStaticBuild,
  isLocalHost,
  operationResult,
  initialManagedResult,
  beginOrResumeOperation,
  waitForLocalOperation,
} from '../app/update-client.ts';

const current = 'a'.repeat(40);
const latest = 'b'.repeat(40);
const build = {
  schema: 1,
  name: 'ic-atlas',
  version: '0.2.0',
  commit: current,
  builtAt: '',
};
const manifest = { ...build, version: '0.3.0', commit: latest };

test('static checks distinguish new, identical, ahead and forked revisions', async () => {
  for (const [comparison, expected, reason] of [
    ['ahead', 'update-available', undefined],
    ['identical', 'up-to-date', undefined],
    ['behind', 'blocked', 'ahead'],
    ['diverged', 'blocked', 'diverged'],
  ]) {
    const requests = [];
    const result = await checkStaticBuild(build, async (url) => {
      requests.push(url);
      return requests.length === 1 ? manifest : { status: comparison };
    });
    assert.equal(result.status, expected);
    assert.equal(result.reason, reason);
    assert.equal(
      result.canUpdate,
      false,
      'A static browser never receives local install capability',
    );
    assert(requests[1].includes(`${current}...${latest}`));
  }
});

test('identical build avoids the comparison API; ZIP offers manual updates', async () => {
  let requests = 0;
  const same = await checkStaticBuild(build, async () => {
    requests++;
    return build;
  });
  assert.equal(same.status, 'up-to-date');
  assert.equal(requests, 1);
  const archive = await checkStaticBuild(
    { ...build, commit: null },
    async () => manifest,
  );
  assert.equal(archive.status, 'manual');
  assert.equal(archive.reason, 'archive');
});

test('invalid or unavailable remote data never becomes an update', async () => {
  for (const invalid of [
    {},
    { ...manifest, name: 'other' },
    { ...manifest, commit: '../../command' },
  ]) {
    await assert.rejects(checkStaticBuild(build, async () => invalid));
  }
  await assert.rejects(
    checkStaticBuild(build, async () => {
      throw new Error('offline');
    }),
  );
  let request = 0;
  await assert.rejects(
    checkStaticBuild(build, async () =>
      ++request === 1 ? manifest : { status: 'unknown' },
    ),
  );
});

test('local manager probe is limited to loopback hostnames', () => {
  for (const host of ['localhost', '127.0.0.1', '127.1.2.3', '[::1]'])
    assert(isLocalHost(host));
  for (const host of [
    'vaenshine.github.io',
    'localhost.example.com',
    '192.168.1.2',
    '127.0.0.1.example.com',
  ])
    assert(!isLocalHost(host));
});

function status(
  state,
  result = { status: 'updated', canUpdate: false, sourceUpdated: true },
) {
  return {
    managed: true,
    csrfToken: 'test',
    mode: 'dev',
    version: '0.2.0',
    currentSha: latest,
    installation: result,
    operation: {
      id: 'op',
      type: 'update',
      state,
      phase: 'installing',
      message: 'Installing',
      result,
    },
  };
}

test('polling resumes an existing update and returns its result', async () => {
  const queue = [status('running'), status('running'), status('succeeded')];
  const progress = [];
  const finished = await waitForLocalOperation('op', {
    read: async () => queue.shift(),
    pause: async () => {},
    onStatus: (s) => progress.push(s.operation.state),
  });
  assert.deepEqual(progress, ['running', 'running', 'succeeded']);
  assert.equal(operationResult(finished).status, 'updated');
});

test('multiple tabs join running work and recover a POST race without repeating installation', async () => {
  let posts = 0;
  const existing = status('running');
  const operation = await beginOrResumeOperation(
    'check',
    async () => existing,
    async () => {
      posts++;
    },
  );
  assert.equal(operation.type, 'update');
  assert.equal(posts, 0);
  const queue = [{ ...existing, operation: null }, existing];
  const raced = await beginOrResumeOperation(
    'update',
    async () => queue.shift(),
    async () => {
      posts++;
      throw new Error('HTTP 409');
    },
  );
  assert.equal(raced.id, existing.operation.id);
  assert.equal(posts, 1);
  await assert.rejects(
    beginOrResumeOperation(
      'check',
      async () => ({ ...existing, operation: null }),
      async () => {
        throw new Error('offline');
      },
    ),
  );
});

test('page reload preserves recovery details and rejects cache from another installed revision', () => {
  const cached = {
    status: 'update-available',
    canUpdate: true,
    current,
    latest,
  };
  const failure = {
    status: 'error',
    canUpdate: false,
    current: latest,
    sourceUpdated: true,
    recoveryCommands: ['npm ci', 'npm run build'],
  };
  assert.deepEqual(
    initialManagedResult(status('failed', failure), current, cached),
    failure,
  );
  const updated = {
    status: 'updated',
    canUpdate: false,
    current: latest,
    sourceUpdated: true,
  };
  assert.deepEqual(
    initialManagedResult(status('succeeded', updated), current, cached),
    updated,
  );
  assert.equal(
    initialManagedResult(status('succeeded', updated), latest, cached),
    null,
  );
  const ready = {
    ...status('succeeded'),
    operation: null,
    installation: { status: 'ready', canUpdate: false },
  };
  assert.equal(initialManagedResult(ready, latest, cached), null);
  const matching = { status: 'up-to-date', canUpdate: false, current: latest };
  assert.deepEqual(initialManagedResult(ready, latest, matching), matching);
});

test('failed updates preserve partial-installation details and reject lost operations', async () => {
  const failure = {
    status: 'error',
    canUpdate: false,
    sourceUpdated: true,
    reason: 'build-failed',
    recoveryCommands: ['npm run build'],
  };
  const failed = await waitForLocalOperation('op', {
    read: async () => status('failed', failure),
    pause: async () => {},
  });
  assert.deepEqual(operationResult(failed), failure);
  assert.equal(operationResult(status('failed')).status, 'error');
  await assert.rejects(
    waitForLocalOperation('different', {
      read: async () => status('running'),
      pause: async () => {},
    }),
  );
  await assert.rejects(waitForLocalOperation('op', { cancelled: () => true }));
  await assert.rejects(waitForLocalOperation('op', { timeout: 0 }));
});
