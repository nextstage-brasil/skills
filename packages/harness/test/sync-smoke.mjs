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
import { pruneExcludedAgentAdapters } from '../src/pruneExcludedAgentAdapters.js';
import { listSkillsToUpdate } from '../src/update.js';
import { resolveAgentsConfig } from '../src/agentsLayout.js';
import { writeManifestAgents } from '../src/manifest.js';
import { syncSubagents } from '../src/syncSubagents.js';
import { buildSubagentBody } from '../src/subagentCanonical.js';
import { ensureSubagents } from '../src/ensureSubagents.js';
import { runUninstall, assessUninstall } from '../src/uninstall.js';
import { stripIgnoreContent } from '../src/patchIgnoreContent.js';
import {
  AGENTS_HOME,
  DOCKERIGNORE_BLOCK_HEADER,
  DOCKERIGNORE_ENTRIES,
  GITIGNORE_BLOCK_HEADER,
  GITIGNORE_ENTRIES,
} from '../src/agentsLayout.js';

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
  for (const dir of ['docs/context', 'docs/specs', 'docs/versions']) {
    assert(existsSync(join(tempDir, ...dir.split('/'))), `scaffold should create ${dir}`);
    assert(
      existsSync(join(tempDir, ...dir.split('/'), '.gitkeep')),
      `scaffold should create ${dir}/.gitkeep`,
    );
  }
  assert(!existsSync(join(tempDir, '.agents', 'docs')), 'scaffold must not create .agents/docs');

  writeFileSync(join(tempDir, '.nextstage-harness', 'README.md'), '# stale guide\n', 'utf8');
  const readmeResync = scaffoldProject(tempDir, { agents: true, docs: false });
  assert(
    readmeResync.created.some((entry) => entry.includes('README.md (updated)')),
    'scaffold should refresh existing harness README',
  );
  assert(
    readFileSync(join(tempDir, '.nextstage-harness', 'README.md'), 'utf8').includes('Start here'),
    'refreshed README should match current template',
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

  // 5. skill adapters — Claude only (Cursor reads .agents/skills/ directly)
  const skillsCanonical = join(tempDir, '.agents', 'skills', 'ns-code-coder');
  mkdirSync(skillsCanonical, { recursive: true });
  writeFileSync(join(skillsCanonical, 'SKILL.md'), '---\nname: ns-code-coder\ndescription: test\n---\n\n# Code Coder\n', 'utf8');
  const skillSync = syncSkills(tempDir, { agents: ['cursor', 'claude-code'] });
  assert(skillSync.written.some((entry) => entry.includes('.claude/skills')), 'syncSkills should write claude adapter');
  assert(
    !skillSync.written.some((entry) => entry.includes('.cursor/skills') && !entry.includes('removed-legacy-adapter')),
    'syncSkills should not create cursor skill adapters',
  );
  const claudeSkill = join(tempDir, '.claude', 'skills', 'ns-code-coder');
  assert(exists(claudeSkill), 'claude skill symlink missing');
  assert(
    lstatSync(claudeSkill).isSymbolicLink() || skillSync.written.some((entry) => entry.includes('copy')),
    'claude skill should be symlink unless copy fallback',
  );

  // 6. agents-md from installed skills layout
  const skillsDir = join(tempDir, '.agents', 'skills', 'ns-harness');
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, 'SKILL.md'), '# stub\n', 'utf8');
  const agentsMd = generateAgentsMd(tempDir, { force: true });
  assert(!agentsMd.skipped, 'agents-md should write files');
  assert(exists(join(tempDir, 'AGENTS.md')), 'AGENTS.md missing');
  assert(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8').trim() === '@AGENTS.md', 'CLAUDE.md must point to AGENTS.md');
  assert(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8').includes('ns-harness'), 'AGENTS.md should list installed skill');

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

  // 9. syncDockerignore creates missing .dockerignore, then patches existing
  const dockerignoreCreateDir = join(tempDir, 'dockerignore-create');
  mkdirSync(dockerignoreCreateDir, { recursive: true });
  const createdDockerignore = syncDockerignore(dockerignoreCreateDir);
  const createdDockerignorePath = join(dockerignoreCreateDir, '.dockerignore');
  assert(createdDockerignore.written.length === 1, 'syncDockerignore should create .dockerignore when missing');
  assert(existsSync(createdDockerignorePath), 'syncDockerignore should write .dockerignore file');
  const createdDockerignoreContent = readFileSync(createdDockerignorePath, 'utf8');
  for (const entry of ['/docs', '/.agents', '/.cursor', '/.claude', '/AGENTS.md', '/CLAUDE.md']) {
    assert(createdDockerignoreContent.includes(entry), `created dockerignore should include ${entry}`);
  }

  const dockerignorePath = join(tempDir, '.dockerignore');
  writeFileSync(dockerignorePath, 'node_modules\n', 'utf8');
  const dockerignoreSync = syncDockerignore(tempDir);
  assert(dockerignoreSync.written.length === 1, 'syncDockerignore should update .dockerignore');
  const dockerignoreContent = readFileSync(dockerignorePath, 'utf8');
  assert(dockerignoreContent.startsWith('node_modules\n'), 'syncDockerignore should preserve existing entries');
  assert(dockerignoreContent.includes('/docs'), 'dockerignore should include /docs');
  assert(dockerignoreContent.includes('/.agents'), 'dockerignore should include /.agents');
  assert(dockerignoreContent.includes('/.cursor'), 'dockerignore should include /.cursor');
  assert(dockerignoreContent.includes('/.claude'), 'dockerignore should include /.claude');
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
  assert(gitignoreContent.includes('/.cursor/rules/'), 'gitignore should include .cursor/rules');
  assert(gitignoreContent.includes('/.cursor/agents/'), 'gitignore should include .cursor/agents');
  assert(gitignoreContent.includes('/.claude/'), 'gitignore should include .claude');
  assert(
    gitignoreContent.includes(buildGitignoreBlock().trim()),
    'gitignore should contain full managed block',
  );

  const gitignoreResync = syncGitignore(tempDir);
  assert(gitignoreResync.written.length === 0, 'syncGitignore should be idempotent');

  // 11. prune-retired-skills removes old dirs only when replacement exists
  const agentsSkillsDir = join(tempDir, '.agents', 'skills');
  const oldSkillDir = join(agentsSkillsDir, 'task-generator');
  const newSkillDir = join(agentsSkillsDir, 'ns-sdd-task-generator');
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
  assert(agentsApiPreset?.nsSkills.includes('ns-multi-agent-architect'), 'agents-api preset should include NS architect skill');
  assert(agentsApiPreset?.nsSkills.includes('ns-langgraph-agents'), 'agents-api preset should include ns-langgraph-agents');

  const coderLanggraphPreset = getExternalPreset('coder-langgraph');
  assert(coderLanggraphPreset?.nsSkills.includes('ns-langgraph-agents'), 'coder-langgraph preset should include ns-langgraph-agents');
  assert(coderLanggraphPreset?.nsSkills.includes('ns-code-coder'), 'coder-langgraph preset should include ns-code-coder');
  assert(coderLanggraphPreset?.nsSkills.includes('ns-code-investigator'), 'coder-langgraph preset should include ns-code-investigator');
  assert(coderLanggraphPreset?.skills.length === 4, 'coder-langgraph preset should include four external skills');

  const coderLanggraphDryRun = runCli(['--dry-run', '--yes', '--preset', 'coder-langgraph', '--dir', tempDir], harnessRoot);
  assert(coderLanggraphDryRun.status === 0, `coder-langgraph preset dry-run should pass: ${coderLanggraphDryRun.stderr}${coderLanggraphDryRun.stdout}`);
  assert(
    coderLanggraphDryRun.stdout.includes('ns-langgraph-agents') && coderLanggraphDryRun.stdout.includes('langgraph-persistence'),
    'coder-langgraph dry-run should list NS and external langgraph skills',
  );

  const agentsApiDryRun = runCli(['--dry-run', '--yes', '--preset', 'agents-api', '--dir', tempDir], harnessRoot);
  assert(agentsApiDryRun.status === 0, `agents-api preset dry-run should pass: ${agentsApiDryRun.stderr}${agentsApiDryRun.stdout}`);
  assert(
    agentsApiDryRun.stdout.includes('langchain-fundamentals') && agentsApiDryRun.stdout.includes('vitest'),
    'agents-api dry-run should list all external skills',
  );

  // 13. update — only installed skills, dry-run
  const updateEmptyDir = mkdtempSync(join(tmpdir(), 'harness-update-empty-'));
  try {
    const updateEmpty = runCli(['update', '--dir', updateEmptyDir], harnessRoot);
    assert(updateEmpty.status === 0, `update with no skills should succeed: ${updateEmpty.stderr}${updateEmpty.stdout}`);
    assert(
      updateEmpty.stdout.includes('No installed skills to update'),
      'update should report when nothing is installed',
    );
  } finally {
    rmSync(updateEmptyDir, { recursive: true, force: true });
  }

  const plan = listSkillsToUpdate(tempDir, ['ns-harness', 'missing-skill']);
  assert(plan.skills.length === 1 && plan.skills[0] === 'ns-harness', 'update plan should filter to installed only');
  assert(plan.notInstalled.includes('missing-skill'), 'update plan should track missing skills');

  const updateDryRun = runCli(['update', '--dry-run', '--dir', tempDir], harnessRoot);
  assert(updateDryRun.status === 0, `update --dry-run should pass: ${updateDryRun.stderr}${updateDryRun.stdout}`);
  assert(
    updateDryRun.stdout.includes('ns-harness'),
    'update dry-run should list installed skills',
  );

  const updateMissing = runCli(['update', '--skill', 'missing-skill', '--dir', tempDir], harnessRoot);
  assert(updateMissing.status === 1, 'update --skill for missing skill should fail');

  mkdirSync(join(tempDir, '.claude', 'skills', 'ns-harness'), { recursive: true });
  writeFileSync(join(tempDir, '.claude', 'skills', 'ns-harness', 'SKILL.md'), '# claude\n', 'utf8');
  writeFileSync(join(tempDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');
  const prunedAgents = pruneExcludedAgentAdapters(tempDir, ['cursor']);
  assert(prunedAgents.removed.some((path) => path.endsWith('.claude')), 'cursor-only should remove .claude adapters');
  assert(!existsSync(join(tempDir, '.claude')), '.claude should be removed after cursor-only prune');
  assert(prunedAgents.removed.some((path) => path.endsWith('CLAUDE.md')), 'cursor-only should remove CLAUDE.md');
  assert(!existsSync(join(tempDir, 'CLAUDE.md')), 'CLAUDE.md should be removed after cursor-only prune');

  const agentsOnlyDir = mkdtempSync(join(tmpdir(), 'harness-agents-manifest-'));
  try {
    scaffoldProject(agentsOnlyDir, { agents: true, docs: false });
    writeManifestAgents(agentsOnlyDir, ['cursor']);
    const resolved = resolveAgentsConfig(agentsOnlyDir, []);
    assert(
      resolved.agents.length === 1 && resolved.agents[0] === 'cursor' && resolved.source === 'manifest',
      'resolveAgentsConfig should read manifest.agents',
    );

    const agentsSet = runCli(['agents', 'set', 'cursor', '--dir', agentsOnlyDir], harnessRoot);
    assert(agentsSet.status === 0, `agents set should pass: ${agentsSet.stderr}${agentsSet.stdout}`);
    const manifestAfterSet = JSON.parse(
      readFileSync(join(agentsOnlyDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
    );
    assert(
      JSON.stringify(manifestAfterSet.agents) === JSON.stringify(['cursor']),
      'agents set should persist cursor in manifest',
    );

    const agentsShow = runCli(['agents', '--dir', agentsOnlyDir], harnessRoot);
    assert(agentsShow.status === 0, `agents show should pass: ${agentsShow.stderr}${agentsShow.stdout}`);
    assert(agentsShow.stdout.includes('cursor'), 'agents show should list cursor');
  } finally {
    rmSync(agentsOnlyDir, { recursive: true, force: true });
  }

  // Subagents: seed from installed skills, preserve model on re-ensure, write adapters
  const subagentsDir = mkdtempSync(join(tmpdir(), 'harness-subagents-'));
  try {
    scaffoldProject(subagentsDir, { agents: true, docs: false });
    for (const skill of ['ns-code-coder', 'ns-code-reviewer', 'ns-sdd-task-generator']) {
      const skillDir = join(subagentsDir, AGENTS_HOME, 'skills', skill);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), `# ${skill}\n`, 'utf8');
    }

    const firstSync = syncSubagents(subagentsDir, { agents: ['cursor', 'claude-code'] });
    assert(firstSync.seeded.includes('coder-agent'), 'should seed coder-agent');
    assert(firstSync.seeded.includes('reviewer-agent'), 'should seed reviewer-agent');
    assert(firstSync.seeded.includes('task-writer-agent'), 'should seed task-writer-agent');
    assert(
      existsSync(join(subagentsDir, '.nextstage-harness', 'agents', 'coder-agent.md')),
      'should create canonical coder-agent.md',
    );
    assert(
      existsSync(join(subagentsDir, '.cursor', 'agents', 'coder-agent.md')),
      'should write cursor coder-agent.md',
    );
    assert(
      existsSync(join(subagentsDir, '.claude', 'agents', 'task-writer-agent.md')),
      'should write claude task-writer-agent.md',
    );

    const cursorCoder = readFileSync(join(subagentsDir, '.cursor', 'agents', 'coder-agent.md'), 'utf8');
    assert(cursorCoder.includes('name: coder-agent'), 'cursor adapter should have name');
    assert(cursorCoder.includes('readonly: false'), 'coder-agent should not be readonly');
    assert(cursorCoder.includes('composer-2.5[fast=false]'), 'coder-agent default cursor model');
    assert(cursorCoder.includes('Read `AGENTS.md`'), 'adapter body should require AGENTS.md');
    assert(cursorCoder.includes('.agents/skills/ns-code-coder/SKILL.md'), 'adapter should point at skill');

    const cursorReviewer = readFileSync(
      join(subagentsDir, '.cursor', 'agents', 'reviewer-agent.md'),
      'utf8',
    );
    assert(cursorReviewer.includes('readonly: true'), 'reviewer-agent must be readonly');
    assert(
      cursorReviewer.includes('grok-4.5[effort=medium,fast=false]'),
      'reviewer-agent default cursor model',
    );

    const claudeTask = readFileSync(
      join(subagentsDir, '.claude', 'agents', 'task-writer-agent.md'),
      'utf8',
    );
    assert(claudeTask.includes('model: haiku'), 'task-writer default claude model is haiku');
    assert(claudeTask.includes('readonly: false'), 'task-writer-agent should not be readonly');
    assert(
      readFileSync(join(subagentsDir, '.claude', 'agents', 'coder-agent.md'), 'utf8').includes(
        'model: sonnet',
      ),
      'coder-agent default claude model is sonnet',
    );
    assert(
      readFileSync(join(subagentsDir, '.claude', 'agents', 'reviewer-agent.md'), 'utf8').includes(
        'model: opus',
      ),
      'reviewer-agent default claude model is opus',
    );

    const manifestPath = join(subagentsDir, '.nextstage-harness', 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const coderManifest = manifest.subagents.find((entry) => entry.name === 'coder-agent');
    assert(coderManifest?.canonical === 'agents/coder-agent.md', 'manifest should reference canonical path');

    writeFileSync(
      join(subagentsDir, '.nextstage-harness', 'agents', 'task-writer-agent.md'),
      '# Custom task writer body\n\nFollow the skill exactly.\n',
      'utf8',
    );
    const resyncCustom = syncSubagents(subagentsDir, { agents: ['cursor', 'claude-code'] });
    assert(resyncCustom.ok, 'sync after canonical edit should succeed');
    assert(
      readFileSync(join(subagentsDir, '.cursor', 'agents', 'task-writer-agent.md'), 'utf8').includes(
        'Custom task writer body',
      ),
      'adapter should reflect canonical body edits',
    );

    const taskEntry = manifest.subagents.find((entry) => entry.name === 'task-writer-agent');
    taskEntry.model.claude = 'sonnet';
    taskEntry.model.cursor = 'composer-2';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const secondEnsure = ensureSubagents(subagentsDir, { write: true });
    const taskAfter = secondEnsure.subagents.find((entry) => entry.name === 'task-writer-agent');
    assert(taskAfter.model.claude === 'sonnet', 'ensure must preserve project claude model');
    assert(taskAfter.model.cursor === 'composer-2', 'ensure must preserve project cursor model');
    assert(secondEnsure.seeded.length === 0, 'second ensure should not re-seed');

    const secondSync = syncSubagents(subagentsDir, { agents: ['cursor', 'claude-code'] });
    assert(secondSync.ok, 'second sync should succeed');
    const updatedClaude = readFileSync(
      join(subagentsDir, '.claude', 'agents', 'task-writer-agent.md'),
      'utf8',
    );
    assert(updatedClaude.includes('model: sonnet'), 'sync should apply preserved project model');

    const checkOk = syncSubagents(subagentsDir, { agents: ['cursor', 'claude-code'], check: true });
    assert(checkOk.ok, 'sync --check equivalent should pass after sync');

    writeFileSync(
      join(subagentsDir, '.cursor', 'agents', 'task-writer-agent.md'),
      '# drift\n',
      'utf8',
    );
    const checkDrift = syncSubagents(subagentsDir, { agents: ['cursor', 'claude-code'], check: true });
    assert(!checkDrift.ok, 'drift should fail check');

    const agentsMd = generateAgentsMd(subagentsDir, { force: true });
    assert(agentsMd.written.includes('AGENTS.md'), 'agents-md should write');
    const agentsContent = readFileSync(join(subagentsDir, 'AGENTS.md'), 'utf8');
    assert(agentsContent.includes('coder-agent'), 'AGENTS.md should list coder-agent');
    assert(agentsContent.includes('Project subagents'), 'AGENTS.md should have subagents section');

    assert(
      buildSubagentBody({ name: 'coder-agent', skill: 'ns-code-coder' }).includes('AGENTS.md'),
      'buildSubagentBody should mention AGENTS.md',
    );
  } finally {
    rmSync(subagentsDir, { recursive: true, force: true });
  }

  const listOut = runCli(['list'], harnessRoot);
  assert(listOut.status === 0, `list should pass: ${listOut.stderr}${listOut.stdout}`);
  assert(
    listOut.stdout.includes('agents set --agent cursor'),
    'list should show agents set command',
  );
  assert(
    listOut.stdout.includes('--preset spec-driven-gitlab --yes'),
    'list should show preset install command',
  );
  assert(
    listOut.stdout.includes('--skill ns-gitlab-board-sync --no-scaffold'),
    'list should show single-skill install command',
  );

  // 14. uninstall removes harness install, keeps docs/
  mkdirSync(join(tempDir, 'docs', 'context'), { recursive: true });
  writeFileSync(join(tempDir, 'docs', 'context', 'keep-me.md'), '# keep\n', 'utf8');
  writeFileSync(join(tempDir, 'user-rule.md'), '# mine\n', 'utf8');
  mkdirSync(join(tempDir, '.cursor', 'rules'), { recursive: true });
  writeFileSync(join(tempDir, '.cursor', 'rules', 'user-rule.mdc'), '# not harness\n', 'utf8');

  const uninstallDry = runCli(['uninstall', '--dry-run', '--dir', tempDir], harnessRoot);
  assert(uninstallDry.status === 0, `uninstall --dry-run should pass: ${uninstallDry.stderr}${uninstallDry.stdout}`);
  assert(uninstallDry.stdout.includes('Dry run'), 'uninstall dry-run should say dry run');
  assert(existsSync(join(tempDir, '.nextstage-harness')), 'dry-run must not delete harness root');

  const assessed = assessUninstall(tempDir);
  assert(assessed.found, 'assessUninstall should find harness install');
  assert(
    assessed.removable.some((path) => path.endsWith('.nextstage-harness')),
    'assess should include harness root',
  );

  const strippedDocker = stripIgnoreContent(
    readFileSync(dockerignorePath, 'utf8'),
    DOCKERIGNORE_BLOCK_HEADER,
    DOCKERIGNORE_ENTRIES,
  );
  assert(strippedDocker.includes('node_modules'), 'strip dockerignore should keep user entries');
  assert(!strippedDocker.includes(DOCKERIGNORE_BLOCK_HEADER), 'strip dockerignore should drop header');

  const strippedGit = stripIgnoreContent(
    readFileSync(gitignorePath, 'utf8'),
    GITIGNORE_BLOCK_HEADER,
    GITIGNORE_ENTRIES,
  );
  assert(strippedGit.includes('vendor/'), 'strip gitignore should keep user entries');
  assert(!strippedGit.includes(GITIGNORE_BLOCK_HEADER), 'strip gitignore should drop header');

  const uninstalled = runUninstall(tempDir, { dryRun: false });
  assert(uninstalled.removed.length > 0, 'uninstall should remove paths');
  assert(!existsSync(join(tempDir, '.nextstage-harness')), 'uninstall should remove harness root');
  assert(!existsSync(join(tempDir, '.agents', 'skills')), 'uninstall should remove skills');
  assert(!existsSync(join(tempDir, 'AGENTS.md')), 'uninstall should remove AGENTS.md');
  assert(!existsSync(join(tempDir, 'CLAUDE.md')), 'uninstall should remove CLAUDE.md');
  assert(!existsSync(join(tempDir, 'skills-lock.json')), 'uninstall should remove skills-lock.json');
  assert(existsSync(join(tempDir, 'docs', 'context', 'keep-me.md')), 'uninstall must keep docs/');
  assert(
    existsSync(join(tempDir, '.cursor', 'rules', 'user-rule.mdc')),
    'uninstall must keep non-harness rule adapters',
  );
  assert(
    !readFileSync(dockerignorePath, 'utf8').includes(DOCKERIGNORE_BLOCK_HEADER),
    'uninstall should strip dockerignore block',
  );
  assert(
    readFileSync(dockerignorePath, 'utf8').includes('node_modules'),
    'uninstall should preserve user dockerignore entries',
  );

  const keepMdDir = mkdtempSync(join(tmpdir(), 'harness-uninstall-keep-'));
  try {
    scaffoldProject(keepMdDir, { agents: true, docs: false });
    writeFileSync(join(keepMdDir, 'AGENTS.md'), '# keep\n', 'utf8');
    writeFileSync(join(keepMdDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');
    const keepResult = runUninstall(keepMdDir, { keepAgentsMd: true });
    assert(existsSync(join(keepMdDir, 'AGENTS.md')), '--keep-agents-md should keep AGENTS.md');
    assert(existsSync(join(keepMdDir, 'CLAUDE.md')), '--keep-agents-md should keep CLAUDE.md');
    assert(!existsSync(join(keepMdDir, '.nextstage-harness')), 'keep-agents-md still removes harness root');
    assert(keepResult.removed.length > 0, 'keep-agents-md uninstall should still remove harness files');
  } finally {
    rmSync(keepMdDir, { recursive: true, force: true });
  }

  const emptyUninstall = runCli(['uninstall', '--yes', '--dir', tempDir], harnessRoot);
  assert(emptyUninstall.status === 0, `second uninstall should succeed: ${emptyUninstall.stderr}${emptyUninstall.stdout}`);
  assert(
    emptyUninstall.stdout.includes('Nothing to uninstall')
      || emptyUninstall.stdout.includes('no harness install'),
    'second uninstall should report nothing left',
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
