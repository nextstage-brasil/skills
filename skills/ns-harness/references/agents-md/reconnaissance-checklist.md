# Reconnaissance checklist — AGENTS.md

Read-only before drafting project `AGENTS.md`. Skip empty sections.

## 1. Anchor + existing docs

- [ ] Existing `AGENTS.md` — preserve hand-edited on refresh
- [ ] `agents.local.md` beside `AGENTS.md` (case-insensitive) — present/absent for layout; do not copy contents
- [ ] Existing `CLAUDE.md` — replace with Step 5 boot template
- [ ] `README.md` — name, summary, setup
- [ ] Layout signals — `apps/`, `packages/`, backend/frontend (document; no invented anchors)

## 2. Harness layout (detect, do not assume)

- [ ] `.nextstage-harness/manifest.json`
- [ ] `.nextstage-harness/rules/` (list; note stub `architecture-rules.md`)
- [ ] `.agents/skills/` — **installed skills** (SoT for workflows)
- [ ] `.claude/skills/` — Claude symlinks (info; Cursor uses `.agents/skills/`)
- [ ] `docs/context/`, `docs/specs/`, `docs/versions/`
- [ ] Legacy only: `.cursor/rules/*.mdc` without `.nextstage-harness/` — migration note
- [ ] `.nextstage-harness/manifest.json` `subagents` — name/skill/cursor model → AGENTS.md Project subagents
- [ ] Ignore legacy `.agents/agents/` wrappers — not a substitute for mapped skills

## 3. Workflow signals

- [ ] GitLab: `mcp-gitlab-usage`, `.gitlab-ci.yml`, issue templates, MCP in docs
- [ ] SDD under `docs/versions/{version_san}/sdd/`
- [ ] `sdd/execution-handoff.md` in recent versions
- [ ] Brownfield: `brownfield-map.md`, `system-reverse-spec.md`, `.agent.md`

## 4. Team conventions (evidenced only)

- [ ] Language for code/comments vs chat
- [ ] Git branch policy
- [ ] Commit message style
- [ ] Test-before-commit
- [ ] Docker / PHPUnit — test container from `architecture-rules.md`, `stack-confirmed.md`, or Compose

## Output

1. Install path / harness presence + evidence
2. Installed skills (exact dir names)
3. Workflows that apply (SDD / GitLab-only / implementation-only / brownfield)
4. Layout rows include vs omit
5. Hand-edited `AGENTS.md` sections to preserve
