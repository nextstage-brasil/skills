import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listPresetAliases,
  resolvePreset,
  skillIdFromInclude,
  resolveRepoRoot,
  loadPresetFile,
} from './presets.js';
import { assertHarnessCompatible } from './harnessVersion.js';
import { readRequiresHarness } from './skillManifest.js';
import { resolveSkillMd } from './resolveSkillPath.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(__dirname, '..', 'templates', 'catalog.json');

let cached;

export function loadCatalog() {
  if (!cached) {
    cached = JSON.parse(readFileSync(catalogPath, 'utf8'));
  }
  return cached;
}

export function allSkillNames() {
  const { depends } = loadCatalog();
  return Object.keys(depends).sort();
}

export function alwaysInstallSkills() {
  const { alwaysInstall = [] } = loadCatalog();
  return [...alwaysInstall];
}

export function resolveDepends(selected) {
  const { depends } = loadCatalog();
  const result = new Set([...alwaysInstallSkills(), ...selected]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const skill of [...result]) {
      for (const dep of depends[skill] ?? []) {
        if (!result.has(dep)) {
          result.add(dep);
          changed = true;
        }
      }
    }
  }

  return [...result].sort();
}

function catalogPresetIds() {
  const { presets = {} } = loadCatalog();
  return new Set(Object.keys(presets));
}

function indexedPresetIds() {
  try {
    return new Set(listPresetAliases().map((entry) => entry.id));
  } catch {
    return new Set();
  }
}

function presetFromIndexed(alias) {
  let resolved;
  try {
    resolved = resolvePreset(alias);
  } catch {
    return null;
  }
  if (!resolved) return null;

  const seedIds = resolved.includes.map(skillIdFromInclude);
  return {
    id: alias,
    name: resolved.name,
    label: resolved.description,
    description: resolved.description,
    requires_harness: resolved.requires_harness,
    includes: resolved.includes,
    warnings: resolved.warnings,
    skills: resolveDepends(seedIds),
  };
}

export function listPresets() {
  const indexed = listPresetAliases();
  const seenFiles = new Set();
  const result = [];

  for (const alias of indexed) {
    if (seenFiles.has(alias.filePath)) continue;
    seenFiles.add(alias.filePath);
    const doc = loadPresetFile(resolveRepoRoot(), alias.filePath);
    const preset = presetFromIndexed(alias.id);
    if (!preset) continue;
    preset.id = doc.name;
    preset.name = doc.name;
    preset.label = doc.description;
    result.push(preset);
  }

  const legacyIds = [...catalogPresetIds()].filter((id) => !indexedPresetIds().has(id));
  for (const id of legacyIds) {
    const preset = loadCatalog().presets[id];
    if (!preset) continue;
    result.push({
      id,
      name: id,
      label: preset.label ?? id,
      description: preset.description ?? '',
      skills: resolveDepends(preset.skills),
      includes: [],
      warnings: [],
    });
  }

  return result;
}

export function getPreset(id) {
  const indexed = presetFromIndexed(id);
  if (indexed) return indexed;

  const preset = loadCatalog().presets?.[id];
  if (!preset) return null;

  return {
    id,
    name: id,
    label: preset.label ?? id,
    description: preset.description ?? '',
    skills: resolveDepends(preset.skills),
    includes: [],
    warnings: [],
  };
}

export function listCategories() {
  const { categories } = loadCatalog();
  return Object.entries(categories).map(([id, category]) => ({
    id,
    ...category,
  }));
}

/**
 * @param {string | undefined} requiresHarness
 */
export function assertPresetHarnessCompatible(requiresHarness) {
  assertHarnessCompatible(requiresHarness);
}

/**
 * @param {string[]} skillIds
 * @param {string} [repoRoot]
 */
export function warnMissingDepends(skillIds, repoRoot = resolveRepoRoot()) {
  const { depends } = loadCatalog();
  const selected = new Set(skillIds);
  const warnings = [];

  for (const skill of skillIds) {
    for (const dep of depends[skill] ?? []) {
      if (!selected.has(dep)) {
        warnings.push(
          `${skill} depends on ${dep} — install manually if missing (skills#861 workaround)`,
        );
      }
    }
  }

  for (const skill of skillIds) {
    const skillMd = resolveSkillMd(join(repoRoot, 'skills'), skill);
    if (!skillMd) continue;
    const requires = readRequiresHarness(skillMd);
    assertHarnessCompatible(requires);
  }

  return warnings;
}
