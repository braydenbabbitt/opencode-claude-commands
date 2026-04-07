import { describe, expect, test } from "bun:test";
import { buildCommandName } from "../build-command-name.js";

describe("buildCommandName", () => {
  describe("regular commands (isSkill = false)", () => {
    test("builds name from a file at the root of the commands dir", () => {
      expect(
        buildCommandName(
          "/project/.claude/commands/test.md",
          "/project/.claude/commands",
          "",
          false,
        ),
      ).toBe("test");
    });

    test("builds name from a nested file, replacing slashes with dashes", () => {
      expect(
        buildCommandName(
          "/project/.claude/commands/frontend/lint.md",
          "/project/.claude/commands",
          "",
          false,
        ),
      ).toBe("frontend-lint");
    });

    test("strips .md extension", () => {
      expect(
        buildCommandName(
          "/root/commands/deploy.md",
          "/root/commands",
          "",
          false,
        ),
      ).toBe("deploy");
    });

    test("applies prefix", () => {
      expect(
        buildCommandName(
          "/root/commands/test.md",
          "/root/commands",
          "cc-",
          false,
        ),
      ).toBe("cc-test");
    });

    test("applies prefix to nested commands", () => {
      expect(
        buildCommandName(
          "/root/commands/backend/migrate.md",
          "/root/commands",
          "claude-",
          false,
        ),
      ).toBe("claude-backend-migrate");
    });

    test("handles deeply nested paths", () => {
      expect(
        buildCommandName(
          "/root/commands/a/b/c/deep.md",
          "/root/commands",
          "",
          false,
        ),
      ).toBe("a-b-c-deep");
    });
  });

  describe("skill commands (isSkill = true)", () => {
    test("uses the parent directory name as the command name", () => {
      expect(
        buildCommandName(
          "/project/.claude/skills/my-skill/SKILL.md",
          "/project/.claude/skills",
          "",
          true,
        ),
      ).toBe("my-skill");
    });

    test("applies prefix to skill names", () => {
      expect(
        buildCommandName(
          "/project/.claude/skills/my-skill/SKILL.md",
          "/project/.claude/skills",
          "sk-",
          true,
        ),
      ).toBe("sk-my-skill");
    });
  });
});
