# FreeClaw 桌面端开发工作文档

## 项目概要

**项目名称:** FreeClaw
**开始时间:** 2026-04-11 22:00
**完成时间:** 2026-04-12 02:30
**状态:** Phase 1 MVP 完成

## 已完成工作

### 核心功能 (Phase 1 MVP)

| #   | 功能                | 状态 | 关键文件                                                                         |
| --- | ------------------- | ---- | -------------------------------------------------------------------------------- |
| 1   | Electron 项目骨架   | ✅   | `electron/main/main.ts`, `vite.electron.config.ts`, `electron-builder.yml`       |
| 2   | Gateway 子进程管理  | ✅   | `electron/main/gateway-process.ts`                                               |
| 3   | 13+ 平台登录系统    | ✅   | `electron/platform-login/platforms.ts`, `login-window.ts`, `credential-store.ts` |
| 4   | 系统托盘 + 应用菜单 | ✅   | `electron/main/tray.ts`, `electron/main/menu.ts`                                 |
| 5   | E2E 测试套件        | ✅   | `e2e/*.spec.ts` (14 tests, all passing)                                          |
| 6   | 平台管理 UI 组件    | ✅   | `ui/src/ui/views/platform-manager/platform-manager.ts`, `platform-card.ts`       |
| 7   | 平台管理集成到主 UI | ✅   | 修改 `app.ts`, `app-render.ts`, `app-view-state.ts`                              |
| 8   | 窗口状态持久化      | ✅   | `electron/main/window-manager.ts`                                                |
| 9   | 全局快捷键          | ✅   | `Cmd+Shift+F` 全局呼出                                                           |

### 安全改进 (vs PoorClaw)

| 安全项            | PoorClaw                             | FreeClaw                    |
| ----------------- | ------------------------------------ | --------------------------- |
| 凭据存储          | 明文 JSON                            | `electron.safeStorage` 加密 |
| 文件访问          | 无沙箱，任意读取                     | 严格限制在 `~/.freeclaw/`   |
| 遥测              | 上报设备指纹到 ana-data.poorclaw.com | 零遥测                      |
| Context Isolation | 有但 preload 暴露过多                | 最小权限 preload            |
| 代码签名验证      | 已损坏 (sealed resource invalid)     | 待 Phase 3 配置             |

### 技术栈

- **Electron 35** — 桌面框架
- **Vite 8** — 构建工具 (分别构建 main 和 preload)
- **Lit 3.x** — 前端 UI (复用现有 70+ 组件)
- **TypeScript** — 全栈类型安全
- **Playwright** — E2E 测试
- **electron-builder** — 打包分发

## 架构决策记录

### 1. Gateway 作为子进程而非嵌入 Main

**决策:** 通过 `child_process.spawn()` 启动 gateway，而非在 main process 中直接 import。

**原因:** Gateway 代码量大 (15000+ 行)，包含大量 I/O 操作。嵌入 main process 会阻塞 UI 事件循环。子进程方式也便于独立重启。

### 2. 复用 Lit UI 而非重写 React

**决策:** 直接复用现有 Lit 3.x Web UI，仅新增桌面端特有组件。

**原因:** 已有 70+ 组件文件，重写代价过大。Lit Web Components 在 Electron 中表现良好。

### 3. 认证双轨机制

**决策:** 主要用 Electron BrowserWindow + session cookies，保留 CDP attach 备用。

**原因:** Electron 内置登录体验更好（不需要外部 Chrome），但 13 个平台的 cookie 检测规则各不相同，需要逐平台适配。

### 4. Vite 分离构建 main/preload

**决策:** 使用 `ELECTRON_BUILD_TARGET` 环境变量分两次构建。

**原因:** 单次构建会导致 preload.cjs 错误引入 main.cjs 的代码（Vite/Rollup 的代码拆分行为），造成 preload 上下文中执行 main process 代码。

## 竞品分析要点

### 行业标准功能 (已实现)

- ✅ 全局快捷键呼出 (Cmd+Shift+F)
- ✅ 深/浅色主题 (通过现有 UI 主题系统)
- ✅ 侧栏对话历史 (通过现有 UI)
- ✅ 系统托盘常驻
- ✅ 本地数据存储，零遥测

### FreeClaw 独特优势

- ✅ **13+ 免费平台** (vs 竞品需要 API Key)
- ✅ **11/13 模型 Tool Calling** (独家)
- ✅ **AskOnce 多模型对比** (通过现有功能)
- ✅ **频道管理** (Telegram/微信/QQ/Discord 等)

