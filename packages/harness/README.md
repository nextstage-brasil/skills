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
3. Runs `npx skills add` → `.agents/skills/` (NextStage catalog + `skill-creator` from anthropics/skills).
4. Scaffolds `AGENTS.md`, `.nextstage-harness/rules/`, `.agents/docs/`, and `docs/` (unless `--no-scaffold`).
5. Runs `harness sync` and `harness agents-md` after scaffold (unless `--no-scaffold`).
6. Copies agent personas to `.agents/agents/<name>.md` and syncs to `.cursor/agents/`, `.claude/agents/` (unless `--no-agents`).

Default agents on install: `cursor`, `claude-code`.

Full install guide: [docs/README_INSTALLER.md](docs/README_INSTALLER.md).

## Agent personas

Canonical source: repo-root `agents/*.md`.

Installed to `.agents/agents/<name>.md` (canonical). `harness sync` symlinks to `.cursor/agents/` and `.claude/agents/` (`--copy` for plain files).

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
