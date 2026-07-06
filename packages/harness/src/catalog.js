import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function resolveDepends(selected) {
  const { depends } = loadCatalog();
  const result = new Set(selected);

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

export function listPresets() {
  const { presets } = loadCatalog();
  return Object.entries(presets).map(([id, preset]) => ({
    id,
    ...preset,
    skills: resolveDepends(preset.skills),
  }));
}

export function getPreset(id) {
  const preset = loadCatalog().presets[id];
  if (!preset) return null;
  return {
    id,
    ...preset,
    skills: resolveDepends(preset.skills),
  };
}

export function listCategories() {
  const { categories } = loadCatalog();
  return Object.entries(categories).map(([id, category]) => ({
    id,
    ...category,
  }));
}
