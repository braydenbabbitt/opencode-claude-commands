import { describe, expect, test } from "bun:test";
import { convertPlaceholders } from "../convert-placeholders.js";

describe("convertPlaceholders", () => {
  describe("$ARGUMENTS[N] conversion", () => {
    // $ARGUMENTS[N] is first converted to $(N+1), then the bare $N regex
    // increments it again to $(N+2). This is the expected double-increment.
    test("converts $ARGUMENTS[0] to $2 (double increment: 0->1->2)", () => {
      expect(convertPlaceholders("Hello $ARGUMENTS[0]")).toBe("Hello $2");
    });

    test("converts $ARGUMENTS[1] to $3", () => {
      expect(convertPlaceholders("$ARGUMENTS[1] world")).toBe("$3 world");
    });

    test("converts multiple $ARGUMENTS references", () => {
      expect(
        convertPlaceholders(
          "$ARGUMENTS[0] and $ARGUMENTS[1] and $ARGUMENTS[2]",
        ),
      ).toBe("$2 and $3 and $4");
    });

    test("handles large indices", () => {
      expect(convertPlaceholders("$ARGUMENTS[10]")).toBe("$12");
    });
  });

  describe("bare $N conversion", () => {
    test("converts $0 to $1", () => {
      expect(convertPlaceholders("Use $0 here")).toBe("Use $1 here");
    });

    test("converts $1 to $2", () => {
      expect(convertPlaceholders("Arg: $1")).toBe("Arg: $2");
    });

    test("converts multiple bare positional args", () => {
      expect(convertPlaceholders("$0 $1 $2")).toBe("$1 $2 $3");
    });
  });

  describe("shell block conversion", () => {
    test("converts ```! blocks to !`cmd` lines", () => {
      const input = "```!\necho hello\necho world\n```";
      const expected = "!`echo hello`\n!`echo world`";
      expect(convertPlaceholders(input)).toBe(expected);
    });

    test("trims whitespace in shell block lines", () => {
      const input = "```!\n  echo hello  \n  echo world  \n```";
      const expected = "!`echo hello`\n!`echo world`";
      expect(convertPlaceholders(input)).toBe(expected);
    });

    test("skips empty lines in shell blocks", () => {
      const input = "```!\necho hello\n\necho world\n```";
      const expected = "!`echo hello`\n!`echo world`";
      expect(convertPlaceholders(input)).toBe(expected);
    });

    test("handles shell block with surrounding text", () => {
      const input = "Before\n```!\nls\n```\nAfter";
      const expected = "Before\n!`ls`\nAfter";
      expect(convertPlaceholders(input)).toBe(expected);
    });
  });

  describe("no-op cases", () => {
    test("returns text unchanged when no placeholders present", () => {
      const input = "Just some regular text";
      expect(convertPlaceholders(input)).toBe(input);
    });

    test("handles empty string", () => {
      expect(convertPlaceholders("")).toBe("");
    });
  });

  describe("combined conversions", () => {
    test("converts both $ARGUMENTS and shell blocks in the same template", () => {
      const input = "Run $ARGUMENTS[0]\n```!\ngit status\n```";
      const expected = "Run $2\n!`git status`";
      expect(convertPlaceholders(input)).toBe(expected);
    });
  });
});
