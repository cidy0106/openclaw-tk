---
summary: "Use MiniMax M3 and M2.7 in OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup or endpoint guidance
title: "MiniMax"
---

# MiniMax

OpenClaw includes a bundled MiniMax provider for API-key and Token Plan OAuth setup.
MiniMax M3 is the default model, while MiniMax M2.7 remains available for existing
text-only workflows.

Official references:

- [Model invocation](https://platform.minimax.io/docs/guides/text-generation)
- [Pay-as-you-go pricing](https://platform.minimax.io/docs/guides/pricing-paygo)

## Model catalog

| Model ID                 |                          Context window | OpenClaw input declaration | Thinking behavior                  |
| ------------------------ | --------------------------------------: | -------------------------- | ---------------------------------- |
| `MiniMax-M3`             | 1,000,000 total input and output tokens | Text and image             | Supports `adaptive` and `disabled` |
| `MiniMax-M2.7`           |   204,800 total input and output tokens | Text                       | Always on                          |
| `MiniMax-M2.7-highspeed` |   204,800 total input and output tokens | Text                       | Always on                          |

The upstream M3 APIs also accept video content blocks. OpenClaw's current model input
declaration represents text and image inputs, which are the modalities the agent runtime
can pass directly to this provider.

M3 thinking defaults depend on the selected protocol. The Anthropic-compatible API leaves
thinking off when the parameter is omitted; the OpenAI-compatible API leaves it on. M2.7
thinking cannot be disabled. OpenClaw normalizes enabled M3 thinking requests to
`{"type":"adaptive"}` for the Anthropic-compatible API.

## Configure with the wizard

For a global API key:

```bash
openclaw setup --wizard --auth-choice minimax-global-api
```

For a CN API key:

```bash
openclaw setup --wizard --auth-choice minimax-cn-api
```

For Token Plan OAuth:

```bash
openclaw models auth login --provider minimax-portal --set-default
```

The wizard uses MiniMax M3 and the Anthropic-compatible endpoint for the selected region.

## Manual API-key configuration

The global Anthropic-compatible configuration is:

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M3" },
      models: {
        "minimax/MiniMax-M3": { alias: "minimax" },
        "minimax/MiniMax-M2.7": { alias: "minimax-m2.7" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        authHeader: true,
        models: [
          {
            id: "MiniMax-M3",
            name: "MiniMax M3",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
            contextWindow: 1000000,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

## Region and protocol endpoints

OpenClaw stores one `baseUrl` and one `api` value per provider entry. Use one matching pair
from this table; no additional endpoint fields are required.

| Region | Protocol             | `baseUrl`                            | `api`                |
| ------ | -------------------- | ------------------------------------ | -------------------- |
| Global | Anthropic-compatible | `https://api.minimax.io/anthropic`   | `anthropic-messages` |
| Global | OpenAI-compatible    | `https://api.minimax.io/v1`          | `openai-completions` |
| CN     | Anthropic-compatible | `https://api.minimaxi.com/anthropic` | `anthropic-messages` |
| CN     | OpenAI-compatible    | `https://api.minimaxi.com/v1`        | `openai-completions` |

For an OpenAI-compatible CN override:

```json5
{
  models: {
    providers: {
      minimax: {
        baseUrl: "https://api.minimaxi.com/v1",
        api: "openai-completions",
      },
    },
  },
}
```

Keep Anthropic Base URLs ending in `/anthropic`. The Anthropic SDK appends
`/v1/messages`; adding `/v1` to the configured Base URL would duplicate that path. The
OpenAI client appends `/chat/completions` to the `/v1` Base URL.

## Pricing

Catalog costs are USD per million tokens. M3 has input-length and service-tier pricing,
so preserve all applicable tiers when estimating an actual request:

| Model and service tier | Input length                | Input | Output | Cache read | Cache write |
| ---------------------- | --------------------------- | ----: | -----: | ---------: | ----------: |
| M3 standard            | Up to 512K input tokens     | $0.30 |  $1.20 |      $0.06 |  Not listed |
| M3 standard            | More than 512K input tokens | $0.60 |  $2.40 |      $0.12 |  Not listed |
| M3 priority            | Up to 512K input tokens     | $0.45 |  $1.80 |      $0.09 |  Not listed |
| M3 priority            | More than 512K input tokens | $0.90 |  $3.60 |      $0.18 |  Not listed |
| M2.7 standard          | Up to its context limit     | $0.30 |  $1.20 |      $0.06 |      $0.375 |

The flat M3 catalog cost uses the default standard tier for requests up to 512K input
tokens. Its `cacheWrite` value is `0` because the official M3 pricing table does not list a
prompt-cache write charge. Requests above 512K input tokens or requests using
`service_tier: "priority"` are billed at the corresponding table row.

## Troubleshooting

### Unknown model: minimax/MiniMax-M3

Confirm that the provider is configured through the wizard, JSON, or a MiniMax auth
profile. Model IDs are case-sensitive:

- `minimax/MiniMax-M3`
- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Then run:

```bash
openclaw models list
```
