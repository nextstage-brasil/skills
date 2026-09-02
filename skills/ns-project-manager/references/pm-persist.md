# PM persist — version folder `pm/`

All **ns-project-manager** versioned deliverables (commercial budget, delivery schedule, and any other PM markdown/json for that version) live under:

```
docs/versions/{version_san}/pm/
```

Not beside SDD artifacts under `sdd/`. Create `pm/` if missing.

## Canonical names (examples)

| Artifact | Path |
|----------|------|
| Commercial budget (internal) | `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` |
| Commercial budget (client) | `docs/versions/{version_san}/pm/{version_san}-commercial-budget-costumer.md` |
| Triple delivery schedule | `docs/versions/{version_san}/pm/05-cronograma-tres-cenarios.md` |
| PERT configs | `docs/versions/{version_san}/pm/pert-config-p100.json` (and p85 / p50) |
| PM execution handoff (version card) | `docs/versions/{version_san}/pm/execution-handoff.md` |

## SDD subtree — excluded from misplaced search

Everything under `docs/versions/{version_san}/sdd/` = spec-driven SDD artifacts — **not** misplaced PM. Do **not** STOP, move, delete, or merge any file under `sdd/`. SDD execution handoff: `docs/versions/{version_san}/sdd/execution-handoff.md`. PM handoff persists only at `docs/versions/{version_san}/pm/execution-handoff.md` (`references/12-version-handoff.md`).

## Legacy SDD at version root — excluded from misplaced search

Classic SDD layout (pre-`sdd/` nest) may still leave artifacts at version root. **Never** STOP, move, delete, or merge these when the only outside-`pm/` hit is at version root:

| Basename / dir | Legacy path |
|----------------|-------------|
| `requirements.md` | `docs/versions/{version_san}/requirements.md` |
| `clarify-contract.md` | version root |
| `unknowns-register.md` | version root |
| `spec-coverage.md` | version root |
| `ui-contract.md` | version root |
| `delivery-units.md` | version root |
| `execution-handoff.md` | version root |
| `version-roadmap.md` | version root |
| `graph-spec.md` | version root |
| `execution-plan.md` | version root |
| `gitlab-issue-feature-map.md` | version root |
| `tasks/` | `docs/versions/{version_san}/tasks/` |
| `source/` | `docs/versions/{version_san}/source/` |
| `subversions/` | `docs/versions/{version_san}/subversions/` |

Nest migration (`artifact-layout.md` + `ns-spec-driven` → `session-continuity.md`) owns root → `sdd/` moves — not PM persist.

## Misplaced file — STOP gate (human must answer)

**Pre-check:** basename in **Legacy SDD at version root** table, or any hit under `docs/versions/{version_san}/sdd/` → skip gate (not misplaced PM).

Before first write/overwrite for a given basename, **look for the same filename outside** `pm/` under `docs/versions/{version_san}/` (typical: version root). Also detect **both** a root copy and a `pm/` copy. **Exclude entire `sdd/` subtree** and **exclude legacy SDD basenames at version root** (table above) — never propose moving SDD artifacts to `pm/`.

If either case is true: **STOP. Gate. Do not continue persist.**

**Forbidden until the human answers this gate in this conversation** (explicit confirm or explicit decline of the proposed path action):

- write, overwrite, create, move, copy, delete, or merge any copy of that basename
- write a second copy at `pm/`
- keep writing to the wrong path
- treat `proceed`, `quick mode`, `assumptions`, `continue`, or silence as confirmation

**Gate message (human's language), then end the turn:**

1. **Search references** in the repo (at least `docs/`, also `README*` and execution/handoff files). Match:
   - full path of the misplaced file
   - relative links (`../{version_san}-commercial-budget-costumer.md`, `./{version_san}-commercial-budget-internal.md`, markdown `[text](…filename…)`)
   - the **basename** when it uniquely identifies the artifact
2. State **from-path → to-path** (canonical `pm/` path).
3. List referencing files (path + how cited), or explicitly **no references found**.
4. If **both** root and `pm/` exist: propose keep `pm/`, update refs that still point at root, then remove the root copy after refs are clean. Do **not** merge contents. Never touch paths under `sdd/`.
5. Ask one closed question: **confirm this path action** or **decline**. Do not persist in the same turn.

If the next human message is **not** an explicit confirm or decline of this action: **re-state the gate and STOP again.** Do not persist.

**On explicit confirm:**

- Create `pm/` if needed.
- Move (or, if both exist: keep `pm/`, then remove the root copy after refs are clean). Do not reset Sequência on the move itself. Never touch `sdd/`.
- Update **every** reference found to the new path (relative links must still resolve).
- Re-search the same patterns; leftover hits = skill failure — fix before continuing.
- Then persist the new generation at the canonical path (`document-versioning.md` Sequência bump).

**On explicit decline:** do not write a duplicate at `pm/` and do not keep writing to the wrong path. Chat-only or wait for a new instruction. Not a persist success.

## Sequência (commercial budget)

Prefer the file already at the canonical `pm/` path. If only the misplaced file exists, use **its** Sequência after the approved move, then bump on regenerate.
