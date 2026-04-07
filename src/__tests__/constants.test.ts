import { describe, expect, test } from "bun:test";
import { SERVICE_NAME } from "../constants.js";

describe("constants", () => {
  test("SERVICE_NAME is defined", () => {
    expect(SERVICE_NAME).toBe("opencode-claude-commands");
  });
});
