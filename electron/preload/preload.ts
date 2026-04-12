import { contextBridge, ipcRenderer } from "electron";

export interface PlatformInfo {
  id: string;
  name: string;
  icon?: string;
  connected: boolean;
}

export interface PlatformStatus {
  connected: boolean;
  error?: string;
}

export type GatewayStatus = "starting" | "running" | "stopped" | "error";

export interface FreeclawAPI {
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
    needsOnboarding: () => Promise<boolean>;
  };
}

const api: FreeclawAPI = {
  platform: {
    list: () => ipcRenderer.invoke("freeclaw:platform:list"),
    login: (platformId: string) => ipcRenderer.invoke("freeclaw:platform:login", platformId),
    logout: (platformId: string) => ipcRenderer.invoke("freeclaw:platform:logout", platformId),
    status: () => ipcRenderer.invoke("freeclaw:platform:status"),
    onStatusChange: (cb: (status: Record<string, PlatformStatus>) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: Record<string, PlatformStatus>) =>
        cb(status);
      ipcRenderer.on("freeclaw:platform:statusChange", handler);
      return () => {
        ipcRenderer.removeListener("freeclaw:platform:statusChange", handler);
      };
    },
  },
  gateway: {
    getPort: () => ipcRenderer.invoke("freeclaw:gateway:getPort"),
    restart: () => ipcRenderer.invoke("freeclaw:gateway:restart"),
    status: () => ipcRenderer.invoke("freeclaw:gateway:status"),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("freeclaw:app:getVersion"),
    openExternal: (url: string) => ipcRenderer.invoke("freeclaw:app:openExternal", url),
    needsOnboarding: () => ipcRenderer.invoke("freeclaw:app:needsOnboarding"),
  },
};

contextBridge.exposeInMainWorld("freeclaw", api);
