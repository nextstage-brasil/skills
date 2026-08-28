# Analyze Consistency

Pre-execution: plan vs plan before coding.

## Session boot

`../../../ns-harness/references/session-boot.md`. Load `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent.

## When to use

- After Gate 2 (`scope_confirmed`)
- User say "analyze requirements" or "check consistency"
- After manual `requirements.md` edits

## Prerequisites

- `docs/versions/{version_san}/requirements.md` exists
- When `source/` exists: `spec-coverage.md` present; run **Source coverage** group

## Workflow

### Step 1 — Index requirements

Read `requirements.md`. Index:

- Main objective
- Features (title, precedence, acceptance criteria)
- NFRs
- Declared stack

### Step 2 — Run checks

Classify each: ✅ OK | ⚠️ Warning | ❌ Blocker

**Feature integrity**

| Check | Failure level |
| ----- | ------------- |
| Every feature has title, description, acceptance criteria | ❌ Blocker |
| At least 2 acceptance criteria per feature | ⚠️ Warning |
| No circular precedence | ❌ Blocker |
| At least one root feature (no precedence) | ❌ Blocker |
| Frontend features mention test ids when E2E expected | ⚠️ Warning |

**Test coverage**

| Check | Failure level |
| ----- | ------------- |
| Backend features include unit test criteria | ⚠️ Warning |
| UI features include E2E criteria | ⚠️ Warning |
| Infra before domain on greenfield | ⚠️ Warning |

**Data model**

| Check | Failure level |
| ----- | ------------- |
| Clear "Data model and APIs" section | ❌ Blocker |
| All entities in features listed in data model | ❌ Blocker |
| FK creation order respected | ❌ Blocker |
| API endpoints for frontend consumption declared | ❌ Blocker |

**Alignment**

| Check | Failure level |
| ----- | ------------- |
| Features support stated objective | ⚠️ Warning |
| Out-of-scope features present | ⚠️ Warning |

**Source coverage** (mandatory when `docs/versions/{version_san}/source/` exists)

| Check | Failure level |
| ----- | ------------- |
| Every section classified (`source-registry.md`) | ❌ Blocker |
| Every AC has **Source:** `Sx` (or documented n/a) | ❌ Blocker |
| Contract value in requirements = source (no paraphrase drift) | ❌ Blocker |
| Mappable section mapped or out-of-scope with cited reason (`spec-coverage.md`) | ❌ Blocker |
| `ui-screen` `mapped` without verbatim copy or registered layout SSoT (`spec-coverage.md`) | ❌ Blocker |

**D1 rescan** (`requirements.md` **contract tables only** — limits, timeouts, errors, NFRs, payload constants. **Not** narrative size/volume asides. **Not** `task-*`.)

| Check | Failure level |
| ----- | ------------- |
| Token `TBD`, `impl.`, `to be defined`, numeric **range in a constant cell**, table limit adjectives (`short`, `generic`) with no matching `## Assumed premises` row | ❌ Blocker |
| Leftover D3 (two sides recorded, no resolution or premise) in requirements | ❌ Blocker |

Do **not** scan `task-*` here. Card D1 = `task-generator.md`.

Apply stack-specific checks from harness rules when present (Laravel/React optional).

### Step 3 — Write status into requirements.md

**Do not** create `consistency-report.md`.

Append (or replace trailing `## Consistency` block) at end of `requirements.md`:

```markdown
## Consistency

**Status:** Approved | Reproved
**Date:** {date}

## Warnings

{Omit this heading when there are no warnings.}
- {warning}

## Recommendations

{Omit this heading when there are no recommendations.}
- {recommendation}
```

Rules:

- **Any ❌ Blocker** then `Status: Reproved`
- **Zero blockers** then `Status: Approved` (warnings/recommendations OK)
- **Warnings** only when ≥1 ⚠️
- **Recommendations** only when ≥1 optional improvement
- Re-run: replace prior `## Consistency` block — no duplicate

### Step 4 — Proceed decision

- **Reproved:** Chat list blockers brief, **stop** — no task generation. User fix requirements, then re-run.
- **Approved with warnings:** Inform; ask fix now or proceed; user decide. Gate 3 still required before any `task-*.md`.
- **Approved no warnings:** Inform consistency clean. Still run Gate 3 (`execution_confirmed`) before writing tasks — never skip.

## Critical rules

- Edit `requirements.md` **only** for trailing Consistency block
- Blockers block task generation without fix or explicit waiver
- Requirements missing then redirect Gate 1 / `requirements-generator.md`
- Never write `consistency-report.md`

## Integration

Gate 2 then `analyze-consistency`. **Approved:** `task-generator`. **Reproved:** stop; fix requirements.

Post-implementation: `ns-reviewer` validates requirements × code — complementary, not substitute.
