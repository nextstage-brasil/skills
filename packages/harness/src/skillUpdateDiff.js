import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { AGENTS_SKILLS_DIR } from './agentsLayout.js';
import { resolveSource } from './source.js';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__']);
const FETCH_TIMEOUT_MS = 10_000;

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

export function readSkillsLock(projectRoot) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  if (!existsSync(lockPath)) {
    return { version: 1, skills: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8'));
    return {
      version: parsed.version ?? 1,
      skills: parsed.skills && typeof parsed.skills === 'object' ? parsed.skills : {},
    };
  } catch {
    return { version: 1, skills: {} };
  }
}

function skillFolderFromSkillPath(skillPath) {
  if (!skillPath || typeof skillPath !== 'string') return null;
  let folderPath = skillPath.replace(/\\/g, '/');
  if (folderPath.toLowerCase().endsWith('/skill.md')) {
    folderPath = folderPath.slice(0, -9);
  } else if (folderPath.toLowerCase().endsWith('skill.md')) {
    folderPath = folderPath.slice(0, -8);
  }
  if (folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1);
  return folderPath || null;
}

export function getSkillFolderHashFromTree(tree, skillPath) {
  const folderPath = skillFolderFromSkillPath(skillPath);
  if (!folderPath) return tree?.sha ?? null;
  const entries = tree?.tree;
  if (!Array.isArray(entries)) return null;
  return entries.find((e) => e.type === 'tree' && e.path === folderPath)?.sha ?? null;
}

function looksLikeLocalPath(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('.') || value.startsWith('~')) return true;
  if (isAbsolute(value)) return true;
  if (value.includes('\\')) return true;
  // POSIX absolute already covered; treat existing dirs as local
  return false;
}

function resolveLocalSourceRoot(entry, explicitSource, defaultSource) {
  const candidates = [];
  if (explicitSource) candidates.push(explicitSource);
  if (entry?.sourceType === 'local' && entry.source) candidates.push(entry.source);
  if (entry?.source && looksLikeLocalPath(entry.source)) candidates.push(entry.source);
  if (defaultSource && existsSync(defaultSource) && statSync(defaultSource).isDirectory()) {
    candidates.push(defaultSource);
  }

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (existsSync(resolved) && statSync(resolved).isDirectory()) {
      return resolved;
    }
  }
  return null;
}

export function findSourceSkillDir(sourceRoot, skillName, entry = {}) {
  if (!sourceRoot) return null;

  const fromPath = skillFolderFromSkillPath(entry.skillPath);
  if (fromPath) {
    const candidate = join(sourceRoot, fromPath);
    if (existsSync(join(candidate, 'SKILL.md'))) return candidate;
  }

  const conventional = [
    join(sourceRoot, 'skills', skillName),
    join(sourceRoot, skillName),
    join(sourceRoot, '.agents', 'skills', skillName),
  ];
  for (const candidate of conventional) {
    if (existsSync(join(candidate, 'SKILL.md'))) return candidate;
  }
  return null;
}

function normalizeGithubOwnerRepo(source) {
  if (!source || typeof source !== 'string') return null;
  const trimmed = source.trim().replace(/\.git$/, '');
  const https = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  if (/^[^/]+\/[^/]+$/.test(trimmed) && !trimmed.includes(':')) return trimmed;
  return null;
}

function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  return null;
}

async function fetchTreeBranch(ownerRepo, branch, token) {
  const url = `https://api.github.com/repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'nextstage-harness',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return {
      tree: null,
      rateLimited: response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0',
    };
  }

  const data = await response.json();
  return {
    tree: {
      sha: data.sha,
      branch,
      tree: data.tree,
    },
    rateLimited: false,
  };
}

export async function fetchRepoTree(ownerRepo, ref, token = getGithubToken()) {
  const branches = ref ? [ref] : ['HEAD', 'main', 'master'];
  for (const branch of branches) {
    try {
      const result = await fetchTreeBranch(ownerRepo, branch, token);
      if (result.tree) return result.tree;
      if (result.rateLimited && !token) {
        const retryToken = getGithubToken();
        if (retryToken && retryToken !== token) {
          const retry = await fetchTreeBranch(ownerRepo, branch, retryToken);
          if (retry.tree) return retry.tree;
        }
      }
    } catch {
      // try next branch
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
 * Prefer local content-hash compare (source tree vs installed). Fall back to
 * GitHub tree SHA vs lock `skillFolderHash`. Unknown → update (safe).
 */
export async function planSkillUpdates(projectRoot, skillNames, options = {}) {
  const {
    force = false,
    source: explicitSource,
    fetchTree = fetchRepoTree,
  } = options;

  const lock = readSkillsLock(projectRoot);
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

  /** @type {Map<string, Promise<object|null>>} */
  const treeCache = new Map();

  function treeFor(ownerRepo, ref) {
    const key = `${ownerRepo}@${ref || 'HEAD'}`;
    if (!treeCache.has(key)) {
      treeCache.set(key, fetchTree(ownerRepo, ref));
    }
    return treeCache.get(key);
  }

  for (const name of skillNames) {
    const entry = lock.skills[name] ?? {};
    const installedDir = installedSkillDir(projectRoot, name);
    if (!installedDir) {
      toUpdate.push(name);
      unchecked.push({ name, reason: 'not-installed-on-disk' });
      continue;
    }

    const localRoot = resolveLocalSourceRoot(entry, explicitSource, defaultSource);
    const sourceDir = findSourceSkillDir(localRoot, name, entry);
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

    const ownerRepo = normalizeGithubOwnerRepo(entry.sourceUrl || entry.source);
    if (ownerRepo && entry.skillFolderHash && entry.skillPath) {
      const tree = await treeFor(ownerRepo, entry.ref);
      if (!tree) {
        toUpdate.push(name);
        unchecked.push({ name, reason: 'github-tree-unavailable' });
        continue;
      }
      const latest = getSkillFolderHashFromTree(tree, entry.skillPath);
      if (latest && latest === entry.skillFolderHash) {
        upToDate.push(name);
      } else if (latest) {
        toUpdate.push(name);
      } else {
        toUpdate.push(name);
        unchecked.push({ name, reason: 'skill-path-missing-upstream' });
      }
      continue;
    }

    // No reliable signal — must refresh (skills CLI project update always did).
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
