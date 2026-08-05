# Trigger router

Map natural-language triggers to **phase** and **worker skill path** (under `.agents/skills/`).

## Clarify

| Trigger phrases | Worker | Preconditions |
| --------------- | ------ | ------------- |
| vague scope, "dashboard", "notifications", "integrate with X" | `ns-sdd-clarify-requirements` | None |
| before first requirements for a version | `ns-sdd-clarify-requirements` | Skip if requirements.md already approved |

**Output:** enriched context in chat + optional updates to `docs/context/` — not `requirements.md`.

## Specify

| Trigger phrases | Worker | Output |
| --------------- | ------ | ------ |
| "write requirements", "spec for vX", "define version" | `ns-sdd-requirements-generator` | `docs/versions/{version_san}/requirements.md` |

## Consistency

| Trigger phrases | Worker | When |
| --------------- | ------ | ---- |
| "check requirements", "consistency", Large pipeline | `ns-sdd-analyze-consistency` | After requirements, before tasks |

**Output:** `docs/versions/{version_san}/consistency-report.md`

## Partition

| Trigger phrases | Worker | When |
| --------------- | ------ | ---- |
| "split version", "slices", "phased delivery", Large multi-team | `ns-sdd-version-partitioner` | Requirements exist; scope too big for one handoff |

**Output:** `version-roadmap.md`, `subversions/*/`

## Tasks

| Trigger phrases | Worker | Order |
| --------------- | ------ | ----- |
| "generate tasks", "task breakdown", Medium+ execute prep | `task-writer-agent` → `ns-sdd-task-generator` (**MUST** bridge when available — `../../ns-harness/references/subagent-dispatch.md`) | After requirements (+ consistency if Large) |
| after tasks exist | `ns-sdd-execution-handoff-generator` | Creates/updates `execution-handoff.md` |

## Execute

| Trigger phrases | Worker |
| --------------- | ------ |
| "implement", "build it", "run tasks" | See parent SKILL.md execute routing + `../../ns-harness/references/subagent-dispatch.md` (**MUST** `coder-agent` when available) |
| GitLab issue URL | `ns-execution-gitlab-issue` (if installed + MCP) |
| subversion / slice | `ns-execution-orchestrator` |
| handoff present | `ns-sdd-execution-handoff-generator` + `coder-agent` (**MUST** when available) / `ns-code-coder` / `ns-code-autonomous` |

## Close

| Trigger phrases | Worker | Order |
| --------------- | ------ | ----- |
| "review", "close version", post-implementation | `reviewer-agent` → `ns-code-reviewer` (**MUST** bridge when available) | First |
| "update living spec", "consolidate" | `ns-sdd-living-spec-consolidator` | After review passes |

## Quick (Small)

| Trigger phrases | Worker |
| --------------- | ------ |
| "quick fix", "just change", "hotfix", ≤3 files | `coder-agent` → `ns-code-coder` (**MUST** bridge when available) |

See `quick-mode.md` — skip PM chain.

## Out of scope (redirect)

| Trigger | Redirect |
| ------- | -------- |
| Bare "quick fix" / "just change X" without SDD context | `ns-code-coder` (entry priority 5) |
| "prepare project", "bootstrap", "brownfield map" | `/ns-harness-prepare` (manual) |
| "forecast", "RICE", project manager | `ns-project-manager` |
| "review this MR" only | `ns-code-reviewer` |
