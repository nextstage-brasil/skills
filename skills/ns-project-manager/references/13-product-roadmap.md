# Product roadmap — consolidated multi-version doc (PM)

Living **product / project** roadmap across versions. **Not** spec-driven `version-roadmap.md` (subversion partition for one version).

## Distinct artifacts

| Artifact | Owner | Path (typical) |
|----------|-------|----------------|
| Product / project roadmap (this mode) | PM on-demand | `docs/roadmap.md` |
| Version roadmap (slices) | `ns-spec-driven` | `docs/versions/{version_san}/sdd/version-roadmap.md` |

Never write under `docs/<project-slug>/`, `sdd/`, or `pm/`. Never create `version-roadmap.md`.

## Router triggers

"product roadmap", "roadmap de produto", "roadmap do projeto", "consolidated roadmap", "roadmap consolidado", "versões entregues e planejadas", bare "roadmap" when meaning product/project plan. "icebox" / "backlog a avaliar" only with multi-version product context. Not SDD slice partition (`version-roadmap.md`).

## Persist path

`docs/roadmap.md` when persistence enabled (`references/11-artifact-persistence.md`). Fixed path — not under project-slug. Persistence declined ("skip docs"): chat only.

**Existing file — STOP gate:** if `docs/roadmap.md` already exists and is **not** this product/project template (missing `## 4. Versions`), do **not** overwrite. Show path + one line (old content vs new product/project roadmap). Ask: overwrite / write elsewhere / keep chat-only. End the turn. Resume write only after explicit human answer. Empty/missing file: write. File already matching this template: update in place.

**Legacy path:** if only `docs/<project-slug>/roadmap.md` exists, STOP — propose move to `docs/roadmap.md` (or keep legacy). No silent move/overwrite.

## Prerequisites / sources

Fill **only** from human input, existing docs, or tracker data the human (or MCP) provided. Never invent:

- people, roles, modules, objectives
- version ids, status, periods, dependencies
- backlog items or tracker links

Missing field → `—` or omit the bullet/row. Prefer omit empty §2 modules and empty §5 themes over placeholder fiction.

## Anti-hallucination (mandatory)

1. Every **§4** version row needs a **source** (tracker id, milestone, prior PM artifact, or explicit human statement).
2. Every **§3** dependency needs a source stating the prerequisite.
3. Every **§5** icebox item needs a tracker id **or** explicit human "candidate without version".
4. If sources are thin: draft vision + project definitions only, list gaps as open questions, stop before inventing §4/§5.

## Workflow

1. Confirm this is **product/project** roadmap (multi-version), not SDD version partition.
2. Load `assets/product-roadmap.template.md`.
3. Gather sources (chat, `docs/`, tracker list if MCP available and authorized). Do not invent IDs.
4. Fill project definitions then sections 1-5. `—` for unknown people/dates. Sort §4.1 and §4.2 rows: SemVer ascending; name-only versions after numbered, keep given order among name-only.
5. Set **Last updated** = date + time + author (ask author once if unknown — never invent a person). Prepend one **Update timeline** row (newest first): one-line summary of this edit.
6. Present compact summary (version counts in 4.1 / 4.2 / icebox themes).
7. Persist to `docs/roadmap.md` when persistence on — honor Existing file STOP gate above.
8. Gate: "Confirm product roadmap, or adjust versions / icebox before sharing?"

## Output

Filled markdown matching the template. Language matching applies (`SKILL.md`).

## Behavioral constraints

- Do not create `version-roadmap.md` or touch `sdd/`.
- §4.1 and §4.2: always SemVer ascending; name-only rows after SemVer rows (given order). Never sort by period, status, or RICE.
- Do not invent commercial numbers, FP, or sprint forecasts here — point to commercial-budget / delivery-schedule / Phase 5 when asked.
- Triple P85 dates stay in the delivery-schedule artifact — do not merge them into this file unless human asks.
- Close drafts with human-language equivalent of: "⚠️ Requires human review before treating as the official product roadmap."
