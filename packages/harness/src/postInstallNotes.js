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
    installedSkills.includes('bootstrap-brownfield');
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
    lines.push('  Full chain (one session):');
    lines.push('    architecture-rules-generator');
    lines.push('    → harness sync');
    lines.push('    → bootstrap-brownfield');
    lines.push('    → codebase-reverse-spec');
    lines.push('    → agents-md-generator');
    lines.push('');
    lines.push('  Skip if greenfield with no application code yet.');
  } else {
    lines.push('  Optional: /architecture-rules-generator when code exists');
    lines.push('  Then:     npx @nextstage-brasil/harness sync');
    lines.push('  Refine:   /agents-md-generator');
  }

  lines.push('');
  lines.push('────────────────────────────────');
  lines.push('Extras');
  lines.push('');
  lines.push('   New rule:  npx @nextstage-brasil/harness add-rule <name>');
  lines.push('   Sync:      npx @nextstage-brasil/harness sync');
  lines.push('');
  lines.push('SDD: clarify-requirements → requirements-generator →');
  lines.push('     task-generator → code-coder → code-reviewer');

  return lines.join('\n');
}
