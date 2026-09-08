'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Home,
  ArrowUpRight,
  Sun,
  Moon,
  Monitor,
  NotebookPen,
  RotateCcw,
  Keyboard,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { TerminalApp } from '@/components/apps/terminal';
import { NotesApp } from '@/components/apps/notes';
import { objects, type ObjectId } from '@/lib/world/objects';
import type { WorldController } from '@/lib/world/scene';

export default function HomePage() {
  const mount = useRef<HTMLDivElement>(null);
  const world = useRef<WorldController | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [nearby, setNearby] = useState<ObjectId | null>(null);
  const [active, setActive] = useState<ObjectId | 'help' | null>(null);
  const [night, setNight] = useState(false);
  const [walking, setWalking] = useState(false);
  const [target, setTarget] = useState<ObjectId | null>(null);
  const [clock, setClock] = useState('--:--');
  const [markers, setMarkers] = useState<
    Array<{ id: ObjectId; x: number; y: number }>
  >([]);
  const activeRef = useRef(active);
  const openRef = useRef<(id: ObjectId) => void>(() => {});
  openRef.current = (id) => {
    if (activeRef.current) return;
    if (id === 'light') setNight((value) => !value);
    else setActive(id);
  };
  useEffect(() => {
    let disposed = false;
    import('@/lib/world/scene')
      .then(({ createWorld }) => {
        if (disposed || !mount.current) return;
        world.current = createWorld(mount.current, {
          onNearby: setNearby,
          onInteract: (id) => openRef.current(id),
          onWalking: setWalking,
          onMarkers: setMarkers,
          onArrive: () => setTarget(null),
        });
        setReady(true);
      })
      .catch(() =>
        setError('3D 房间暂时无法加载，请检查浏览器是否启用了硬件加速。'),
      );
    return () => {
      disposed = true;
      world.current?.dispose();
      world.current = null;
    };
  }, []);
  useEffect(() => {
    activeRef.current = active;
    world.current?.setPaused(active !== null);
    if (!active) mount.current?.focus();
  }, [active]);
  useEffect(() => {
    world.current?.setNight(night);
  }, [night]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setActive(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, []);
  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  const goTo = (id: ObjectId) => {
    world.current?.goTo(id);
    setTarget(id);
    mount.current?.focus();
  };
  const currentObject = nearby
    ? objects.find((item) => item.id === nearby)
    : null;
  return (
    <main className={`home-shell ${night ? 'night' : ''}`}>
      <header className="topbar">
        <a href="/" className="brand" aria-label="Enon Home 首页">
          <span className="brand-icon">
            <Home size={23} />
          </span>
          <span>
            ENON<span className="brand-divider">/</span>HOME
            <span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-center">
          <span className="status-dot" /> 我的数字小天地
        </div>
        <div className="header-right">
          <span className="local-time">
            LOCAL <b>{clock}</b>
          </span>
          <button
            className="icon-button"
            onClick={() => setActive('help')}
            aria-label="操作指南"
          >
            <Keyboard size={21} />
          </button>
        </div>
      </header>
      <section className="world-section" aria-label="可探索的 3D 房间">
        <div className="room-heading">
          <div className="eyebrow">
            <span className="tiny-square" /> ROOM 001
          </div>
          <h1>
            欢迎回家，Enon<span>。</span>
          </h1>
          <p>一个房间，一些想法，无限可能。</p>
        </div>
        <div className="room-indicator">
          <span className="status-dot" />
          {night ? '夜色正好' : '午后时光'}
          <span className="indicator-line" />
          {night ? <Moon size={16} /> : <Sun size={18} />}
        </div>
        <div
          ref={mount}
          className="world-canvas"
          tabIndex={0}
          aria-label="房间：WASD 或方向键移动，E 交互。也可以点击地面行走。"
        />
        {(!ready || error) && (
          <div className="world-loading" role="status">
            {error || '正在打开家门…'}
          </div>
        )}
        <div className="object-markers">
          {markers.map((marker) => (
            <button
              key={marker.id}
              className={`object-marker ${nearby === marker.id ? 'is-near' : ''} ${target === marker.id ? 'is-target' : ''}`}
              style={{ left: marker.x, top: marker.y }}
              onClick={() => goTo(marker.id)}
              aria-label={`走向${objects.find((obj) => obj.id === marker.id)?.name}`}
            >
              <span className="marker-symbol">
                {marker.id === 'terminal' ? (
                  <Monitor size={15} />
                ) : marker.id === 'notes' ? (
                  <NotebookPen size={15} />
                ) : (
                  <Sun size={15} />
                )}
              </span>
              <span>{objects.find((obj) => obj.id === marker.id)?.name}</span>
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
        <div className="world-caption">
          <span className="small-cross">+</span>
          <span>THE WORLD IS YOUR INTERFACE</span>
          <span className="small-cross">+</span>
        </div>
        <div
          className={`interaction-prompt ${currentObject ? 'visible' : ''}`}
          aria-live="polite"
        >
          {currentObject && (
            <>
              <div>
                <span className="prompt-kicker">就在身边</span>
                <strong>{currentObject.name}</strong>
                <span className="prompt-description">
                  {currentObject.description}
                </span>
              </div>
              <button onClick={() => openRef.current(currentObject.id)}>
                <kbd>E</kbd>
                {currentObject.id === 'light' ? '切换灯光' : '打开'}
              </button>
            </>
          )}
        </div>
        <div className="touch-controls" aria-label="触屏移动">
          {(['up', 'left', 'down', 'right'] as const).map(
            (direction, index) => (
              <button
                key={direction}
                className={`direction-${direction}`}
                aria-label={`向${['上', '左', '下', '右'][index]}移动`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  world.current?.setTouch(direction, true);
                }}
                onPointerUp={() => world.current?.setTouch(direction, false)}
                onPointerCancel={() =>
                  world.current?.setTouch(direction, false)
                }
              >
                {['↑', '←', '↓', '→'][index]}
              </button>
            ),
          )}
        </div>
      </section>
      <footer className="bottom-bar">
        <div className="location">
          <span className="location-dot" />
          <div>
            <strong>我的房间</strong>
            <span>
              {walking
                ? '散步中…'
                : target
                  ? '正在走近…'
                  : '随处走走，发现一点什么。'}
            </span>
          </div>
        </div>
        <div className="control-hints">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> 移动
          </span>
          <span>
            <kbd>E</kbd> 交互
          </span>
          <span>
            <kbd>ESC</kbd> 返回
          </span>
        </div>
        <button
          className="reset-button"
          onClick={() => {
            world.current?.reset();
            setTarget(null);
          }}
        >
          <RotateCcw size={16} />
          <span>回到起点</span>
        </button>
      </footer>
      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent
          className={`application-window ${active === 'terminal' ? 'terminal-window' : ''}`}
          showCloseButton={false}
        >
          <div className="window-titlebar">
            <div className="window-title">
              <span className="window-square" />
              <DialogTitle>
                {active === 'terminal'
                  ? 'TERMINAL / 本地终端'
                  : active === 'notes'
                    ? 'NOTEBOOK / 随手记'
                    : 'HOW TO PLAY / 操作指南'}
              </DialogTitle>
            </div>
            <DialogClose
              className="window-close"
              aria-label="关闭应用，返回房间"
            >
              ×
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            {active === 'terminal'
              ? '连接本机 PowerShell 的交互式终端。'
              : active === 'notes'
                ? '在这台设备保存你的想法。'
                : '探索房间的操作方式。'}
            按 Escape 返回房间。
          </DialogDescription>
          {active === 'terminal' && <TerminalApp />}
          {active === 'notes' && <NotesApp />}
          {active === 'help' && (
            <div className="help-content">
              <div className="eyebrow">MAKE YOURSELF AT HOME</div>
              <h2>像在家一样，自在一点。</h2>
              <p>你的小小分身已经在房间里。点击地面，或用键盘四处走走。</p>
              <div className="help-row">
                <span>
                  <kbd>WASD</kbd> / <kbd>↑ ← ↓ →</kbd>
                </span>
                <span>移动</span>
              </div>
              <div className="help-row">
                <span>
                  <kbd>E</kbd> / 点击「打开」
                </span>
                <span>使用身边的物品</span>
              </div>
              <div className="help-row">
                <span>
                  <kbd>ESC</kbd> / 点击「×」
                </span>
                <span>返回房间</span>
              </div>
              <p className="help-note">
                点击物品上方的标签，会自动走到它旁边。电脑打开本地终端；笔记本保存想法；落地灯切换昼夜。
              </p>
            </div>
          )}
          <div className="window-footer">
            <span>
              <span className="status-dot" />
              {active === 'notes'
                ? '保存在这台设备'
                : active === 'terminal'
                  ? 'LOCAL WORKSPACE'
                  : 'ENON HOME · 001'}
            </span>
            <DialogClose>
              返回房间 <kbd>ESC</kbd>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
