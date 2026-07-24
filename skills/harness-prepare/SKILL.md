---
name: harness-prepare
description: (NS) Run the full post-harness-init AI bootstrap in one session — architecture rules, harness sync, brownfield map, business reverse spec, and project AGENTS.md. Use whenever the user says harness prepare, post-install setup, bootstrap this project after harness init, onboard brownfield repo, run full project preparation, or wants all brownfield skills in sequence without invoking each slash command manually — even if they list harness-architecture-rules, harness-bootstrap-brownfield, harness-codebase-reverse-spec, and harness-agents-md as separate next steps. Do NOT use for greenfield repos with no application code yet, single-skill runs (invoke the worker skill directly), or CLI-only baseline AGENTS.md (use harness agents-md).
depends:
  - nextstage-harness
  - harness-architecture-rules
  - harness-bootstrap-brownfield
  - harness-codebase-reverse-spec
  - harness-agents-md
---

# Harness Prepare

Orchestrate the **full brownfield onboarding chain** after `harness init`. You do **not** replace the worker skills — you run them **in order**, one blocking step at a time, with a single upfront scope confirmation.

State lives in **files on disk**, not chat history. Re-read outputs before each subsequent step.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md` and `../nextstage-harness/references/rules-sync.md`.

| Output | Path |
| ------ | ---- |
| Technical constitution | `{harness_root}/rules/architecture-rules.md` |
| Stack / module map | `{product_root}/docs/context/brownfield-map.md` |
| Business reverse spec | `{product_root}/docs/context/system-reverse-spec.md` |
| Project agents entry | `{product_root}/AGENTS.md` |
| Claude pointer | `{product_root}/CLAUDE.md` |

## When to use

| Trigger | Action |
| ------- | ------ |
| Right after `harness init` (brownfield preset) | **Run full prepare** |
| User says "prepare the project" / `/harness-prepare` | **Run full prepare** |
| Major refactors, new modules/stack, or stale context docs | **Re-run full prepare** |
| User wants one worker only | **Do not** use this skill — invoke the worker directly |
| Greenfield, no application code | **Stop** — explain prepare needs a codebase to scan |

## Prerequisites

1. `harness init` completed (or equivalent: `.agents/skills/` + `.nextstage-harness/` present).
2. Worker skills installed: `harness-architecture-rules`, `harness-bootstrap-brownfield`, `harness-codebase-reverse-spec`, `harness-agents-md`.
3. Read-only access to application source under `{product_root}`.

If a worker skill is missing, stop and tell the user:

```bash
npx @nextstage-brasil/harness --preset brownfield --yes
```

## Boot (mandatory, once per session)

1. Resolve `{product_root}` and `{harness_root}` per harness discovery.
2. Confirm **once** (combine into one message when possible):
   - `{product_root}` path (monorepo product folder vs repo root)
   - Output language for markdown artifacts (default: user conversation language)
   - For `harness-codebase-reverse-spec`: whole product vs specific module; executive vs exhaustive (default: whole product, executive summary first)
3. Verify application code exists under `{product_root}` (manifests, `src/`, `app/`, etc.). If absent, stop — greenfield has nothing to scan.
4. Read existing `AGENTS.md`, `architecture-rules.md`, and `docs/context/*` to choose **create** vs **refresh** per step.

## Orchestration mandate

- Execute **all four worker steps** in the fixed order below.
- **Do not** ask "continue to next step?" between steps.
- **Do not** perform worker workflows yourself in the parent session — follow each worker skill's workflow in the same session (read the worker `SKILL.md` at the start of each step).
- **Do not** skip `harness-codebase-reverse-spec` — full prepare includes it.
- After step 1, run `npx @nextstage-brasil/harness sync` (shell) before step 2.

## Step sequence

### Step 1 — Architecture rules

**Skill:** `harness-architecture-rules`

**Goal:** Create or refresh `{harness_root}/rules/architecture-rules.md`.

**Prompt anchor:**

```
Scan {product_root} and generate or refresh architecture-rules.md.
Evidence-based only; mark inferred items. Target 80–200 lines.
```

Follow the worker skill workflow completely. Read-only on application code.

### Step 1b — Sync rule adapters (shell)

Run in the project root:

```bash
npx @nextstage-brasil/harness sync
```

Do not proceed to step 2 until sync succeeds.

### Step 2 — Brownfield map

**Skill:** `harness-bootstrap-brownfield`

**Goal:** Create or update `{product_root}/docs/context/brownfield-map.md`.

**Prompt anchor:**

```
Bootstrap brownfield analysis for {product_root}.
Compare findings to architecture-rules.md when present.
```

Follow the worker skill workflow. Read-only on application code.

### Step 3 — Business reverse spec

**Skill:** `harness-codebase-reverse-spec`

**Goal:** Create or update `{product_root}/docs/context/system-reverse-spec.md`.

**Prompt anchor:**

```
Reverse-engineer {product_root} into a technology-agnostic system description.
Save to docs/context/system-reverse-spec.md.
Autonomous run: use boot answers for scope and language; skip recon checkpoint unless a blocker.
```

Follow the worker skill workflow. Technology-agnostic output only.

### Step 4 — AGENTS.md (last)

**Skill:** `harness-agents-md`

**Goal:** Refresh `{product_root}/AGENTS.md` and write minimal `{product_root}/CLAUDE.md`.

**Prompt anchor:**

```
Refresh AGENTS.md for {product_root} from installed skills and artifacts produced in this session.
Link to architecture-rules.md, brownfield-map.md, and system-reverse-spec.md — do not duplicate their bodies.
Preserve hand-edited sections unless recon proves them wrong.
```

Run **last** so links point to artifacts from steps 1–3.

## Per-step validation

Before advancing, confirm the step output file exists and is non-stub:

| Step | File | Min signal |
| ---- | ---- | ---------- |
| 1 | `architecture-rules.md` | Stack, layout, or constraints with real paths |
| 2 | `brownfield-map.md` | Identified stack section filled |
| 3 | `system-reverse-spec.md` | Business entities or use cases present |
| 4 | `AGENTS.md` | Links to harness rules and `docs/context/` |

If a step produces only a stub or errors, **stop** — report which step failed and what is missing. Do not continue with empty upstream artifacts.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| No application code under `{product_root}` | Stop — greenfield; run prepare later |
| Worker skill not installed | Stop — suggest `harness --preset brownfield --yes` |
| Step output missing or still harness stub | Stop — fix step before continuing |
| `harness sync` fails | Stop — report error |
| User revokes scope mid-run | Stop at current step boundary |

## Completion summary

When all steps succeed, report:

1. Paths written or refreshed (four outputs + sync).
2. Suggested git commit message: `chore: harness prepare — rules, brownfield map, reverse spec, AGENTS.md`
3. Next SDD step: `pm-clarify-requirements` when ready to plan version 1.0.

## Forbidden

- Do not reorder steps (especially `harness-agents-md` before constitution and context artifacts).
- Do not skip `harness sync` after architecture rules.
- Do not skip `harness-codebase-reverse-spec` in full prepare.
- Do not edit `.cursor/` or `.claude/` directly — canonical only.
- Do not modify application source code during prepare.

## Invocation examples

```
/harness-prepare
```

```
I just ran harness init on this brownfield repo. Run full prepare for {product_root}.
```

```
Prepare the project — architecture rules, brownfield map, reverse spec, and AGENTS.md in one go.
```

## Integration

| Stage | Skill |
| ----- | ----- |
| CLI install + scaffold | `npx @nextstage-brasil/harness init` |
| Check prerequisites | `npx @nextstage-brasil/harness prepare` |
| SDD planning after prepare | `pm-clarify-requirements` → `pm-requirements-generator` |
