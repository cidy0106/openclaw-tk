import { ChildProcess, spawn } from "node:child_process";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
export type GatewayStatus = "stopped" | "starting" | "running" | "error";

export interface GatewayProcessEvents {
  status: [status: GatewayStatus];
  log: [stream: "stdout" | "stderr", data: string];
}

/**
 * Manages the openclaw gateway as a child process.
 * Provides start/stop/restart, health-check polling, and log forwarding.
 */
export class GatewayProcess extends EventEmitter {
  private _status: GatewayStatus = "stopped";
  private _port = 0;
  private _token = "";
  private _child: ChildProcess | null = null;
  private _healthTimer: ReturnType<typeof setInterval> | null = null;

  // Project root — where gateway code lives.
  // In packaged mode, __dirname is inside app.asar; gateway code is in app.asar.unpacked.
  private readonly _projectRoot = path
    .resolve(__dirname, "..", "..")
    .replace("app.asar", "app.asar.unpacked");

  // State dir — must be writable, so use ~/.freeclaw/ for packaged apps,
  // or the project's .openclaw-upstream-state/ for dev mode.
  private readonly _stateDir = __dirname.includes("app.asar")
    ? path.join(os.homedir(), ".freeclaw", "state")
    : path.resolve(this._projectRoot, ".openclaw-upstream-state");

  // ── Public getters ───────────────────────────────────────────────────

  get status(): GatewayStatus {
    return this._status;
  }

  get port(): number {
    return this._port;
  }

  get token(): string {
    return this._token;
  }

  get stateDir(): string {
    return this._stateDir;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async start(): Promise<number> {
    if (this._status === "running" || this._status === "starting") {
      return this._port;
    }

    this.setStatus("starting");

    this._port = await findFreePort();

    const configPath = path.resolve(this._stateDir, "openclaw.json");
    // Use the single-file gateway bundle if available (much smaller), fallback to entry.js
    const bundlePath = path.resolve(this._projectRoot, "dist", "gateway-bundle.mjs");
    const entryPath = fs.existsSync(bundlePath)
      ? bundlePath
      : path.resolve(this._projectRoot, "dist", "entry.js");

    // Ensure state directory exists (new user won't have one yet)
    if (!fs.existsSync(this._stateDir)) {
      fs.mkdirSync(this._stateDir, { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
      // Minimal config for first-time users
      const initialConfig = {
        gateway: { mode: "local" },
        ui: { assistant: { name: "FreeClaw", avatar: "" } },
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2) + "\n", "utf-8");
    }
    // Ensure auth-profiles directory exists
    const authDir = path.resolve(this._stateDir, "agents", "main", "agent");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Read the gateway token from the project config, or generate one.
    this._token = readGatewayTokenFromConfig(configPath) || crypto.randomBytes(16).toString("hex");

    const child = spawn("node", [entryPath, "gateway", "--port", String(this._port)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      env: {
        ...process.env,
        OPENCLAW_CONFIG_PATH: configPath,
        OPENCLAW_STATE_DIR: this._stateDir,
        OPENCLAW_GATEWAY_PORT: String(this._port),
        OPENCLAW_GATEWAY_TOKEN: this._token,
      },
    });

    this._child = child;

    child.stdout?.on("data", (buf: Buffer) => {
      const msg = buf.toString();
      this.emit("log", "stdout", msg);
    });

    child.stderr?.on("data", (buf: Buffer) => {
      const msg = buf.toString();
      this.emit("log", "stderr", msg);
    });

    child.on("exit", (code, signal) => {
      this.clearHealthTimer();
      this._child = null;
      if (this._status !== "stopped") {
        // Unexpected exit
        this.setStatus("error");
        this.emit("log", "stderr", `Gateway exited with code=${code} signal=${signal}`);
      }
    });

    child.on("error", (err) => {
      this.clearHealthTimer();
      this._child = null;
      this.setStatus("error");
      this.emit("log", "stderr", `Gateway spawn error: ${err.message}`);
    });

    // Wait for the health-check to pass (or timeout).
    await this.waitForHealthy();

    return this._port;
  }

  async stop(): Promise<void> {
    this.clearHealthTimer();

    const child = this._child;
    if (!child || child.exitCode !== null) {
      this._child = null;
      this.setStatus("stopped");
      return;
    }

    this.setStatus("stopped");

    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // already dead
        }
      }, 5_000);

      child.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });

      try {
        child.kill("SIGTERM");
      } catch {
        clearTimeout(killTimer);
        resolve();
      }
    });

    this._child = null;
  }

  async restart(): Promise<number> {
    await this.stop();
    return this.start();
  }

  /**
   * Send SIGUSR1 to the gateway to trigger a config/credential reload.
   * This is used after a platform login or logout so the gateway
   * picks up the new auth-profiles.json without a full restart.
   */
  reload(): void {
    if (this._child && this._child.exitCode === null) {
      try {
        this._child.kill("SIGUSR1");
        this.emit("log", "stdout", "Sent SIGUSR1 to gateway for credential reload");
      } catch {
        // Process may have already exited
      }
    }
  }

  // ── Internals ────────────────────────────────────────────────────────

  private setStatus(s: GatewayStatus): void {
    if (this._status !== s) {
      this._status = s;
      this.emit("status", s);
    }
  }

  private clearHealthTimer(): void {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
  }

  /**
   * Polls /healthz every 500 ms for up to 30 s.
   */
  private waitForHealthy(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 30_000;

      const check = (): void => {
        if (Date.now() > deadline) {
          this.clearHealthTimer();
          this.setStatus("error");
          reject(new Error("Gateway health-check timed out after 30 s"));
          return;
        }

        const req = http.get(`http://127.0.0.1:${this._port}/healthz`, (res) => {
          if (res.statusCode === 200) {
            this.clearHealthTimer();
            this.setStatus("running");
            res.resume(); // drain
            resolve();
          } else {
            res.resume();
          }
        });

        req.on("error", () => {
          // Connection refused — gateway not ready yet, will retry on next tick
        });

        req.setTimeout(2_000, () => req.destroy());
      };

      // First check immediately, then every 500 ms.
      check();
      this._healthTimer = setInterval(check, 500);
    });
  }
}

/**
 * Finds an available TCP port by binding to port 0.
 */
/**
 * Try to read the gateway auth token from the given config file.
 * Falls back to standard locations if not found.
 */
function readGatewayTokenFromConfig(primaryConfig?: string): string | undefined {
  const candidates = [
    primaryConfig,
    process.env.OPENCLAW_CONFIG_PATH,
    path.join(os.homedir(), ".openclaw", "openclaw.json"),
  ].filter(Boolean) as string[];

  for (const cfgPath of candidates) {
    try {
      if (!fs.existsSync(cfgPath)) {
        continue;
      }
      const raw = fs.readFileSync(cfgPath, "utf-8");
      // Simple regex extraction — avoid pulling in a JSON5 parser just for this
      const match = raw.match(/"token"\s*:\s*"([a-f0-9]+)"/);
      if (match?.[1]) {
        return match[1];
      }
    } catch {
      // Ignore read errors
    }
  }
  return undefined;
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("Could not determine port")));
      }
    });
    srv.on("error", reject);
  });
}
