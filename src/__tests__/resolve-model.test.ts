import { describe, expect, test } from "bun:test";
import { resolveModel } from "../resolve-model.js";

describe("resolveModel", () => {
  test("returns undefined for undefined input", () => {
    expect(resolveModel(undefined)).toBeUndefined();
  });

  describe("known model families", () => {
    test("resolves 'opus' to the latest opus model", () => {
      const result = resolveModel("opus");
      expect(result).toBe("anthropic/claude-opus-4-6");
    });

    test("resolves 'sonnet' to the latest sonnet model", () => {
      const result = resolveModel("sonnet");
      expect(result).toBe("anthropic/claude-sonnet-4-6");
    });

    test("resolves 'haiku' to the latest haiku model", () => {
      const result = resolveModel("haiku");
      expect(result).toBe("anthropic/claude-haiku-4-5");
    });

    test("is case-insensitive", () => {
      expect(resolveModel("OPUS")).toBe("anthropic/claude-opus-4-6");
      expect(resolveModel("Sonnet")).toBe("anthropic/claude-sonnet-4-6");
      expect(resolveModel("HAIKU")).toBe("anthropic/claude-haiku-4-5");
    });

    test("trims whitespace", () => {
      expect(resolveModel("  opus  ")).toBe("anthropic/claude-opus-4-6");
    });
  });

  describe("user model map overrides", () => {
    test("uses user modelMap when present", () => {
      const modelMap = { sonnet: "my-provider/custom-sonnet" };
      expect(resolveModel("sonnet", modelMap)).toBe(
        "my-provider/custom-sonnet",
      );
    });

    test("user modelMap takes priority over known families", () => {
      const modelMap = { opus: "custom/opus-model" };
      expect(resolveModel("opus", modelMap)).toBe("custom/opus-model");
    });

    test("falls through to families when key not in modelMap", () => {
      const modelMap = { custom: "my-provider/custom" };
      expect(resolveModel("sonnet", modelMap)).toBe(
        "anthropic/claude-sonnet-4-6",
      );
    });
  });

  describe("full model IDs (containing /)", () => {
    test("passes through a full model ID as-is", () => {
      expect(resolveModel("openai/gpt-4")).toBe("openai/gpt-4");
    });

    test("passes through anthropic full IDs", () => {
      expect(resolveModel("anthropic/claude-sonnet-4-5")).toBe(
        "anthropic/claude-sonnet-4-5",
      );
    });
  });

  describe("fuzzy matching", () => {
    test("matches substring of a family name", () => {
      // "claude-opus" contains "opus"
      expect(resolveModel("claude-opus")).toBe("anthropic/claude-opus-4-6");
    });

    test("matches sonnet substring", () => {
      expect(resolveModel("claude-sonnet")).toBe("anthropic/claude-sonnet-4-6");
    });
  });

  describe("unresolvable models", () => {
    test("returns undefined for unknown shorthand", () => {
      expect(resolveModel("gpt-4")).toBeUndefined();
    });

    test("returns undefined for random string", () => {
      expect(resolveModel("some-unknown-model")).toBeUndefined();
    });
  });
});
