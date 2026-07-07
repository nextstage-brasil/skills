import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { AGENTS_PERSONAS_DIR } from './agentsLayout.js';

function hashFile(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function resolveSymlinkTarget(linkPath) {
  const target = readlinkSync(linkPath);
  return resolve(dirname(linkPath), target);
}

function isSymlinkTo(linkPath, canonicalPath) {
  if (!existsSync(linkPath)) return false;
  if (!lstatSync(linkPath).isSymbolicLink()) return false;
  return resolveSymlinkTarget(linkPath) === resolve(canonicalPath);
}

function writeAdapter(canonicalPath, adapterPath, copy) {
  mkdirSync(dirname(adapterPath), { recursive: true });
  if (existsSync(adapterPath)) {
    unlinkSync(adapterPath);
  }

  if (copy) {
    copyFileSync(canonicalPath, adapterPath);
    return 'copy';
  }

  const relTarget = relative(dirname(adapterPath), canonicalPath);
  try {
    symlinkSync(relTarget, adapterPath);
    return 'symlink';
  } catch (error) {
    copyFileSync(canonicalPath, adapterPath);
    return 'copy-fallback';
  }
}

function adapterMatches(canonicalPath, adapterPath) {
  if (!existsSync(adapterPath)) return false;
  if (isSymlinkTo(adapterPath, canonicalPath)) return true;
  if (lstatSync(adapterPath).isSymbolicLink()) return false;
  const canonicalHash = hashFile(readFileSync(canonicalPath, 'utf8'));
  const adapterHash = hashFile(readFileSync(adapterPath, 'utf8'));
  return canonicalHash === adapterHash;
}

export function syncAgents(projectRoot, options = {}) {
  const { agents = ['cursor', 'claude-code'], check = false, copy = false } = options;
  const canonicalDir = join(projectRoot, AGENTS_PERSONAS_DIR);

  if (!existsSync(canonicalDir)) {
    return { ok: true, drifts: [], written: [], skipped: true };
  }

  const personaFiles = readdirSync(canonicalDir).filter((entry) => entry.endsWith('.md'));
  if (personaFiles.length === 0) {
    return { ok: true, drifts: [], written: [], skipped: true };
  }

  const adapterTargets = [];
  if (agents.includes('cursor')) {
    adapterTargets.push(join(projectRoot, '.cursor', 'agents'));
  }
  if (agents.includes('claude-code')) {
    adapterTargets.push(join(projectRoot, '.claude', 'agents'));
  }

  const drifts = [];
  const written = [];

  for (const file of personaFiles) {
    const canonicalPath = join(canonicalDir, file);

    for (const adapterDir of adapterTargets) {
      const adapterPath = join(adapterDir, file);
      if (check) {
        if (!adapterMatches(canonicalPath, adapterPath)) {
          drifts.push(adapterPath);
        }
      } else {
        const mode = writeAdapter(canonicalPath, adapterPath, copy);
        written.push(`${adapterPath} (${mode})`);
      }
    }
  }

  return { ok: drifts.length === 0, drifts, written, check, skipped: false };
}
