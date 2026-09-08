import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import pty from 'node-pty';

const port = 3001;
const origin = 'http://127.0.0.1:3000';
const allowedHosts = new Set(['127.0.0.1:3000', '127.0.0.1:3001']);
const token = randomBytes(32).toString('hex');
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const historyDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.local',
);
mkdirSync(historyDirectory, { recursive: true });
const historyPath = path.join(historyDirectory, 'powershell_history.txt');
const children = new Set();
const isAllowed = (request) =>
  allowedHosts.has(request.headers.host) &&
  (!request.headers.origin || request.headers.origin === origin);
const json = (response, status, data) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(data));
};
const server = http.createServer((request, response) => {
  if (!isAllowed(request))
    return json(response, 403, { error: 'Forbidden origin or host' });
  if (request.method === 'GET' && request.url === '/local-api/health')
    return json(response, 200, { ok: true, sessions: children.size });
  if (request.method === 'GET' && request.url === '/local-api/session') {
    if (request.headers['sec-fetch-site'] === 'cross-site')
      return json(response, 403, { error: 'Forbidden site' });
    return json(response, 200, { token });
  }
  json(response, 404, { error: 'Not found' });
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://127.0.0.1:3001');
  const supplied = Buffer.from(url.searchParams.get('token') ?? '');
  const expected = Buffer.from(token);
  if (
    !isAllowed(request) ||
    request.headers.origin !== origin ||
    url.pathname !== '/local-api/terminal' ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected) ||
    children.size >= 4
  ) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) =>
    wss.emit('connection', ws, request),
  );
});
wss.on('connection', (socket) => {
  let shell;
  const send = (message) => {
    if (socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  };
  try {
    const executable =
      process.platform === 'win32'
        ? path.join(
            process.env.SystemRoot ?? 'C:\\Windows',
            'System32',
            'WindowsPowerShell',
            'v1.0',
            'powershell.exe',
          )
        : '/bin/bash';
    const shellArgs =
      process.platform === 'win32'
        ? [
            '-NoLogo',
            '-NoProfile',
            '-NoExit',
            '-Command',
            `Set-PSReadLineOption -HistorySavePath '${historyPath.replaceAll("'", "''")}'`,
          ]
        : ['--noprofile', '--norc'];
    shell = pty.spawn(executable, shellArgs, {
      name: 'xterm-256color',
      cols: 100,
      rows: 25,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    });
  } catch (error) {
    send({ type: 'error', message: `无法启动本地 Shell：${error.message}` });
    socket.close(1011);
    return;
  }
  children.add(shell);
  let closed = false,
    exited = false;
  const data = shell.onData((output) => {
    if (socket.bufferedAmount > 1024 * 1024) {
      socket.close(1009, 'Output buffer exceeded');
      return;
    }
    send({ type: 'output', data: output });
  });
  const exit = shell.onExit(({ exitCode }) => {
    exited = true;
    send({ type: 'exit', exitCode });
    socket.close();
  });
  const cleanup = () => {
    if (closed) return;
    closed = true;
    children.delete(shell);
    data.dispose();
    exit.dispose();
    if (!exited) {
      try {
        shell.kill();
      } catch {
        /* shell already exited */
      }
    }
  };
  socket.on('close', cleanup);
  socket.on('error', cleanup);
  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (
        message.type === 'input' &&
        typeof message.data === 'string' &&
        message.data.length <= 16384
      )
        shell.write(message.data);
      else if (
        message.type === 'resize' &&
        Number.isInteger(message.cols) &&
        Number.isInteger(message.rows) &&
        message.cols >= 10 &&
        message.cols <= 400 &&
        message.rows >= 5 &&
        message.rows <= 150
      )
        shell.resize(message.cols, message.rows);
      else socket.close(1008, 'Invalid terminal message');
    } catch {
      socket.close(1008, 'Invalid terminal message');
    }
  });
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Local terminal listening on http://127.0.0.1:${port}`),
);
server.on('error', (error) => {
  console.error(`Terminal server: ${error.message}`);
  process.exit(1);
});
function shutdown() {
  for (const shell of children) {
    try {
      shell.kill();
    } catch {
      /* already exited */
    }
  }
  for (const socket of wss.clients) socket.terminate();
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
