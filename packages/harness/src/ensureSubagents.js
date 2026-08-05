import { existsSync, writeFileSync } from 'node:fs';
import { listInstalledSkillNames } from './prepare.js';
import { loadManifest, manifestPath } from './manifest.js';
import { DEFAULT_SUBAGENTS } from './subagentsCatalog.js';

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
  return {
    name: def.name,
    skill: def.skill,
    description: def.description,
    model: { ...def.model },
    readonly: Boolean(def.readonly),
  };
}

function normalizeReadonly(value, fallback) {
  if (typeof value === 'boolean') return value;
  return Boolean(fallback);
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
    return { seeded: [], subagents: [], written: false };
  }

  const manifest = loadManifest(projectRoot);
  if (!manifest) {
    return { seeded: [], subagents: [], written: false };
  }

  const before = JSON.stringify(manifest);
  const installed = new Set(listInstalledSkillNames(projectRoot));
  const existing = Array.isArray(manifest.subagents) ? [...manifest.subagents] : [];
  const byName = new Map(
    existing.filter((entry) => entry?.name).map((entry) => [entry.name, entry]),
  );
  const seeded = [];

  for (const def of DEFAULT_SUBAGENTS) {
    if (!installed.has(def.skill)) continue;

    const current = byName.get(def.name);
    if (!current) {
      const entry = cloneEntry(def);
      existing.push(entry);
      byName.set(def.name, entry);
      seeded.push(def.name);
      continue;
    }

    current.skill = def.skill;
    if (!current.description) {
      current.description = def.description;
    }
    current.model = normalizeModel(current.model, def.model);
    current.readonly = normalizeReadonly(current.readonly, def.readonly);
  }

  manifest.subagents = existing;

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
