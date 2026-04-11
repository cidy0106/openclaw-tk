# FreeClaw 桌面端设计文档

## 1. 产品定位

**FreeClaw** 是基于 openclaw-zero-token 的 Electron 桌面客户端，目标是全面超越 PoorClaw。

**核心优势：**

- 13+ 免费 AI 平台（vs PoorClaw 的 2 个）
- 11/13 模型 Tool Calling 支持（PoorClaw 无此能力）
- 零遥测、凭据加密、安全沙箱（修复 PoorClaw 的安全漏洞）

**品质要求（硬性约束）：**

- 易用性第一：用户安装即用，无需看文档
- E2E 测试驱动：每个核心交互都有 Playwright 端到端测试，测试通过后才算完成
- 高质量交付：功能完整、性能流畅、UI 美观，不交付半成品

## 2. 技术架构

### 2.1 技术选型

| 组件     | 选择                              | 理由                                                                              |
| -------- | --------------------------------- | --------------------------------------------------------------------------------- |
| 桌面框架 | Electron                          | 复用现有 Web UI；session.cookies API 支持 webview 登录；Playwright/Puppeteer 集成 |
| 前端框架 | Lit 3.x（复用现有）               | 已有 70 个组件文件，重写成本不值得                                                |
| 构建工具 | Vite + electron-builder           | 现有 Vite 配置可复用；electron-builder 打包成熟                                   |
| 测试     | Playwright（E2E）+ Vitest（单元） | Electron 原生支持 Playwright 测试                                                 |
| 主题     | 深色为主 + 浅色可选               | 类 ChatGPT/Claude 的现代风格                                                      |

### 2.2 进程架构

```
┌──────────────────────────────────────────────┐
│           Electron Main Process              │
│                                              │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Window    │ │ Platform   │ │ IPC Bridge│ │
│  │ Manager   │ │ Login Mgr  │ │ (secure)  │ │
│  └───────────┘ └────────────┘ └───────────┘ │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Tray/Menu │ │ Credential │ │ Auto      │ │
│  │           │ │ Store(加密) │ │ Updater   │ │
│  └───────────┘ └────────────┘ └───────────┘ │
├──────────────────────────────────────────────┤
│     Child Process: openclaw-zero-token       │
│     (复用现有 Gateway 代码，独立进程)          │
│     - 13+ providers                          │
│     - Tool calling middleware                │
│     - Streaming SSE                          │
│     - 监听 localhost:${DYNAMIC_PORT}          │
├──────────────────────────────────────────────┤
│     Renderer: Lit 3.x Web Components        │
│     (复用 ui/ 目录 + 桌面端扩展组件)          │
│     - 聊天界面                                │
│     - 平台管理                                │
│     - 频道配置                                │
│     - 工具执行面板                            │
└──────────────────────────────────────────────┘
```

**关键设计决策：**

- Gateway 作为 child process 运行，不阻塞 Electron main process
- Main process 职责：窗口管理、平台登录窗口、IPC 桥接、凭据存储、自动更新
- Renderer 通过 localhost HTTP 与 Gateway 通信（和现有 Web UI 一致）

### 2.3 认证双轨机制

**主要方式：Electron BrowserWindow 内嵌登录（推荐）**

- 用 Electron 的 session partition 打开平台登录页
- 登录完成后通过 `session.cookies.get()` 提取 cookies
- 体验最好：不需要外部 Chrome，一键登录

**备用方式：CDP attach（高级用户）**

- 保留现有 Playwright + Chrome Debug Protocol 模式
- 支持已有 13 个平台的认证代码
- 通过设置面板切换

### 2.4 安全设计（修复 PoorClaw 漏洞）

