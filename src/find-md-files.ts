import { readdir } from "fs/promises";
import { join } from "path";
import { exists } from "./exists.js";

export const findMdFilesRecursive = async (dir: string): Promise<string[]> => {
  if (!(await exists(dir))) return [];

  const entries = await readdir(dir, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return findMdFilesRecursive(fullPath);
      if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
      return [];
    }),
  );

  return nested.flat();
};
