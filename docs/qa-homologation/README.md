# QA homologation contracts (Phase 0)

Documented contracts for planned catalog skill `ns-qa-homologation`. **No skill yet** — nothing loads or enforces these files.

| File | Contract |
| ---- | -------- |
| `profile-schema.md` | Consumer QA profile `docs/context/qa-profile.md` (YAML block) |
| `qa-ledger.schema.json` | Run ledger `qa-ledger.json` (JSON Schema 2020-12) |

Phase 1 moves both into `skills/ns-qa-homologation/`. Kept outside `skills/` until then — catalog validation requires every `skills/<name>/` to be a registered skill.

Related Phase 0 surfaces:

| Surface | Path |
| ------- | ---- |
| Acceptance tier (E2E/Docker exception) | `skills/ns-harness/references/acceptance-tier.md` (+ `packages/harness/templates/snippets/acceptance-tier.md`) |
| Status label names (single source) | `skills/ns-gitlab-board-sync/references/gitlab-sync-config.template.md` |
