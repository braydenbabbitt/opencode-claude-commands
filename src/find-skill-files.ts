import { readdir } from "fs/promises"
import { join } from "path"
import { exists } from "./exists.js"

export const findSkillFiles = async (dir: string): Promise<string[]> => {
  if (!(await exists(dir))) return []

  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillFile = join(dir, entry.name, "SKILL.md")
      if (await exists(skillFile)) {
        results.push(skillFile)
      }
    }
  }

  return results
}
