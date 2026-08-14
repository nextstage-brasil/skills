import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportExternal, validateExternalDir } from '../src/exportExternal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const outDir = join(mkdtempSync(join(tmpdir(), 'ns-export-')), 'external');

try {
  const result = exportExternal({
    preset: 'project-manager',
    repoRoot,
    outDir,
    zip: false,
  });

  assert(result.skills.length === 1, `expected 1 face skill, got ${result.skills.join(',')}`);
  assert(result.skills[0] === 'ns-project-manager', 'face must be ns-project-manager');

  const errors = validateExternalDir(outDir);
  assert(errors.length === 0, errors.join('\n'));

  const face = join(outDir, 'ns-project-manager');
  const skillMd = readFileSync(join(face, 'SKILL.md'), 'utf8');
  assert(!skillMd.includes('requires_harness:'), 'requires_harness leaked');
  assert(!skillMd.includes('\ndepends:'), 'depends leaked');
  assert(!existsSync(join(outDir, 'ns-commercial-budget')), 'commercial must be nested, not a top-level export');

  const nested = join(face, 'references', 'ns-commercial-budget', 'SKILL.md');
  assert(existsSync(nested), 'nested commercial SKILL.md missing');
  assert(existsSync(join(face, 'references', 'ns-commercial-budget', 'references', 'product-context.md')), 'nested commercial references missing');
  assert(!existsSync(join(face, 'references', 'ns-commercial-budget', 'evals')), 'nested evals must not export');

  const scheduleMd = readFileSync(join(face, 'references', 'ns-delivery-schedule', 'SKILL.md'), 'utf8');
  assert(scheduleMd.includes('python3 ../../scripts/pert_montecarlo.py'), 'PERT path not nested');
  assert(existsSync(join(face, 'scripts', 'pert_montecarlo.py')), 'face pert_montecarlo.py missing');

  const enricher = readFileSync(join(face, 'references', 'ns-requirements-enricher', 'SKILL.md'), 'utf8');
  assert(!enricher.includes('../../gitlab/'), 'gitlab skill path leaked');

  console.log('export-external smoke ok');
} finally {
  rmSync(dirname(outDir), { recursive: true, force: true });
}
