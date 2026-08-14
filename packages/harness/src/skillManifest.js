import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillRepoPath } from './resolveSkillPath.js';
import { assertHarnessCompatible } from './harnessVersion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillPaths = JSON.parse(
  readFileSync(join(__dirname, '..', 'templates', 'skill-paths.json'), 'utf8'),
);

/**
 * @param {string} skillMdPath
 * @returns {string | undefined}
 */
export function readRequiresHarness(skillMdPath) {
  if (!existsSync(skillMdPath)) return undefined;
  const content = readFileSync(skillMdPath, 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return undefined;
  const match = frontmatter[1].match(/^requires_harness:\s*["']?([^"'\n]+)["']?\s*$/m);
  return match?.[1]?.trim();
}

/**
 * @param {string[]} skillIds
 * @param {string} sourceRoot
 */
export function assertSkillsHarnessCompatible(skillIds, sourceRoot) {
  for (const skillId of skillIds) {
    const repoPath = skillRepoPath(sourceRoot, skillId) ?? skillPaths[skillId];
    if (!repoPath) continue;
    const skillMd = join(sourceRoot, repoPath, 'SKILL.md');
    const requires = readRequiresHarness(skillMd);
    if (requires) {
      assertHarnessCompatible(requires);
    }
  }
}
