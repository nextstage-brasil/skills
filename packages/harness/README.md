# @nextstage-brasil/harness

Interactive CLI to install [NextStage skills](https://github.com/nextstage-brasil/skills) and scaffold SDD project layout.

## Usage

### From npm (after publish)

```bash
# Interactive wizard (project directory, preset, scaffold)
npx @nextstage-brasil/harness
```

### Local clone (before publish)

```bash
# One-off from absolute path
npx file:~/apps/nextstage/skills/packages/harness

# Or link globally
cd ~/apps/nextstage/skills/packages/harness && npm link
harness list
```

### Non-interactive

```bash
npx @nextstage-brasil/harness --preset recommended --yes
npx @nextstage-brasil/harness --preset gitlab --yes
npx @nextstage-brasil/harness --skill execute-gitlab-issue --yes
npx @nextstage-brasil/harness list
```

Replace `npx @nextstage-brasil/harness` with `npx file:<path-to>/packages/harness` or `harness` when using `npm link`.

`init` is an optional alias: `harness init` works the same as calling without a subcommand.

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

## Publish

From `packages/harness` (requires npm login to `@nextstage-brasil` scope):

```bash
npm publish --access public
```

After the first publish, `npx @nextstage-brasil/harness` works without a local path.

## License

Apache-2.0
