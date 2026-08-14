# Bootstrap Brownfield

Architectural discovery for existing products before SDD planning.

Output is **agent-dense** (tables, counts, gap list) — not a human essay. See `bootstrap-brownfield/agent-dense.md` and **pre-save** `./agent-artifact-compress.md`.

## Session boot

See `./session-boot.md`. Load rules from `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` is absent. Compare findings to canonical rules when present — checks are advisory if rules missing. **Do not copy the constitution stack into the map** — link it.

## When to use

- "Analyze the existing project" / "brownfield bootstrap"
- First SDD planning on repo with code but no `requirements.md`
- Before `/ns-spec-driven` Specify on legacy code

## Workflow

### Step 1 — Structure detection

Under the repo (document layout inconsistencies):

**Backend signals:** `composer.json`, `artisan`, modular `app/Modules/`, `docker-compose.yml`, `.env.example`

**Frontend signals:** `package.json`, `tsconfig.json`, `src/modules/`, `cypress/`, bundler config

**Layout:** monorepo `backend/` + `frontend/` vs single app

### Step 2 — Module mapping

List domains:

- Backend: modules, controllers, models, migrations per module
- Frontend: pages, stores, services per module

### Step 3 — Rule adherence (optional)

Compare to harness rules when they exist — backend module layout, multitenancy, frontend patterns, tests. Mark ✅ / ⚠️ / ❌ per row.

Use stack-agnostic checks when no harness rules.

### Step 4 — Report

Draft `docs/context/brownfield-map.md` from `bootstrap-brownfield/brownfield-map.template.md` and `bootstrap-brownfield/agent-dense.md`.

Writing rules:

- Tables / one-liners only — no overview paragraphs.
- Stack = pointer to `architecture-rules.md` (+ optional one-line delta).
- Gaps = priority table; Next planning ≤3 bullets.

**Pre-save (mandatory):** apply `./agent-artifact-compress.md` (caveman ultra), then write the compressed file.

### Step 5 — Present

Chat summary only (3–5 bullets: date, critical gaps, next skill). Do not paste the map body into chat.

## Critical rules

- **Read-only** — no code changes
- Report only under `docs/context/`
- Pass `brownfield-map.md` to `/ns-spec-driven` as context
- Update existing map rather than duplicate
- Never duplicate full stack from `architecture-rules.md`

## Related references

- `architecture-rules-generator.md` — constitution (stack/layout source of truth)
- `codebase-reverse-spec.md` — business behavior extraction (deeper than bootstrap)
- `/ns-spec-driven` — next step after bootstrap (Specify via `references/requirements-generator.md`)
- `references/clarify-requirements.md` — when scope still vague (via `/ns-spec-driven`)

## References

| File | When |
| ---- | ---- |
| `bootstrap-brownfield/brownfield-map.template.md` | Step 4 skeleton |
| `bootstrap-brownfield/agent-dense.md` | Writing constraints |
| `./agent-artifact-compress.md` | Pre-save compress (mandatory) |
