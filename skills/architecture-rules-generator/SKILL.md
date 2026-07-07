---
name: architecture-rules-generator
description: Scan a codebase and generate or refresh a lean architecture-rules.mdc constitution for AI agents — stack, layout, patterns, constraints, and pointers to deeper rules. Use whenever the user asks to generate architecture rules, create .cursor/rules/architecture-rules.mdc, bootstrap agent context, codify project conventions, document stack and module layout for agents, or set up always-on project rules — even if they say "document how this repo works for the AI" or "create rules the agent reads every session". Do NOT use for business/functional specs (codebase-reverse-spec), SDD brownfield maps (bootstrap-brownfield), or ad-hoc single-topic Cursor rules without a full architecture pass.
depends:
  - nextstage-harness
---

# Architecture Rules Generator

Produce **hot memory** for coding agents: a single always-loaded `.cursor/rules/architecture-rules.mdc` that encodes how this repository is structured and which constraints agents must not violate.

This is **not** a business spec (`codebase-reverse-spec`) or an SDD planning artifact (`bootstrap-brownfield`). It is the **constitution** — loaded every session, kept lean, written for machine consumption with explicit paths and do/don't rules.

## Design principles

1. **Agent-first** — file paths, entry points, forbidden zones, and test commands. A developer skimming prose is not the audience.
2. **Lean by default** — target **80–200 lines** (hard cap ~250). Depth belongs in scoped `.mdc` files or `docs/`; this file routes to them.
3. **Evidence-based** — every rule must trace to something found in the repo. Mark `inferred` items; do not invent stack or patterns.
4. **Load-bearing** — agents trust this absolutely. Stale rules cause silent failures; prefer omission over guesswork.
5. **Separation** — universal architecture here; file-type or domain detail in sibling rules (`backend-rules.mdc`, `nsutil-architecture-rules.mdc`, etc.).

See `references/compression-guide.md` when the draft exceeds the line budget.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`.

| Output path | When |
|-------------|------|
| `{harness}/.cursor/rules/architecture-rules.mdc` | Default — repo has `.cursor/rules/` or `AGENTS.md` at repo root |
| `{product_root}/.cursor/rules/architecture-rules.mdc` | Monorepo product folder is the harness anchor |

Read `AGENTS.md` and existing `.cursor/rules/*.mdc` before scanning — reuse and link; do not duplicate sibling rules.

## When to use

| Trigger | Action |
|---------|--------|
| New repo / first agent setup | **Generate** initial constitution |
| Major stack or layout change | **Refresh** in place |
| `architecture-rules.mdc` missing but other rules exist | **Generate** and cross-reference siblings |
| User says rules are stale or agents keep making same mistake | **Refresh** targeted sections |

## Workflow

### Step 1 — Anchor and baseline

1. Resolve `{harness}` and `{product_root}`.
2. Read `AGENTS.md`, existing `architecture-rules.mdc`, and list `.cursor/rules/*.mdc`.
3. Note gaps the user mentioned (if any) and whether this is **create** or **refresh**.

If the user did not specify scope, confirm once: whole repo vs `{product_root}` subtree.

### Step 2 — Reconnaissance

Follow `references/reconnaissance-checklist.md` and `references/stack-signals.md`. Read-only — do not modify application code.

Minimum scan:

1. Root manifests (`package.json`, `composer.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `docker-compose.yml`, etc.).
2. Directory tree (~2 levels under `{product_root}`).
3. Entry points (HTTP routers, `index.php`, `main.ts`, CLI commands, workers).
4. Module/domain folders and **generated** or **build** directories (never-edit zones).
5. Test layout and how tests are run (scripts, Docker, CI snippets).
6. Existing docs under `docs/`, `.cursor/docs/`, `README.md`.

**Checkpoint (recommended):** Present a short recon map (stack, layout, modules, generated zones, test command) and ask the user to confirm or correct before drafting. Skip only on explicit autonomous run.

### Step 3 — Extract architecture facts

Turn evidence into agent-actionable rules:

| Category | What to capture |
|----------|-----------------|
| **Scope** | Product root, monorepo vs standalone, where specs and agent assets live |
| **Stack** | Languages, frameworks, DB, cache, queue, local URLs/ports when discoverable |
| **Layout** | Folder tree (abbreviated), module boundaries |
| **Patterns** | API style, multitenancy, auth, module conventions, integration boundaries |
| **Forbidden** | Generated dirs, migration constraints, secrets locations |
| **Dev & test** | Docker/containers, mandatory test environment, primary test commands |
| **Discipline** | Language for code/docs vs user chat, minimal diff, completion style — only if present in repo rules or `AGENTS.md` |

For large subsystems (e.g. NsUtil consumer, Grogoo modules), **do not inline** — add one line pointing to a dedicated `.mdc` and offer to generate that sibling in a follow-up.

### Step 4 — Draft the constitution

Use `references/architecture-rules.template.mdc` as the skeleton.

Frontmatter **must** include:

```yaml
---
description: <one line — what this repo is and when agents need it>
alwaysApply: true
---
```

Writing rules:

- Prefer tables and bullet lists over paragraphs.
- Use **MUST / MUST NOT** only for constraints that prevent real breakage; explain *why* in a few words when non-obvious.
- End with **Key references** — table mapping topic → file path (specs, sibling rules, `AGENTS.md`).
- English only in the output file.

Run the compression pass (`references/compression-guide.md`) before writing.

### Step 5 — Write and report

1. Write `{harness}/.cursor/rules/architecture-rules.mdc` (or `{product_root}/...`).
2. Do **not** modify application source unless the user explicitly asked.
3. Report briefly (3–6 bullets): what was detected, line count, new vs updated sections, suggested sibling rules still missing.

If a previous `architecture-rules.mdc` existed, mention what was removed, merged, or deferred to other files.

## Refresh mode

When updating an existing file:

1. Preserve stable sections the user may have hand-edited (communication locale, GitLab MCP server name, protected branches) unless recon proves them wrong.
2. Replace stack/layout/modules from current evidence.
3. Drop rules that no longer match the codebase; add a `## Changelog` comment block at the bottom only if the user asked for audit trail — otherwise omit.

## Quality bar (self-check before save)

- [ ] `alwaysApply: true` in frontmatter
- [ ] Line count ≤ 250 (ideally ≤ 200)
- [ ] Every stack row verified from manifests or config
- [ ] Generated/forbidden paths listed if they exist
- [ ] Test command is copy-pasteable when Docker/CI is detected
- [ ] No duplication of full content from sibling `.mdc` files — links only
- [ ] No business-domain rules (those belong in `docs/specs/`)

## Related skills

- `bootstrap-brownfield` — `brownfield-map.md` for SDD planning (broader, planning-oriented)
- `codebase-reverse-spec` — technology-agnostic **business** behavior
- `nextstage-harness` — artifact paths and gate conventions
