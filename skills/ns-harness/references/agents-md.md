# Agents.md Generator

Produce **project entry document** for coding agents: `AGENTS.md` from installed skills + detected repo — not generic harness scaffold. Then write `CLAUDE.md` (Step 5 boot template).

## Design principles

1. **Evidence-based** — list only existing skills, paths, workflows. Mark `inferred` when guessing.
2. **Entry pointer, not constitution** — stack/layout/constraints in `architecture-rules.md`. `AGENTS.md` routes to files + skills.
3. **No harness template copy-paste** — `agents-md/template.md` skeleton + recon fill.
4. **Lean** — **~95–110 lines** (hard max **130**). Link `docs/context/` + harness refs.
5. **Agent-first** — pre-save `./agent-artifact-compress.md`.
6. **Refresh-safe** — preserve hand-edited sections unless recon proves wrong.

## Session boot

`./session-boot.md` + `./rules-sync.md`.

| Output | Path |
| ------ | ---- |
| Project agents entry | `AGENTS.md` |
| Claude pointer | `CLAUDE.md` |

## Supporting skills (read-only)

| Skill | Recon use |
| ----- | --------- |
| `architecture-rules-generator.md` | Constitution exists/stub? Link, don't duplicate |
| `bootstrap-brownfield.md` | Link `brownfield-map.md` when present |
| `codebase-reverse-spec.md` | Link `system-reverse-spec.md` + `.agent.md` when present |

## When to use

| Trigger | Action |
| ------- | ------ |
| After `harness init` (CLI ran `agents-md`) | **Refine** — don't duplicate CLI baseline |
| Brownfield / monorepo / README conventions | **Generate** or **refresh** |
| Hand-edited `AGENTS.md` + AI merge | **Refresh** preserving custom sections |
| Skill list from disk only | `npx @nextstage-brasil/harness agents-md` — no AI |

## Workflow

### Step 1 — Anchor

Session boot; note `.nextstage-harness/`. **Create** vs **refresh**; read existing `AGENTS.md`. Note `agents.local.md` beside `AGENTS.md` (case-insensitive) — rule in output; don't copy contents.

### Step 2 — Reconnaissance

`agents-md/reconnaissance-checklist.md`. Read-only. Minimum: list `.agents/skills/`; detect harness paths; skim `README.md`; note `docs/context/` artifacts.

**Checkpoint (recommended):** Present skills + SDD chain; confirm before write. Skip on autonomous run.

### Step 3 — Draft AGENTS.md

`agents-md/template.md` skeleton. Writing rules:

- **First action** — obey `AGENTS.md` (no tool-Read), then `agents.local.md` when present (case-insensitive), then GitLab MCP from project notes.
- **How to start** — Planning / Implementation / Ad-hoc table with skill entry points.
- **Implementation routing** — priority 1–5 from `code-skill-routing.md`; link `ns-harness` for handoffs.
- **Hard stops / FORBIDDEN** — no invented personas, no skip architecture-rules, ISSUE_URL → gitlab-issue, no speculative version folders.
- **Local overrides** — `agents.local.md` (case-insensitive) after `AGENTS.md`; mark present/absent in Layout; never inline.
- **Installed skills** — exact `.agents/skills/` names, **grouped by role**. SDD chain from installed only.
- **No persona section**.
- **Layout** — compact present/absent: rules, skills, local, docs/context|specs|versions.
- **No Workflows → Implementation** — routing table covers it.
- **Ownership + Language + Project notes** — ≤5 bullets.
- **Docker and testing** — MUST NOT compose/restart without ask. Host vs container evidence from recon. PHPUnit block from `./docker-and-testing.md` **only** when PHP evidenced.
- **Preserve** `<!-- harness-sync-managed: ... -->`.
- **Do not** inline architecture rules.
- English only.

**Pre-save:** `./agent-artifact-compress.md` (caveman ultra). ~95–110 lines; max 130.

### Step 4 — Write AGENTS.md

Write post-compress. Don't modify application source unless asked. If `architecture-rules.md` still stub, note run `architecture-rules-generator.md`.

### Step 5 — Write CLAUDE.md

**Exactly:**

```markdown
# Rules

CRITICAL — NO EXCEPTIONS.

Obey \`AGENTS.md\` (already in context when the host injects it; open once only if absent — **never** re-Read). Then load every file it requires and follow its flow.

Must load:
- \`AGENTS.local.md\` (when present; case-insensitive)
- all \`alwaysApply: true\` rules (\`.nextstage-harness/rules/\`)
- any NON-NEGOTIABLE / FIRST ACTION file for the task

No skip. No defer. No memory-only. Missing required file → stop, ask human.

Then skills / subagents / task as AGENTS.md says.

## Subagents

`@.claude/agents` — use them; model optional per agent.
```

No other content. Replace entirely unless user asked to preserve something.

### Step 6 — Report

3–5 bullets: root, skills detected, next skill (`architecture-rules-generator.md` if constitution missing), create vs refresh.

## Refresh mode

Preserve **Project-specific notes**, language, GitLab/MCP names if accurate. Replace skills/layout/workflows from evidence. Re-write `CLAUDE.md` if drifted.

## Quality bar

- [ ] `agent-artifact-compress.md` applied
- [ ] First action, How to start, routing 1–5, FORBIDDEN present
- [ ] Ownership/language/notes collapsed; no Workflows echo
- [ ] Local overrides rule (`agents.local.md`, case-insensitive); not harness template copy
- [ ] Every skill exists under `.agents/skills/`; grouped by role; no personas
- [ ] Layout repo-relative; Docker MUST NOT; PHPUnit only if PHP evidenced
- [ ] SDD chain from installed skills only
- [ ] `CLAUDE.md` exact Step 5 — no compress
- [ ] No stack deep-dive; ≤130 lines (ideally 95–110)

## Related

`architecture-rules-generator.md` | `bootstrap-brownfield.md` | `codebase-reverse-spec.md` | `session-boot.md` | `artifact-layout.md`
