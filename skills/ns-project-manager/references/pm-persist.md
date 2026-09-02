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
| PM execution handoff (version card) | `docs/versions/{version_san}/pm/execution-handoff.md` |

## Exception — spec-driven `execution-handoff.md` at version root

`docs/versions/{version_san}/execution-handoff.md` = spec-driven SDD artifact — **not** misplaced PM. Do **not** STOP, move, delete, or merge on that path. PM handoff persists only at `docs/versions/{version_san}/pm/execution-handoff.md` (`references/12-version-handoff.md`).

Misplaced STOP still applies to `execution-handoff.md` copies outside `pm/` that are **not** that exact version-root SDD path (e.g. wrong folder), and to all other PM basenames as today.

## Misplaced file — STOP gate (human must answer)

Before first write/overwrite for a given basename, **look for the same filename outside** `pm/` under `docs/versions/{version_san}/` (typical: version root). Also detect **both** a root copy and a `pm/` copy. **Skip this search** when basename is `execution-handoff.md` and the only outside-`pm/` hit is `docs/versions/{version_san}/execution-handoff.md` (SDD root — exception above).

If either case is true: **STOP. Gate. Do not continue persist.**

**Forbidden until the human answers this gate in this conversation** (explicit confirm or explicit decline of the proposed path action):

- write, overwrite, create, move, copy, delete, or merge any copy of that basename
- write a second copy at `pm/`
- keep writing to the wrong path
- treat `proceed`, `quick mode`, `assumptions`, `continue`, or silence as confirmation

**Gate message (human’s language), then end the turn:**

1. **Search references** in the repo (at least `docs/`, also `README*` and execution/handoff files). Match:
   - full path of the misplaced file
   - relative links (`../commercial-budget-costumer.md`, `./commercial-budget-internal.md`, markdown `[text](…filename…)`)
   - the **basename** when it uniquely identifies the artifact
2. State **from-path → to-path** (canonical `pm/` path).
3. List referencing files (path + how cited), or explicitly **no references found**.
4. If **both** root and `pm/` exist: propose keep `pm/`, update refs that still point at root, then remove the root copy after refs are clean. Do **not** merge contents. Never apply this remove-root step to spec-driven `docs/versions/{version_san}/execution-handoff.md`.
5. Ask one closed question: **confirm this path action** or **decline**. Do not persist in the same turn.

If the next human message is **not** an explicit confirm or decline of this action: **re-state the gate and STOP again.** Do not persist.

**On explicit confirm:**

- Create `pm/` if needed.
- Move (or, if both exist: keep `pm/`, then remove the root copy after refs are clean). Do not reset Sequência on the move itself. Never move or delete spec-driven `docs/versions/{version_san}/execution-handoff.md`.
- Update **every** reference found to the new path (relative links must still resolve).
- Re-search the same patterns; leftover hits = skill failure — fix before continuing.
- Then persist the new generation at the canonical path (`document-versioning.md` Sequência bump).

**On explicit decline:** do not write a duplicate at `pm/` and do not keep writing to the wrong path. Chat-only or wait for a new instruction. Not a persist success.

## Sequência (commercial budget)

Prefer the file already at the canonical `pm/` path. If only the misplaced file exists, use **its** Sequência after the approved move, then bump on regenerate.
