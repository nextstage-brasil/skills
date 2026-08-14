# Agent artifact compress (pre-save)

**Audience:** coding agents — not humans. **Never** apply to human chat. Chat voice: natural language (`../../sdd/ns-spec-driven/references/human-communication.md` when installed). Pass runs on **file drafts** before `Write` only.

Apply **caveman ultra** to every **agent-facing** prepare/worker output. Personal `caveman` skill loaded → intensity **ultra**; else follow this file.

## Applies to

| Artifact | Compress? |
| -------- | --------- |
| `.nextstage-harness/rules/architecture-rules.md` | **Yes** |
| `.nextstage-harness/rules/project-rules.md` | **No** — human-edited |
| `docs/context/brownfield-map.md` | **Yes** |
| `docs/context/system-reverse-spec.agent.md` | **Yes** |
| `AGENTS.md` | **Yes** |
| `docs/context/system-reverse-spec.md` | **No** — human body |
| `CLAUDE.md` | **No** — fixed boot template |
| `**/templates/**/*.md`, `**/*.template.md`, `**/*-template.md`, `**/*.stub.md` | **No** — preserve placeholders |

## Mandate

1. Draft fully (evidence, tables, routing).
2. **Before save:** rewrite through this pass.
3. Write compressed result only.
4. No "compressed by…" banners in saved file.

## Keep

- Paths, skill names, slash commands, MCP server names
- Routing/constraint tables (stack, modules, priority 1–5, hard stops)
- `MUST` / `MUST NOT` / `FORBIDDEN`
- Confidence (`confirmed` / `inferred` / `ambiguous`)
- Fenced code / evidenced commands
- Sync markers (`<!-- harness-sync-managed: ... -->`, generators)
- Links to siblings — not inlined bodies

## Cut

- Filler, hedging, throat-clearing
- Articles/conjunctions when unambiguous
- Sections that only restate another table
- Prose when table/one-liner carries fact
- Human onboarding / tutorial tone
- Absolute machine paths — repo-relative only
- Invented abbreviations (`cfg`/`impl`/`req`)
- Prose arrows (`→`) as glue (table columns OK)

## Intensity (ultra)

- One fact once. Fragments OK.
- Telegraphic: `[thing] [constraint].`
- Tables over paragraphs.
- English in saved artifacts unless worker sets other language. Exception: reverse-spec pair **always English**.

## Targets (soft → hard)

| Artifact | Soft | Hard |
| -------- | ---- | ---- |
| `architecture-rules.md` | 80–200 | 250 |
| `brownfield-map.md` | ≤120 | ~180 |
| `system-reverse-spec.agent.md` | tables only; lean | no novel prose |
| `AGENTS.md` | 95–110 | 130 |

Over hard max: delete lowest-value section, link, repeat once.

## Self-check

- [ ] No load-bearing path/skill/MUST lost
- [ ] No duplicate section echoing another table
- [ ] Line count ≤ hard max (or linked overflow)
- [ ] "No" table files not caveman-rewritten
- [ ] Templates left uncompressed