| PoorClaw 漏洞                | FreeClaw 方案                                                |
| ---------------------------- | ------------------------------------------------------------ |
| 凭据明文 JSON 存储           | 使用 Electron safeStorage API 加密凭据                       |
| `read-file` 无路径限制       | 所有文件操作严格限制在 `~/.freeclaw/` 和用户明确选择的路径内 |
| 遥测上报设备指纹             | 零遥测，不收集任何用户数据                                   |
| `disable-library-validation` | 仅保留必要 entitlements，移除不安全的权限                    |
| preload 暴露过多 API         | 最小权限 preload，只暴露必要的 IPC channel                   |

## 3. UI 设计

### 3.1 整体布局（方案 A — 经典布局）

```
┌──────────────────────────────────────────────┐
│  🔵 FreeClaw  ● 在线    [DeepSeek R1 ▼] FREE │  ← 顶栏：品牌 + 状态 + 模型切换器
├────────┬─────────────────────────────────────┤
│        │                                     │
│ + 新对话│         聊天主体区域                  │
│        │                                     │
│ 今天    │  用户消息                            │
│ ├ 对话1 │  ┌─────────────────────────┐        │
│ ├ 对话2 │  │ AI 回复 + 内联工具调用块  │        │
│        │  │ ┌─ 🔧 read_file ──────┐ │        │
│ 昨天    │  │ │  data.csv — 已读取   │ │        │
│ ├ 对话3 │  │ └────────────────────┘ │        │
│        │  └─────────────────────────┘        │
│        │                                     │
│────────│  ┌──────────────────────── ↑ ┐      │
│⚡ 平台  │  │ 输入消息... (Enter 发送)     │      │
│📡 频道  │  └──────────────────────────┘      │
│⚙️ 设置 │                                     │
└────────┴─────────────────────────────────────┘
  侧栏                    主内容区
 (可折叠)
```

**设计要点：**

- 深色主题，主色调 `#6366f1`（indigo），类 ChatGPT/Claude 风格
- 侧栏可折叠，最大化聊天区域
- 模型切换器在顶栏右侧，下拉显示所有已连接模型，按平台分组
- FREE 标签高亮免费模型

### 3.2 Tool Calling 展示（方案 C — 两者结合）

**默认：内联折叠块**

```
AI 回复文本...
┌─ 🔧 web_search ─────────────── ▼ ─┐
│  查询: "Python pandas教程"          │
│  状态: ✅ 完成 (3 条结果)           │
└────────────────────────────────────┘
继续回复文本...
```

**展开：侧面板详情**

- 点击工具块的展开按钮，右侧滑出详情面板
- 显示完整的输入参数、执行日志、返回结果
- 面板可拖拽调整宽度
- 面板关闭后回到内联模式

### 3.3 平台管理（方案 A — 卡片网格）

**触发方式：** 点击侧栏底部的「⚡ 平台管理」，弹出 modal

**布局：**

- 顶部：标题 + 已连接数统计 + 进度条
- 主体：3 列卡片网格展示所有 13+ 平台
- 每张卡片显示：平台图标、名称、连接状态、可用模型数
- 已连接：绿色边框 + 状态指示灯
- 未连接：半透明 + "连接" 按钮
- Hover 卡片：显示该平台可用的模型列表

**登录流程：**

1. 点击"连接" → 弹出 Electron BrowserWindow（session partition 隔离）
2. 用户在 webview 中正常登录平台网站
3. 检测到登录成功（cookie 条件满足） → 自动关闭窗口
4. 卡片状态变为"已连接"，模型出现在切换器中

### 3.4 频道管理

**触发方式：** 点击侧栏底部的「📡 频道」

**频道列表：**

- Telegram、QQ Bot、微信、飞书、Discord、Slack、WhatsApp、Signal、iMessage、LINE、MS Teams、Matrix、Mattermost、Google Chat
- 每个频道显示连接状态（已连接/未连接）
- 点击频道卡片进入配置页面

**配置页面：**

- 频道特定的配置项（如 Telegram Bot Token、QQ Bot AppID 等）
- 连接/断开按钮
- 连接日志/状态

### 3.5 设置页面

- 通用设置：语言、主题（深色/浅色）、快捷键
- Gateway 设置：端口、启动方式
- 安全设置：凭据管理、清除数据
- 关于：版本信息、检查更新

