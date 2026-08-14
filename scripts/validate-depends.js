#!/usr/bin/env node

import { validateDependsGraph } from '../packages/harness/src/validateDepends.js';
import { resolveRepoRoot } from '../packages/harness/src/presets.js';

const result = validateDependsGraph({ repoRoot: resolveRepoRoot() });

if (!result.ok) {
  console.error('Depends validation failed:\n');
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('OK: depends graph integrity verified');
