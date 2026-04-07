import { readFile } from "fs/promises"
import { join } from "path"
import { homedir } from "os"
import type { ClaudeCommand, PluginConfig } from "./types.js"
import { parseFrontmatter } from "./parse-frontmatter.js"
import { convertPlaceholders } from "./convert-placeholders.js"
import { buildCommandName } from "./build-command-name.js"
import { findMdFilesRecursive } from "./find-md-files.js"
import { findSkillFiles } from "./find-skill-files.js"

export const discoverCommands = async (
  directory: string,
  config: PluginConfig,
): Promise<ClaudeCommand[]> => {
  const commands: ClaudeCommand[] = []

  const searchDirs: Array<{
    commandsDir: string
    skillsDir: string
    label: string
  }> = [
    {
      commandsDir: join(directory, ".claude", "commands"),
      skillsDir: join(directory, ".claude", "skills"),
      label: "project",
    },
  ]

  if (config.includeUserLevel) {
    const home = homedir()
    searchDirs.push({
      commandsDir: join(home, ".claude", "commands"),
      skillsDir: join(home, ".claude", "skills"),
      label: "user",
    })
  }

  for (const { commandsDir, skillsDir, label } of searchDirs) {
    // Discover .claude/commands/*.md (recursive)
    const cmdFiles = await findMdFilesRecursive(commandsDir)
    for (const filePath of cmdFiles) {
      const raw = await readFile(filePath, "utf-8")
      const { frontmatter, body } = parseFrontmatter(raw)
      const template = convertPlaceholders(body)
      const name = buildCommandName(filePath, commandsDir, config.prefix, false)

      commands.push({
        name,
        template,
        description:
          typeof frontmatter.description === "string"
            ? frontmatter.description
            : undefined,
        model:
          typeof frontmatter.model === "string"
            ? frontmatter.model
            : undefined,
        agent:
          typeof frontmatter.agent === "string"
            ? frontmatter.agent
            : undefined,
        subtask: frontmatter.context === "fork" ? true : undefined,
        source: `${label}:${filePath}`,
      })
    }

    // Discover .claude/skills/*/SKILL.md
    if (config.includeSkills) {
      const skillFiles = await findSkillFiles(skillsDir)
      for (const filePath of skillFiles) {
        const raw = await readFile(filePath, "utf-8")
        const { frontmatter, body } = parseFrontmatter(raw)
        const template = convertPlaceholders(body)
        const name = buildCommandName(filePath, skillsDir, config.prefix, true)

        commands.push({
          name,
          template,
          description:
            typeof frontmatter.description === "string"
              ? frontmatter.description
              : undefined,
          model:
            typeof frontmatter.model === "string"
              ? frontmatter.model
              : undefined,
          agent:
            typeof frontmatter.agent === "string"
              ? frontmatter.agent
              : undefined,
          subtask: frontmatter.context === "fork" ? true : undefined,
          source: `${label}:${filePath}`,
        })
      }
    }
  }

  return commands
}
