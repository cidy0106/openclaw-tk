import type Electron from "electron";

export interface PlatformModel {
  id: string;
  name: string;
}

export interface PlatformDef {
  id: string;
  name: string;
  icon: string;
  loginUrl: string;
  cookieDomains: string[];
  detectLogin: (cookies: Electron.Cookie[]) => boolean;
  extractKey: (cookies: Electron.Cookie[], userAgent: string) => Record<string, string>;
  models: PlatformModel[];
  providerId: string;
}

function hasCookie(cookies: Electron.Cookie[], nameOrPrefix: string, prefix = false): boolean {
  return cookies.some((c) => (prefix ? c.name.startsWith(nameOrPrefix) : c.name === nameOrPrefix));
}

function cookieVal(cookies: Electron.Cookie[], name: string): string {
  return cookies.find((c) => c.name === name)?.value ?? "";
}

function allCookiesAsRecord(cookies: Electron.Cookie[], userAgent: string): Record<string, string> {
  const rec: Record<string, string> = { userAgent };
  for (const c of cookies) {
    rec[c.name] = c.value;
  }
  return rec;
}

export const PLATFORMS: PlatformDef[] = [
  {
    id: "deepseek-web",
    name: "DeepSeek",
    icon: "🐋",
    loginUrl: "https://chat.deepseek.com/",
    cookieDomains: [".deepseek.com"],
    detectLogin: (cookies) =>
      hasCookie(cookies, "ds_session") || hasCookie(cookies, "ds_session_id"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    providerId: "deepseek-web",
  },
  {
    id: "qwen-web",
    name: "Qwen (International)",
    icon: "🌐",
    loginUrl: "https://chat.qwen.ai/",
    cookieDomains: [".qwen.ai"],
    detectLogin: (cookies) => {
      let count = 0;
      for (const c of cookies) {
        if (["session", "token", "auth"].some((k) => c.name.toLowerCase().includes(k))) {
          count++;
        }
      }
      return count >= 2;
    },
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-plus", name: "Qwen Plus" },
    ],
    providerId: "qwen-web",
  },
  {
    id: "qwen-cn-web",
    name: "通义千问",
    icon: "🇨🇳",
    loginUrl: "https://tongyi.aliyun.com/qianwen/",
    cookieDomains: [".aliyun.com", ".tongyi.aliyun.com"],
    detectLogin: (cookies) =>
      cookies.some((c) => c.name.startsWith("login_") || c.name === "session"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-turbo", name: "Qwen Turbo" },
    ],
    providerId: "qwen-cn-web",
  },
  {
    id: "glm-web",
    name: "ChatGLM",
    icon: "🧊",
    loginUrl: "https://chatglm.cn/",
    cookieDomains: [".chatglm.cn"],
    detectLogin: (cookies) => hasCookie(cookies, "chatglm_refresh_token"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "glm-4", name: "GLM-4" },
      { id: "glm-4-flash", name: "GLM-4 Flash" },
    ],
    providerId: "glm-web",
  },
  {
    id: "glm-intl-web",
    name: "ChatGLM (International)",
    icon: "🌍",
    loginUrl: "https://chatglm.ai/",
    cookieDomains: [".chatglm.ai"],
    detectLogin: (cookies) =>
      cookies.some(
        (c) => c.name.toLowerCase().includes("token") || c.name.toLowerCase().includes("session"),
      ),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [{ id: "glm-4", name: "GLM-4" }],
    providerId: "glm-intl-web",
  },
  {
    id: "kimi-web",
    name: "Kimi",
    icon: "🌙",
    loginUrl: "https://kimi.moonshot.cn/",
    cookieDomains: [".moonshot.cn", ".kimi.moonshot.cn"],
    detectLogin: (cookies) =>
      hasCookie(cookies, "refresh_token") || hasCookie(cookies, "access_token"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "kimi", name: "Kimi" },
      { id: "kimi-k1.5", name: "Kimi K1.5" },
    ],
    providerId: "kimi-web",
  },
  {
    id: "claude-web",
    name: "Claude",
    icon: "🟤",
    loginUrl: "https://claude.ai/",
    cookieDomains: [".claude.ai"],
    detectLogin: (cookies) => hasCookie(cookies, "sessionKey"),
    extractKey: (cookies, ua) => ({
      sessionKey: cookieVal(cookies, "sessionKey"),
      userAgent: ua,
    }),
    models: [
      { id: "claude-sonnet", name: "Claude Sonnet" },
      { id: "claude-opus", name: "Claude Opus" },
    ],
    providerId: "claude-web",
  },
  {
    id: "chatgpt-web",
    name: "ChatGPT",
    icon: "🤖",
    loginUrl: "https://chat.openai.com/",
    cookieDomains: [".openai.com", ".chat.openai.com"],
    detectLogin: (cookies) => hasCookie(cookies, "__Secure-next-auth", true),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4", name: "GPT-4" },
    ],
    providerId: "chatgpt-web",
  },
  {
    id: "gemini-web",
    name: "Gemini",
    icon: "💎",
    loginUrl: "https://gemini.google.com/",
    cookieDomains: [".google.com"],
    detectLogin: (cookies) => hasCookie(cookies, "SID") || hasCookie(cookies, "__Secure-1PSID"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "gemini-pro", name: "Gemini Pro" },
      { id: "gemini-ultra", name: "Gemini Ultra" },
    ],
    providerId: "gemini-web",
  },
  {
    id: "grok-web",
    name: "Grok",
    icon: "🚀",
    loginUrl: "https://grok.com/",
    cookieDomains: [".grok.com", ".x.com"],
    detectLogin: (cookies) => hasCookie(cookies, "ct0") || hasCookie(cookies, "auth_token"),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "grok-2", name: "Grok 2" },
      { id: "grok-3", name: "Grok 3" },
    ],
    providerId: "grok-web",
  },
  {
    id: "doubao-web",
    name: "豆包",
    icon: "🫘",
    loginUrl: "https://www.doubao.com/chat/",
    cookieDomains: [".doubao.com"],
    detectLogin: (cookies) =>
      cookies.some(
        (c) => c.name.toLowerCase().includes("session") || c.name.toLowerCase().includes("token"),
      ),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [{ id: "doubao", name: "Doubao" }],
    providerId: "doubao-web",
  },
  {
    id: "xiaomimo-web",
    name: "小爱同学",
    icon: "🤳",
    loginUrl: "https://chat.ai.xiaomi.com/",
    cookieDomains: [".xiaomi.com", ".ai.xiaomi.com"],
    detectLogin: (cookies) =>
      cookies.some(
        (c) => c.name.toLowerCase().includes("token") || c.name.toLowerCase().includes("session"),
      ),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [{ id: "xiaomimo", name: "XiaoMi MO" }],
    providerId: "xiaomimo-web",
  },
  {
    id: "perplexity-web",
    name: "Perplexity",
    icon: "🔍",
    loginUrl: "https://www.perplexity.ai/",
    cookieDomains: [".perplexity.ai"],
    detectLogin: (cookies) =>
      cookies.some((c) => c.name.toLowerCase().includes("session") || c.name.startsWith("pplx")),
    extractKey: (cookies, ua) => allCookiesAsRecord(cookies, ua),
    models: [
      { id: "perplexity-default", name: "Perplexity" },
      { id: "perplexity-pro", name: "Perplexity Pro" },
    ],
    providerId: "perplexity-web",
  },
];

export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
