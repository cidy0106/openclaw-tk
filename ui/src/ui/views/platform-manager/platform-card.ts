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

@customElement("platform-card")
export class PlatformCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--oc-surface, #fff);
      border: 1px solid var(--oc-border, #e8e8e8);
      border-radius: 12px;
      padding: 16px;
      cursor: default;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        opacity 0.2s ease,
        border-color 0.2s ease;
      opacity: 0.7;
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

    .icon {
      font-size: 28px;
      margin-bottom: 8px;
      line-height: 1;
    }

    .name {
      font-size: 13px;
      font-weight: 600;
      color: var(--oc-text, #1a1a1a);
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
      gap: 4px;
    }

    .status.online {
      color: #22c55e;
    }

    .status.offline {
      color: #888;
    }

    .model-count {
      font-size: 10px;
      color: #888;
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
      background: rgba(231, 76, 60, 0.08);
      color: #e74c3c;
    }

    .btn-connect:hover:not(:disabled) {
      background: rgba(231, 76, 60, 0.15);
    }

    .btn-disconnect {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
    }

    .btn-disconnect:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
    }

    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--oc-surface, #fff);
      border: 1px solid var(--oc-border, #e5e5e5);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 11px;
      color: var(--oc-text-secondary, #666);
      white-space: nowrap;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .card:hover .tooltip {
      display: block;
    }

    .tooltip-title {
      color: var(--oc-text, #333);
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .tooltip-model {
      color: var(--oc-text-secondary, #888);
      font-size: 10px;
      line-height: 1.5;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(231, 76, 60, 0.3);
      border-top-color: #e74c3c;
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
  data: PlatformCardData = {
    id: "",
    name: "",
    icon: "",
    connected: false,
    models: [],
  };

  private _handleConnect = () => {
    this.dispatchEvent(
      new CustomEvent("connect", {
        detail: this.data.id,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handleDisconnect = () => {
    this.dispatchEvent(
      new CustomEvent("disconnect", {
        detail: this.data.id,
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    const { name, icon, connected, models, loading } = this.data;

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
        <div class="icon">${icon}</div>
        <div class="name">${name}</div>
        <div class="status ${connected ? "online" : "offline"}">
          ${connected ? "● 已连接" : "○ 未连接"}
        </div>
        ${connected ? html`<div class="model-count">${models.length} 个模型</div>` : ""}
        ${
          connected
            ? html`
              <button
                class="btn btn-disconnect"
                ?disabled=${loading}
                @click=${this._handleDisconnect}
              >
                ${
                  loading
                    ? html`
                        <span class="spinner"></span>
                      `
                    : ""
                }断开
              </button>
            `
            : html`
              <button
                class="btn btn-connect"
                ?disabled=${loading}
                @click=${this._handleConnect}
              >
                ${
                  loading
                    ? html`
                        <span class="spinner"></span>
                      `
                    : ""
                }连接
              </button>
            `
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
