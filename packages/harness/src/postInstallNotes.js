/**
 * Human-readable next-steps block shown after `harness init`.
 * Kept plain-text so it wraps cleanly inside clack's `p.note` box.
 */
export function buildPostInstallNotes({
  preset,
  installedSkills = [],
  projectRoot: _projectRoot,
  scaffoldRan = true,
  noScaffold = false,
}) {
  const lines = [];
  const isBrownfield =
    preset === 'brownfield' ||
    installedSkills.includes('harness-prepare') ||
    installedSkills.includes('harness-bootstrap-brownfield');
  const hasPrepare = installedSkills.includes('harness-prepare');

  if (noScaffold) {
    lines.push('Skills installed (--no-scaffold). Scaffold skipped.');
    lines.push('');
  } else if (scaffoldRan) {
    lines.push('Scaffold + AGENTS.md baseline written.');
    lines.push('');
  } else {
    lines.push('Skills installed (scaffold paths already present — nothing new written).');
    lines.push('');
  }

  lines.push('────────────────────────────────');
  lines.push('Next step (in your AI agent)');
  lines.push('');

  if (hasPrepare || isBrownfield) {
    lines.push('  Skill:   /harness-prepare');
    lines.push('  CLI:     npx @nextstage-brasil/harness prepare');
    lines.push('');
    lines.push('  First run — full chain (one session):');
    lines.push('    harness-architecture-rules');
    lines.push('    → harness sync');
    lines.push('    → harness-bootstrap-brownfield');
    lines.push('    → harness-codebase-reverse-spec');
    lines.push('    → harness-agents-md');
    lines.push('');
    lines.push('  Re-run regularly to refresh project context:');
    lines.push('    • After major refactors, new modules, or stack changes');
    lines.push('    • Before SDD planning when brownfield docs may be stale');
    lines.push('    • Same command: /harness-prepare (updates rules + context + AGENTS.md)');
    lines.push('');
    lines.push('  Skip first run if greenfield with no application code yet.');
  } else {
    lines.push('  Optional: /harness-architecture-rules when code exists');
    lines.push('  Then:     npx @nextstage-brasil/harness sync');
    lines.push('  Refine:   /harness-agents-md');
  }

  lines.push('');
  lines.push('────────────────────────────────');
  lines.push('Extras');
  lines.push('');
  lines.push('   Guide:    .nextstage-harness/README.md');
  lines.push('   New rule:  npx @nextstage-brasil/harness add-rule <name>');
  lines.push('   Sync:      npx @nextstage-brasil/harness sync');
  lines.push('   Update:    npx @nextstage-brasil/harness update');
  lines.push('   Agents:    npx @nextstage-brasil/harness agents');
  lines.push('');
  lines.push('SDD: pm-clarify-requirements → pm-requirements-generator →');
  lines.push('     pm-task-generator → code-coder → code-reviewer');

  return lines.join('\n');
}
