#!/usr/bin/env node

// Bundles the canonical, harness-agnostic agent personas (repo-root
// `agents/`) into `templates/agents/` so the published npm package can
// project them even when installed against the default remote source
// (no local checkout to read `agents/` from). Never hand-edit
// `templates/agents/` — it is regenerated here, run at `prepack` time.
//
// When a local checkout of the skills repo is available (dev, --source,
// NEXTSTAGE_SKILLS_SOURCE), src/agentPersonas.js reads `agents/` directly
// instead of this bundled copy — so this script is purely a publish-time
// fallback, not a second source of truth.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const sourceDir = join(repoRoot, 'agents');
const targetDir = join(__dirname, '..', 'templates', 'agents');

if (!existsSync(sourceDir)) {
  console.error(`sync-agents: source directory not found: ${sourceDir}`);
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

const files = readdirSync(sourceDir).filter((entry) => entry.endsWith('.md'));

for (const file of files) {
  copyFileSync(join(sourceDir, file), join(targetDir, file));
}

console.log(`sync-agents: bundled ${files.length} persona file(s) into ${targetDir}`);
