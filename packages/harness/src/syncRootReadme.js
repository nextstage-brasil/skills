import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HARNESS_ROOT } from './agentsLayout.js';

export const README_BLOCK_START = '<!-- nextstage-harness:start -->';
export const README_BLOCK_END = '<!-- nextstage-harness:end -->';

export const README_BLOCK = `${README_BLOCK_START}
## NextStage Harness

Skills (\`.agents/skills/ns-*\`) are not committed; \`.nextstage-harness/manifest.json\` records what to restore.

\`\`\`bash
npx @nextstage-brasil/harness --help   # all commands
npx @nextstage-brasil/harness update   # install/refresh skills from the manifest
npx @nextstage-brasil/harness sync     # regenerate rule/skill/subagent adapters
\`\`\`
${README_BLOCK_END}
`;

/** Remove the managed block (used by uninstall). Returns null when absent. */
export function stripRootReadme(content) {
  const start = content.indexOf(README_BLOCK_START);
  const end = content.indexOf(README_BLOCK_END);
  if (start === -1 || end < start) {
    return null;
  }
  const rest = `${content.slice(0, start)}${content.slice(end + README_BLOCK_END.length)}`;
  return `${rest.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')}\n`;
}

/**
 * Insert or refresh the managed harness usage block in the project root README.md.
 * No-op when the harness root does not exist.
 */
export function syncRootReadme(projectRoot) {
  if (!existsSync(join(projectRoot, HARNESS_ROOT))) {
    return { written: false };
  }

  const path = join(projectRoot, 'README.md');
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const start = existing.indexOf(README_BLOCK_START);
  const end = existing.indexOf(README_BLOCK_END);

  let next;
  if (start !== -1 && end > start) {
    next = `${existing.slice(0, start)}${README_BLOCK.trimEnd()}${existing.slice(end + README_BLOCK_END.length)}`;
  } else {
    const trimmed = existing.replace(/\s+$/, '');
    next = trimmed ? `${trimmed}\n\n${README_BLOCK}` : README_BLOCK;
  }

  if (next === existing) {
    return { written: false };
  }
  writeFileSync(path, next, 'utf8');
  return { written: true, path };
}
