import { ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import http from "node:http";
import net from "node:net";
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
  private _child: ChildProcess | null = null;
  private _healthTimer: ReturnType<typeof setInterval> | null = null;

  // ── Public getters ───────────────────────────────────────────────────

  get status(): GatewayStatus {
    return this._status;
  }

  get port(): number {
    return this._port;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async start(): Promise<number> {
    if (this._status === "running" || this._status === "starting") {
      return this._port;
    }

    this.setStatus("starting");

    this._port = await findFreePort();

    // __dirname is the built output dir (dist/electron). Go up two levels to project root.
    const projectRoot = path.resolve(__dirname, "..", "..");
    const entryPath = path.resolve(projectRoot, "dist", "entry.js");

    const child = spawn("node", [entryPath, "gateway", "--port", String(this._port)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      env: {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(this._port),
        OPENCLAW_CONTROL_UI_ENABLED: "false",
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
