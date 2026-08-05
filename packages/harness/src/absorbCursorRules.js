import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { HARNESS_ROOT, HARNESS_RULES_DIR } from './agentsLayout.js';
import {
  ensureRuleBodyHint,
  stripAdapterNoise,
} from './ruleBody.js';

/**
 * Parse simple Cursor YAML frontmatter (key: value lines).
 * @param {string} content
 * @returns {{ frontmatter: Record<string, string|boolean>, body: string }}
 */
export function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, body: content };
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: {}, body: content };
  }
  const raw = content.slice(4, end);
  const frontmatter = {};
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    frontmatter[key] = value;
  }
  return { frontmatter, body: content.slice(end + 5) };
}

function ruleNameFromFile(filename) {
  return basename(filename, extname(filename));
}

/**
 * Map Cursor frontmatter into a manifest.rules entry (assertCursorRuleMeta-safe).
 * Prefer alwaysApply over globs when both set (warns to console).
 * @param {string} name
 * @param {Record<string, string|boolean>} frontmatter
 * @param {{ warn?: (msg: string) => void }} [options]
 */
export function buildManifestEntryFromFrontmatter(name, frontmatter, options = {}) {
  const warn = options.warn ?? ((msg) => console.warn(msg));
  const descriptionRaw =
    typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '';
  const description = descriptionRaw || `Project rule: ${name}`;

  const alwaysTrue =
    frontmatter.alwaysApply === true || frontmatter.alwaysApply === 'true';
  const alwaysFalse =
    frontmatter.alwaysApply === false || frontmatter.alwaysApply === 'false';
  const hasAlwaysKey = alwaysTrue || alwaysFalse;
  const globsRaw =
    frontmatter.globs != null && String(frontmatter.globs).trim()
      ? String(frontmatter.globs).trim()
      : '';

  const entry = {
    name,
    canonical: `rules/${name}.md`,
    cursor: { description },
    claude: { paths: null },
  };

  if (alwaysTrue && globsRaw) {
    warn(
      `Rule "${name}": alwaysApply: true and globs both set — keeping alwaysApply, dropping globs`,
    );
  }

  if (alwaysTrue) {
    entry.cursor.alwaysApply = true;
    return entry;
  }

  if (globsRaw) {
    entry.cursor.globs = globsRaw;
    if (hasAlwaysKey) {
      entry.cursor.alwaysApply = false;
    }
    const paths = globsRaw
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    entry.claude.paths = paths.length > 0 ? paths : null;
    return entry;
  }

  entry.cursor.alwaysApply = false;
  return entry;
}

/**
 * Find `.cursor/rules/*.mdc` basenames not listed in `manifest.rules`.
 * @param {string} projectRoot
 * @param {{ rules?: Array<{ name?: string }> }} manifest
 * @returns {string[]} absolute paths to orphan .mdc files
 */
export function listOrphanCursorRules(projectRoot, manifest) {
  const cursorRulesDir = join(projectRoot, '.cursor', 'rules');
  if (!existsSync(cursorRulesDir)) {
    return [];
  }
  const registered = new Set(
    (manifest.rules ?? []).map((r) => r.name).filter(Boolean),
  );
  return readdirSync(cursorRulesDir)
    .filter((f) => f.endsWith('.mdc'))
    .map((f) => ({ name: ruleNameFromFile(f), path: join(cursorRulesDir, f) }))
    .filter(({ name }) => !registered.has(name))
    .map(({ path }) => path);
}

/**
 * Absorb orphan Cursor `.mdc` rules into canonical + manifest.
 * Does not overwrite rules already in the manifest (canonical stays source of truth).
 * @param {string} projectRoot
 * @param {object} manifest
 * @param {{ write?: boolean, warn?: (msg: string) => void }} [options]
 * @returns {{ absorbed: string[], orphans: string[], manifest: object, dirty: boolean }}
 */
export function absorbOrphanCursorRules(projectRoot, manifest, options = {}) {
  const { write = true, warn } = options;
  const orphans = listOrphanCursorRules(projectRoot, manifest);
  const absorbed = [];

  if (orphans.length === 0) {
    return { absorbed, orphans, manifest, dirty: false };
  }

  if (!write) {
    return { absorbed, orphans, manifest, dirty: false };
  }

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const rulesDir = join(projectRoot, HARNESS_RULES_DIR);
  mkdirSync(rulesDir, { recursive: true });

  if (!Array.isArray(manifest.rules)) {
    manifest.rules = [];
  }

  for (const orphanPath of orphans) {
    const name = ruleNameFromFile(orphanPath);
    if (manifest.rules.some((r) => r.name === name)) {
      throw new Error(
        `Invariant broken: orphan "${name}" already in manifest.rules`,
      );
    }

    const source = readFileSync(orphanPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(source);
    const canonicalBody = ensureRuleBodyHint(stripAdapterNoise(body));
    const canonicalRel = `rules/${name}.md`;
    const canonicalPath = join(harnessRoot, canonicalRel);

    writeFileSync(
      canonicalPath,
      canonicalBody.endsWith('\n') ? canonicalBody : `${canonicalBody}\n`,
      'utf8',
    );

    manifest.rules.push(buildManifestEntryFromFrontmatter(name, frontmatter, { warn }));
    absorbed.push(name);
  }

  writeFileSync(
    join(harnessRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return { absorbed, orphans, manifest, dirty: absorbed.length > 0 };
}
