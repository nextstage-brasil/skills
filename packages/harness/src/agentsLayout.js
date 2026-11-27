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
  'docs/specs/_pending',
  'docs/versions',
];

export const AGENTS_SKILLS_DIR = join(AGENTS_HOME, 'skills');

/**
 * Claude Code project entry (`CLAUDE.md`). Imports AGENTS.md natively (`@AGENTS.md`):
 * Claude Code loads CLAUDE.md, not AGENTS.md, so the import is what puts the project contract in context.
 * Written by scaffold, `harness sync` / `update` / `agents` (create-if-missing when `claude-code` is active),
 * and `harness agents-md`. A file that still equals a legacy stub is upgraded in place.
 */
export const CLAUDE_MD_CONTENT = `\
# Claude Code entry

@AGENTS.md

\`AGENTS.md\` (imported above) is the project contract — follow its First action, routing, and hard stops.

- Project rules from \`.nextstage-harness/rules/\` reach Claude Code through \`.claude/rules/\`: always-on rules are already in context, path-scoped ones load when you touch matching files. Read a canonical rule file only when its \`.claude/rules/\` adapter is missing.
- When \`AGENTS.local.md\` exists beside \`AGENTS.md\` (any case), read it once at session start; it overrides \`AGENTS.md\`.
- Project subagents live in \`.claude/agents/\`. Spawn them only when the user asks (see AGENTS.md → Project subagents).
- If a file that AGENTS.md requires is missing, ask the human before continuing.
`;

/** Previous stubs written by older harness versions — upgraded in place when found unchanged. */
export const LEGACY_CLAUDE_MD_CONTENTS = [
  `\
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
`,
];

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
  '/docs/',
  '/.agents/',
  '/.claude/',
  '/.cursor/',
  '/.gitlab/',
  '/.nextstage-harness/',
  '/AGENTS.md',
  '/AGENTS.local.md',
  '/CLAUDE.md',
  '/skills-lock.json',
  '/.worktrees/',
  '/.git',
  '/.vscode',
  '/docker',
  '/tests',
  '/.env.example',
  '/.env.testing',
  '/phpstan.neon',
  '/phpunit.xml',
  '/README.md',
  '/.gitlab-ci.yml',
  '/.dockerignore',
];

export const GITIGNORE_BLOCK_HEADER = '# Nextstage-harness ignore files';

/** Paths excluded from git (managed by harness sync). */
export const GITIGNORE_ENTRIES = [
  '/.agents/skills/ns-*',
  '/.agents/rules/',
  '/skills-lock.json',
  '/AGENTS.local.md',
  '/.worktrees/',
  '/.cursor/rules/',
  '/.cursor/agents/',
  '/.claude/skills/',
  '/.claude/agents/',
  '/.claude/rules/',
  '/.claude/worktrees/',
  '/.claude/settings.local.json',
];

/**
 * Entries older harness versions wrote to the managed gitignore block; removed on sync.
 * `/.claude/` blocked team-shared `.claude/settings.json` (permissions, hooks) — now only generated paths are ignored.
 */
export const LEGACY_GITIGNORE_ENTRIES = ['/.claude/'];
