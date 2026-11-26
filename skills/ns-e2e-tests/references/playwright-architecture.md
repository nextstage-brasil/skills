# Playwright architecture summary

Playwright counterpart of `e2e-architecture.md`. Scope: homologation calls only (`ns-qa-homologation`, `execution.runner: playwright`, no repo-local E2E skills). Root = profile `execution.e2e_root`; never bootstrap. E2E repo `AGENTS.md` / rules win on conflict.

## Root check

`{e2e_root}/playwright.config.*` readable → continue. Missing → stop, report (no scaffold).

## Layout (reuse existing; add only when absent)

| Concern | Location | Rule |
| ------- | -------- | ---- |
| Specs | config `testDir` (default `tests/`) | One flow per file; `*.spec.ts` (or repo convention) |
| Page objects | `pages/` (or repo equivalent) | Locators + actions; no assertions on business rules |
| Fixtures | `fixtures/` via `test.extend` | Auth, data setup/teardown, network mocks |
| Auth | setup project → `storageState` | Validate session before reuse; never log in per test via UI unless flow under test |

Specs: `test` / `test.describe`, page-object calls, web-first assertions. **No DOM logic in specs.**

## Selectors (hierarchy)

1. `getByRole` (+ accessible name) · `getByLabel` · `getByText` / `getByPlaceholder`
2. `getByTestId` (config `testIdAttribute` = repo test id attribute)
3. CSS / XPath — forbidden in specs (`raw-selector` lint)

Never invent test ids absent from app contract; missing → report gap.

## Waits + actions

- Web-first `expect(locator).toBeVisible()` / `toHaveText()`; `page.waitForResponse` for requests
- **Forbidden:** `page.waitForTimeout`, `{ force: true }`, `test.only` / `test.skip` / `test.fixme` left in code, `page.on('pageerror')` swallowing errors

## Data

- Unique run prefix per test data (`run_prefix` + run id from caller); create + delete own data via API in fixtures
- Never depend on data another spec created; tests order-independent (`fullyParallel` safe)
- Third-party calls stubbed (`page.route` in fixtures, not specs) unless live tier

## Run (homologation)

`npx playwright test <spec> --retries=0 --reporter=junit` with `PLAYWRIGHT_JUNIT_OUTPUT_NAME=<run_dir>/<dir>/<name>.xml` (caller gives path). Traces/videos/screenshots → caller `raw/`. One explicit run per invocation.

## Tags

Test title carries exact tokens `@S-n` + one `@AC-n` per covered AC (title string, so JUnit names carry them); coexist with `@smoke` / `@regression`; never rename existing tags.
