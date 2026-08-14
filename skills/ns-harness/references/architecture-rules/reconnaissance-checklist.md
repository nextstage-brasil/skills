# Reconnaissance checklist

Read-only scan before drafting `architecture-rules.md`. Order below; skip empty sections.

## 1. Harness + existing context

- [ ] `AGENTS.md` — workflow, skill paths, completion conventions
- [ ] `.nextstage-harness/rules/*.md` — siblings; note what **not** to duplicate
- [ ] `docs/context/`, `docs/specs/` — product docs when present
- [ ] `docs/context/` — stack-confirmed, gitlab-sync-config, integrations
- [ ] `docs/specs/` — living specs (link, do not copy)
- [ ] Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent

## 2. Stack manifests

| Signal file | Reveals |
| ----------- | ------- |
| `composer.json` | PHP version, Laravel/Symfony, key packages |
| `package.json` | Node, React/Vue, scripts, test runners |
| `pyproject.toml` / `requirements.txt` | Python |
| `go.mod` / `Cargo.toml` | Go/Rust |
| `docker-compose.yml` | Services, container names, ports |
| `.env.example` | DB, cache, queue, URLs |
| `Makefile` / `justfile` | Canonical dev commands |

## 3. Layout + boundaries

- [ ] Monorepo: `apps/`, `packages/`, `backend/` + `frontend/`
- [ ] Domain modules: `app/Modules/`, `src/Modules/`, `modules/`
- [ ] Generated/build: `Generated/`, `.build/`, `auto/`, `dist/`, `vendor/`
- [ ] API surface: routes, `public/api/`, OpenAPI
- [ ] Frontend entry: `src/`, `frontend/`, `view/`

## 4. Runtime patterns

- [ ] Single entry bootstrap (`SistemaLibrary`, `public/index.php`, `artisan`, …)
- [ ] Router / middleware chain
- [ ] Auth model (session, Sanctum, API keys, tenant headers)
- [ ] Multitenancy resolution
- [ ] Queue + event handlers
- [ ] External integrations (names + boundary)

## 5. Testing + CI

- [ ] Test dirs/naming (`tests/`, `tests-e2e/`, legacy `testes-cypress/` / `frontend/cypress/`)
- [ ] PHPUnit/Pest/Jest/Vitest/Cypress config
- [ ] **Test environment** — container/service (`app_test` vs `app`); document name + commands
- [ ] `.gitlab-ci.yml` / GitHub Actions — copy exact commands when found

## 6. Agent constraints

- [ ] Migration rules (raw SQL only, no Eloquent in migrations, …)
- [ ] Error logging pattern
- [ ] i18n location
- [ ] Protected branches / work branch policy
- [ ] `.gitignore` or CI touch policies if in rules

## Output

1. Detected stack (file evidence)
2. Repo layout sketch
3. Module list (max ~15; rest "other")
4. Forbidden/generated zones
5. Primary test command(s)
6. Sibling rules to link
7. Open questions / `inferred` for checkpoint
