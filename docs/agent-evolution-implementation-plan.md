# Agent Evolution — Implementation Plan (harness)

> **Source of truth for *what*:** [`agent-evolution-maker.md`](./agent-evolution-maker.md)  
> **This file:** *how* to land that evolution in `skills/` without breaking the harness catalog, CI, or brownfield agents.  
> **Status:** plan only — no skill edits until this plan is approved.  
> **Date:** 2026-08-05

---

## 0. Constraints (non-negotiable)

| Constraint | Why |
| ---------- | --- |
| **Skills/docs/snippets only** in this workstream | Harness does not ship a runnable agent-api scaffold that products compile against; changing doctrine does not redeploy DecisionSuite. |
| **No catalog rename / no new skill unless needed** | `validate-catalog.js` + presets (`coder-langgraph`) already depend on `ns-langgraph-agents`. Prefer extending that skill. |
| **Additive architecture enum** | Keep `react` valid. Add `react_bounded` — never remove or redefine existing architecture names. |
| **Greenfield MUST ≠ brownfield FORCE** | “Mandatory” applies to **new** agent-api builds and **intentional** MCP redesigns. Brownfield open-ReAct agents get **recommended migration**, not a review Critical that fails every PR. |
| **SKILL.md < 500 lines** | Today ~292. Prefer new/updated `references/` + snippets; thin pointers in `SKILL.md`. |
| **Snippet API compatibility** | Existing snippet exports stay; new fields are optional with defaults. Prefer **new** snippet files over breaking edits. |
| **Evals additive** | Keep existing 6 eval cases; append new ones for budgets / topology / dev-chat. Do not weaken current assertions. |
| **No domain copy from DecisionSuite** | Concepts only. No panel/vendor names, no domain skills. |
| **No `packages/harness` CLI behavior change** in Wave 0–2 | Avoid installer/scaffold regressions. Catalog JSON untouched unless a new skill directory appears (avoid for now). |
| **English-only artifacts** | Per root `AGENTS.md`. |

### Blast radius

| Surface | Risk if careless | Mitigation |
| ------- | ---------------- | ---------- |
| Installed consumer skills | Agents start recommending different topology | Scope language: greenfield / MCP tool-heavy; grandfather brownfield |
| `context-window.ts.snippet` | Copied code in products diverges | Extend type with optional `skillBodyMaxChars`; keep old helpers signatures |
| `graph-spec.md` template | New projects get new enum values | Additive `\| react_bounded`; document when to prefer |
| `ns-multi-agent-architect` | Interview default shifts | Prefer `react_bounded` **only when** MCP/external tools + streaming; else keep prior ReAct MVP path |
| `ns-code-e2e-tests` | Cypress-centric; agent-api uses Playwright/dev-chat | **Do not** force Cypress into agent-api. Put browser/dev-chat gates in `ns-langgraph-agents` evals doctrine; optional cross-link only |
| CI `validate-skills.yml` | Broken refs / legacy paths | Run catalog validator + smoke after each wave |
| DecisionSuite / other products | Zero direct code change | Products adopt only when they re-run harness skills |

---

## 1. Strategy

Ship in **4 mergeable waves**. Each wave:

1. Touches a small, reviewable file set  
2. Leaves catalog valid and prior evals still true  
3. Can stop after merge without half-finished doctrine  
4. Updates `docs/agent-evolution-maker.md` §6 checkmarks only if useful (optional)

**Ownership default:** `ns-langgraph-agents`.  
**Secondary (Wave 2):** `ns-multi-agent-architect` selection guide only.  
**Deferred:** `ns-code-e2e-tests` rewrite; harness package release bump (can follow after Wave 1–2 land).

---

## 2. Waves

### Wave 0 — Safety rails + docs hygiene (no doctrine flip)

**Goal:** prepare versioning and explicit greenfield/brownfield wording before MUST language lands.

| Step | Action | Files |
| ---- | ------ | ----- |
| 0.1 | Bump `ns-langgraph-agents` metadata `version` → `1.2` (or `1.1.1` if preferred) | `SKILL.md` frontmatter |
| 0.2 | Add short **Applicability** block: greenfield MUST / brownfield RECOMMENDED / sync when redesigning MCP topology | `SKILL.md` (≤15 lines) |
| 0.3 | Commit `docs/agent-evolution-maker.md` + this plan if not already on main | `docs/*` |
| 0.4 | Gate: `node packages/harness/scripts/validate-catalog.js` | — |

