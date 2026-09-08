# Enon Home

可探索的方块风 3D 数字小屋，使用本地像素字体。根据上一级的 `Enon Home.md` 实现。

## 运行

需要 Node.js 22.13 或更新版本。首次运行：

```powershell
cd D:\myweb\app
npm install
npm run dev
```

打开 http://127.0.0.1:3000 。前端与终端服务均仅监听 `127.0.0.1`。`Ctrl+C` 停止两个服务。

## 操作

- WASD / 方向键：相对屏幕方向行走。
- 点击地面：自动寻路；点击物品标签：走到物品旁边。
- E /「打开」：使用近处物品。Escape / ×：返回房间。
- 电脑：真实 node-pty / PowerShell 会话，初始目录为 `D:\myweb`。关闭窗口会结束会话，重新打开创建新会话。Ctrl+C 可中断命令。
- 笔记本：自动保存到此浏览器的 localStorage。
- 落地灯：切换昼夜照明。
- 手机可使用屏幕方向键或点击地面。

## 架构

`lib/world` 管理 Three.js 场景及物品定义；`lib/player` 处理移动、碰撞与寻路；`lib/interactions` 检测交互距离；`components/apps` 放独立应用；`server/terminal.mjs` 提供本地 PTY 后端；`scripts/dev.mjs` 管理两个服务。

本地终端会实际执行启动服务的用户和运行环境有权执行的命令。PowerShell 历史记录保存在已忽略的 `app/.local/powershell_history.txt`。它只接受固定的本地页面 Origin、有效 Host 和每次启动生成的随机会话令牌。不要用管理员权限启动，也不要通过隧道或反向代理暴露给外网。

## 校验

```powershell
npm run typecheck
npm run build
npm test
```

初版范围：单个房间、三种交互、固定等距视角。未实现多房间、物品建造、存档同步、用户账户或云端终端。保留 scaffold 的 Sites 插件，但当前有本地 Shell 依赖，仅在本机运行，不会自动发布。
