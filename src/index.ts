import type { Plugin, Config } from "@opencode-ai/plugin";
import { discoverCommands } from "./discover-commands.js";
import { parseOptions } from "./parse-options.js";

// Export as `server` for PluginModule format (npm plugins)
// and as named export for local plugin discovery
export const server: Plugin = async ({ directory }, options) => {
  const pluginConfig = parseOptions(options);

  // Discover commands from .claude directories (filesystem only — no API calls)
  const commands = await discoverCommands(directory, pluginConfig);

  if (commands.length === 0) {
    return {};
  }

  return {
    config: async (input: Config) => {
      if (!input.command) {
        const cfg = input as Config & { command: Record<string, unknown> };
        cfg.command = {};
      }

      const commandMap = input.command as Record<
        string,
        {
          template: string;
          description?: string;
          model?: string;
          agent?: string;
          subtask?: boolean;
        }
      >;

      commands.forEach((cmd) => {
        // Don't overwrite existing OpenCode commands
        if (commandMap[cmd.name]) {
          return;
        }

        commandMap[cmd.name] = {
          template: cmd.template,
          ...(cmd.description && { description: cmd.description }),
          ...(cmd.agent && { agent: cmd.agent }),
          ...(cmd.model && { model: cmd.model }),
          ...(cmd.subtask && { subtask: cmd.subtask }),
        };
      });
    },
  };
};

// Named alias for convenience
export const ClaudeCommandsPlugin = server;
