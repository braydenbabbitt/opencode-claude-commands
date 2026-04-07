/**
 * Known Anthropic model families, sorted by version (highest first).
 * Non-dated aliases auto-resolve to the latest dated version on the API side.
 * When a new family is released, add it to the top of the relevant list.
 */
const MODEL_FAMILIES: Record<string, string[]> = {
  opus: [
    "anthropic/claude-opus-4-6",
    "anthropic/claude-opus-4-5",
    "anthropic/claude-opus-4-1",
    "anthropic/claude-opus-4-0",
  ],
  sonnet: [
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-sonnet-4-0",
    "anthropic/claude-3-7-sonnet-20250219",
    "anthropic/claude-3-5-sonnet-20241022",
  ],
  haiku: ["anthropic/claude-haiku-4-5", "anthropic/claude-3-5-haiku-20241022"],
};

/**
 * Resolves a Claude Code shorthand model name to an OpenCode full model ID.
 *
 * Resolution order:
 * 1. User-provided overrides (from plugin options `modelMap`)
 * 2. Known model families (picks highest version)
 * 3. Pass through as-is if it looks like a full model ID (contains `/`)
 * 4. Returns undefined for unresolvable shorthands (falls back to user default)
 */
export const resolveModel = (
  model: string | undefined,
  userModelMap?: Record<string, string>,
): string | undefined => {
  if (!model) return undefined;

  const normalized = model.toLowerCase().trim();

  // 1. Check user overrides first
  if (userModelMap?.[normalized]) {
    return userModelMap[normalized];
  }

  // 2. Check known model families (first entry = latest version)
  const family = MODEL_FAMILIES[normalized];
  if (family && family.length > 0) {
    return family[0];
  }

  // 3. If it already looks like a full model ID, pass through
  if (model.includes("/")) {
    return model;
  }

  // 4. Try fuzzy matching — check if the shorthand is a substring of any family name
  const fuzzyMatch = Object.entries(MODEL_FAMILIES).find(([key]) =>
    normalized.includes(key),
  );
  if (fuzzyMatch && fuzzyMatch[1].length > 0) {
    return fuzzyMatch[1][0];
  }

  // 5. Unresolvable — return undefined so OpenCode uses the user's default model
  return undefined;
};
