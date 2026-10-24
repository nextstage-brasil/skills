<!-- Canonical snippet for harness CLI. Keep in sync with skills/ns-harness/references/docker-and-testing.md -->
## Docker and testing

Strict rules — no exceptions:

- **MUST NOT** restart, stop, recreate, or run `docker compose up` / `down` on any container without **asking the user first**.
- **MUST** run the test suite only inside the project's designated **test** container (never on the host, never in the app/dev container).
- **MUST** run `docker ps` immediately before executing tests and confirm the target container is the documented test service.
- Resolve the test container from `architecture-rules.md`, `docs/context/stack-confirmed.md`, or Compose/service docs. If unclear or undocumented, **ask once** — do not guess and do not run tests until confirmed.

### Test tiers

- **Default tier** (unit, integration, default `test` script, CI default, coder gate): deterministic. No network, no live third-party API, no real LLM. Use fixtures/fakes.
- **Live tier** (exception): only when behavior cannot be proven without real LLM or external service. All three must hold: (1) isolated behind a project-defined marker recorded in architecture-rules.md; (2) excluded from default test command, default CI, and ns-coder / ns-backend-tests run loop; (3) runs only on demand via explicit script/flag/env (project chooses name, e.g. test:live or RUN_LIVE_TESTS=1).
- **Live failures:** fix behavior or documented expectation — never skip, loosen assertion, or move out of live group to get green.
- **Secrets:** live tests read credentials from env or secret manager only.
- Agents never run the live tier unless the human asks in this run.

### PHPUnit (PHP backend)

When the project uses PHPUnit (Laravel or plain PHP):

- **MUST** invoke: `vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error` (add filters as needed).
- **MUST** wrap the full docker + PHPUnit command with a **120-second** wall-clock limit (`timeout 120` on Linux; `gtimeout 120` or equivalent on macOS).
- If the timeout kills the process (e.g. exit 124), treat the run as **dead/hung** — **abort** and report; do not retry silently.
- **MUST NOT** run `phpunit`, `vendor/bin/phpunit`, or `phpunit.sh` on the host.

Example:

```bash
timeout 120 docker exec -w {workdir} {test_container} \
  vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error
```

Execution details and bootstrap: `ns-backend-tests` skill.
