<!-- Canonical snippet for installed skills. Keep in sync with packages/harness/templates/snippets/docker-and-testing.md -->
## Docker and testing

Strict — no exceptions:

- **MUST NOT** restart/stop/recreate or run `docker compose up` / `down` without **asking user first**.
- **MUST** run tests only in designated **test** container (never host, never app/dev).
- **MUST** `docker ps` immediately before tests; confirm documented test service.
- Resolve test container from `architecture-rules.md`, `docs/context/stack-confirmed.md`, or Compose docs. Unclear → **ask once** — no guess, no run until confirmed.

### PHPUnit (PHP backend)

When project uses PHPUnit (Laravel or plain PHP):

- **MUST** invoke: `vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error` (filters as needed).
- **MUST** wrap docker + PHPUnit with **120s** wall-clock (`timeout 120` Linux; `gtimeout 120` macOS).
- Timeout kill (e.g. exit 124) = **dead/hung** — **abort**, report; no silent retry.
- **MUST NOT** run `phpunit` / `vendor/bin/phpunit` / `phpunit.sh` on host.

```bash
timeout 120 docker exec -w {workdir} {test_container} \
  vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error
```

Details: `ns-backend-tests` skill.
