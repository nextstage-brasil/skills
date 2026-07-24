import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESS_ROOT } from './agentsLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');
const readmeTemplatePath = join(templatesDir, 'harness-README.md');

/**
 * Always overwrite `.nextstage-harness/README.md` from the harness package template.
 * No-op when the harness root directory does not exist yet.
 */
export function refreshHarnessReadme(projectRoot) {
  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  if (!existsSync(harnessRoot)) {
    return { skipped: true, reason: 'harness root missing' };
  }

  const readmeTarget = join(harnessRoot, 'README.md');
  const existed = existsSync(readmeTarget);
  mkdirSync(harnessRoot, { recursive: true });
  copyFileSync(readmeTemplatePath, readmeTarget);

  return {
    skipped: false,
    path: readmeTarget,
    created: !existed,
    updated: existed,
  };
}
