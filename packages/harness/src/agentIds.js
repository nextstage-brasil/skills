export const DEFAULT_AGENTS = ['cursor', 'claude-code'];

export const KNOWN_AGENT_IDS = ['cursor', 'claude-code'];

const AGENT_ALIASES = {
  claude: 'claude-code',
  'claude-code': 'claude-code',
  cursor: 'cursor',
};

export function normalizeAgentId(agentId) {
  const normalized = AGENT_ALIASES[agentId];
  if (!normalized) {
    throw new Error(`Unknown agent: ${agentId} (expected: ${KNOWN_AGENT_IDS.join(', ')}, or alias claude)`);
  }
  return normalized;
}

export function normalizeAgentIds(agentIds) {
  const result = [];
  const seen = new Set();
  for (const agentId of agentIds) {
    const normalized = normalizeAgentId(agentId);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  if (result.length === 0) {
    throw new Error('At least one agent is required');
  }
  return result;
}
