import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENTS_SKILLS_DIR,
  DEFAULT_AGENTS,
  HARNESS_AGENTS_DIR,
  HARNESS_ROOT,
} from './agentsLayout.js';
import { loadManifest, manifestPath } from './manifest.js';
import { defaultSubagentByName } from './subagentsCatalog.js';
import {
  buildDefaultSubagentBody,
  ensureSubagentCanonicalFiles,
  normalizeSubagentCanonical,
} from './subagentCanonical.js';
import { syncSubagents } from './syncSubagents.js';

const SUBAGENT_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function saveManifest(projectRoot, manifest) {
  writeFileSync(manifestPath(projectRoot), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function skillIsInstalled(projectRoot, skill) {
  return existsSync(join(projectRoot, AGENTS_SKILLS_DIR, skill, 'SKILL.md'));
}

/**
 * Create a canonical subagent body, register manifest metadata, and sync adapters.
 */
export function addSubagent(projectRoot, options) {
  const {
    name,
    skill,
    description,
    readonly,
    force = false,
    agents = DEFAULT_AGENTS,
  } = options;

  if (!name || typeof name !== 'string') {
    throw new Error('Subagent name is required (e.g. investigator-agent)');
  }
  if (!SUBAGENT_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid subagent name "${name}" — use kebab-case (e.g. investigator-agent)`,
    );
  }
  if (!skill || typeof skill !== 'string') {
    throw new Error('--skill is required (installed skill id, e.g. ns-code-investigator)');
  }
  if (!existsSync(manifestPath(projectRoot))) {
    throw new Error(`Missing ${HARNESS_ROOT}/manifest.json — run harness init first`);
  }
  if (!skillIsInstalled(projectRoot, skill)) {
    throw new Error(
      `Skill "${skill}" is not installed under ${AGENTS_SKILLS_DIR}/ — run harness init or --skill first`,
    );
  }

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const manifest = loadManifest(projectRoot);
  if (!manifest) {
    throw new Error(`Missing ${HARNESS_ROOT}/manifest.json — run harness init first`);
  }

  const catalogDefault = defaultSubagentByName(name);
  const entry = normalizeSubagentCanonical({
    name,
    skill,
    description:
      description
      ?? catalogDefault?.description
      ?? `Thin bridge to ${skill}`,
    model: catalogDefault?.model ?? { cursor: 'inherit', claude: 'inherit' },
    readonly: typeof readonly === 'boolean' ? readonly : Boolean(catalogDefault?.readonly),
  });

  const canonicalPath = join(harnessRoot, entry.canonical);
  const existed = existsSync(canonicalPath);
  if (existed && !force) {
    throw new Error(
      `${HARNESS_AGENTS_DIR}/${name}.md already exists — use --force to overwrite body`,
    );
  }

  if (!existed || force) {
    writeFileSync(canonicalPath, buildDefaultSubagentBody(entry), 'utf8');
  }

  if (!Array.isArray(manifest.subagents)) {
    manifest.subagents = [];
  }

  const existingIdx = manifest.subagents.findIndex((item) => item.name === name);
  if (existingIdx >= 0) {
    const current = manifest.subagents[existingIdx];
    manifest.subagents[existingIdx] = {
      ...entry,
      model: current.model ?? entry.model,
      readonly:
        typeof current.readonly === 'boolean' ? current.readonly : entry.readonly,
    };
  } else {
    manifest.subagents.push(entry);
  }

  saveManifest(projectRoot, manifest);
  ensureSubagentCanonicalFiles(harnessRoot, manifest.subagents);
  const syncResult = syncSubagents(projectRoot, { agents });

  return {
    name,
    skill,
    canonical: `${HARNESS_ROOT}/${entry.canonical}`,
    createdFile: !existed,
    overwritten: existed && force,
    syncResult,
  };
}
