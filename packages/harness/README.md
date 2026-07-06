# @nextstage-brasil/harness

Interactive CLI to install [NextStage skills](https://github.com/nextstage-brasil/skills) and scaffold SDD project layout.

## Usage

```bash
# Interactive wizard (project directory, preset, scaffold)
npx @nextstage-brasil/harness

# Non-interactive — recommended SDD chain
npx @nextstage-brasil/harness --preset recommended --yes

# GitLab execution preset
npx @nextstage-brasil/harness --preset gitlab --yes

# Single skill with transitive depends resolved
npx @nextstage-brasil/harness --skill execute-gitlab-issue --yes

# Override skills source (local dev or fork)
npx @nextstage-brasil/harness --source /path/to/skills --yes
NEXTSTAGE_SKILLS_SOURCE=/path/to/skills npx @nextstage-brasil/harness --yes

# List presets and skills
npx @nextstage-brasil/harness list
```

`init` is an optional alias: `npx @nextstage-brasil/harness init` works the same as calling without a subcommand.

## What it does

1. Detects whether the target is a **new** or **existing** project.
2. Resolves skill dependencies from `templates/catalog.json` (mirrors skill `depends` frontmatter).
3. Runs `npx skills add` against `nextstage-brasil/skills` (or a local clone when detected).
4. Optionally scaffolds `AGENTS.md`, `docs/context/`, `docs/specs/`, and `docs/versions/`.

## Presets

| Preset | Skills |
|--------|--------|
| `recommended` | SDD planning chain + test generators + living specs |
| `gitlab` | MCP GitLab, review gate, issue execution, board sync |
| `brownfield` | Bootstrap + reverse-spec |
| `implementation` | Coder, investigator, review |

## Development

```bash
cd packages/harness
npm install
npm test
node bin/cli.js list
node bin/cli.js --dir /tmp/nextstage-test --preset recommended --yes --dry-run
```

## License

Apache-2.0
