# NextStage Skills

A collection of [agent skills](https://skills.sh/) maintained by NextStage Brasil — agent-agnostic workflows that guide coding agents through recurring engineering, documentation, and modernization tasks. Compatible with Cursor, Claude Code, Codex, and other tools in the open skills ecosystem.

## Structure

```
skills/
└── <skill-name>/
    ├── SKILL.md              # Main instructions (required)
    ├── README.md             # Skill evolution notes and changelog
    ├── references/           # Supporting templates and checklists
    └── scripts/              # Optional utilities
```

Each skill is a self-contained directory. The agent discovers and applies skills via the `name` and `description` frontmatter in `SKILL.md`.

## Installation

Install via the [Skills CLI](https://skills.sh/) (`npx skills`).

**Project (recommended for teams):**

```bash
npx skills add nextstage-brasil/skills@codebase-reverse-spec --full-depth -y
```

**Global (all projects):**

```bash
npx skills add nextstage-brasil/skills@codebase-reverse-spec --full-depth -g -y
```

**All skills from this repo:**

```bash
npx skills add nextstage-brasil/skills --full-depth --all -y
```

`--full-depth` is required because skills live under `skills/`, not the repository root.

Browse available skills: `npx skills add nextstage-brasil/skills --list --full-depth`

## Contributing

1. Create a directory at `skills/<skill-name>/` with `SKILL.md` (YAML frontmatter + markdown body).
2. Add `references/` and `scripts/` only when they add real value to the workflow.
3. Document relevant changes in the skill's `README.md`.

## License

[Apache License 2.0](LICENSE)
