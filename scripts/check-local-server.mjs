import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createBackend, createLocalServer } from './local-server.mjs';

const initial = {
  status: 'ready',
  canUpdate: false,
  current: 'a'.repeat(40),
  latest: null,
};
const available = {
  status: 'update-available',
  canUpdate: true,
  current: initial.current,
  latest: 'b'.repeat(40),
};
const updated = {
  status: 'updated',
  canUpdate: false,
  current: available.latest,
  latest: available.latest,
  sourceUpdated: true,
  dependenciesInstalled: true,
  message: 'Updated.',
};

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ic-atlas-http-'));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ version: '0.1.0' }),
  );
  const calls = [];
  const upstream = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/plain');
    res.end(`upstream:${req.url}`);
  });
  const upstreamSockets = new Set();
  upstream.on('connection', (socket) => {
    upstreamSockets.add(socket);
    socket.on('close', () => upstreamSockets.delete(socket));
  });
  upstream.on('upgrade', (_req, socket, head) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
    );
    if (head.length) socket.write(head);
    socket.on('data', (data) => socket.write(data));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const backend = {
    port: upstream.address().port,
    async start() {
      calls.push('start');
    },
    async stop() {
      calls.push('stop');
    },
    async build() {
      calls.push('build');
    },
    ...options.backend,
  };
  const updater = {
    async inspect() {
      return initial;
    },
    async check() {
      calls.push('check');
      return available;
    },
    async apply({ onProgress }) {
      calls.push('apply');
      onProgress({ phase: 'installing', message: 'Installing.' });
      return updated;
    },
    ...options.updater,
  };
  const local = await createLocalServer({
    root,
    mode: options.mode || 'dev',
    port: 0,
    updater,
    backend,
  });
  const port = await local.listen();
  const origin = `http://127.0.0.1:${port}`;
  t.after(async () => {
    await local.close();
    for (const socket of upstreamSockets) socket.destroy();
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  async function request(
    url = '/__ic_atlas/status',
    { method = 'GET', headers = {}, body } = {},
  ) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: url, method, headers },
        (res) => {
          let text = '';
          res.on('data', (chunk) => {
            text += chunk;
          });
          res.on('end', () => {
            let data;
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
            resolve({ status: res.statusCode, headers: res.headers, data });
          });
        },
      );
      req.on('error', reject);
      req.end(body);
    });
  }
  const session = (await request()).data;
  const control = (type, overrides = {}) =>
    request(`/__ic_atlas/${type}`, {
      method: 'POST',
      headers: {
        Origin: origin,
        'X-IC-Atlas-Token': session.csrfToken,
        'Content-Type': 'application/json',
        ...overrides.headers,
      },
      body: overrides.body ?? '{}',
    });
  async function finished() {
    for (let count = 0; count < 100; count++) {
      const status = (await request()).data;
      if (status.operation?.state !== 'running') return status;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Operation did not finish.');
  }
  return { request, control, finished, calls, session, origin, port, local };
}

test('status is local, uncached and carries only a process-scoped token', async (t) => {
  const f = await fixture(t);
  const response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.data.managed, true);
  assert.equal(response.data.currentSha, initial.current);
  assert.equal(response.data.version, '0.1.0');
  assert.match(response.data.csrfToken, /^[0-9a-f]{64}$/);
  assert.equal(response.data.operation, null);
  const second = await fixture(t);
  assert.notEqual(second.session.csrfToken, f.session.csrfToken);
});

test('rejects foreign hosts, origins, fetch sites and missing tokens before any mutation', async (t) => {
  const f = await fixture(t);
  for (const headers of [
    { Host: `attacker.example:${f.port}` },
    { Origin: 'https://attacker.example' },
    { 'Sec-Fetch-Site': 'cross-site' },
    { Origin: 'null' },
  ])
    assert.equal((await f.request(undefined, { headers })).status, 403);
  for (const headers of [
    { Origin: '' },
    { Origin: 'https://attacker.example' },
    { 'X-IC-Atlas-Token': 'wrong' },
    { 'Sec-Fetch-Site': 'cross-site' },
    { Host: `attacker.example:${f.port}` },
  ])
    assert.equal((await f.control('update', { headers })).status, 403);
  assert.equal((await f.request('/__ic_atlas/update')).status, 405);
  assert.equal(
    (
      await f.request('/__ic_atlas/update', {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker.example' },
      })
    ).status,
    403,
  );
  assert.equal((await f.request('/__ic_atlas/unknown')).status, 404);
  assert.deepEqual(f.calls, ['start']);
});

test('control accepts only bounded empty JSON without executable parameters', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.control('update', { headers: { 'Content-Type': 'text/plain' } }))
      .status,
    415,
  );
  for (const body of [
    '{"command":"echo unsafe"}',
    '{"url":"https://attacker.example"}',
    '[]',
    'null',
    '1',
    '{',
  ]) {
    assert.equal((await f.control('update', { body })).status, 400);
  }
  assert.equal(
    (
      await f.control('update', {
        body: 'x'.repeat(1025),
        headers: { 'Content-Length': '1025' },
      })
    ).status,
    413,
  );
  assert.deepEqual(f.calls, ['start']);
});

