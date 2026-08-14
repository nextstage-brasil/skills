---
name: code-routing-diagram
description: Maintainer-only skill for the nextstage-brasil/skills repo. Create or update the Mermaid flowchart that shows GitLab issue execution, coder entry, investigator, spec-driven, and autonomous handoffs. Use when working IN this repository and the user asks for routing diagram, coder flow mermaid, issue resolution chart, or after changing routing in ns-code-* skills. NOT installed via harness — lives in .cursor/skills/. Skills are source of truth; the diagram is derived from them. Do NOT invent routing in the diagram alone.
---

# Code routing diagram (this repo only)

**Audience:** maintainers of `nextstage-brasil/skills`. **Not** a catalog skill for consumer projects.

Produce an accurate Mermaid flowchart of runtime handoffs between implementation skills — especially `ns-execution-gitlab-issue` and `ns-coder` (`C2` under autonomous).

## When to use

- Routing changed in catalog skills and the diagram must match
- You need a visual map of issue → autonomous → coder → reviewer
- Personal note under `docs/` (gitignored) — copy mermaid there after updating canonical source

## Source of truth (read before drawing)

| Path | Role |
| ---- | ---- |
| `skills/ns-harness/references/code-skill-routing.md` | Priority table, handoffs, **canonical ` ```mermaid ` block** |
| `skills/ns-execution-gitlab-issue/references/entry-triggers.md` | Priority 1 |
| `skills/ns-spec-driven/references/entry-triggers.md` | Priority 2 |
| `skills/ns-autonomous/references/entry-triggers.md` | Priority 3 |
| `skills/ns-investigator/references/entry-triggers.md` | Priority 4 |
| `skills/ns-coder/references/entry-triggers.md` | Priority 5 |
| `skills/*/SKILL.md` routing sections | Handoffs out |
| `skills/ns-autonomous/references/routing.md` | Engine anti-cycle |

Details: `references/canonical-sources.md`, `references/mermaid-conventions.md`.

## Workflow

### 1. Reconcile

Read all sources above. If diagram and skills disagree, **edit skills first** — never only the diagram.

### 2. Update canonical mermaid

Edit the block under **Skill handoffs (diagram source)** in:

`skills/ns-harness/references/code-skill-routing.md`

Follow `references/mermaid-conventions.md`. Commit this file with any routing skill changes.

### 3. Personal copy (optional)

If the maintainer wants a local file (e.g. `docs/coder-routing.mmd` — often gitignored):

```bash
node packages/harness/scripts/export-code-routing-mermaid.mjs docs/coder-routing.mmd
```

Or paste the mermaid block manually. **Do not** treat `docs/` as source of truth.

### 4. Report

- What changed in harness reference / routing skills
- Whether a personal copy was written (path)
- Reminder: catalog skills drive runtime; diagram is documentation for maintainers

## Forbidden

- Adding this skill to `catalog.json` or harness presets
- Drawing from memory or stale exports
- `C2 → G` as an active edge (engine anti-cycle)
- Confusing install `depends` with runtime routing
