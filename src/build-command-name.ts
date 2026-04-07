import { relative, basename, dirname } from "path"

/** Build the command name from a file path relative to the commands/skills root */
export const buildCommandName = (
  filePath: string,
  rootDir: string,
  prefix: string,
  isSkill: boolean,
): string => {
  let name: string

  if (isSkill) {
    // For skills, use the parent directory name (e.g. .claude/skills/my-skill/SKILL.md -> my-skill)
    name = basename(dirname(filePath))
  } else {
    // For commands, use relative path with .md stripped and / replaced by -
    const rel = relative(rootDir, filePath)
    name = rel.replace(/\.md$/, "").replace(/\//g, "-")
  }

  return `${prefix}${name}`
}
