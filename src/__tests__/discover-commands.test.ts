import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { discoverCommands } from "../discover-commands.js";
import type { PluginConfig } from "../types.js";

const defaultConfig: PluginConfig = {
  prefix: "",
  includeUserLevel: false,
  includeSkills: true,
  defaultAgent: "build",
  modelMap: undefined,
  compactCommands: true,
};

describe("discoverCommands", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "discover-test-"));

    // .claude/commands/
    const commandsDir = join(tempDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(
      join(commandsDir, "test.md"),
      `---
description: Run the tests
model: sonnet
---
Please run the test suite for $ARGUMENTS[0]`,
    );
    await writeFile(
      join(commandsDir, "simple.md"),
      "Just a plain template with no frontmatter",
    );

    // Nested command
    const nestedDir = join(commandsDir, "frontend");
    await mkdir(nestedDir, { recursive: true });
    await writeFile(
      join(nestedDir, "lint.md"),
      `---
description: Lint frontend code
---
Run the linter on frontend code`,
    );

    // .claude/skills/
    const skillsDir = join(tempDir, ".claude", "skills");
    const skillDir = join(skillsDir, "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---
description: My custom skill
context: fork
---
This is a skill template`,
    );
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("discovers commands from .claude/commands", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const names = commands.map((c) => c.name).sort();
    expect(names).toContain("test");
    expect(names).toContain("simple");
    expect(names).toContain("frontend-lint");
  });

  test("discovers skills from .claude/skills", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const names = commands.map((c) => c.name);
    expect(names).toContain("my-skill");
  });

  test("skips skills when includeSkills is false", async () => {
    const config = { ...defaultConfig, includeSkills: false };
    const commands = await discoverCommands(tempDir, config);
    const names = commands.map((c) => c.name);
    expect(names).not.toContain("my-skill");
  });

  test("parses frontmatter description", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const testCmd = commands.find((c) => c.name === "test");
    expect(testCmd?.description).toBe("Run the tests");
  });

  test("converts placeholders in templates", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const testCmd = commands.find((c) => c.name === "test");
    expect(testCmd?.template).toContain("$2");
    expect(testCmd?.template).not.toContain("$ARGUMENTS[0]");
  });

  test("resolves model from frontmatter", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const testCmd = commands.find((c) => c.name === "test");
    expect(testCmd?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(testCmd?.rawModel).toBe("sonnet");
  });

  test("handles commands with no frontmatter", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const simpleCmd = commands.find((c) => c.name === "simple");
    expect(simpleCmd?.description).toBeUndefined();
    expect(simpleCmd?.model).toBeUndefined();
    expect(simpleCmd?.template).toBe(
      "Just a plain template with no frontmatter",
    );
  });

  test("maps context: fork to subtask: true", async () => {
    const commands = await discoverCommands(tempDir, defaultConfig);
    const skillCmd = commands.find((c) => c.name === "my-skill");
    expect(skillCmd?.subtask).toBe(true);
  });

  test("applies prefix to command names", async () => {
    const config = { ...defaultConfig, prefix: "cc-" };
    const commands = await discoverCommands(tempDir, config);
    const names = commands.map((c) => c.name);
    expect(names).toContain("cc-test");
    expect(names).toContain("cc-simple");
    expect(names).toContain("cc-frontend-lint");
    expect(names).toContain("cc-my-skill");
  });

  test("returns empty array for directory with no .claude folder", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "empty-test-"));
    const commands = await discoverCommands(emptyDir, defaultConfig);
    expect(commands).toEqual([]);
    await rm(emptyDir, { recursive: true, force: true });
  });

  test("uses modelMap overrides when provided", async () => {
    const config = {
      ...defaultConfig,
      modelMap: { sonnet: "custom/my-sonnet" },
    };
    const commands = await discoverCommands(tempDir, config);
    const testCmd = commands.find((c) => c.name === "test");
    expect(testCmd?.model).toBe("custom/my-sonnet");
  });
});