**Exit criteria:** catalog OK; no behavioral MUST changes yet.

**Rollback:** revert docs + frontmatter only.

---

### Wave 1 — P0 controls (economy + trainability) — **highest value, lowest topology risk**

**Goal:** budgets, normalize-MCP, separate caps in snippets, **dev-chat required for greenfield** — without forcing graph rewrite.

| Step | Action | Files |
| ---- | ------ | ----- |
| 1.1 | **Dev-chat:** change “optional” → required for **greenfield** `streaming_sse` / agent-api; brownfield: recommend add if missing | `runtime-layout.md`, `streaming-and-hitl.md`, `SKILL.md` Phase 6 |
| 1.2 | **New** snippet `tool-budget.ts.snippet` (`resolveMaxToolCallsPerTurn`, `resolveMaxMcpCallsPerTurn`, fingerprint duplicate-skip pseudocode comments) | `templates/snippets/tool-budget.ts.snippet` |
| 1.3 | Document budgets + duplicate-skip as MUST for MCP/tool-heavy | `capability-governance.md`, `rules-contract.md` (align env names) |
| 1.4 | Extend context doctrine: `normalizeMcpToolResult` **before** truncate; ensure `CONTEXT_SKILL_BODY_MAX_CHARS` in snippet config | `context-window-and-tokens.md`, `context-window.ts.snippet`, `mcp-complex-access.md` |
| 1.5 | Anti-patterns: add items for shared cap, silent gather break, ship without `/dev-chat` (**greenfield**), discovery≠evidence | `anti-patterns.md` |
| 1.6 | Reference map row for new snippet | `SKILL.md` reference table |
| 1.7 | **Evals:** append 1 case — MCP agent must mention tool/MCP budgets + normalize-before-truncate + separate skill cap | `evals/evals.json` |
| 1.8 | Gate: catalog validator; manual read of Phase 6 for brownfield soft language |

**Exit criteria:** greenfield DoD lists budgets + normalize + dev-chat; brownfield not Critical-failed for missing topology.

**Do not in Wave 1:** change default architecture recommendation; rewrite `state.ts.snippet`; touch `ns-multi-agent-architect`; touch harness package.

**Rollback:** revert Wave 1 commits; snippets unused elsewhere.

---

### Wave 2 — P1 topology (opt-in default for MCP tool-heavy)

**Goal:** teach `react_bounded` as **preferred when MCP + external tools**, keep open `react` valid.

| Step | Action | Files |
| ---- | ------ | ----- |
| 2.1 | Add section **Bounded ReAct / react_bounded** (intent → gather → composer; sole-writer; optional bypass) | `architectures.md` |
| 2.2 | Update selection guide: MCP tool-heavy → `react_bounded`; simple local tools MVP → `react` still OK | `architectures.md` |
| 2.3 | Template: architecture enum includes `react_bounded`; optional state channels documented as comments/placeholders | `templates/graph-spec.md` |
| 2.4 | Pattern doc: `context_compact` pre-intent (prune → compress discovery → trim → summarize); optional small snippet **new file** `prepare-llm-messages.ts.snippet` if keeps SKILL thin | `context-window-and-tokens.md` (+ optional snippet) |
| 2.5 | State snippet: **commented** evidence channels (`dataBundle`, `discoveryBrief`, `externalError`, `turnDecisions`) — not required fields for non-MCP graphs | `state.ts.snippet` |
| 2.6 | Turn latency budget + distinct error code | `error-and-reliability.md`, `streaming-and-hitl.md` |
| 2.7 | Gather vs deliver prompt split | `prompt-and-capability-injection.md` |
| 2.8 | `ns-multi-agent-architect`: one decision-pillar probe — if LangGraph + MCP/tools → recommend `react_bounded` topology in final report | `decision-pillars.md` and/or report template (minimal) |
| 2.9 | Evals: append case for topology recommendation under MCP | `ns-langgraph-agents/evals/evals.json` |
| 2.10 | Gate: catalog OK; ensure SKILL.md still &lt; 500 lines |

**Exit criteria:** architect + langgraph skills agree on MCP default; open ReAct still documented and allowed.

**Do not in Wave 2:** delete ReAct section; mandate evidence hydrate code in every agent; port DecisionSuite chart/Vega logic.

**Rollback:** revert Wave 2; Wave 1 remains valuable alone.

---

### Wave 3 — P2 observability + evidence doctrine + eval gates

