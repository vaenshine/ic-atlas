'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Cpu,
  Search,
  ChevronRight,
  ArrowUpRight,
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
  Radio,
  Zap,
  MemoryStick,
  CircuitBoard,
  MoveUpRight,
  Check,
  X,
  Keyboard,
  Target,
  ExternalLink,
  ArrowDownToLine,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  parts,
  kindLabels,
  packageInfo,
  type Part,
  type Kind,
} from './catalog';
import Scene, { type SceneCommand } from './scene';
const lessons = [
  {
    title: '从外形认识封装',
    description: '定位 1 脚 → 看引脚排列 → 观察底面',
    ids: ['ne555', 'stm32', 'rp2040', 'am3358'],
    tips: [
      '找到芯片顶端的缺口。顶视图中，左上角是 1 脚。',
      '这颗芯片有四排细脚。数一边的引脚，再乘以四。',
      'QFN 的连接点在底面。点击右侧“底视图”观察焊盘。',
      'BGA 的底面铺满焊球。点击底视图，再尝试放大。',
    ],
  },
  {
    title: '理解一块开发板',
    description: '主控芯片 → 无线模组 → 完整开发板',
    ids: ['stm32', 'wroom', 'esp32dev'],
    tips: [
      '单片机把处理器、存储器与外设集成在芯片里。拖动“结构展开”，看封装内部示意。',
      '无线模组集成了芯片、时钟、Flash 和天线。展开结构，观察屏蔽罩下面。',
      '开发板增加电源、USB 和排针，方便连接电脑与外部器件。',
    ],
  },
  {
    title: '沿着信号学习电路',
    description: '传感器 → 信号处理 → 采样 → 控制输出',
    ids: ['mpu6050', 'lm358', 'mcp3008', 'stm32', 'drv8833'],
    tips: [
      '传感器将物理运动转换为电信号。MPU-6050 内部集成了采样与数字接口。',
      '微弱的模拟传感器信号，可以先由运放放大。',
      'ADC 将模拟电压转换成数值。查看“典型应用”了解采样过程。',
      '单片机读取数据，并根据程序作出判断。',
      '电机驱动芯片把控制信号转换成带动电机所需的电流。',
    ],
  },
];
function PartIcon({ part, size = 18 }: { part: Part; size?: number }) {
  const Icon =
    part.kind === 'module'
      ? part.family === '无线连接'
        ? Radio
        : CircuitBoard
      : part.family === '电源与驱动'
        ? Zap
        : part.family === '存储与时钟'
          ? MemoryStick
          : Cpu;
  return <Icon size={size} strokeWidth={1.6} />;
}
export default function Home() {
  const [selected, setSelected] = useState('esp32dev'),
    [filter, setFilter] = useState<Kind | 'all'>('all'),
    [query, setQuery] = useState(''),
    [mode, setMode] = useState<'parts' | 'packages'>('parts'),
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
  const part = parts.find((p) => p.id === selected) || parts[0];
  const pkg = packageInfo[part.shape];
  const packageParts = useMemo(
    () =>
      Object.keys(packageInfo)
        .map((shape) => parts.find((p) => p.shape === shape))
        .filter((p): p is Part => !!p),
    [],
  );
  const visible = useMemo(() => {
    const list = mode === 'packages' ? packageParts : parts;
    return list.filter(
      (p) =>
        (mode === 'packages' || filter === 'all' || p.kind === filter) &&
        `${p.name} ${p.subtitle} ${p.package} ${p.family} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  }, [filter, query, mode, packageParts]);
  const grouped = useMemo(
    () =>
      Array.from(
        new Set(
          visible.map((p) => (mode === 'packages' ? '典型封装' : p.family)),
        ),
      ).map((name) => ({
        name,
        items: visible.filter(
          (p) => (mode === 'packages' ? '典型封装' : p.family) === name,
        ),
      })),
    [visible, mode],
  );
  const quick = useMemo(
    () =>
      mode === 'packages'
        ? packageParts.slice(0, 5)
        : ['esp32dev', 'stm32', 'ne555', 'atmega', 'wroom']
            .map((id) => parts.find((p) => p.id === id)!)
            .filter(Boolean),
    [mode, packageParts],
  );
  const select = (id: string) => {
    setSelected(id);
    setExplode(0);
    setOverview(false);
    setMobileCatalog(false);
    setDetailTab('about');
  };
  const runCommand = (type: SceneCommand['type']) =>
    setCommand((c) => ({ type, tick: c.tick + 1 }));
  const changeMode = (value: 'parts' | 'packages') => {
    setMode(value);
    setQuery('');
    setFilter('all');
    setGuide(null);
    setOverview(false);
    if (value === 'packages') select('stm32');
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        setMobileCatalog(false);
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setMobileCatalog(true);
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const startLesson = (index: number) => {
    setGuide({ lesson: index, step: 0 });
    setMode('parts');
    setFilter('all');
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
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="IC Atlas 首页">
          <span className="brand-icon">
            <Cpu size={25} strokeWidth={1.5} />
          </span>
          <div>
            <div className="brand-name">
              IC <span>ATLAS</span>
            </div>
            <div className="brand-sub">芯片探索实验室</div>
          </div>
        </a>
        <nav className="topnav" aria-label="主导航">
          <button
            className={mode === 'parts' ? 'active' : ''}
            onClick={() => changeMode('parts')}
          >
            <Box size={16} />
            元件图鉴
          </button>
          <button
            className={mode === 'packages' ? 'active' : ''}
            onClick={() => changeMode('packages')}
          >
            <Layers size={16} />
            封装实验室
          </button>
          <button onClick={() => setDialog('learn')}>
            <BookOpen size={16} />
            学习路径
            <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="top-right">
          <span>
            <i className="live-dot" />
            探索，从一颗芯片开始
          </span>
          <button
            className="help-button"
            aria-label="操作帮助"
            onClick={() => setDialog('help')}
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside
          className={`catalog ${mobileCatalog ? 'mobile-open' : ''}`}
          aria-label="元件目录"
        >
          <div className="catalog-head">
            <div className="eyebrow">THE COLLECTION</div>
            <div className="catalog-title">
              <h2>{mode === 'parts' ? '探索元件' : '认识封装'}</h2>
              <span className="count">
                {mode === 'parts' ? parts.length : packageParts.length}
              </span>
            </div>
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索型号、功能、封装…"
                aria-label="搜索型号、功能或封装"
              />
              <kbd>/</kbd>
            </label>
            {mode === 'parts' && (
              <div className="filter-row" aria-label="元件分类">
                {(
                  [
                    ['all', '全部'],
                    ['ic', 'IC'],
                    ['mcu', '单片机'],
                    ['module', '模块'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    className={filter === value ? 'active' : ''}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="catalog-scroll">
            {grouped.map((g) => (
              <div key={g.name}>
                <div className="group-label">
                  <span>{g.name}</span>
                  <span>{g.items.length.toString().padStart(2, '0')}</span>
                </div>
                {g.items.map((p) => (
                  <button
                    className={`catalog-item ${selected === p.id ? 'active' : ''}`}
                    key={p.id}
                    onClick={() => {
                      select(p.id);
                      setGuide(null);
                    }}
                    aria-pressed={selected === p.id}
                  >
                    <span className="item-icon">
                      <PartIcon part={p} />
                    </span>
                    <span className="item-copy">
                      <strong>
                        {mode === 'packages'
                          ? packageInfo[p.shape]?.title
                          : p.name}
                      </strong>
                      <small>
                        {mode === 'packages'
                          ? packageInfo[p.shape]?.name
                          : `${p.package} · ${p.subtitle.replace('微控制器', 'MCU')}`}
                      </small>
                    </span>
                    {selected === p.id && (
                      <ChevronRight size={13} className="item-arrow" />
                    )}
                  </button>
                ))}
              </div>
            ))}
            {visible.length === 0 && (
              <p className="empty-results">
                暂未找到对应元件。试试“定时器”“STM32”或“DIP”。
              </p>
            )}
          </div>
          <div className="catalog-foot">
            <b>
              {parts.length} 个典型元件 · {packageParts.length} 类封装
            </b>
            <br />
            从常用型号建立你的电子知识地图
          </div>
        </aside>
        <section className="center" aria-label="三维实验台">
          <div className="scene-header">
            <div>
              <div className="breadcrumbs">
                <span>{mode === 'packages' ? '封装实验室' : '元件图鉴'}</span>
                <ChevronRight size={11} />
                <span>
                  {overview
                    ? '展馆总览'
                    : mode === 'packages'
                      ? pkg?.title
                      : kindLabels[part.kind]}
                </span>
              </div>
              <h1>
                {overview
                  ? '每一颗，都有它的用处'
                  : mode === 'packages'
                    ? `${pkg?.title} 封装`
                    : part.name}
              </h1>
              <p className="scene-subtitle">
                {overview
                  ? `${visible.length} 个展品 · 点选模型，走近它的世界`
                  : mode === 'packages'
                    ? pkg?.name
                    : part.subtitle}
              </p>
            </div>
            <div className="scene-header-right">
              <span className="scene-badge">
                <Box size={12} />
                实时 3D
              </span>
              <button
                className="mobile-catalog-toggle"
                onClick={() => setMobileCatalog(!mobileCatalog)}
              >
                <SlidersHorizontal size={14} />
                选元件
              </button>
            </div>
          </div>
          <div className={`scene-area ${expanded ? 'expanded' : ''}`}>
            <Scene
              part={part}
              parts={visible}
              rotate={rotate}
              labels={labels}
              explode={explode}
              overview={overview}
              command={command}
              onSelect={select}
            />
            {guide && (
              <div className="guide-banner">
                <p>
                  <span style={{ color: '#c4f582' }}>
                    0{guide.step + 1} / 0{lessons[guide.lesson].ids.length}
                  </span>
                  　{lessons[guide.lesson].tips[guide.step]}
                </p>
                <button onClick={nextLessonStep}>
                  {guide.step === lessons[guide.lesson].ids.length - 1
                    ? '完成'
                    : '下一步'}
                  <ChevronRight
                    size={11}
                    style={{ display: 'inline', marginLeft: 2 }}
                  />
                </button>
                <button
                  className="guide-close"
                  onClick={() => setGuide(null)}
                  aria-label="退出学习引导"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="scene-tools">
              <button
                className={`icon-button ${overview ? 'on' : ''}`}
                title="展馆总览"
                aria-label="切换全部元件 3D 总览"
                aria-pressed={overview}
                onClick={() => {
                  setOverview(!overview);
                  setExplode(0);
                  setGuide(null);
                }}
              >
                <Grid2X2 size={16} />
              </button>
              <button
                className="icon-button"
                title="重置视角 (0)"
                aria-label="重置视角"
                onClick={() => {
                  runCommand('reset');
                  setExplode(0);
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="icon-button"
                title="顶视图"
                aria-label="顶视图"
                onClick={() => runCommand('top')}
              >
                <Scan size={16} />
              </button>
              <button
                className="icon-button"
                title="底视图 · 观察焊盘与焊球"
                aria-label="底视图"
                onClick={() => runCommand('bottom')}
              >
                <ArrowDownToLine size={16} />
              </button>
              <button
                className="icon-button"
                title="放大"
                aria-label="放大模型"
                onClick={() => runCommand('zoomIn')}
              >
                <Plus size={17} />
              </button>
              <button
                className="icon-button"
                title="缩小"
                aria-label="缩小模型"
                onClick={() => runCommand('zoomOut')}
              >
                <Minus size={17} />
              </button>
              <button
                className={`icon-button ${expanded ? 'on' : ''}`}
                title={expanded ? '退出全屏' : '全屏观察'}
                aria-label={expanded ? '退出全屏观察' : '全屏观察'}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
            {overview ? (
              <div className="overview-note">点击任意元件，进入独立观察</div>
            ) : (
              <div className="model-caption">
                <span>
                  {explode > 0
                    ? 'EXPLODED VIEW / 结构示意'
                    : 'PERSPECTIVE VIEW / 透视观察'}
                </span>
                <p>
                  {mode === 'packages'
                    ? `${part.name} · ${part.package}`
                    : '拖动旋转，自由发现每一个细节'}
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
              <span>自动旋转</span>
              <Switch
                checked={rotate}
                onCheckedChange={setRotate}
                disabled={overview}
                aria-label="自动旋转"
              />
            </label>
            <label className="option">
              <Target size={14} />
              <span>结构标注</span>
              <Switch
                checked={labels}
                onCheckedChange={setLabels}
                disabled={overview}
                aria-label="显示结构标注"
              />
            </label>
            <div className="explode-control">
              <label id="explode-label">结构展开</label>
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
                {mode === 'packages' ? '从引脚看懂封装' : '从这些经典元件开始'}
              </h3>
              <small>点选切换 · 自由探索</small>
            </div>
            <div className="quick-select">
              {quick.map((p) => (
                <button
                  className={`quick-card ${p.id === selected && !overview ? 'active' : ''}`}
                  key={p.id}
                  onClick={() => {
                    select(p.id);
                    setGuide(null);
                  }}
                >
                  <PartIcon part={p} size={20} />
                  <strong>
                    {mode === 'packages'
                      ? packageInfo[p.shape]?.title
                      : p.id === 'esp32dev'
                        ? 'ESP32 DevKit'
                        : p.id === 'stm32'
                          ? 'STM32F103'
                          : p.name}
                  </strong>
                  <span>
                    {mode === 'packages'
                      ? packageInfo[p.shape]?.mount
                      : p.package}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <aside className="inspector" aria-label="元件学习资料">
          <div className="inspector-top">
            <span>COMPONENT INSIGHT</span>
            <BookOpen size={14} />
          </div>
          <div className="part-badges">
            <span className="tag green">
              {mode === 'packages' ? '封装识别' : kindLabels[part.kind]}
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
              <TabsTrigger value="about">认识它</TabsTrigger>
              <TabsTrigger value="pins">引脚与结构</TabsTrigger>
              <TabsTrigger value="uses">典型应用</TabsTrigger>
            </TabsList>
            <TabsContent value="about">
              <p className="detail-copy">
                {mode === 'packages' ? pkg?.description : part.description}
              </p>
              <h3 className="section-label">
                <SlidersHorizontal size={14} />
                {mode === 'packages' ? '封装特征' : '关键参数'}
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
                你会在哪里见到它
              </h3>
              <div className="use-tags">
                {part.uses.map((u) => (
                  <span key={u}>{u}</span>
                ))}
              </div>
              <div className="tip">
                <div className="tip-title">
                  <Lightbulb size={14} />
                  新手观察笔记
                </div>
                <p>{part.tip}</p>
              </div>
            </TabsContent>
            <TabsContent value="pins">
              <p className="package-note">
                {pkg?.feature || '由芯片、无源器件、PCB 与连接触点组成。'}
                。打开结构标注，再尝试顶视图和底视图。
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
                  看图与接线
                </div>
                <p>
                  模型用于外形与结构识别。具体尺寸、脚号、电源和接线以所选型号的数据手册为准。
                </p>
              </div>
            </TabsContent>
            <TabsContent value="uses">
              <h3 className="section-label">
                <CircuitBoard size={14} />
                {part.uses[0]} · 工作过程
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
                  建立连接
                </div>
                <p>
                  {part.kind === 'module'
                    ? '在板上找到主控芯片，再分辨电源电路、通信接口和连接器。'
                    : part.kind === 'mcu'
                      ? '把系统拆成输入、处理和输出三部分，单片机负责执行中间的程序。'
                      : '先确定信号从哪里来、需要怎样处理、最终送到哪里。'}
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
            查看厂商资料
            <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
          </a>
        </aside>
      </div>
      <footer className="bottom-status">
        <div className="status-left">
          <span>
            <i className="live-dot" />
            THREE.JS · 3D WORKSPACE
          </span>
          <span>模型比例与内部结构为教学示意</span>
        </div>
        <div className="gesture-hint">
          <MousePointer2 size={11} />
          拖动旋转　·　滚轮缩放　·　右键平移
        </div>
        <span>IC ATLAS / VOL. 01</span>
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
              ? '从一颗芯片，认识一个系统'
              : '让实验台顺手起来'}
          </DialogTitle>
          <DialogDescription>
            {dialog === 'learn'
              ? '选择一条学习路径，跟着提示观察模型、理解功能。'
              : '每个元件都可以从任意角度观察。电脑、触屏和键盘都能操作。'}
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
                鼠标左键拖动旋转，滚轮缩放，右键拖动平移。触屏单指旋转，双指缩放或平移。
              </p>
              <p className="keyboard-note">
                点选 3D 场景后，用 <kbd>↑ ↓ ← →</kbd> 旋转，<kbd>+</kbd>{' '}
                <kbd>−</kbd> 缩放，<kbd>0</kbd> 重置视角。<kbd>/</kbd>{' '}
                搜索元件，<kbd>Esc</kbd> 退出全屏。
              </p>
              <div className="tip">
                <div className="tip-title">
                  <Layers size={14} />
                  三种学习方式
                </div>
                <p>
                  元件图鉴认识功能；封装实验室比较外形；学习路径串起系统。使用“结构展开”探索内部，“展馆总览”同时浏览当前目录。
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
