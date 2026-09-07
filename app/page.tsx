'use client';
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useSyncExternalStore,
} from 'react';
import {
  Cpu,
  Search,
  ChevronRight,
  Box,
  Layers,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Rotate3d,
  Maximize,
  Minimize,
  Plus,
  Minus,
  Grid2X2,
  Scan,
  MousePointer2,
  Lightbulb,
  SlidersHorizontal,
  CircuitBoard,
  MoveUpRight,
  X,
  Target,
  ExternalLink,
  ArrowDownToLine,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type Part, type Kind } from './catalog';
import {
  profiles,
  originalParts,
  itemIn,
  domainOf,
  packageIn,
  packageIds,
  searchText,
  normalizeSearch,
} from './atlas';
import { domains, kindNames, type Language } from './i18n';
import { lessonsEn, lessonsZh } from './lessons';
import Scene, { type SceneCommand } from './scene';

let sessionLanguage: Language = 'en';
function readLanguage(): Language {
  try {
    const value = localStorage.getItem('ic-atlas-language');
    if (value === 'en' || value === 'zh') return value;
  } catch {}
  return sessionLanguage;
}
function subscribeLanguage(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('ic-atlas-language', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('ic-atlas-language', listener);
  };
}
function changeLanguage(lang: Language) {
  sessionLanguage = lang;
  try {
    localStorage.setItem('ic-atlas-language', lang);
  } catch {}
  window.dispatchEvent(new Event('ic-atlas-language'));
}
const initialLanguage = (): Language => 'en';
type Mode = 'families' | 'parts' | 'packages';
const allIds = {
  families: profiles.map((p) => p.id),
  parts: originalParts.map((p) => p.id),
  packages: packageIds,
};
const searchable = new Map(
  [...allIds.families, ...allIds.parts].map((id) => [id, searchText(id)]),
);
function PartIcon({ part, size = 18 }: { part: Part; size?: number }) {
  const Icon =
    part.kind === 'basic' || part.kind === 'module' ? CircuitBoard : Cpu;
  return <Icon size={size} strokeWidth={1.6} />;
}
export default function Home() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    readLanguage,
    initialLanguage,
  );
  const t = (en: string, zh: string) => (language === 'en' ? en : zh);
  const [selected, setSelected] = useState('cat-001'),
    [mode, setMode] = useState<Mode>('families'),
    [filter, setFilter] = useState<Kind | 'all'>('all'),
    [query, setQuery] = useState(''),
    [domain, setDomain] = useState('all');
  const [operation, setOperation] = useState(0),
    [rotate, setRotate] = useState(false),
    [labels, setLabels] = useState(true),
    [explode, setExplode] = useState(0),
    [overview, setOverview] = useState(false),
    [expanded, setExpanded] = useState(false),
    [mobileCatalog, setMobileCatalog] = useState(false),
    [dialog, setDialog] = useState<'learn' | 'help' | null>(null),
    [guide, setGuide] = useState<{ lesson: number; step: number } | null>(null),
    [detailTab, setDetailTab] = useState('about');
  const [command, setCommand] = useState<SceneCommand>({
    type: 'reset',
    tick: 0,
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const part = useMemo(() => itemIn(selected, language), [selected, language]);
  const counterpart = useMemo(
    () => itemIn(selected, language === 'en' ? 'zh' : 'en'),
    [selected, language],
  );
  const profile = profiles.find((p) => p.id === selected),
    pkg = packageIn(part.shape, language),
    otherPkg = packageIn(part.shape, language === 'en' ? 'zh' : 'en');
  const lessons = language === 'en' ? lessonsEn : lessonsZh;
  const modeName = (m: Mode) =>
    m === 'families'
      ? t('Categories', '类别')
      : m === 'parts'
        ? t('Devices', '型号')
        : t('Packages', '封装');
  const visible = useMemo(
    () =>
      allIds[mode]
        .filter((id) => {
          const p = itemIn(id, language);
          return (
            (mode === 'packages' || filter === 'all' || p.kind === filter) &&
            (domain === 'all' || domainOf(id) === domain) &&
            searchable.get(id)?.includes(normalizeSearch(query))
          );
        })
        .map((id) => itemIn(id, language)),
    [mode, filter, domain, query, language],
  );
  const grouped = useMemo(
    () =>
      Object.keys(domains)
        .map((key) => ({
          key,
          items: visible.filter((p) => domainOf(p.id) === key),
        }))
        .filter((g) => g.items.length),
    [visible],
  );
  const quickIds = useMemo(() => {
    if (mode === 'packages') return packageIds.slice(0, 5);
    if (profile) {
      const related = profiles
        .filter((p) => p.group === profile.group && p.id !== selected)
        .map((p) => p.id);
      return [...profile.existingIds, ...related].slice(0, 5);
    }
    return ['esp32dev', 'stm32', 'ne555', 'led-red-5mm', 'usb-c-24'];
  }, [mode, profile, selected]);
  const select = (id: string) => {
    setSelected(id);
    setOperation(0);
    setExplode(0);
    setOverview(false);
    setMobileCatalog(false);
    setDetailTab('about');
  };
  const runCommand = (type: SceneCommand['type']) =>
    setCommand((c) => ({ type, tick: c.tick + 1 }));
  const changeMode = (m: Mode) => {
    setMode(m);
    setFilter('all');
    setDomain('all');
    setQuery('');
    setGuide(null);
    select(allIds[m][0]);
  };
  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title =
      language === 'en'
        ? 'IC Atlas · Electronics Learning Lab'
        : 'IC Atlas · 电子元件学习实验室';
  }, [language]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        setMobileCatalog(false);
      }
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setMobileCatalog(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const startLesson = (index: number) => {
    setGuide({ lesson: index, step: 0 });
    setMode('parts');
    setFilter('all');
    setDomain('all');
    setQuery('');
    select(lessons[index].ids[0]);
    setDialog(null);
  };
  const nextLessonStep = () => {
    if (!guide) return;
    const next = guide.step + 1;
    if (next >= lessons[guide.lesson].ids.length) {
      setGuide(null);
      setDialog('learn');
      return;
    }
    setGuide({ ...guide, step: next });
    select(lessons[guide.lesson].ids[next]);
  };
  const actionLabel = ['rgbled', 'smdrgb'].includes(part.shape)
    ? [
        t('Light red', '点亮红色'),
        t('Switch to green', '切换绿色'),
        t('Switch to blue', '切换蓝色'),
        t('Turn off', '熄灭'),
      ][operation]
    : part.shape === 'led'
      ? operation
        ? t('Turn LED off', '熄灭 LED')
        : t('Light LED', '点亮 LED')
      : part.shape === 'tactile'
        ? operation
          ? t('Release', '松开按钮')
          : t('Press', '按下按钮')
        : operation
          ? t('Slide left', '拨向左侧')
          : t('Slide right', '拨向右侧');
  return (
    <main>
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => changeMode('families')}
          aria-label="IC Atlas home"
        >
          <span className="brand-icon">
            <Cpu size={25} strokeWidth={1.5} />
          </span>
          <div>
            <div className="brand-name">
              IC <span>ATLAS</span>
            </div>
            <div className="brand-sub">
              {t('ELECTRONICS LEARNING LAB', '电子元件学习实验室')}
            </div>
          </div>
        </button>
        <nav className="topnav" aria-label={t('Main navigation', '主导航')}>
          <button
            className={mode !== 'packages' ? 'active' : ''}
            onClick={() => changeMode('families')}
          >
            <Box size={16} />
            {t('Explore', '元件图鉴')}
          </button>
          <button
            className={mode === 'packages' ? 'active' : ''}
            onClick={() => changeMode('packages')}
          >
            <Layers size={16} />
            {t('Packages', '封装实验室')}
          </button>
          <button onClick={() => setDialog('learn')}>
            <BookOpen size={16} />
            {t('Learning paths', '学习路径')}
          </button>
        </nav>
        <div className="header-actions">
          <fieldset className="language-switch" aria-label="Language / 语言">
            <button
              aria-pressed={language === 'en'}
              onClick={() => changeLanguage('en')}
            >
              English
            </button>
            <button
              aria-pressed={language === 'zh'}
              onClick={() => changeLanguage('zh')}
            >
              中文
            </button>
          </fieldset>
          <button
            className="help-button compact-learn"
            aria-label={t('Learning paths', '学习路径')}
            onClick={() => setDialog('learn')}
          >
            <BookOpen size={17} />
          </button>
          <button
            className="help-button"
            aria-label={t('Help', '操作帮助')}
            onClick={() => setDialog('help')}
          >
            <HelpCircle size={17} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside
          className={`catalog ${mobileCatalog ? 'mobile-open' : ''}`}
          aria-label={t('Component catalog', '元件目录')}
        >
          <div className="catalog-head">
            <div className="eyebrow">{t('THE COLLECTION', '元件收藏馆')}</div>
            <div className="catalog-title">
              <h2>{t('Explore electronics', '探索电子元件')}</h2>
              <span className="count">{allIds[mode].length}</span>
            </div>
            <Tabs
              value={mode}
              onValueChange={(v) => changeMode(v as Mode)}
              className="catalog-modes"
            >
              <TabsList>
                {(['families', 'parts', 'packages'] as Mode[]).map((m) => (
                  <TabsTrigger key={m} value={m}>
                    {modeName(m)}
                    <small>{allIds[m].length}</small>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search English / 中文…', '搜索中文 / English…')}
                aria-label={t(
                  'Search categories, devices and packages',
                  '搜索类别、型号和封装',
                )}
              />
              <kbd>/</kbd>
            </label>
            {mode !== 'packages' && (
              <div
                className="filter-row"
                aria-label={t('Component type', '元件类型')}
              >
                {(['all', 'ic', 'mcu', 'module', 'basic'] as const).map((k) => (
                  <button
                    key={k}
                    className={filter === k ? 'active' : ''}
                    aria-pressed={filter === k}
                    onClick={() => setFilter(k)}
                  >
                    {k === 'all'
                      ? t('All', '全部')
                      : k === 'mcu'
                        ? 'MCU+'
                        : k === 'module'
                          ? t('Modules', '模块')
                          : k === 'basic'
                            ? t('Basic', '基础')
                            : 'ICs'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="function-picker">
            <Select value={domain} onValueChange={(v) => setDomain(v || 'all')}>
              <SelectTrigger aria-label={t('Filter by function', '按功能筛选')}>
                <SelectValue>
                  {domain === 'all'
                    ? t('All functions', '全部功能')
                    : domains[domain]?.[language === 'en' ? 0 : 1]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('All functions', '全部功能')}
                </SelectItem>
                {Object.entries(domains).map(([key, names]) => (
                  <SelectItem key={key} value={key}>
                    {names[language === 'en' ? 0 : 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="catalog-scroll">
            {grouped.map((group) => (
              <div key={group.key}>
                <div className="group-label">
                  <span>{domains[group.key][language === 'en' ? 0 : 1]}</span>
                  <span>{group.items.length}</span>
                </div>
                {group.items.map((p) => {
                  const c = profiles.find((c) => c.id === p.id);
                  const primary =
                    mode === 'packages'
                      ? packageIn(p.shape, language)?.title
                      : p.name;
                  const secondary =
                    mode === 'packages'
                      ? packageIn(p.shape, language)?.name
                      : c
                        ? c[language === 'en' ? 'zh' : 'en']
                        : p.subtitle;
                  return (
                    <button
                      key={p.id}
                      className={`catalog-item ${selected === p.id && !overview ? 'active' : ''}`}
                      title={`${primary} · ${secondary}`}
                      aria-pressed={selected === p.id && !overview}
                      onClick={() => {
                        select(p.id);
                        setGuide(null);
                      }}
                    >
                      <span className="item-icon">
                        <PartIcon part={p} />
                      </span>
                      <span className="item-copy">
                        <strong>{primary}</strong>
                        <small
                          lang={
                            c ? (language === 'en' ? 'zh-CN' : 'en') : undefined
                          }
                        >
                          {secondary}
                        </small>
                      </span>
                      {selected === p.id && (
                        <ChevronRight size={13} className="item-arrow" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {visible.length === 0 && (
              <div className="empty-results">
                <p>
                  {t(
                    'No matches in this view. Try “MOSFET”, “电容” or “QFN”.',
                    '当前目录暂无匹配。试试“MOSFET”“电容”或“QFN”。',
                  )}
                </p>
                <button
                  className="clear-filter"
                  onClick={() => {
                    setQuery('');
                    setDomain('all');
                    setFilter('all');
                  }}
                >
                  {t('Clear filters', '清除筛选')}
                </button>
              </div>
            )}
          </div>
          <div className="catalog-foot">
            <b>
              {profiles.length} {t('categories', '类别')} ·{' '}
              {originalParts.length} {t('devices', '型号')}
            </b>
            <br />
            {t(
              'English first · 中文对照 · Local edition',
              '双语资料 · 本地版本',
            )}
          </div>
        </aside>
        <section
          className="center"
          aria-label={t('3D workbench', '三维实验台')}
        >
          <div className="scene-header">
            <div>
              <div className="breadcrumbs">
                <span>{modeName(mode)}</span>
                <ChevronRight size={11} />
                <span>{overview ? t('Gallery', '展馆总览') : part.family}</span>
              </div>
              <h1>
                {overview
                  ? t('The component collection', '元件全景收藏馆')
                  : mode === 'packages'
                    ? pkg?.title
                    : part.name}
              </h1>
              <p className="scene-subtitle">
                {overview
                  ? `${visible.length} ${t('exhibits · Select any model to inspect', '个展品 · 点击模型独立观察')}`
                  : mode === 'packages'
                    ? pkg?.name
                    : part.subtitle}
              </p>
              {!overview && mode !== 'packages' && (
                <p
                  className="bilingual-title"
                  lang={language === 'en' ? 'zh-CN' : 'en'}
                >
                  {counterpart.name}
                  {profile ? '' : ` · ${counterpart.subtitle}`}
                </p>
              )}
            </div>
            <div className="scene-header-right">
              <span className="scene-badge">
                <Box size={12} />
                LIVE 3D
              </span>
              <button
                className="mobile-catalog-toggle"
                aria-expanded={mobileCatalog}
                onClick={() => setMobileCatalog(!mobileCatalog)}
              >
                <SlidersHorizontal size={14} />
                {t('Browse', '选元件')}
              </button>
            </div>
          </div>
          <div className={`scene-area ${expanded ? 'expanded' : ''}`}>
            <Scene
              part={part}
              parts={visible}
              language={language}
              rotate={rotate}
              labels={labels}
              explode={explode}
              overview={overview}
              command={command}
              onSelect={select}
              operation={operation}
            />
            {!overview &&
              ['led', 'rgbled', 'smdrgb', 'tactile', 'slideswitch'].includes(
                part.shape,
              ) && (
                <div
                  className={`component-operation ${guide ? 'with-guide' : ''}`}
                >
                  <button
                    onClick={() =>
                      setOperation((v) =>
                        ['rgbled', 'smdrgb'].includes(part.shape)
                          ? (v + 1) % 4
                          : v
                            ? 0
                            : 1,
                      )
                    }
                  >
                    {actionLabel}
                  </button>
                  <span>
                    {['rgbled', 'smdrgb'].includes(part.shape)
                      ? [
                          t('Off', '灯灭'),
                          t('Red', '红光'),
                          t('Green', '绿光'),
                          t('Blue', '蓝光'),
                        ][operation]
                      : operation
                        ? t('Active', '已接通')
                        : t('Resting', '初始状态')}{' '}
                    · {t('State demonstration', '教学状态演示')}
                  </span>
                </div>
              )}
            {guide && (
              <div className="guide-banner">
                <p>
                  <span style={{ color: '#c4f582' }}>
                    {guide.step + 1} / {lessons[guide.lesson].ids.length}
                  </span>
                  　{lessons[guide.lesson].tips[guide.step]}
                </p>
                <button onClick={nextLessonStep}>
                  {guide.step === lessons[guide.lesson].ids.length - 1
                    ? t('Finish', '完成')
                    : t('Next', '下一步')}
                </button>
                <button
                  className="guide-close"
                  onClick={() => setGuide(null)}
                  aria-label={t('Exit learning path', '退出学习引导')}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="scene-tools">
              <button
                className={`icon-button ${overview ? 'on' : ''}`}
                title={t('Gallery overview', '展馆总览')}
                aria-label={t('Toggle gallery overview', '切换展馆总览')}
                aria-pressed={overview}
                onClick={() => {
                  setOverview(!overview);
                  setExplode(0);
                  setGuide(null);
                }}
              >
                <Grid2X2 size={16} />
              </button>
              {(
                [
                  {
                    type: 'reset',
                    en: 'Reset view (0)',
                    zh: '重置视角 (0)',
                    Icon: RotateCcw,
                  },
                  { type: 'top', en: 'Top view', zh: '顶视图', Icon: Scan },
                  {
                    type: 'bottom',
                    en: 'Bottom view',
                    zh: '底视图',
                    Icon: ArrowDownToLine,
                  },
                  { type: 'zoomIn', en: 'Zoom in', zh: '放大', Icon: Plus },
                  { type: 'zoomOut', en: 'Zoom out', zh: '缩小', Icon: Minus },
                ] as const
              ).map(({ type, en, zh, Icon }) => (
                <button
                  key={type}
                  className="icon-button"
                  title={t(en, zh)}
                  aria-label={t(en, zh)}
                  onClick={() => {
                    runCommand(type);
                    if (type === 'reset') setExplode(0);
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
              <button
                className={`icon-button ${expanded ? 'on' : ''}`}
                title={
                  expanded
                    ? t('Exit fullscreen', '退出全屏')
                    : t('Fullscreen', '全屏观察')
                }
                aria-label={
                  expanded
                    ? t('Exit fullscreen', '退出全屏')
                    : t('Fullscreen', '全屏观察')
                }
                aria-pressed={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
            {overview ? (
              <div className="overview-note">
                {t('Select a model to inspect it', '点击模型进入独立观察')}
              </div>
            ) : (
              <div className="model-caption">
                <span>
                  {explode > 0
                    ? t('EXPLODED VIEW', '结构展开')
                    : profile
                      ? t('FAMILY ILLUSTRATION', '类别结构示意')
                      : t('DEVICE ILLUSTRATION', '典型型号示意')}
                </span>
                <p>
                  {t('Drag to rotate · Scroll to zoom', '拖动旋转 · 滚轮缩放')}
                </p>
              </div>
            )}
            <div className="axis-label">
              <span>X</span>
              <span>Y</span>
              <span>Z</span>
              <MoveUpRight size={16} />
            </div>
          </div>
          <div className="viewer-options">
            <label className="option">
              <Rotate3d size={14} />
              <span>{t('Rotate', '自动旋转')}</span>
              <Switch
                checked={rotate}
                onCheckedChange={setRotate}
                disabled={overview}
                aria-label={t('Auto rotate', '自动旋转')}
              />
            </label>
            <label className="option">
              <Target size={14} />
              <span>{t('Labels', '结构标注')}</span>
              <Switch
                checked={labels}
                onCheckedChange={setLabels}
                disabled={overview}
                aria-label={t('Show structure labels', '显示结构标注')}
              />
            </label>
            <div className="explode-control">
              <label id="explode-label">{t('Explode', '结构展开')}</label>
              <Slider
                aria-labelledby="explode-label"
                min={0}
                max={100}
                step={1}
                value={[explode]}
                onValueChange={(v) => setExplode(Array.isArray(v) ? v[0] : v)}
                disabled={overview}
              />
              <output>{explode}%</output>
            </div>
          </div>
          <div className="scene-bottom">
            <div className="bottom-heading">
              <h3>
                <Layers size={14} color="#c4f582" />
                {mode === 'packages'
                  ? t('Compare packages', '比较封装')
                  : profile
                    ? t('Examples & related categories', '典型型号与相关类别')
                    : t('Keep exploring', '继续探索')}
              </h3>
              <small>{t('Select to inspect', '点选切换')}</small>
            </div>
            <div className="quick-select">
              {quickIds.map((id) => {
                const p = itemIn(id, language);
                return (
                  <button
                    className={`quick-card ${id === selected ? 'active' : ''}`}
                    key={id}
                    title={p.name}
                    onClick={() => {
                      if (mode !== 'packages') {
                        setMode(id.startsWith('cat-') ? 'families' : 'parts');
                        setFilter('all');
                        setDomain('all');
                        setQuery('');
                      }
                      select(id);
                      setGuide(null);
                    }}
                  >
                    <PartIcon part={p} size={20} />
                    <strong>
                      {mode === 'packages'
                        ? packageIn(p.shape, language)?.title
                        : p.name}
                    </strong>
                    <span>{p.package}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <aside
          className="inspector"
          aria-label={t('Component learning notes', '元件学习资料')}
        >
          <div className="inspector-top">
            <span>{t('COMPONENT INSIGHT', '元件学习笔记')}</span>
            <BookOpen size={14} />
          </div>
          <div className="part-badges">
            <span className="tag green">
              {profile
                ? t('Category', '元件类别')
                : kindNames[part.kind][language === 'en' ? 0 : 1]}
            </span>
            <span className="tag">{part.package}</span>
          </div>
          <h2>{mode === 'packages' ? pkg?.title : part.name}</h2>
          <div className="part-subtitle">
            {mode === 'packages' ? pkg?.name : part.subtitle}
          </div>
          <Tabs
            value={detailTab}
            onValueChange={(v) => setDetailTab(String(v))}
            className="detail-tabs"
          >
            <TabsList variant="line">
              <TabsTrigger value="about">{t('Overview', '认识它')}</TabsTrigger>
              <TabsTrigger value="pins">
                {t('Structure', '引脚与结构')}
              </TabsTrigger>
              <TabsTrigger value="uses">
                {t('Applications', '典型应用')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="about">
              <p className="detail-copy">
                {mode === 'packages' ? pkg?.description : part.description}
              </p>
              <p
                className="translation-copy"
                lang={language === 'en' ? 'zh-CN' : 'en'}
              >
                {mode === 'packages'
                  ? otherPkg?.description
                  : counterpart.description}
              </p>
              <h3 className="section-label">
                <SlidersHorizontal size={14} />
                {mode === 'packages'
                  ? t('Package features', '封装特征')
                  : profile
                    ? t('What to learn', '认识要点')
                    : t('Key specifications', '关键参数')}
              </h3>
              {mode === 'packages' ? (
                <div className="tip">
                  <p>{pkg?.feature}</p>
                </div>
              ) : (
                <div className="spec-grid">
                  {part.specs.map(([name, value]) => (
                    <div className="spec-cell" key={name}>
                      <span>{name}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="section-label">
                <CircuitBoard size={14} />
                {t('Where it is used', '常见用途')}
              </h3>
              <div className="use-tags">
                {part.uses.map((u) => (
                  <span key={u}>{u}</span>
                ))}
              </div>
              <div className="tip">
                <div className="tip-title">
                  <Lightbulb size={14} />
                  {t('Beginner’s observation', '新手观察笔记')}
                </div>
                <p>{part.tip}</p>
              </div>
            </TabsContent>
            <TabsContent value="pins">
              <p className="package-note">
                {t(
                  'Enable Labels, then inspect the top and bottom views. Use Explode to separate the illustrated structure.',
                  '打开结构标注，尝试顶视图和底视图，再拖动“结构展开”观察内部示意。',
                )}
              </p>
              <ul className="pin-list">
                {part.pinNotes.map(([title, note]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <p>{note}</p>
                  </li>
                ))}
              </ul>
              <div className="tip">
                <div className="tip-title">
                  <Lightbulb size={14} />
                  {t('From model to circuit', '从模型到电路')}
                </div>
                <p>
                  {t(
                    'Models show representative shapes and simplified internal structures. Use the selected manufacturer’s datasheet for exact dimensions, pin numbering, ratings and wiring.',
                    '模型展示典型外形与简化内部结构。具体尺寸、脚号、额定值与接线请查阅所选型号的厂商数据手册。',
                  )}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="uses">
              <h3 className="section-label">
                <CircuitBoard size={14} />
                {t('How it works in a circuit', '在电路中怎样工作')}
              </h3>
              {part.steps.map((step, i) => (
                <div className="flow-step" key={step}>
                  <b>0{i + 1}</b>
                  <p>{step}</p>
                </div>
              ))}
              <div className="tip">
                <div className="tip-title">
                  <Lightbulb size={14} />
                  {t('Follow the signal', '沿着信号观察')}
                </div>
                <p>
                  {t(
                    'Identify the input, the job this component performs, and the output. Compare the neighboring categories to understand how they work together.',
                    '找到输入、器件执行的功能和输出，再比较相关类别，理解它们怎样配合。',
                  )}
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <a
            className="source-link"
            href={part.source}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={14} />
            {t('Manufacturer reference', '查看厂商资料')}
            <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
          </a>
        </aside>
      </div>
      <footer className="bottom-status">
        <div className="status-left">
          <span>
            <i className="live-dot" />
            LOCAL · THREE.JS
          </span>
          <span>
            {t(
              'Scale & internals: learning illustrations',
              '比例与内部结构为教学示意',
            )}
          </span>
        </div>
        <div className="gesture-hint">
          <MousePointer2 size={11} />
          {t(
            'Drag: rotate · Scroll: zoom · Right drag: pan',
            '拖动旋转 · 滚轮缩放 · 右键平移',
          )}
        </div>
        <span>IC ATLAS / BILINGUAL EDITION</span>
      </footer>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="dialog-content">
          <DialogTitle>
            {dialog === 'learn'
              ? t('Learn one component at a time', '从元件到系统')
              : t('Using the workbench', '实验台操作指南')}
          </DialogTitle>
          <DialogDescription>
            {dialog === 'learn'
              ? t(
                  'Choose a path and follow the prompts to explore real device examples.',
                  '选择学习路径，跟着提示观察典型型号，理解功能。',
                )
              : t(
                  'Explore with a mouse, touch screen or keyboard. Switch languages at the top at any time.',
                  '支持鼠标、触屏和键盘操作，顶部可随时切换语言。',
                )}
          </DialogDescription>
          {dialog === 'learn' ? (
            <div className="lesson-grid">
              {lessons.map((l, i) => (
                <button
                  className="lesson-card"
                  key={l.title}
                  onClick={() => startLesson(i)}
                >
                  <span>0{i + 1}</span>
                  <div>
                    <strong>{l.title}</strong>
                    <p>{l.description}</p>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="keyboard-note">
                {t(
                  'Drag with the left mouse button to rotate, scroll to zoom, and drag with the right button to pan. On touch screens, use one finger to rotate and two fingers to zoom or pan.',
                  '鼠标左键拖动旋转，滚轮缩放，右键拖动平移。触屏单指旋转，双指缩放或平移。',
                )}
              </p>
              <p className="keyboard-note">
                <kbd>↑ ↓ ← →</kbd> {t('Rotate', '旋转')} · <kbd>+ −</kbd>{' '}
                {t('Zoom', '缩放')} · <kbd>0</kbd> {t('Reset', '重置')}
                <br />
                <kbd>/</kbd> {t('Search', '搜索')} · <kbd>Esc</kbd>{' '}
                {t('Exit fullscreen', '退出全屏')}
                <br />
                {t(
                  'Focus the 3D view before using its keyboard controls.',
                  '先点选三维场景，再使用键盘操作模型。',
                )}
              </p>
              <div className="tip">
                <div className="tip-title">
                  <Layers size={14} />
                  {t('Three ways to explore', '三种目录')}
                </div>
                <p>
                  {t(
                    'Categories covers all 200 requested families. Devices contains 100 representative parts. Packages compares 16 common package types. Gallery shows the currently filtered collection together.',
                    '类别覆盖清单中的 200 类元件；型号收录 100 个典型器件；封装比较 16 种常见类型。“展馆总览”同时展示当前筛选的内容。',
                  )}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
