---
summary: "Use MiniMax M3 in OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw's MiniMax provider defaults to **MiniMax M3**, the latest generation
reasoning model with a 512K-token context window and image input support.

Source: [MiniMax](https://www.minimax.io)

## Model overview

OpenClaw ships the following MiniMax hosted chat models:

- **`MiniMax-M3`** (default) — latest generation, 512K context, image input.
- **`MiniMax-M2.7`** — previous generation, 200K-token context, text input.
- **`MiniMax-M2.7-highspeed`** — faster M2.7 tier, 200K-token context, text input.

## Choose a setup

### MiniMax OAuth (Coding Plan) — recommended

**Best for:** quick setup with MiniMax Coding Plan via OAuth, no API key required.

Enable the bundled OAuth plugin and authenticate:

```bash
openclaw plugins enable minimax-portal-auth  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

You will be prompted to select an endpoint:

- **Global** - International users (`api.minimax.io`)
- **CN** - Users in China (`api.minimaxi.com`)

See [MiniMax OAuth plugin README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax-portal-auth) for details.

### MiniMax M3 (API key)

**Best for:** hosted MiniMax with Anthropic-compatible API.

Configure via CLI:

- Run `openclaw configure`
- Select **Model/auth**
- Choose **MiniMax M3**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M3" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M3",
            name: "MiniMax M3",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
            contextWindow: 512_000,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 200000,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

### MiniMax M3 as fallback (example)

**Best for:** keep your strongest latest-generation model as primary, fail over to MiniMax M3.
Example below uses Opus as a concrete primary; swap to your preferred latest-gen primary model.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M3": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M3"],
      },
    },
  },
}
```

### Optional: Local via LM Studio (manual)

**Best for:** local inference with LM Studio.
We have seen strong results with MiniMax on powerful hardware (e.g. a
desktop/server) using LM Studio's local server.

Configure manually via `openclaw.json`:

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m3-gs32" },
      models: { "lmstudio/minimax-m3-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m3-gs32",
            name: "MiniMax M3 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Configure via `openclaw configure`

Use the interactive config wizard to set MiniMax without editing JSON:

1. Run `openclaw configure`.
2. Select **Model/auth**.
3. Choose **MiniMax M3**.
4. Pick your default model when prompted.

## Configuration options

- `models.providers.minimax.baseUrl`: prefer `https://api.minimax.io/anthropic` (Anthropic-compatible); `https://api.minimax.io/v1` is optional for OpenAI-compatible payloads.
- `models.providers.minimax.api`: prefer `anthropic-messages`; `openai-completions` is optional for OpenAI-compatible payloads.
- `models.providers.minimax.apiKey`: MiniMax API key (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: define `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: alias models you want in the allowlist.
- `models.mode`: keep `merge` if you want to add MiniMax alongside built-ins.

## Notes

- Model refs are `minimax/<model>`.
- Recommended model IDs: `MiniMax-M3` (default), `MiniMax-M2.7`, and `MiniMax-M2.7-highspeed`.
- Coding Plan usage API: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requires a coding plan key).
- Update pricing values in `models.json` if you need exact cost tracking.
- Referral link for MiniMax Coding Plan (10% off): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- See [/concepts/model-providers](/concepts/model-providers) for provider rules.
- Use `openclaw models list` and `openclaw models set minimax/MiniMax-M3` to switch.

## Troubleshooting

### "Unknown model: minimax/MiniMax-M3"

This usually means the **MiniMax provider isn't configured** (no provider entry
and no MiniMax auth profile/env key found). A fix for this detection is in
**2026.1.12** (unreleased at the time of writing). Fix by:

- Upgrading to **2026.1.12** (or run from source `main`), then restarting the gateway.
- Running `openclaw configure` and selecting **MiniMax M3**, or
- Adding the `models.providers.minimax` block manually, or
- Setting `MINIMAX_API_KEY` (or a MiniMax auth profile) so the provider can be injected.

Make sure the model id is **case-sensitive**:

- `minimax/MiniMax-M3`
- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Then recheck with:

```bash
openclaw models list
```
