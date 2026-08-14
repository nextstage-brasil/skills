# Compression guide

`architecture-rules.md` = **hot memory**. Every line competes with task context.

**Always first:** `../agent-artifact-compress.md`. This file = constitution tactics after that pass.

## Target

| Metric | Target |
| ------ | ------ |
| Lines | 80–200 (hard max 250) |
| Prose paragraphs | Avoid — tables + bullets |
| Bullet style | Telegraphic — one fact/line; no filler |
| Module tables | ≤12 rows; minor → "Other" |
| Code blocks | ≤2 short (test commands, compose exec) |

## Keep vs move out

| Keep | Move out |
| ---- | -------- |
| Scope, stack table, layout tree | Full API route lists |
| Module **names** + one-line responsibility | Per-handler webhook pipelines |
| Generated/forbidden paths | Domain business rules |
| Primary test command | Full test matrix |
| Pointers to sibling rules | Full NsUtil/Grogoo manuals |
| Auth/tenant **model** one sentence | Status label cascade steps |

## Tactics

1. **Route by reference** — 20-line subsystem → `See docs/specs/foo.md` or `backend-rules.md`.
2. **Collapse duplicates** — SDD already in `AGENTS.md` → one line pointer.
3. **Table over prose** — stack, modules, crons, tests.
4. **Telegraphic bullets** — subject + constraint.
5. **Drop obvious** — no "use git" / generic SOLID unless repo-specific (e.g. "never edit Generated/").
6. **Mark inference** — `(inferred)` beats wrong confident rule.
7. **Split overflow** — NsUtil/Grogoo >40 lines → sibling rule + one cross-link.

## Anti-patterns

- Full router strategy enum — entry point + "new routes: see X"
- README copy-paste — constitution = **constraints**
- Business workflows — `docs/specs/`
- Every cron — schedule + command table only if agents touch crons

## Self-check

```
wc -l .nextstage-harness/rules/architecture-rules.md
```

>200 lines: delete lowest-value section, link, repeat once. Then `npx @nextstage-brasil/harness sync`.
