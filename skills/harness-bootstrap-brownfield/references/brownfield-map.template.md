# Brownfield map — {product_name}

**Date:** {YYYY-MM-DD}
**Audience:** agents (SDD / planning). Humans skim date + gaps only.

## Stack pointer

Do **not** restate the full stack here when `{harness_root}/rules/architecture-rules.md` exists.

| Source | Path |
| ------ | ---- |
| Constitution | `{harness_root}/rules/architecture-rules.md` |
| Stack delta (only if rules missing or stale) | {one-line backend / frontend / DB / cache / queue — or `n/a`} |

## Backend modules

| Module | Controllers | Models | Migrations | Tests | Notes |
| ------ | ----------- | ------ | ---------- | ----- | ----- |
| {name} | {n} | {n} | {n} | {n} | {optional} |

## Frontend modules

| Module | Pages | Stores | E2E | Notes |
| ------ | ----- | ------ | --- | ----- |
| {name} | {n} | {n} | {n} | {optional} |

## Rule adherence

Omit this section when no harness rules exist.

| Check | Status | Evidence |
| ----- | ------ | -------- |
| {rule or layout check} | ✅ / ⚠️ / ❌ | `{path}` or one short note |

## Gaps

Priority-ordered. One line each. No prose paragraphs.

| P | Gap |
| - | --- |
| 1 | {critical} |
| 2 | {medium} |
| 3 | {low} |

## Next planning

- {bullet — actionable for `pm-requirements-generator` / clarify}
- {bullet}
