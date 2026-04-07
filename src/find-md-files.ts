import { readdir } from "fs/promises"
import { join } from "path"
import { exists } from "./exists.js"

export const findMdFilesRecursive = async (dir: string): Promise<string[]> => {
  if (!(await exists(dir))) return []

  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await findMdFilesRecursive(fullPath)
      results.push(...nested)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath)
    }
  }

  return results
}
