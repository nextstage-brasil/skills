import { join } from 'node:path';
import { DEFAULT_AGENTS, normalizeAgentIds } from './agentIds.js';
import { readManifestAgents } from './manifest.js';

export const AGENTS_HOME = '.agents';

export const HARNESS_ROOT = '.nextstage-harness';
export const HARNESS_RULES_DIR = join(HARNESS_ROOT, 'rules');

export const AGENTS_LAYOUT_DIRS = [
  join(AGENTS_HOME, 'docs'),
];

export const AGENTS_SKILLS_DIR = join(AGENTS_HOME, 'skills');

export { DEFAULT_AGENTS };

/**
 * Resolve target agents: CLI --agent > manifest.agents > DEFAULT_AGENTS.
 */
export function resolveAgentsConfig(projectRoot, agentFlags = []) {
  if (agentFlags.length > 0) {
    return { agents: normalizeAgentIds(agentFlags), source: 'cli' };
  }

  const manifestAgents = readManifestAgents(projectRoot);
  if (manifestAgents?.length) {
    return { agents: manifestAgents, source: 'manifest' };
  }

  return { agents: [...DEFAULT_AGENTS], source: 'default' };
}

export function resolveAgents(projectRoot, agentFlags = []) {
  return resolveAgentsConfig(projectRoot, agentFlags).agents;
}

export const DOCKERIGNORE_BLOCK_HEADER = '# Nextstage-harness ignore files';

/** Paths excluded from Docker build context (managed by harness sync). */
export const DOCKERIGNORE_ENTRIES = [
  '/docs',
  '/.agents',
  '/.claude',
  '/.cursor',
  '/.gitlab',
  '/.nextstage-harness',
  '/AGENTS.md',
  '/AGENTS.local.md',
  '/CLAUDE.md',
  '/skills-lock.json',
  '/.worktrees/',
];

export const GITIGNORE_BLOCK_HEADER = '# Nextstage-harness ignore files';

/** Paths excluded from git (managed by harness sync). */
export const GITIGNORE_ENTRIES = [
  '/AGENTS.local.md',
  '/.worktrees/',
];
