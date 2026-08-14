# Harness Prepare

Orchestrate the **full brownfield onboarding chain** after `harness init`. You run worker **references** **in order**, one blocking step at a time. No upfront confirmation gate when boot checks pass.

State lives in **files on disk**, not chat history. Re-read outputs before each subsequent step.

## Session boot

See `./session-boot.md` and `./rules-sync.md`.

| Output | Path |
| ------ | ---- |
| Technical constitution | `.nextstage-harness/rules/architecture-rules.md` |
| Stack / module map (agent-dense) | `docs/context/brownfield-map.md` |
| Business reverse spec (human) | `docs/context/system-reverse-spec.md` |
| Business reverse index (agent) | `docs/context/system-reverse-spec.agent.md` |
| Project agents entry | `AGENTS.md` |
| Claude pointer | `CLAUDE.md` |

## When to use

| Trigger | Action |
| ------- | ------ |
| Right after `harness init` (brownfield preset) | **Run full prepare** |
| User says "prepare the project" / `/ns-harness prepare` | **Run full prepare** |
| Major refactors, new modules/stack, or stale context docs | **Re-run full prepare** |
| User wants one worker only | Route via `ns-harness` SKILL.md table to that reference |
| Greenfield, no application code | **Stop** — explain prepare needs a codebase to scan |

## Prerequisites

1. `harness init` completed (or equivalent: `.agents/skills/` + `.nextstage-harness/` present).
2. This skill (`ns-harness`) is installed — workers are local references, not separate skills.
3. Read-only access to application source under the repo.


## Boot (mandatory, once per session)

1. Complete Session boot (`./session-boot.md`).
2. Apply defaults (do **not** ask when checks pass):
   - Output language for markdown artifacts = user conversation language
   - Reverse-spec (`system-reverse-spec.md` + `.agent.md`) = **English only** (overrides conversation language)
   - Reverse-spec scope = whole product; depth = executive
   - Mode = **create** or **refresh** from existing artifacts on disk
3. Run boot checks:
   - `ns-harness` present (this skill)
   - Application code under the repo (manifests, `src/`, `app/`, etc.)
4. **If any check fails:** show a short failure table (what failed + how to fix) and **stop**. Do not ask to confirm a broken scope.
5. **If all checks pass:** show a one-line or compact scope summary (`.nextstage-harness/`, language, reverse-spec defaults, create/refresh) and **proceed immediately** into Step 1 — do **not** wait for "Confirma?" / user approval.

## Orchestration mandate

- After a successful boot summary, start Step 1 in the **same turn** (no confirmation wait).
- Execute **all four worker steps** in the fixed order below.
- **Do not** ask "continue to next step?" between steps.
- **Do not** ask "Confirma?" / scope approval when boot checks are green.
- **Do not** improvise worker steps — read the named reference at the start of each step and follow it.
- **Do not** skip `codebase-reverse-spec.md` — full prepare includes it.
- After step 1, run `npx @nextstage-brasil/harness sync` (shell) before step 2.

## Pre-save compress (mandatory)

Agent-facing outputs are **not for humans**. Before every `Write` of an agent artifact, read and apply:

`./agent-artifact-compress.md`

| Write | Compress |
| ----- | -------- |
| `architecture-rules.md` | Yes |
| `brownfield-map.md` | Yes |
| `system-reverse-spec.agent.md` | Yes |
| `AGENTS.md` | Yes |
| `system-reverse-spec.md` | No (human body) |
| `CLAUDE.md` | No (Rules boot + AGENTS.md + `.claude/agents`) |

Workers own the pass; prepare **rejects** advancing if a yes-row file looks essay-bloated vs the soft targets in that reference.

## Step sequence

### Step 1 — Architecture rules

**Reference:** `architecture-rules-generator.md`

**Goal:** Create or refresh `.nextstage-harness/rules/architecture-rules.md`.

**Prompt anchor:**

```
Scan the repo and generate or refresh architecture-rules.md.
Evidence-based only; mark inferred items. Target 80–200 lines.
Telegraphic tables/bullets — agent hot memory, not prose.
Before Write: apply ./agent-artifact-compress.md (caveman ultra).
```

Follow `architecture-rules-generator.md` completely. Read-only on application code.

### Step 1b — Sync rule adapters (shell)

Run in the project root:

```bash
npx @nextstage-brasil/harness sync
```

