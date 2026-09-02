# Source registry (Intake)

Persist human/external spec **verbatim**. Completeness by construction: every section classified before Specify.

## When

Boot / Intake: user pastes or points at contract, schema, narrative spec, API table, screen list, or dense markdown. Medium+ with that payload.

## Persist

1. Sanitize `{version_san}`. Create `docs/versions/{version_san}/sdd/source/`.
2. Write `{slug}.md` = **verbatim** copy of source (one file per distinct document). Never paraphrase into `source/`.
3. Insert heading anchors: `S1`, `S3.1`, `S10.4` matching original structure (keep original titles; add `{#S1}` / HTML comment if heading text must stay).
4. Classify **every** section:

| Class | Typical |
| ----- | ------- |
| `api-contract` | Endpoints, status codes, payloads |
| `data-schema` | Tables, types, nullability, FKs |
| `ui-screen` | Screens, elements, copy, handlers |
| `business-rule` | Transitions, permissions, calculations |
| `test-case` | Given/when/then, suites |
| `out-of-scope` | Explicit exclusions |
| `context` | Narrative, background, non-binding |

5. Index in `docs/context/reference-sources.md` (product-wide pointer + version path). Do not dump full source there.
6. Source cites prototype, screenshot folder, other repo, or other spec: **before Clarify**, add `reference-sources.md` rows: path, role (`ui-layout` / `screenshot` / `other-spec`), reachable yes/no. Cite without row = D2 open (`clarify-strict.md`).
7. Seed `spec-coverage.md` rows from classified sections (`spec-coverage.md` reference).

## Immutability

- **Never rewrite** files under `source/` after persist.
- **Never edit** `source/` after **Gate 1**.
- Downstream (`requirements.md`, tasks, `ui-contract.md`) **cite** `Sx` — do not replace source.

## Detection (Boot)

List `docs/versions/{version_san}/sdd/source/` first; else legacy `docs/versions/{version_san}/source/` if unmigrated (`artifact-layout.md` **Legacy path resolution**). Present: load `source-registry.md` + `spec-coverage.md`; Consistency **mandatory** when files exist (`analyze-consistency.md`).
