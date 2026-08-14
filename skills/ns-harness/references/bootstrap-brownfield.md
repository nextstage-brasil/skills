# Bootstrap Brownfield

Architectural discovery before SDD planning.

Output **agent-dense** (tables, counts, gaps) — not essay. See `bootstrap-brownfield/agent-dense.md` + pre-save `./agent-artifact-compress.md`.

## Session boot

See `./session-boot.md`. Load `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent. Compare to canonical rules when present — advisory if missing. **Link** constitution stack; never copy into map.

## When to use

- "Analyze the existing project" / "brownfield bootstrap"
- First SDD on repo with code, no `requirements.md`
- Before `/ns-spec-driven` Specify on legacy code

## Workflow

### Step 1 — Structure detection

Document layout inconsistencies:

**Backend:** `composer.json`, `artisan`, `app/Modules/`, `docker-compose.yml`, `.env.example`

**Frontend:** `package.json`, `tsconfig.json`, `src/modules/`, `cypress/`, bundler config

**Layout:** monorepo `backend/` + `frontend/` vs single app

### Step 2 — Module mapping

- Backend: modules, controllers, models, migrations per module
- Frontend: pages, stores, services per module

### Step 3 — Rule adherence (optional)

Compare harness rules when present — module layout, multitenancy, frontend patterns, tests. Mark ✅ / ⚠️ / ❌. Stack-agnostic checks if no harness rules.

### Step 4 — Report

Draft `docs/context/brownfield-map.md` from `bootstrap-brownfield/brownfield-map.template.md` + `bootstrap-brownfield/agent-dense.md`.

- Tables / one-liners only.
- Stack = pointer to `architecture-rules.md` (+ optional one-line delta).
- Gaps = priority table; Next planning ≤3 bullets.

**Pre-save:** `./agent-artifact-compress.md` (caveman ultra), then Write.

### Step 5 — Present

Chat: 3–5 bullets (date, critical gaps, next skill). No map body paste.

## Critical rules

- **Read-only**
- Write only under `docs/context/`
- Pass `brownfield-map.md` to `/ns-spec-driven`
- Update existing map; no duplicate
- Never duplicate full stack from `architecture-rules.md`

## Related

| File | When |
| ---- | ---- |
| `architecture-rules-generator.md` | Constitution (stack/layout SoT) |
| `codebase-reverse-spec.md` | Business behavior (deeper) |
| `/ns-spec-driven` | Next — Specify via `references/requirements-generator.md` |
| `references/clarify-requirements.md` | Vague scope (via `/ns-spec-driven`) |
| `bootstrap-brownfield/brownfield-map.template.md` | Step 4 skeleton |
| `bootstrap-brownfield/agent-dense.md` | Writing constraints |
| `./agent-artifact-compress.md` | Pre-save (mandatory) |
