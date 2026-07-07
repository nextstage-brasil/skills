# Compression guide

`architecture-rules.mdc` is **hot memory** — loaded every session. Every line competes with the user's task context.

## Target

| Metric | Target |
| ------ | ------ |
| Lines | 80–200 (hard max 250) |
| Prose paragraphs | Avoid — use tables and bullets |
| Module tables | ≤ 12 rows; merge minor modules into "Other" |
| Code blocks | ≤ 2 short blocks (test commands, compose exec) |

## What belongs here vs elsewhere

| Keep in architecture-rules | Move out |
| -------------------------- | -------- |
| Product root, stack table, layout tree | Full API route lists |
| Module **names** and one-line responsibility | Per-handler webhook pipelines |
| Generated/forbidden paths | Domain business rules |
| Primary test command | Full test matrix |
| Pointers to sibling rules | Full NsUtil/Grogoo manuals |
| Auth/tenant **model** in one sentence | Status label cascade steps |

## Compression tactics

1. **Route by reference** — replace 20-line subsystem docs with `See docs/specs/foo.md` or `backend-rules.mdc`.
2. **Collapse duplicates** — if `AGENTS.md` already states SDD chain, one line: "SDD workflow: see AGENTS.md".
3. **Table over prose** — stack, modules, crons, test suites as tables.
4. **Drop the obvious** — do not document "use git" or generic SOLID unless the repo encodes a **specific** rule (e.g. "never edit Generated/").
5. **Mark inference** — `(inferred)` on one line beats a wrong confident rule.
6. **Split on overflow** — if NsUtil or Grogoo needs >40 lines, create `nsutil-architecture-rules.mdc` and keep one cross-link here.

## Anti-patterns (seen in bloated rules)

- Full router strategy enumeration — keep entry point + "new routes: see X"
- Copy-paste from README — agents can read README; constitution is **constraints**
- Business workflows (billing quotas, webhook cascades) — belong in `docs/specs/`
- Listing every cron job — table with schedule + command only if agents routinely touch crons

## Self-check before save

```
wc -l .cursor/rules/architecture-rules.mdc
```

If > 200 lines, run one compression pass: delete lowest-value section, add link, repeat.
