# Stack signal detection

Classify from manifests + folder names. **Never assume** profile without evidence — stacks can coexist (e.g. Laravel + React monorepo).

## PHP / Laravel family

| Signal | Likely stack |
| ------ | ------------ |
| `artisan`, `composer.json` with `laravel/framework` | Laravel |
| `app/Modules/`, `app/Generated/`, `.build.config.json` | Grogoo-style modular Laravel |
| `library/SistemaLibrary`, `src/controller/*Controller.class.php` | Legacy PHP + builder |
| `vendor/nextstage-brasil/ns-util` or `NsUtil\` imports | NsUtil — link `nsutil-architecture-rules.md`, do not inline |
| `public/api/swoole.php` | Swoole — note FPM vs Swoole split |

## JavaScript / TypeScript

| Signal | Likely stack |
| ------ | ------------ |
| `react` in `package.json` | React |
| `vue` in `package.json` | Vue |
| `next` in `package.json` | Next.js |
| `mobx`, `zustand`, `redux` | State lib — one stack-table line |
| `cypress` in `tests-e2e/package.json` or legacy `testes-cypress/` / `frontend/cypress/` | Cypress E2E — prefer `tests-e2e/` at root |
| `vitest` / `jest` | Frontend unit/integration |

## Infrastructure

| Signal | Note in constitution |
| ------ | -------------------- |
| `docker-compose.yml` with `app`, `app_test` | Separate dev vs test — document test service name + commands |
| `redis` service | Cache/queue; facade vs direct if enforced |
| `postgres` / `mysql` service | DB + port from compose or `.env.example` |
| `queue` / `worker` service | Worker must run for async features |

## Layout patterns

| Pattern | Notes |
| ------- | ----- |
| `apps/{slug}/backend` + `frontend` | Nested apps; harness install = project root |
| `backend/` + `frontend/` at root | Common split |
| Single `src/` tree | Flat app |

Document inconsistency if `AGENTS.md` layout notes disagree with manifests.

## Sibling rules

Canonical: `.nextstage-harness/rules/<name>.md`. Adapters **generated** — never author `.cursor/rules/*.mdc`.

| Detection | Suggested sibling |
| --------- | ----------------- |
| Grogoo (`Generated/`, `.build.config.json`) | `grogoo-instructions` |
| NsUtil dependency | `nsutil-architecture-rules` |
| Laravel backend conventions | `backend-rules` |
| React/Tailwind frontend | `frontend-rules` |
| Pest/PHPUnit patterns | `backend-tests-rules` or `test-pest-rules` |
| Cypress | `e2e-tests-rules` |

Create siblings **only** via `add-rule`:

```bash
npx @nextstage-brasil/harness add-rule nsutil-architecture-rules \
  --description "NsUtil consumer constraints — when editing code that depends on nextstage-brasil/ns-util"
```

`--always-apply` only if sibling must load every session (rare; constitution stays `architecture-rules` + `alwaysApply: true`).

Fill `.nextstage-harness/rules/<name>.md` body (no YAML frontmatter). Sync already ran from `add-rule`.

**Broken:** write `.md`/`.mdc` only, or put `alwaysApply` in markdown header — sync strips canonical frontmatter; Cursor adapter gets no apply mode.

Offer siblings only when user asks — this skill focuses on root constitution.
