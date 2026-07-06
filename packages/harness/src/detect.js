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
  const hasDocsVersions = existsSync(join(resolved, 'docs', 'versions'));
  const hasInstalledSkills = existsSync(join(resolved, '.agents', 'skills'));
  const hasPersonas = existsSync(join(resolved, 'agents'));

  const isExisting =
    hasManifest || hasCodeDir || hasAgents || hasDocsVersions || hasPersonas;

  return {
    projectRoot: resolved,
    kind: isExisting ? 'existing' : 'new',
    signals: {
      hasManifest,
      hasCodeDir,
      hasAgents,
      hasDocsVersions,
      hasInstalledSkills,
      hasPersonas,
    },
  };
}

function resolveDir(dir) {
  if (dir.startsWith('~')) {
    return resolve(process.env.HOME ?? '', dir.slice(1));
  }
  return resolve(dir);
}
