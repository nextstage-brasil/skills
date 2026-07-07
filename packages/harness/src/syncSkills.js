import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { AGENTS_SKILLS_DIR } from './agentsLayout.js';

function resolveSymlinkTarget(linkPath) {
  const target = readlinkSync(linkPath);
  return resolve(dirname(linkPath), target);
}

function isSymlinkTo(linkPath, canonicalPath) {
  if (!existsSync(linkPath)) return false;
  if (!lstatSync(linkPath).isSymbolicLink()) return false;
  return resolveSymlinkTarget(linkPath) === resolve(canonicalPath);
}

function removePath(path) {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    unlinkSync(path);
    return;
  }
  if (stat.isDirectory()) {
    rmSync(path, { recursive: true, force: true });
    return;
  }
  unlinkSync(path);
}

function writeSkillAdapter(canonicalPath, adapterPath, copy) {
  mkdirSync(dirname(adapterPath), { recursive: true });
  removePath(adapterPath);

  if (copy) {
    cpSync(canonicalPath, adapterPath, { recursive: true });
    return 'copy';
  }

  const relTarget = relative(dirname(adapterPath), canonicalPath);
  try {
    symlinkSync(relTarget, adapterPath);
    return 'symlink';
  } catch {
    cpSync(canonicalPath, adapterPath, { recursive: true });
    return 'copy-fallback';
  }
}

function adapterMatches(canonicalPath, adapterPath) {
  if (!existsSync(adapterPath)) return false;
  if (isSymlinkTo(adapterPath, canonicalPath)) return true;
  return false;
}

function listSkillNames(canonicalDir) {
  return readdirSync(canonicalDir).filter((entry) => {
    const path = join(canonicalDir, entry);
    return statSync(path).isDirectory() && existsSync(join(path, 'SKILL.md'));
  });
}

export function syncSkills(projectRoot, options = {}) {
  const { agents = ['cursor', 'claude-code'], check = false, copy = false } = options;
  const canonicalDir = join(projectRoot, AGENTS_SKILLS_DIR);

  if (!existsSync(canonicalDir)) {
    return { ok: true, drifts: [], written: [], skipped: true };
  }

  const skillNames = listSkillNames(canonicalDir);
  if (skillNames.length === 0) {
    return { ok: true, drifts: [], written: [], skipped: true };
  }

  const adapterTargets = [];
  if (agents.includes('cursor')) {
    adapterTargets.push(join(projectRoot, '.cursor', 'skills'));
  }
  if (agents.includes('claude-code')) {
    adapterTargets.push(join(projectRoot, '.claude', 'skills'));
  }

  const drifts = [];
  const written = [];

  for (const name of skillNames) {
    const canonicalPath = join(canonicalDir, name);

    for (const adapterDir of adapterTargets) {
      const adapterPath = join(adapterDir, name);
      if (check) {
        if (!adapterMatches(canonicalPath, adapterPath)) {
          drifts.push(adapterPath);
        }
      } else {
        const mode = writeSkillAdapter(canonicalPath, adapterPath, copy);
        written.push(`${adapterPath} (${mode})`);
      }
    }
  }

  return { ok: drifts.length === 0, drifts, written, check, skipped: false };
}
