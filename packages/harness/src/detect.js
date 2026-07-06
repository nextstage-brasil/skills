import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MANIFEST_FILES = [
  'package.json',
  'composer.json',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'Gemfile',
];

const CODE_DIRS = ['src', 'app', 'apps', 'lib', 'internal', 'pkg'];

export function detectProject(projectRoot) {
  const resolved = resolveDir(projectRoot);
  const hasManifest = MANIFEST_FILES.some((file) => existsSync(join(resolved, file)));
  const hasCodeDir = CODE_DIRS.some((dir) => {
    const path = join(resolved, dir);
    return existsSync(path) && statSync(path).isDirectory() && readdirSync(path).length > 0;
  });
  const hasAgents = existsSync(join(resolved, 'AGENTS.md'));
  const hasCursorRules = existsSync(join(resolved, '.cursor', 'rules'));
  const hasClaudeDir = existsSync(join(resolved, '.claude'));
  const hasDocsVersions = existsSync(join(resolved, 'docs', 'versions'));
  const hasInstalledSkills = existsSync(join(resolved, '.agents', 'skills'));

  const isExisting = hasManifest || hasCodeDir || hasAgents || hasCursorRules || hasDocsVersions;

  return {
    projectRoot: resolved,
    kind: isExisting ? 'existing' : 'new',
    signals: {
      hasManifest,
      hasCodeDir,
      hasAgents,
      hasCursorRules,
      hasClaudeDir,
      hasDocsVersions,
      hasInstalledSkills,
    },
    harnesses: detectHarnesses(resolved, { hasCursorRules, hasClaudeDir }),
  };
}

const HARNESS_AGENT_DIRS = {
  claude: ['.claude', 'agents'],
  cursor: ['.cursor', 'agents'],
};

// Which native harness dirs are present, so we know where to project
// harness-agnostic agent personas (see src/agentPersonas.js). A project can
// have more than one harness set up at once.
function detectHarnesses(resolved, { hasCursorRules, hasClaudeDir }) {
  const harnesses = [];
  if (hasClaudeDir) harnesses.push('claude');
  if (hasCursorRules || existsSync(join(resolved, '.cursor'))) harnesses.push('cursor');
  return harnesses;
}

export { HARNESS_AGENT_DIRS };

// Where to copy agent personas when the consumer project has no harness dirs yet.
export const DEFAULT_PROJECTION_HARNESSES = ['cursor'];

export function projectionHarnesses(detected = []) {
  return detected.length > 0 ? detected : DEFAULT_PROJECTION_HARNESSES;
}

function resolveDir(dir) {
  if (dir.startsWith('~')) {
    return resolve(process.env.HOME ?? '', dir.slice(1));
  }
  return resolve(dir);
}
