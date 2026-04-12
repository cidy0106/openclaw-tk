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

/** Map platform IDs to real brand SVG logos (inline data URIs for portability). */
const PLATFORM_LOGOS: Record<string, string> = {
  "deepseek-web": `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#4D6BFE"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="system-ui">DS</text></svg>`,
  "qwen-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#6236FF"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="system-ui">Qw</text></svg>`,
  "qwen-cn-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#6236FF"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">通义</text></svg>`,
  "glm-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3D5AFE"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">智谱</text></svg>`,
  "glm-intl-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3D5AFE"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">GLM</text></svg>`,
  "kimi-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#000"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">Kimi</text></svg>`,
  "claude-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#D97706"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="system-ui">Cl</text></svg>`,
  "chatgpt-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#10A37F"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">GPT</text></svg>`,
  "gemini-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#4285F4"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="700" font-family="system-ui">Gem</text></svg>`,
  "grok-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1DA1F2"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">Grok</text></svg>`,
  "doubao-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#00D1B2"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">豆包</text></svg>`,
  "xiaomimo-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#FF6700"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="system-ui">Mi</text></svg>`,
  "perplexity-web": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#20808D"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="700" font-family="system-ui">PPX</text></svg>`,
};

function logoDataUri(id: string): string {
  const svg = PLATFORM_LOGOS[id];
  if (!svg) {
    return "";
  }
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
      padding: 16px;
      text-align: center;
      cursor: default;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        opacity 0.2s ease,
        border-color 0.2s ease;
      opacity: 0.6;
      position: relative;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      opacity: 1;
    }

    .card.connected {
      border-color: rgba(34, 197, 94, 0.4);
      opacity: 1;
    }

    .card.connected:hover {
      border-color: rgba(34, 197, 94, 0.6);
    }

    .logo {
      width: 40px;
      height: 40px;
      margin: 0 auto 8px;
      border-radius: 10px;
      overflow: hidden;
    }

    .logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .emoji-icon {
      font-size: 32px;
      margin-bottom: 8px;
      line-height: 1;
    }

    .name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-strong, var(--text, #1a1a1a));
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status {
      font-size: 11px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .status.online {
      color: #22c55e;
    }
    .status.offline {
      color: var(--text-soft, #999);
    }

    .model-count {
      font-size: 10px;
      color: var(--text-soft, #888);
      margin-bottom: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 6px 0;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background 0.2s ease,
        opacity 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-connect {
      background: var(--accent-subtle, rgba(231, 76, 60, 0.08));
      color: var(--accent, #e74c3c);
    }

    .btn-connect:hover:not(:disabled) {
      background: rgba(231, 76, 60, 0.15);
    }

    .btn-disconnect {
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
    }

    .btn-disconnect:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.15);
    }

    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
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
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .card:hover .tooltip {
      display: block;
    }
    .tooltip-title {
      color: var(--text-strong, #333);
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .tooltip-model {
      color: var(--text-soft, #888);
      font-size: 10px;
      line-height: 1.5;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(231, 76, 60, 0.3);
      border-top-color: var(--accent, #e74c3c);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 4px;
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
    const logo = logoDataUri(id);

    return html`
      <div class="card ${connected ? "connected" : ""}">
        ${
          models.length > 0
            ? html`
          <div class="tooltip">
            <div class="tooltip-title">可用模型</div>
            ${models.map((m) => html`<div class="tooltip-model">${m.name}</div>`)}
          </div>
        `
            : ""
        }
        ${
          logo
            ? html`<div class="logo"><img src="${logo}" alt="${name}" /></div>`
            : html`<div class="emoji-icon">${this.data.icon}</div>`
        }
        <div class="name">${name}</div>
        <div class="status ${connected ? "online" : "offline"}">
          ${connected ? "● 已连接" : "○ 未连接"}
        </div>
        ${connected ? html`<div class="model-count">${models.length} 个模型</div>` : ""}
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
