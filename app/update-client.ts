import { project, type BuildInfo } from './project.ts';

export interface UpdateResult {
  status:
    | 'ready'
    | 'manual'
    | 'blocked'
    | 'up-to-date'
    | 'update-available'
    | 'updated'
    | 'error';
  canUpdate: boolean;
  current?: string | null;
  latest?: string | null;
  latestVersion?: string;
  reason?: string;
  message?: string;
  sourceUpdated?: boolean;
  recoveryCommands?: string[];
}
export interface LocalOperation {
  id: string;
  type: 'check' | 'update';
  state: 'running' | 'succeeded' | 'failed';
  phase: string;
  message: string;
  result?: UpdateResult;
}
export interface ManagedStatus {
  managed: true;
  mode: 'dev' | 'start';
  currentSha: string | null;
  version: string;
  csrfToken: string;
  installation: UpdateResult;
  operation: LocalOperation | null;
}
export const controlPath = '/__ic_atlas/';
const shaPattern = /^[a-f0-9]{40}$/;

export function isLocalHost(host: string) {
  return (
    host === 'localhost' ||
    host === '[::1]' ||
    /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)
  );
}

export async function requestJson(
  url: string,
  init: RequestInit = {},
  timeout = 15000,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: init.signal ?? AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Expected JSON');
  return response.json();
}

export async function readManagedStatus(): Promise<ManagedStatus> {
  const data = (await requestJson(
    `${controlPath}status`,
    {},
    5000,
  )) as ManagedStatus;
  if (
    data.managed !== true ||
    typeof data.csrfToken !== 'string' ||
    !data.installation
  ) {
    throw new Error('Local updater unavailable');
  }
  return data;
}

export async function beginOrResumeOperation(
  type: LocalOperation['type'],
  read = readManagedStatus,
  request = requestJson,
): Promise<LocalOperation> {
  const current = await read();
  if (current.operation?.state === 'running') return current.operation;
  try {
    const started = (await request(`${controlPath}${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IC-Atlas-Token': current.csrfToken,
      },
      body: '{}',
    })) as { operation: LocalOperation };
    if (!started.operation?.id) throw new Error('Missing operation');
    return started.operation;
  } catch (error) {
    // A second tab may start work between GET and POST, or the POST response may
    // be lost after the manager accepted it. Rejoin that work without resubmitting.
    const latest = await read();
    if (latest.operation?.state === 'running') return latest.operation;
    throw error;
  }
}

interface PollOptions {
  read?: () => Promise<ManagedStatus>;
  pause?: () => Promise<void>;
  onStatus?: (status: ManagedStatus) => void;
  timeout?: number;
  cancelled?: () => boolean;
}

export async function waitForLocalOperation(
  id: string,
  {
    read = readManagedStatus,
    pause = () => new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    onStatus = (_status: ManagedStatus) => {},
    timeout = 30 * 60 * 1000,
    cancelled = (): boolean => false,
  }: PollOptions = {},
): Promise<ManagedStatus> {
  const deadline = Date.now() + timeout;
  while (!cancelled() && Date.now() < deadline) {
    await pause();
    const status = await read();
    if (cancelled()) throw new Error('Cancelled');
    if (status.operation?.id !== id) throw new Error('Operation changed');
    onStatus(status);
    if (status.operation.state !== 'running') return status;
  }
  throw new Error('Operation did not finish');
}

export function operationResult(status: ManagedStatus): UpdateResult {
  const result = status.operation?.result ?? status.installation;
  return status.operation?.state === 'failed' &&
    !['error', 'blocked', 'manual'].includes(result.status)
    ? {
        ...result,
        status: 'error',
        canUpdate: false,
        reason: 'local-operation-failed',
      }
    : result;
}

export function initialManagedResult(
  status: ManagedStatus,
  pageCommit: string | null,
  cached: UpdateResult | null,
): UpdateResult | null {
  const operation = status.operation;
  if (operation?.type === 'update' && operation.state !== 'running') {
    const result = operationResult(status);
    // Keep recovery instructions across a reload, including a failed build after
    // the source advanced. A page from before a successful update still needs reload.
    if (
      operation.state === 'failed' ||
      (result.status === 'updated' && pageCommit !== status.currentSha)
    )
      return result;
  }
  if (['blocked', 'manual', 'error'].includes(status.installation.status)) {
    return status.installation;
  }
  return status.currentSha && cached?.current === status.currentSha
    ? cached
    : null;
}

export async function checkStaticBuild(
  info: BuildInfo,
  request = requestJson,
): Promise<UpdateResult> {
  const latest = (await request(project.manifest)) as BuildInfo;
  if (
    latest.schema !== 1 ||
    latest.name !== 'ic-atlas' ||
    typeof latest.version !== 'string' ||
    !latest.commit ||
    !shaPattern.test(latest.commit)
  )
    throw new Error('Invalid version manifest');
  const base = {
    current: info.commit,
    latest: latest.commit,
    latestVersion: latest.version,
    canUpdate: false,
  };
  if (info.commit === latest.commit) return { ...base, status: 'up-to-date' };
  if (!info.commit || !shaPattern.test(info.commit))
    return { ...base, status: 'manual', reason: 'archive' };
  // Compare ancestry before calling another revision an update: forks may be ahead or diverged.
  const comparison = (await request(
    `${project.compareApi}${info.commit}...${latest.commit}?per_page=1`,
  )) as { status: string };
  switch (comparison.status) {
    case 'ahead':
      return { ...base, status: 'update-available' };
    case 'identical':
      return { ...base, status: 'up-to-date' };
    case 'behind':
      return { ...base, status: 'blocked', reason: 'ahead' };
    case 'diverged':
      return { ...base, status: 'blocked', reason: 'diverged' };
    default:
      throw new Error('Unknown revision comparison');
  }
}

export function cacheKey(info: BuildInfo, origin: string) {
  return `ic-atlas-update-check:v1:${origin}:${info.commit ?? info.version}`;
}

export function readUpdateCache(key: string): UpdateResult | null {
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? 'null');
    const age = Date.now() - cached?.checkedAt;
    if (
      age >= 0 &&
      age < 24 * 60 * 60 * 1000 &&
      cached.result &&
      ['up-to-date', 'update-available', 'manual', 'blocked', 'error'].includes(
        cached.result.status,
      )
    ) {
      return cached.result;
    }
  } catch {
    /* Private browsing may disable storage. */
  }
  return null;
}

export function saveUpdateCache(key: string, result: UpdateResult) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ checkedAt: Date.now(), result }),
    );
  } catch {}
}
