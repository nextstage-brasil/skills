import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync, lstatSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scaffoldProject } from '../src/scaffold.js';
import { syncRules, hashBody, stripFrontmatter } from '../src/syncRules.js';
import { syncSkills } from '../src/syncSkills.js';
import { syncDockerignore, buildDockerignoreBlock } from '../src/syncDockerignore.js';
import { syncGitignore, buildGitignoreBlock } from '../src/syncGitignore.js';
import { generateAgentsMd } from '../src/generateAgentsMd.js';
import { migrateRules } from '../src/migrateRules.js';
import { pruneRetiredSkills, assessPruneRetiredSkills } from '../src/pruneRetiredSkills.js';
import { groupExternalSkillsBySource, getExternalPreset } from '../src/externalSkills.js';

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
  assert(
    scaffoldResult.created.some((f) => f.includes('.nextstage-harness/README.md')),
    'scaffold should create .nextstage-harness/README.md',
  );
  assert(
    readFileSync(join(tempDir, '.nextstage-harness', 'README.md'), 'utf8').includes('add-rule'),
    'harness README should mention add-rule',
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

  // 5. skill symlinks to cursor/claude
  const skillsCanonical = join(tempDir, '.agents', 'skills', 'code-coder');
  mkdirSync(skillsCanonical, { recursive: true });
  writeFileSync(join(skillsCanonical, 'SKILL.md'), '---\nname: code-coder\ndescription: test\n---\n\n# Code Coder\n', 'utf8');
  const skillSync = syncSkills(tempDir, { agents: ['cursor', 'claude-code'] });
  assert(skillSync.written.length === 2, 'syncSkills should write cursor and claude adapters');
  const cursorSkill = join(tempDir, '.cursor', 'skills', 'code-coder');
  assert(exists(cursorSkill), 'cursor skill symlink missing');
  assert(
    lstatSync(cursorSkill).isSymbolicLink() || skillSync.written[0].includes('copy'),
    'cursor skill should be symlink unless copy fallback',
  );

  // 6. agents-md from installed skills layout
  const skillsDir = join(tempDir, '.agents', 'skills', 'nextstage-harness');
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, 'SKILL.md'), '# stub\n', 'utf8');
  const agentsMd = generateAgentsMd(tempDir, { force: true });
  assert(!agentsMd.skipped, 'agents-md should write files');
  assert(exists(join(tempDir, 'AGENTS.md')), 'AGENTS.md missing');
  assert(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8').trim() === '@AGENTS.md', 'CLAUDE.md must point to AGENTS.md');
  assert(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8').includes('nextstage-harness'), 'AGENTS.md should list installed skill');

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

  // 8. add-rule creates canonical + manifest + adapters
  const addResult = runCli(
    [
      'add-rule',
      'api-conventions',
      '--description',
      'API conventions for agents',
      '--dir',
      tempDir,
    ],
    harnessRoot,
  );
  assert(addResult.status === 0, `add-rule should succeed: ${addResult.stderr}${addResult.stdout}`);

  const addedCanonical = join(tempDir, '.nextstage-harness', 'rules', 'api-conventions.md');
  assert(exists(addedCanonical), 'add-rule should create canonical file');
  assert(
    readFileSync(addedCanonical, 'utf8').includes('# Api Conventions'),
    'add-rule stub should use title-cased name',
  );

  const manifest = JSON.parse(
    readFileSync(join(tempDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
  );
  assert(
    manifest.rules.some((r) => r.name === 'api-conventions' && r.cursor?.alwaysApply === true),
    'add-rule should register alwaysApply entry in manifest',
  );
  assert(
    exists(join(tempDir, '.cursor', 'rules', 'api-conventions.mdc')),
    'add-rule should sync cursor adapter',
  );
  assert(
    exists(join(tempDir, '.claude', 'rules', 'api-conventions.md')),
    'add-rule should sync claude adapter',
  );

  const dup = runCli(['add-rule', 'api-conventions', '--dir', tempDir], harnessRoot);
  assert(dup.status === 1, 'add-rule without --force should fail on existing rule');

  const globsResult = runCli(
    [
      'add-rule',
      'frontend-rules',
      '--globs',
      'apps/web/**,packages/ui/**',
      '--description',
      'Frontend conventions',
      '--dir',
      tempDir,
    ],
    harnessRoot,
  );
  assert(
    globsResult.status === 0,
    `add-rule with --globs should succeed: ${globsResult.stderr}${globsResult.stdout}`,
  );
  const manifestAfterGlobs = JSON.parse(
    readFileSync(join(tempDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
  );
  const frontendEntry = manifestAfterGlobs.rules.find((r) => r.name === 'frontend-rules');
  assert(frontendEntry?.cursor?.globs === 'apps/web/**,packages/ui/**', 'globs should be in manifest');
  assert(
    Array.isArray(frontendEntry?.claude?.paths) && frontendEntry.claude.paths.length === 2,
    'claude.paths should mirror globs',
  );
  assert(!frontendEntry.cursor.alwaysApply, 'globs mode should not set alwaysApply');

  // 9. syncDockerignore patches existing .dockerignore
  const dockerignorePath = join(tempDir, '.dockerignore');
  writeFileSync(dockerignorePath, 'node_modules\n', 'utf8');
  const dockerignoreSync = syncDockerignore(tempDir);
  assert(dockerignoreSync.written.length === 1, 'syncDockerignore should update .dockerignore');
  const dockerignoreContent = readFileSync(dockerignorePath, 'utf8');
  assert(dockerignoreContent.startsWith('node_modules\n'), 'syncDockerignore should preserve existing entries');
  assert(dockerignoreContent.includes('/AGENTS.md'), 'dockerignore should include AGENTS.md');
  assert(dockerignoreContent.includes('/AGENTS.local.md'), 'dockerignore should include AGENTS.local.md');
  assert(dockerignoreContent.includes('/.worktrees/'), 'dockerignore should include .worktrees');
  assert(dockerignoreContent.includes('/CLAUDE.md'), 'dockerignore should include CLAUDE.md');
  assert(dockerignoreContent.includes('/skills-lock.json'), 'dockerignore should include skills-lock.json');
  assert(
    dockerignoreContent.includes(buildDockerignoreBlock().trim()),
    'dockerignore should contain full managed block',
  );

  const dockerignoreResync = syncDockerignore(tempDir);
  assert(dockerignoreResync.written.length === 0, 'syncDockerignore should be idempotent');

  // 10. syncGitignore patches existing .gitignore
  const gitignorePath = join(tempDir, '.gitignore');
  writeFileSync(gitignorePath, 'vendor/\n', 'utf8');
  const gitignoreSync = syncGitignore(tempDir);
  assert(gitignoreSync.written.length === 1, 'syncGitignore should update .gitignore');
  const gitignoreContent = readFileSync(gitignorePath, 'utf8');
  assert(gitignoreContent.startsWith('vendor/\n'), 'syncGitignore should preserve existing entries');
  assert(gitignoreContent.includes('/AGENTS.local.md'), 'gitignore should include AGENTS.local.md');
  assert(gitignoreContent.includes('/.worktrees/'), 'gitignore should include .worktrees');
  assert(
    gitignoreContent.includes(buildGitignoreBlock().trim()),
    'gitignore should contain full managed block',
  );

  const gitignoreResync = syncGitignore(tempDir);
  assert(gitignoreResync.written.length === 0, 'syncGitignore should be idempotent');

  // 11. prune-retired-skills removes old dirs only when replacement exists
  const agentsSkillsDir = join(tempDir, '.agents', 'skills');
  const oldSkillDir = join(agentsSkillsDir, 'task-generator');
  const newSkillDir = join(agentsSkillsDir, 'pm-task-generator');
  const cursorOldSkill = join(tempDir, '.cursor', 'skills', 'task-generator');
  mkdirSync(oldSkillDir, { recursive: true });
  writeFileSync(join(oldSkillDir, 'SKILL.md'), '# old\n', 'utf8');
  mkdirSync(dirname(cursorOldSkill), { recursive: true });
  mkdirSync(cursorOldSkill, { recursive: true });
  writeFileSync(join(cursorOldSkill, 'SKILL.md'), '# old adapter\n', 'utf8');

  const blocked = assessPruneRetiredSkills(tempDir);
  assert(
    blocked.skipped.some((entry) => entry.oldName === 'task-generator'),
    'prune should skip when replacement is missing',
  );
  assert(blocked.removable.length === 0, 'prune should not remove without replacement');

  mkdirSync(newSkillDir, { recursive: true });
  writeFileSync(join(newSkillDir, 'SKILL.md'), '# new\n', 'utf8');
  writeFileSync(
    join(tempDir, 'skills-lock.json'),
    JSON.stringify({ version: 1, skills: { 'task-generator': { source: 'test' } } }, null, 2),
    'utf8',
  );

  const pruned = pruneRetiredSkills(tempDir);
  assert(pruned.removed.length >= 2, 'prune should remove canonical and adapter paths');
  assert(!existsSync(oldSkillDir), 'old canonical skill dir should be removed');
  assert(!existsSync(cursorOldSkill), 'old cursor adapter should be removed');
  assert(existsSync(newSkillDir), 'replacement skill dir should remain');
  assert(pruned.lockPruned.includes('task-generator'), 'prune should drop retired skills-lock entry');

  const dryRunCli = runCli(['prune-retired-skills', '--dry-run', '--dir', tempDir], harnessRoot);
  assert(dryRunCli.status === 0, `prune-retired-skills --dry-run should pass: ${dryRunCli.stderr}${dryRunCli.stdout}`);

  // 12. external skills registry groups installs by source
  const grouped = groupExternalSkillsBySource(['langchain-fundamentals', 'langgraph-persistence', 'vitest']);
  assert(grouped.length === 2, 'external skills should group by source repo');
  const langchainGroup = grouped.find((group) => group.source === 'langchain-ai/langchain-skills');
  assert(langchainGroup?.skills.length === 2, 'langchain repo should include two skills');

  const agentsApiPreset = getExternalPreset('agents-api');
  assert(agentsApiPreset?.skills.length === 6, 'agents-api preset should include all six external skills');
  assert(agentsApiPreset?.skills.includes('langgraph-persistence'), 'agents-api preset should include langgraph skill');
  assert(agentsApiPreset?.skills.includes('postgresql-table-design'), 'agents-api preset should include postgresql skill');
  assert(agentsApiPreset?.nsSkills.includes('multi-agent-architect'), 'agents-api preset should include NS architect skill');

  const agentsApiDryRun = runCli(['--dry-run', '--yes', '--preset', 'agents-api', '--dir', tempDir], harnessRoot);
  assert(agentsApiDryRun.status === 0, `agents-api preset dry-run should pass: ${agentsApiDryRun.stderr}${agentsApiDryRun.stdout}`);
  assert(
    agentsApiDryRun.stdout.includes('langchain-fundamentals') && agentsApiDryRun.stdout.includes('vitest'),
    'agents-api dry-run should list all external skills',
  );

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
  return existsSync(path);
}
