import { join } from 'node:path';

export const AGENTS_HOME = '.agents';

export const AGENTS_LAYOUT_DIRS = [
  join(AGENTS_HOME, 'agents'),
  join(AGENTS_HOME, 'rules'),
  join(AGENTS_HOME, 'docs'),
];

export const AGENTS_PERSONAS_DIR = join(AGENTS_HOME, 'agents');
