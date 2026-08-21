# PM persist — version folder `pm/`

All **ns-project-manager** versioned deliverables (commercial budget, delivery schedule, and any other PM markdown/json for that version) live under:

```
docs/versions/{version_san}/pm/
```

Not beside `requirements.md` / `tasks/` at the version root. Create `pm/` if missing.

## Canonical names (examples)

| Artifact | Path |
|----------|------|
| Commercial budget (internal) | `docs/versions/{version_san}/pm/commercial-budget-internal.md` |
| Commercial budget (client) | `docs/versions/{version_san}/pm/commercial-budget-costumer.md` |
| Triple delivery schedule | `docs/versions/{version_san}/pm/05-cronograma-tres-cenarios.md` |
| PERT configs | `docs/versions/{version_san}/pm/pert-config-p100.json` (and p85 / p50) |

## Misplaced file — propose, do not silent-move

Before first write/overwrite for a given basename, **look for the same filename outside** `pm/` under `docs/versions/{version_san}/` (typical: version root).

If a copy exists in the wrong place:

1. **Search references** in the repo (at least `docs/`, also `README*` and execution/handoff files). Match:
   - full path of the misplaced file
   - relative links (`../commercial-budget-costumer.md`, `./commercial-budget-internal.md`, markdown `[text](…filename…)`)
   - the **basename** when it uniquely identifies the artifact
2. **Stop and propose** in the human’s language: from-path → to-path, list of referencing files (path + how it is cited), or explicitly **no references found**.
3. **Wait** for confirm. Do not move, delete, or write a second copy at `pm/` until they agree.
4. On confirm:
   - Create `pm/` if needed.
   - Move the file to the canonical path (keep content; do not reset Sequência on the move itself).
   - Update **every** reference found to the new path (relative links must still resolve).
   - Re-search the same patterns; leftover hits = skill failure — fix before continuing.
5. Then persist the new generation at the canonical path (`document-versioning.md` Sequência bump).

If they **decline**: do not write a duplicate at `pm/` and do not keep writing to the wrong path. Chat-only or wait for a new instruction.

If **both** root and `pm/` exist: propose keeping `pm/`, updating refs that still point at root, then removing the root copy after refs are clean. Do not merge contents silently.

## Sequência (commercial budget)

Prefer the file already at the canonical `pm/` path. If only the misplaced file exists, use **its** Sequência after the approved move, then bump on regenerate.
