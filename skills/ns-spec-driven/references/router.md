# Trigger router

Map natural-language triggers to **phase** and **reference** (under `references/`).

## Intake

| Trigger phrases | Reference | Output |
| --------------- | ------ | ------ |
| pasted contract/schema, dense spec, "persist source" | `source-registry.md` | `docs/versions/{version_san}/sdd/source/{slug}.md`, `spec-coverage.md`, `docs/context/reference-sources.md` |

## Clarify

| Trigger phrases | Reference | Preconditions |
| --------------- | ------ | ------------- |
| vague scope, "dashboard", "notifications", "integrate with X" | `clarify-strict.md` via `clarify-requirements.md` | None |
| before first requirements for a version | `clarify-strict.md` via `clarify-requirements.md` | Skip if requirements.md already approved **and** no open critical unknowns |
| reopen clarification, Gate 0 fail, resume with open critical | `clarify-strict.md` | Do not Specify |
| coverage check, unmapped section | `spec-coverage.md` + `analyze-consistency.md` | `source/` exists |

**Output:** `clarify-contract.md` + `unknowns-register.md`. Not `requirements.md`.

## Specify

| Trigger phrases | Reference | Output |
| --------------- | ------ | ------ |
| "write requirements", "spec for vX", "define version" | `requirements-generator.md` | `docs/versions/{version_san}/sdd/requirements.md` (+ `ui-contract.md` when UI / `ui-screen`) |

## Consistency

| Trigger phrases | Reference | When |
| --------------- | ------ | ---- |
| "check requirements", "consistency", Large pipeline | `analyze-consistency.md` | After requirements, before tasks |

**Output:** Consistency status (`Approved` \| `Reproved`) appended to `requirements.md` — no `consistency-report.md`

## Partition

| Trigger phrases | Reference | When |
| --------------- | ------ | ---- |
| "split version", "slices", "phased delivery", Large multi-team | `version-partitioner.md` | Requirements exist; scope too big for one handoff |

**Output:** `docs/versions/{version_san}/sdd/version-roadmap.md`, `sdd/subversions/*/`

## Tasks

| Trigger phrases | Reference | Order |
| --------------- | ------ | ----- |
| "generate tasks", "task breakdown", Medium+ execute prep | `task-writer-agent` → `task-generator.md` (**MUST** bridge when available — `../../../ns-harness/references/subagent-dispatch.md`) | After requirements (+ consistency if Large) |
| after tasks exist | `execution-handoff.md` | Creates/updates `execution-handoff.md` |

## Execute

| Trigger phrases | Reference |
| --------------- | ------ |
| "implement", "build it", "run tasks" | See parent SKILL.md execute routing + `../../../ns-harness/references/subagent-dispatch.md` (**MUST** `coder-agent` when available) |
| GitLab issue URL | `ns-execution-gitlab-issue` (if installed + MCP) |
| subversion / slice | `orchestrator.md` |
| handoff present | `../../ns-coder/references/run-implementation.md` + `coder-agent` (**MUST** when available) / `ns-coder` / `ns-autonomous` |

## Close

| Trigger phrases | Worker | Order |
| --------------- | ------ | ----- |
| "review", "close version", post-implementation | `reviewer-agent` → `ns-reviewer` (**MUST** bridge when available) | First |
| "update living spec", "consolidate" | `ns-living-spec` | After `Approved` |

## Quick (Small)

| Trigger phrases | Worker |
| --------------- | ------ |
| "quick fix", "just change", "hotfix", ≤3 files | `coder-agent` → `ns-coder` (**MUST** bridge when available) |

See `quick-mode.md` — skip PM chain.

## Out of scope (redirect)

| Trigger | Redirect |
| ------- | -------- |
| Bare "quick fix" / "just change X" without SDD context | `ns-coder` (entry priority 5) |
| "prepare project", "bootstrap", "brownfield map" | `/ns-harness prepare` (manual) |
| "forecast", "RICE", project manager | `ns-project-manager` |
| "review this MR" only | `ns-reviewer` |
