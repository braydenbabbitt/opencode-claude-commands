import type { Plugin } from "@opencode-ai/plugin";

export const getValidAgents = async (
  client: Parameters<Plugin>[0]["client"],
): Promise<Set<string>> => {
  try {
    const result = await client.app.agents();
    if (result.data && Array.isArray(result.data)) {
      return new Set(result.data.map((a: { name: string }) => a.name));
    }
  } catch {
    return new Set();
  }
  return new Set();
};
