<!-- Canonical snippet for harness CLI. Keep in sync with skills/nextstage-harness/references/docker-and-testing.md -->
## Docker and testing

Strict rules — no exceptions:

- **MUST NOT** restart, stop, recreate, or run `docker compose up` / `down` on any container without **asking the user first**.
- **MUST** run the test suite only inside the project's designated **test** container (never on the host, never in the app/dev container).
- **MUST** run `docker ps` immediately before executing tests and confirm the target container is the documented test service.
- Resolve the test container from `architecture-rules.md`, `docs/context/stack-confirmed.md`, or Compose/service docs. If unclear or undocumented, **ask once** — do not guess and do not run tests until confirmed.
