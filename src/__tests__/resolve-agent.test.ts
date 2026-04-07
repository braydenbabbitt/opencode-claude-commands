import { describe, expect, test } from "bun:test";
import { resolveAgent } from "../resolve-agent.js";

describe("resolveAgent", () => {
  const validAgents = new Set(["build", "code", "plan"]);

  test("returns undefined when no agent is requested", () => {
    expect(resolveAgent(undefined, validAgents, "build")).toBeUndefined();
  });

  test("returns the requested agent when it is valid", () => {
    expect(resolveAgent("code", validAgents, "build")).toBe("code");
  });

  test("returns the requested agent when it matches the default", () => {
    expect(resolveAgent("build", validAgents, "build")).toBe("build");
  });

  test("falls back to defaultAgent when the requested agent is not valid", () => {
    expect(resolveAgent("unknown-agent", validAgents, "build")).toBe("build");
  });

  test("falls back to defaultAgent with empty valid set", () => {
    expect(resolveAgent("code", new Set(), "build")).toBe("build");
  });

  test("returns the requested agent from a large set", () => {
    const large = new Set(["a", "b", "c", "d", "plan"]);
    expect(resolveAgent("plan", large, "build")).toBe("plan");
  });
});
