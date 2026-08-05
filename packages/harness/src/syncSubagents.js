import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { GENERATION_MARKER, HASH_PATTERN, hashBody } from './syncRules.js';
import { ensureSubagents, resolvableSubagents } from './ensureSubagents.js';
import { HARNESS_ROOT } from './agentsLayout.js';

export function buildSubagentBody(entry) {
  const skillPath = `.agents/skills/${entry.skill}/SKILL.md`;
  return `# ${entry.name}

Thin skill bridge — do not invent a separate workflow. The skill below is the source of truth.

1. Read \`AGENTS.md\` at the product root in full (and \`agents.local.md\` if present).
2. Read \`.nextstage-harness/rules/architecture-rules.md\` when that file exists.
3. Read and follow \`${skillPath}\` in full — run that skill's workflow exactly.
4. Honor every gate, handoff, and review contract defined in the skill. Do not substitute platform Task personas for named skill steps.
`;
}

function yamlQuote(value) {
  const text = String(value ?? '');
  if (/[:#{}[\],&*!|>'"%@`]/.test(text) || text.includes('\n')) {
    return JSON.stringify(text);
  }
  return text;
}

export function buildCursorSubagentAdapter(entry, body, hash) {
  const model = entry.model?.cursor ?? 'inherit';
  const readonly = Boolean(entry.readonly);
  const lines = [
    '---',
    `name: ${entry.name}`,
    `description: ${yamlQuote(entry.description ?? entry.name)}`,
    `model: ${model}`,
    `readonly: ${readonly}`,
    '---',
    '',
    GENERATION_MARKER,
    `<!-- harness-sync:sha256=${hash} -->`,
    '',
    body.trimStart(),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

export function buildClaudeSubagentAdapter(entry, body, hash) {
  const model = entry.model?.claude ?? 'inherit';
  const readonly = Boolean(entry.readonly);
  const lines = [
    '---',
    `name: ${entry.name}`,
    `description: ${yamlQuote(entry.description ?? entry.name)}`,
    `model: ${model}`,
    `readonly: ${readonly}`,
    '---',
    '',
    GENERATION_MARKER,
    `<!-- harness-sync:sha256=${hash} -->`,
    '',
    body.trimStart(),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

function adapterDir(projectRoot, agentId) {
  if (agentId === 'cursor') return join(projectRoot, '.cursor', 'agents');
  if (agentId === 'claude-code') return join(projectRoot, '.claude', 'agents');
  return null;
}

function isHarnessManagedAdapter(content) {
  return content.includes(GENERATION_MARKER) || HASH_PATTERN.test(content);
}

function pruneStaleAdapters(dir, expectedNames, check) {
  const drifts = [];
  const removed = [];
  if (!existsSync(dir)) {
    return { drifts, removed };
  }

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const name = file.slice(0, -3);
    if (expectedNames.has(name)) continue;
    const path = join(dir, file);
    const content = readFileSync(path, 'utf8');
    if (!isHarnessManagedAdapter(content)) continue;
    if (check) {
      drifts.push(path);
    } else {
      unlinkSync(path);
      removed.push(path);
    }
  }

  return { drifts, removed };
}

/**
 * Generate Cursor/Claude project subagent adapters from manifest.subagents.
 * Seeds missing default entries first; never resets project-owned model values.
 */
export function syncSubagents(projectRoot, options = {}) {
  const {
    agents = ['cursor', 'claude-code'],
    check = false,
  } = options;

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const manifestPath = join(harnessRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return { ok: true, drifts: [], written: [], removed: [], seeded: [], check };
  }

  const ensureResult = check
    ? ensureSubagents(projectRoot, { write: false })
    : ensureSubagents(projectRoot, { write: true });

  const active = check
    ? resolvableSubagents(projectRoot)
    : ensureResult.subagents.filter((entry) =>
      ensureResult.installed.includes(entry.skill),
    );

  const expectedNames = new Set(active.map((entry) => entry.name));
  const drifts = [];
  const written = [];
  const removed = [];

  for (const entry of active) {
    const body = buildSubagentBody(entry);
    const hash = hashBody(body);

    if (agents.includes('cursor')) {
      const dir = adapterDir(projectRoot, 'cursor');
      const adapterPath = join(dir, `${entry.name}.md`);
      const expected = buildCursorSubagentAdapter(entry, body, hash);
      if (check) {
        if (!existsSync(adapterPath) || readFileSync(adapterPath, 'utf8') !== expected) {
          drifts.push(adapterPath);
        }
      } else {
        mkdirSync(dir, { recursive: true });
        writeFileSync(adapterPath, expected, 'utf8');
        written.push(adapterPath);
      }
    }

    if (agents.includes('claude-code')) {
      const dir = adapterDir(projectRoot, 'claude-code');
      const adapterPath = join(dir, `${entry.name}.md`);
      const expected = buildClaudeSubagentAdapter(entry, body, hash);
      if (check) {
        if (!existsSync(adapterPath) || readFileSync(adapterPath, 'utf8') !== expected) {
          drifts.push(adapterPath);
        }
      } else {
        mkdirSync(dir, { recursive: true });
        writeFileSync(adapterPath, expected, 'utf8');
        written.push(adapterPath);
      }
    }
  }

  if (agents.includes('cursor')) {
    const pruned = pruneStaleAdapters(adapterDir(projectRoot, 'cursor'), expectedNames, check);
    drifts.push(...pruned.drifts);
    removed.push(...pruned.removed);
  }
  if (agents.includes('claude-code')) {
    const pruned = pruneStaleAdapters(
      adapterDir(projectRoot, 'claude-code'),
      expectedNames,
      check,
    );
    drifts.push(...pruned.drifts);
    removed.push(...pruned.removed);
  }

  return {
    ok: drifts.length === 0,
    drifts,
    written,
    removed,
    seeded: ensureResult.seeded,
    check,
  };
}
