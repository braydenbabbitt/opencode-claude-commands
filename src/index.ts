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
  const commandsWithModel = new Set<string>();
  const commandModelMap = new Map<string, string>();

  commands.forEach((cmd) => {
    if (cmd.rawModel && !cmd.model) {
      unresolvedModels.set(cmd.name, cmd.rawModel);
    }
    if (pluginConfig.compactCommands) {
      fullTemplates.set(cmd.name, cmd.template);
    }
    if (cmd.model) {
      commandsWithModel.add(cmd.name);
      commandModelMap.set(cmd.name, cmd.model);
    }
  });

  const pendingModelRestore = new Map<string, string>();
  let lastKnownUserModel: string | undefined;
  let globalPendingRestore: string | undefined;

  return {
    config: async (input: Config) => {
      // Capture the user's configured model before any command can override it.
      // This is read from the config object passed to us — no API call needed.
      if (input.model) {
        lastKnownUserModel = input.model;
      }

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

    event: async ({ event }) => {
      if (event.type !== "session.idle") return;

      const sessionID = event.properties.sessionID;
      let previousModel = pendingModelRestore.get(sessionID);

      // Fallback: on the first message of a session the session ID passed to
      // command.execute.before may differ from the one on session.idle, so the
      // per-session lookup can miss. Use the global fallback in that case.
      if (!previousModel && globalPendingRestore) {
        previousModel = globalPendingRestore;
      }

      if (!previousModel) return;

      pendingModelRestore.delete(sessionID);
      globalPendingRestore = undefined;

      try {
        await client.config.update({
          body: { model: previousModel },
        });
        // Keep our baseline current so future commands have an accurate fallback
        lastKnownUserModel = previousModel;
      } catch {
        await client.tui.showToast({
          body: {
            message: `[${SERVICE_NAME}] Failed to restore model to ${previousModel}.`,
            variant: "warning",
          },
        });
      }
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

      // If this command overrides the model, save the current model so we
      // can restore it once the command finishes.
      if (commandsWithModel.has(input.command)) {
        const commandModel = commandModelMap.get(input.command);
        try {
          const { data: currentConfig } = await client.config.get();
          const configModel = currentConfig?.model;

          // Pick the right model to restore to:
          // - If config model differs from the command's model → it's the user's original
          // - If they match (race: config already overridden before this hook) → use fallback
          const originalModel =
            configModel && configModel !== commandModel
              ? configModel
              : lastKnownUserModel && lastKnownUserModel !== commandModel
                ? lastKnownUserModel
                : undefined;

          if (originalModel) {
            if (input.sessionID) {
              pendingModelRestore.set(input.sessionID, originalModel);
            }
            globalPendingRestore = originalModel;
          }
        } catch {
          // Best-effort — fall back to lastKnownUserModel from the config hook
          if (lastKnownUserModel && lastKnownUserModel !== commandModel) {
            if (input.sessionID) {
              pendingModelRestore.set(input.sessionID, lastKnownUserModel);
            }
            globalPendingRestore = lastKnownUserModel;
          }
        }
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
