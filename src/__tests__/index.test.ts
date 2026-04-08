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
    config: {
      get: mock(() =>
        Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } }),
      ),
      update: mock(() => Promise.resolve({ data: {} })),
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
    await writeFile(
      join(commandsDir, "with-model.md"),
      `---
description: Command with a known model
model: sonnet
---
Do something with sonnet`,
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

  test("returns config, event, and command.execute.before hooks when commands exist", async () => {
    const result = await server(makePluginInput(tempDir), {
      includeUserLevel: false,
    });
    expect(result.config).toBeDefined();
    expect(result.event).toBeDefined();
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

    test("saves current model before executing a command with a model override", async () => {
      mockClient.config.get.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = { command: "with-model", sessionID: "sess-save" };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);

      expect(mockClient.config.get).toHaveBeenCalledTimes(1);
    });

    test("does not save model for commands without a model override", async () => {
      mockClient.config.get.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = { command: "greet", sessionID: "sess-no-model" };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);

      expect(mockClient.config.get).not.toHaveBeenCalled();
    });

    test("does not save model for commands with an unresolved model", async () => {
      mockClient.config.get.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = { command: "unknown-model", sessionID: "sess-unresolved" };
      const output = { parts: [] as any[] };

      await result["command.execute.before"]!(input as any, output as any);

      // unknown-model has rawModel but no resolved model, so no save
      expect(mockClient.config.get).not.toHaveBeenCalled();
    });

    test("handles config.get failure gracefully", async () => {
      mockClient.config.get.mockImplementationOnce(() =>
        Promise.reject(new Error("config unavailable")),
      );

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      const input = { command: "with-model", sessionID: "sess-fail-get" };
      const output = { parts: [] as any[] };

      // Should not throw
      await result["command.execute.before"]!(input as any, output as any);
    });
  });

  describe("event hook — model restore", () => {
    test("restores model when session goes idle after a model-override command", async () => {
      mockClient.config.get.mockImplementation(() =>
        Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } }),
      );
      mockClient.config.update.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // 1. Simulate command.execute.before for a command with a model override
      await result["command.execute.before"]!(
        { command: "with-model", sessionID: "sess-restore" } as any,
        { parts: [] } as any,
      );

      // 2. Simulate session.idle event
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-restore" },
        } as any,
      });

      expect(mockClient.config.update).toHaveBeenCalledTimes(1);
      expect(mockClient.config.update).toHaveBeenCalledWith({
        body: { model: "anthropic/claude-sonnet-4-5" },
      });
    });

    test("does not restore model for sessions without a pending restore", async () => {
      mockClient.config.update.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // Fire session.idle for a session that never ran a model-override command
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-no-pending" },
        } as any,
      });

      expect(mockClient.config.update).not.toHaveBeenCalled();
    });

    test("ignores non-idle events", async () => {
      mockClient.config.get.mockImplementation(() =>
        Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } }),
      );
      mockClient.config.update.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // Set up a pending restore
      await result["command.execute.before"]!(
        { command: "with-model", sessionID: "sess-event-type" } as any,
        { parts: [] } as any,
      );

      // Fire a non-idle event for the same session
      await result.event!({
        event: {
          type: "message.updated",
          properties: { info: { sessionID: "sess-event-type" } },
        } as any,
      });

      expect(mockClient.config.update).not.toHaveBeenCalled();
    });

    test("clears pending restore after restoring so it only fires once", async () => {
      mockClient.config.get.mockImplementation(() =>
        Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } }),
      );
      mockClient.config.update.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // Set up a pending restore
      await result["command.execute.before"]!(
        { command: "with-model", sessionID: "sess-once" } as any,
        { parts: [] } as any,
      );

      // First idle — should restore
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-once" },
        } as any,
      });

      expect(mockClient.config.update).toHaveBeenCalledTimes(1);

      // Second idle — should NOT restore again
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-once" },
        } as any,
      });

      expect(mockClient.config.update).toHaveBeenCalledTimes(1);
    });

    test("shows warning toast when config.update fails during restore", async () => {
      mockClient.config.get.mockImplementation(() =>
        Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } }),
      );
      mockClient.config.update.mockImplementationOnce(() =>
        Promise.reject(new Error("update failed")),
      );
      mockClient.tui.showToast.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // Set up a pending restore
      await result["command.execute.before"]!(
        { command: "with-model", sessionID: "sess-fail-update" } as any,
        { parts: [] } as any,
      );

      // Session goes idle — restore fails
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-fail-update" },
        } as any,
      });

      expect(mockClient.tui.showToast).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining("Failed to restore model"),
          variant: "warning",
        },
      });
    });

    test("does not set pending restore when config has no model", async () => {
      mockClient.config.get.mockImplementationOnce(() =>
        Promise.resolve({ data: {} }),
      );
      mockClient.config.update.mockClear();

      const result = await server(makePluginInput(tempDir), {
        includeUserLevel: false,
      });

      // Run a command with a model override, but config has no model set
      await result["command.execute.before"]!(
        { command: "with-model", sessionID: "sess-no-config-model" } as any,
        { parts: [] } as any,
      );

      // Session goes idle — should not attempt restore
      await result.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "sess-no-config-model" },
        } as any,
      });

      expect(mockClient.config.update).not.toHaveBeenCalled();
    });
  });
});
