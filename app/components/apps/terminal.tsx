'use client';
import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';

export function TerminalApp({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const visibilityChanged = useRef<((visible: boolean) => void) | null>(null);
  const [status, setStatus] = useState('正在连接本地终端…');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Visibility never owns the connection. Reopening only refits and focuses it.
  useEffect(() => {
    activeRef.current = active;
    visibilityChanged.current?.(active);
  }, [active]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const abort = new AbortController();
    async function connect() {
      setStatus('正在连接本地终端…');
      setFailed(false);
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      if (disposed || !host.current) return;
      const term = new Terminal({
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: 15,
        lineHeight: 1.2,
        cursorBlink: true,
        scrollback: 2000,
        theme: {
          background: '#172d26',
          foreground: '#cfe5c4',
          cursor: '#e4c177',
          selectionBackground: '#426549',
          black: '#18342b',
          green: '#a4cd8c',
          yellow: '#e9ce8e',
          blue: '#8dbfc1',
          red: '#d8967e',
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host.current);
      term.writeln(
        '\x1b[38;2;164;205;140mENON HOME / LOCAL TERMINAL\x1b[0m\r\n',
      );
      let socket: WebSocket | undefined;
      const input = term.onData((data) => {
        if (socket?.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: 'input', data }));
      });
      let resizeFrame = 0;
      let focusAfterFit = false;
      const scheduleFit = (focus = false) => {
        if (disposed || !activeRef.current) return;
        focusAfterFit ||= focus;
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          // The pane may have closed between scheduling and this frame, or the
          // dialog may not have completed layout yet. Never resize a hidden PTY.
          if (disposed || !activeRef.current || !host.current?.clientWidth ||
              !host.current.clientHeight) return;
          fit.fit();
          if (socket?.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows,
              }),
            );
          if (focusAfterFit) {
            focusAfterFit = false;
            term.focus();
          }
        });
      };
      visibilityChanged.current = (visible) => {
        if (visible) scheduleFit(true);
        else {
          cancelAnimationFrame(resizeFrame);
          focusAfterFit = false;
          term.blur();
        }
      };
      const resize = new ResizeObserver(() => {
        if (!activeRef.current) return;
        scheduleFit();
      });
      resize.observe(host.current);
      scheduleFit(true);
      cleanup = () => {
        visibilityChanged.current = null;
        cancelAnimationFrame(resizeFrame);
        resize.disconnect();
        input.dispose();
        socket?.close();
        term.dispose();
      };
      const response = await fetch('/local-api/session', {
        signal: abort.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('服务未就绪');
      const { token } = (await response.json()) as { token: string };
      if (disposed) return;
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/local-api/terminal?token=${encodeURIComponent(token)}`,
      );
      socket.onopen = () => {
        if (disposed) return;
        setStatus('已连接 · PowerShell');
        scheduleFit(true);
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output') term.write(message.data);
          else if (message.type === 'exit') {
            setStatus('Shell 已退出，重新连接可开启新会话');
            setFailed(true);
          } else if (message.type === 'error') {
            setStatus(message.message);
            setFailed(true);
          }
        } catch {
          setStatus('收到无法读取的终端数据');
          setFailed(true);
        }
      };
      socket.onerror = () => {
        if (!disposed) {
          setStatus('连接失败，请检查本地服务');
          setFailed(true);
        }
      };
      socket.onclose = () => {
        if (!disposed) {
          setStatus('终端已断开 · 重新连接以继续');
          setFailed(true);
        }
      };
    }
    connect().catch((error) => {
      if (!disposed && error.name !== 'AbortError') {
        setStatus('本地服务未连接，请运行 npm run dev 后重试。');
        setFailed(true);
      }
    });
    return () => {
      disposed = true;
      abort.abort();
      cleanup();
    };
  }, [attempt]);
  return (
    <div className="terminal-content">
      <div className="terminal-toolbar">
        <span className="terminal-status" data-error={failed} role="status">
          {status}
        </span>
        <button onClick={() => setAttempt((value) => value + 1)}>
          重新连接
        </button>
      </div>
      <div
        ref={host}
        className="terminal-host"
        aria-label="PowerShell 本地终端"
      />
    </div>
  );
}
