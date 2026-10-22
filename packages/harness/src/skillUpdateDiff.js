import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { AGENTS_SKILLS_DIR } from './agentsLayout.js';
import { findSourceSkillDir } from './resolveSkillPath.js';
import { resolveSource } from './source.js';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__']);

/**
 * Content hash of a skill folder (same algorithm as skills CLI `computedHash`).
 */
export function computeSkillFolderHash(skillDir) {
  const files = [];
  collectFiles(skillDir, skillDir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest('hex');
}

function collectFiles(baseDir, currentDir, results) {
  let entries;
  try {
    entries = readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(baseDir, fullPath, results);
      continue;
    }
    if (!entry.isFile()) continue;
    const content = readFileSync(fullPath);
    const relativePath = relative(baseDir, fullPath).split(sep).join('/');
    results.push({ relativePath, content });
  }
}

export { findSourceSkillDir } from './resolveSkillPath.js';

function resolveLocalSourceRoot(explicitSource, defaultSource) {
  for (const candidate of [explicitSource, defaultSource]) {
    if (!candidate) continue;
    const resolved = resolve(candidate);
    if (existsSync(resolved) && statSync(resolved).isDirectory()) {
      return resolved;
    }
  }
  return null;
}

function installedSkillDir(projectRoot, skillName) {
  const dir = join(projectRoot, AGENTS_SKILLS_DIR, skillName);
  return existsSync(join(dir, 'SKILL.md')) ? dir : null;
}

/**
 * Decide which installed skills need a fetch/reinstall.
 *
 * Local content-hash compare (source tree vs installed). Unknown → update (safe).
 */
export async function planSkillUpdates(projectRoot, skillNames, options = {}) {
  const {
    force = false,
    source: explicitSource,
  } = options;

  const defaultSource = resolveSource(explicitSource);
  const toUpdate = [];
  const upToDate = [];
  const unchecked = [];

  if (force) {
    return {
      toUpdate: [...skillNames],
      upToDate: [],
      unchecked: [],
      force: true,
    };
  }

  for (const name of skillNames) {
    const installedDir = installedSkillDir(projectRoot, name);
    if (!installedDir) {
      toUpdate.push(name);
      unchecked.push({ name, reason: 'not-installed-on-disk' });
      continue;
    }

    const localRoot = resolveLocalSourceRoot(explicitSource, defaultSource);
    const sourceDir = findSourceSkillDir(localRoot, name);
    if (sourceDir) {
      const sourceHash = computeSkillFolderHash(sourceDir);
      const installedHash = computeSkillFolderHash(installedDir);
      if (sourceHash === installedHash) {
        upToDate.push(name);
      } else {
        toUpdate.push(name);
      }
      continue;
    }

    // Not in local --source catalog. Skip — `skills update`
    // without a source hits the marketplace (skills.sh), not the catalog.
    if (localRoot) {
      upToDate.push(name);
      continue;
    }

    toUpdate.push(name);
    unchecked.push({ name, reason: 'no-hash-baseline' });
  }

  return {
    toUpdate,
    upToDate,
    unchecked,
    force: false,
  };
}
