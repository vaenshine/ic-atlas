import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_PREFIX = '/__ic_atlas/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

function permittedHost(host, port) {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

function permittedOrigin(req, requireOrigin = false) {
  const origin = req.headers.origin;
  return (!origin && !requireOrigin) || origin === `http://${req.headers.host}`;
}

function validToken(value, expected) {
  if (typeof value !== 'string') return false;
  const supplied = Buffer.from(value);
  const secret = Buffer.from(expected);
  return supplied.length === secret.length && timingSafeEqual(supplied, secret);
}

async function emptyJsonBody(req) {
  if (
    req.headers['content-type']?.split(';')[0].trim() !== 'application/json'
  ) {
    throw Object.assign(new Error('Use Content-Type: application/json.'), {
      status: 415,
    });
  }
  if (Number(req.headers['content-length'] || 0) > 1024) {
    throw Object.assign(new Error('Request body is too large.'), {
      status: 413,
    });
  }
  const chunks = [];
  let size = 0;
  const timeout = setTimeout(() => req.destroy(), 5000);
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024) {
        throw Object.assign(new Error('Request body is too large.'), {
          status: 413,
        });
      }
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (
      !body ||
      Array.isArray(body) ||
      typeof body !== 'object' ||
      Object.keys(body).length
    ) {
      throw new Error('This endpoint accepts only an empty JSON object.');
    }
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(
      new Error('This endpoint accepts only an empty JSON object.'),
      { status: 400 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function versionAt(root) {
  try {
    return JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
      .version;
  } catch {
    return null;
  }
}

/** Exported for isolated HTTP tests; the real updater never accepts request-supplied commands. */
export async function createLocalServer({
  root,
  mode = 'dev',
  port = 3000,
  updater,
  backend,
}) {
  if (!['dev', 'start'].includes(mode))
    throw new Error('Mode must be dev or start.');
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('Invalid port.');
  const csrfToken = randomBytes(32).toString('hex');
  let installation = await updater.inspect();
  let version = await versionAt(root);
  let operation = null;
  let closing = false;
  let paused = false;
  let operationTask;
  const sockets = new Set();
  const upgradedSockets = new Set();

  function progress(phase, message) {
    operation = { ...operation, phase, message };
  }

  async function perform(type) {
    let result;
    try {
      if (type === 'check') {
        result = await updater.check();
      } else {
        progress(
          'stopping',
          'Pausing the local application… / 正在暂停本地应用…',
        );
        paused = true;
        for (const socket of upgradedSockets) socket.destroy();
        await backend.stop();
        result = await updater.apply({
          onProgress: ({ phase, message }) => progress(phase, message),
        });
        if (result.status === 'updated' && mode === 'start') {
          progress(
            'building',
            'Building the updated application… / 正在构建更新后的应用…',
          );
          await backend.build();
        }
        if (!closing) {
          progress(
            'restarting',
            'Restarting the local application… / 正在重启本地应用…',
          );
          await backend.start();
          paused = false;
        }
        version = await versionAt(root);
        if (result.status === 'updated') {
          result = {
            ...result,
            message:
              'Updated and restarted. Refresh this page to load the new version. / 已更新并重启，请刷新页面加载新版本。',
          };
        }
      }
      installation = result;
      const failed = ['error', 'blocked', 'manual'].includes(result.status);
      operation = {
        ...operation,
        state: failed ? 'failed' : 'succeeded',
        phase: failed ? 'failed' : 'complete',
        message: result.message,
        finishedAt: new Date().toISOString(),
        result,
      };
    } catch (error) {
      let restored = !paused;
      if (type === 'update' && paused && !closing) {
        try {
          await backend.start();
          paused = false;
          restored = true;
        } catch {
          // The control server stays available with explicit recovery instructions.
        }
      }
      const sourceUpdated = Boolean(result?.sourceUpdated);
      const recoveryCommands =
        result?.recoveryCommands ||
        (sourceUpdated
          ? [
              'npm ci',
              ...(mode === 'start'
                ? ['npm run build', 'npm start']
                : ['npm run dev']),
            ]
          : [mode === 'start' ? 'npm start' : 'npm run dev']);
      installation = {
        ...(result || installation),
        status: 'error',
        canUpdate: false,
        reason:
          result?.status === 'error'
            ? result.reason
            : type === 'check'
              ? 'check-failed'
              : operation.phase === 'building'
                ? 'build-failed'
                : 'local-service-failed',
        message: `${error.message} ${restored ? 'The local service has restarted.' : 'The local service needs manual recovery.'}`,
        sourceUpdated,
        recoveryCommands,
      };
      operation = {
        ...operation,
        state: 'failed',
        phase: 'failed',
        message: installation.message,
        finishedAt: new Date().toISOString(),
        result: installation,
      };
      version = await versionAt(root);
    }
  }

  async function handle(req, res) {
    const activePort = server.address()?.port;
    if (!permittedHost(req.headers.host, activePort)) {
      return json(res, 403, { error: 'Unrecognized local Host header.' });
    }
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (pathname.startsWith(API_PREFIX)) {
      if (
        req.headers['sec-fetch-site'] === 'cross-site' ||
        !permittedOrigin(req)
      ) {
        return json(res, 403, {
          error: 'Local control requests must have the same origin.',
        });
      }
      if (pathname === `${API_PREFIX}status`) {
        if (req.method !== 'GET')
          return json(res, 405, { error: 'Use GET.' }, { Allow: 'GET' });
        return json(res, 200, {
          managed: true,
          mode,
          currentSha: installation.current || null,
          version,
          csrfToken,
          installation,
          operation,
        });
      }
      const type =
        pathname === `${API_PREFIX}check`
          ? 'check'
          : pathname === `${API_PREFIX}update`
            ? 'update'
            : null;
      if (!type)
        return json(res, 404, { error: 'Unknown local control endpoint.' });
      if (req.method !== 'POST')
        return json(res, 405, { error: 'Use POST.' }, { Allow: 'POST' });
      if (
        !permittedOrigin(req, true) ||
        !validToken(req.headers['x-ic-atlas-token'], csrfToken)
      ) {
        return json(res, 403, {
          error: 'A same-origin request and local session token are required.',
        });
      }
      await emptyJsonBody(req);
      if (closing || operation?.state === 'running') {
        return json(res, 409, {
          error: 'A local operation is already running.',
          operation,
        });
      }
      operation = {
        id: randomBytes(8).toString('hex'),
        type,
        state: 'running',
        phase: 'checking',
        message:
          type === 'check' ? 'Checking for updates…' : 'Preparing the update…',
        startedAt: new Date().toISOString(),
      };
      json(res, 202, { operation });
      operationTask = perform(type);
      return;
    }
    if (paused || closing || !backend.port) {
      res.writeHead(503, {
        'content-type': 'text/plain; charset=utf-8',
        'retry-after': '3',
        'cache-control': 'no-store',
      });
      return res.end(
        'IC Atlas is restarting. Please reload shortly. / IC Atlas 正在重启，请稍后刷新。',
      );
    }
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: backend.port,
        method: req.method,
        path: req.url,
        headers: req.headers,
      },
      (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent)
        json(res, 502, {
          error:
            'The local application is starting or unavailable. Please retry.',
        });
      else res.destroy();
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (!res.headersSent && !res.destroyed)
        json(res, error.status || 500, { error: error.message });
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (req, socket, head) => {
    if (
      !permittedHost(req.headers.host, server.address()?.port) ||
      !permittedOrigin(req) ||
      req.headers['sec-fetch-site'] === 'cross-site' ||
      req.url.startsWith(API_PREFIX) ||
      paused ||
      closing ||
      !backend.port
    ) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    const upstream = net.connect(backend.port, '127.0.0.1', () => {
      upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        upstream.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
      }
      upstream.write('\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upgradedSockets.add(socket);
    socket.on('close', () => {
      upgradedSockets.delete(socket);
      upstream.destroy();
    });
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    upstream.on('close', () => socket.destroy());
  });

  return {
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.off('error', reject);
          resolve();
        });
      });
      try {
        await backend.start(server.address().port);
      } catch (error) {
        await this.close();
        throw error;
      }
      return server.address().port;
    },
    async close() {
      if (closing) return;
      closing = true;
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
      await backend.stop();
      // The updater owns its bounded git/npm process; prevent any subsequent service restart.
      if (operationTask) await operationTask;
    },
  };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stopChild(child) {
  if (
    !child ||
    !child.pid ||
    child.exitCode !== null ||
    child.signalCode !== null
  )
    return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        { stdio: 'ignore' },
      );
      killer.on('error', resolve);
      killer.on('exit', resolve);
    });
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL');
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    let timer;
    await Promise.race([
      exited,
      new Promise((resolve) => {
        timer = setTimeout(resolve, 5000);
      }),
    ]);
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  }
  await exited;
}

