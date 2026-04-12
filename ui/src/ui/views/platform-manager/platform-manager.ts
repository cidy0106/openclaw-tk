import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlatformCardData } from "./platform-card.ts";
import "./platform-card.ts";

/** Demo data used when window.freeclaw is not available (browser dev mode). */
const DEMO_PLATFORMS: PlatformCardData[] = [
  {
    id: "deepseek-web",
    name: "DeepSeek",
    icon: "\u{1F40B}",
    connected: false,
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
  },
  {
    id: "qwen-web",
    name: "Qwen (International)",
    icon: "\u{1F310}",
    connected: false,
    models: [
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-plus", name: "Qwen Plus" },
    ],
  },
  {
    id: "qwen-cn-web",
    name: "\u901A\u4E49\u5343\u95EE",
    icon: "\u{1F1E8}\u{1F1F3}",
    connected: false,
    models: [
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-turbo", name: "Qwen Turbo" },
    ],
  },
  {
    id: "glm-web",
    name: "ChatGLM",
    icon: "\u{1F9CA}",
    connected: false,
    models: [
      { id: "glm-4", name: "GLM-4" },
      { id: "glm-4-flash", name: "GLM-4 Flash" },
    ],
  },
  {
    id: "glm-intl-web",
    name: "ChatGLM (International)",
    icon: "\u{1F30D}",
    connected: false,
    models: [{ id: "glm-4", name: "GLM-4" }],
  },
  {
    id: "kimi-web",
    name: "Kimi",
    icon: "\u{1F319}",
    connected: false,
    models: [
      { id: "kimi", name: "Kimi" },
      { id: "kimi-k1.5", name: "Kimi K1.5" },
    ],
  },
  {
    id: "claude-web",
    name: "Claude",
    icon: "\u{1F7E4}",
    connected: false,
    models: [
      { id: "claude-sonnet", name: "Claude Sonnet" },
      { id: "claude-opus", name: "Claude Opus" },
    ],
  },
  {
    id: "chatgpt-web",
    name: "ChatGPT",
    icon: "\u{1F916}",
    connected: false,
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4", name: "GPT-4" },
    ],
  },
  {
    id: "gemini-web",
    name: "Gemini",
    icon: "\u{1F48E}",
    connected: false,
    models: [
      { id: "gemini-pro", name: "Gemini Pro" },
      { id: "gemini-ultra", name: "Gemini Ultra" },
    ],
  },
  {
    id: "grok-web",
    name: "Grok",
    icon: "\u{1F680}",
    connected: false,
    models: [
      { id: "grok-2", name: "Grok 2" },
      { id: "grok-3", name: "Grok 3" },
    ],
  },
  {
    id: "doubao-web",
    name: "\u8C46\u5305",
    icon: "\u{1FAEA}",
    connected: false,
    models: [{ id: "doubao", name: "Doubao" }],
  },
  {
    id: "xiaomimo-web",
    name: "\u5C0F\u7231\u540C\u5B66",
    icon: "\u{1F933}",
    connected: false,
    models: [{ id: "xiaomimo", name: "XiaoMi MO" }],
  },
  {
    id: "perplexity-web",
    name: "Perplexity",
    icon: "\u{1F50D}",
    connected: false,
    models: [
      { id: "perplexity-default", name: "Perplexity" },
      { id: "perplexity-pro", name: "Perplexity Pro" },
    ],
  },
];

interface FreeclawPlatformAPI {
  list: () => Promise<Array<{ id: string; name: string; icon?: string; connected: boolean }>>;
  login: (platformId: string) => Promise<{ ok: boolean; error?: string }>;
  logout: (platformId: string) => Promise<void>;
  status: () => Promise<Record<string, { connected: boolean; error?: string }>>;
  onStatusChange: (cb: (status: Record<string, { connected: boolean }>) => void) => () => void;
}

function getAPI(): FreeclawPlatformAPI | null {
  try {
    const w = window as unknown as { freeclaw?: { platform?: FreeclawPlatformAPI } };
    return w.freeclaw?.platform ?? null;
  } catch {
    return null;
  }
}

