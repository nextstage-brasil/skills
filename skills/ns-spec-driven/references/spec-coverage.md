# Spec coverage ledger

Maps every mappable source section to Features / ACs / tasks. Unmapped mappable section without cited out-of-scope reason = **Blocker**.

Path: `docs/versions/{version_san}/sdd/spec-coverage.md`. Template: `templates/spec-coverage.template.md`.

## Schema (one row per section)

| Column | Meaning |
| ------ | ------- |
| Anchor | `S1`, `S3.1`, … |
| Class | From `source-registry.md` |
| Status | `mapped` \| `out-of-scope` \| `unmapped` \| `verified` |
| Feature / AC | `Feature NNN` / AC bullets, or `—` |
| Task | `task-NNN` or `—` |
| Reason | Required when `out-of-scope` (cite source sentence) |

`context` class may stay unmapped without Blocker if labeled `context` only.

## Algorithm

1. Inventory all anchors under `source/`.
2. For each **mappable** class (`api-contract`, `data-schema`, `ui-screen`, `business-rule`, `test-case`): status `mapped` with Feature+AC **or** `out-of-scope` with cited reason. Else `unmapped` = **Blocker**.
3. **`ui-screen`:** `mapped` only when copy is verbatim from `source/` **or** `reference-sources.md` has layout SSoT for that screen. Else `unmapped` = Blocker (D2 ledger).
4. After tasks: fill Task column. Cards without Source refs for their symbols fail `task-generator.md`.
5. After unit checkpoint / closure: `mapped` becomes `verified` when conformance evidence exists (`orchestrator.md`, `ns-reviewer`).

## Severity

| Finding | Level |
| ------- | ----- |
| Unclassified section | Blocker (`analyze-consistency.md`) |
| Mappable unmapped, no out-of-scope reason | Blocker |
| `ui-screen` mapped without verbatim copy or registered layout SSoT | Blocker |
| AC without **Source:** `Sx` | Blocker |
| Contract value in requirements/task ≠ source | Blocker |
| Ledger missing at closure when `source/` exists | Rejected (`ns-reviewer`) |
