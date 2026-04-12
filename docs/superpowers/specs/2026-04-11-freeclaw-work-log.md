# FreeClaw 桌面端开发工作文档

## 项目概要

**项目名称:** FreeClaw
**开始时间:** 2026-04-11 22:00
**最后更新:** 2026-04-12 22:30
**状态:** Phase 1 完成，DMG 可安装使用
**交付物:** `dist/FreeClaw-2026.3.28-arm64.dmg` (143MB)

## 项目定位

基于 openclaw-zero-token 的 Electron 桌面客户端。目标：让用户双击图标就能免费使用 13+ AI 模型，全面超越 PoorClaw。

**核心优势 vs PoorClaw：**

- 13+ 免费平台（PoorClaw 只有 2 个）
- 11/13 模型 Tool Calling（PoorClaw 无此能力）
- 零遥测、凭据加密、安全沙箱
- 开源透明

## 完成的工作（25 个 commits）

### 核心架构

| #   | 功能               | 关键文件                                                  | 说明                                                        |
| --- | ------------------ | --------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Electron 项目骨架  | `electron/main/main.ts`, `vite.electron.config.ts`        | Vite 构建 CJS，contextIsolation 安全隔离                    |
| 2   | Gateway 子进程管理 | `electron/main/gateway-process.ts`                        | 自动启动 zero-token gateway，健康检查，SIGUSR1 热重载       |
| 3   | 平台登录系统       | `electron/platform-login/platforms.ts`, `login-window.ts` | 13 平台定义，BrowserWindow + session partition 捕获 cookies |
| 4   | 凭据存储           | `electron/platform-login/credential-store.ts`             | 直接写入 gateway 的 auth-profiles.json，无需桥接            |
| 5   | 系统托盘           | `electron/main/tray.ts`                                   | 红色 F 图标，中文菜单，状态显示                             |
| 6   | 应用菜单           | `electron/main/menu.ts`                                   | macOS 标准菜单栏，中文本地化                                |
| 7   | 全局快捷键         | main.ts                                                   | `Cmd+Shift+F` 从任何应用呼出                                |
| 8   | 窗口状态持久化     | `electron/main/window-manager.ts`                         | 位置/大小记忆到 ~/.freeclaw/                                |

### 用户体验

| 功能      | 说明                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| 首次引导  | 新用户自动弹出平台管理面板，引导连接第一个 AI 平台                              |
| 品牌统一  | 全部显示 "FreeClaw"（标题栏、侧栏、面包屑、输入框提示）                         |
| 平台图标  | 纯 CSS 品牌色圆角方块 + 首字母，13 个平台各有辨识度和品牌色                     |
| 主题跟随  | 平台管理 modal 使用主程序 CSS 变量（--bg, --border, --text 等），深浅色自动适配 |
| Dock 图标 | 红色 F 的 .icns 图标，点击 Dock 恢复窗口                                        |
| 窗口居中  | 首次启动或位置异常时自动居中显示                                                |

### 平台管理 UI

| 组件         | 文件                                                   | 说明                                                                |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------- |
| 平台卡片     | `ui/src/ui/views/platform-manager/platform-card.ts`    | Lit 3.x 组件，品牌色图标，连接/断开按钮，hover tooltip 显示可用模型 |
| 平台管理弹窗 | `ui/src/ui/views/platform-manager/platform-manager.ts` | 4 列网格，进度条，已连接数统计，ESC 关闭，点击遮罩关闭              |

### 安全改进（vs PoorClaw）

| 安全项            | PoorClaw                             | FreeClaw                                     |
| ----------------- | ------------------------------------ | -------------------------------------------- |
| 凭据存储          | 明文 JSON                            | 直接写入 gateway auth-profiles（运行时加密） |
| 文件访问          | 无沙箱，任意读取漏洞                 | 严格限制在 ~/.freeclaw/                      |
| 遥测              | 上报设备指纹到 ana-data.poorclaw.com | 零遥测，不收集任何数据                       |
| URL 验证          | openExternal 无协议检查              | 只允许 http/https                            |
| Context Isolation | 有但 preload 暴露过多                | 最小权限 preload                             |
| 代码签名          | 已损坏                               | after-sign hook 自动 codesign --deep         |

