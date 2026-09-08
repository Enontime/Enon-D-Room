'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Home,
  Sun,
  Moon,
  RotateCcw,
  Keyboard,
  MousePointer2,
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
import { TelevisionApp } from '@/components/apps/television';
import { CubeApp } from '@/components/apps/cube';
import { Switch } from '@/components/ui/switch';
import { objects, PROFILE_URL, type ObjectId } from '@/lib/world/objects';
import type { WorldController } from '@/lib/world/scene';
import type { ControlMode } from '@/lib/player/controls';

const BODY_VISIBILITY_KEY = 'enon-home.show-body.v1';

export default function HomePage() {
  const mount = useRef<HTMLDivElement>(null),
    world = useRef<WorldController | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [nearby, setNearby] = useState<ObjectId | null>(null);
  const [active, setActive] = useState<ObjectId | 'help' | null>(null);
  const [night, setNight] = useState(false),
    [walking, setWalking] = useState(false);
  const [mode, setMode] = useState<ControlMode>('idle'),
    [hasEntered, setHasEntered] = useState(false);
  const [clock, setClock] = useState('--:--');
  const [showBody, setShowBody] = useState(false);
  const showBodyRef = useRef(false);
  const activeRef = useRef(active),
    openRef = useRef<(id: ObjectId) => void>(() => {});
  openRef.current = (id) => {
    if (activeRef.current) return;
    if (id === 'light') setNight((value) => !value);
    else {
      world.current?.setPaused(true);
      setActive(id);
      if (id === 'profile')
        window.open(PROFILE_URL, '_blank', 'noopener,noreferrer');
    }
  };
  useEffect(() => {
    let disposed = false;
    try {
      const saved = localStorage.getItem(BODY_VISIBILITY_KEY) === 'true';
      showBodyRef.current = saved;
      setShowBody(saved);
    } catch {
      // Keep the default when this browser does not allow local storage.
    }
    import('@/lib/world/scene')
      .then(({ createWorld }) => {
        if (disposed || !mount.current) return;
        world.current = createWorld(mount.current, {
          onNearby: setNearby,
          onInteract: (id) => openRef.current(id),
          onWalking: setWalking,
          onControlChange: (value) => {
            setMode(value);
            if (value !== 'idle') setHasEntered(true);
          },
        });
        world.current.setBodyVisible(showBodyRef.current);
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
  const currentObject = nearby
    ? objects.find((item) => item.id === nearby)
    : null;
  const changeBodyVisibility = (value: boolean) => {
    showBodyRef.current = value;
    setShowBody(value);
    world.current?.setBodyVisible(value);
    try {
      localStorage.setItem(BODY_VISIBILITY_KEY, String(value));
    } catch {
      // The setting still applies to this visit when storage is unavailable.
    }
  };
  return (
    <main className={`home-shell fps-shell ${night ? 'night' : ''}`}>
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
          <span className="status-dot" />
          我的数字小天地
        </div>
        <div className="header-right">
          <span className="local-time">
            LOCAL <b>{clock}</b>
          </span>
          <button
            className="icon-button"
            onClick={() => setActive('help')}
            aria-label="操作指南与设置"
            title="操作指南与设置"
          >
            <Keyboard size={21} />
          </button>
        </div>
      </header>
      <section className="world-section" aria-label="第一人称封闭房间">
        <div
          ref={mount}
          className="world-canvas"
          tabIndex={0}
          aria-label="第一人称房间：点击进入，鼠标环顾，WASD 移动，空格跳跃，左键挥手，右键或 E 使用物品，IJKL 转动视角，Esc 释放鼠标。"
        />
        <div className="room-heading">
          <div className="eyebrow">
            <span className="tiny-square" /> ROOM 001
          </div>
          <h1>我的房间</h1>
        </div>
        <div className="room-indicator">
          <span className="status-dot" />
          {night ? '夜色正好' : '午后时光'}
          <span className="indicator-line" />
          {night ? <Moon size={16} /> : <Sun size={18} />}
        </div>
        {(!ready || error) && (
          <div className="world-loading" role="status">
            {error || '正在打开家门…'}
          </div>
        )}
        {ready && !error && (
          <div
            className={`crosshair ${currentObject ? 'can-interact' : ''}`}
            aria-hidden="true"
          />
        )}
        {ready && !error && mode === 'idle' && !active && (
          <div className="entry-prompt">
            <div className="eyebrow">ENON HOME</div>
            <h2>{hasEntered ? '继续探索' : '欢迎回家。'}</h2>
            <p>从自己的视线出发，走进这个房间。</p>
            <button onClick={() => world.current?.enter()}>
              <MousePointer2 size={18} />
              {hasEntered ? '继续探索' : '进入房间'}
            </button>
            <span>WASD 行走 · 空格跳跃 · 左键挥手 · E 使用</span>
          </div>
        )}
        {mode === 'drag' && !active && (
          <div className="look-hint">
            按住右键或触屏拖动环顾 · IJKL 也可转动视角
          </div>
        )}
        <div
          className={`interaction-prompt ${currentObject && mode !== 'idle' && !active ? 'visible' : ''}`}
          aria-live="polite"
        >
          {currentObject && mode !== 'idle' && !active && (
            <>
              <div>
                <span className="prompt-kicker">正在看向</span>
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
        {mode !== 'idle' && !active && (
          <div className="touch-controls" aria-label="触屏移动">
            {(['up', 'left', 'down', 'right'] as const).map(
              (direction, index) => (
                <button
                  key={direction}
                  className={`direction-${direction}`}
                  aria-label={`向${['前', '左', '后', '右'][index]}移动`}
                  onPointerDown={(event) => {
                    event.preventDefault();
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
        )}
        {mode !== 'idle' && !active && (
          <button
            className="touch-jump"
            onPointerDown={(e) => {
              e.preventDefault();
              world.current?.jump();
            }}
            onClick={(e) => {
              if (e.detail === 0) world.current?.jump();
            }}
            aria-label="跳跃"
          >
            ↑<span>跳跃</span>
          </button>
        )}
      </section>
      <footer className="bottom-bar">
        <div className="location">
          <span className="location-dot" />
          <div>
            <strong>我的房间</strong>
            <span>
              {walking
                ? '行走中…'
                : mode === 'idle'
                  ? '点击进入，开始探索。'
                  : '靠近物品，用准星对准它。'}
            </span>
          </div>
        </div>
        <div className="control-hints">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> 行走
          </span>
          <span>
            <MousePointer2 size={16} /> 环顾
          </span>
          <span>
            <kbd>左键</kbd> 挥手
          </span>
          <span>
            <kbd>E</kbd> 使用
          </span>
          <span>
            <kbd>SPACE</kbd> 跳跃
          </span>
          <span>
            <kbd>ESC</kbd> 鼠标
          </span>
        </div>
        <button className="reset-button" onClick={() => world.current?.reset()}>
          <RotateCcw size={16} />
          <span>回到门口</span>
        </button>
      </footer>
      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent
          className={`application-window ${active === 'terminal' ? 'terminal-window' : ''} ${active === 'tv' || active === 'cube' ? 'play-window' : ''}`}
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
                    : active === 'tv'
                      ? 'ENON PLAY / 小游戏电视'
                      : active === 'cube'
                        ? 'RUBIK / 三阶魔方'
                        : active === 'profile'
                          ? 'ENON / 个人主页'
                          : 'HOW TO PLAY / 操作指南与设置'}
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
                : active === 'tv'
                  ? '选择贪吃蛇或配对记忆，在房间里休息一下。'
                  : active === 'cube'
                    ? '转动六面、打乱和撤销，玩真正的三阶魔方。'
                    : active === 'profile'
                      ? '打开 Enon 的个人网站。'
                      : '探索房间的操作方式和第一人称显示设置。'}
            按 Escape 返回房间。
          </DialogDescription>
          {active === 'terminal' && <TerminalApp />}
          {active === 'notes' && <NotesApp />}
          {active === 'tv' && <TelevisionApp />}
          {active === 'cube' && <CubeApp />}
          {active === 'profile' && (
            <div className="profile-content">
              <div className="eyebrow">PERSONAL SPACE</div>
              <h2>你好，我是 Enon。</h2>
              <p>关于我、我的作品和更多故事，都放在个人主页里。</p>
              <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer">
                打开个人主页 ↗<span>enontime.github.io</span>
              </a>
              <p className="profile-hint">
                主页会在新标签页打开，这个房间会留在原处。
              </p>
            </div>
          )}
          {active === 'help' && (
            <div className="help-content">
              <div className="eyebrow">MAKE YOURSELF AT HOME</div>
              <h2>像在家一样，自在一点。</h2>
              <p>
                你正站在房间内部。点击进入后，用鼠标环顾四周，WASD
                沿视线方向行走。
              </p>
              <div className="body-setting">
                <div>
                  <label htmlFor="show-player-body">低头显示身体和腿</label>
                  <p id="show-player-body-description">
                    关闭时保留第一人称手臂，设置会自动记住。
                  </p>
                </div>
                <Switch
                  id="show-player-body"
                  className="body-visibility-switch"
                  checked={showBody}
                  onCheckedChange={changeBodyVisibility}
                  aria-describedby="show-player-body-description"
                />
              </div>
              <div className="help-row">
                <span>
                  <kbd>SPACE</kbd> / 触屏跳跃按钮
                </span>
                <span>跳跃</span>
              </div>
              <div className="help-row">
                <span>
                  <kbd>WASD</kbd> / <kbd>↑ ← ↓ →</kbd>
                </span>
                <span>移动</span>
              </div>
              <div className="help-row">
                <span>
                  <kbd>左键</kbd> / 按住连续挥动
                </span>
                <span>挥手</span>
              </div>
              <div className="help-row">
                <span>
                  <kbd>右键</kbd> / <kbd>E</kbd> /「打开」
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
                门左边是小游戏电视，门右边是个人主页展示板；右侧小推车上放着可玩的魔方。
                将准星对准近处的物品按 E，或用右键点击物品；触屏可轻点物品。
                左键挥手暂时只有动作，房间物品不会被破坏。Esc
                释放鼠标；关闭应用后，点击「继续探索」。鼠标锁定不可用时，可按住右键拖动，或用
                I / J / K / L 转动视角。
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
