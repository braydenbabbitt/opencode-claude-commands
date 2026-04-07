import type { Plugin, Config } from "@opencode-ai/plugin";
import { SERVICE_NAME } from "./constants.js";
import { discoverCommands } from "./discover-commands.js";
import { parseOptions } from "./parse-options.js";

// Export as `server` for PluginModule format (npm plugins)
// and as named export for local plugin discovery
export const server: Plugin = async ({ client, directory }, options) => {
  const pluginConfig = parseOptions(options);

  // Discover commands from .claude directories (filesystem only — no API calls)
  const commands = await discoverCommands(directory, pluginConfig);

  if (commands.length === 0) {
    return {};
  }

  // Build lookups for JIT behavior during command execution
  const unresolvedModels = new Map<string, string>();
  const fullTemplates = new Map<string, string>();

  commands.forEach((cmd) => {
    if (cmd.rawModel && !cmd.model) {
      unresolvedModels.set(cmd.name, cmd.rawModel);
    }
    if (pluginConfig.compactCommands) {
      fullTemplates.set(cmd.name, cmd.template);
    }
  });

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

        // In compact mode, use a short placeholder as the visible template
        const template = pluginConfig.compactCommands
          ? `Running /${cmd.name}...`
          : cmd.template;

        commandMap[cmd.name] = {
          template,
          ...(cmd.description && { description: cmd.description }),
          ...(cmd.agent && { agent: cmd.agent }),
          ...(cmd.model && { model: cmd.model }),
          ...(cmd.subtask && { subtask: cmd.subtask }),
        };
      });
    },

    "command.execute.before": async (input, output) => {
      // JIT model warning
      const rawModel = unresolvedModels.get(input.command);
      if (rawModel) {
        await client.tui.showToast({
          body: {
            message: `[${SERVICE_NAME}] Unknown model "${rawModel}" in /${input.command} — using your default model. Add a modelMap override in plugin options to fix this.`,
            variant: "warning",
          },
        });
      }

      // In compact mode, inject the full template as a text part
      const fullTemplate = fullTemplates.get(input.command);
      if (fullTemplate) {
        output.parts.push({
          type: "text",
          text: fullTemplate,
          id: "",
          sessionID: input.sessionID,
          messageID: "",
        });
      }
    },
  };
};

// Named alias for convenience
export const ClaudeCommandsPlugin = server;
