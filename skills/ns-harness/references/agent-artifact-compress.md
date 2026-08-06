# Agent artifact compress (pre-save)

**Audience:** coding agents — not humans. **Never** apply this pass to human chat. Chat voice: natural language (see `../../ns-spec-driven/references/human-communication.md` when installed). This pass runs on **file drafts** before `Write` only.

Apply **caveman ultra** compression to every **agent-facing** prepare/worker output. If a personal `caveman` skill is loaded, use intensity **ultra** for this pass; otherwise follow this file verbatim.

## Applies to

| Artifact | Compress? |
| -------- | --------- |
| `{harness_root}/rules/architecture-rules.md` | **Yes** |
| `{harness_root}/rules/project-rules.md` | **No** — human-edited project-local settings |
| `docs/context/brownfield-map.md` | **Yes** |
| `docs/context/system-reverse-spec.agent.md` | **Yes** |
| `AGENTS.md` | **Yes** |
| `docs/context/system-reverse-spec.md` | **No** — human body |
| `CLAUDE.md` | **No** — AGENTS.md + `.claude/agents` pointers only |
| `**/templates/**/*.md`, `**/*.template.md`, `**/*-template.md`, `**/*.stub.md` | **No** — copy-paste models; preserve placeholders and example prose |

## Mandate

1. Draft fully (evidence, tables, routing).
2. **Before save:** rewrite draft through this pass.
3. Write only the compressed result.
4. Do **not** announce the pass in the saved file (no "compressed by…" banners).

## Keep (load-bearing)

- Paths, skill names, slash commands, MCP server names
- Tables that route or constrain (stack, modules, priority 1–5, hard stops)
- `MUST` / `MUST NOT` / `FORBIDDEN` lines
- Confidence markers (`confirmed` / `inferred` / `ambiguous`)
- Fenced code / copy-paste commands when evidenced
- Sync markers (`<!-- harness-sync-managed: ... -->`, harness generators)
- Links to sibling artifacts instead of inlined bodies

## Cut (noise / duplicate)

- Filler, hedging, throat-clearing, pleasantries
- Articles and conjunctions when meaning stays unambiguous
- Sections that only restate another table in the same file
- Prose paragraphs when a table or one-liner carries the fact
- Human onboarding essays, "why this matters", tutorial tone
- Absolute machine paths; keep `{product_root}`-relative values
- Invented abbreviations (`cfg`/`impl`/`req`) — full technical words
- Causal arrows (`→`) used as prose glue (table columns OK)

## Intensity (ultra)

- One fact once.
- Fragments OK.
- Telegraphic bullets: `[thing] [constraint].`
- Prefer tables over paragraphs.
- English in saved artifacts unless the worker skill sets another output language (reverse-spec human body may follow conversation language; agent index stays dense either way).

## Per-artifact targets (soft → hard)

| Artifact | Soft target | Hard max |
| -------- | ----------- | -------- |
| `architecture-rules.md` | 80–200 | 250 |
| `brownfield-map.md` | ≤120 | ~180 |
| `system-reverse-spec.agent.md` | tables only; lean | no novel prose |
| `AGENTS.md` | 95–110 | 130 |

If over hard max after one pass: delete lowest-value section, replace with a link, repeat once.

## Self-check (before Write)

- [ ] Draft re-read after compress — no load-bearing path/skill/MUST lost
- [ ] No duplicate section that only echoes another table in the same file
- [ ] Line count within hard max (or linked overflow)
- [ ] Human-only files in the "No" table above were **not** caveman-rewritten
- [ ] Template MDs (`templates/`, `*.template.md`, `*-template.md`, `*.stub.md`) left uncompressed
