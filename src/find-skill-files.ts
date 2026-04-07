import { readdir } from "fs/promises";
import { join } from "path";
import { exists } from "./exists.js";

export const findSkillFiles = async (dir: string): Promise<string[]> => {
  if (!(await exists(dir))) return [];

  const entries = await readdir(dir, { withFileTypes: true });

  const results = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const skillFile = join(dir, entry.name, "SKILL.md");
        return (await exists(skillFile)) ? skillFile : null;
      }),
  );

  return results.filter((path): path is string => path !== null);
};
