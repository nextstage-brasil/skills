# Architecture Rules Generator

Produce **hot memory** for coding agents: a single always-loaded `.nextstage-harness/rules/architecture-rules.md` that encodes how this repository is structured and which constraints agents must not violate.

This is **not** a business spec (`codebase-reverse-spec.md`) or an SDD planning artifact (`bootstrap-brownfield.md`). It is the **constitution** — loaded every session, kept lean, written for machine consumption with explicit paths and do/don't rules.

## Design principles

1. **Agent-first** — file paths, entry points, forbidden zones, and test commands. Telegraphic tables/bullets; a developer skimming prose is not the audience.
2. **Lean by default** — target **80–200 lines** (hard cap ~250). Depth belongs in scoped layer rules or `docs/`; this file routes to them.
3. **Evidence-based** — every rule must trace to something found in the repo. Mark `inferred` items; do not invent stack or patterns.
4. **Load-bearing** — agents trust this absolutely. Stale rules cause silent failures; prefer omission over guesswork.
5. **Separation** — universal architecture here; file-type or domain detail in sibling rules (`backend-rules.md`, `frontend-rules.md`, etc.).

See `./agent-artifact-compress.md` before every save, then `architecture-rules/compression-guide.md` when the draft still exceeds the line budget.

## Session boot

See `./session-boot.md` and `./rules-sync.md`.

| Output path | When |
| ----------- | ---- |
| `.nextstage-harness/rules/architecture-rules.md` | Canonical constitution |

Obey `AGENTS.md` (already in context) and existing `.nextstage-harness/rules/*.md` before scanning — reuse and link; do not duplicate sibling rules. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` is absent.

## When to use

| Trigger                                                      | Action                                    |
| ------------------------------------------------------------ | ----------------------------------------- |
| New repo / first agent setup                                 | **Generate** initial constitution         |
| Major stack or layout change                                 | **Refresh** in place                      |
| `architecture-rules.md` missing but other rules exist        | **Generate** and cross-reference siblings |
| User says rules are stale or agents keep making same mistake | **Refresh** targeted sections             |

## Workflow

### Step 1 — Anchor and baseline

1. Note whether `.nextstage-harness/` exists.
2. Obey `AGENTS.md` (in context); read existing `architecture-rules.md`; list `.nextstage-harness/rules/*.md`.
3. Note gaps the user mentioned (if any) and whether this is **create** or **refresh**.

If the user did not specify scope, confirm once: whole repo vs a named subtree.

### Step 2 — Reconnaissance

Follow `architecture-rules/reconnaissance-checklist.md` and `architecture-rules/stack-signals.md`. Read-only — do not modify application code.

Minimum scan:

1. Root manifests (`package.json`, `composer.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `docker-compose.yml`, etc.).
2. Directory tree (~2 levels under the repo root).
3. Entry points (HTTP routers, `index.php`, `main.ts`, CLI commands, workers).
4. Module/domain folders and **generated** or **build** directories (never-edit zones).
5. Test layout and how tests are run (scripts, Docker, CI snippets).
6. Existing docs under `docs/`, `README.md`.

**Checkpoint (recommended):** Present a short recon map (stack, layout, modules, generated zones, test command) and ask the user to confirm or correct before drafting. Skip only on explicit autonomous run.

### Step 3 — Extract architecture facts

Turn evidence into agent-actionable rules:

| Category       | What to capture                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Scope**      | Repo layout, where specs and agent assets live                                              |
| **Stack**      | Languages, frameworks, DB, cache, queue, local URLs/ports when discoverable                                          |
| **Layout**     | Folder tree (abbreviated), module boundaries                                                                         |
| **Patterns**   | API style, multitenancy, auth, module conventions, integration boundaries                                            |
| **Forbidden**  | Generated dirs, migration constraints, secrets locations                                                             |
| **Dev & test** | Docker services, **test container name**, copy-pasteable test commands (behavioral rules stay in `AGENTS.md`) |
| **Discipline** | Language for code/docs vs user chat, minimal diff, completion style — only if present in repo rules or `AGENTS.md`   |

For large subsystems, **do not inline** — add one line pointing to a dedicated layer rule and offer to generate that sibling in a follow-up. Sibling creation: `npx @nextstage-brasil/harness add-rule <name> --description "…"` (default `alwaysApply: false`). Never hand-write `.cursor/rules/*.mdc` or omit `cursor.description` / apply mode in `manifest.json` — see `./rules-sync.md`.

### Step 4 — Draft the constitution

Use `architecture-rules/template.md` as the skeleton.

**No YAML frontmatter** in the canonical file — adapter metadata lives in `.nextstage-harness/manifest.json`.

Writing rules:

- Prefer tables and bullet lists over paragraphs.
- Use **MUST / MUST NOT** only for constraints that prevent real breakage; explain _why_ in a few words when non-obvious.
- End with **Key references** — table mapping topic → file path (specs, sibling rules, `AGENTS.md`).
- English only in the output file.

**Pre-save (mandatory):** apply `./agent-artifact-compress.md` (caveman ultra), then `architecture-rules/compression-guide.md` if still over budget. Write only the compressed draft.

### Step 5 — Write, sync, and report

1. Write `.nextstage-harness/rules/architecture-rules.md` (or `.nextstage-harness/rules/...`) — compressed agent hot memory only.
2. Ensure `architecture-rules` exists in `.nextstage-harness/manifest.json` with `cursor.alwaysApply: true` and `claude.paths: null`.
3. Run `npx @nextstage-brasil/harness sync` (or instruct the user to run it) to regenerate adapters.
4. Do **not** modify application source unless the user explicitly asked.
5. Report briefly (3–6 bullets): what was detected, line count, new vs updated sections, suggested sibling rules still missing.

If a previous `architecture-rules.md` existed, mention what was removed, merged, or deferred to other files.

## Refresh mode

When updating an existing file:

1. Preserve stable sections the user may have hand-edited (communication locale, GitLab MCP server name, protected branches) unless recon proves them wrong.
2. Replace stack/layout/modules from current evidence.
3. Drop rules that no longer match the codebase; add a `## Changelog` comment block at the bottom only if the user asked for audit trail — otherwise omit.

## Quality bar (self-check before save)

- [ ] `agent-artifact-compress.md` applied (caveman ultra; no essay prose)
- [ ] Canonical file has no YAML frontmatter
- [ ] `manifest.json` has `architecture-rules` with `alwaysApply: true`
- [ ] Line count ≤ 250 (ideally ≤ 200)
- [ ] Every stack row verified from manifests or config
- [ ] Generated/forbidden paths listed if they exist
- [ ] Test command is copy-pasteable when Docker/CI is detected
- [ ] When a separate test container/service exists, constitution documents the test service name and commands (not dev container or host)
- [ ] No duplication of full content from sibling rules — links only
- [ ] No business-domain rules (those belong in `docs/specs/`)
- [ ] `harness sync` run or user instructed to run it

## Related references

- `bootstrap-brownfield.md` — `brownfield-map.md` for SDD planning (broader, planning-oriented)
- `codebase-reverse-spec.md` — technology-agnostic **business** behavior
- `artifact-layout.md` / `session-boot.md` — paths and boot