## 4. 核心功能清单

### 4.1 Phase 1 — 核心可用（MVP）

| 功能           | 描述                                | 优先级 |
| -------------- | ----------------------------------- | ------ |
| Electron 壳    | 窗口管理、系统托盘、菜单栏          | P0     |
| Gateway 子进程 | 启动/停止/重启 gateway，健康检查    | P0     |
| 聊天界面       | 复用现有 Lit UI，适配 Electron 窗口 | P0     |
| 模型切换       | 顶栏下拉菜单切换已连接模型          | P0     |
| 平台管理       | 卡片网格 + Electron webview 登录    | P0     |
| 凭据加密存储   | safeStorage API 加密 auth.json      | P0     |
| 对话历史       | 本地存储对话记录                    | P0     |
| 深色主题       | indigo 主色调的深色 UI              | P0     |

### 4.2 Phase 2 — 差异化功能

| 功能                | 描述                             | 优先级 |
| ------------------- | -------------------------------- | ------ |
| Tool Calling 可视化 | 内联折叠块 + 侧面板详情          | P1     |
| 频道管理            | 频道列表 + 配置界面              | P1     |
| AskOnce 多模型对比  | 广播问题到多个模型，并排对比回复 | P1     |
| 浅色主题            | 深/浅色切换                      | P1     |
| 快捷键              | Cmd+N 新对话、Cmd+K 模型切换等   | P1     |

### 4.3 Phase 3 — 打磨发布

| 功能            | 描述                                 | 优先级 |
| --------------- | ------------------------------------ | ------ |
| 自动更新        | electron-updater，检查 + 安装更新    | P2     |
| 打包分发        | macOS dmg (arm64 + x64)、Windows exe | P2     |
| 代码签名 + 公证 | Apple Developer ID 签名 + notarize   | P2     |
| 性能优化        | 首屏加载时间 < 2s，内存占用 < 200MB  | P2     |
| Onboarding 引导 | 首次启动引导用户连接第一个平台       | P2     |

## 5. 项目结构

```
openclaw-zero-token/
├── electron/                      # 新增：Electron 桌面端代码
│   ├── main/
│   │   ├── main.ts                # 主进程入口
│   │   ├── window-manager.ts      # 窗口管理
│   │   ├── gateway-process.ts     # Gateway 子进程管理
│   │   ├── tray.ts                # 系统托盘
│   │   └── menu.ts                # 应用菜单
│   ├── platform-login/
│   │   ├── login-manager.ts       # 平台登录管理
│   │   ├── login-window.ts        # 登录 BrowserWindow
│   │   ├── platforms.ts           # 平台定义（13+ 平台的 URL、cookie 检测）
│   │   └── credential-store.ts    # 加密凭据存储
│   ├── preload/
│   │   └── preload.ts             # 最小权限 preload 脚本
│   └── ipc/
│       └── handlers.ts            # IPC 消息处理
├── ui/                            # 现有 + 扩展：Lit 3.x 前端
│   └── src/ui/
│       ├── app-*.ts               # 现有组件（复用）
│       ├── desktop-platform.ts    # 新增：平台管理组件
│       ├── desktop-channels.ts    # 新增：频道管理组件
│       ├── desktop-tool-panel.ts  # 新增：工具执行侧面板
│       └── desktop-theme.ts       # 新增：深/浅色主题系统
├── src/                           # 现有：Gateway 核心代码（不动）
│   ├── zero-token/
│   ├── agents/
│   ├── channels/
│   └── ...
├── e2e/                           # 新增：E2E 测试
│   ├── setup.ts                   # Electron + Playwright 测试设置
│   ├── app-launch.spec.ts         # 应用启动测试
│   ├── chat.spec.ts               # 聊天功能测试
│   ├── platform-login.spec.ts     # 平台登录流程测试
│   ├── model-switch.spec.ts       # 模型切换测试
│   ├── tool-calling.spec.ts       # 工具调用可视化测试
│   └── channels.spec.ts           # 频道管理测试
├── electron-builder.yml           # 打包配置
├── vite.electron.config.ts        # Electron + Vite 构建配置
└── package.json                   # 新增 electron 相关依赖
```

