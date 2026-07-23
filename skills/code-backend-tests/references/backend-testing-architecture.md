# Backend testing architecture summary

Consolidated from harness `backend-tests-rules.mdc` when present. Catalog fallback for PHPUnit execution.

## Backend test root

| Scenario | Root | Rule |
| -------- | ---- | ---- |
| **Monorepo** | `{product_root}/backend/` | PHPUnit lives inside the backend package |
| **Standalone API** | `{product_root}/` | When `phpunit.xml` is at repo root |
| **Brownfield** | Detected path | Use as-is; do not relocate `tests/` |

### Detection order

Check under `{product_root}` (and `backend/` when present):

1. `backend/phpunit.xml` (monorepo)
2. `phpunit.xml` at `{product_root}/`
3. `tests/Unit/` or `tests/Feature/` with `composer.json` declaring `phpunit/phpunit`

Record the directory containing `phpunit.xml` as **`{backend_root}`**. All paths below are relative to `{backend_root}` unless noted.

If backend code exists (`app/`, `composer.json`) but no `phpunit.xml` and no `tests/` → bootstrap (Phase 0).

## Bootstrap tree (minimal Laravel-style)

```
{backend_root}/
  phpunit.xml
  tests/
    TestCase.php
    Unit/
    Feature/
```

- `phpunit.xml`: Unit + Feature suites pointing at `tests/Unit` and `tests/Feature`
- `tests/TestCase.php`: extend project base test case when one exists; otherwise Laravel `Tests\TestCase`
- Do **not** add PHPUnit to a frontend or unrelated `package.json`
- Copy env/testing DB settings from an existing sibling product only when documented — otherwise leave placeholders and document in `architecture-rules.md`

After bootstrap, document the suite in `{product_root}/docs/context/stack-confirmed.md` or `architecture-rules.md` when those files exist.

## Directory layout (brownfield)

```
tests/
  Unit/
    Modules/{DomainName}/{Component}Test.php
  Feature/
    Modules/{DomainName}/{DomainName}ControllerTest.php
```

Follow module layout from `backend-rules.mdc` when present.

## PHPUnit run contract (mandatory)

All PHPUnit invocations — full suite, filtered class, or single test — **must** use:

```bash
vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error [filters]
```

| Flag | Purpose |
| ---- | ------- |
| `--testdox` | Readable per-test output for agents and humans |
| `--stop-on-failure` | Stop at first failing assertion |
| `--stop-on-error` | Stop at first PHP error/exception |

**Forbidden:** bare `phpunit`, `php artisan test` without equivalent flags when the project documents PHPUnit as the runner, or host-side execution.

### Docker only

- Run `docker ps` immediately before the first test command in a session
- Execute inside the project's documented **test** container (never host, never dev/app container unless documented)
- Resolve container and working directory from `architecture-rules.md`, `stack-confirmed.md`, or Compose docs — ask once if unclear

### Timeout (mandatory)

Wrap the entire docker + PHPUnit invocation with a **120-second** wall-clock limit:

```bash
timeout 120 docker exec -w {workdir} {test_container} vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error ...
```

| Outcome | Action |
| ------- | ------ |
| Exit before 120s | Normal — report pass/fail from PHPUnit output |
| `timeout` kills the process (exit 124) | Treat run as **dead/hung** — **abort**, do not retry silently |
| Hung run | Report blocker; suggest `code-investigator` if cause unclear |

On macOS hosts without GNU `timeout`, use `gtimeout 120` when available, or `perl -e 'alarm 120; exec @ARGV' -- ...` with the same 120s limit.

## Test types

| Component | Suite | Notes |
| --------- | ----- | ----- |
| Service, FormRequest, Model, Rule | Unit | Mocks only — no real I/O |
| Controller HTTP | Feature | RefreshDatabase, auth, cross-tenant P0 |

## Quality checklist

- No `sleep()` or arbitrary waits
- No production/dev database targets
- Factories for test data — no hardcoded IDs
- Cross-tenant and 401/403 cases on controllers when multitenancy applies
