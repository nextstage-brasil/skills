# Reconnaissance checklist

Read-only scan before drafting `architecture-rules.md`. Check items in order; skip sections with no signals.

## 1. Harness and existing context

- [ ] `AGENTS.md` — agent workflow, skill paths, completion conventions
- [ ] `{harness_root}/rules/*.md` — list siblings; note what **not** to duplicate
- [ ] `.nextstage-harness/docs/` — harness-local notes
- [ ] `docs/context/` — stack-confirmed, gitlab-sync-config, integration docs
- [ ] `docs/specs/` — living functional specs (link, do not copy)
- [ ] Legacy: `.cursor/rules/*.mdc` only if `{harness_root}` is absent

## 2. Stack manifests

| Signal file | Reveals |
| ----------- | ------- |
| `composer.json` | PHP version, Laravel/Symfony, key packages |
| `package.json` | Node, React/Vue, scripts, test runners |
| `pyproject.toml` / `requirements.txt` | Python stack |
| `go.mod` / `Cargo.toml` | Go/Rust |
| `docker-compose.yml` | Services, container names, ports |
| `.env.example` | DB, cache, queue, URLs |
| `Makefile` / `justfile` | Canonical dev commands |

## 3. Layout and boundaries

- [ ] Monorepo: `apps/`, `packages/`, `backend/` + `frontend/` split
- [ ] Domain modules: `app/Modules/`, `src/Modules/`, `modules/`
- [ ] Generated/build output: `Generated/`, `.build/`, `auto/`, `dist/`, `vendor/`
- [ ] API surface: routes files, `public/api/`, OpenAPI specs
- [ ] Frontend entry: `src/`, `frontend/`, `view/`

## 4. Runtime patterns

- [ ] Single entry bootstrap (e.g. `SistemaLibrary`, `public/index.php`, `artisan`)
- [ ] Router strategy / middleware chain
- [ ] Auth model (session, Sanctum, API keys, tenant headers)
- [ ] Multitenancy resolution
- [ ] Queue and event handlers
- [ ] External integrations (names + boundary class/service)

## 5. Testing and CI

- [ ] Test directories and naming (`tests/`, `testes-cypress/`, `__tests__/`)
- [ ] PHPUnit/Pest/Jest/Vitest/Cypress config
- [ ] **Mandatory environment** (Docker container name, `app_test` vs host)
- [ ] `.gitlab-ci.yml` or GitHub Actions test jobs (copy exact commands when found)

## 6. Agent-relevant constraints

- [ ] Migration rules (raw SQL only, no Eloquent in migrations)
- [ ] Error logging pattern (central service vs `Log::`)
- [ ] i18n location
- [ ] Protected branches / work branch policy
- [ ] `.gitignore` or CI touch policies if documented in rules

## Output of this phase

Produce a short internal summary:

1. Detected stack (with file evidence)
2. Product root and layout sketch
3. Module list (max ~15 rows; group the rest as "other")
4. Forbidden/generated zones
5. Primary test command(s)
6. Sibling rules to link (not inline)
7. Open questions / `inferred` items for user checkpoint
