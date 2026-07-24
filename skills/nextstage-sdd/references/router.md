# Trigger router

Map natural-language triggers to **phase** and **worker skill path** (under `.agents/skills/`).

## Clarify

| Trigger phrases | Worker | Preconditions |
| --------------- | ------ | ------------- |
| vague scope, "dashboard", "notifications", "integrate with X" | `pm-clarify-requirements` | None |
| before first requirements for a version | `pm-clarify-requirements` | Skip if requirements.md already approved |

**Output:** enriched context in chat + optional updates to `docs/context/` — not `requirements.md`.

## Specify

| Trigger phrases | Worker | Output |
| --------------- | ------ | ------ |
| "write requirements", "spec for vX", "define version" | `pm-requirements-generator` | `docs/versions/{version_san}/requirements.md` |

## Consistency

| Trigger phrases | Worker | When |
| --------------- | ------ | ---- |
| "check requirements", "consistency", Large pipeline | `pm-analyze-consistency` | After requirements, before tasks |

**Output:** `docs/versions/{version_san}/consistency-report.md`

## Partition

| Trigger phrases | Worker | When |
| --------------- | ------ | ---- |
| "split version", "slices", "phased delivery", Large multi-team | `pm-version-partitioner` | Requirements exist; scope too big for one handoff |

**Output:** `version-roadmap.md`, `subversions/*/`

## Tasks

| Trigger phrases | Worker | Order |
| --------------- | ------ | ----- |
| "generate tasks", "task breakdown", Medium+ execute prep | `pm-task-generator` | After requirements (+ consistency if Large) |
| after tasks exist | `execution-handoff-generator` | Creates/updates `execution-handoff.md` |

## Execute

| Trigger phrases | Worker |
| --------------- | ------ |
| "implement", "build it", "run tasks" | See parent SKILL.md execute routing |
| GitLab issue URL | `execution-gitlab-issue` (if installed + MCP) |
| subversion / slice | `execution-orchestrator` |
| handoff present | `execution-handoff-generator` references + `code-coder` / `code-autonomous` |

## Close

| Trigger phrases | Worker | Order |
| --------------- | ------ | ----- |
| "review", "close version", post-implementation | `code-reviewer` | First |
| "update living spec", "consolidate" | `pm-living-spec-consolidator` | After review passes |

## Quick (Small)

| Trigger phrases | Worker |
| --------------- | ------ |
| "quick fix", "just change", "hotfix", ≤3 files | `code-coder` |

See `quick-mode.md` — skip PM chain.

## Out of scope (redirect)

| Trigger | Redirect |
| ------- | -------- |
| "prepare project", "bootstrap", "brownfield map" | `/harness-prepare` (manual) |
| "forecast", "RICE", PM copilot | `pm-requirements-copilot` |
| "review this MR" only | `code-reviewer` |
