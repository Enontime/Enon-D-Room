import { spawn } from 'node:child_process';
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32')
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    else child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 800).unref();
}
for (const args of [
  ['server/terminal.mjs'],
  [
    'node_modules/vinext/dist/cli.js',
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3000',
  ],
]) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
