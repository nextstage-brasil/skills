# NextStage Skills

Agent-agnostic skills for the [open skills ecosystem](https://skills.sh/), maintained by NextStage Brasil. Each skill lives under `skills/<name>/` with a `SKILL.md` entry point, optional `references/`, and optional `scripts/`.

## Language

**English only — no exceptions.**

All project artifacts must be written in English:

- `AGENTS.md`, `README.md`, and every other markdown file in this repository
- Skill instructions (`SKILL.md`), reference templates, checklists, and scripts
- Commit messages, PR descriptions, and issue text for this repo
- Agent responses and deliverables produced while working in this repository

## Skill authoring

When creating or editing a skill in this repository, **read and follow** the local `skill-creator` skill first:

`~/.agents/skills/skill-creator/SKILL.md`

Use it for structure, frontmatter, description triggering, bundled resources, evals, and iteration — before drafting or changing anything under `skills/`.

## Agent personas

`agents/<name>.md` is a thin, isolated/read-only wrapper over a matching
`skills/<name>/SKILL.md` — only for the few skills that genuinely benefit
from running in a separate context (a blocking review gate, an
investigation that shouldn't pollute the main conversation). It is never a
place to duplicate a skill's logic, and it must never contain syntax or
concepts specific to one harness. The harness installs them to `.agents/agents/<name>.md`
in the target project.
