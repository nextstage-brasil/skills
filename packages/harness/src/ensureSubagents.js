import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listInstalledSkillNames } from './prepare.js';
import { loadManifest, manifestPath } from './manifest.js';
import { DEFAULT_SUBAGENTS } from './subagentsCatalog.js';
import {
  buildDefaultSubagentBody,
  ensureSubagentCanonicalFiles,
  normalizeSubagentCanonical,
  subagentCanonicalRel,
} from './subagentCanonical.js';
import { HARNESS_ROOT } from './agentsLayout.js';

function normalizeModel(model, fallback) {
  const base = {
    cursor: fallback?.cursor ?? 'inherit',
    claude: fallback?.claude ?? 'inherit',
  };
  if (!model || typeof model !== 'object') {
    return base;
  }
  return {
    cursor: typeof model.cursor === 'string' && model.cursor ? model.cursor : base.cursor,
    claude: typeof model.claude === 'string' && model.claude ? model.claude : base.claude,
  };
}

function cloneEntry(def) {
  const entry = {
    name: def.name,
    skill: def.skill,
    description: def.description,
    model: { ...def.model },
    readonly: Boolean(def.readonly),
  };
  if (def.skillReference) {
    entry.skillReference = def.skillReference;
  }
  return normalizeSubagentCanonical(entry);
}

function normalizeReadonly(value, fallback) {
  if (typeof value === 'boolean') return value;
  return Boolean(fallback);
}

const catalogByName = new Map(DEFAULT_SUBAGENTS.map((def) => [def.name, def]));

function catalogBodyForEntry(def, entry) {
  return buildDefaultSubagentBody({
    ...entry,
    name: def.name,
    skill: def.skill,
    skillReference: def.skillReference,
  });
}

function canonicalBodyStale(harnessRoot, def, entry) {
  const canonicalPath = join(harnessRoot, subagentCanonicalRel(entry));
  const expected = catalogBodyForEntry(def, entry);
  if (!existsSync(canonicalPath)) {
    return true;
  }
  return readFileSync(canonicalPath, 'utf8') !== expected;
}

/**
 * Seed manifest.subagents for installed default skills.
 * Never overwrites an existing entry's model (project owns model).
 * Fills missing `readonly` from catalog defaults; preserves explicit project boolean.
 */
export function ensureSubagents(projectRoot, options = {}) {
  const { write = true } = options;
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) {
    return { seeded: [], subagents: [], written: false, canonicalCreated: [] };
  }

  const manifest = loadManifest(projectRoot);
  if (!manifest) {
    return { seeded: [], subagents: [], written: false, canonicalCreated: [] };
  }

  const before = JSON.stringify(manifest);
  const installed = new Set(listInstalledSkillNames(projectRoot));
  const existing = Array.isArray(manifest.subagents) ? [...manifest.subagents] : [];
  const byName = new Map(
    existing.filter((entry) => entry?.name).map((entry) => [entry.name, entry]),
  );
  const seeded = [];
  const catalogBodyRefresh = new Set();

  for (const def of DEFAULT_SUBAGENTS) {
    if (!installed.has(def.skill)) continue;

    const current = byName.get(def.name);
    if (!current) {
      const entry = cloneEntry(def);
      existing.push(entry);
      byName.set(def.name, entry);
      seeded.push(def.name);
      catalogBodyRefresh.add(def.name);
      continue;
    }

    const skillChanged = current.skill !== def.skill;
    const refChanged = (current.skillReference ?? null) !== (def.skillReference ?? null);

    normalizeSubagentCanonical(current);
    current.skill = def.skill;
    if (def.skillReference) {
      current.skillReference = def.skillReference;
    } else {
      delete current.skillReference;
    }
    if (!current.description) {
      current.description = def.description;
    }
    current.model = normalizeModel(current.model, def.model);
    current.readonly = normalizeReadonly(current.readonly, def.readonly);

    if (skillChanged || refChanged) {
      catalogBodyRefresh.add(def.name);
    }
  }

  for (const entry of existing) {
    normalizeSubagentCanonical(entry);
  }

  manifest.subagents = existing;

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const managed = existing.filter(
    (entry) => entry?.skill && installed.has(entry.skill) && catalogByName.has(entry.name),
  );

  const { created: canonicalCreated } = ensureSubagentCanonicalFiles(harnessRoot, managed);

  const stale = managed.filter((entry) => {
    if (!catalogBodyRefresh.has(entry.name)) {
      return false;
    }
    const def = catalogByName.get(entry.name);
    return def && canonicalBodyStale(harnessRoot, def, entry);
  });
  if (stale.length > 0) {
    ensureSubagentCanonicalFiles(harnessRoot, stale, { force: true });
  }

  const after = JSON.stringify(manifest);
  let written = false;
  if (write && before !== after) {
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    written = true;
  }

  return {
    seeded,
    subagents: existing,
    written,
    canonicalCreated,
    installed: [...installed],
  };
}

/**
 * Subagents that should emit adapters (skill present on disk).
 */
export function resolvableSubagents(projectRoot) {
  const { subagents } = ensureSubagents(projectRoot, { write: false });
  const installed = new Set(listInstalledSkillNames(projectRoot));
  return subagents.filter((entry) => entry?.name && entry?.skill && installed.has(entry.skill));
}
