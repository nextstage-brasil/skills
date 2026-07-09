import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GITIGNORE_BLOCK_HEADER,
  GITIGNORE_ENTRIES,
} from './agentsLayout.js';
import { patchIgnoreContent } from './patchIgnoreContent.js';

export function buildGitignoreBlock() {
  return `${GITIGNORE_BLOCK_HEADER}\n${GITIGNORE_ENTRIES.join('\n')}\n`;
}

export function patchGitignoreContent(existingContent) {
  return patchIgnoreContent(existingContent, GITIGNORE_BLOCK_HEADER, GITIGNORE_ENTRIES);
}

/**
 * Merge harness-generated paths into the project .gitignore when present.
 */
export function syncGitignore(projectRoot) {
  const gitignorePath = join(projectRoot, '.gitignore');
  if (!existsSync(gitignorePath)) {
    return { written: [], skipped: [gitignorePath] };
  }

  const existing = readFileSync(gitignorePath, 'utf8');
  const next = patchGitignoreContent(existing);
  if (next === existing) {
    return { written: [], skipped: [gitignorePath] };
  }

  writeFileSync(gitignorePath, next, 'utf8');
  return { written: [gitignorePath], skipped: [] };
}
