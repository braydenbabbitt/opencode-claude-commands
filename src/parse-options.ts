import type { PluginOptions } from "@opencode-ai/plugin"
import type { PluginConfig } from "./types.js"

export const parseOptions = (options?: PluginOptions): PluginConfig => ({
  prefix: typeof options?.prefix === "string" ? options.prefix : "",
  includeUserLevel:
    typeof options?.includeUserLevel === "boolean"
      ? options.includeUserLevel
      : true,
  includeSkills:
    typeof options?.includeSkills === "boolean" ? options.includeSkills : true,
  defaultAgent:
    typeof options?.defaultAgent === "string" ? options.defaultAgent : "build",
})
