#!/usr/bin/env node
/**
 * Phase 2 migration: move skills to domain folders + rename.
 * Run from repo root: node scripts/migrate-phase2.mjs
 */
import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(repoRoot, 'skills');

/** oldDirName → { domain, newName } */
const MOVES = [
  ['ns-multi-agent-architect', 'labs', 'ns-multi-agent-architect'],
  ['ns-langgraph-agents', 'labs', 'ns-langgraph-agents'],
  ['ns-project-manager', 'business', 'ns-project-manager'],
  ['ns-pm-delivery-schedule', 'business', 'ns-delivery-schedule'],
  ['ns-commercial-budget', 'business', 'ns-commercial-budget'],
  ['ns-requirements-enricher', 'business', 'ns-requirements-enricher'],
  ['ns-code-frontend-design', 'frontend', 'ns-frontend-design'],
  ['ns-proto-creator', 'frontend', 'ns-proto-creator'],
  ['ns-proto-visual-guide', 'frontend', 'ns-proto-visual-guide'],
  ['ns-pm-unit-test-task-generator', 'testing', 'ns-pm-unit-test-task-generator'],
  ['ns-pm-e2e-test-task-generator', 'testing', 'ns-pm-e2e-test-task-generator'],
  ['ns-code-e2e-tests', 'testing', 'ns-e2e-tests'],
  ['ns-code-backend-tests', 'testing', 'ns-backend-tests'],
  ['ns-gitlab-board-sync', 'gitlab', 'ns-gitlab-board-sync'],
  ['ns-gitlab-ci-generator', 'gitlab', 'ns-gitlab-ci-generator'],
  ['ns-execution-gitlab-issue', 'gitlab', 'ns-execution-gitlab-issue'],
  ['mcp-gitlab-usage', 'gitlab', 'mcp-gitlab-usage'],
  ['ns-harness-agents-md', 'docs', 'ns-agent-generator'],
  ['ns-harness-codebase-reverse-spec', 'docs', 'ns-codebase-reverse-spec'],
  ['ns-harness-architecture-rules', 'docs', 'ns-architecture-rules'],
  ['ns-harness-bootstrap-brownfield', 'docs', 'ns-bootstrap-brownfield'],
  ['ns-harness-prepare', 'docs', 'ns-harness-prepare'],
  ['ns-code-docs-writer', 'docs', 'ns-docs-writer'],
  ['ns-code-best-practices', 'docs', 'ns-best-practices'],
  ['ns-code-coder', 'code', 'ns-coder'],
  ['ns-code-reviewer', 'code', 'ns-reviewer'],
  ['ns-code-investigator', 'code', 'ns-investigator'],
  ['ns-code-autonomous', 'code', 'ns-autonomous'],
  ['ns-spec-driven', 'sdd', 'ns-spec-driven'],
  ['ns-sdd-living-spec-consolidator', 'sdd', 'ns-living-spec'],
];

const ROOT_SKILLS = new Set(['ns-harness']);

/** old skill id → new skill id (includes identity for moved-only) */
const RENAME_MAP = Object.fromEntries(
  MOVES.map(([oldName, , newName]) => [oldName, newName]),
);

/** new skill id → { domain, path from skills/ } */
const SKILL_LOC = (() => {
  const loc = {};
  for (const [, domain, name] of MOVES) {
    loc[name] = { domain, rel: `${domain}/${name}` };
  }
  for (const name of ROOT_SKILLS) {
    loc[name] = { domain: null, rel: name };
  }
  return loc;
})();

/** longest-first name replacements in text */
const NAME_REPLACEMENTS = [
  ['ns-sdd-living-spec-consolidator', 'ns-living-spec'],
  ['ns-harness-codebase-reverse-spec', 'ns-codebase-reverse-spec'],
  ['ns-harness-architecture-rules', 'ns-architecture-rules'],
  ['ns-harness-bootstrap-brownfield', 'ns-bootstrap-brownfield'],
  ['ns-harness-agents-md', 'ns-agent-generator'],
  ['ns-code-frontend-design', 'ns-frontend-design'],
  ['ns-code-backend-tests', 'ns-backend-tests'],
  ['ns-code-best-practices', 'ns-best-practices'],
  ['ns-code-investigator', 'ns-investigator'],
  ['ns-code-autonomous', 'ns-autonomous'],
  ['ns-code-docs-writer', 'ns-docs-writer'],
  ['ns-code-e2e-tests', 'ns-e2e-tests'],
  ['ns-code-reviewer', 'ns-reviewer'],
  ['ns-code-coder', 'ns-coder'],
  ['ns-pm-delivery-schedule', 'ns-delivery-schedule'],
];

