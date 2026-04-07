import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { findMdFilesRecursive } from "../find-md-files.js";

describe("findMdFilesRecursive", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "find-md-test-"));

    // Create structure:
    // tempDir/
    //   foo.md
    //   bar.txt
    //   sub/
    //     baz.md
    //     deep/
    //       qux.md
    await writeFile(join(tempDir, "foo.md"), "# Foo");
    await writeFile(join(tempDir, "bar.txt"), "not markdown");
    await mkdir(join(tempDir, "sub"), { recursive: true });
    await writeFile(join(tempDir, "sub", "baz.md"), "# Baz");
    await mkdir(join(tempDir, "sub", "deep"), { recursive: true });
    await writeFile(join(tempDir, "sub", "deep", "qux.md"), "# Qux");
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("finds all .md files recursively", async () => {
    const files = await findMdFilesRecursive(tempDir);
    const sorted = files.sort();
    expect(sorted).toEqual([
      join(tempDir, "foo.md"),
      join(tempDir, "sub", "baz.md"),
      join(tempDir, "sub", "deep", "qux.md"),
    ]);
  });

  test("does not include non-.md files", async () => {
    const files = await findMdFilesRecursive(tempDir);
    expect(files.every((f) => f.endsWith(".md"))).toBe(true);
  });

  test("returns empty array for non-existent directory", async () => {
    const files = await findMdFilesRecursive(join(tempDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  test("returns empty array for empty directory", async () => {
    const emptyDir = join(tempDir, "empty");
    await mkdir(emptyDir, { recursive: true });
    const files = await findMdFilesRecursive(emptyDir);
    expect(files).toEqual([]);
  });
});
