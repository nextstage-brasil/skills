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
    installedSkills.includes('bootstrap-brownfield');

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
  lines.push('1) Architecture rules (do this in your AI agent)');
  lines.push('');
  lines.push('   Skill:  /architecture-rules-generator');
  lines.push('   Prompt: Scan this codebase and generate');
  lines.push('           architecture-rules.md for {product_root}=.');
  lines.push('           Then run harness sync.');
  lines.push('   Output: .nextstage-harness/rules/architecture-rules.md');
  lines.push('   After:  npx @nextstage-brasil/harness sync');
  lines.push('');

  if (isBrownfield) {
    lines.push('1b) Brownfield map (optional, existing codebases)');
    lines.push('');
    lines.push('   Skill:  /bootstrap-brownfield');
    lines.push('   Prompt: Bootstrap brownfield analysis for');
    lines.push('           {product_root}=. before we plan version 1.0.');
    lines.push('   Output: docs/context/brownfield-map.md');
    lines.push('');
  }

  lines.push('────────────────────────────────');
  lines.push('2) AGENTS.md');
  lines.push('');
  lines.push('   CLI baseline (no AI):');
  lines.push('     npx @nextstage-brasil/harness agents-md --force');
  lines.push('');
  lines.push('   Refine with project context (AI skill):');
  lines.push('     Skill:  /agents-md-generator');
  lines.push('     Prompt: Generate or refresh AGENTS.md for this project');
  lines.push('             from installed skills and recon.');
  lines.push('');

  lines.push('────────────────────────────────');
  lines.push('Extras');
  lines.push('');
  lines.push('   New rule:  npx @nextstage-brasil/harness add-rule <name>');
  lines.push('   Sync:      npx @nextstage-brasil/harness sync');
  lines.push('');
  lines.push('SDD: clarify-requirements → requirements-generator →');
  lines.push('     task-generator → code-coder → code-reviewer');

  if (['recommended', 'gitlab', 'implementation', 'brownfield'].includes(preset)) {
    lines.push('');
    lines.push('Skip AI steps if greenfield with no code yet.');
  }

  return lines.join('\n');
}