test('checks asynchronously, prevents concurrent operations and keeps the service running', async (t) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture(t, {
    updater: {
      async check() {
        await pending;
        return available;
      },
    },
  });
  assert.equal((await f.control('check')).status, 202);
  assert.equal((await f.request()).data.operation.state, 'running');
  assert.equal((await f.control('update')).status, 409);
  assert.equal((await f.control('check')).status, 409);
  assert.deepEqual(f.calls, ['start']);
  release();
  const status = await f.finished();
  assert.equal(status.installation.status, 'update-available');
  assert.equal(status.operation.state, 'succeeded');
  assert.equal(status.operation.result.latest, available.latest);
});

test('dev updates pause, apply and restart; start mode also builds before restarting', async (t) => {
  for (const mode of ['dev', 'start']) {
    const f = await fixture(t, { mode });
    assert.equal((await f.control('update')).status, 202);
    const status = await f.finished();
    assert.deepEqual(
      f.calls,
      mode === 'dev'
        ? ['start', 'stop', 'apply', 'start']
        : ['start', 'stop', 'apply', 'build', 'start'],
    );
    assert.equal(status.operation.state, 'succeeded');
    assert.equal(status.currentSha, available.latest);
    assert.equal(status.installation.status, 'updated');
  }
});

test('dependency installation failure remains a failure after the server recovers', async (t) => {
  const failure = {
    ...updated,
    status: 'error',
    reason: 'dependency-install-failed',
    dependenciesInstalled: false,
    recoveryCommands: ['npm ci'],
    message: 'Run npm ci to repair dependencies.',
  };
  const f = await fixture(t, {
    updater: {
      async apply() {
        return failure;
      },
    },
  });
  await f.control('update');
  const status = await f.finished();
  assert.equal(status.operation.state, 'failed');
  assert.equal(status.installation.sourceUpdated, true);
  assert.equal(status.installation.dependenciesInstalled, false);
  assert.deepEqual(status.installation.recoveryCommands, ['npm ci']);
  assert.deepEqual(f.calls, ['start', 'stop', 'start']);
});

test('build failure reports the changed source and recovery commands', async (t) => {
  const f = await fixture(t, {
    mode: 'start',
    backend: {
      async build() {
        throw new Error('Build failed.');
      },
    },
  });
  await f.control('update');
  const status = await f.finished();
  assert.equal(status.operation.state, 'failed');
  assert.equal(status.installation.sourceUpdated, true);
  assert.deepEqual(status.installation.recoveryCommands, [
    'npm ci',
    'npm run build',
    'npm start',
  ]);
  assert.match(status.operation.message, /Build failed/);
});

test('HTTP assets and WebSocket upgrade/head/data are proxied to the local child', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.request('/assets/model.js?x=1')).data,
    'upstream:/assets/model.js?x=1',
  );
  const reply = await new Promise((resolve, reject) => {
    const socket = net.connect(f.port, '127.0.0.1', () => {
      socket.write(
        `GET /hmr HTTP/1.1\r\nHost: 127.0.0.1:${f.port}\r\nOrigin: ${f.origin}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\nhead-payload`,
      );
    });
    let result = '';
    socket.setTimeout(2000);
    socket.on('data', (chunk) => {
      result += chunk;
      if (result.includes('head-payload') && !result.includes('next-payload'))
        socket.write('next-payload');
      if (result.includes('next-payload')) {
        socket.destroy();
        resolve(result);
      }
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('WebSocket proxy timed out.'));
    });
    socket.on('error', reject);
  });
  assert.match(reply, /101 Switching Protocols/);
  assert.match(reply, /head-payload/);
  assert.match(reply, /next-payload/);
});

test('backend waits for a successful page response after HTTP 500 responses', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ic-atlas-readiness-'));
  const directory = path.join(root, 'node_modules/vinext/dist');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await writeFile(
    path.join(directory, 'cli.js'),
    `
    import http from 'node:http';
    let count = 0;
    http.createServer((_req, res) => {
      res.statusCode = ++count < 3 ? 500 : 200;
      res.end(String(count));
    }).listen(Number(process.argv[process.argv.indexOf('--port') + 1]), '127.0.0.1');
  `,
  );
  const backend = createBackend({ root, mode: 'dev', startupTimeoutMs: 3000 });
  t.after(async () => {
    await backend.stop();
    await rm(root, { recursive: true, force: true });
  });
  await backend.start(3000);
  const count = await new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${backend.port}/`, (res) => {
        let body = '';
        assert.equal(res.statusCode, 200);
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve(Number(body)));
      })
      .on('error', reject);
  });
  assert.ok(count >= 4);
});

test('backend startup fails when the page keeps returning HTTP 500', async (t) => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), 'ic-atlas-readiness-failed-'),
  );
  const directory = path.join(root, 'node_modules/vinext/dist');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await writeFile(
    path.join(directory, 'cli.js'),
    `
    import http from 'node:http';
    http.createServer((_req, res) => { res.statusCode = 500; res.end('build error'); })
      .listen(Number(process.argv[process.argv.indexOf('--port') + 1]), '127.0.0.1');
  `,
  );
  const backend = createBackend({ root, mode: 'start', startupTimeoutMs: 500 });
  t.after(async () => {
    await backend.stop();
    await rm(root, { recursive: true, force: true });
  });
  await assert.rejects(() => backend.start(3000), /successful page response/);
});
