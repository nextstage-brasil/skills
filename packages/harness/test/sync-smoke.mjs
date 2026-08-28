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
import { pruneRetiredSkills, assessPruneRetiredSkills } from '../src/pruneRetiredSkills.js';
import { groupExternalSkillsBySource, getExternalPreset } from '../src/externalSkills.js';
import { pruneExcludedAgentAdapters } from '../src/pruneExcludedAgentAdapters.js';
import { listSkillsToUpdate } from '../src/update.js';
import { computeSkillFolderHash, planSkillUpdates, getSkillFolderHashFromTree } from '../src/skillUpdateDiff.js';
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

/** Expected absorb warnings (e.g. conflict-rule fixture) — not test failures. */
const silentAbsorbWarn = () => {};

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
  return result;
}

let tempDir;
try {
  await (async () => {
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
    scaffoldResult.created.some((f) => f.includes('.nextstage-harness/rules/project-rules.md')),
    'scaffold should create project-rules stub',
  );
  const scaffoldManifest = JSON.parse(
    readFileSync(join(tempDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
  );
  assert(
    scaffoldManifest.rules.some((r) => r.name === 'project-rules' && r.cursor?.alwaysApply === true),
    'scaffold manifest should include project-rules entry',
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

  const legacyManifestDir = mkdtempSync(join(tmpdir(), 'harness-legacy-manifest-'));
  const legacyManifestPath = join(legacyManifestDir, '.nextstage-harness', 'manifest.json');
  const legacyRulesDir = join(legacyManifestDir, '.nextstage-harness', 'rules');
  mkdirSync(legacyRulesDir, { recursive: true });
  writeFileSync(
    legacyManifestPath,
    `${JSON.stringify(
      {
        version: 1,
        agents: ['cursor', 'claude-code'],
        rules: [
          {
            name: 'architecture-rules',
            canonical: 'rules/architecture-rules.md',
            cursor: {
              alwaysApply: true,
              description: 'Technical constitution for AI agents',
            },
            claude: { paths: null },
          },
        ],
        subagents: [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  copyFileSync(
    join(harnessRoot, 'templates', 'rules', 'architecture-rules.stub.md'),
    join(legacyRulesDir, 'architecture-rules.md'),
  );
  const legacyMigrate = scaffoldProject(legacyManifestDir, { agents: true, docs: false });
  assert(
    legacyMigrate.created.some((entry) => entry.includes('project-rules entry added')),
    'scaffold should append project-rules to existing manifest',
  );
  assert(
    existsSync(join(legacyRulesDir, 'project-rules.md')),
    'scaffold should create missing project-rules on existing project',
  );
  const legacyManifest = JSON.parse(readFileSync(legacyManifestPath, 'utf8'));
  assert(
    legacyManifest.rules.some((r) => r.name === 'project-rules'),
    'migrated manifest should include project-rules',
  );
  rmSync(legacyManifestDir, { recursive: true, force: true });

  // 2. sync generates adapters with matching hash
  const canonicalPath = join(tempDir, '.nextstage-harness', 'rules', 'architecture-rules.md');
  const edited = `${readFileSync(canonicalPath, 'utf8')}\n\n## Test marker\n\nSmoke test content.\n`;
  writeFileSync(canonicalPath, edited, 'utf8');

  const syncResult = syncRules(tempDir, { agents: ['cursor', 'claude-code'], absorbWarn: silentAbsorbWarn });
  assert(syncResult.written.length >= 4, 'sync should write cursor and claude adapters for both rules');

  const cursorAdapter = join(tempDir, '.cursor', 'rules', 'architecture-rules.mdc');
  const claudeAdapter = join(tempDir, '.claude', 'rules', 'architecture-rules.md');
  const projectCursorAdapter = join(tempDir, '.cursor', 'rules', 'project-rules.mdc');
  const projectClaudeAdapter = join(tempDir, '.claude', 'rules', 'project-rules.md');
  assert(existsSync(projectCursorAdapter), 'sync should write project-rules cursor adapter');
  assert(existsSync(projectClaudeAdapter), 'sync should write project-rules claude adapter');
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

  // Re-sync before absorb / add-rule sections need clean state
  syncRules(tempDir, { agents: ['cursor', 'claude-code'], absorbWarn: silentAbsorbWarn });
  check = runCli(['sync', '--check', '--dir', tempDir], harnessRoot);
  assert(check.status === 0, `sync --check should pass after re-sync: ${check.stderr}${check.stdout}`);

  // 5. skill adapters — Claude only (Cursor reads .agents/skills/ directly)
  const skillsCanonical = join(tempDir, '.agents', 'skills', 'ns-coder');
  mkdirSync(skillsCanonical, { recursive: true });
  writeFileSync(join(skillsCanonical, 'SKILL.md'), '---\nname: ns-coder\ndescription: test\n---\n\n# Code Coder\n', 'utf8');
  const skillSync = syncSkills(tempDir, { agents: ['cursor', 'claude-code'] });
  assert(skillSync.written.some((entry) => entry.includes('.claude/skills')), 'syncSkills should write claude adapter');
  assert(
    !skillSync.written.some((entry) => entry.includes('.cursor/skills') && !entry.includes('removed-legacy-adapter')),
    'syncSkills should not create cursor skill adapters',
  );
  const claudeSkill = join(tempDir, '.claude', 'skills', 'ns-coder');
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
  const claudeMd = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8');
  assert(claudeMd.includes('# Rules'), 'CLAUDE.md must start with Rules section');
  assert(claudeMd.includes('AGENTS.md'), 'CLAUDE.md must require AGENTS.md');
  assert(claudeMd.includes('AGENTS.local.md'), 'CLAUDE.md must require AGENTS.local.md');
  assert(claudeMd.includes('.nextstage-harness/rules/'), 'CLAUDE.md must require alwaysApply harness rules');
  assert(claudeMd.includes('@.claude/agents'), 'CLAUDE.md must point to project subagents');
  assert(claudeMd.includes('model optional'), 'CLAUDE.md must note subagent model is optional');
  const agentsMdPath = join(tempDir, 'AGENTS.md');
  let agentsMdText = readFileSync(agentsMdPath, 'utf8');
  assert(agentsMdText.includes('ns-harness'), 'AGENTS.md should list installed skill');
  assert(!agentsMdText.includes('harness-sync-managed'), 'AGENTS.md must not include sync marker');
  assert(
    !agentsMdText.includes('harness-agents-md: generated'),
    'AGENTS.md must not include agents-md generated comment',
  );
  const withLegacyMarkers = `<!-- harness-agents-md: generated by @nextstage-brasil/harness agents-md -->\n<!-- harness-sync-managed: last-sync=2026-08-18T00:00:00.000Z -->\n${agentsMdText}`;
  writeFileSync(agentsMdPath, withLegacyMarkers, 'utf8');
  syncRules(tempDir, { agents: ['cursor', 'claude-code'], absorbWarn: silentAbsorbWarn });
  agentsMdText = readFileSync(agentsMdPath, 'utf8');
  assert(!agentsMdText.includes('last-sync='), 'sync should strip legacy last-sync once');
  assert(!agentsMdText.includes('harness-sync-managed'), 'sync should strip sync marker once');
  assert(
    !agentsMdText.includes('harness-agents-md: generated'),
    'sync should strip agents-md generated comment once',
  );
  const agentsMdAfterStrip = agentsMdText;
  syncRules(tempDir, { agents: ['cursor', 'claude-code'], absorbWarn: silentAbsorbWarn });
  assert(
    readFileSync(agentsMdPath, 'utf8') === agentsMdAfterStrip,
    'second sync must not rewrite AGENTS.md',
  );

  // 7. sync absorbs orphan .cursor/rules/*.mdc into canonical + manifest
  const absorbDir = mkdtempSync(join(tmpdir(), 'harness-absorb-'));
  try {
    scaffoldProject(absorbDir, { agents: true, docs: false });
    const orphanDir = join(absorbDir, '.cursor', 'rules');
    mkdirSync(orphanDir, { recursive: true });

    writeFileSync(
      join(orphanDir, 'always-on-extra.mdc'),
      `---
description: Always-on orphan from Cursor UI
alwaysApply: true
---

# Always On Extra

Must load every session.
`,
      'utf8',
    );
    writeFileSync(
      join(orphanDir, 'scoped-frontend.mdc'),
      `---
description: Scoped frontend orphan
globs: apps/web/**,packages/ui/**
---

# Scoped Frontend

Path-scoped conventions.
`,
      'utf8',
    );
    writeFileSync(
      join(orphanDir, 'conflict-rule.mdc'),
      `---
description: Conflict alwaysApply wins
alwaysApply: true
globs: src/**
---

# Conflict Rule

alwaysApply should win.
`,
      'utf8',
    );
    writeFileSync(
      join(orphanDir, 'no-desc-rule.mdc'),
      `---
alwaysApply: false
---

# No Desc Rule

Default description expected.
`,
      'utf8',
    );
    // fixture without harness bootstrap (legacy body)
    copyFileSync(
      join(__dirname, 'fixtures', 'legacy-rule.mdc'),
      join(orphanDir, 'backend-rules.mdc'),
    );

    const absorbCheck = syncRules(absorbDir, {
      agents: ['cursor', 'claude-code'],
      check: true,
      absorbWarn: silentAbsorbWarn,
    });
    assert(!absorbCheck.ok, 'sync --check should report orphan .mdc as drift');
    assert(
      absorbCheck.drifts.some((p) => p.endsWith('always-on-extra.mdc')),
      'check drifts should include orphan always-on-extra.mdc',
    );
    assert(
      !existsSync(join(absorbDir, '.nextstage-harness', 'rules', 'always-on-extra.md')),
      'check mode must not absorb orphans',
    );

    const absorbResult = syncRules(absorbDir, {
      agents: ['cursor', 'claude-code'],
      absorbWarn: silentAbsorbWarn,
    });
    assert(
      absorbResult.absorbed.includes('always-on-extra')
      && absorbResult.absorbed.includes('scoped-frontend')
      && absorbResult.absorbed.includes('backend-rules')
      && absorbResult.absorbed.includes('conflict-rule')
      && absorbResult.absorbed.includes('no-desc-rule'),
      `sync should absorb orphans: ${absorbResult.absorbed.join(',')}`,
    );

    const absorbedManifest = JSON.parse(
      readFileSync(join(absorbDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
    );
    const alwaysEntry = absorbedManifest.rules.find((r) => r.name === 'always-on-extra');
    assert(alwaysEntry?.cursor?.description === 'Always-on orphan from Cursor UI', 'always-on description');
    assert(alwaysEntry?.cursor?.alwaysApply === true, 'always-on alwaysApply true');
    assert(!alwaysEntry?.cursor?.globs, 'always-on must not keep globs');

    const scopedEntry = absorbedManifest.rules.find((r) => r.name === 'scoped-frontend');
    assert(scopedEntry?.cursor?.description === 'Scoped frontend orphan', 'scoped description');
    assert(scopedEntry?.cursor?.globs === 'apps/web/**,packages/ui/**', 'scoped globs');
    assert(
      Array.isArray(scopedEntry?.claude?.paths) && scopedEntry.claude.paths.length === 2,
      'scoped claude.paths from globs',
    );
    assert(!Object.prototype.hasOwnProperty.call(scopedEntry.cursor, 'alwaysApply')
      || scopedEntry.cursor.alwaysApply !== true, 'scoped must not be alwaysApply true');

    const backendEntry = absorbedManifest.rules.find((r) => r.name === 'backend-rules');
    assert(backendEntry?.cursor?.globs === 'backend/**', 'backend globs from fixture');
    assert(
      readFileSync(join(absorbDir, '.nextstage-harness', 'rules', 'backend-rules.md'), 'utf8')
        .includes('repository pattern'),
      'absorbed canonical should contain rule body',
    );

    const conflictEntry = absorbedManifest.rules.find((r) => r.name === 'conflict-rule');
    assert(conflictEntry?.cursor?.alwaysApply === true, 'conflict prefers alwaysApply');
    assert(!conflictEntry?.cursor?.globs, 'conflict drops globs when alwaysApply true');
    assert(conflictEntry?.claude?.paths == null, 'conflict claude.paths null');

    const noDescEntry = absorbedManifest.rules.find((r) => r.name === 'no-desc-rule');
    assert(
      noDescEntry?.cursor?.description === 'Project rule: no-desc-rule',
      'missing description gets default',
    );
    assert(noDescEntry?.cursor?.alwaysApply === false, 'no-desc alwaysApply false');
    assert(
      readFileSync(join(absorbDir, '.cursor', 'rules', 'always-on-extra.mdc'), 'utf8')
        .includes('alwaysApply: true'),
      'regenerated adapter should emit alwaysApply',
    );
    assert(
      readFileSync(join(absorbDir, '.cursor', 'rules', 'always-on-extra.mdc'), 'utf8')
        .includes('Always-on orphan from Cursor UI'),
      'regenerated adapter should emit description',
    );

    // Registered rule: hand-edit orphan path must NOT reverse-overwrite canonical
    const archCanonical = join(absorbDir, '.nextstage-harness', 'rules', 'architecture-rules.md');
    const beforeArch = readFileSync(archCanonical, 'utf8');
    writeFileSync(
      join(orphanDir, 'architecture-rules.mdc'),
      `---
description: Hijack attempt
alwaysApply: true
---

# Hijacked

Should not land in canonical.
`,
      'utf8',
    );
    syncRules(absorbDir, { agents: ['cursor', 'claude-code'], absorbWarn: silentAbsorbWarn });
    assert(
      readFileSync(archCanonical, 'utf8') === beforeArch,
      'sync must not reverse-overwrite registered canonical from .mdc',
    );
    assert(
      !readFileSync(archCanonical, 'utf8').includes('Hijacked'),
      'registered canonical stays source of truth',
    );
  } finally {
    rmSync(absorbDir, { recursive: true, force: true });
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
    manifest.rules.some(
      (r) => r.name === 'api-conventions' && r.cursor?.alwaysApply === false,
    ),
    'add-rule should register alwaysApply false by default',
  );
  assert(
    exists(join(tempDir, '.cursor', 'rules', 'api-conventions.mdc')),
    'add-rule should sync cursor adapter',
  );
  assert(
    exists(join(tempDir, '.claude', 'rules', 'api-conventions.md')),
    'add-rule should sync claude adapter',
  );
  assert(
    readFileSync(addedCanonical, 'utf8').includes('harness-rule: body only'),
    'add-rule stub should include body-only manifest hint',
  );
  assert(
    !readFileSync(join(tempDir, '.cursor', 'rules', 'api-conventions.mdc'), 'utf8').includes(
      'harness-rule: body only',
    ),
    'cursor adapter must strip body-only hint',
  );
  assert(
    readFileSync(join(tempDir, '.cursor', 'rules', 'api-conventions.mdc'), 'utf8').includes(
      'alwaysApply: false',
    ),
    'cursor adapter should emit alwaysApply: false by default',
  );

  const alwaysOn = runCli(
    [
      'add-rule',
      'constitution-extra',
      '--description',
      'Always-on extra constitution',
      '--always-apply',
      '--dir',
      tempDir,
    ],
    harnessRoot,
  );
  assert(alwaysOn.status === 0, `add-rule --always-apply should succeed: ${alwaysOn.stderr}`);
  const manifestAlways = JSON.parse(
    readFileSync(join(tempDir, '.nextstage-harness', 'manifest.json'), 'utf8'),
  );
  assert(
    manifestAlways.rules.some(
      (r) => r.name === 'constitution-extra' && r.cursor?.alwaysApply === true,
    ),
    'add-rule --always-apply should set alwaysApply true',
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

  const noDesc = runCli(['add-rule', 'orphan-rules', '--dir', tempDir], harnessRoot);
  assert(noDesc.status === 1, 'add-rule without --description should fail');

  const badManifestPath = join(tempDir, '.nextstage-harness', 'manifest.json');
  const badManifest = JSON.parse(readFileSync(badManifestPath, 'utf8'));
  badManifest.rules.push({
    name: 'broken-meta',
    canonical: 'rules/broken-meta.md',
    cursor: {},
    claude: { paths: null },
  });
  writeFileSync(
    join(tempDir, '.nextstage-harness', 'rules', 'broken-meta.md'),
    '# Broken\n',
    'utf8',
  );
  writeFileSync(badManifestPath, `${JSON.stringify(badManifest, null, 2)}\n`, 'utf8');
  let syncThrew = false;
  try {
    syncRules(tempDir, { absorbWarn: silentAbsorbWarn });
  } catch (err) {
    syncThrew = /cursor\.description required/.test(String(err.message));
  }
  assert(syncThrew, 'sync should reject rules missing cursor.description');
  badManifest.rules = badManifest.rules.filter((r) => r.name !== 'broken-meta');
  writeFileSync(badManifestPath, `${JSON.stringify(badManifest, null, 2)}\n`, 'utf8');
  rmSync(join(tempDir, '.nextstage-harness', 'rules', 'broken-meta.md'), { force: true });
  // restore healthy sync baseline
  syncRules(tempDir, { absorbWarn: silentAbsorbWarn });
  const dockerignoreCreateDir = join(tempDir, 'dockerignore-create');
  mkdirSync(dockerignoreCreateDir, { recursive: true });
  const createdDockerignore = syncDockerignore(dockerignoreCreateDir);
  const createdDockerignorePath = join(dockerignoreCreateDir, '.dockerignore');
  assert(createdDockerignore.written.length === 1, 'syncDockerignore should create .dockerignore when missing');
  assert(existsSync(createdDockerignorePath), 'syncDockerignore should write .dockerignore file');
  const createdDockerignoreContent = readFileSync(createdDockerignorePath, 'utf8');
  for (const entry of ['/docs/', '/.agents/', '/.cursor/', '/.claude/', '/AGENTS.md', '/CLAUDE.md']) {
    assert(createdDockerignoreContent.includes(entry), `created dockerignore should include ${entry}`);
  }

  const dockerignorePath = join(tempDir, '.dockerignore');
  writeFileSync(dockerignorePath, 'node_modules\n', 'utf8');
  const dockerignoreSync = syncDockerignore(tempDir);
  assert(dockerignoreSync.written.length === 1, 'syncDockerignore should update .dockerignore');
  const dockerignoreContent = readFileSync(dockerignorePath, 'utf8');
  assert(dockerignoreContent.startsWith('node_modules\n'), 'syncDockerignore should preserve existing entries');
  assert(dockerignoreContent.includes('/docs/'), 'dockerignore should include /docs/');
  assert(dockerignoreContent.includes('/.agents/'), 'dockerignore should include /.agents/');
  assert(dockerignoreContent.includes('/.cursor/'), 'dockerignore should include /.cursor/');
  assert(dockerignoreContent.includes('/.claude/'), 'dockerignore should include /.claude/');
  assert(dockerignoreContent.includes('/AGENTS.md'), 'dockerignore should include /AGENTS.md');
  assert(dockerignoreContent.includes('/AGENTS.local.md'), 'dockerignore should include /AGENTS.local.md');
  assert(dockerignoreContent.includes('/.worktrees/'), 'dockerignore should include /.worktrees/');
  assert(dockerignoreContent.includes('/CLAUDE.md'), 'dockerignore should include /CLAUDE.md');
  assert(dockerignoreContent.includes('/skills-lock.json'), 'dockerignore should include /skills-lock.json');
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
  assert(gitignoreContent.includes('/AGENTS.local.md'), 'gitignore should include /AGENTS.local.md');
  assert(gitignoreContent.includes('/.worktrees/'), 'gitignore should include /.worktrees/');
  assert(gitignoreContent.includes('/.cursor/rules/'), 'gitignore should include /.cursor/rules/');
  assert(gitignoreContent.includes('/.cursor/agents/'), 'gitignore should include /.cursor/agents/');
  assert(gitignoreContent.includes('/.claude/'), 'gitignore should include /.claude/');
  assert(
    gitignoreContent.includes(buildGitignoreBlock().trim()),
    'gitignore should contain full managed block',
  );

  const gitignoreResync = syncGitignore(tempDir);
  assert(gitignoreResync.written.length === 0, 'syncGitignore should be idempotent');

  writeFileSync(
    gitignorePath,
    `vendor/\n\n${GITIGNORE_BLOCK_HEADER}\nAGENTS.local.md\n.worktrees/\n.cursor/rules/\n.cursor/agents/\n.claude/\n`,
    'utf8',
  );
  const gitignoreMigrate = syncGitignore(tempDir);
  assert(gitignoreMigrate.written.length === 1, 'syncGitignore should rewrite unprefixed managed paths');
  const migratedGitignore = readFileSync(gitignorePath, 'utf8');
  assert(migratedGitignore.includes('/.cursor/rules/'), 'migrated gitignore should root-anchor /.cursor/rules/');
  assert(
    !migratedGitignore.split('\n').includes('.cursor/rules/'),
    'migrated gitignore should drop unprefixed .cursor/rules/',
  );

  // 11. prune-retired-skills removes old dirs only when replacement exists
  const agentsSkillsDir = join(tempDir, '.agents', 'skills');
  const oldSkillDir = join(agentsSkillsDir, 'task-generator');
  const newSkillDir = join(agentsSkillsDir, 'ns-spec-driven');
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

  const agentsPreset = getExternalPreset('agents');
  assert(agentsPreset?.skills.length === 6, 'agents preset should include all six external skills');
  assert(agentsPreset?.skills.includes('langgraph-persistence'), 'agents preset should include langgraph skill');
  assert(agentsPreset?.skills.includes('postgresql-table-design'), 'agents preset should include postgresql skill');
  assert(agentsPreset?.nsSkills.includes('ns-multi-agent-architect'), 'agents preset should include NS architect skill');
  assert(agentsPreset?.nsSkills.includes('ns-langgraph-agents'), 'agents preset should include ns-langgraph-agents');
  assert(agentsPreset?.nsSkills.includes('ns-coder'), 'agents preset should include ns-coder');
  assert(agentsPreset?.nsSkills.includes('ns-investigator'), 'agents preset should include ns-investigator');
  assert(getExternalPreset('agents-api')?.id === 'agents', 'agents-api alias should resolve to agents');
  assert(getExternalPreset('agent-creator')?.id === 'agents', 'agent-creator alias should resolve to agents');

  const agentsDryRun = runCli(['--dry-run', '--yes', '--preset', 'agents', '--dir', tempDir], harnessRoot);
  assert(agentsDryRun.status === 0, `agents preset dry-run should pass: ${agentsDryRun.stderr}${agentsDryRun.stdout}`);
  assert(
    agentsDryRun.stdout.includes('langchain-fundamentals') &&
      agentsDryRun.stdout.includes('vitest') &&
      agentsDryRun.stdout.includes('ns-spec-driven') &&
      agentsDryRun.stdout.includes('ns-langgraph-agents'),
    'agents dry-run should list spec-driven + labs + external skills',
  );

  const agentsAliasDryRun = runCli(['--dry-run', '--yes', '--preset', 'agents-api', '--dir', tempDir], harnessRoot);
  assert(agentsAliasDryRun.status === 0, `agents-api alias dry-run should pass: ${agentsAliasDryRun.stderr}${agentsAliasDryRun.stdout}`);
  assert(
    agentsAliasDryRun.stdout.includes('langchain-fundamentals') && agentsAliasDryRun.stdout.includes('ns-spec-driven'),
    'agents-api alias should install the unified agents preset',
  );

  const frontendPrototypeDryRun = runCli(['--dry-run', '--yes', '--preset', 'frontend-prototype', '--dir', tempDir], harnessRoot);
  assert(frontendPrototypeDryRun.status === 0, `frontend-prototype preset dry-run should pass: ${frontendPrototypeDryRun.stderr}${frontendPrototypeDryRun.stdout}`);
  assert(
    frontendPrototypeDryRun.stdout.includes('ns-proto-creator') &&
      frontendPrototypeDryRun.stdout.includes('ns-proto-visual-guide') &&
      frontendPrototypeDryRun.stdout.includes('ns-frontend-design'),
    'frontend-prototype dry-run should list proto + design skills',
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

  // Selective update: identical source vs installed → skip
  const sourceSkill = join(tempDir, 'fake-source', 'skills', 'ns-harness');
  mkdirSync(sourceSkill, { recursive: true });
  const skillBody = readFileSync(join(tempDir, '.agents', 'skills', 'ns-harness', 'SKILL.md'), 'utf8');
  writeFileSync(join(sourceSkill, 'SKILL.md'), skillBody, 'utf8');
  const sameHash = computeSkillFolderHash(join(tempDir, '.agents', 'skills', 'ns-harness'));
  assert(
    sameHash === computeSkillFolderHash(sourceSkill),
    'content hash should match identical skill trees',
  );
  const selectiveUpToDate = await planSkillUpdates(tempDir, ['ns-harness'], {
    source: join(tempDir, 'fake-source'),
  });
  assert(selectiveUpToDate.upToDate.includes('ns-harness'), 'unchanged skill should be up to date');
  assert(selectiveUpToDate.toUpdate.length === 0, 'unchanged skill should not be queued');

  writeFileSync(join(sourceSkill, 'SKILL.md'), `${skillBody}\n# changed\n`, 'utf8');
  const selectiveChanged = await planSkillUpdates(tempDir, ['ns-harness'], {
    source: join(tempDir, 'fake-source'),
  });
  assert(selectiveChanged.toUpdate.includes('ns-harness'), 'changed skill should be queued');
  assert(selectiveChanged.upToDate.length === 0, 'changed skill should not be up to date');

  const forced = await planSkillUpdates(tempDir, ['ns-harness'], {
    force: true,
    source: join(tempDir, 'fake-source'),
  });
  assert(forced.toUpdate.includes('ns-harness'), '--force should queue all skills');

  const treeHash = getSkillFolderHashFromTree(
    {
      sha: 'root',
      tree: [
        { type: 'tree', path: 'skills/ns-harness', sha: 'abc123' },
        { type: 'blob', path: 'skills/ns-harness/SKILL.md', sha: 'blob' },
      ],
    },
    'skills/ns-harness/SKILL.md',
  );
  assert(treeHash === 'abc123', 'tree helper should resolve skill folder SHA');

  const githubPlan = await planSkillUpdates(tempDir, ['ns-harness'], {
    source: 'nextstage-brasil/skills',
    fetchTree: async () => ({
      sha: 'root',
      tree: [{ type: 'tree', path: 'skills/ns-harness', sha: 'same-sha' }],
    }),
  });
  // no skillFolderHash in lock → unchecked refresh
  assert(githubPlan.toUpdate.includes('ns-harness'), 'missing lock hash should refresh');

  writeFileSync(
    join(tempDir, 'skills-lock.json'),
    JSON.stringify({
      version: 1,
      skills: {
        'ns-harness': {
          source: 'nextstage-brasil/skills',
          sourceType: 'github',
          skillPath: 'skills/ns-harness/SKILL.md',
          skillFolderHash: 'same-sha',
        },
      },
    }, null, 2),
    'utf8',
  );
  const githubUpToDate = await planSkillUpdates(tempDir, ['ns-harness'], {
    source: 'nextstage-brasil/skills',
    fetchTree: async () => ({
      sha: 'root',
      tree: [{ type: 'tree', path: 'skills/ns-harness', sha: 'same-sha' }],
    }),
  });
  assert(githubUpToDate.upToDate.includes('ns-harness'), 'matching GitHub tree SHA should skip');

  mkdirSync(join(tempDir, '.agents', 'skills', 'langchain-fundamentals'), { recursive: true });
  writeFileSync(join(tempDir, '.agents', 'skills', 'langchain-fundamentals', 'SKILL.md'), '# external\n', 'utf8');
  const foreignPlan = await planSkillUpdates(tempDir, ['ns-harness', 'langchain-fundamentals'], {
    source: join(tempDir, 'fake-source'),
  });
  assert(foreignPlan.upToDate.includes('langchain-fundamentals'), 'skill missing from local --source must not queue marketplace update');
  assert(!foreignPlan.toUpdate.includes('langchain-fundamentals'), 'foreign skill should stay out of toUpdate');

  const updateDryRun = runCli(['update', '--dry-run', '--dir', tempDir, '--source', join(tempDir, 'fake-source')], harnessRoot);
  assert(updateDryRun.status === 0, `update --dry-run should pass: ${updateDryRun.stderr}${updateDryRun.stdout}`);
  assert(
    updateDryRun.stdout.includes('ns-harness') || updateDryRun.stdout.includes('up to date') || updateDryRun.stdout.includes('Would update'),
    'update dry-run should report plan',
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

  const missingClaudeCheck = runCli(['sync', '--check', '--dir', tempDir], harnessRoot);
  assert(missingClaudeCheck.status === 1, 'sync --check should fail when claude-code is active and CLAUDE.md is missing');
  assert(
    missingClaudeCheck.stderr.includes('CLAUDE.md') || missingClaudeCheck.stdout.includes('CLAUDE.md'),
    'sync --check should name CLAUDE.md drift',
  );

  const recreateClaude = runCli(['sync', '--dir', tempDir], harnessRoot);
  assert(recreateClaude.status === 0, `sync should recreate CLAUDE.md: ${recreateClaude.stderr}${recreateClaude.stdout}`);
  assert(existsSync(join(tempDir, 'CLAUDE.md')), 'sync should create CLAUDE.md when claude-code is active');
  const recreatedClaudeMd = readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8');
  assert(recreatedClaudeMd.includes('# Rules'), 'recreated CLAUDE.md must use the boot stub');
  assert(recreatedClaudeMd.includes('@.claude/agents'), 'recreated CLAUDE.md must point at .claude/agents');

  writeFileSync(join(tempDir, 'CLAUDE.md'), '# custom claude entry\n', 'utf8');
  const keepCustomClaude = runCli(['sync', '--dir', tempDir], harnessRoot);
  assert(keepCustomClaude.status === 0, `sync should pass with existing CLAUDE.md: ${keepCustomClaude.stderr}`);
  assert(
    readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8') === '# custom claude entry\n',
    'sync must not overwrite an existing CLAUDE.md',
  );

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
    for (const skill of ['ns-coder', 'ns-reviewer', 'ns-spec-driven']) {
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
    assert(cursorCoder.includes('Obey `AGENTS.md`'), 'adapter body should require AGENTS.md');
    assert(cursorCoder.includes('.agents/skills/ns-coder/SKILL.md'), 'adapter should point at skill');

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
      claudeTask.includes('references/task-generator.md'),
      'task-writer-agent should point at ns-spec-driven task-generator reference',
    );
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
      agentsContent.includes('**MUST** spawn that agent file so YAML') &&
      agentsContent.includes('Inline mapped skill while bridge present = forbidden') &&
      agentsContent.includes('subagent-dispatch.md') &&
      agentsContent.includes('FORBIDDEN'),
      'AGENTS.md subagents section should MUST-spawn named bridges, forbid inherit stand-in, forbid inline',
    );

    assert(
      buildSubagentBody({ name: 'coder-agent', skill: 'ns-coder' }).includes('AGENTS.md'),
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
    listOut.stdout.includes('--preset gitlab --yes'),
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
  })();
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
