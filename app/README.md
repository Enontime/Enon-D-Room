# Enon Home

第一人称的方块风 3D 数字小屋，使用本地像素字体。视点位于房间内部，四面墙和天花板完整围合。根据上一级的 `Enon Home.md` 及第一人称修正要求实现。

当前版本：**0.2.0**（待作者验收与提交）。

## 0.2.0 更新

- Vite 固定升级至 `8.0.16`，同步依赖锁文件。
- 修复魔方加载完成后画布被清空的问题，独立管理渲染容器与加载提示。
- 添加空格 / 触屏按钮跳跃、重力与落地处理，以及像素风第一人称手臂。
- 「低头显示身体和腿」改为可选设置，默认关闭；在右上角「操作指南与设置」中切换，选择保存在当前浏览器。关闭时仍显示第一人称手臂。
- 床头与床右侧靠墙，书桌、左侧柜子及电视柜贴合对应墙面；家具位置和碰撞范围共用靠墙坐标，附属屏幕、书本和摆件随家具移动。
- 为柜子和床预留踢脚线缺口，避免靠墙后的家具底部与踢脚线重叠。

建议 commit 信息：

```text
feat: refine first-person room layout and controls

- upgrade Vite to 8.0.16 and fix the cube canvas lifecycle
- add jumping and a persistent body visibility setting
- align wall furniture and synchronize collision bounds
- document version 0.2.0 and the manual validation workflow
```

## 运行

需要 Node.js 22.13 或更新版本。首次运行：

```powershell
cd D:\myweb\app
npm install
npm run dev
```

打开 http://127.0.0.1:3000 。前端与终端服务均仅监听 `127.0.0.1`。`Ctrl+C` 停止两个服务。

## 操作

- 点击「进入房间」：开始探索。鼠标环顾，WASD / 方向键沿视线方向行走。
- 空格跳跃，落地后可以再次跳跃；打开应用时暂停房间内的移动与跳跃。
- 右上角键盘图标打开「操作指南与设置」；开启「低头显示身体和腿」后，低头可看见身体与腿，行走和跳跃时带有动作。默认关闭，刷新后保留选择；浏览器禁用存储时仅本次访问生效。
- 鼠标锁定不可用时，自动使用按住鼠标拖动环顾；I / J / K / L 也可以转动视角。
- 用准星对准 2.5 米内物品，E /「打开」使用。墙壁和其他遮挡物会阻断交互。
- Escape 释放鼠标；在应用中 Escape / × 返回原位置，再点击「继续探索」。
- 电脑：真实 node-pty / PowerShell 会话，初始目录为 `D:\myweb`。关闭窗口会结束会话，重新打开创建新会话。Ctrl+C 可中断命令。
- 笔记本：自动保存到此浏览器的 localStorage。
- 落地灯：切换昼夜照明。
- 电视（门左侧）：贪吃蛇和配对记忆。贪吃蛇用方向键 / WASD 控制，空格暂停。
- 展示板（门右侧）：在新标签页打开 https://enontime.github.io/ 。
- 小推车：摆放书本、草方块、苦力怕摆件和三阶魔方。点击魔方打开六面旋转、打乱、撤销和复原操作；拖动魔方可改变观察角度。
- 新增三幅原创像素风挂画和随本机时间走动的挂钟；房间地面从约 10×8 扩为 12×10。
- 探索时也可以直接点击 2.5 米内的物品。
- 手机使用屏幕方向键行走，拖动画面环顾，点击右侧「跳跃」按钮起跳。

## 架构

`lib/world` 管理 Three.js 场景及物品定义；`lib/player` 处理第一人称视角、输入、移动和碰撞；`lib/interactions` 根据准星射线的最近表面检测交互；`components/apps` 放独立应用；`server/terminal.mjs` 提供本地 PTY 后端；`scripts/dev.mjs` 管理两个服务。

本地终端会实际执行启动服务的用户和运行环境有权执行的命令。PowerShell 历史记录保存在已忽略的 `app/.local/powershell_history.txt`。它只接受固定的本地页面 Origin、有效 Host 和每次启动生成的随机会话令牌。不要用管理员权限启动，也不要通过隧道或反向代理暴露给外网。

## 协作与手动校验

由项目作者执行测试、类型检查、构建、浏览器验收，以及 Git 提交、打标签和推送。代码协作者负责修改实现与 README、同步版本号并提供建议 commit 信息，不代运行上述操作。本次家具靠墙与身体显示开关改动尚未由作者验收。

以下命令供作者手动运行：

```powershell
npm run typecheck
npm run build
npm test
```

当前范围：单个完整围合的第一人称房间、六种物品交互。游戏进度仅保留在当前游戏窗口，关闭后重新开始。未实现多房间、物品建造、存档同步、用户账户或云端终端。保留 scaffold 的 Sites 插件，但当前有本地 Shell 依赖，仅在本机运行，不会自动发布。

Git 标签 `v0.1.0` 保留最初的第三人称原型；之后的提交记录第一人称修正。`0.2.0` 已同步到 `package.json` 与 `package-lock.json`，当前未创建对应 Git 标签或提交。
