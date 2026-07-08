---
name: agents-md-generator
description: (NS) Scan a project with NextStage harness installed and generate or refresh a project-specific AGENTS.md entry point plus a minimal CLAUDE.md that points to it. Use whenever the user asks to generate AGENTS.md, create project agents doc, bootstrap agent entry point, replace harness AGENTS stub, set up Claude/Cursor project rules pointer, or onboard agents after harness init — even if they say "write AGENTS.md for this repo" or "configure agents for this project". Do NOT copy the harness package template verbatim. Do NOT use for technical constitution (architecture-rules-generator), business specs (codebase-reverse-spec), or brownfield stack maps (bootstrap-brownfield).
depends:
  - nextstage-harness
---

# Agents.md Generator

Produce the **project entry document** for coding agents: `{product_root}/AGENTS.md` tailored to what is actually installed and detected in the repo — not the generic harness scaffold template.

Then write `{product_root}/CLAUDE.md` containing **only** a pointer to `AGENTS.md` (see Step 5).

## Design principles

1. **Evidence-based** — list only skills, paths, and workflows that exist in the project. Mark `inferred` when guessing.
2. **Entry pointer, not constitution** — stack, layout, and constraints belong in `architecture-rules.md` (`architecture-rules-generator`). `AGENTS.md` routes agents to the right files and skills.
3. **No harness template copy-paste** — do not dump `packages/harness/templates/AGENTS.md` into the project. Use `references/agents-md.template.md` as a skeleton and fill from reconnaissance.
4. **Lean** — target **60–120 lines**. Link to `docs/context/` and harness references instead of inlining.
5. **Refresh-safe** — on update, preserve stable hand-edited sections (language exceptions, GitLab server name, team conventions) unless recon proves them wrong.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md` and `../nextstage-harness/references/rules-sync.md`.

| Output               | Path                       |
| -------------------- | -------------------------- |
| Project agents entry | `{product_root}/AGENTS.md` |
| Claude Code pointer  | `{product_root}/CLAUDE.md` |

## Supporting skills (read-only helpers)

| Skill                          | Use during recon                                                      |
| ------------------------------ | --------------------------------------------------------------------- |
| `architecture-rules-generator` | Check if constitution exists or is still stub; link, do not duplicate |
| `bootstrap-brownfield`         | Link to `brownfield-map.md` when present                              |
| `codebase-reverse-spec`        | Link to `system-reverse-spec.md` when present                         |

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

- **Installed skills** — exact names from `.agents/skills/`; build SDD chain only from skills that are installed. Invoke via the Skills menu / slash (e.g. `/code-coder`, `/code-reviewer`).
- **Layout table** — include rows only for paths that exist; omit or mark "not present" for missing scaffold.
- **Preserve** `<!-- harness-sync-managed: ... -->` block if present (update timestamp only if user asked).
- **Do not** inline full architecture rules — one line pointing to `architecture-rules.md`.
- English only in `AGENTS.md`.

### Step 4 — Write AGENTS.md

1. Write `{product_root}/AGENTS.md`.
2. Do **not** modify application source unless explicitly asked.
3. If `architecture-rules.md` is still the harness stub, add a note to run `architecture-rules-generator` next.

### Step 5 — Write CLAUDE.md

Write `{product_root}/CLAUDE.md` with **exactly**:

```markdown
@AGENTS.md
```

No other content. If the file had extra content, replace entirely unless the user asked to preserve something specific.

### Step 6 — Report

Brief bullets (3–5): product root, skills detected, recommended next skill (`architecture-rules-generator` if constitution missing), whether create or refresh.

## Refresh mode

When updating existing `AGENTS.md`:

1. Preserve **Project-specific notes**, language policy, and GitLab/MCP names if still accurate.
2. Replace installed-skills, layout, and workflow sections from current evidence.
3. Re-write `CLAUDE.md` to `@AGENTS.md` only if it drifted.

## Quality bar (self-check before save)

- [ ] Not a verbatim copy of harness `templates/AGENTS.md`
- [ ] Every listed skill exists under `.agents/skills/`
- [ ] SDD chain uses only installed skills
- [ ] `CLAUDE.md` is exactly `@AGENTS.md` (single pointer)
- [ ] No stack/module deep-dive (belongs in `architecture-rules.md`)
- [ ] Line count ≤ 150

## Related skills

- `architecture-rules-generator` — technical constitution (run after or in parallel)
- `bootstrap-brownfield` — brownfield map for SDD planning
- `codebase-reverse-spec` — business behavior spec
- `nextstage-harness` — artifact paths and gates
