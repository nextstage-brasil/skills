# Planning gates (SDD)

Human confirmation gates for spec-driven workflows.

**Chat voice:** natural language; name deliverable, not phase. `human-communication.md` when that skill installed.

## Gate 0 — Requirements inputs (`requirements_inputs_confirmed`) {#gate-0-inputs}

Hard stop **before** `requirements-generator.md`. Human required.

Present **plain language** (`human-communication.md` Gate 0 voice):

- Open checklist categories **in words**
- Critical / major counts from `unknowns-register.md`
- Assumed premises + impact from `clarify-contract.md`
- Sensitive-item table (confirmed vs not) — **behavior in chat**, not source error codes / `FPA*` / ticket ids
- Every ask **numbered** (`1.` `2.` …); invite `1:` / `2:` replies **or** `Tudo sim` on remaining yes/no confirms (`human-communication.md`)

**Pass:** `(critical unknowns = 0 AND explicit Gate 0 human confirm) OR recorded skip-clarify waiver` in unknowns-register.

**Hard stop:** never Specify / never write `requirements.md` without Gate 0.

## Gate 1 — Requirements (`requirements_confirmed`) {#gate-1-requirements}

- If `requirements.md` does not exist: generate via `ns-spec-driven` → `references/requirements-generator.md` and **stop** until human confirms.
- If exists but not explicitly validated: **stop** and ask confirmation (`yes` / explicit approval).
- Chat self-contained: plain-language highlights and questions; document IDs only in parentheses after meaning — `human-communication.md` (**Gate 1 highlights**).
- Show **coverage counts** + **out-of-scope list** from `spec-coverage.md` when `source/` exists.
- Quote `skip clarify` waiver if recorded.
- Example ask shape: "Requirements are at `{path}`. [plain-language points / open decisions]. Confirm them, or tell me what to change."
- **`intelligent_saas`:** `requirements.md` without conversation hop (App chat route, SSE relay App to agent-api, HITL resume via App, conversation persistence in Application PG) = **fail** — return to Specify; do not pass Gate 1.

## Gate 2 — Scope (`scope_confirmed`) {#gate-2-scope}

- Present Features summary (layer counts when applicable) and **stop** until human confirms.
- Show **coverage counts** + **out-of-scope list** when ledger exists.
- Feature titles in words; do not lead with `Feature 00N` alone.
- Example ask: "Here is the feature/scope summary. OK to proceed, or what should change?"

## Consistency analysis {#consistency-analysis}

- After Gate 2, run `ns-spec-driven` Consistency (`references/analyze-consistency.md`).
- Resolve blockers (or explicit waiver) before Gate 3.
- Warnings: fix or waive before Gate 3; do **not** skip Gate 3 on clean pass.

## Gate 3 — Task plan (`execution_confirmed`) {#gate-3-execution}

- **Always required** before writing any `task-*.md` — even when consistency is 100% Approved.
- Summarized task plan: count by layer/type **and** estimated worker spawns (classic batches: same-layer consecutive `pending`, prefer 4–7, hard max 7). Volume visible before generation.
- Group tasks **by source section** (`Sx`) when `source/` exists.
- **Stop** until human confirms (`execution_confirmed`).
- Example ask: "Task plan: N backend, M frontend, … (~K worker batches, prefer 4–7 tasks each). Shall I generate the task files?"
- **`intelligent_saas`:** task plan without conversation hops table (App endpoints, relay, resume, persistence) = **fail** — do not generate `task-*.md`; return to Specify or fix plan.

## Gate 4 — Delivery units + GitLab (`delivery_units_confirmed`) {#gate-4-delivery-units}

- **When:** after all `task-*.md` written; **before** initial `execution-handoff.md`.
- **GitLab possible** = `docs/context/gitlab-sync-config.md` **or** MCP GitLab in session **or** human cited GitLab or parallel. No capability → **skip Gate 4** (optional `--preset gitlab` mention once if human cited GitLab).
- **Ask first** — do **not** compute `delivery-units.md` before human answers (`references/delivery-units.md`).
- **Three asks** (natural language — `human-communication.md`):
  1. Publish units to GitLab? (`yes` / `no`)
  2. Run units **sequential** (default) or **parallel** for same-wave units that satisfy `A ∥ B`?
  3. When file will be written: confirm resolved `SOURCE_BRANCH` (from `source-branch-resolution.md` — record in `delivery-units.md` header).
- **Stop** until human answers.
- **After answers:** publish `yes` **or** parallel chosen → compute + write `delivery-units.md`; record `gate4_gitlab`, `gate4_mode`, `SOURCE_BRANCH` in header.
- **Skip file:** publish `no` **and** sequential (default) → no `delivery-units.md`; generate handoff; Execute classic.
- **On publish yes:** run `mcp-gitlab-usage` → **SDD delivery-unit publish** per unit; write `issue_iid` back before handoff.
- **Forbidden:** issue per `task-NNN`; one issue for whole version; parallel without `A ∥ B`.

## Hard stops {#hard-stops}

- Never generate `requirements.md` without Gate 0.
- Never generate tasks without passing required gates (Gate 3 always included).
- Never skip `delivery-units.md` + Gate 4 when human chose publish or parallel.
- Never skip Gate 4 **ask** when GitLab possible on new planning closure.
- **Default local:** no GitLab capability → no Gate 4, no units file; classic handoff.
- **Legacy resume:** tasks + handoff exist, no `delivery-units.md` → Execute classic; do not force retroactive units.
- When step asks for explicit confirmation, do not proceed without it.
- GitLab MCP flows have additional gates — `mcp-gitlab-usage` (`requirements_confirmed`, `projects_confirmed`, `issues_creation_confirmed`).
- **`intelligent_saas`:** never pass Gate 1 without conversation hop in `requirements.md`.
- **`intelligent_saas`:** never generate `task-*.md` without hops table in Gate 3 task plan.
