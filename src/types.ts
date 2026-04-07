export interface ClaudeCommand {
  /** The command name used for registration (e.g. "test", "frontend-lint") */
  name: string
  /** The prompt template body */
  template: string
  /** Optional description from frontmatter */
  description?: string
  /** Optional model override from frontmatter */
  model?: string
  /** Optional agent from frontmatter */
  agent?: string
  /** Whether to run as a subtask (mapped from Claude's context: fork) */
  subtask?: boolean
  /** Source path for logging */
  source: string
}

export interface Frontmatter {
  [key: string]: string | boolean | undefined
}

export interface PluginConfig {
  /** Prefix for command names (default: "") */
  prefix: string
  /** Include user-level ~/.claude/commands and ~/.claude/skills (default: true) */
  includeUserLevel: boolean
  /** Include .claude/skills directories (default: true) */
  includeSkills: boolean
  /** Fallback agent when Claude's agent field isn't compatible (default: "build") */
  defaultAgent: string
}