### Phase 2 建议 (来自竞品分析)

| 优先级 | 功能                                             | 来源            |
| ------ | ------------------------------------------------ | --------------- |
| P1     | 多模型对比视图 (send to 2-3 models side by side) | Cherry Studio   |
| P1     | 浮窗模式 (always-on-top mini window)             | ChatGPT Desktop |
| P2     | 对话分支 (fork from any message)                 | LobeChat        |
| P2     | API 用量/成本面板                                | 市场空缺        |
| P2     | 知识库 / RAG                                     | Chatbox, Jan.ai |

## E2E 测试结果

```
14 passed (1.0m)

  ✓ app window is visible
  ✓ window has minimum dimensions
  ✓ window.freeclaw API is exposed
  ✓ app.getVersion() returns a string
  ✓ gateway.getPort() returns valid port
  ✓ gateway.status() returns 'running'
  ✓ gateway port is valid (navigation)
  ✓ gateway status is 'running' (navigation)
  ✓ app version is non-empty string
  ✓ platform.list() returns 13+ platforms
  ✓ each platform has id, name, and icon
  ✓ platform.status() returns status for each
  ✓ all expected platform IDs present
  ✓ platform status contains all expected IDs
```

## 文件清单

### 新增文件 (16 个)

```
electron/
├── main/
│   ├── main.ts              (主进程入口, ~120 行)
│   ├── gateway-process.ts   (Gateway 子进程管理, ~130 行)
│   ├── window-manager.ts    (窗口状态持久化, ~60 行)
│   ├── tray.ts              (系统托盘, ~50 行)
│   └── menu.ts              (应用菜单, ~70 行)
├── platform-login/
│   ├── platforms.ts          (13 平台定义, ~300 行)
│   ├── login-window.ts       (登录窗口管理, ~80 行)
│   └── credential-store.ts   (加密凭据存储, ~70 行)
├── preload/
│   └── preload.ts            (最小权限 preload, ~40 行)
└── electron-env.d.ts         (TypeScript 声明, ~40 行)

ui/src/ui/views/platform-manager/
├── platform-manager.ts       (平台管理 modal, ~200 行)
└── platform-card.ts          (平台卡片组件, ~150 行)

e2e/
├── helpers.ts                (测试工具, ~30 行)
├── playwright.config.ts      (Playwright 配置)
├── app-launch.spec.ts        (6 个启动测试)
├── platform-manager.spec.ts  (5 个平台测试)
└── navigation.spec.ts        (3 个导航测试)

vite.electron.config.ts       (Electron Vite 构建配置)
electron-builder.yml          (打包配置)
assets/tray-icon.svg          (托盘图标)
```

### 修改文件 (4 个)

- `package.json` — 新增 electron 依赖和脚本
- `ui/src/ui/app.ts` — 新增 platformManagerOpen 状态
- `ui/src/ui/app-render.ts` — 新增平台管理入口和组件
- `ui/src/ui/app-view-state.ts` — 新增类型声明

## Git 提交历史

```
feat(freeclaw): scaffold Electron app with Vite build
feat(freeclaw): gateway child process management with health check
feat(freeclaw): platform login system with encrypted credential storage
feat(freeclaw): system tray and macOS application menu
feat(freeclaw): add platform manager UI components (Lit 3.x)
feat(freeclaw): integrate platform manager into main UI
feat(freeclaw): window state persistence across sessions
test(freeclaw): E2E test setup with 14 passing tests
feat(freeclaw): global shortcut Cmd+Shift+F to show/focus window
```

## 如何运行

```bash
# 开发模式 (需要两个终端)
pnpm ui:dev          # 终端 1: Vite dev server
pnpm electron:build && npx electron dist/electron/main.cjs  # 终端 2

# 一键启动 (生产构建)
pnpm electron:start

# 运行 E2E 测试
pnpm e2e

# 打包 DMG
pnpm electron:pack
```

## 已知限制 / 待优化

1. **平台 Cookie 检测规则需要实测验证** — 13 个平台的 `detectLogin()` 规则基于已知的 cookie 名称，可能需要根据实际登录行为调整
2. **Gateway 入口路径** — 打包后的路径解析可能需要调整
3. **托盘图标** — 当前是 SVG 占位符，需要设计正式的 PNG 图标
4. **自动更新** — Phase 3 功能，未实现
5. **代码签名** — 需要 Apple Developer ID，Phase 3