Do not proceed to step 2 until sync succeeds.

### Step 2 — Brownfield map

**Reference:** `bootstrap-brownfield.md`

**Goal:** Create or update `docs/context/brownfield-map.md`.

**Prompt anchor:**

```
Bootstrap brownfield analysis for this project.
Agent-dense brownfield-map.md (tables only). Link architecture-rules.md for stack — do not duplicate.
Before Write: apply ./agent-artifact-compress.md (caveman ultra).
```

Follow `bootstrap-brownfield.md`. Read-only on application code.

### Step 3 — Business reverse spec

**Reference:** `codebase-reverse-spec.md`

**Goal:** Create or update `docs/context/system-reverse-spec.md` **and** `system-reverse-spec.agent.md`.

**Prompt anchor:**

```
Reverse-engineer this project into a technology-agnostic system description.
Executive depth (default). Save human body to docs/context/system-reverse-spec.md
and agent-dense index to docs/context/system-reverse-spec.agent.md.
Both files MUST be English only (titles, labels, prose, rules) — never mix with conversation language.
Compress only the agent index before Write (agent-artifact-compress.md). Leave human body readable.
Autonomous run: use boot defaults for scope; English for reverse-spec; skip recon checkpoint unless a blocker.
```

Follow `codebase-reverse-spec.md`. Technology-agnostic output only.

### Step 4 — AGENTS.md (last)

**Reference:** `agents-md.md`

**Goal:** Refresh `AGENTS.md` and write minimal `CLAUDE.md`.

**Prompt anchor:**

```
Refresh AGENTS.md from installed skills and artifacts produced in this session.
Link to architecture-rules.md, brownfield-map.md, system-reverse-spec.md, and system-reverse-spec.agent.md — do not duplicate their bodies.
Preserve hand-edited sections unless recon proves them wrong.
Before Write: apply ./agent-artifact-compress.md — target ~95–110 lines.
```

Run **last** so links point to artifacts from steps 1–3.

## Per-step validation

Before advancing, confirm the step output file exists and is non-stub:

| Step | File | Min signal |
| ---- | ---- | ---------- |
| 1 | `architecture-rules.md` | Stack, layout, or constraints with real paths |
| 2 | `brownfield-map.md` | Module tables filled; stack is pointer (not a prose dump) |
| 3 | `system-reverse-spec.md` + `.agent.md` | Human body has entities/use cases; agent index has entity/rule tables |
| 4 | `AGENTS.md` | Links to harness rules and `docs/context/` |

If a step produces only a stub or errors, **stop** — report which step failed and what is missing. Do not continue with empty upstream artifacts.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| No application code under the repo | Stop — show failure; greenfield has nothing to scan |
| `ns-harness` missing | Stop — run `harness init` |
| Step output missing or still harness stub | Stop — fix step before continuing |
| `harness sync` fails | Stop — report error |
| User stops the run mid-chain | Stop at current step boundary |

## Completion summary

When all steps succeed, report:

1. Paths written or refreshed (four outputs + sync).
2. Suggested git commit message: `chore: harness prepare — rules, brownfield map, reverse spec (+ agent index), AGENTS.md`
3. Next SDD step: `/ns-spec-driven` when ready to plan version 1.0.

## Forbidden

- Do not ask for scope confirmation when boot checks pass — show summary and proceed.
- Do not reorder steps (especially `agents-md.md` before constitution and context artifacts).
- Do not skip `harness sync` after architecture rules.
- Do not skip `codebase-reverse-spec.md` in full prepare.
- Do not skip pre-save compress on agent-facing files (`agent-artifact-compress.md`).
- Do not caveman-rewrite the human reverse-spec body or `CLAUDE.md`.
- Do not edit `.cursor/` or `.claude/` directly — canonical only.
- Do not modify application source code during prepare.

## Invocation examples

```
/ns-harness prepare
```

```
I just ran harness init on this brownfield repo. Run full prepare for this project.
```

```
Prepare the project — architecture rules, brownfield map, reverse spec, and AGENTS.md in one go.
```

## Integration

| Stage | Skill |
| ----- | ----- |
| CLI install + scaffold | `npx @nextstage-brasil/harness init` |
| Check prerequisites | `npx @nextstage-brasil/harness prepare` |
| SDD planning after prepare | `/ns-spec-driven` (Clarify → Specify via internal references) |
