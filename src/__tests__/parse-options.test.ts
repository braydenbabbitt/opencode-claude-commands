import { describe, expect, test } from "bun:test";
import { parseOptions } from "../parse-options.js";

describe("parseOptions", () => {
  test("returns defaults when no options provided", () => {
    const config = parseOptions();
    expect(config).toEqual({
      prefix: "",
      includeUserLevel: true,
      includeSkills: true,
      defaultAgent: "build",
      modelMap: undefined,
      compactCommands: true,
    });
  });

  test("returns defaults when undefined is passed", () => {
    const config = parseOptions(undefined);
    expect(config).toEqual({
      prefix: "",
      includeUserLevel: true,
      includeSkills: true,
      defaultAgent: "build",
      modelMap: undefined,
      compactCommands: true,
    });
  });

  test("returns defaults when empty object is passed", () => {
    const config = parseOptions({});
    expect(config).toEqual({
      prefix: "",
      includeUserLevel: true,
      includeSkills: true,
      defaultAgent: "build",
      modelMap: undefined,
      compactCommands: true,
    });
  });

  test("accepts custom prefix", () => {
    const config = parseOptions({ prefix: "cc-" });
    expect(config.prefix).toBe("cc-");
  });

  test("ignores non-string prefix", () => {
    const config = parseOptions({ prefix: 123 as unknown as string });
    expect(config.prefix).toBe("");
  });

  test("accepts includeUserLevel false", () => {
    const config = parseOptions({ includeUserLevel: false });
    expect(config.includeUserLevel).toBe(false);
  });

  test("ignores non-boolean includeUserLevel", () => {
    const config = parseOptions({
      includeUserLevel: "yes" as unknown as boolean,
    });
    expect(config.includeUserLevel).toBe(true);
  });

  test("accepts includeSkills false", () => {
    const config = parseOptions({ includeSkills: false });
    expect(config.includeSkills).toBe(false);
  });

  test("accepts custom defaultAgent", () => {
    const config = parseOptions({ defaultAgent: "code" });
    expect(config.defaultAgent).toBe("code");
  });

  test("ignores non-string defaultAgent", () => {
    const config = parseOptions({ defaultAgent: 42 as unknown as string });
    expect(config.defaultAgent).toBe("build");
  });

  test("accepts modelMap object", () => {
    const modelMap = { sonnet: "anthropic/claude-sonnet-4-5" };
    const config = parseOptions({ modelMap });
    expect(config.modelMap).toEqual(modelMap);
  });

  test("ignores array modelMap", () => {
    const config = parseOptions({
      modelMap: ["not", "valid"] as unknown as Record<string, string>,
    });
    expect(config.modelMap).toBeUndefined();
  });

  test("ignores non-object modelMap", () => {
    const config = parseOptions({
      modelMap: "invalid" as unknown as Record<string, string>,
    });
    expect(config.modelMap).toBeUndefined();
  });

  test("accepts compactCommands false", () => {
    const config = parseOptions({ compactCommands: false });
    expect(config.compactCommands).toBe(false);
  });

  test("ignores non-boolean compactCommands", () => {
    const config = parseOptions({
      compactCommands: "yes" as unknown as boolean,
    });
    expect(config.compactCommands).toBe(true);
  });

  test("accepts all options at once", () => {
    const config = parseOptions({
      prefix: "my-",
      includeUserLevel: false,
      includeSkills: false,
      defaultAgent: "code",
      modelMap: { opus: "anthropic/claude-opus-4-5" },
      compactCommands: false,
    });
    expect(config).toEqual({
      prefix: "my-",
      includeUserLevel: false,
      includeSkills: false,
      defaultAgent: "code",
      modelMap: { opus: "anthropic/claude-opus-4-5" },
      compactCommands: false,
    });
  });
});
