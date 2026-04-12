import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface PlatformCardData {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  models: Array<{ id: string; name: string }>;
  loading?: boolean;
}

/** Brand colors and short labels for each platform. Pure CSS, no SVG needed. */
const BRAND: Record<string, { color: string; label: string }> = {
  "deepseek-web": { color: "#4D6BFE", label: "D" },
  "qwen-web": { color: "#6236FF", label: "Q" },
  "qwen-cn-web": { color: "#6236FF", label: "通" },
  "glm-web": { color: "#3D5AFE", label: "智" },
  "glm-intl-web": { color: "#3D5AFE", label: "G" },
  "kimi-web": { color: "#1A1A1A", label: "K" },
  "claude-web": { color: "#D97706", label: "C" },
  "chatgpt-web": { color: "#10A37F", label: "G" },
  "gemini-web": { color: "#4285F4", label: "G" },
  "grok-web": { color: "#000000", label: "X" },
  "doubao-web": { color: "#3B82F6", label: "豆" },
  "xiaomimo-web": { color: "#FF6700", label: "Mi" },
  "perplexity-web": { color: "#20808D", label: "P" },
};

@customElement("platform-card")
export class PlatformCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--card, var(--bg-elevated, #fff));
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      cursor: default;
      transition:
        transform 0.15s,
        box-shadow 0.15s,
        border-color 0.15s;
      position: relative;
    }
    .card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .card.connected {
      border-color: #22c55e;
    }
    .card:not(.connected) {
      opacity: 0.7;
    }
    .card:not(.connected):hover {
      opacity: 1;
    }

    .logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      margin: 0 auto 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 18px;
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      letter-spacing: -0.5px;
    }

    .name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-strong, var(--text, #1a1a1a));
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status {
      font-size: 11px;
      margin-bottom: 12px;
      color: var(--text-soft, #999);
    }
    .status.online {
      color: #22c55e;
    }

    .btn {
      display: block;
      width: 100%;
      padding: 7px 0;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-connect {
      background: var(--accent-subtle, rgba(59, 130, 246, 0.08));
      color: var(--accent, #3b82f6);
    }
    .btn-connect:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.15);
    }

    .btn-disconnect {
      background: rgba(239, 68, 68, 0.06);
      color: #ef4444;
    }
    .btn-disconnect:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.12);
    }

    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-elevated, #fff);
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 11px;
      color: var(--text-soft, #666);
      white-space: nowrap;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .card:hover .tooltip {
      display: block;
    }
    .tooltip-title {
      color: var(--text-strong, #333);
      font-weight: 600;
      margin-bottom: 3px;
    }
    .tooltip-model {
      line-height: 1.6;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-top-color: var(--accent, #3b82f6);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 4px;
      vertical-align: middle;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: Object })
  data: PlatformCardData = { id: "", name: "", icon: "", connected: false, models: [] };

  private _handleConnect = () => {
    this.dispatchEvent(
      new CustomEvent("connect", { detail: this.data.id, bubbles: true, composed: true }),
    );
  };

  private _handleDisconnect = () => {
    this.dispatchEvent(
      new CustomEvent("disconnect", { detail: this.data.id, bubbles: true, composed: true }),
    );
  };

  override render() {
    const { id, name, connected, models, loading } = this.data;
    const brand = BRAND[id] ?? { color: "#6b7280", label: name.charAt(0).toUpperCase() };

    return html`
      <div class="card ${connected ? "connected" : ""}">
        ${
          models.length > 0
            ? html`
          <div class="tooltip">
            <div class="tooltip-title">可用模型</div>
            ${models.map((m) => html`<div class="tooltip-model">${m.name}</div>`)}
          </div>`
            : ""
        }

        <div class="logo" style="background:${brand.color}">${brand.label}</div>
        <div class="name">${name}</div>
        <div class="status ${connected ? "online" : ""}">
          ${connected ? "● 已连接" : "未连接"}
        </div>

        ${
          connected
            ? html`<button class="btn btn-disconnect" ?disabled=${loading} @click=${this._handleDisconnect}>
              ${
                loading
                  ? html`
                      <span class="spinner"></span>
                    `
                  : ""
              }断开</button>`
            : html`<button class="btn btn-connect" ?disabled=${loading} @click=${this._handleConnect}>
              ${
                loading
                  ? html`
                      <span class="spinner"></span>
                    `
                  : ""
              }连接</button>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "platform-card": PlatformCard;
  }
}
