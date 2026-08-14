# Stack signal detection

Use manifests and folder names to classify the stack. **Never assume** a profile without evidence — several stacks can coexist (e.g. Laravel + React monorepo).

## PHP / Laravel family

| Signal | Likely stack |
| ------ | ------------ |
| `artisan`, `composer.json` with `laravel/framework` | Laravel |
| `app/Modules/`, `app/Generated/`, `.build.config.json` | Grogoo-style modular Laravel |
| `library/SistemaLibrary`, `src/controller/*Controller.class.php` | Legacy PHP + builder |
| `vendor/nextstage-brasil/ns-util` or `NsUtil\` imports | NsUtil consumer — link `nsutil-architecture-rules.md`, do not inline |
| `public/api/swoole.php` | Swoole runtime — note FPM vs Swoole split |

## JavaScript / TypeScript

| Signal | Likely stack |
| ------ | ------------ |
| `react` in `package.json` | React |
| `vue` in `package.json` | Vue |
| `next` in `package.json` | Next.js |
| `mobx`, `zustand`, `redux` | State library — one line in stack table |
| `cypress` in `tests-e2e/package.json` or legacy `testes-cypress/` / `frontend/cypress/` | Cypress E2E — prefer `tests-e2e/` at repo root |
| `vitest` / `jest` | Unit/integration frontend tests |

## Infrastructure

| Signal | Note in constitution |
| ------ | -------------------- |
| `docker-compose.yml` with `app`, `app_test` | Separate dev vs test containers — document test service name and commands (agents follow `AGENTS.md` for when/how to run) |
| `redis` service | Cache/queue; note facade vs direct client if enforced in code |
| `postgres` / `mysql` service | DB + port from compose or `.env.example` |
| `queue` / `worker` service | Queue worker must run for async features |

## Layout patterns

| Pattern | Notes |
| ------- | ----- |
| `apps/{slug}/backend` + `frontend` | Nested app folders; harness install dir = project root |
| `backend/` + `frontend/` at repo root | Common split |
| Single `src/` tree | Flat app |

Document inconsistency if `AGENTS.md` layout notes disagree with manifests.

## When to suggest sibling rules

Canonical: `.nextstage-harness/rules/<name>.md`. Cursor/Claude adapters are **generated** — never author `.cursor/rules/*.mdc`.

| Detection | Suggested sibling |
| --------- | ----------------- |
| Grogoo (`Generated/`, `.build.config.json`) | `grogoo-instructions` |
| NsUtil dependency | `nsutil-architecture-rules` |
| Laravel backend conventions | `backend-rules` |
| React/Tailwind frontend | `frontend-rules` |
| Pest/PHPUnit patterns | `backend-tests-rules` or `test-pest-rules` |
| Cypress | `e2e-tests-rules` |

Create siblings **only** via `add-rule` (sets `cursor.description` + `alwaysApply: false` by default):

```bash
npx @nextstage-brasil/harness add-rule nsutil-architecture-rules \
  --description "NsUtil consumer constraints — when editing code that depends on nextstage-brasil/ns-util"
```

Use `--always-apply` only when the sibling must load every session (rare; constitution stays `architecture-rules` with `alwaysApply: true`).

Then fill `.nextstage-harness/rules/<name>.md` body (no YAML frontmatter). Sync already ran from `add-rule`.

**Broken:** write `.md` / `.mdc` only, or put `alwaysApply` in the markdown header — sync strips canonical frontmatter; Cursor adapter ends up with no "when to apply" and no always-apply.

Offer to generate siblings only when user asks — this skill focuses on the root constitution.
