/**
 * Built-in thin skill bridges. Presets that install the mapped skill get the
 * matching subagent seeded into manifest.subagents (model preserved on update).
 */
export const DEFAULT_SUBAGENTS = [
  {
    name: 'coder-agent',
    skill: 'ns-code-coder',
    description:
      '(NS) Thin bridge to ns-code-coder. Invoke for ad-hoc coding — loads AGENTS.md then the skill workflow.',
    model: { cursor: 'inherit', claude: 'inherit' },
    readonly: false,
  },
  {
    name: 'reviewer-agent',
    skill: 'ns-code-reviewer',
    description:
      '(NS) Thin bridge to ns-code-reviewer. Invoke for the review gate — loads AGENTS.md then the skill workflow.',
    model: { cursor: 'inherit', claude: 'inherit' },
    readonly: true,
  },
  {
    name: 'task-writer-agent',
    skill: 'ns-sdd-task-generator',
    description:
      '(NS) Thin bridge to ns-sdd-task-generator. Invoke to write SDD task files — prefer a cheaper model than planning.',
    model: { cursor: 'fast', claude: 'haiku' },
    readonly: false,
  },
];

export function defaultSubagentByName(name) {
  return DEFAULT_SUBAGENTS.find((entry) => entry.name === name) ?? null;
}

export function defaultSubagentBySkill(skill) {
  return DEFAULT_SUBAGENTS.find((entry) => entry.skill === skill) ?? null;
}
