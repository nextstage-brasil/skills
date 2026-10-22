import { spawnSync } from 'node:child_process';
import { readManifestSkills } from './manifest.js';

const CHUNK = 50;
const SKILL_PATH = /^(\.(?:agents|claude)\/skills\/([^/]+))(?:\/|$)/;

function git(projectRoot, args) {
  return spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
}

/**
 * Drop harness-managed skills (ns-*, manifest externals) and skills-lock.json from the git index.
 * Files stay on disk; no commit is made.
 * @return {{untracked: string[]}}
 */
export function untrackManagedSkills(projectRoot) {
  const inside = git(projectRoot, ['rev-parse', '--is-inside-work-tree']);
  if (inside.error || inside.status !== 0 || inside.stdout.trim() !== 'true') {
    return { untracked: [] };
  }

  const listed = git(projectRoot, [
    'ls-files', '-z', '--', '.agents/skills', '.claude/skills', 'skills-lock.json',
  ]);
  if (listed.status !== 0) {
    return { untracked: [] };
  }

  const external = new Set(readManifestSkills(projectRoot)?.external ?? []);
  const targets = new Set();
  for (const file of listed.stdout.split('\0').filter(Boolean)) {
    if (file === 'skills-lock.json') {
      targets.add(file);
      continue;
    }
    const match = file.match(SKILL_PATH);
    if (match && (match[2].startsWith('ns-') || external.has(match[2]))) {
      targets.add(match[1]);
    }
  }

  const paths = [...targets].sort();
  for (let i = 0; i < paths.length; i += CHUNK) {
    const result = git(projectRoot, [
      'rm', '-r', '--cached', '--quiet', '--ignore-unmatch', '--', ...paths.slice(i, i + CHUNK),
    ]);
    if (result.status !== 0) {
      throw new Error(`git rm --cached failed: ${result.stderr.trim()}`);
    }
  }

  return { untracked: paths };
}
