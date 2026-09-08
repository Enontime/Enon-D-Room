'use client';
import { useEffect, useRef, useState } from 'react';
import {
  FACE_COLORS,
  FACES,
  isSolved,
  scrambleMoves,
  solvedCube,
  turnCube,
  type Cubie,
  type Move,
} from '@/lib/games/cube';
import type { createCubeView } from '@/lib/games/cube-view';
type View = ReturnType<typeof createCubeView>;
const FACE_LABELS = { R: '右', L: '左', U: '上', D: '下', F: '前', B: '后' };
export function CubeApp() {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<View | null>(null),
    current = useRef<Cubie[]>(solvedCube()),
    locked = useRef(false);
  const [cube, setCube] = useState(current.current),
    [history, setHistory] = useState<Move[]>([]),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    import('@/lib/games/cube-view')
      .then(({ createCubeView }) => {
        if (disposed || !host.current) return;
        view.current = createCubeView(host.current);
        view.current.paint(current.current);
        setReady(true);
      })
      .catch(() => setError('魔方加载失败，请关闭后重试。'));
    return () => {
      disposed = true;
      view.current?.dispose();
      view.current = null;
    };
  }, []);
  const paint = (next: Cubie[]) => {
    current.current = next;
    setCube(next);
    view.current?.paint(next);
  };
  const turn = (move: Move, undo = false) => {
    if (locked.current || !view.current) return;
    locked.current = true;
    setBusy(true);
    view.current.turn(current.current, move, () => {
      paint(turnCube(current.current, move));
      setHistory((h) => (undo ? h.slice(0, -1) : [...h, move]));
      locked.current = false;
      setBusy(false);
    });
  };
  const scramble = () => {
    const moves = scrambleMoves();
    paint(moves.reduce(turnCube, solvedCube()));
    setHistory(moves);
  };
  return (
    <div className="cube-app">
      <div className="game-score">
        <h2>三阶魔方</h2>
        <span role="status">
          {isSolved(cube) ? '六面已复原' : `${history.length} 步 · 继续转转`}
        </span>
      </div>
      <div
        className="cube-stage"
        ref={host}
        role="img"
        aria-label={`可拖动查看的三阶魔方，${isSolved(cube) ? '已复原' : '未复原'}`}
      >
        {(!ready || error) && (
          <div className="cube-loading">{error || '正在拿起魔方…'}</div>
        )}
      </div>
      <p className="cube-instruction">
        拖动查看六面。按钮按色心转动对应面；↻ 顺时针，↺ 逆时针。
      </p>
      <div className="cube-face-controls">
        {FACES.map((face) => (
          <div className="cube-face" key={face}>
            <span>
              <i style={{ background: FACE_COLORS[face] }} />
              {face} {FACE_LABELS[face]}
            </span>
            <button
              disabled={busy || !ready}
              onClick={() => turn({ face, inverse: false })}
              aria-label={`${face} ${FACE_LABELS[face]}面顺时针`}
            >
              ↻
            </button>
            <button
              disabled={busy || !ready}
              onClick={() => turn({ face, inverse: true })}
              aria-label={`${face} ${FACE_LABELS[face]}面逆时针`}
            >
              ↺
            </button>
          </div>
        ))}
      </div>
      <div className="cube-actions">
        <button disabled={busy || !ready} onClick={scramble}>
          打乱 20 步
        </button>
        <button
          disabled={busy || !ready || history.length === 0}
          onClick={() => {
            const move = history.at(-1)!;
            turn({ ...move, inverse: !move.inverse }, true);
          }}
        >
          撤销一步
        </button>
        <button
          disabled={busy || !ready}
          onClick={() => {
            paint(solvedCube());
            setHistory([]);
          }}
        >
          重新复原
        </button>
        <button
          disabled={busy || !ready}
          onClick={() => view.current?.resetView()}
        >
          重置视角
        </button>
      </div>
      <p className="cube-moves" aria-label="转动记录">
        {history.length
          ? history
              .slice(-16)
              .map((m) => m.face + (m.inverse ? '′' : ''))
              .join(' ')
          : 'R / L / U / D / F / B · 从该面的正面判断顺逆时针'}
      </p>
    </div>
  );
}
