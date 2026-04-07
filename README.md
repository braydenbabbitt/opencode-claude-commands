# opencode-claude-commands

An [OpenCode](https://opencode.ai) plugin that automatically loads slash commands from `.claude/commands` and `.claude/skills` directories, making them available as native OpenCode commands with full autocomplete support.

If you have existing Claude Code commands or skills, this plugin lets you use them in OpenCode without any manual conversion.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-claude-commands"]
}
```

Or with options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-claude-commands", {
      "prefix": "claude-",
      "includeUserLevel": true,
      "includeSkills": true,
      "defaultAgent": "build"
    }]
  ]
}
```

## How it works

On startup, the plugin:

1. Scans for `.claude/commands/*.md` files (recursively) in your project
2. Scans for `.claude/skills/*/SKILL.md` files in your project
3. Optionally scans `~/.claude/commands/` and `~/.claude/skills/` for user-level commands
4. Converts each file to an OpenCode command and registers it via the config hook

The commands then appear in OpenCode's `/` autocomplete menu like any other native command.

## What gets converted

### Placeholders

| Claude Code | OpenCode | Notes |
|---|---|---|
| `$ARGUMENTS` | `$ARGUMENTS` | Compatible, no change |
| `$0`, `$1`, `$2` | `$1`, `$2`, `$3` | Shifted +1 (Claude is 0-based, OpenCode is 1-based) |
| `$ARGUMENTS[0]` | `$1` | Converted to OpenCode positional args |
| `` !`cmd` `` | `` !`cmd` `` | Compatible, no change |
| ` ```! ` blocks | Multiple `` !`cmd` `` lines | Multi-line shell blocks are expanded |

### Frontmatter

| Claude Code field | OpenCode mapping | Notes |
|---|---|---|
| `description` | `description` | Direct mapping |
| `model` | `model` | Direct mapping |
| `agent` | `agent` | Validated against available OpenCode agents; falls back to `defaultAgent` if incompatible |
| `context: fork` | `subtask: true` | Subagent execution |
| `allowed-tools` | Dropped | No OpenCode equivalent |
| `effort` | Dropped | No OpenCode equivalent |
| `paths` | Dropped | No OpenCode equivalent |
| `disable-model-invocation` | Dropped | No OpenCode equivalent |
| `user-invocable` | Dropped | No OpenCode equivalent |

### Command naming

| Source | Command name |
|---|---|
| `.claude/commands/test.md` | `/test` |
| `.claude/commands/frontend/lint.md` | `/frontend-lint` |
| `.claude/skills/review/SKILL.md` | `/review` |

With the `prefix` option set to `"claude-"`:

| Source | Command name |
|---|---|
| `.claude/commands/test.md` | `/claude-test` |
| `.claude/commands/frontend/lint.md` | `/claude-frontend-lint` |

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `""` | Prefix added to all imported command names. Use this to avoid collisions with existing OpenCode commands. |
| `includeUserLevel` | `boolean` | `true` | Also scan `~/.claude/commands/` and `~/.claude/skills/` for user-level commands. |
| `includeSkills` | `boolean` | `true` | Also scan `.claude/skills/*/SKILL.md` directories. |
| `defaultAgent` | `string` | `"build"` | Fallback agent used when a Claude command specifies an agent that doesn't exist in OpenCode. |

## Collision handling

If a `.claude/commands` file would create a command with the same name as an existing OpenCode command, the **existing OpenCode command takes precedence**. The plugin logs a debug message when this happens.

To avoid collisions, use the `prefix` option to namespace imported commands.

## Limitations

- Claude-specific variables like `${CLAUDE_SKILL_DIR}` and `${CLAUDE_SESSION_ID}` are left as-is in the template (they will appear as literal text)
- Claude frontmatter fields without an OpenCode equivalent (`allowed-tools`, `effort`, `paths`, etc.) are silently dropped
- Skill supporting files (templates, scripts alongside `SKILL.md`) are not automatically included — only the `SKILL.md` content is used
- The `ultrathink` keyword has no effect in OpenCode

## License

MIT
