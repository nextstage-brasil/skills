import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { absorbOrphanCursorRules } from './absorbCursorRules.js';
import { HARNESS_ROOT } from './agentsLayout.js';
import {
  GENERATION_MARKER,
  HASH_PATTERN,
  RULE_BODY_ONLY_HINT,
  ensureRuleBodyHint,
  hasRuleBodyHint,
  stripFrontmatter,
  stripRuleBodyHint,
} from './ruleBody.js';

export {
  GENERATION_MARKER,
  HASH_PATTERN,
  RULE_BODY_ONLY_HINT,
  ensureRuleBodyHint,
  hasRuleBodyHint,
  stripFrontmatter,
  stripRuleBodyHint,
};

export const SYNC_MANAGED_PATTERN =
  /<!-- harness-sync-managed: last-sync=[^>]+ -->/;

export function hashBody(body) {
  return createHash('sha256').update(body.trimEnd(), 'utf8').digest('hex');
}

/**
 * Cursor adapters need description ("when to apply") plus an apply mode:
 * alwaysApply true|false, or globs (not both alwaysApply true and globs).
 * Incomplete manifest entries produce adapters with empty frontmatter — silent no-op in Cursor.
 * @param {{ name?: string, cursor?: { description?: string, alwaysApply?: boolean, globs?: string } }} rule
 */
export function assertCursorRuleMeta(rule) {
  const name = rule.name ?? '(unnamed)';
  const cursor = rule.cursor ?? {};
  const description =
    typeof cursor.description === 'string' ? cursor.description.trim() : '';
  if (!description) {
    throw new Error(
      `Rule "${name}": cursor.description required (Cursor "when to apply" header). Prefer: harness add-rule ${name} --description "…"`,
    );
  }
  const hasAlwaysKey = Object.prototype.hasOwnProperty.call(cursor, 'alwaysApply');
  const alwaysApply = cursor.alwaysApply === true;
  const hasGlobs = Boolean(cursor.globs && String(cursor.globs).trim());
  if (alwaysApply && hasGlobs) {
    throw new Error(
      `Rule "${name}": cursor.alwaysApply: true and cursor.globs are mutually exclusive`,
    );
  }
  if (!hasAlwaysKey && !hasGlobs) {
    throw new Error(
      `Rule "${name}": set cursor.alwaysApply (true|false) or cursor.globs — otherwise Cursor has no apply mode`,
    );
  }
}

