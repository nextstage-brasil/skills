# Laravel + React stack profile

Stack confirmed Laravel backend + React/TypeScript frontend (optional monorepo `backend/` + `frontend/`).

Load harness rules when present: `backend-rules.mdc`, `frontend-rules.mdc`, `architecture-rules.mdc`, `i18n-rules.mdc`, `e2e-tests-rules.mdc`.

## Greenfield setup order

1. Docker / compose monorepo (if applicable)
2. PostgreSQL + Redis + queue
3. Backend modules (DDD layout under `app/Modules/` when rule exists)
4. Frontend shell + auth
5. E2E + PHPUnit strategy

## Data model

- Laravel conventions: plural English table names, `snake_case` columns
- Document Sanctum or project auth pattern
- `company_id` / tenant scoping when multitenancy applies

## Frontend criteria

- CRUD: list + form patterns per frontend rules when present
- i18n: all visible strings via translation keys
- `data-testid` contract for interactive elements when E2E planned
- Navigation: route registry + breadcrumbs when applicable

## uses_grogoo

Reference Grogoo pipeline only when `uses_grogoo: true` in stack context. Default `false`: Sanctum, manual modules, no Grogoo-specific commands in requirements.

## Docker / frontend proxy

Frontend in container: relative API base path, proxy target to host gateway, CORS/Sanctum domains — per `infra-rules.mdc` when harness provides it.
