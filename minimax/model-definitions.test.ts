import { describe, expect, it } from "vitest";
import {
  buildMinimaxApiModelDefinition,
  buildMinimaxModelDefinition,
  DEFAULT_MINIMAX_CONTEXT_WINDOW,
  DEFAULT_MINIMAX_MAX_TOKENS,
  MINIMAX_API_COST,
  MINIMAX_HOSTED_MODEL_ID,
} from "./model-definitions.js";

describe("minimax model definitions", () => {
  it("uses M3 as default hosted model", () => {
    expect(MINIMAX_HOSTED_MODEL_ID).toBe("MiniMax-M3");
  });

  it("uses the upstream MiniMax M3 context and cost defaults", () => {
    expect(DEFAULT_MINIMAX_CONTEXT_WINDOW).toBe(1000000);
    expect(DEFAULT_MINIMAX_MAX_TOKENS).toBe(131072);
    expect(MINIMAX_API_COST).toEqual({
      input: 0.6,
      output: 2.4,
      cacheRead: 0.12,
    });
  });

  it("builds catalog model with name and reasoning from catalog", () => {
    const model = buildMinimaxModelDefinition({
      id: "MiniMax-M3",
      cost: MINIMAX_API_COST,
      contextWindow: DEFAULT_MINIMAX_CONTEXT_WINDOW,
      maxTokens: DEFAULT_MINIMAX_MAX_TOKENS,
    });
    expect(model).toMatchObject({
      id: "MiniMax-M3",
      name: "MiniMax M3",
      reasoning: true,
    });
  });

  it("builds API model definition with standard cost", () => {
    const model = buildMinimaxApiModelDefinition("MiniMax-M3");
    expect(model.cost).toEqual(MINIMAX_API_COST);
    expect(model.contextWindow).toBe(DEFAULT_MINIMAX_CONTEXT_WINDOW);
    expect(model.maxTokens).toBe(DEFAULT_MINIMAX_MAX_TOKENS);
  });

  it("falls back to generated name for unknown model id", () => {
    const model = buildMinimaxApiModelDefinition("MiniMax-Future");
    expect(model.name).toBe("MiniMax MiniMax-Future");
    expect(model.reasoning).toBe(false);
  });
});
