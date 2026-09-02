# Harness Prepare

Orchestrate **full brownfield onboarding chain** after `harness init`. Run worker **references** **in order**, one blocking step at a time. No upfront confirmation gate when boot checks pass.

State on disk, not chat. Re-read outputs before each subsequent step.

## Session boot

See `./session-boot.md` + `./rules-sync.md`.

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
| "prepare the project" / `/ns-harness prepare` | **Run full prepare** |
| Major refactors, new modules/stack, stale context docs | **Re-run full prepare** |
| One worker only | Route via `ns-harness` SKILL.md table |
| Greenfield, no application code | **Stop** — nothing to scan |

## Prerequisites

1. `harness init` done (or `.agents/skills/` + `.nextstage-harness/` present).
2. `ns-harness` installed — workers = local references.
3. Read-only access to application source.

## Boot + orchestration (mandatory, once per session)

1. Complete Session boot (`./session-boot.md`).
2. Defaults (do **not** ask when checks pass): markdown artifact language = conversation language; reverse-spec pair = **English only**; scope = whole product; depth = executive; mode = **create** or **refresh** from disk.
3. Checks: `ns-harness` present; application code under repo (manifests, `src/`, `app/`, etc.).
4. **Any check fails:** failure table + **stop**. No broken-scope confirmation.
5. **All pass:** compact scope summary + **proceed immediately** into Step 1 — no "Confirma?" / approval wait.
6. After boot summary, start Step 1 **same turn**. Run **all four steps** in order. No "continue?" between steps. Read named reference at step start; follow it. **Do not** skip `codebase-reverse-spec.md`. After step 1: `npx @nextstage-brasil/harness sync` before step 2.

## Pre-save compress (mandatory)

Before every `Write` of agent artifact, apply `./agent-artifact-compress.md`.

| Write | Compress |
| ----- | -------- |
| `architecture-rules.md`, `brownfield-map.md`, `system-reverse-spec.agent.md`, `AGENTS.md` | Yes |
| `system-reverse-spec.md`, `CLAUDE.md` | No |

Prepare **rejects** advancing if yes-row file essay-bloated vs soft targets in that reference.

## Step sequence

### Step 1 — Architecture rules

**Reference:** `architecture-rules-generator.md` — create/refresh `.nextstage-harness/rules/architecture-rules.md`. Read-only on application code.

```
Scan the repo and generate or refresh architecture-rules.md.
Evidence-based only; mark inferred items. Target 80–200 lines.
Telegraphic tables/bullets — agent hot memory, not prose.
Before Write: apply ./agent-artifact-compress.md (caveman ultra).
```

### Step 1b — Sync rule adapters

```bash
npx @nextstage-brasil/harness sync
```

Do not proceed until sync succeeds.

### Step 2 — Brownfield map

**Reference:** `bootstrap-brownfield.md` — create/update `docs/context/brownfield-map.md`. Read-only.

```
Bootstrap brownfield analysis for this project.
Agent-dense brownfield-map.md (tables only). Link architecture-rules.md for stack — do not duplicate.
Before Write: apply ./agent-artifact-compress.md (caveman ultra).
```

### Step 3 — Business reverse spec

**Reference:** `codebase-reverse-spec.md` — create/update `system-reverse-spec.md` **and** `system-reverse-spec.agent.md`. Technology-agnostic only.

```
Reverse-engineer this project into a technology-agnostic system description.
Executive depth (default). Save human body to docs/context/system-reverse-spec.md
and agent-dense index to docs/context/system-reverse-spec.agent.md.
Both files MUST be English only (titles, labels, prose, rules) — never mix with conversation language.
Compress only the agent index before Write (agent-artifact-compress.md). Leave human body readable.
Autonomous run: use boot defaults for scope; English for reverse-spec; skip recon checkpoint unless a blocker.
```

### Step 4 — AGENTS.md (last)

**Reference:** `agents-md.md` — refresh `AGENTS.md` + minimal `CLAUDE.md`. Run last so links point to steps 1–3 artifacts.

```
Refresh AGENTS.md from installed skills and artifacts produced in this session.
Link to architecture-rules.md, brownfield-map.md, system-reverse-spec.md, and system-reverse-spec.agent.md — do not duplicate their bodies.
Preserve hand-edited sections unless recon proves them wrong.
Include Project subagents from manifest (`subagent-dispatch.md`: **MUST** spawn exact `{name}` so YAML `model` applies; **FORBIDDEN** inherit / platform stand-in). Do not drop that contract on refresh.
Before Write: apply ./agent-artifact-compress.md — target ~95–110 lines.
```

## Per-step validation

| Step | File | Min signal |
| ---- | ---- | ---------- |
| 1 | `architecture-rules.md` | Stack, layout, or constraints with real paths |
| 2 | `brownfield-map.md` | Module tables filled; stack = pointer |
| 3 | `system-reverse-spec.md` + `.agent.md` | Human: entities/use cases; agent: entity/rule tables |
| 4 | `AGENTS.md` | Links to harness rules + `docs/context/` |

Stub or errors: **stop** — report step + gap. No empty upstream artifacts.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| No application code | Stop — greenfield has nothing to scan |
| `ns-harness` missing | Stop — run `harness init` |
| Step output missing or harness stub | Stop — fix step |
| `harness sync` fails | Stop — report error |
| User stops mid-chain | Stop at step boundary |

## Completion summary

1. Paths written/refreshed (four outputs + sync).
2. Suggested commit: `chore: harness prepare — rules, brownfield map, reverse spec (+ agent index), AGENTS.md`
3. Next SDD: `/ns-spec-driven` when ready for version 1.0.

## Forbidden

- Scope confirmation when boot checks pass.
- Reorder steps (`agents-md.md` before constitution + context).
- Skip `harness sync` after architecture rules or skip `codebase-reverse-spec.md`.
- Skip pre-save compress on agent-facing files.
- Caveman-rewrite human reverse-spec body or `CLAUDE.md`.
- Edit `.cursor/` or `.claude/` directly.
- Modify application source during prepare.

## Invocation

`/ns-harness prepare` | "Run full prepare after harness init" | "architecture rules, brownfield map, reverse spec, AGENTS.md in one go"

## Integration

| Stage | Command / skill |
| ----- | --------------- |
| Install + scaffold | `npx @nextstage-brasil/harness init` |
| Prerequisites check | `npx @nextstage-brasil/harness prepare` |
| SDD after prepare | `/ns-spec-driven` |
