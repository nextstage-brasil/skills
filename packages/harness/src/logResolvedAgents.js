import { resolveAgentsConfig } from './agentsLayout.js';
import { formatAgentsSource } from './projectAgents.js';

export function logResolvedAgents(projectRoot, agentFlags = []) {
  const resolved = resolveAgentsConfig(projectRoot, agentFlags);
  if (agentFlags.length === 0 && resolved.source !== 'cli') {
    console.log(`Using agents: ${resolved.agents.join(', ')} (from ${formatAgentsSource(resolved.source)})`);
  }
  return resolved;
}
