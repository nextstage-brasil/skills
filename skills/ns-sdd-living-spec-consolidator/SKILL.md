---
name: ns-sdd-living-spec-consolidator
description: (NS) Consolidate delivered deltas into living domain specs under docs/specs/ — INDEX.md and per-domain markdown. Use after version closure when requirements, Approved code review, and execution-handoff exist; or in ad-hoc mode when ns-code-coder (or the human) passes an Approved behavioral diff and docs/specs/ already exists. Updates specs incrementally; never overwrite unrelated content. Do NOT run before code review approval.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.2"
depends:
  - ns-harness
---

# Living Spec Consolidator

Maintain `{specs_root}/` as the current functional truth of the product.

Default `{specs_root}` = `{product_root}/docs/specs/`.

## Harness discovery

See `../ns-harness/references/harness-discovery.md` and `../ns-harness/references/artifact-layout.md`.

## Modes

| Mode | When | Source of truth |
| ---- | ---- | --------------- |
| **Version** (default) | Version closure after delivery | `docs/versions/{version_san}/` artifacts |
| **Ad-hoc** | Invoked by `ns-code-coder` (or human) after `Code Review: Approved` | `{task_description}` + approved `git diff` |

Detect **Ad-hoc** when the invoker passes mode `ad-hoc` (or equivalent: no `{version_san}`, plus task description and approved diff). Otherwise use **Version**.

## When invoked

- After version closure workflow (post `Code Review: Approved`) — **Version** mode
- After ad-hoc coding with review **Approved** and existing `{specs_root}/` — **Ad-hoc** mode
- **Not** before code review approval (`Approved` verdict)

## Prerequisites

### Version mode

- `{product_root}/docs/versions/{version_san}/requirements.md`
- Invoker reports `Code Review: Approved` (score ≥ 9) — no `code-review-report.md` required
- `{product_root}/docs/versions/{version_san}/execution-handoff.md` (tasks completed)

### Ad-hoc mode

- `{specs_root}/` already exists (do **not** create the tree from scratch in ad-hoc)
- Invoker reports `Code Review: Approved` (score ≥ 9)
- `{task_description}` and the approved working-tree diff (behavioral change)
- **Skip** (no writes) when the diff is non-behavioral: cosmetic, rename-only, pure refactor with no API/schema/UX/domain behavior change — report skipped

## Workflow

Shared steps 1–4 below apply to both modes. Changelog label differs by mode.

### 1. Identify affected domains

Map features to canonical domains (examples):

| Feature area      | Domain file        |
| ----------------- | ------------------ |
| Auth, login, RBAC | `auth.md`          |
| Users, profiles   | `users.md`         |
| Billing           | `billing.md`       |
| Notifications     | `notifications.md` |
| Reports           | `reports.md`       |
| Integrations      | `integrations.md`  |
| Agent / graph     | `agent.md`         |

Naming: English, kebab-case, singular (`user-profile.md`). Multi-domain features update multiple specs.

**Ad-hoc:** map from `{task_description}` + diff only — do not invent domains unrelated to the change.

### 2. Per domain

**If `{specs_root}/{domain}.md` missing:** create from `references/domain-spec.template.md`

**If exists:** read entirely; **append or update** — never blind overwrite

For each relevant feature:

- Add or update `### Requirement:` blocks (SHALL + scenarios)
- Update `## Data model` and `## Endpoints` when schema/API changed
- Append `## Changelog` entry:
  - **Version:** `**{version_san}** — {ISO date}: {summary}`
  - **Ad-hoc:** `**adhoc-YYYY-MM-DD** — {ISO date}: {summary}` (summary from task + diff)

### 3. Update INDEX.md

Create or update `{specs_root}/INDEX.md`:

```markdown
# Domain specs — {product_name}

| Domain | File                 | Last updated | Versions      |
| ------ | -------------------- | ------------ | ------------- |
| auth   | `docs/specs/auth.md` | {date}       | {version_san or adhoc-YYYY-MM-DD} |
```

### 4. Consolidation report

Emit short report for handoff:

```
## Living specs updated
| Domain | Action | File |
...
Mode: {version|ad-hoc}
Requirements added: N
Requirements updated: N
New specs: N
```

If ad-hoc skipped (non-behavioral or missing `{specs_root}/`):

```
## Living specs skipped
Reason: {missing specs_root|non-behavioral diff}
```

## Critical rules

- English for spec content
- Requirements use verifiable SHALL language
- Read before write on existing specs
- Planning orchestrator should read `INDEX.md` before new version requirements
- Ad-hoc must not create version artifacts under `docs/versions/`
- Ad-hoc must not invent a `{version_san}`

## Related skills

- `ns-sdd-requirements-generator` — reads living specs when planning
- `ns-code-reviewer` — prerequisite approval
- `ns-code-coder` — may invoke ad-hoc mode after Approved
