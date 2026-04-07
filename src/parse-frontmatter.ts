import type { Frontmatter } from "./types.js";

export const parseFrontmatter = (
  content: string,
): { frontmatter: Frontmatter; body: string } => {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();
  const frontmatter = yamlBlock.split("\n").reduce<Frontmatter>((acc, line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return acc;

    const key = line.slice(0, colonIndex).trim();
    let value: string | boolean = line.slice(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value === "true") value = true;
    else if (value === "false") value = false;

    acc[key] = value;
    return acc;
  }, {});

  return { frontmatter, body };
};
