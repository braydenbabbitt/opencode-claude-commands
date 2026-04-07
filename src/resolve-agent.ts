export const resolveAgent = (
  requestedAgent: string | undefined,
  validAgents: Set<string>,
  defaultAgent: string,
): string | undefined => {
  if (!requestedAgent) return undefined
  if (validAgents.has(requestedAgent)) return requestedAgent
  return defaultAgent
}