function buildCursorFrontmatter(rule) {
  assertCursorRuleMeta(rule);
  const cursor = rule.cursor ?? {};
  const lines = ['---'];
  lines.push(`description: ${cursor.description}`);
  if (Object.prototype.hasOwnProperty.call(cursor, 'alwaysApply')) {
    lines.push(`alwaysApply: ${cursor.alwaysApply === true}`);
  }
  if (cursor.globs) {
    lines.push(`globs: ${cursor.globs}`);
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

function buildClaudeFrontmatter(rule) {
  const paths = rule.claude?.paths;
  if (paths == null) {
    return '';
  }
  const lines = ['---', 'paths:'];
  for (const path of paths) {
    lines.push(`  - ${path}`);
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

export function buildAdapterBody(body, hash) {
  const forAgent = stripRuleBodyHint(body);
  return `${GENERATION_MARKER}\n<!-- harness-sync:sha256=${hash} -->\n\n${forAgent}`;
}

export function buildCursorAdapter(rule, body, hash) {
  return `${buildCursorFrontmatter(rule)}${buildAdapterBody(body, hash)}`;
}

export function buildClaudeAdapter(rule, body, hash) {
  return `${buildClaudeFrontmatter(rule)}${buildAdapterBody(body, hash)}`;
}

export function readAdapterHash(adapterContent) {
  const match = adapterContent.match(HASH_PATTERN);
  return match?.[1] ?? null;
}

export function updateAgentsSyncMarker(projectRoot, timestamp = new Date().toISOString()) {
  const agentsPath = join(projectRoot, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    return;
  }
  const marker = `<!-- harness-sync-managed: last-sync=${timestamp} -->`;
  const content = readFileSync(agentsPath, 'utf8');
  if (SYNC_MANAGED_PATTERN.test(content)) {
    writeFileSync(agentsPath, content.replace(SYNC_MANAGED_PATTERN, marker), 'utf8');
    return;
  }
  if (content.includes('<!-- harness-sync-managed:')) {
    return;
  }
}

export function syncRules(projectRoot, options = {}) {
  const {
    agents = ['cursor', 'claude-code'],
    check = false,
    updateAgentsMarker = !check,
    absorbWarn = (msg) => console.warn(msg),
  } = options;

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const manifestPath = join(harnessRoot, 'manifest.json');

  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing ${HARNESS_ROOT}/manifest.json — run harness init or scaffold first`,
    );
  }

  let manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.rules)) {
    throw new Error('Invalid manifest: rules array required');
  }

  const drifts = [];
  const written = [];
  const absorbed = [];

  // Absorb orphan Cursor UI rules before regenerating adapters.
  // check mode: do not write; treat orphans as drift so CI catches unsynced hand-rules.
  const absorbResult = absorbOrphanCursorRules(projectRoot, manifest, {
    write: !check,
    warn: absorbWarn,
  });
  if (check) {
    for (const orphanPath of absorbResult.orphans) {
      drifts.push(orphanPath);
    }
  } else {
    absorbed.push(...absorbResult.absorbed);
    manifest = absorbResult.manifest;
  }

  for (const rule of manifest.rules) {
    const canonicalPath = join(harnessRoot, rule.canonical);
    if (!existsSync(canonicalPath)) {
      throw new Error(`Canonical rule missing: ${rule.canonical}`);
    }

    const raw = readFileSync(canonicalPath, 'utf8');
    const stripped = stripFrontmatter(raw);
    const body = ensureRuleBodyHint(stripped);
    if (!check && !hasRuleBodyHint(stripped)) {
      writeFileSync(
        canonicalPath,
        body.endsWith('\n') ? body : `${body}\n`,
        'utf8',
      );
    }
    const hash = hashBody(body);

    if (agents.includes('cursor')) {
      const adapterPath = join(projectRoot, '.cursor', 'rules', `${rule.name}.mdc`);
      const expected = buildCursorAdapter(rule, body, hash);
      if (check) {
        if (!existsSync(adapterPath)) {
          drifts.push(adapterPath);
        } else {
          const current = readFileSync(adapterPath, 'utf8');
          const currentHash = readAdapterHash(current);
          if (currentHash !== hash) {
            drifts.push(adapterPath);
          }
        }
      } else {
        mkdirSync(join(projectRoot, '.cursor', 'rules'), { recursive: true });
        writeFileSync(adapterPath, expected, 'utf8');
        written.push(adapterPath);
      }
    }

    if (agents.includes('claude-code')) {
      const adapterPath = join(projectRoot, '.claude', 'rules', `${rule.name}.md`);
      const expected = buildClaudeAdapter(rule, body, hash);
      if (check) {
        if (!existsSync(adapterPath)) {
          drifts.push(adapterPath);
        } else {
          const current = readFileSync(adapterPath, 'utf8');
          const currentHash = readAdapterHash(current);
          if (currentHash !== hash) {
            drifts.push(adapterPath);
          }
        }
      } else {
        mkdirSync(join(projectRoot, '.claude', 'rules'), { recursive: true });
        writeFileSync(adapterPath, expected, 'utf8');
        written.push(adapterPath);
      }
    }
  }

  if (!check && updateAgentsMarker) {
    updateAgentsSyncMarker(projectRoot);
  }

  return {
    ok: drifts.length === 0,
    drifts,
    written,
    absorbed,
    check,
  };
}
