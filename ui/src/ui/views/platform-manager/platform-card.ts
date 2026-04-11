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
      background: #1a1a30;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      cursor: default;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        opacity 0.2s ease,
        border-color 0.2s ease;
      opacity: 0.65;
      position: relative;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      opacity: 1;
    }

    .card.connected {
      border-color: rgba(34, 197, 94, 0.3);
      opacity: 1;
    }

    .card.connected:hover {
      border-color: rgba(34, 197, 94, 0.5);
    }

    .icon {
      font-size: 28px;
      margin-bottom: 8px;
      line-height: 1;
    }

    .name {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
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
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
    }

    .btn-connect:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.25);
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
      background: #2a2a4a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 11px;
      color: #ccc;
      white-space: nowrap;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .card:hover .tooltip {
      display: block;
    }

    .tooltip-title {
      color: #fff;
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .tooltip-model {
      color: #aaa;
      font-size: 10px;
      line-height: 1.5;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(129, 140, 248, 0.3);
      border-top-color: #818cf8;
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
