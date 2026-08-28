# Harness skill manifest contract

Every catalog skill registers with the harness via frontmatter fields in `SKILL.md` (or a separate `manifest.yaml`). This document defines the contract for `@nextstage-brasil/harness` **1.x**.

## Required fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `requires_harness` | semver range | Minimum harness major. Skills in this release require `>=1.0.0`. Harness `0.n` **rejects** these skills. |
| `depends` | string[] | Peer skills (Skills CLI format). Unchanged from pre-1.x; not replaced by this manifest. |

## Optional capability fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `provides` | string[] | Capabilities or artifacts this skill produces (e.g. `gate:requirements-consistency`, `artifact:docs/specs/requirements.md`). |
| `consumes` | string[] | Capabilities or artifacts expected before invocation. |

## Example

```yaml
---
name: ns-spec-driven
description: "(NS) Spec-driven delivery face …"
requires_harness: ">=1.0.0"
provides:
  - gate:requirements-consistency
  - artifact:docs/specs/requirements.md
  - artifact:docs/versions/*/execution-handoff.md
consumes:
  - artifact:docs/context/architecture-rules.md
depends:
  - ns-harness
  - ns-coder
  - ns-autonomous
  - ns-reviewer
  - ns-living-spec
---
```

## Rules

1. **`requires_harness`** uses semver of the **package** `@nextstage-brasil/harness`, not a parallel contract version.
2. **`provides` / `consumes`** are an additional layer for discovery and validation; they do not replace `depends`.
3. **Internal phases** of `ns-spec-driven` (clarify, specify, consistency, partition, tasks, handoff, orchestrator) do **not** have their own manifest. Their artifacts are `provides` of the face skill.
4. Harness `1.x` reads `requires_harness` at install time and refuses skills that require `>=1.0.0` when running `0.n`.

## Preset contract

Presets live in `presets/*.json` at the repository root. See [preset-schema.md](./preset-schema.md). The harness reads `presets/index.json` at runtime — never embeds preset lists in CLI source.
