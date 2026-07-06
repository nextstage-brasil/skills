import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE = 'nextstage-brasil/skills';
const MARKER = join('skills', 'nextstage-harness', 'SKILL.md');

export function resolveSource(explicit) {
  if (explicit) return explicit;

  const fromEnv = process.env.NEXTSTAGE_SKILLS_SOURCE;
  if (fromEnv) return fromEnv;

  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '../..'),
    dirname(dirname(fileURLToPath(import.meta.url))),
    resolve(dirname(dirname(fileURLToPath(import.meta.url))), '..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, MARKER))) {
      return candidate;
    }
  }

  return DEFAULT_SOURCE;
}
