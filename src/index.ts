import type { Plugin, Config } from "@opencode-ai/plugin";
import { SERVICE_NAME } from "./constants.js";
import { discoverCommands } from "./discover-commands.js";
import { getValidAgents } from "./get-valid-agents.js";
import { resolveAgent } from "./resolve-agent.js";
import { parseOptions } from "./parse-options.js";

export const ClaudeCommandsPlugin: Plugin = async (
  { client, directory },
  options,
) => {
  const pluginConfig = parseOptions(options);

  // Discover commands from .claude directories
  const commands = await discoverCommands(directory, pluginConfig);

  if (commands.length === 0) {
    await client.app.log({
      body: {
        service: SERVICE_NAME,
        level: "debug",
        message: "No .claude/commands or .claude/skills found",
      },
    });
    return {};
  }

  // Validate agents
  const validAgents = await getValidAgents(client);

  // Resolve agents for each command
  commands.forEach((cmd) => {
    cmd.agent = resolveAgent(cmd.agent, validAgents, pluginConfig.defaultAgent);
  });

  await client.app.log({
    body: {
      service: SERVICE_NAME,
      level: "info",
      message: `Discovered ${commands.length} command(s) from .claude: ${commands.map((c) => c.name).join(", ")}`,
    },
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

      await Promise.all(
        commands.map(async (cmd) => {
          // Don't overwrite existing OpenCode commands
          if (commandMap[cmd.name]) {
            await client.app.log({
              body: {
                service: SERVICE_NAME,
                level: "debug",
                message: `Skipping "${cmd.name}" — already defined in OpenCode config`,
              },
            });
            return;
          }

          commandMap[cmd.name] = {
            template: cmd.template,
            ...(cmd.description && { description: cmd.description }),
            ...(cmd.agent && { agent: cmd.agent }),
            ...(cmd.model && { model: cmd.model }),
            ...(cmd.subtask && { subtask: cmd.subtask }),
          };
        }),
      );
    },
  };
};
