import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedIndex;
let cachedNameMap;

/**
 * Repo root containing presets/index.json (override with HARNESS_PRESETS_PATH).
 * @returns {string}
 */
export function resolveRepoRoot() {
  const fromEnv = process.env.HARNESS_PRESETS_PATH;
  if (fromEnv) {
    const normalized = fromEnv.replace(/\/$/, '');
    if (existsSync(join(normalized, 'presets', 'index.json'))) {
      return normalized;
    }
    if (existsSync(join(normalized, 'index.json'))) {
      return dirname(normalized);
    }
    return normalized;
  }

  const monorepoRoot = join(__dirname, '..', '..', '..');
  if (existsSync(join(monorepoRoot, 'presets', 'index.json'))) {
    return monorepoRoot;
  }

  const bundledRoot = join(__dirname, '..', 'templates');
  if (existsSync(join(bundledRoot, 'presets', 'index.json'))) {
    return bundledRoot;
  }

  return monorepoRoot;
}

function loadPresetIndex(repoRoot = resolveRepoRoot()) {
  if (!cachedIndex || cachedIndex.root !== repoRoot) {
    const indexPath = join(repoRoot, 'presets', 'index.json');
    if (!existsSync(indexPath)) {
      throw new Error(`Missing presets index: ${indexPath}`);
    }
    cachedIndex = {
      root: repoRoot,
      data: JSON.parse(readFileSync(indexPath, 'utf8')),
    };
    cachedNameMap = null;
  }
  return cachedIndex.data;
}

export function loadPresetFile(repoRoot, relativePath) {
  const path = join(repoRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Preset file not found: ${relativePath}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildPresetNameMap(repoRoot) {
  if (cachedNameMap && cachedNameMap.root === repoRoot) {
    return cachedNameMap.map;
  }

  const index = loadPresetIndex(repoRoot);
  const map = new Map();
  for (const filePath of new Set(Object.values(index))) {
    const doc = loadPresetFile(repoRoot, filePath);
    map.set(doc.name, filePath);
  }
  cachedNameMap = { root: repoRoot, map };
  return map;
}

function normalizeExtends(extendsField) {
  if (!extendsField) return [];
  return Array.isArray(extendsField) ? extendsField : [extendsField];
}

function dedupeConcat(base, extra) {
  const seen = new Set(base);
  const result = [...base];
  for (const item of extra) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function resolveIncludes(doc, repoRoot, nameMap, resolving) {
  if (resolving.has(doc.name)) {
    throw new Error(`Circular preset extends: ${doc.name}`);
  }
  resolving.add(doc.name);

  let includes = [];
  const warnings = [];

  for (const parentName of normalizeExtends(doc.extends)) {
    const parentPath = nameMap.get(parentName);
    if (!parentPath) {
      throw new Error(`Unknown extends preset: ${parentName}`);
    }
    const parentDoc = loadPresetFile(repoRoot, parentPath);
    const parentResolved = resolveIncludes(parentDoc, repoRoot, nameMap, resolving);
    includes = dedupeConcat(includes, parentResolved.includes);
    warnings.push(...parentResolved.warnings);
  }

  resolving.delete(doc.name);
  includes = dedupeConcat(includes, doc.includes ?? []);
  if (doc.warnings?.length) {
    warnings.push(...doc.warnings);
  }

  return { includes, warnings };
}

/**
 * Leaf skill ID from a repo-relative include path.
 * @param {string} includePath
 * @returns {string}
 */
export function skillIdFromInclude(includePath) {
  const normalized = includePath.replace(/\\/g, '/').replace(/\/$/, '');
  const leaf = normalized.split('/').pop();
  if (!leaf) {
    throw new Error(`Invalid preset include path: ${includePath}`);
  }
  return leaf;
}

/**
 * Resolve a preset by alias (index key) or canonical name.
 * @param {string} aliasOrName
 * @param {string} [repoRoot]
 * @returns {object | null}
 */
export function resolvePreset(aliasOrName, repoRoot = resolveRepoRoot()) {
  const index = loadPresetIndex(repoRoot);
  let filePath = index[aliasOrName];

  if (!filePath) {
    const nameMap = buildPresetNameMap(repoRoot);
    filePath = nameMap.get(aliasOrName) ?? null;
  }

  if (!filePath) {
    return null;
  }

  const doc = loadPresetFile(repoRoot, filePath);
  const nameMap = buildPresetNameMap(repoRoot);
  const { includes, warnings } = resolveIncludes(doc, repoRoot, nameMap, new Set());

  return {
    name: doc.name,
    alias: aliasOrName,
    filePath,
    description: doc.description,
    requires_harness: doc.requires_harness,
    includes,
    warnings,
  };
}

/**
 * List preset aliases from presets/index.json (one row per alias).
 * @param {string} [repoRoot]
 * @returns {Array<{ id: string, name: string, description: string, filePath: string }>}
 */
export function listPresetAliases(repoRoot = resolveRepoRoot()) {
  const index = loadPresetIndex(repoRoot);
  return Object.entries(index).map(([id, filePath]) => {
    const doc = loadPresetFile(repoRoot, filePath);
    return {
      id,
      name: doc.name,
      description: doc.description,
      filePath,
    };
  });
}

/**
 * Unique preset documents (deduped by file path).
 * @param {string} [repoRoot]
 */
export function listPresetDocuments(repoRoot = resolveRepoRoot()) {
  const index = loadPresetIndex(repoRoot);
  const seen = new Set();
  const result = [];

  for (const filePath of Object.values(index)) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    const doc = loadPresetFile(repoRoot, filePath);
    const nameMap = buildPresetNameMap(repoRoot);
    const { includes, warnings } = resolveIncludes(doc, repoRoot, nameMap, new Set());
    result.push({
      name: doc.name,
      description: doc.description,
      requires_harness: doc.requires_harness,
      includes,
      warnings,
      filePath,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
