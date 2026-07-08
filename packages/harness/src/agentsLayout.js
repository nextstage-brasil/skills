import { join } from 'node:path';

export const AGENTS_HOME = '.agents';

export const HARNESS_ROOT = '.nextstage-harness';
export const HARNESS_RULES_DIR = join(HARNESS_ROOT, 'rules');
export const HARNESS_DOCS_DIR = join(HARNESS_ROOT, 'docs');

export const AGENTS_LAYOUT_DIRS = [
  join(AGENTS_HOME, 'docs'),
];

export const AGENTS_SKILLS_DIR = join(AGENTS_HOME, 'skills');

export const DEFAULT_AGENTS = ['cursor', 'claude-code'];