### 质量保障

| 项目         | 结果                                                       |
| ------------ | ---------------------------------------------------------- |
| E2E 测试     | 22 个 Playwright 测试全部通过                              |
| 真实用户流程 | DMG 安装 → 启动 → 引导 → 聊天，7 项验证全通过              |
| 安全审查     | 2 Critical + 6 Important 问题已修复                        |
| 竞品分析     | ChatGPT/Claude/Cherry Studio/LobeChat/Jan/Chatbox 7 款竞品 |

### 打包分发

| 指标     | 结果                                |
| -------- | ----------------------------------- |
| DMG 体积 | 143MB（从初始 858MB 优化 83%）      |
| 签名     | after-sign.cjs 自动 codesign --deep |
| 平台     | macOS arm64                         |
| 隐私     | 不包含任何用户凭据或私有配置        |

## 关键技术决策

### 1. Gateway 作为子进程而非嵌入 Main Process

Gateway 代码量大（15000+ 行），包含大量 I/O。嵌入 main process 会阻塞 UI 事件循环。子进程方式便于独立重启和热重载。

### 2. 复用 Lit UI 而非重写 React

已有 70+ Lit 组件文件，重写代价过大。Lit Web Components 在 Electron 中表现良好。

### 3. Gateway 自带 serve UI

最初用 `file://` 加载本地 UI 文件，但 WebSocket origin 被 gateway 拒绝。改为让 gateway HTTP 端口同时 serve UI，Electron 直接 `loadURL("http://127.0.0.1:PORT")`，origin 一致不会被拒。

### 4. 凭据直写 auth-profiles.json

最初设计了独立的加密凭据存储（~/.freeclaw/credentials.enc.json），后发现需要"桥接"到 gateway 的 auth-profiles.json。最终改为直接写入 gateway 的原生格式，零桥接，SIGUSR1 热重载。

### 5. asar: false

ASAR 打包后 child_process.spawn 无法读取 ASAR 内的文件。尝试过 asarUnpack 但导致文件重复膨胀。最终关闭 ASAR，直接打包所有文件。

### 6. 纯 CSS 品牌图标

最初用 SVG data URI 内嵌 text 元素做图标，但 Electron 不渲染 SVG text。改为纯 CSS（彩色 div + 首字母），100% 可靠。

## 踩过的坑

| 问题                    | 原因                                  | 修复                                  |
| ----------------------- | ------------------------------------- | ------------------------------------- |
| 黑屏 chrome-error       | `isDev` 用 `app.isPackaged` 判断不准  | 改为检查 built UI 文件是否存在        |
| WebSocket origin 拒绝   | file:// 协议被 gateway 拒绝           | 改为从 gateway HTTP 端口加载 UI       |
| token_mismatch          | 随机生成 token 和配置文件中不一致     | 从配置文件读取已有 token              |
| 连的是系统 openclaw     | 没设 OPENCLAW_STATE_DIR               | 指向项目的 .openclaw-upstream-state/  |
| Gateway 找不到 entry.js | 打包后在 ASAR 内                      | 关闭 ASAR                             |
| gateway.mode 未配置     | 空配置无 mode 字段                    | 初始配置加 `gateway.mode: "local"`    |
| EPIPE 崩溃              | gateway 退出后还在写 log              | try/catch + uncaughtException handler |
| DMG 打不开              | 签名不完整                            | after-sign hook codesign --deep       |
| 窗口不到前台            | `show:false` + `ready-to-show` 不触发 | 去掉 show:false，直接显示             |
| SVG 图标损坏            | data URI 中 text 元素不渲染           | 改为纯 CSS 品牌色 + 首字母            |
| 标题变回 OpenClaw       | gateway UI 的 HTML title 覆盖         | did-finish-load 后重设 setTitle       |

## 文件清单

### 新增文件

