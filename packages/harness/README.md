# @nextstage-brasil/harness

Interactive CLI to install [NextStage skills](https://github.com/nextstage-brasil/skills) and scaffold SDD project layout with multi-agent rules sync.

## Usage

### From npm

```bash
npx @nextstage-brasil/harness
```

### Local clone

```bash
npx file:~/apps/nextstage/skills/packages/harness
cd ~/apps/nextstage/skills/packages/harness && npm link
```

### Non-interactive

```bash
npx @nextstage-brasil/harness --preset gitlab --yes
npx @nextstage-brasil/harness list
```

## Commands

| Command | Description |
|---------|-------------|
| `harness` / `harness init` | Install skills, scaffold layout, sync adapters, generate `AGENTS.md` |
| `harness list` | Presets and skill catalog |
| `harness prepare` | Print full brownfield prepare instructions (`/harness-prepare`) |
| `harness sync` | Regenerate `.cursor/rules/`, `.claude/rules/`, and skill symlinks |
| `harness sync --check` | CI mode — exit 1 if adapters drift from canonical |
| `harness add-rule <name>` | Create rule under `.nextstage-harness/rules/`, update manifest, sync |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` from installed skills (no AI) |
| `harness agents-md --force` | Overwrite existing `AGENTS.md` |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` → `.nextstage-harness/rules/` |

Common flags: `--dir`, `--preset`, `--skill`, `--agent` (default `cursor`, `claude-code`), `--copy`, `--no-scaffold`, `--dry-run`, `--yes`.

`add-rule` flags: `--description`, `--globs` (comma-separated; skips `alwaysApply`), `--force`.

```bash
npx @nextstage-brasil/harness add-rule api-conventions --description "API conventions"
npx @nextstage-brasil/harness add-rule frontend --globs "apps/web/**"
```

See `.nextstage-harness/README.md` in consumer projects for the human guide.

## What `init` does

1. Detects **new** vs **existing** project.
2. Resolves skill dependencies from `templates/catalog.json`.
3. Runs `npx skills add` → `.agents/skills/` (+ `skill-creator` from anthropics/skills).
4. Scaffolds `.nextstage-harness/`, `.agents/`, and `docs/` (unless `--no-scaffold`).
5. Runs `harness sync` — rule adapters and skill symlinks (`.cursor/skills/`, `.claude/skills/`).
6. Runs `harness agents-md` — `AGENTS.md` from installed skills + `CLAUDE.md` (`@AGENTS.md`).

## Project layout (after init)

| Path | Role |
|------|------|
| `AGENTS.md` | Project entry (CLI-generated; refine with `agents-md-generator` skill) |
| `CLAUDE.md` | Pointer to `AGENTS.md` |
| `.nextstage-harness/rules/` | Canonical rules — **edit here** |
| `.nextstage-harness/README.md` | How to add/edit rules (scaffolded) |
| `.cursor/rules/`, `.claude/rules/` | Generated rule adapters |
| `.agents/skills/` | Installed skills (canonical — Skills CLI) |
| `.cursor/skills/`, `.claude/skills/` | Symlinked skill adapters (`harness sync`) |
| `docs/context`, `docs/specs`, `docs/versions` | SDD artifacts |

## Presets

| Preset | Skills |
|--------|--------|
| `recommended` | SDD planning chain + test generators + living specs |
| `gitlab` | MCP GitLab, review gate, issue execution, board sync |
| `brownfield` | `agents-md-generator`, architecture rules, bootstrap, reverse-spec |
| `implementation` | Code-coder, investigator, review |

## Post-install (brownfield / existing code)

CLI writes baseline `AGENTS.md`. In your agent, run next:

1. `/harness-prepare` — full chain: architecture rules → sync → brownfield map → reverse spec → AGENTS.md
2. Or check prerequisites: `npx @nextstage-brasil/harness prepare`

Individual skills remain available if you need only one step.

Full guide: [docs/README_INSTALLER.md](docs/README_INSTALLER.md).

## Development

```bash
cd packages/harness
npm install
npm test
```

## Release (CI)

On every push to `main`, `.github/workflows/publish-harness.yml`:

1. Runs harness tests
2. Reads conventional commits in that push (any path in the repo)
3. Every push publishes. Semver bump: `version:` → major, `feat:` → minor, anything else → patch
4. Bumps `package.json` + `package-lock.json`, publishes to npm, then commits, tags `harness-v{version}`, and pushes

### One-time npm setup (required)

Without this, `npm publish` fails with `ENEEDAUTH`.

1. Log in to [npmjs.com](https://www.npmjs.com/) as a maintainer of `@nextstage-brasil/harness`
2. Package → **Settings → Trusted publishing** → **GitHub Actions**
3. Configure exactly:

| Field | Value |
| ----- | ----- |
| Organization or user | `nextstage-brasil` |
| Repository | `skills` |
| Workflow filename | `publish-harness.yml` |

4. Save, then push to `main` to verify the first publish

No `NPM_TOKEN` secret — OIDC only. The workflow uses Node 24, npm 11.5.1+, and `id-token: write`. Do **not** add `registry-url` to `setup-node` (it forces token auth and breaks OIDC).

After the first successful publish, consider **Publishing access → Require 2FA and disallow tokens**.

### Manual recovery

If publish failed after a version bump landed on `main` but npm does not have that version, either:

- Re-run the failed workflow after fixing npm trusted publishing, or
- Push again to `main` to bump and retry

## License

Apache-2.0
