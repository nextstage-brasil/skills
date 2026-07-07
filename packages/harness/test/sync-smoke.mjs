import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scaffoldProject } from '../src/scaffold.js';
import { syncRules, hashBody, stripFrontmatter } from '../src/syncRules.js';
import { syncAgents } from '../src/syncAgents.js';
import { generateAgentsMd } from '../src/generateAgentsMd.js';
import { migrateRules } from '../src/migrateRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const harnessRoot = join(__dirname, '..');
const cliPath = join(harnessRoot, 'bin', 'cli.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
  return result;
}

let tempDir;
try {
  tempDir = mkdtempSync(join(tmpdir(), 'harness-sync-'));

  // 1. Scaffold creates .nextstage-harness/
  const scaffoldResult = scaffoldProject(tempDir, { agents: true, docs: true });
  assert(
    scaffoldResult.created.some((f) => f.includes('.nextstage-harness/manifest.json')),
    'scaffold should create manifest.json',
  );
  assert(
    scaffoldResult.created.some((f) => f.includes('.nextstage-harness/rules/architecture-rules.md')),
    'scaffold should create architecture-rules stub',
  );

  // 2. sync generates adapters with matching hash
  const canonicalPath = join(tempDir, '.nextstage-harness', 'rules', 'architecture-rules.md');
  const edited = `${readFileSync(canonicalPath, 'utf8')}\n\n## Test marker\n\nSmoke test content.\n`;
  writeFileSync(canonicalPath, edited, 'utf8');

  const syncResult = syncRules(tempDir, { agents: ['cursor', 'claude-code'] });
  assert(syncResult.written.length >= 2, 'sync should write cursor and claude adapters');

  const cursorAdapter = join(tempDir, '.cursor', 'rules', 'architecture-rules.mdc');
  const claudeAdapter = join(tempDir, '.claude', 'rules', 'architecture-rules.md');
  assert(readFileSync(cursorAdapter, 'utf8').includes('Smoke test content'), 'cursor adapter should contain body');
  assert(readFileSync(claudeAdapter, 'utf8').includes('Smoke test content'), 'claude adapter should contain body');

  const body = stripFrontmatter(edited);
  const expectedHash = hashBody(body);
  assert(
    readFileSync(cursorAdapter, 'utf8').includes(`sha256=${expectedHash}`),
    'cursor adapter should embed canonical hash',
  );

  // 3. sync --check passes after sync
  let check = runCli(['sync', '--check', '--dir', tempDir], harnessRoot);
  assert(check.status === 0, `sync --check should pass: ${check.stderr}${check.stdout}`);

  // 4. sync --check fails when canonical changes without re-sync
  writeFileSync(canonicalPath, `${readFileSync(canonicalPath, 'utf8')}\nDrift line.\n`, 'utf8');
  check = runCli(['sync', '--check', '--dir', tempDir], harnessRoot);
  assert(check.status === 1, 'sync --check should fail when canonical changed without re-sync');

  // Re-sync before migrate test section needs clean state
  syncRules(tempDir, { agents: ['cursor', 'claude-code'] });
  check = runCli(['sync', '--check', '--dir', tempDir], harnessRoot);
  assert(check.status === 0, `sync --check should pass after re-sync: ${check.stderr}${check.stdout}`);

  assert(check.status === 0, `sync --check should pass after re-sync: ${check.stderr}${check.stdout}`);

  // 5. agents-md from installed skills layout
  const skillsDir = join(tempDir, '.agents', 'skills', 'nextstage-harness');
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, 'SKILL.md'), '# stub\n', 'utf8');
  const agentsMd = generateAgentsMd(tempDir, { force: true });
  assert(!agentsMd.skipped, 'agents-md should write files');
  assert(exists(join(tempDir, 'AGENTS.md')), 'AGENTS.md missing');
  assert(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8').trim() === '@AGENTS.md', 'CLAUDE.md must point to AGENTS.md');
  assert(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8').includes('nextstage-harness'), 'AGENTS.md should list installed skill');

  // 6. agent persona sync to cursor/claude adapters
  const personaDir = join(tempDir, '.agents', 'agents');
  mkdirSync(personaDir, { recursive: true });
  writeFileSync(join(personaDir, 'test-persona.md'), '---\nname: test-persona\ndescription: smoke\n---\n\n# Test\n', 'utf8');
  const agentSync = syncAgents(tempDir, { agents: ['cursor', 'claude-code'] });
  assert(agentSync.written.length === 2, 'syncAgents should write cursor and claude adapters');
  const cursorAgent = join(tempDir, '.cursor', 'agents', 'test-persona.md');
  const claudeAgent = join(tempDir, '.claude', 'agents', 'test-persona.md');
  assert(exists(cursorAgent), 'cursor agent adapter missing');
  assert(exists(claudeAgent), 'claude agent adapter missing');
  assert(
    lstatSync(cursorAgent).isSymbolicLink() || agentSync.written[0].includes('copy'),
    'cursor agent should be symlink unless copy fallback',
  );

  // 7. migrate-rules round-trip from fixture
  const migrateDir = mkdtempSync(join(tmpdir(), 'harness-migrate-'));
  try {
    const legacyDir = join(migrateDir, '.cursor', 'rules');
    mkdirSync(legacyDir, { recursive: true });
    copyFileSync(
      join(__dirname, 'fixtures', 'legacy-rule.mdc'),
      join(legacyDir, 'backend-rules.mdc'),
    );

    const migrateResult = migrateRules(migrateDir, { force: true });
    assert(
      migrateResult.migrated.includes('rules/backend-rules.md'),
      'migrate should create canonical backend-rules.md',
    );

    const migratedCanonical = join(migrateDir, '.nextstage-harness', 'rules', 'backend-rules.md');
    assert(
      readFileSync(migratedCanonical, 'utf8').includes('repository pattern'),
      'migrated canonical should contain rule body',
    );

    const migratedCursor = join(migrateDir, '.cursor', 'rules', 'backend-rules.mdc');
    assert(exists(migratedCursor), 'migrate should regenerate cursor adapter');
  } finally {
    rmSync(migrateDir, { recursive: true, force: true });
  }

  console.log('OK: harness sync smoke tests passed');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function exists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
