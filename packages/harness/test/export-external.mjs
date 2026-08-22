import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportExternalAll, validateExternalDir } from '../src/exportExternal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const outDir = join(mkdtempSync(join(tmpdir(), 'ns-export-')), 'external');

try {
  const result = exportExternalAll({
    repoRoot,
    outDir,
    zip: false,
  });

  assert(result.skills.length === 2, `expected 2 skills, got ${result.skills.join(',')}`);
  assert(result.skills.includes('ns-project-manager'), 'missing ns-project-manager');
  assert(result.skills.includes('ns-multi-agent-architect'), 'missing ns-multi-agent-architect');

  const errors = validateExternalDir(outDir);
  assert(errors.length === 0, errors.join('\n'));

  const face = join(outDir, 'ns-project-manager');
  const skillMd = readFileSync(join(face, 'SKILL.md'), 'utf8');
  assert(!skillMd.includes('requires_harness:'), 'requires_harness leaked');
  assert(!skillMd.includes('\ndepends:'), 'depends leaked');
  assert(!existsSync(join(outDir, 'ns-commercial-budget')), 'commercial must be nested, not a top-level export');

  const nested = join(face, 'references', 'ns-commercial-budget', 'workflow.md');
  assert(existsSync(nested), 'nested commercial workflow.md missing');
  assert(!existsSync(join(face, 'references', 'ns-commercial-budget', 'SKILL.md')), 'nested SKILL.md must not exist');
  assert(existsSync(join(face, 'references', 'ns-commercial-budget', 'references', 'product-context.md')), 'nested commercial references missing');
  assert(!existsSync(join(face, 'references', 'ns-commercial-budget', 'evals')), 'nested evals must not export');

  const scheduleMd = readFileSync(join(face, 'references', 'ns-delivery-schedule', 'workflow.md'), 'utf8');
  assert(scheduleMd.includes('python3 ../../scripts/pert_montecarlo.py'), 'PERT path not nested');
  assert(existsSync(join(face, 'scripts', 'pert_montecarlo.py')), 'face pert_montecarlo.py missing');

  const enricher = readFileSync(join(face, 'references', 'ns-requirements-enricher', 'workflow.md'), 'utf8');
  const faceRouter = readFileSync(join(face, 'SKILL.md'), 'utf8');
  assert(faceRouter.includes('references/ns-commercial-budget/workflow.md'), 'face router paths not rewritten');
  assert(!enricher.includes('../../gitlab/'), 'gitlab skill path leaked');

  const architectDir = join(outDir, 'ns-multi-agent-architect');
  const architectMd = readFileSync(join(architectDir, 'SKILL.md'), 'utf8');
  assert(architectMd.includes('Standalone import'), 'standalone delivery note missing');
  assert(existsSync(join(architectDir, 'references', 'reference-architecture.md')), 'reference-architecture.md missing');
  assert(!existsSync(join(architectDir, 'evals')), 'evals must not export');

  console.log('export-external smoke ok');
} finally {
  rmSync(dirname(outDir), { recursive: true, force: true });
}
