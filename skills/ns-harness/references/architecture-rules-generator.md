# Architecture Rules Generator

Produce **hot memory** for coding agents: always-loaded `.nextstage-harness/rules/architecture-rules.md` — repo structure + constraints agents must not violate.

**Not** business spec (`codebase-reverse-spec.md`) or SDD artifact (`bootstrap-brownfield.md`). **Constitution** — loaded every session, lean, machine consumption with explicit paths + do/don't rules.

## Design principles

1. **Agent-first** — paths, entry points, forbidden zones, test commands. Telegraphic tables/bullets.
2. **Lean** — **80–200 lines** (hard cap ~250). Depth in layer rules or `docs/`; this file routes.
3. **Evidence-based** — every rule traces to repo. Mark `inferred`; no invented stack.
4. **Load-bearing** — stale rules cause silent failures; omit over guess.
5. **Separation** — universal architecture here; file-type detail in sibling rules.

`./agent-artifact-compress.md` before every save; `architecture-rules/compression-guide.md` if still over budget.

## Session boot

`./session-boot.md` + `./rules-sync.md`. Output: `.nextstage-harness/rules/architecture-rules.md`.

Obey `AGENTS.md` + existing `.nextstage-harness/rules/*.md` before scanning — reuse + link siblings. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent.

## When to use

| Trigger | Action |
| ------- | ------ |
| New repo / first agent setup | **Generate** |
| Major stack or layout change | **Refresh** |
| `architecture-rules.md` missing but siblings exist | **Generate** + cross-reference |
| Stale rules / repeated agent mistakes | **Refresh** targeted sections |

## Workflow

### Step 1 — Anchor

Note `.nextstage-harness/`; obey `AGENTS.md`; read existing `architecture-rules.md`; list `.nextstage-harness/rules/*.md`. Gaps user mentioned; **create** vs **refresh**. No scope from user: confirm once — whole repo vs named subtree.

### Step 2 — Reconnaissance

`architecture-rules/reconnaissance-checklist.md` + `stack-signals.md`. Read-only.

Minimum: root manifests; directory tree (~2 levels); entry points; module/domain + generated/build dirs; test layout + run commands; `docs/`, `README.md`.

**Checkpoint (recommended):** Short recon map; user confirm before draft. Skip on autonomous run.

### Step 3 — Extract facts

| Category | Capture |
| -------- | ------- |
| **Scope** | Layout, specs + agent asset paths |
| **Stack** | Languages, frameworks, DB, cache, queue, local URLs/ports |
| **Layout** | Abbreviated tree, module boundaries |
| **Patterns** | API style, multitenancy, auth, module conventions, integrations |
| **Forbidden** | Generated dirs, migration constraints, secrets |
| **Dev & test** | Docker, **test container name**, copy-paste test commands (behavioral rules in `AGENTS.md`) |
| **Discipline** | Code/doc language vs chat, minimal diff — only if in repo rules or `AGENTS.md` |

Large subsystems: one line to layer rule; offer sibling in follow-up. Sibling: `npx @nextstage-brasil/harness add-rule <name> --description "…"` (default `alwaysApply: false`). Never hand-write `.cursor/rules/*.mdc` or omit manifest metadata — `./rules-sync.md`.

### Step 4 — Draft

`architecture-rules/template.md` skeleton. **No YAML frontmatter** in canonical — metadata in `manifest.json`.

- Tables + bullets over paragraphs.
- **MUST / MUST NOT** for breakage-preventing constraints; brief _why_ when non-obvious.
- **Key references** table: topic → path.
- English only.

**Pre-save:** `./agent-artifact-compress.md` (caveman ultra), then `compression-guide.md` if over budget.

### Step 5 — Write, sync, report

1. Write compressed `architecture-rules.md`.
2. `manifest.json`: `architecture-rules` with `cursor.alwaysApply: true`, `claude.paths: null`.
3. `npx @nextstage-brasil/harness sync` (or instruct user).
4. Don't modify application source unless asked.
5. Report 3–6 bullets: stack detected, line count, new/updated sections, missing siblings.

Prior file existed: note removed, merged, deferred.

## Refresh mode

Preserve hand-edited locale, GitLab MCP, protected branches unless recon proves wrong. Replace stack/layout/modules from evidence. Drop stale rules. `## Changelog` only if user asked.

## Quality bar

- [ ] `agent-artifact-compress.md` applied; no YAML frontmatter
- [ ] `manifest.json` `architecture-rules` `alwaysApply: true`
- [ ] ≤250 lines (ideally ≤200); stack rows verified
- [ ] Generated/forbidden paths listed; test command copy-pasteable
- [ ] Test container documented when separate from dev/host
- [ ] Sibling rules linked, not inlined; no business-domain rules (`docs/specs/`)
- [ ] `harness sync` run or instructed

## Related

`bootstrap-brownfield.md` | `codebase-reverse-spec.md` | `artifact-layout.md` | `session-boot.md`
