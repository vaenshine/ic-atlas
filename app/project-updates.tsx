'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Code2,
  ExternalLink,
  RefreshCw,
  Download,
  CircleCheck,
  LoaderCircle,
  ArrowUpRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type Language } from './i18n';
import { buildInfo, project } from './project';
import {
  cacheKey,
  checkStaticBuild,
  isLocalHost,
  readManagedStatus,
  readUpdateCache,
  saveUpdateCache,
  waitForLocalOperation,
  operationResult,
  initialManagedResult,
  beginOrResumeOperation,
  type LocalOperation,
  type ManagedStatus,
  type UpdateResult,
} from './update-client';

export default function ProjectUpdates({ language }: { language: Language }) {
  const t = (en: string, zh: string) => (language === 'en' ? en : zh);
  const [open, setOpen] = useState(false);
  const [managed, setManaged] = useState<ManagedStatus | null>(null);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [operation, setOperation] = useState<LocalOperation | null>(null);
  const [busy, setBusy] = useState<'check' | 'update' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  const manager = useRef<ManagedStatus | null>(null);
  const cache = useRef('');

  async function perform(type: 'check' | 'update', local = manager.current) {
    if (running.current) return;
    running.current = true;
    setBusy(type);
    setConfirmed(false);
    let activeType = type;
    try {
      let outcome: UpdateResult;
      if (local) {
        const started = await beginOrResumeOperation(type);
        activeType = started.type;
        if (mounted.current) {
          setOperation(started);
          setBusy(activeType);
        }
        const finished = await waitForLocalOperation(started.id, {
          timeout: activeType === 'update' ? 30 * 60 * 1000 : 3 * 60 * 1000,
          cancelled: () => !mounted.current,
          onStatus: (status) => {
            manager.current = status;
            setManaged(status);
            setOperation(status.operation);
          },
        });
        outcome = operationResult(finished);
      } else {
        if (type === 'update') return;
        outcome = await checkStaticBuild(buildInfo);
      }
      if (mounted.current) {
        setResult(outcome);
        saveUpdateCache(cache.current, outcome);
      }
    } catch {
      const failure: UpdateResult = {
        status: 'error',
        canUpdate: false,
        current: local?.currentSha ?? buildInfo.commit,
        reason: activeType === 'update' ? 'connection-lost' : 'check-failed',
      };
      if (mounted.current) setResult(failure);
      if (activeType === 'check') saveUpdateCache(cache.current, failure);
    } finally {
      running.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  useEffect(() => {
    mounted.current = true;
    let active = true;
    cache.current = cacheKey(buildInfo, window.location.origin);
    void (async () => {
      let local: ManagedStatus | null = null;
      if (isLocalHost(window.location.hostname)) {
        try {
          local = await readManagedStatus();
        } catch {
          /* Static local hosts use the download path. */
        }
      }
      if (!active) return;
      manager.current = local;
      setManaged(local);
      const cached = readUpdateCache(cache.current);
      if (local?.operation?.state === 'running') {
        running.current = true;
        setBusy(local.operation.type);
        setOperation(local.operation);
        try {
          const finished = await waitForLocalOperation(local.operation.id, {
            cancelled: () => !active,
            onStatus: (status) => {
              manager.current = status;
              setManaged(status);
              setOperation(status.operation);
            },
          });
          if (active) {
            const outcome = operationResult(finished);
            setResult(outcome);
            saveUpdateCache(cache.current, outcome);
          }
        } catch {
          if (active)
            setResult({
              status: 'error',
              canUpdate: false,
              reason: 'connection-lost',
            });
        } finally {
          if (active) {
            running.current = false;
            setBusy(null);
          }
        }
        return;
      }
      const initial = local
        ? initialManagedResult(local, buildInfo.commit, cached)
        : cached;
      if (initial) {
        setResult(initial);
      } else {
        await perform('check', local);
      }
    })();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  const updateAvailable = result?.status === 'update-available';
  const version = buildInfo.version;
  const revision = buildInfo.commit?.slice(0, 7);
  const canApply = Boolean(managed && updateAvailable && result?.canUpdate);
  const reasonText = () => {
    if (busy === 'update')
      return t(
        'Installing the update. Keep this tab and the launcher terminal open.',
        '正在安装更新，请保持此页面和启动终端开启。',
      );
    if (busy === 'check')
      return t(
        'Checking the official project for updates…',
        '正在检查官方项目更新…',
      );
    if (result?.status === 'updated')
      return t(
        'Update installed. Reload the workbench to use the new version.',
        '更新已安装，重新加载实验台即可使用新版本。',
      );
    if (result?.status === 'up-to-date')
      return t('This copy is up to date.', '当前版本已是最新。');
    if (updateAvailable)
      return managed
        ? t('A newer revision is ready to install.', '发现新版本，可以安装。')
        : t(
            'A newer revision is available. Open the latest lab or update your static deployment.',
            '发现新版本，可打开最新在线版或更新你的静态部署。',
          );
    if (result?.reason === 'ahead' || result?.reason === 'local-ahead')
      return t(
        'This copy contains commits ahead of the published version.',
        '此副本包含领先于已发布版本的提交。',
      );
    if (result?.reason === 'diverged')
      return t(
        'This copy has its own commits. Review and merge upstream changes in Git.',
        '此副本有独立提交，请在 Git 中审阅并合并上游更改。',
      );
    if (result?.reason === 'busy')
      return t(
        'Another update task is running. Check again after it finishes.',
        '另一个更新任务正在运行，完成后可再次检查。',
      );
    if (result?.reason === 'local-changes')
      return t(
        'Save your local changes and untracked files in Git, or move them aside, before updating.',
        '请先在 Git 中保存本地修改与未跟踪文件，或将它们移到其他位置，再更新。',
      );
    if (result?.reason === 'wrong-branch')
      return t(
        'Switch to the main branch before updating.',
        '请先切换到 main 分支，再更新。',
      );
    if (result?.reason === 'git-operation-in-progress')
      return t(
        'Finish the current Git operation before updating.',
        '请先完成正在进行的 Git 操作，再更新。',
      );
    if (result?.status === 'blocked')
      return t(
        'Local changes or this Git checkout need attention before updating.',
        '更新前需要先处理本地修改或 Git 检出状态。',
      );
    if (result?.status === 'manual')
      return t(
        'This installation uses the download workflow. Use the latest source or clone the project for in-app updates.',
        '此安装使用下载更新方式。可下载最新源码，或通过 Git 克隆项目以使用页内更新。',
      );
    if (result?.reason === 'connection-lost')
      return t(
        'The connection was interrupted. Check the launcher terminal and reconnect to see the installation result.',
        '连接中断。请查看启动终端并重新连接，以确认安装结果。',
      );
    if (result?.status === 'error')
      return t(
        'The update could not finish. Review the details below or try checking again.',
        '更新检查或安装未完成，请查看下方信息或重新检查。',
      );
    return t(
      'Check for the latest improvements to the catalog and workbench.',
      '检查元件目录和实验台的最新改进。',
    );
  };

  return (
    <div className="project-provenance">
      <a
        className="project-repository"
        href={project.repository}
        target="_blank"
        rel="noreferrer"
      >
        <Code2 size={14} /> GitHub · vaenshine/ic-atlas{' '}
        <ExternalLink size={12} />
      </a>
      <button
        className={`project-update-button${updateAvailable ? ' has-update' : ''}`}
        onClick={() => setOpen(true)}
      >
        {busy ? (
          <LoaderCircle size={13} className="update-spinner" />
        ) : (
          <RefreshCw size={13} />
        )}
        {updateAvailable
          ? t('Update available', '发现更新')
          : `v${version} · ${t('Updates', '更新')}`}
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setConfirmed(false);
        }}
      >
        <DialogContent className="dialog-content project-update-dialog">
          <DialogTitle>{t('Project & updates', '项目来源与更新')}</DialogTitle>
          <DialogDescription>
            {t(
              'IC Atlas is an open-source electronics learning lab.',
              'IC Atlas 是开源的电子元件学习实验室。',
            )}
          </DialogDescription>
          <a
            className="update-project-link"
            href={project.repository}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={18} /> vaenshine/ic-atlas <ArrowUpRight size={16} />
          </a>
          <div className="update-version-grid">
            <div>
              <span>{t('This page', '当前页面')}</span>
              <strong>
                v{version}
                {revision ? ` · ${revision}` : ''}
              </strong>
            </div>
            <div>
              <span>{t('Installation', '运行方式')}</span>
              <strong>
                {managed
                  ? t('Local · managed', '本地管理器')
                  : t('Static website', '静态站点')}
              </strong>
            </div>
            {result?.latest && (
              <div>
                <span>{t('Latest revision', '最新提交')}</span>
                <strong>
                  {result.latestVersion ? `v${result.latestVersion} · ` : ''}
                  {result.latest.slice(0, 7)}
                </strong>
              </div>
            )}
            {managed?.currentSha && (
              <div>
                <span>{t('Installed revision', '已安装提交')}</span>
                <strong>{managed.currentSha.slice(0, 7)}</strong>
              </div>
            )}
          </div>
          <output
            className={`update-status update-status-${result?.status ?? 'ready'}`}
            aria-live="polite"
          >
            {busy ? (
              <LoaderCircle size={18} className="update-spinner" />
            ) : result?.status === 'updated' ||
              result?.status === 'up-to-date' ? (
              <CircleCheck size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            <span>{reasonText()}</span>
          </output>
          {busy === 'update' && operation?.message && (
            <p className="update-detail">
              {language === 'en'
                ? operation.message.split(' / ')[0]
                : ((
                    {
                      checking: '正在核对本地状态与官方版本…',
                      stopping: '正在暂停页面服务…',
                      updating: '正在更新源码…',
                      installing: '正在安装依赖…',
                      building: '正在构建生产版本…',
                      restarting: '正在重启页面服务…',
                      complete: '更新完成。',
                      failed: '更新需要处理，请查看详细说明。',
                    } as Record<string, string>
                  )[operation.phase] ?? operation.message)}
            </p>
          )}
          {(result?.status === 'error' || result?.status === 'blocked') &&
            result.message && <p className="update-detail">{result.message}</p>}
          {result?.sourceUpdated && result.status === 'error' && (
            <p className="update-detail">
              {t(
                'Source files were updated. Complete the recovery steps in the launcher terminal before restarting.',
                '源码已更新，请在启动终端完成修复步骤后再重启。',
              )}
            </p>
          )}
          {result?.recoveryCommands?.map((command) => (
            <code className="update-command" key={command}>
              {command}
            </code>
          ))}
          {canApply && confirmed && (
            <div className="update-confirmation">
              <strong>{t('Install this update?', '安装此更新？')}</strong>
              <p>
                {t(
                  'The local server will pause, update the source and dependencies, and restart. Your working tree must be clean. Reloading returns to the initial model; your language preference stays saved.',
                  '本地服务将暂停，更新源码与依赖后重启。工作目录需要保持干净。重新加载后回到初始模型，语言偏好继续保留。',
                )}
              </p>
            </div>
          )}
          <div className="update-actions">
            <button
              disabled={Boolean(busy)}
              onClick={() => void perform('check')}
            >
              <RefreshCw size={15} />
              {t('Check for updates', '检查更新')}
            </button>
            {canApply && (
              <button
                className="update-primary"
                disabled={Boolean(busy)}
                onClick={() =>
                  confirmed ? void perform('update') : setConfirmed(true)
                }
              >
                <Download size={15} />
                {confirmed
                  ? t('Install & restart', '安装并重启')
                  : t('Update this installation', '更新本地版本')}
              </button>
            )}
            {result?.status === 'updated' && (
              <button
                className="update-primary"
                onClick={() => window.location.reload()}
              >
                {t('Reload workbench', '重新加载实验台')}
              </button>
            )}
            {confirmed && (
              <button
                disabled={Boolean(busy)}
                onClick={() => setConfirmed(false)}
              >
                {t('Cancel', '取消')}
              </button>
            )}
          </div>
          {(!managed || result?.status === 'manual') && (
            <div className="update-static-options">
              <a href={project.preview} target="_blank" rel="noreferrer">
                {t('Open latest online lab', '打开最新在线版')}{' '}
                <ExternalLink size={13} />
              </a>
              <a href={project.archive}>
                {t('Download latest source', '下载最新源码')}{' '}
                <Download size={13} />
              </a>
              <p>
                {t(
                  'For updates inside the page, clone the project and start it with npm run dev or npm start. Static deployments are updated by replacing their built files.',
                  '使用 Git 克隆项目并通过 npm run dev 或 npm start 启动，即可使用页内更新。静态部署通过替换构建文件更新。',
                )}
              </p>
            </div>
          )}
          <p className="update-footnote">
            {t(
              'Checks on page load with a 24-hour cache per browser and build. Choose installation to apply an update. MIT licensed.',
              '打开页面时自动检查，每个浏览器与构建版本缓存 24 小时。点击安装后应用更新。采用 MIT 许可证。',
            )}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
