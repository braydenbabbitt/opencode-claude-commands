import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { ClaudeCommand, PluginConfig } from "./types.js";
import { parseFrontmatter } from "./parse-frontmatter.js";
import { convertPlaceholders } from "./convert-placeholders.js";
import { buildCommandName } from "./build-command-name.js";
import { findMdFilesRecursive } from "./find-md-files.js";
import { findSkillFiles } from "./find-skill-files.js";
import { resolveModel } from "./resolve-model.js";

const parseCommandFile = async (
  filePath: string,
  rootDir: string,
  prefix: string,
  isSkill: boolean,
  label: string,
  modelMap?: Record<string, string>,
): Promise<ClaudeCommand> => {
  const raw = await readFile(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const template = convertPlaceholders(body);
  const name = buildCommandName(filePath, rootDir, prefix, isSkill);

  return {
    name,
    template,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : undefined,
    rawModel:
      typeof frontmatter.model === "string" ? frontmatter.model : undefined,
    model: resolveModel(
      typeof frontmatter.model === "string" ? frontmatter.model : undefined,
      modelMap,
    ),
    agent:
      typeof frontmatter.agent === "string" ? frontmatter.agent : undefined,
    subtask: frontmatter.context === "fork" ? true : undefined,
    source: `${label}:${filePath}`,
  };
};

export const discoverCommands = async (
  directory: string,
  config: PluginConfig,
): Promise<ClaudeCommand[]> => {
  const searchDirs: Array<{
    commandsDir: string;
    skillsDir: string;
    label: string;
  }> = [
    {
      commandsDir: join(directory, ".claude", "commands"),
      skillsDir: join(directory, ".claude", "skills"),
      label: "project",
    },
  ];

  if (config.includeUserLevel) {
    const home = homedir();
    searchDirs.push({
      commandsDir: join(home, ".claude", "commands"),
      skillsDir: join(home, ".claude", "skills"),
      label: "user",
    });
  }

  const nested = await Promise.all(
    searchDirs.map(async ({ commandsDir, skillsDir, label }) => {
      // Discover .claude/commands/*.md (recursive)
      const cmdFiles = await findMdFilesRecursive(commandsDir);
      const cmdCommands = await Promise.all(
        cmdFiles.map((filePath) =>
          parseCommandFile(
            filePath,
            commandsDir,
            config.prefix,
            false,
            label,
            config.modelMap,
          ),
        ),
      );

      // Discover .claude/skills/*/SKILL.md
      const skillCommands = config.includeSkills
        ? await findSkillFiles(skillsDir).then((skillFiles) =>
            Promise.all(
              skillFiles.map((filePath) =>
                parseCommandFile(
                  filePath,
                  skillsDir,
                  config.prefix,
                  true,
                  label,
                  config.modelMap,
                ),
              ),
            ),
          )
        : [];

      return [...cmdCommands, ...skillCommands];
    }),
  );

  return nested.flat();
};
