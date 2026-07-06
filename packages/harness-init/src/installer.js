import { spawnSync } from 'node:child_process';
import { resolveSource } from './source.js';

export function installSkills(skills, options = {}) {
  const {
    projectRoot = process.cwd(),
    global = false,
    agents = [],
    copy = false,
    source,
  } = options;

  const resolvedSource = resolveSource(source);

  if (skills.length === 0) {
    throw new Error('No skills selected for installation');
  }

  const args = ['skills', 'add', resolvedSource, '--full-depth', '-y'];

  for (const skill of skills) {
    args.push('--skill', skill);
  }

  if (global) args.push('-g');
  if (copy) args.push('--copy');
  for (const agent of agents) {
    args.push('--agent', agent);
  }

  const result = spawnSync('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`skills add failed with exit code ${result.status}`);
  }
}
