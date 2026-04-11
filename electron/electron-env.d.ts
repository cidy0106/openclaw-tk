/// <reference types="electron" />

interface PlatformInfo {
  id: string;
  name: string;
  icon?: string;
  connected: boolean;
}

interface PlatformStatus {
  connected: boolean;
  error?: string;
}

type GatewayStatus = "starting" | "running" | "stopped" | "error";

interface FreeclawAPI {
  platform: {
    list: () => Promise<PlatformInfo[]>;
    login: (platformId: string) => Promise<{ ok: boolean; error?: string }>;
    logout: (platformId: string) => Promise<void>;
    status: () => Promise<Record<string, PlatformStatus>>;
    onStatusChange: (cb: (status: Record<string, PlatformStatus>) => void) => () => void;
  };
  gateway: {
    getPort: () => Promise<number>;
    restart: () => Promise<void>;
    status: () => Promise<GatewayStatus>;
  };
  app: {
    getVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    freeclaw: FreeclawAPI;
  }
}
