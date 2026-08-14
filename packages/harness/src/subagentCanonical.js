import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HARNESS_ROOT } from './agentsLayout.js';

export function subagentCanonicalRel(entry) {
  if (entry?.canonical) {
    return entry.canonical;
  }
  if (entry?.name) {
    return `agents/${entry.name}.md`;
  }
  throw new Error('Subagent entry requires a name');
}

export function buildDefaultSubagentBody(entry) {
  const workflowPath = entry.skillReference
    ? `.agents/skills/${entry.skill}/${entry.skillReference}`
    : `.agents/skills/${entry.skill}/SKILL.md`;
  return `# ${entry.name}

Thin skill bridge — do not invent a separate workflow. The skill below is the source of truth.

1. Obey \`AGENTS.md\` already in host context — **do not** tool-Read it. Complete Session boot per \`.agents/skills/ns-harness/references/session-boot.md\` (\`agents.local.md\` + \`.nextstage-harness/rules/\` only).
2. Read and follow \`${workflowPath}\` in full — run that skill's workflow exactly (skill finishes remaining Session boot steps when not yet done).
3. Honor every gate, handoff, and review contract defined in the skill. Do not substitute platform Task personas for named skill steps.
`;
}

/**
 * Ensure manifest entries have canonical paths and on-disk bodies under agents/.
 */
export function normalizeSubagentCanonical(entry) {
  if (!entry?.name) {
    return entry;
  }
  if (!entry.canonical) {
    entry.canonical = subagentCanonicalRel(entry);
  }
  return entry;
}

export function ensureSubagentCanonicalFiles(harnessRoot, entries, options = {}) {
  const { force = false } = options;
  const agentsDir = join(harnessRoot, 'agents');
  mkdirSync(agentsDir, { recursive: true });

  const created = [];
  const skipped = [];

  for (const entry of entries) {
    if (!entry?.name || !entry?.skill) continue;

    normalizeSubagentCanonical(entry);
    const canonicalPath = join(harnessRoot, entry.canonical);
    if (existsSync(canonicalPath) && !force) {
      skipped.push(entry.canonical);
      continue;
    }

    writeFileSync(canonicalPath, buildDefaultSubagentBody(entry), 'utf8');
    created.push(entry.canonical);
  }

  return { created, skipped };
}

export function readSubagentCanonicalBody(harnessRoot, entry) {
  const rel = subagentCanonicalRel(entry);
  const canonicalPath = join(harnessRoot, rel);
  if (!existsSync(canonicalPath)) {
    throw new Error(`Canonical subagent missing: ${HARNESS_ROOT}/${rel}`);
  }
  return readFileSync(canonicalPath, 'utf8');
}

/** @deprecated use buildDefaultSubagentBody */
export const buildSubagentBody = buildDefaultSubagentBody;
