#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRepoRoot } from '../packages/harness/src/presets.js';

const repoRoot = resolveRepoRoot();
const skillsRoot = join(repoRoot, 'skills');

const errors = [];

for (const entry of readdirSync(skillsRoot)) {
  if (entry === '_meta' || entry.endsWith('-workspace') || entry.startsWith('.')) continue;

  const skillDir = join(skillsRoot, entry);
  if (!statSync(skillDir).isDirectory()) continue;

  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) continue;

  const content = readFileSync(skillMd, 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    errors.push(`${entry}: missing YAML frontmatter`);
    continue;
  }

  const fm = frontmatter[1];
  const nameMatch = fm.match(/^name:\s*(\S+)/m);
  if (!nameMatch || nameMatch[1] !== entry) {
    errors.push(`${entry}: frontmatter name must match directory`);
  }

  if (entry === 'ns-project-manager') {
    if (!/^requires_harness:/m.test(fm)) {
      errors.push(`${entry}: requires requires_harness in frontmatter`);
    }
    for (const field of ['provides', 'consumes']) {
      if (!new RegExp(`^${field}:`, 'm').test(fm)) {
        errors.push(`${entry}: requires ${field} in frontmatter`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Manifest validation failed:\n');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('OK: manifest validation passed for catalog skills');
