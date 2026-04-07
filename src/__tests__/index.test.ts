import { describe, expect, test, beforeAll, afterAll, mock } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { server } from "../index.js";
import type { Config, PluginInput } from "@opencode-ai/plugin";

describe("plugin (server)", () => {
  let tempDir: string;

  const mockClient = {
    tui: {
      showToast: mock(() => Promise.resolve()),
    },
    app: {
      agents: mock(() => Promise.resolve({ data: [] })),
    },
  };

  const makePluginInput = (directory: string): PluginInput =>
    ({
      client: mockClient,
      directory,
      project: "test-project",
      worktree: directory,
      serverUrl: "http://localhost:3000",
      $: {} as any,
    }) as unknown as PluginInput;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "plugin-test-"));

    const commandsDir = join(tempDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(
      join(commandsDir, "greet.md"),
      `---
description: Greet someone
---
Hello $ARGUMENTS[0], welcome!`,
    );
    await writeFile(
      join(commandsDir, "unknown-model.md"),
      `---
model: gpt-turbo-mega
---
This uses an unknown model`,
    );
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("returns empty object when no commands found", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "empty-plugin-"));
    const result = await server(makePluginInput(emptyDir), {
      includeUserLevel: false,
    });
    expect(result).toEqual({});
    await rm(emptyDir, { recursive: true, force: true });
  });

  test("returns config and command.execute.before hooks when commands exist", async () => {
    const result = await server(makePluginInput(tempDir), {
      includeUserLevel: false,
    });
    expect(result.config).toBeDefined();
    expect(result["command.execute.before"]).toBeDefined();
  });

  describe("config hook", () => {
    test("populates command map with discovered commands", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input: Config = {} as Config;
      await result.config!(input);

      const commandMap = (input as any).command;
      expect(commandMap.greet).toBeDefined();
      expect(commandMap.greet.description).toBe("Greet someone");
    });

    test("does not overwrite existing commands", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = {
        command: {
          greet: { template: "existing", description: "Already here" },
        },
      } as unknown as Config;

      await result.config!(input);

      const commandMap = (input as any).command;
      expect(commandMap.greet.description).toBe("Already here");
    });

    test("uses compact template in compact mode (default)", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
        compactCommands: true,
      });

      const input: Config = {} as Config;
      await result.config!(input);

      const commandMap = (input as any).command;
      expect(commandMap.greet.template).toBe("Running /greet...");
    });

    test("uses full template when compactCommands is false", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
        compactCommands: false,
      });

      const input: Config = {} as Config;
      await result.config!(input);

      const commandMap = (input as any).command;
      expect(commandMap.greet.template).toContain("Hello $2, welcome!");
    });
  });

  describe("command.execute.before hook", () => {
    test("shows warning toast for unresolved models", async () => {
      mockClient.tui.showToast.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = {
        command: "unknown-model",
        sessionID: "sess1",
      };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);
      expect(mockClient.tui.showToast).toHaveBeenCalled();
    });

    test("injects full template in compact mode", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
        compactCommands: true,
      });

      const input = {
        command: "greet",
        sessionID: "sess1",
      };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);

      expect(output.parts.length).toBe(1);
      expect(output.parts[0].type).toBe("text");
      expect(output.parts[0].text).toContain("Hello $2, welcome!");
    });

    test("does not inject template when not in compact mode", async () => {
      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
        compactCommands: false,
      });

      const input = {
        command: "greet",
        sessionID: "sess1",
      };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);
      expect(output.parts.length).toBe(0);
    });
  });
});
