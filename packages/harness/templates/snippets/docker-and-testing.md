<!-- Canonical snippet for harness CLI. Keep in sync with skills/nextstage-harness/references/docker-and-testing.md -->
## Docker and testing

Strict rules — no exceptions:

- **MUST NOT** restart, stop, recreate, or run `docker compose up` / `down` on any container without **asking the user first**.
- **MUST** run the test suite only inside the project's designated **test** container (never on the host, never in the app/dev container).
- **MUST** run `docker ps` immediately before executing tests and confirm the target container is the documented test service.
- Resolve the test container from `architecture-rules.md`, `docs/context/stack-confirmed.md`, or Compose/service docs. If unclear or undocumented, **ask once** — do not guess and do not run tests until confirmed.

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

Execution details and bootstrap: `code-backend-tests` skill.
