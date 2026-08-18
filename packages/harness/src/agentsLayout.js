import { join } from 'node:path';
import { DEFAULT_AGENTS, normalizeAgentIds } from './agentIds.js';
import { readManifestAgents } from './manifest.js';

export const AGENTS_HOME = '.agents';

export const HARNESS_ROOT = '.nextstage-harness';
export const HARNESS_RULES_DIR = join(HARNESS_ROOT, 'rules');
export const HARNESS_AGENTS_DIR = join(HARNESS_ROOT, 'agents');

/** SDD artifact dirs at project root (created by scaffold). */
export const DOCS_LAYOUT_DIRS = [
  'docs/context',
  'docs/specs',
  'docs/versions',
];

export const AGENTS_SKILLS_DIR = join(AGENTS_HOME, 'skills');

/**
 * Claude Code project entry (`CLAUDE.md`). Boot rules + AGENTS.md + subagents.
 * Written by scaffold, `harness sync` (create-if-missing when `claude-code` is active), and `harness agents-md`.
 */
export const CLAUDE_MD_CONTENT = `\
# Rules

CRITICAL — NO EXCEPTIONS.

Obey \`AGENTS.md\` (already in context when the host injects it; open once only if absent — **never** re-Read). Then load every file it requires and follow its flow.

Must load:
- \`AGENTS.local.md\` (when present; case-insensitive)
- all \`alwaysApply: true\` rules (\`.nextstage-harness/rules/\`)
- any NON-NEGOTIABLE / FIRST ACTION file for the task

No skip. No defer. No memory-only. Missing required file → stop, ask human.

Then skills / subagents / task as AGENTS.md says.

## Subagents

\`@.claude/agents\` — use them; model optional per agent.
`;

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
  'docs/',
  '.agents/',
  '.claude/',
  '.cursor/',
  '.gitlab/',
  '.nextstage-harness/',
  'AGENTS.md',
  'AGENTS.local.md',
  'CLAUDE.md',
  'skills-lock.json',
  '.worktrees/',
];

export const GITIGNORE_BLOCK_HEADER = '# Nextstage-harness ignore files';

/** Paths excluded from git (managed by harness sync). */
export const GITIGNORE_ENTRIES = [
  'AGENTS.local.md',
  '.worktrees/',
  '.cursor/rules/',
  '.cursor/agents/',
  '.claude/',
];
