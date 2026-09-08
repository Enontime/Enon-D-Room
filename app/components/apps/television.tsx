'use client';
import { useEffect, useRef, useState } from 'react';
import {
  GRID,
  canTurn,
  newSnake,
  stepSnake,
  type Cell,
  type SnakeState,
} from '@/lib/games/snake';

export function TelevisionApp() {
  const [game, setGame] = useState<'snake' | 'memory' | null>(null);
  return (
    <div className="television-app">
      <div className="arcade-top">
        <span>
          ENON PLAY /{' '}
          {game === 'snake' ? '01' : game === 'memory' ? '02' : 'SELECT'}
        </span>
        {game && <button onClick={() => setGame(null)}>← 游戏列表</button>}
      </div>
      {!game ? (
        <div className="game-menu">
          <div className="eyebrow">TAKE A LITTLE BREAK</div>
          <h2>今天玩点什么？</h2>
          <div className="game-choices">
            <button className="game-choice" onClick={() => setGame('snake')}>
              <span className="game-number">01</span>
              <strong>贪吃蛇</strong>
              <span>吃掉金色方块，别碰到自己。</span>
              <b>开始游玩 →</b>
            </button>
            <button className="game-choice" onClick={() => setGame('memory')}>
              <span className="game-number">02</span>
              <strong>配对记忆</strong>
              <span>翻开卡片，找到 8 对相同图案。</span>
              <b>开始游玩 →</b>
            </button>
          </div>
          <p className="game-note">游戏就在电视里。按 Esc，随时回到房间。</p>
        </div>
      ) : game === 'snake' ? (
        <SnakeGame />
      ) : (
        <MemoryGame />
      )}
    </div>
  );
}
function SnakeGame() {
  const [state, setState] = useState(newSnake);
  const current = useRef(state),
    direction = useRef<Cell>({ x: 1, y: 0 }),
    queued = useRef(false);
  const update = (next: SnakeState) => {
    current.current = next;
    setState(next);
  };
  const turn = (next: Cell) => {
    if (
      current.current.status === 'running' &&
      !queued.current &&
      canTurn(current.current.direction, next)
    ) {
      direction.current = next;
      queued.current = true;
    }
  };
  const pause = () => {
    const s = current.current;
    if (s.status === 'running') update({ ...s, status: 'paused' });
  };
  const toggle = () => {
    const s = current.current;
    if (s.status === 'running') pause();
    else if (s.status === 'paused') update({ ...s, status: 'running' });
    else {
      const fresh = newSnake();
      direction.current = fresh.direction;
      queued.current = false;
      update({ ...fresh, status: 'running' });
    }
  };
  const action = useRef({ turn, toggle, pause });
  action.current = { turn, toggle, pause };
  useEffect(() => {
    if (state.status !== 'running') return;
    const timer = setInterval(() => {
      const next = stepSnake(current.current, direction.current);
      current.current = next;
      direction.current = next.direction;
      queued.current = false;
      setState(next);
    }, 160);
    return () => clearInterval(timer);
  }, [state.status]);
  useEffect(() => {
    const keys: Record<string, Cell> = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const key = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase();
      if (keys[k]) {
        event.preventDefault();
        action.current.turn(keys[k]);
      } else if (
        k === ' ' &&
        (event.target as HTMLElement)?.tagName !== 'BUTTON'
      ) {
        event.preventDefault();
        action.current.toggle();
      }
    };
    const blur = () => action.current.pause();
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  const labels = {
    ready: '准备开始',
    running: '游戏进行中',
    paused: '已暂停',
    over: '这次走到这里',
    won: '填满整个棋盘！',
  };
  return (
    <div className="snake-game">
      <div className="game-score">
        <h2>贪吃蛇</h2>
        <span aria-live="polite">
          {state.score.toString().padStart(2, '0')} 分
        </span>
      </div>
      <div
        className="snake-board"
        role="group"
        aria-label={`贪吃蛇棋盘，${labels[state.status]}，长度 ${state.body.length}，得分 ${state.score}`}
      >
        {state.food && (
          <span
            className="snake-food"
            style={{ gridColumn: state.food.x + 1, gridRow: state.food.y + 1 }}
          />
        )}
        {state.body.map((c, i) => (
          <span
            className={`snake-cell ${i === 0 ? 'snake-head' : ''}`}
            key={`${c.x},${c.y}`}
            style={{ gridColumn: c.x + 1, gridRow: c.y + 1 }}
          />
        ))}
        {state.status !== 'running' && (
          <div className="board-overlay">
            <strong>{labels[state.status]}</strong>
            <span>
              {state.status === 'ready'
                ? '方向键 / WASD 控制'
                : `本局得分 ${state.score}`}
            </span>
            <button onClick={toggle}>
              {state.status === 'paused'
                ? '继续游戏'
                : state.status === 'ready'
                  ? '开始游戏'
                  : '再玩一局'}
            </button>
          </div>
        )}
      </div>
      <div className="game-actions">
        <span>方向键 / WASD · 空格暂停</span>
        <button
          disabled={state.status !== 'running' && state.status !== 'paused'}
          onClick={toggle}
        >
          {state.status === 'paused' ? '继续' : '暂停'}
        </button>
      </div>
      <div className="game-pad" aria-label="贪吃蛇方向控制">
        {[
          { x: 0, y: -1, label: '上', arrow: '↑' },
          { x: -1, y: 0, label: '左', arrow: '←' },
          { x: 0, y: 1, label: '下', arrow: '↓' },
          { x: 1, y: 0, label: '右', arrow: '→' },
        ].map((d) => (
          <button
            key={d.label}
            aria-label={`蛇向${d.label}`}
            onPointerDown={(e) => {
              e.preventDefault();
              turn(d);
            }}
            onClick={(e) => {
              if (e.detail === 0) turn(d);
            }}
          >
            {d.arrow}
          </button>
        ))}
      </div>
    </div>
  );
}
const SYMBOLS = ['◆', '✦', '●', '☀', '▲', '■', '♥', '☾'];
function deck() {
  const cards = [...SYMBOLS, ...SYMBOLS];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function MemoryGame() {
  const [cards, setCards] = useState(deck),
    [open, setOpen] = useState<number[]>([]),
    [matched, setMatched] = useState<number[]>([]),
    [moves, setMoves] = useState(0);
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const same = cards[a] === cards[b];
    const timer = setTimeout(
      () => {
        if (same) setMatched((prev) => [...prev, a, b]);
        setOpen([]);
      },
      same ? 350 : 800,
    );
    return () => clearTimeout(timer);
  }, [open, cards]);
  const flip = (i: number) => {
    if (open.length >= 2 || open.includes(i) || matched.includes(i)) return;
    if (open.length === 1) setMoves((n) => n + 1);
    setOpen((prev) => [...prev, i]);
  };
  const reset = () => {
    setCards(deck());
    setOpen([]);
    setMatched([]);
    setMoves(0);
  };
  return (
    <div className="memory-game">
      <div className="game-score">
        <h2>配对记忆</h2>
        <span aria-live="polite">
          {matched.length / 2}/8 对 · {moves} 次
        </span>
      </div>
      <div className="memory-board">
        {cards.map((s, i) => {
          const visible = open.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              className={`memory-card ${visible ? 'flipped' : ''} ${matched.includes(i) ? 'matched' : ''}`}
              onClick={() => flip(i)}
              disabled={matched.includes(i) || open.length >= 2}
              aria-label={`卡片 ${i + 1}，${visible ? s : '未翻开'}${matched.includes(i) ? '，已配对' : ''}`}
            >
              {visible ? s : '?'}
            </button>
          );
        })}
      </div>
      <div className="game-actions">
        <span role="status">
          {matched.length === 16
            ? `全部找到！用了 ${moves} 次。`
            : '每次翻开两张，找到相同图案。'}
        </span>
        <button onClick={reset}>重新开始</button>
      </div>
    </div>
  );
}
