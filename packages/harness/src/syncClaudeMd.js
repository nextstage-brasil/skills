import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_MD_CONTENT, LEGACY_CLAUDE_MD_CONTENTS } from './agentsLayout.js';

/**
 * True when CLAUDE.md still holds a stub written by an older harness version (never hand-edited).
 * @param {string} content
 */
export function isLegacyClaudeMdStub(content) {
  return LEGACY_CLAUDE_MD_CONTENTS.includes(content);
}

/**
 * Write the Claude Code boot stub when missing, or upgrade an unchanged legacy stub.
 * Never overwrites a hand-edited CLAUDE.md.
 * @param {string} projectRoot
 * @returns {{ written: boolean, skipped: boolean, upgraded?: boolean }}
 */
export function writeClaudeMdIfMissing(projectRoot) {
  const claudePath = join(projectRoot, 'CLAUDE.md');
  if (existsSync(claudePath)) {
    if (isLegacyClaudeMdStub(readFileSync(claudePath, 'utf8'))) {
      writeFileSync(claudePath, CLAUDE_MD_CONTENT, 'utf8');
      return { written: true, skipped: false, upgraded: true };
    }
    return { written: false, skipped: true };
  }
  writeFileSync(claudePath, CLAUDE_MD_CONTENT, 'utf8');
  return { written: true, skipped: false };
}

/**
 * When `claude-code` is an active agent, ensure `CLAUDE.md` exists (same stub as scaffold)
 * and upgrade an unchanged legacy stub. Cursor-only projects skip this; prune still removes
 * the file if Claude is excluded.
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

  const legacy = present && isLegacyClaudeMdStub(readFileSync(claudePath, 'utf8'));

  if (present && !legacy) {
    return { written: [], skipped: ['CLAUDE.md'], drifts: [] };
  }

  if (check) {
    return { written: [], skipped: [], drifts: ['CLAUDE.md'] };
  }

  writeClaudeMdIfMissing(projectRoot);
  return { written: ['CLAUDE.md'], skipped: [], drifts: [], upgraded: legacy };
}