function gitMv(src, dest) {
  const relSrc = join('skills', src);
  const relDest = join('skills', dest);
  if (!existsSync(join(repoRoot, relSrc))) {
    if (existsSync(join(repoRoot, relDest))) return;
    throw new Error(`Missing source: ${relSrc}`);
  }
  execSync(`git mv "${relSrc}" "${relDest}"`, { cwd: repoRoot, stdio: 'inherit' });
}

function updateFrontmatterName(skillPath, newName) {
  const skillMd = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) return;
  const content = readFileSync(skillMd, 'utf8');
  const updated = content.replace(/^---\n([\s\S]*?)\n---/, (block, fm) => {
    const next = fm.includes('name:')
      ? fm.replace(/^name:\s*.+$/m, `name: ${newName}`)
      : `name: ${newName}\n${fm}`;
    return `---\n${next}\n---`;
  });
  if (updated !== content) writeFileSync(skillMd, updated);
}

function relativeSkillLink(fromFile, targetSkillId) {
  const target = SKILL_LOC[targetSkillId];
  if (!target) return null;
  const fromDir = dirname(fromFile);
  const targetDir = join(skillsDir, target.rel);
  let rel = relative(fromDir, targetDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function fixSkillPathRefs(content, filePath) {
  if (!filePath.includes('/skills/')) return content;
  const skillPathPattern =
    /(?:\.\.\/)+(?:[a-z0-9-]+\/)*(?:ns-[a-z0-9-]+|mcp-gitlab-usage)(?=\/)/g;
  return content.replace(skillPathPattern, (match) => {
    const skillId = match.split('/').pop();
    const mapped = RENAME_MAP[skillId] ?? skillId;
    if (!SKILL_LOC[mapped]) return match;
    const link = relativeSkillLink(filePath, mapped);
    return link ?? match;
  });
}

function replaceSkillNames(content) {
  let out = content;
  for (const [oldName, newName] of NAME_REPLACEMENTS) {
    out = out.split(oldName).join(newName);
  }
  return out;
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walkFiles(path, out);
    } else if (/\.(md|json|js|mjs|mdc)$/i.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

function runMoves() {
  const domains = new Set(MOVES.map(([, d]) => d));
  for (const domain of domains) {
    const domainPath = join(skillsDir, domain);
    if (!existsSync(domainPath)) {
      execSync(`mkdir -p "${domainPath}"`, { cwd: repoRoot });
    }
  }

  const log = [];
  for (const [oldName, domain, newName] of MOVES) {
    const dest = `${domain}/${newName}`;
    gitMv(oldName, dest);
    log.push(`${oldName} → skills/${dest}`);
    updateFrontmatterName(join(skillsDir, domain, newName), newName);
  }
  return log;
}

function transformRepoFiles() {
  const roots = [
    repoRoot,
    join(repoRoot, 'packages'),
    join(repoRoot, '.cursor'),
    join(repoRoot, 'docs'),
    join(repoRoot, 'presets'),
  ];
  const files = [];
  for (const root of roots) walkFiles(root, files);

  for (const file of files) {
    if (file.includes('migrate-phase2.mjs')) continue;
    if (file.includes('docs/versions/distributed-skills/descritivo.md')) continue;
    let content = readFileSync(file, 'utf8');
    const original = content;
    content = replaceSkillNames(content);
    content = fixSkillPathRefs(content, file);
    if (content !== original) writeFileSync(file, content);
  }
}

const moveLog = runMoves();
transformRepoFiles();
console.log('Moves completed:');
for (const line of moveLog) console.log(`  ${line}`);
