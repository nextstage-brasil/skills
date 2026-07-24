import {
  existsSync,
  lstatSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_SKILLS_DIR } from './agentsLayout.js';
import { DEFAULT_AGENTS } from './agentIds.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const retiredPath = join(__dirname, '..', 'templates', 'retired-skills.json');

let cachedRetired;

function loadRetiredSkills() {
  if (!cachedRetired) {
    cachedRetired = JSON.parse(readFileSync(retiredPath, 'utf8'));
  }
  return cachedRetired;
}

function removePath(path) {
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    unlinkSync(path);
    return true;
  }
  if (stat.isDirectory()) {
    rmSync(path, { recursive: true, force: true });
    return true;
  }
  unlinkSync(path);
  return true;
}

function adapterDirs(projectRoot, agents) {
  const dirs = [];
  if (agents.includes('cursor')) {
    dirs.push(join(projectRoot, '.cursor', 'skills'));
  }
  if (agents.includes('claude-code')) {
    dirs.push(join(projectRoot, '.claude', 'skills'));
  }
  return dirs;
}

export function assessPruneRetiredSkills(projectRoot, options = {}) {
  const { agents = DEFAULT_AGENTS } = options;
  const retired = loadRetiredSkills();
  const canonicalDir = join(projectRoot, AGENTS_SKILLS_DIR);
  const removable = [];
  const skipped = [];

  for (const [oldName, newName] of Object.entries(retired)) {
    const oldCanonical = join(canonicalDir, oldName);
    if (!existsSync(oldCanonical)) {
      continue;
    }

    const newCanonical = join(canonicalDir, newName);
    if (!existsSync(newCanonical)) {
      skipped.push({
        oldName,
        newName,
        reason: `replacement "${newName}" is not installed`,
      });
      continue;
    }

    const paths = [oldCanonical];
    for (const adapterDir of adapterDirs(projectRoot, agents)) {
      paths.push(join(adapterDir, oldName));
    }

    removable.push({
      oldName,
      newName,
      paths: paths.filter((path) => existsSync(path)),
    });
  }

  return { removable, skipped };
}

function pruneSkillsLock(projectRoot, oldNames) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  if (!existsSync(lockPath) || oldNames.length === 0) {
    return [];
  }

  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    return [];
  }

  if (!lock.skills || typeof lock.skills !== 'object') {
    return [];
  }

  const pruned = [];
  for (const oldName of oldNames) {
    if (lock.skills[oldName]) {
      delete lock.skills[oldName];
      pruned.push(oldName);
    }
  }

  if (pruned.length > 0) {
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }

  return pruned;
}

export function pruneRetiredSkills(projectRoot, options = {}) {
  const { dryRun = false, agents = DEFAULT_AGENTS } = options;
  const assessment = assessPruneRetiredSkills(projectRoot, { agents });

  if (dryRun) {
    return {
      ...assessment,
      removed: [],
      lockPruned: [],
      dryRun: true,
    };
  }

  const removed = [];
  for (const entry of assessment.removable) {
    for (const path of entry.paths) {
      if (removePath(path)) {
        removed.push(path);
      }
    }
  }

  const lockPruned = pruneSkillsLock(
    projectRoot,
    assessment.removable.map((entry) => entry.oldName),
  );

  return {
    ...assessment,
    removed,
    lockPruned,
    dryRun: false,
  };
}

export function formatPruneReport(result) {
  const lines = [];

  if (result.dryRun) {
    lines.push('Dry run — no files removed.');
    lines.push('');
  }

  if (result.removable.length > 0) {
    const label = result.dryRun ? 'Would remove' : 'Removed';
    for (const entry of result.removable) {
      lines.push(`${label}: ${entry.oldName} → replaced by ${entry.newName}`);
      for (const path of entry.paths) {
        lines.push(`  ${path}`);
      }
    }
  }

  if (result.skipped.length > 0) {
    lines.push('');
    lines.push('Skipped (install replacement first):');
    for (const entry of result.skipped) {
      lines.push(`  ${entry.oldName} — ${entry.reason}`);
    }
  }

  if (result.lockPruned?.length > 0) {
    lines.push('');
    lines.push(`skills-lock.json entries removed: ${result.lockPruned.join(', ')}`);
  }

  if (lines.length === 0) {
    lines.push('No retired skill directories found.');
  }

  return lines.join('\n');
}
