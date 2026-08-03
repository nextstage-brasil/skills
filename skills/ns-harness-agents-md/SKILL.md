---
name: ns-harness-agents-md
description: (NS) Generate or refresh project AGENTS.md plus minimal CLAUDE.md pointer after harness install. Use for "write AGENTS.md", bootstrap agent entry point, replace harness stub, or configure Cursor/Claude project rules. Do NOT copy the harness template verbatim. Do NOT use for architecture-rules, reverse business specs, or brownfield maps.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.1"
depends:
  - ns-harness
---

# Agents.md Generator

Produce the **project entry document** for coding agents: `{product_root}/AGENTS.md` tailored to what is actually installed and detected in the repo — not the generic harness scaffold template.

Then write `{product_root}/CLAUDE.md` containing **only** a pointer to `AGENTS.md` (see Step 5).

## Design principles

1. **Evidence-based** — list only skills, paths, and workflows that exist in the project. Mark `inferred` when guessing.
2. **Entry pointer, not constitution** — stack, layout, and constraints belong in `architecture-rules.md` (`ns-harness-architecture-rules`). `AGENTS.md` routes agents to the right files and skills.
3. **No harness template copy-paste** — do not dump `packages/harness/templates/AGENTS.md` into the project. Use `references/agents-md.template.md` as a skeleton and fill from reconnaissance.
4. **Lean** — target **~95–110 lines** (hard max **130**). Link to `docs/context/` and harness references instead of inlining.
5. **Agent-first** — saved file is for agents, not humans. Pre-save compress via `../ns-harness/references/agent-artifact-compress.md`.
6. **Refresh-safe** — on update, preserve stable hand-edited sections (language exceptions, GitLab server name, team conventions) unless recon proves them wrong.

## Harness discovery

See `../ns-harness/references/harness-discovery.md` and `../ns-harness/references/rules-sync.md`.

| Output               | Path                       |
| -------------------- | -------------------------- |
| Project agents entry | `{product_root}/AGENTS.md` |
| Claude Code pointer  | `{product_root}/CLAUDE.md` |

## Supporting skills (read-only helpers)

| Skill                          | Use during recon                                                      |
| ------------------------------ | --------------------------------------------------------------------- |
| `ns-harness-architecture-rules` | Check if constitution exists or is still stub; link, do not duplicate |
| `ns-harness-bootstrap-brownfield`         | Link to `brownfield-map.md` when present                              |
| `ns-harness-codebase-reverse-spec`        | Link to `system-reverse-spec.md` + `.agent.md` when present           |

## When to use

| Trigger                                            | Action                                                          |
| -------------------------------------------------- | --------------------------------------------------------------- |
| After `harness init` (CLI already ran `agents-md`) | **Refine** with project context — do not duplicate CLI baseline |
| Brownfield / monorepo / team conventions in README | **Generate** or **refresh** with evidence                       |
| User hand-edited `AGENTS.md` and wants AI merge    | **Refresh** preserving custom sections                          |
| User only needs skill list from disk               | Use `npx @nextstage-brasil/harness agents-md` instead — no AI   |

## Workflow

### Step 1 — Anchor

1. Resolve `{product_root}` (repo root or monorepo product folder).
2. Resolve `{harness_root}` = `{product_root}/.nextstage-harness/` when present.
3. Determine **create** vs **refresh**; read existing `AGENTS.md` if present.
4. Note whether `agents.local.md` exists at `{product_root}` (case-insensitive filename) — include the local-overrides rule in output; do not copy its contents into `AGENTS.md`.

### Step 2 — Reconnaissance

Follow `references/reconnaissance-checklist.md`. Read-only on application source.

Minimum:

1. List `.agents/skills/` (installed skill directory names).
2. Detect harness paths (`.nextstage-harness/`, `docs/`, legacy `.cursor/rules/`).
3. Skim `README.md` for project name and summary.
4. Note brownfield/context artifacts under `docs/context/`.

**Checkpoint (recommended):** Present detected skills and proposed SDD chain; confirm before writing. Skip only on explicit autonomous run.

### Step 3 — Draft AGENTS.md

Use `references/agents-md.template.md` as skeleton.

Writing rules:

- **First action** — mandatory section: read `AGENTS.md`, then `agents.local.md` when present (case-insensitive), then note GitLab MCP server from project notes.
- **How to start** — mandatory table: Planning / Implementation / Ad-hoc with skill entry points.
- **Implementation routing** — mandatory priority table (1–5) from `code-skill-routing.md`; link to installed `ns-harness` for full handoffs.
- **Hard stops / FORBIDDEN** — mandatory section: no invented personas, no skip architecture-rules, ISSUE_URL → gitlab-issue skill, no speculative version folders.
- **Product anchor** — `{product_root}` = `.` (relative to this `AGENTS.md`). Never write an absolute local path.
- **Local overrides** — when `agents.local.md` exists (case-insensitive), agents read it after `AGENTS.md`. Mark present/not present in Layout; never inline its content.
- **Installed skills** — exact names from `.agents/skills/`, **grouped by role** in a compact table. Build the SDD chain only from installed skills.
- **No persona section** — skills only; no "Agent personas" / subagents.
- **Layout** — one compact present/absent line or tiny table: rules, skills, local, docs/context|specs|versions. No almost-obvious multi-row essay.
- **No Workflows → Implementation** section — routing table already covers it. Keep SDD chain + brownfield/context links only.
- **Ownership + Language + Project notes** — single short block (≤5 bullets): routes vs architecture-rules; language; GitLab MCP / quirks.
- **Docker and testing** — always keep MUST NOT compose / restart without ask. Add host vs container test evidence from recon only (e.g. Vitest on host). Include full PHPUnit block from `../ns-harness/references/docker-and-testing.md` **only** when PHP/PHPUnit is evidenced; otherwise omit PHPUnit subsection.
- **Preserve** `<!-- harness-sync-managed: ... -->` if present.
- **Do not** inline architecture rules — one pointer line.
- English only in `AGENTS.md`.

**Pre-save (mandatory):** apply `../ns-harness/references/agent-artifact-compress.md` (caveman ultra). Target ~95–110 lines; hard max 130. Write only the compressed file.

### Step 4 — Write AGENTS.md

1. Write `{product_root}/AGENTS.md` (post-compress).
2. Do **not** modify application source unless explicitly asked.
3. If `architecture-rules.md` is still the harness stub, add a note to run `ns-harness-architecture-rules` next.

### Step 5 — Write CLAUDE.md

Write `{product_root}/CLAUDE.md` with **exactly**:

```markdown
@AGENTS.md
```

No other content. If the file had extra content, replace entirely unless the user asked to preserve something specific.

### Step 6 — Report

Brief bullets (3–5): product root, skills detected, recommended next skill (`ns-harness-architecture-rules` if constitution missing), whether create or refresh.

## Refresh mode

When updating existing `AGENTS.md`:

1. Preserve **Project-specific notes**, language policy, and GitLab/MCP names if still accurate.
2. Replace installed-skills, layout, and workflow sections from current evidence.
3. Re-write `CLAUDE.md` to `@AGENTS.md` only if it drifted.

## Quality bar (self-check before save)

- [ ] `agent-artifact-compress.md` applied (caveman ultra)
- [ ] First action section present (AGENTS.md → agents.local.md → GitLab MCP server)
- [ ] How to start table present (Planning / Implementation / Ad-hoc)
- [ ] Implementation routing table present (priority 1–5)
- [ ] Hard stops / FORBIDDEN section present
- [ ] Ownership/language/notes collapsed into one short block
- [ ] No separate "Workflows → Implementation" echo of the routing table
- [ ] Local overrides rule present (`agents.local.md`, case-insensitive)
- [ ] Not a verbatim copy of harness `templates/AGENTS.md`
- [ ] Every listed skill exists under `.agents/skills/`
- [ ] Skills are grouped by role (not a flat dump of all names)
- [ ] No "Agent personas" / subagents section
- [ ] `{product_root}` is relative (`.` or a monorepo-relative path — never an absolute machine path)
- [ ] Docker MUST NOT present; PHPUnit only if PHP evidenced
- [ ] SDD chain uses only installed skills
- [ ] `CLAUDE.md` is exactly `@AGENTS.md` (single pointer) — no compress
- [ ] No stack/module deep-dive (belongs in `architecture-rules.md`)
- [ ] Line count ≤ 130 (ideally 95–110)

## Related skills

- `ns-harness-architecture-rules` — technical constitution (run after or in parallel)
- `ns-harness-bootstrap-brownfield` — brownfield map for SDD planning
- `ns-harness-codebase-reverse-spec` — business behavior spec
- `ns-harness` — artifact paths and gates
