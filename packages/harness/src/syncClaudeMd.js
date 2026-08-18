import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_MD_CONTENT } from './agentsLayout.js';

/**
 * Write the Claude Code boot stub when missing. Never overwrites.
 * @param {string} projectRoot
 * @returns {{ written: boolean, skipped: boolean }}
 */
export function writeClaudeMdIfMissing(projectRoot) {
  const claudePath = join(projectRoot, 'CLAUDE.md');
  if (existsSync(claudePath)) {
    return { written: false, skipped: true };
  }
  writeFileSync(claudePath, CLAUDE_MD_CONTENT, 'utf8');
  return { written: true, skipped: false };
}

/**
 * When `claude-code` is an active agent, ensure `CLAUDE.md` exists (same stub as scaffold).
 * Cursor-only projects skip this; prune still removes the file if Claude is excluded.
 * @param {string} projectRoot
 * @param {{ agents?: string[], check?: boolean }} options
 */
export function syncClaudeMd(projectRoot, options = {}) {
  const { agents = [], check = false } = options;
  const wantsClaude = agents.includes('claude-code');
  const claudePath = join(projectRoot, 'CLAUDE.md');
  const present = existsSync(claudePath);

  if (!wantsClaude) {
    return { written: [], skipped: [], drifts: [] };
  }

  if (present) {
    return { written: [], skipped: ['CLAUDE.md'], drifts: [] };
  }

  if (check) {
    return { written: [], skipped: [], drifts: ['CLAUDE.md'] };
  }

  writeClaudeMdIfMissing(projectRoot);
  return { written: ['CLAUDE.md'], skipped: [], drifts: [] };
}
