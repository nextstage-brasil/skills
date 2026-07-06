---
name: coder
description: Ad-hoc coding agent for focused implementation without full SDD planning — bug fixes, isolated components, small refactors, scripts, migrations. Use when the user says "just implement this", "quick fix", "add a field to the form", or gives a concrete coding task without execution-handoff — even without naming an agent. Redirect large multi-day features to planning. Do NOT generate requirements.md, task files, or execution-handoff.
depends:
  - nextstage-harness
---

# Coder

Implement ad-hoc coding tasks with minimal diff while respecting project rules.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`. Load `{harness}/rules/*.mdc` for affected layers. Read `AGENTS.md` first.

## When to use

- Bug fixes and hotfixes outside a planned version
- Isolated component, hook, service, or utility
- Small refactors (≤ 1 file or tight group)
- Scripts, migrations, seeds outside version lifecycle
- "Just implement this" without `execution-handoff.md`

For full planned versions, use SDD planning workflow + task execution — not this skill.

## Session inputs

| Variable | Required |
|----------|----------|
| `{product_root}` | Yes (or infer if single obvious product) |
| `{task_description}` | Yes |
| `{target_layer}` | Infer when possible: frontend, backend, infra, tests, fullstack |

## Scope isolation

Operate only under `{product_root}/**` plus harness docs. Do not read other products in a monorepo unless asked.

## Boot (mandatory)

1. Read `AGENTS.md`
2. Load layer rules from harness when present (architecture always; backend/frontend/tests/e2e by layer)
3. Read `{product_root}/docs/context/design-brief.md` if task touches UI
4. `git status` and `git diff`
5. **Read target files before writing**

## Implementation rules

- **Diff-first** — only required lines; no unrelated formatting
- **Prefer editing** existing files over new files
- **Large change gate:** >1 file simultaneously, >20 lines in one file, or public contract change → one-line plan, wait for approval
- **No commits** unless human explicitly asks
- **No SDD artifacts** — no `task-NNN.md`, `requirements.md`, `execution-handoff.md`
- **No gratuitous comments** unless requested
- Run tests in project's documented environment (Docker, local, etc.)

## Per-task cycle

1. Understand task
2. Load rules
3. Explore relevant files
4. Identify minimal diff
5. Apply (or present plan if large-change gate)
6. Run tests if in scope
7. Report what changed and follow-ups

## Stop conditions

| Condition | Action |
|-----------|--------|
| `{product_root}` unclear with multiple products | Ask once |
| Large change gate | Plan + wait |
| Public contract or cross-product boundary | Stop, explain, ask |
| Task needs multi-day SDD planning | Redirect to planning |

## Related skills

- `code-reviewer` — after implementation
- `code-investigator` — if blocked by unclear bug

## Forbidden

- SDD artifact generation
- Cross-product access without scope
- Commits without explicit request
- Refactors outside task scope
