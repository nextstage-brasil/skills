import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePreset, skillIdFromInclude } from './presets.js';
import { resolveSkillDir } from './resolveSkillPath.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEXT_EXT = /\.(md|json|py|js|ya?ml|txt)$/i;

const FORBIDDEN = [
  { re: /\.\.\/+ns-harness/, label: 'ns-harness reference path' },
  { re: /\.\.\/+gitlab\//, label: 'relative gitlab skill path' },
  { re: /ns-harness\/references/, label: 'ns-harness reference path' },
  { re: /^requires_harness:/m, label: 'requires_harness frontmatter' },
  { re: /^depends:/m, label: 'depends frontmatter' },
  { re: /<!--\s*profile:/, label: 'unresolved profile marker' },
  { re: /\{\{[A-Z0-9_]+\}\}/, label: 'unresolved path token' },
];

export function defaultRepoRoot() {
  return join(__dirname, '..', '..', '..');
}

export function loadExternalProfile(harnessRoot = join(__dirname, '..')) {
  const path = join(harnessRoot, 'templates', 'profiles', 'external.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {string} frontmatter
 * @param {string[]} keys
 */
export function stripYamlKeys(frontmatter, keys) {
  const drop = new Set(keys);
  const lines = frontmatter.split('\n');
  const out = [];
  let dropping = false;
  for (const line of lines) {
    const key = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (key) {
      dropping = drop.has(key[1]);
      if (!dropping) out.push(line);
      continue;
    }
    if (dropping && (line === '' || /^\s/.test(line))) continue;
    dropping = false;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function applyRewrites(text, rewrites) {
  let out = text;
  for (const { from, to } of rewrites) {
    if (!from) continue;
    out = out.split(from).join(to);
  }
  return out;
}

function transformSkillMd(content, profile) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return applyRewrites(content, profile.rewrites ?? []);
  const stripped = stripYamlKeys(match[1], profile.stripFrontmatterKeys ?? []);
  const body = applyRewrites(content.slice(match[0].length), profile.rewrites ?? []);
  return `---\n${stripped}\n---\n${body}`;
}

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walkFiles(path, out);
      continue;
    }
    out.push(path);
  }
  return out;
}

function copySkill(src, dest, excludeDirs) {
  const skip = new Set(excludeDirs ?? []);
  cpSync(src, dest, {
    recursive: true,
    filter: (path) => {
      const rel = relative(src, path);
      if (!rel) return true;
      const top = rel.split(/[/\\]/)[0];
      return !skip.has(top);
    },
  });
}

/** Claude zip import allows exactly one SKILL.md per skill — flatten nested workers. */
function flattenNestedSkillMd(skillDir, nestedName = 'workflow.md') {
  const rootSkillMd = join(skillDir, 'SKILL.md');
  const renames = [];

  for (const file of walkFiles(skillDir)) {
    if (!file.endsWith('SKILL.md') || file === rootSkillMd) continue;
    const oldRel = relative(skillDir, file).replace(/\\/g, '/');
    const newRel = oldRel.replace(/SKILL\.md$/, nestedName);
    renameSync(file, join(skillDir, ...newRel.split('/')));
    renames.push([oldRel, newRel]);
  }

  if (!renames.length) return;

  for (const file of walkFiles(skillDir)) {
    if (!TEXT_EXT.test(file)) continue;
    let content = readFileSync(file, 'utf8');
    let next = content;
    for (const [from, to] of renames) {
      next = next.split(from).join(to);
    }
    if (next !== content) writeFileSync(file, next);
  }
}

function zipSkill(outDir, skillId) {
  const zip = spawnSync('zip', ['-r', '-q', `${skillId}.zip`, skillId], {
    cwd: outDir,
    encoding: 'utf8',
  });
  if (zip.error?.code === 'ENOENT') {
    return { zipped: false, warning: 'zip CLI not found; folders written, no archives' };
  }
  if (zip.status !== 0) {
    throw new Error(`zip failed for ${skillId}: ${zip.stderr || zip.stdout}`);
  }
  return { zipped: true };
}

/**
 * @param {object} options
 * @param {string} options.preset
 * @param {string} [options.repoRoot]
 * @param {string} [options.outDir]
 * @param {boolean} [options.zip]
 */
export function exportExternal(options) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot();
  const preset = resolvePreset(options.preset, repoRoot);
  if (!preset) {
    throw new Error(`Unknown preset: ${options.preset}`);
  }

  const skillIds = [...new Set(preset.includes.map(skillIdFromInclude))];
  const skillsDir = join(repoRoot, 'skills');
  const outDir = options.outDir ?? join(repoRoot, 'dist', 'external');
  const profile = loadExternalProfile();
  const shouldZip = options.zip !== false;

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const exported = [];
  const warnings = [];

  for (const skillId of skillIds) {
    const src = resolveSkillDir(skillsDir, skillId);
    if (!src) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    const dest = join(outDir, skillId);
    copySkill(src, dest, profile.excludeDirs);

    for (const file of walkFiles(dest)) {
      if (!TEXT_EXT.test(file)) continue;
      const original = readFileSync(file, 'utf8');
      const next =
        file.endsWith('SKILL.md')
          ? transformSkillMd(original, profile)
          : applyRewrites(original, profile.rewrites ?? []);
      if (next !== original) writeFileSync(file, next);
    }

    flattenNestedSkillMd(dest, profile.nestedSkillMdName ?? 'workflow.md');
    exported.push(skillId);
  }

  for (const item of profile.vendor ?? []) {
    const from = join(repoRoot, item.from);
    const into = join(outDir, item.into);
    if (!existsSync(from)) {
      throw new Error(`Vendor source missing: ${item.from}`);
    }
    mkdirSync(dirname(into), { recursive: true });
    cpSync(from, into);
  }

  const zips = [];
  if (shouldZip) {
    for (const skillId of exported) {
      const result = zipSkill(outDir, skillId);
      if (result.warning) warnings.push(result.warning);
      if (result.zipped) zips.push(`${skillId}.zip`);
    }
  }

  return { outDir, skills: exported, zips, warnings };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
export function validateExternalDir(dir) {
  const errors = [];
  if (!existsSync(dir)) {
    return [`external dir missing: ${dir}`];
  }

  for (const entry of readdirSync(dir)) {
    const skillDir = join(dir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    if (!existsSync(join(skillDir, 'SKILL.md'))) {
      errors.push(`${entry}: missing SKILL.md`);
      continue;
    }
    const skillMdCount = walkFiles(skillDir).filter((f) => f.endsWith('SKILL.md')).length;
    if (skillMdCount !== 1) {
      errors.push(`${entry}: expected exactly 1 SKILL.md, found ${skillMdCount}`);
    }
    for (const file of walkFiles(skillDir)) {
      if (!TEXT_EXT.test(file)) continue;
      const rel = relative(skillDir, file);
      const content = readFileSync(file, 'utf8');
      for (const { re, label } of FORBIDDEN) {
        if (re.test(content)) {
          errors.push(`${entry}/${rel}: ${label}`);
        }
      }
    }
  }

  return errors;
}
