import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "../parse-frontmatter.js";

describe("parseFrontmatter", () => {
  test("parses simple key-value frontmatter", () => {
    const input = `---
description: Run the tests
model: sonnet
---
This is the body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      description: "Run the tests",
      model: "sonnet",
    });
    expect(result.body).toBe("This is the body");
  });

  test("returns empty frontmatter when no --- delimiters", () => {
    const input = "Just a body with no frontmatter";
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(input);
  });

  test("returns empty frontmatter when only opening --- delimiter", () => {
    const input = "---\nkey: value\nno closing delimiter";
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(input);
  });

  test("strips double-quoted values", () => {
    const input = `---
description: "A quoted value"
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.description).toBe("A quoted value");
  });

  test("strips single-quoted values", () => {
    const input = `---
description: 'A single-quoted value'
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.description).toBe("A single-quoted value");
  });

  test("converts 'true' string to boolean true", () => {
    const input = `---
enabled: true
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.enabled).toBe(true);
  });

  test("converts 'false' string to boolean false", () => {
    const input = `---
enabled: false
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.enabled).toBe(false);
  });

  test("handles lines without colons (skips them)", () => {
    const input = `---
description: valid
no-colon-here
model: opus
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      description: "valid",
      model: "opus",
    });
  });

  test("trims leading whitespace before --- check", () => {
    const input = `
---
key: value
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ key: "value" });
    expect(result.body).toBe("body");
  });

  test("handles frontmatter with context: fork", () => {
    const input = `---
context: fork
---
Run in subtask`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.context).toBe("fork");
    expect(result.body).toBe("Run in subtask");
  });

  test("handles empty frontmatter block", () => {
    const input = `---
---
body only`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("body only");
  });

  test("handles values containing colons", () => {
    const input = `---
description: Run at http://localhost:3000
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.description).toBe("Run at http://localhost:3000");
  });
});