**Goal:** fidelity/observability as doctrine; eval story for MCP + browser/dev-chat — still no product code.

| Step | Action | Files |
| ---- | ------ | ----- |
| 3.1 | **New** `references/evidence-and-fidelity.md` (state-backed evidence, fidelity alert non-blocking, external-error channel) | new file |
| 3.2 | Wire into SKILL reference map + anti-patterns cross-links | `SKILL.md`, `anti-patterns.md` |
| 3.3 | Observability: `llm_logs.stage`, `turn_decisions`, costs-by-thread / `unpriced_calls`, redaction on SoT | `observability.md` |
| 3.4 | Evals gates: golden `tools/list` when MCP; Playwright (or equivalent) against `/dev-chat` when `streaming_sse` — as **project gate recommendation**, not Cypress rewrite | `evals-and-gates.md` |
| 3.5 | Optional one-line cross-link from `ns-code-e2e-tests` or PM e2e generator: “agent-api browser evals → see ns-langgraph-agents evals-and-gates” | only if zero confusion with Cypress |
| 3.6 | Evals: append fidelity / evidence-channel prompt | `evals/evals.json` |
| 3.7 | Gate: catalog OK; spot-check orphan-recovery still coherent |

**Exit criteria:** fidelity doctrine readable; evals describe MCP+dev-chat gates without breaking Cypress skill.

---

### Wave 4 — P3 opt-in patterns (deferrable)

| Step | Action | Files |
| ---- | ------ | ----- |
| 4.1 | Structural + field-values cache pattern (tenant + token fingerprint; never cache confirmed absence of free search) | `mcp-complex-access.md` subsection |
| 4.2 | Fidelity-alert helper notes | `evidence-and-fidelity.md` or `observability.md` |
| 4.3 | Consider harness package patch release only if install README must mention new refs | `packages/harness/README.md` — **optional**, last |

**Exit criteria:** optional patterns documented; no REQUIRED for agents without catalog rediscovery pain.

---

## 3. Per-PR checklist (every wave)

```text
[ ] Diff limited to planned files for this wave
[ ] No domain/vendor strings from DecisionSuite
[ ] Greenfield vs brownfield language reviewed
[ ] Existing architecture names unchanged (additive only)
[ ] Snippet exports backward-compatible or new file
[ ] SKILL.md < 500 lines
[ ] evals.json: old cases intact; new cases appended
[ ] node packages/harness/scripts/validate-catalog.js → OK
[ ] npm test in packages/harness if any harness package file touched (Waves 0–3: skip if untouched)
[ ] English only in skill/docs artifacts
[ ] No commit of secrets / product .env
```

---

## 4. Explicit non-goals (this implementation)

- Porting DecisionSuite `src/` into harness templates as a full scaffold.  
- Changing factory `.batschspec` (separate track).  
- Forcing existing product agents to migrate topology in the same PR.  
- Replacing Cypress `ns-code-e2e-tests` with Playwright.  
- Publishing `@nextstage-brasil/harness` unless Wave 4 README needs it.  
- Auto-updating installed skills in consumer repos (install is pull-based).

---

## 5. Suggested PR sequence

| PR | Title (Conventional Commits style) | Depends on |
| -- | ---------------------------------- | ---------- |
| A | `docs: add agent evolution maker and implementation plan` | — |
| B | `feat(ns-langgraph-agents): P0 budgets, MCP normalize, mandatory greenfield dev-chat` | A |
| C | `feat(ns-langgraph-agents): add react_bounded topology and context_compact doctrine` | B |
| D | `feat(ns-langgraph-agents): evidence fidelity and MCP/dev-chat eval gates` | C |
| E | `docs(ns-langgraph-agents): opt-in MCP catalog cache patterns` | D (optional) |

Each PR should be independently mergeable and reversible.

---

## 6. Success metrics (harness, not product SLAs)

1. New greenfield LangGraph+MCP guidance from skills mentions: **dev-chat, budgets, normalize-before-truncate, gather/composer (or react_bounded), separate skill cap**.  
2. Brownfield orphan recovery still runs without requiring full topology rewrite as Critical.  
3. Catalog validator green; prior eval case intents still valid.  
4. No harness installer regression (no CLI change in Waves 0–3).

---

## 7. Approval gate

**Stop here.** Do not edit `skills/ns-langgraph-agents/**` until this plan is approved.

Recommended first execution after approval: **PR A (docs)** then **Wave 1 / PR B** only — reassess before Wave 2 topology default shift.
