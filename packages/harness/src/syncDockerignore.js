import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DOCKERIGNORE_BLOCK_HEADER,
  DOCKERIGNORE_ENTRIES,
} from './agentsLayout.js';

export function buildDockerignoreBlock() {
  return `${DOCKERIGNORE_BLOCK_HEADER}\n${DOCKERIGNORE_ENTRIES.join('\n')}\n`;
}

/**
 * Append the harness block when missing. Existing lines are never modified.
 */
export function patchDockerignoreContent(existingContent) {
  if (existingContent.includes(DOCKERIGNORE_BLOCK_HEADER)) {
    return existingContent;
  }
  const block = buildDockerignoreBlock();
  const trimmed = existingContent.replace(/\s+$/, '');
  return trimmed.length === 0 ? block : `${trimmed}\n\n${block}`;
}

/**
 * Merge harness-generated paths into the project .dockerignore when present.
 */
export function syncDockerignore(projectRoot) {
  const dockerignorePath = join(projectRoot, '.dockerignore');
  if (!existsSync(dockerignorePath)) {
    return { written: [], skipped: [dockerignorePath] };
  }

  const existing = readFileSync(dockerignorePath, 'utf8');
  const next = patchDockerignoreContent(existing);
  if (next === existing) {
    return { written: [], skipped: [dockerignorePath] };
  }

  writeFileSync(dockerignorePath, next, 'utf8');
  return { written: [dockerignorePath], skipped: [] };
}
