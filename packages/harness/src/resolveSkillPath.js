import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_ENTRIES = new Set(['_meta']);

/**
 * List catalog skill IDs: root skills (skills/<id>/SKILL.md) and nested
 * domain skills (skills/<domain>/<id>/SKILL.md). ID = leaf directory name.
 * @param {string} skillsDir Absolute path to skills/
 * @returns {string[]}
 */
export function discoverSkillIds(skillsDir) {
  if (!existsSync(skillsDir)) return [];

  const ids = [];
  for (const entry of readdirSync(skillsDir)) {
    if (SKIP_ENTRIES.has(entry) || entry.endsWith('-workspace') || entry.startsWith('.')) {
      continue;
    }
    const path = join(skillsDir, entry);
    if (!statSync(path).isDirectory()) continue;

    if (existsSync(join(path, 'SKILL.md'))) {
      ids.push(entry);
      continue;
    }

    for (const leaf of readdirSync(path)) {
      const leafPath = join(path, leaf);
      if (!statSync(leafPath).isDirectory()) continue;
      if (existsSync(join(leafPath, 'SKILL.md'))) {
        ids.push(leaf);
      }
    }
  }

  return ids.sort();
}

/**
 * Resolve absolute path to a skill directory by leaf ID.
 * @param {string} skillsDir
 * @param {string} skillId
 * @returns {string | null}
 */
export function resolveSkillDir(skillsDir, skillId) {
  const flat = join(skillsDir, skillId);
  if (existsSync(join(flat, 'SKILL.md'))) return flat;

  if (!existsSync(skillsDir)) return null;

  for (const domain of readdirSync(skillsDir)) {
    if (SKIP_ENTRIES.has(domain) || domain.startsWith('.')) continue;
    const nested = join(skillsDir, domain, skillId);
    if (existsSync(join(nested, 'SKILL.md'))) return nested;
  }

  return null;
}

/**
 * Resolve absolute path to SKILL.md for a catalog skill ID.
 * @param {string} skillsDir
 * @param {string} skillId
 * @returns {string | null}
 */
export function resolveSkillMd(skillsDir, skillId) {
  const dir = resolveSkillDir(skillsDir, skillId);
  return dir ? join(dir, 'SKILL.md') : null;
}

/**
 * Relative repo path from source root to skill folder (for skillPath in lock files).
 * @param {string} sourceRoot Repo root
 * @param {string} skillId Leaf skill ID
 * @returns {string | null} e.g. skills/code/ns-coder
 */
export function skillRepoPath(sourceRoot, skillId) {
  const dir = resolveSkillDir(join(sourceRoot, 'skills'), skillId);
  if (!dir) return null;
  const skillsRoot = join(sourceRoot, 'skills');
  return dir.slice(skillsRoot.length + 1).replace(/\\/g, '/');
}

/**
 * Find a skill directory under a source root (local clone or project).
 * @param {string} sourceRoot
 * @param {string} skillName Leaf skill ID
 * @param {{ skillPath?: string }} [entry] Optional lock entry with skillPath hint
 * @returns {string | null}
 */
/**
 * Discover catalog skills with domain folder and repo-relative path.
 * @param {string} skillsDir Absolute path to skills/
 * @returns {Array<{ id: string, domain: string | null, path: string }>}
 */
export function discoverSkillsWithDomain(skillsDir) {
  if (!existsSync(skillsDir)) return [];

  const result = [];

  for (const entry of readdirSync(skillsDir)) {
    if (SKIP_ENTRIES.has(entry) || entry.endsWith('-workspace') || entry.startsWith('.')) {
      continue;
    }
    const path = join(skillsDir, entry);
    if (!statSync(path).isDirectory()) continue;

    if (existsSync(join(path, 'SKILL.md'))) {
      result.push({ id: entry, domain: null, path: `skills/${entry}` });
      continue;
    }

    for (const leaf of readdirSync(path)) {
      const leafPath = join(path, leaf);
      if (!statSync(leafPath).isDirectory()) continue;
      if (existsSync(join(leafPath, 'SKILL.md'))) {
        result.push({ id: leaf, domain: entry, path: `skills/${entry}/${leaf}` });
      }
    }
  }

  return result.sort((a, b) => {
    const domainCmp = (a.domain ?? '').localeCompare(b.domain ?? '');
    if (domainCmp !== 0) return domainCmp;
    return a.id.localeCompare(b.id);
  });
}

export function findSourceSkillDir(sourceRoot, skillName, entry = {}) {
  if (!sourceRoot) return null;

  if (entry.skillPath) {
    const fromPath = entry.skillPath.replace(/\\/g, '/').replace(/\/SKILL\.md$/i, '');
    const candidate = join(sourceRoot, fromPath);
    if (existsSync(join(candidate, 'SKILL.md'))) return candidate;
  }

  const fromSkills = resolveSkillDir(join(sourceRoot, 'skills'), skillName);
  if (fromSkills) return fromSkills;

  const fallbacks = [
    join(sourceRoot, 'skills', skillName),
    join(sourceRoot, skillName),
    join(sourceRoot, '.agents', 'skills', skillName),
  ];
  for (const candidate of fallbacks) {
    if (existsSync(join(candidate, 'SKILL.md'))) return candidate;
  }

  return null;
}