## 6. 数据流

### 6.1 聊天消息流

```
用户输入 → Renderer (Lit UI)
         → fetch("http://localhost:${PORT}/v1/chat/completions", { stream: true })
         → Gateway 子进程
         → zero-token provider (cookie-based web API call)
         → SSE stream back to Renderer
         → Lit UI 实时渲染
```

### 6.2 平台登录流

```
用户点击"连接" → Renderer → IPC → Main Process
              → 创建 BrowserWindow (session partition: persist:zero-${platformId})
              → 用户在 webview 中登录
              → Main Process 监听 cookie 变化
              → detectLogin() 条件满足
              → extractKey() 提取凭据
              → safeStorage.encryptString() 加密存储
              → IPC 通知 Renderer 刷新状态
              → Gateway 子进程热重载新凭据
```

### 6.3 Tool Calling 流

```
Gateway 收到 AI 回复 → tool-calling middleware 检测到工具调用
                    → SSE event: { type: "tool_call", name: "web_search", args: {...} }
                    → Renderer 显示内联工具块（loading 状态）
                    → Gateway 执行工具 → SSE event: { type: "tool_result", ... }
                    → Renderer 更新工具块（完成状态）
                    → 用户可点击展开侧面板查看详情
```

## 7. E2E 测试策略

### 7.1 测试框架

使用 `@playwright/test` + `electron` 模块，直接操控 Electron 应用。

### 7.2 核心测试用例

| 测试文件               | 测试点                               | 验收标准                                          |
| ---------------------- | ------------------------------------ | ------------------------------------------------- |
| app-launch.spec.ts     | 应用启动、窗口显示、Gateway 健康     | 启动后 5s 内窗口可见，Gateway `/healthz` 返回 200 |
| chat.spec.ts           | 输入消息、发送、接收流式回复         | 输入框可聚焦、可输入、Enter 发送、回复可见        |
| platform-login.spec.ts | 打开平台管理、点击连接、登录窗口弹出 | 弹窗打开、URL 正确、关闭后状态更新                |
| model-switch.spec.ts   | 打开模型下拉、切换模型               | 下拉可点击、模型列表正确、切换后顶栏更新          |
| tool-calling.spec.ts   | 触发工具调用、内联块显示、展开面板   | 工具块可见、可点击展开、面板内容正确              |
| channels.spec.ts       | 打开频道页、查看频道列表             | 频道列表可见、配置项可交互                        |
| theme.spec.ts          | 深/浅色切换                          | 切换后颜色变化正确、持久化到下次启动              |
| history.spec.ts        | 新建对话、切换对话、删除对话         | 对话列表更新正确、切换后聊天内容切换              |

### 7.3 测试流程

1. 每完成一个功能模块，立即编写对应 E2E 测试
2. 运行测试，若失败则修复代码直到通过
3. 所有测试通过后才提交代码
4. CI 中也运行 E2E 测试

## 8. 性能目标

| 指标              | 目标                   |
| ----------------- | ---------------------- |
| 冷启动到窗口可见  | < 3s                   |
| Gateway 就绪      | < 5s                   |
| 聊天首 token 延迟 | < 2s（网络正常时）     |
| 内存占用（空闲）  | < 200MB                |
| 打包体积          | < 180MB（含 Electron） |

## 9. 发布规划

### Phase 1（MVP）— 核心可用

Electron 壳 + Gateway 子进程 + 聊天 + 平台管理 + 模型切换 + 深色主题 + 对话历史

### Phase 2 — 差异化

Tool Calling 可视化 + 频道管理 + AskOnce + 浅色主题 + 快捷键

### Phase 3 — 打磨发布

自动更新 + 打包分发 + 代码签名 + 性能优化 + Onboarding 引导
