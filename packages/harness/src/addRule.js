import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_AGENTS, HARNESS_ROOT, HARNESS_RULES_DIR } from './agentsLayout.js';
import { ensureRuleBodyHint, syncRules } from './syncRules.js';

const RULE_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function loadManifest(harnessRoot) {
  const manifestPath = join(harnessRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing ${HARNESS_ROOT}/manifest.json — run harness init first`,
    );
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

function titleFromName(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildStub({ name, description }) {
  const title = titleFromName(name);
  const descBlock = description
    ? `\n${description}\n`
    : '\nDescribe when this rule applies and what agents must follow.\n';
  return ensureRuleBodyHint(`# ${title}
${descBlock}
## Requirements

- …

## Examples

- …
`);
}

function buildManifestEntry({ name, description, globs, alwaysApply = false }) {
  const entry = {
    name,
    canonical: `rules/${name}.md`,
    cursor: {},
    claude: { paths: null },
  };

  if (description) {
    entry.cursor.description = description;
  }

  if (globs) {
    entry.cursor.globs = globs;
    const paths = globs
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    entry.claude.paths = paths.length > 0 ? paths : null;
  } else {
    entry.cursor.alwaysApply = alwaysApply === true;
  }

  return entry;
}

/**
 * Create a canonical rule, register it in manifest.json, and sync adapters.
 * @param {string} projectRoot
 * @param {{ name: string, description?: string, globs?: string, alwaysApply?: boolean, force?: boolean, agents?: string[] }} options
 */
export function addRule(projectRoot, options) {
  const {
    name,
    description,
    globs,
    alwaysApply = false,
    force = false,
    agents = DEFAULT_AGENTS,
  } = options;

  if (!name || typeof name !== 'string') {
    throw new Error('Rule name is required (e.g. api-conventions)');
  }
  if (!RULE_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid rule name "${name}" — use kebab-case (e.g. api-conventions)`,
    );
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new Error(
      'Rule --description is required (Cursor "when to apply" header). Example: --description "NsUtil constraints when editing ns-util-dependent code"',
    );
  }

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const rulesDir = join(projectRoot, HARNESS_RULES_DIR);
  const canonicalRel = `rules/${name}.md`;
  const canonicalPath = join(harnessRoot, 'rules', `${name}.md`);

  if (!existsSync(join(harnessRoot, 'manifest.json'))) {
    throw new Error(
      `Missing ${HARNESS_ROOT}/manifest.json — run harness init first`,
    );
  }

  mkdirSync(rulesDir, { recursive: true });

  const existed = existsSync(canonicalPath);
  if (existed && !force) {
    throw new Error(
      `${HARNESS_ROOT}/${canonicalRel} already exists — use --force to overwrite`,
    );
  }

  const desc = description.trim();
  writeFileSync(
    canonicalPath,
    buildStub({ name, description: desc }),
    'utf8',
  );

  const manifest = loadManifest(harnessRoot);
  if (!Array.isArray(manifest.rules)) {
    manifest.rules = [];
  }

  const entry = buildManifestEntry({
    name,
    description: desc,
    globs: globs || undefined,
    alwaysApply,
  });

  const existingIdx = manifest.rules.findIndex((r) => r.name === name);
  if (existingIdx >= 0) {
    manifest.rules[existingIdx] = entry;
  } else {
    manifest.rules.push(entry);
  }

  saveManifest(harnessRoot, manifest);
  const syncResult = syncRules(projectRoot, { agents });

  return {
    name,
    canonical: `${HARNESS_ROOT}/${canonicalRel}`,
    createdFile: !existed,
    overwritten: existed && force,
    syncResult,
  };
}
