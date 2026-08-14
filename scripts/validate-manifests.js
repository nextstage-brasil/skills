#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRepoRoot } from '../packages/harness/src/presets.js';

const domainArg = process.argv[2];
const repoRoot = resolveRepoRoot();
const skillsRoot = join(repoRoot, 'skills');

let domains;
if (domainArg) {
  const normalized = domainArg.replace(/^skills\//, '').replace(/\/$/, '');
  domains = [normalized];
} else {
  domains = ['business', 'code', 'docs', 'frontend', 'gitlab', 'labs', 'sdd', 'testing'];
}

const errors = [];

for (const domain of domains) {
  const domainDir = join(skillsRoot, domain);
  if (!existsSync(domainDir)) {
    errors.push(`Missing domain directory: skills/${domain}/`);
    continue;
  }

  for (const entry of readdirSync(domainDir)) {
    const skillDir = join(domainDir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) continue;

    const content = readFileSync(skillMd, 'utf8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) {
      errors.push(`${domain}/${entry}: missing YAML frontmatter`);
      continue;
    }

    const fm = frontmatter[1];
    const nameMatch = fm.match(/^name:\s*(\S+)/m);
    if (!nameMatch || nameMatch[1] !== entry) {
      errors.push(`${domain}/${entry}: frontmatter name must match directory`);
    }

    if (domain === 'business' && !/^requires_harness:/m.test(fm)) {
      errors.push(`${domain}/${entry}: business skills require requires_harness in frontmatter`);
    }

    for (const field of ['provides', 'consumes']) {
      if (!new RegExp(`^${field}:`, 'm').test(fm) && domain === 'business') {
        errors.push(`${domain}/${entry}: business skills require ${field} in frontmatter`);
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

console.log(`OK: manifest validation passed for ${domains.join(', ')}`);
