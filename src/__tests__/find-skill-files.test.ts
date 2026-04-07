import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { findSkillFiles } from "../find-skill-files.js";

describe("findSkillFiles", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "find-skill-test-"));

    // Create structure:
    // tempDir/
    //   valid-skill/
    //     SKILL.md
    //   another-skill/
    //     SKILL.md
    //   no-skill-file/
    //     README.md
    //   just-a-file.md
    await mkdir(join(tempDir, "valid-skill"), { recursive: true });
    await writeFile(join(tempDir, "valid-skill", "SKILL.md"), "# Skill");
    await mkdir(join(tempDir, "another-skill"), { recursive: true });
    await writeFile(join(tempDir, "another-skill", "SKILL.md"), "# Another");
    await mkdir(join(tempDir, "no-skill-file"), { recursive: true });
    await writeFile(join(tempDir, "no-skill-file", "README.md"), "# Readme");
    await writeFile(join(tempDir, "just-a-file.md"), "not a skill dir");
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("finds SKILL.md files in immediate subdirectories", async () => {
    const files = await findSkillFiles(tempDir);
    const sorted = files.sort();
    expect(sorted).toEqual([
      join(tempDir, "another-skill", "SKILL.md"),
      join(tempDir, "valid-skill", "SKILL.md"),
    ]);
  });

  test("ignores directories without SKILL.md", async () => {
    const files = await findSkillFiles(tempDir);
    expect(files.some((f) => f.includes("no-skill-file"))).toBe(false);
  });

  test("ignores files in the root (not directories)", async () => {
    const files = await findSkillFiles(tempDir);
    expect(files.some((f) => f.includes("just-a-file"))).toBe(false);
  });

  test("returns empty array for non-existent directory", async () => {
    const files = await findSkillFiles(join(tempDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  test("returns empty array for empty directory", async () => {
    const emptyDir = join(tempDir, "empty");
    await mkdir(emptyDir, { recursive: true });
    const files = await findSkillFiles(emptyDir);
    expect(files).toEqual([]);
  });
});