export function createBackend({ root, mode, startupTimeoutMs = 90_000 }) {
  let child;
  let buildChild;
  let servicePort;
  let publicPort;
  let started = false;
  return {
    get port() {
      return servicePort;
    },
    async start(port = publicPort) {
      if (child && child.exitCode === null && child.signalCode === null) {
        if (started) return;
        await stopChild(child);
      }
      started = false;
      publicPort = port;
      servicePort = await freePort();
      child = spawn(
        process.execPath,
        [
          path.join(root, 'node_modules/vinext/dist/cli.js'),
          mode,
          '--hostname',
          '127.0.0.1',
          '--port',
          String(servicePort),
        ],
        {
          cwd: root,
          env: { ...process.env, IC_ATLAS_MANAGED_PORT: String(publicPort) },
          stdio: 'inherit',
          detached: process.platform !== 'win32',
        },
      );
      let startupError;
      child.on('error', (error) => {
        startupError = error;
      });
      const deadline = Date.now() + startupTimeoutMs;
      while (Date.now() < deadline) {
        if (startupError) throw startupError;
        if (child.exitCode !== null || child.signalCode !== null)
          throw new Error(
            `The application exited during startup (${child.exitCode ?? child.signalCode}).`,
          );
        const ready = await new Promise((resolve) => {
          const finish = (ready) => {
            clearTimeout(timer);
            request.destroy();
            resolve(ready);
          };
          const request = http.get(
            { hostname: '127.0.0.1', port: servicePort, path: '/' },
            (response) => {
              response.resume();
              response.once('end', () =>
                finish(response.statusCode >= 200 && response.statusCode < 300),
              );
              response.once('error', () => finish(false));
            },
          );
          request.once('error', () => finish(false));
          const timer = setTimeout(
            () => finish(false),
            Math.min(5000, Math.max(1, deadline - Date.now())),
          );
        });
        if (ready) {
          started = true;
          return;
        }
        await sleep(150);
      }
      throw new Error(
        'The local application did not return a successful page response before the startup deadline.',
      );
    },
    async stop() {
      await Promise.all([stopChild(child), stopChild(buildChild)]);
      child = undefined;
      buildChild = undefined;
      servicePort = undefined;
      started = false;
    },
    async build() {
      const npmCli =
        process.env.npm_execpath ||
        (process.platform === 'win32'
          ? path.join(
              path.dirname(process.execPath),
              'node_modules/npm/bin/npm-cli.js',
            )
          : undefined);
      const command = npmCli
        ? process.execPath
        : process.platform === 'win32'
          ? 'npm.cmd'
          : 'npm';
      const args = npmCli ? [npmCli, 'run', 'build'] : ['run', 'build'];
      await new Promise((resolve, reject) => {
        buildChild = spawn(command, args, {
          cwd: root,
          stdio: 'inherit',
          detached: process.platform !== 'win32',
          shell: !npmCli && process.platform === 'win32',
        });
        buildChild.on('error', reject);
        buildChild.on('exit', (code) =>
          code === 0
            ? resolve()
            : reject(
                new Error(
                  `Production build failed (${code}). Run npm ci && npm run build, then npm start.`,
                ),
              ),
        );
      });
      buildChild = undefined;
    },
  };
}

async function main() {
  const mode = process.argv[2] || 'dev';
  const root = fileURLToPath(new URL('..', import.meta.url));
  const port = Number(process.env.IC_ATLAS_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('IC_ATLAS_PORT must be an integer from 1 to 65535.');
  const { createUpdater } = await import('./update-core.mjs');
  const controller = new AbortController();
  const local = await createLocalServer({
    root,
    mode,
    port,
    updater: createUpdater({ root, signal: controller.signal }),
    backend: createBackend({ root, mode }),
  });
  let shuttingDown = false;
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      controller.abort();
      await local.close();
      process.exit(0);
    });
  }
  await local.listen();
  console.log(`\nIC Atlas: http://127.0.0.1:${port}/`);
  console.log('Local update controls enabled. / 本地更新管理已启用。\n');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`IC Atlas: ${error.message}`);
    process.exitCode = 1;
  });
}
