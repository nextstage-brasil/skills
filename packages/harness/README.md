# @nextstage-brasil/harness

Interactive CLI to install [NextStage skills](https://github.com/nextstage-brasil/skills) and scaffold SDD project layout.

## Usage

### From npm (after publish)

```bash
npx @nextstage-brasil/harness
```

### Local clone (before publish)

```bash
npx file:~/apps/nextstage/skills/packages/harness
cd ~/apps/nextstage/skills/packages/harness && npm link
```

### Non-interactive

```bash
npx @nextstage-brasil/harness --preset gitlab --yes
npx @nextstage-brasil/harness list
```

## What it does

1. Detects whether the target is a **new** or **existing** project.
2. Resolves skill dependencies from `templates/catalog.json`.
3. Runs `npx skills add` → `.agents/skills/`.
4. Scaffolds `AGENTS.md`, `.agents/rules/`, `.agents/docs/`, and `docs/` (unless `--no-scaffold`).
5. Copies agent personas to `.agents/agents/<name>.md` (unless `--no-agents`).

## Agent personas

Canonical source: repo-root `agents/*.md`.

Installed to `.agents/agents/<name>.md` in the target project.

## Presets

| Preset           | Skills                                               |
| ---------------- | ---------------------------------------------------- |
| `recommended`    | SDD planning chain + test generators + living specs  |
| `gitlab`         | MCP GitLab, review gate, issue execution, board sync |
| `brownfield`     | Bootstrap + reverse-spec                             |
| `implementation` | Coder, investigator, review                          |

## Development

```bash
cd packages/harness
npm install
npm test
```

## License

Apache-2.0
