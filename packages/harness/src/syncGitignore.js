import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENTS_SKILLS_DIR,
  GITIGNORE_BLOCK_HEADER,
  GITIGNORE_ENTRIES,
} from './agentsLayout.js';
import { readManifestSkills } from './manifest.js';
import { patchIgnoreContent } from './patchIgnoreContent.js';

/**
 * Static entries plus external skills recorded in manifest.skills.external.
 * @param {string} [projectRoot]
 */
export function gitignoreEntries(projectRoot) {
  const external = projectRoot ? readManifestSkills(projectRoot)?.external ?? [] : [];
  const skillsDir = AGENTS_SKILLS_DIR.split('\\').join('/');
  return [...GITIGNORE_ENTRIES, ...external.map((name) => `/${skillsDir}/${name}/`)];
}

export function buildGitignoreBlock(projectRoot) {
  return `${GITIGNORE_BLOCK_HEADER}\n${gitignoreEntries(projectRoot).join('\n')}\n`;
}

export function patchGitignoreContent(existingContent, projectRoot) {
  return patchIgnoreContent(existingContent, GITIGNORE_BLOCK_HEADER, gitignoreEntries(projectRoot));
}

/**
 * Merge harness-generated paths into the project .gitignore.
 * @param {{create?: boolean}} [options] create: write .gitignore when missing and the project is a git checkout
 */
export function syncGitignore(projectRoot, options = {}) {
  const { create = false } = options;
  const gitignorePath = join(projectRoot, '.gitignore');
  if (!existsSync(gitignorePath)) {
    if (!create || !existsSync(join(projectRoot, '.git'))) {
      return { written: [], skipped: [gitignorePath] };
    }
    writeFileSync(gitignorePath, buildGitignoreBlock(projectRoot), 'utf8');
    return { written: [gitignorePath], skipped: [] };
  }

  const existing = readFileSync(gitignorePath, 'utf8');
  const next = patchGitignoreContent(existing, projectRoot);
  if (next === existing) {
    return { written: [], skipped: [gitignorePath] };
  }

  writeFileSync(gitignorePath, next, 'utf8');
  return { written: [gitignorePath], skipped: [] };
}