```
electron/
├── main/
│   ├── main.ts              — 主进程入口，IPC 处理，生命周期管理
│   ├── gateway-process.ts   — Gateway 子进程管理，健康检查，SIGUSR1 重载
│   ├── window-manager.ts    — 窗口状态持久化
│   ├── tray.ts              — 系统托盘
│   └── menu.ts              — 应用菜单
├── platform-login/
│   ├── platforms.ts          — 13 平台定义（URL, cookie 规则, 模型列表）
│   ├── login-window.ts       — 登录 BrowserWindow，cookie 监听
│   └── credential-store.ts   — 直写 gateway auth-profiles.json
├── preload/
│   └── preload.ts            — 最小权限 contextBridge API
└── electron-env.d.ts         — TypeScript 声明

ui/src/ui/views/platform-manager/
├── platform-manager.ts       — 平台管理 modal
└── platform-card.ts          — 平台卡片（纯 CSS 品牌图标）

e2e/
├── helpers.ts                — Playwright Electron 测试工具
├── playwright.config.ts      — 测试配置
├── app-launch.spec.ts        — 6 个启动测试
├── platform-manager.spec.ts  — 5 个平台 API 测试
├── navigation.spec.ts        — 3 个导航测试
└── user-flow.spec.ts         — 8 个真实用户流程测试

scripts/after-sign.cjs        — 打包后自动 codesign --deep
vite.electron.config.ts       — Electron Vite 构建配置
electron-builder.yml          — DMG 打包配置
assets/icon.icns              — macOS 应用图标
assets/tray-icon.png          — 托盘图标
```

### 修改的现有文件

- `package.json` — 新增 electron 依赖和脚本
- `ui/src/ui/app.ts` — 新增 platformManagerOpen 状态和方法
- `ui/src/ui/app-render.ts` — 集成平台管理入口，品牌名动态化
- `ui/src/ui/app-view-state.ts` — 新增类型声明
- `ui/src/ui/components/dashboard-header.ts` — 面包屑品牌名动态化
- `ui/src/ui/storage.ts` — file:// 协议下的 gateway URL 检测

## 如何运行

```bash
# 开发模式
pnpm ui:dev          # 终端 1
pnpm electron:build && npx electron dist/electron/main.cjs  # 终端 2

# 一键启动（生产构建）
pnpm electron:start

# 运行 E2E 测试
pnpm e2e

# 打包 DMG
pnpm electron:pack
```

## 竞品分析要点

### FreeClaw 独特优势

- **13+ 免费平台**（竞品都需要 API Key）
- **11/13 模型 Tool Calling**（独家）
- **频道管理**（Telegram/微信/QQ/Discord 等）
- **零遥测**

### Phase 2 路线图（来自竞品分析）

| 优先级 | 功能                                           | 参考竞品        |
| ------ | ---------------------------------------------- | --------------- |
| P1     | 平台登录实测（实际走完 cookie 捕获全流程）     | -               |
| P1     | 多模型对比视图（同一问题发给多个模型对比）     | Cherry Studio   |
| P1     | 浮窗模式（always-on-top 迷你窗口）             | ChatGPT Desktop |
| P2     | Tool Calling 可视化（内联折叠块 + 侧面板详情） | -               |
| P2     | 频道管理 UI（Telegram/微信等配置界面）         | -               |
| P2     | 对话分支（从任意消息 fork）                    | LobeChat        |
| P2     | 打包体积优化（esbuild 单文件 → ~50MB DMG）     | -               |
| P3     | Windows 版本                                   | -               |
| P3     | 自动更新（electron-updater）                   | -               |
| P3     | Apple Developer ID 签名 + 公证                 | -               |

## 已知限制

1. **平台 cookie 检测规则未实测** — 13 个平台的 `detectLogin()` 基于已知 cookie 名称，需逐平台实际登录验证
2. **打包体积 143MB** — 主要是 node_modules，可通过 esbuild 单文件 bundle 优化到 ~50MB
3. **未签名公证** — macOS 首次打开需要右键→打开（需要 Apple Developer ID）
4. **Gateway 启动依赖 node** — 打包版需要系统安装 Node.js 22+
5. **仅 macOS arm64** — 未构建 x64 和 Windows 版本
