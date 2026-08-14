/**
 * Built-in thin skill bridges. Presets that install the mapped skill get the
 * matching subagent seeded into manifest.subagents (model preserved on update).
 */
export const DEFAULT_SUBAGENTS = [
  {
    name: 'coder-agent',
    skill: 'ns-coder',
    description:
      '(NS) Thin bridge to ns-coder. Invoke for ad-hoc coding — loads AGENTS.md then the skill workflow.',
    model: {
      cursor: 'composer-2.5[fast=false]',
      claude: 'sonnet',
    },
    readonly: false,
  },
  {
    name: 'reviewer-agent',
    skill: 'ns-reviewer',
    description:
      '(NS) Thin bridge to ns-reviewer. Invoke for the review gate — loads AGENTS.md then the skill workflow.',
    model: {
      cursor: 'grok-4.5[effort=medium,fast=false]',
      claude: 'opus',
    },
    readonly: true,
  },
  {
    name: 'task-writer-agent',
    skill: 'ns-spec-driven',
    skillReference: 'references/task-generator.md',
    description:
      '(NS) Thin bridge to ns-spec-driven task-generator reference. Invoke to write SDD task files — prefer a cheaper model than planning.',
    model: {
      cursor: 'composer-2.5[fast=false]',
      claude: 'haiku',
    },
    readonly: false,
  },
];

export function defaultSubagentByName(name) {
  return DEFAULT_SUBAGENTS.find((entry) => entry.name === name) ?? null;
}

export function defaultSubagentBySkill(skill) {
  return DEFAULT_SUBAGENTS.find((entry) => entry.skill === skill) ?? null;
}
