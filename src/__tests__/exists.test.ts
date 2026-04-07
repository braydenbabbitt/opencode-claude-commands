import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exists } from "../exists.js";

describe("exists", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "exists-test-"));
    await writeFile(join(tempDir, "real-file.txt"), "hello");
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("returns true for an existing file", async () => {
    expect(await exists(join(tempDir, "real-file.txt"))).toBe(true);
  });

  test("returns true for an existing directory", async () => {
    expect(await exists(tempDir)).toBe(true);
  });

  test("returns false for a non-existent path", async () => {
    expect(await exists(join(tempDir, "no-such-file.txt"))).toBe(false);
  });

  test("returns false for a non-existent directory", async () => {
    expect(await exists(join(tempDir, "no-such-dir"))).toBe(false);
  });
});
