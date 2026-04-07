import { relative, basename, dirname } from "path";

/** Build the command name from a file path relative to the commands/skills root */
export const buildCommandName = (
  filePath: string,
  rootDir: string,
  prefix: string,
  isSkill: boolean,
): string => {
  let name: string;

  if (isSkill) {
    name = basename(dirname(filePath));
  } else {
    const rel = relative(rootDir, filePath);
    name = rel.replace(/\.md$/, "").replace(/\//g, "-");
  }

  return `${prefix}${name}`;
};
