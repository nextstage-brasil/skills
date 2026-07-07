import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { HARNESS_ROOT, HARNESS_RULES_DIR } from './agentsLayout.js';
import { stripFrontmatter, syncRules } from './syncRules.js';

function parseFrontmatter(content) {
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
  const body = content.slice(end + 5);
  return { frontmatter, body };
}

function ruleNameFromFile(filename) {
  return basename(filename, extname(filename));
}

function buildManifestEntry(name, frontmatter) {
  const entry = {
    name,
    canonical: `rules/${name}.md`,
    cursor: {},
    claude: { paths: null },
  };

  if (frontmatter.alwaysApply === true || frontmatter.alwaysApply === 'true') {
    entry.cursor.alwaysApply = true;
    if (frontmatter.description) {
      entry.cursor.description = String(frontmatter.description);
    }
  } else if (frontmatter.globs) {
    entry.cursor.globs = String(frontmatter.globs);
    const globs = String(frontmatter.globs)
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    entry.claude.paths = globs.length > 0 ? globs : null;
  }

  if (frontmatter.description && !entry.cursor.description) {
    entry.cursor.description = String(frontmatter.description);
  }

  return entry;
}

function loadManifest(harnessRoot) {
  const manifestPath = join(harnessRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return { version: 1, rules: [] };
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function saveManifest(harnessRoot, manifest) {
  writeFileSync(
    join(harnessRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

export function migrateRules(projectRoot, options = {}) {
  const { force = false, agents = ['cursor', 'claude-code'] } = options;
  const cursorRulesDir = join(projectRoot, '.cursor', 'rules');

  if (!existsSync(cursorRulesDir)) {
    throw new Error('No legacy .cursor/rules/ directory found');
  }

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const rulesDir = join(projectRoot, HARNESS_RULES_DIR);
  mkdirSync(rulesDir, { recursive: true });
  mkdirSync(join(harnessRoot, 'docs'), { recursive: true });

  const manifest = loadManifest(harnessRoot);
  const migrated = [];
  const skipped = [];

  const files = readdirSync(cursorRulesDir).filter((f) => f.endsWith('.mdc'));
  if (files.length === 0) {
    throw new Error('No .mdc files found in .cursor/rules/');
  }

  for (const file of files) {
    const name = ruleNameFromFile(file);
    const canonicalRel = `rules/${name}.md`;
    const canonicalPath = join(harnessRoot, canonicalRel);
    const sourcePath = join(cursorRulesDir, file);
    const source = readFileSync(sourcePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(source);
    const canonicalBody = stripFrontmatter(body).trimStart();

    if (existsSync(canonicalPath) && !force) {
      skipped.push(canonicalRel);
    } else {
      writeFileSync(canonicalPath, `${canonicalBody}\n`, 'utf8');
      migrated.push(canonicalRel);
    }

    const existingIdx = manifest.rules.findIndex((r) => r.name === name);
    const entry = buildManifestEntry(name, frontmatter);
    if (existingIdx >= 0) {
      manifest.rules[existingIdx] = entry;
    } else {
      manifest.rules.push(entry);
    }
  }

  saveManifest(harnessRoot, manifest);
  const syncResult = syncRules(projectRoot, { agents });

  return { migrated, skipped, syncResult };
}
