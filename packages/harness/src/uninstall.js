import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import * as p from '@clack/prompts';
import {
  AGENTS_HOME,
  AGENTS_SKILLS_DIR,
  DOCKERIGNORE_BLOCK_HEADER,
  DOCKERIGNORE_ENTRIES,
  GITIGNORE_BLOCK_HEADER,
  GITIGNORE_ENTRIES,
  HARNESS_ROOT,
} from './agentsLayout.js';
import { stripIgnoreContent } from './patchIgnoreContent.js';
import { GENERATION_MARKER } from './syncRules.js';

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

function listSkillNames(canonicalDir) {
  if (!existsSync(canonicalDir)) return [];
  return readdirSync(canonicalDir).filter((entry) => {
    const path = join(canonicalDir, entry);
    try {
      return lstatSync(path).isDirectory() && existsSync(join(path, 'SKILL.md'));
    } catch {
      return false;
    }
  });
}

function isHarnessManagedRuleAdapter(path) {
  if (!existsSync(path) || lstatSync(path).isDirectory()) return false;
  try {
    return readFileSync(path, 'utf8').includes(GENERATION_MARKER);
  } catch {
    return false;
  }
}

function collectManagedRuleAdapters(projectRoot) {
  const paths = [];
  const ruleDirs = [
    join(projectRoot, '.cursor', 'rules'),
    join(projectRoot, '.claude', 'rules'),
  ];

  for (const dir of ruleDirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (isHarnessManagedRuleAdapter(path)) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function collectManagedSubagentAdapters(projectRoot) {
  const paths = [];
  const agentDirs = [
    join(projectRoot, '.cursor', 'agents'),
    join(projectRoot, '.claude', 'agents'),
  ];

  for (const dir of agentDirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (isHarnessManagedRuleAdapter(path)) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function collectSkillAdapterPaths(projectRoot, skillNames) {
  const paths = [];
  const adapterRoots = [
    join(projectRoot, '.claude', 'skills'),
    join(projectRoot, '.cursor', 'skills'),
  ];

  for (const name of skillNames) {
    for (const root of adapterRoots) {
      const path = join(root, name);
      if (existsSync(path)) paths.push(path);
    }
  }

  return paths;
}

function collectEmptyDirCandidates(projectRoot) {
  return [
    join(projectRoot, '.cursor', 'skills'),
    join(projectRoot, '.cursor', 'rules'),
    join(projectRoot, '.cursor', 'agents'),
    join(projectRoot, '.cursor'),
    join(projectRoot, '.claude', 'skills'),
    join(projectRoot, '.claude', 'rules'),
    join(projectRoot, '.claude', 'agents'),
    join(projectRoot, '.claude'),
    join(projectRoot, AGENTS_SKILLS_DIR),
    join(projectRoot, AGENTS_HOME, 'docs'),
    join(projectRoot, AGENTS_HOME),
  ];
}

function removeEmptyDirs(projectRoot, dryRun) {
  const removed = [];
  for (const path of collectEmptyDirCandidates(projectRoot)) {
    if (!existsSync(path)) continue;
    let entries;
    try {
      entries = readdirSync(path);
    } catch {
      continue;
    }
    if (entries.length > 0) continue;
    if (!dryRun) removePath(path);
    removed.push(path);
  }
  return removed;
}

function assessIgnorePatches(projectRoot) {
  const patches = [];

  const dockerignorePath = join(projectRoot, '.dockerignore');
  if (existsSync(dockerignorePath)) {
    const existing = readFileSync(dockerignorePath, 'utf8');
    const next = stripIgnoreContent(existing, DOCKERIGNORE_BLOCK_HEADER, DOCKERIGNORE_ENTRIES);
    if (next !== existing) {
      patches.push({ path: dockerignorePath, next });
    }
  }

  const gitignorePath = join(projectRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf8');
    const next = stripIgnoreContent(existing, GITIGNORE_BLOCK_HEADER, GITIGNORE_ENTRIES);
    if (next !== existing) {
      patches.push({ path: gitignorePath, next });
    }
  }

  return patches;
}

/**
 * Inventory harness-managed paths that uninstall would remove.
 */
export function assessUninstall(projectRoot, options = {}) {
  const { keepAgentsMd = false } = options;
  const removable = [];
  const patched = [];

  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  if (existsSync(harnessRoot)) {
    removable.push(harnessRoot);
  }

  const skillsDir = join(projectRoot, AGENTS_SKILLS_DIR);
  const skillNames = listSkillNames(skillsDir);
  if (existsSync(skillsDir)) {
    removable.push(skillsDir);
  }

  removable.push(...collectSkillAdapterPaths(projectRoot, skillNames));
  removable.push(...collectManagedRuleAdapters(projectRoot));
  removable.push(...collectManagedSubagentAdapters(projectRoot));

  const lockPath = join(projectRoot, 'skills-lock.json');
  if (existsSync(lockPath)) {
    removable.push(lockPath);
  }

  if (!keepAgentsMd) {
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const path = join(projectRoot, name);
      if (existsSync(path)) removable.push(path);
    }
  }

  const uniqueRemovable = [...new Set(removable)];
  const ignorePatches = assessIgnorePatches(projectRoot);
  for (const patch of ignorePatches) {
    patched.push(patch.path);
  }

  return {
    removable: uniqueRemovable,
    patched,
    ignorePatches,
    skillNames,
    found: uniqueRemovable.length > 0 || ignorePatches.length > 0,
  };
}

export function runUninstall(projectRoot, options = {}) {
  const { dryRun = false, keepAgentsMd = false } = options;
  const assessment = assessUninstall(projectRoot, { keepAgentsMd });

  if (dryRun) {
    return {
      ...assessment,
      removed: [],
      patchedWritten: [],
      emptied: [],
      dryRun: true,
    };
  }

  const removed = [];
  for (const path of assessment.removable) {
    if (removePath(path)) removed.push(path);
  }

  const patchedWritten = [];
  for (const patch of assessment.ignorePatches) {
    writeFileSync(patch.path, patch.next, 'utf8');
    patchedWritten.push(patch.path);
  }

  const emptied = removeEmptyDirs(projectRoot, false);

  return {
    ...assessment,
    removed,
    patchedWritten,
    emptied,
    dryRun: false,
  };
}

export function formatUninstallReport(projectRoot, result) {
  const lines = [];
  const rel = (path) => relative(projectRoot, path) || path;

  if (result.dryRun) {
    lines.push('Dry run — no files removed.');
    lines.push('');
  }

  if (!result.found && result.removed.length === 0 && result.patchedWritten.length === 0) {
    lines.push('Nothing to uninstall — no harness install found.');
    return lines.join('\n');
  }

  const removeLabel = result.dryRun ? 'Would remove' : 'Removed';
  const paths = result.dryRun ? result.removable : result.removed;
  if (paths.length > 0) {
    lines.push(`${removeLabel} (${paths.length}):`);
    for (const path of paths) {
      lines.push(`  ${rel(path)}`);
    }
  }

  const patchPaths = result.dryRun ? result.patched : result.patchedWritten;
  if (patchPaths.length > 0) {
    if (lines.length > 0) lines.push('');
    const patchLabel = result.dryRun ? 'Would patch' : 'Patched';
    lines.push(`${patchLabel}:`);
    for (const path of patchPaths) {
      lines.push(`  ${rel(path)} (strip harness ignore block)`);
    }
  }

  if (!result.dryRun && result.emptied?.length > 0) {
    lines.push('');
    lines.push('Removed empty dirs:');
    for (const path of result.emptied) {
      lines.push(`  ${rel(path)}`);
    }
  }

  if (result.skillNames?.length > 0 && result.dryRun) {
    lines.push('');
    lines.push(`Skills: ${result.skillNames.join(', ')}`);
  }

  lines.push('');
  lines.push('Preserved: docs/ (user content).');

  return lines.join('\n');
}

/**
 * Interactive / CLI entry: confirm unless --yes or --dry-run.
 */
export async function runUninstallCommand(projectRoot, options = {}) {
  const { dryRun = false, yes = false, keepAgentsMd = false } = options;
  const assessment = assessUninstall(projectRoot, { keepAgentsMd });

  if (!assessment.found) {
    console.log('Nothing to uninstall — no harness install found.');
    return { ...assessment, removed: [], patchedWritten: [], emptied: [], dryRun };
  }

  if (dryRun) {
    const result = { ...assessment, removed: [], patchedWritten: [], emptied: [], dryRun: true };
    console.log(formatUninstallReport(projectRoot, result));
    return result;
  }

  if (!yes) {
    p.intro('NextStage harness uninstall');
    p.log.warn(
      `This removes ${assessment.removable.length} path(s)`
        + (assessment.patched.length ? ` and patches ${assessment.patched.length} ignore file(s)` : '')
        + '.',
    );
    const confirmed = await p.confirm({
      message: 'Uninstall harness from this project?',
      initialValue: false,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Uninstall cancelled.');
      process.exit(0);
    }
  }

  const result = runUninstall(projectRoot, { dryRun: false, keepAgentsMd });
  console.log(formatUninstallReport(projectRoot, result));
  return result;
}
