# Reconnaissance checklist — AGENTS.md

Read-only scan before drafting project `AGENTS.md`. Skip sections with no signals.

## 1. Anchor and existing docs

- [ ] Existing `AGENTS.md` — preserve hand-edited sections on refresh
- [ ] Existing `CLAUDE.md` — will be replaced with `@AGENTS.md` pointer only
- [ ] `README.md` — project name, summary, setup hints
- [ ] Monorepo layout — `apps/`, `packages/`, which folder is `{product_root}`

## 2. Harness layout (detect, do not assume)

- [ ] `.nextstage-harness/manifest.json`
- [ ] `.nextstage-harness/rules/` (list files; note if `architecture-rules.md` is stub)
- [ ] `.agents/skills/` — **installed skills** (source of truth for workflows section)
- [ ] `.cursor/skills/`, `.claude/skills/` — skill adapter symlinks (informational)
- [ ] `docs/context/`, `docs/specs/`, `docs/versions/` — SDD scaffold present
- [ ] Legacy only: `.cursor/rules/*.mdc` without `.nextstage-harness/` — note migration path
- [ ] Ignore legacy `.agents/agents/` / persona wrappers if present — skills replace that layer; do not document personas in `AGENTS.md`

## 3. Workflow signals

- [ ] GitLab: `mcp-gitlab-usage` skill, `.gitlab-ci.yml`, issue templates, MCP config in docs
- [ ] SDD artifacts under `docs/versions/` — active versioning
- [ ] `execution-handoff.md` pattern in recent versions
- [ ] Brownfield artifacts: `brownfield-map.md`, `system-reverse-spec.md`

## 4. Team conventions (only if evidenced)

- [ ] Language for code/comments vs user chat
- [ ] Git branch policy in docs or rules
- [ ] Commit message style
- [ ] Test-before-commit requirements
- [ ] Docker / PHPUnit — test container name or compose service in `architecture-rules.md`, `stack-confirmed.md`, or Compose files (optional extra line under Docker and testing in `AGENTS.md` when found)

## Output of this phase

Internal summary:

1. `{product_root}` resolution with evidence
2. Installed skills list (exact directory names)
3. Which workflows apply (SDD full chain, GitLab-only, implementation-only, brownfield)
4. Layout rows to include vs omit
5. Hand-edited `AGENTS.md` sections to preserve on refresh
