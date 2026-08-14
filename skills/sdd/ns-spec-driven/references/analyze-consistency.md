# Analyze Consistency

Pre-execution validation: plan vs plan before coding.

## Session boot

See `../../../ns-harness/references/session-boot.md`. Load rules from `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` is absent.

## When to use

- After Gate 2 (`scope_confirmed`)
- User asks "analyze requirements" or "check consistency"
- After manual `requirements.md` edits

## Prerequisites

- `docs/versions/{version_san}/requirements.md` exists

## Workflow

### Step 1 — Index requirements

Read `requirements.md` and index:

- Main objective
- Features (title, precedence, acceptance criteria)
- NFRs
- Declared stack

### Step 2 — Run checks

Classify each as ✅ OK | ⚠️ Warning | ❌ Blocker:

**Feature integrity**

| Check                                                     | Failure level |
| --------------------------------------------------------- | ------------- |
| Every feature has title, description, acceptance criteria | ❌ Blocker    |
| At least 2 acceptance criteria per feature                | ⚠️ Warning    |
| No circular precedence                                    | ❌ Blocker    |
| At least one root feature (no precedence)                 | ❌ Blocker    |
| Frontend features mention test ids when E2E expected      | ⚠️ Warning    |

**Test coverage**

| Check                                       | Failure level |
| ------------------------------------------- | ------------- |
| Backend features include unit test criteria | ⚠️ Warning    |
| UI features include E2E criteria            | ⚠️ Warning    |
| Infra before domain on greenfield           | ⚠️ Warning    |

**Data model**

| Check                                           | Failure level |
| ----------------------------------------------- | ------------- |
| Clear "Data model and APIs" section             | ❌ Blocker    |
| All entities in features listed in data model   | ❌ Blocker    |
| FK creation order respected                     | ❌ Blocker    |
| API endpoints for frontend consumption declared | ❌ Blocker    |

**Alignment**

| Check                             | Failure level |
| --------------------------------- | ------------- |
| Features support stated objective | ⚠️ Warning    |
| Out-of-scope features present     | ⚠️ Warning    |

Apply stack-specific checks from harness rules when they exist (Laravel/React checks are optional).

### Step 3 — Write status into requirements.md

**Do not** create `consistency-report.md`.

Append (or replace an existing trailing `## Consistency` block) at the end of
`requirements.md`:

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

- **Any ❌ Blocker** → `Status: Reproved`
- **Zero blockers** → `Status: Approved` (warnings/recommendations still allowed)
- Include **Warnings** only when at least one ⚠️ exists
- Include **Recommendations** only when there is at least one optional improvement
- On re-run, replace the previous `## Consistency` block — do not duplicate

### Step 4 — Proceed decision

- **Reproved:** Tell the user in chat (list blockers briefly), **stop** — do not
  proceed to task generation. Ask them to fix requirements, then re-run.
- **Approved with warnings:** Inform; ask fix now or proceed; user decides.
- **Approved with no warnings:** Inform auto-proceed to task generation;
  `execution_confirmed` implicit (skip Gate 3).

## Critical rules

- Edit `requirements.md` **only** to update the trailing Consistency block
- Blockers prevent task generation without fix or explicit waiver
- If requirements missing → redirect to Gate 1 / `requirements-generator.md`
- Never write `consistency-report.md`

## Integration

```
Gate 2 → analyze-consistency → [Approved] → task-generator
                            → [Reproved] → stop; fix requirements
```

Post-implementation: `ns-reviewer` validates requirements × code — complementary, not a substitute.
