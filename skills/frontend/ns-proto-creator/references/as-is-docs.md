# AS-IS documentation

Playwright evidence → durable briefs under `docs/`. **Not** under version folder (`v1/`, `docs/versions/…` for this flow).

## What to write

Per in-scope screen or flow:

| Artifact | Purpose |
| -------- | ------- |
| Screen brief | Purpose, actors/roles, primary regions, entry/exit |
| Field inventory | Labels, controls, validation cues, empty/error copy when observed |
| Flow notes | Happy path + important branches (permissions, empty states) |
| Visual notes | Fonts, icon set cues, density, chrome vs content |

Concise markdown. Link screenshots under `docs/` (e.g. `docs/asis/`).

## Rules

- Evidence-based only — mark gaps; no invent fields or copy.
- Update existing briefs when evolving; no parallel trees.
- Language follows project documentation language.
- No Element\|How normative appearance tables here — that is `ns-proto-visual-guide` later.

## Exit criteria

Reader understands live product in scope without opening URL.