@customElement("platform-manager")
export class PlatformManager extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(6px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      background: var(--bg-elevated, var(--bg, #fff));
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 16px;
      width: 90vw;
      max-width: 720px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 28px;
      transform: translateY(20px);
      transition: transform 0.2s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .overlay.open .modal {
      transform: translateY(0);
    }

    .modal::-webkit-scrollbar {
      width: 6px;
    }

    .modal::-webkit-scrollbar-track {
      background: transparent;
    }

    .modal::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-strong, var(--text, #1a1a1a));
    }

    .subtitle {
      font-size: 13px;
      color: var(--text-soft, #888);
      margin-top: 4px;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-soft, #999);
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition:
        background 0.15s ease,
        color 0.15s ease;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-strong, #333);
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--border, #eee);
      border-radius: 2px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #e74c3c, #c0392b);
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-soft, #888);
      font-size: 14px;
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @state()
  private _platforms: PlatformCardData[] = [];

  @state()
  private _loadingIds: Set<string> = new Set();

  private _unsubscribe: (() => void) | null = null;

  override connectedCallback() {
    super.connectedCallback();
    void this._loadPlatforms();
    this._subscribeToChanges();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  private async _loadPlatforms() {
    const api = getAPI();
    if (!api) {
      // Running outside Electron -- show demo data
      this._platforms = DEMO_PLATFORMS.map((p) => ({ ...p }));
      return;
    }

    try {
      const [list, statusMap] = await Promise.all([api.list(), api.status()]);
      this._platforms = list.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon ?? "?",
        connected: statusMap[p.id]?.connected ?? p.connected,
        models: [], // model list is static from platform defs; populated from DEMO fallback
        loading: this._loadingIds.has(p.id),
      }));

      // Merge model info from demo data if available
      for (const plat of this._platforms) {
        const demo = DEMO_PLATFORMS.find((d) => d.id === plat.id);
        if (demo) {
          plat.models = demo.models;
        }
      }
    } catch (err) {
      console.error("[platform-manager] Failed to load platforms:", err);
      this._platforms = DEMO_PLATFORMS.map((p) => ({ ...p }));
    }
  }

  private _subscribeToChanges() {
    const api = getAPI();
    if (!api) {
      return;
    }

    this._unsubscribe = api.onStatusChange((statusMap) => {
      this._platforms = this._platforms.map((p) => ({
        ...p,
        connected: statusMap[p.id]?.connected ?? p.connected,
        loading: this._loadingIds.has(p.id),
      }));
    });
  }

  private _handleConnect = async (e: CustomEvent<string>) => {
    const id = e.detail;
    const api = getAPI();
    if (!api) {
      return;
    }

    this._loadingIds = new Set([...this._loadingIds, id]);
    this._updateLoadingState();

    try {
      await api.login(id);
    } catch (err) {
      console.error(`[platform-manager] Login failed for ${id}:`, err);
    } finally {
      this._loadingIds = new Set([...this._loadingIds].filter((x) => x !== id));
    }

    await this._loadPlatforms();
  };

  private _handleDisconnect = async (e: CustomEvent<string>) => {
    const id = e.detail;
    const api = getAPI();
    if (!api) {
      return;
    }

    this._loadingIds = new Set([...this._loadingIds, id]);
    this._updateLoadingState();

    try {
      await api.logout(id);
    } catch (err) {
      console.error(`[platform-manager] Logout failed for ${id}:`, err);
    } finally {
      this._loadingIds = new Set([...this._loadingIds].filter((x) => x !== id));
    }

    await this._loadPlatforms();
  };

  private _updateLoadingState() {
    this._platforms = this._platforms.map((p) => ({
      ...p,
      loading: this._loadingIds.has(p.id),
    }));
  }

  private _handleOverlayClick = (e: MouseEvent) => {
    // Close if clicking the overlay backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      this._emitClose();
    }
  };

  private _emitClose = () => {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this._emitClose();
    }
  };

  override updated(changed: Map<string, unknown>) {
    if (changed.has("open")) {
      if (this.open) {
        void this._loadPlatforms();
        window.addEventListener("keydown", this._handleKeyDown);
      } else {
        window.removeEventListener("keydown", this._handleKeyDown);
      }
    }
  }

  override render() {
    const connected = this._platforms.filter((p) => p.connected).length;
    const total = this._platforms.length;
    const pct = total > 0 ? (connected / total) * 100 : 0;

    return html`
      <div
        class="overlay ${this.open ? "open" : ""}"
        @click=${this._handleOverlayClick}
      >
        <div class="modal" role="dialog" aria-label="\u514D\u8D39 AI \u5E73\u53F0">
          <div class="header">
            <div>
              <div class="title">\u514D\u8D39 AI \u5E73\u53F0</div>
              <div class="subtitle">\u5DF2\u8FDE\u63A5 ${connected} / ${total} \u4E2A\u5E73\u53F0</div>
            </div>
            <button class="close-btn" @click=${this._emitClose} aria-label="Close">\u2715</button>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>

          ${
            this._platforms.length > 0
              ? html`
                <div class="grid">
                  ${this._platforms.map(
                    (p) => html`
                      <platform-card
                        .data=${{ ...p, loading: this._loadingIds.has(p.id) }}
                        @connect=${this._handleConnect}
                        @disconnect=${this._handleDisconnect}
                      ></platform-card>
                    `,
                  )}
                </div>
              `
              : html`
                  <div class="empty">\u6CA1\u6709\u53EF\u7528\u5E73\u53F0</div>
                `
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "platform-manager": PlatformManager;
  }
}
