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

## Release (CI)

On every push to `main`, GitHub Actions:

1. Runs harness tests
2. Reads conventional commits in that push (any path in the repo)
3. Bumps semver: `version:` → major, `feat:` → minor, anything else → patch
4. Commits `package.json`, tags `harness-v{version}`, and runs `npm publish --access=public`

**Required npm setup (once):** on [npmjs.com](https://www.npmjs.com/package/@nextstage-brasil/harness) → **Settings → Trusted Publisher** → GitHub Actions:

| Field | Value |
| ----- | ----- |
| Organization or user | `nextstage-brasil` |
| Repository | `skills` |
| Workflow filename | `publish-harness.yml` |

No `NPM_TOKEN` secret is needed — publish uses OIDC (short-lived credentials). After verifying the first release, consider **Publishing access → Require 2FA and disallow tokens**.

Every push to `main` with commits publishes. Use `version:` (or `version!:`) only when you need a major bump.

## License

Apache-2.0
