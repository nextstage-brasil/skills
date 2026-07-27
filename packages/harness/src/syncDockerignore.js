import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DOCKERIGNORE_BLOCK_HEADER,
  DOCKERIGNORE_ENTRIES,
} from './agentsLayout.js';
import { patchIgnoreContent } from './patchIgnoreContent.js';

export function buildDockerignoreBlock() {
  return `${DOCKERIGNORE_BLOCK_HEADER}\n${DOCKERIGNORE_ENTRIES.join('\n')}\n`;
}

/**
 * Append the harness block when missing, or merge missing entries into an existing block.
 */
export function patchDockerignoreContent(existingContent) {
  return patchIgnoreContent(existingContent, DOCKERIGNORE_BLOCK_HEADER, DOCKERIGNORE_ENTRIES);
}

/**
 * Ensure harness ignore paths are in `.dockerignore`.
 * Creates the file when missing; otherwise merges the managed block.
 */
export function syncDockerignore(projectRoot) {
  const dockerignorePath = join(projectRoot, '.dockerignore');
  if (!existsSync(dockerignorePath)) {
    writeFileSync(dockerignorePath, buildDockerignoreBlock(), 'utf8');
    return { written: [dockerignorePath], skipped: [] };
  }

  const existing = readFileSync(dockerignorePath, 'utf8');
  const next = patchDockerignoreContent(existing);
  if (next === existing) {
    return { written: [], skipped: [dockerignorePath] };
  }

  writeFileSync(dockerignorePath, next, 'utf8');
  return { written: [dockerignorePath], skipped: [] };
}
