---
name: ns-agent-platform
description: "(NS) After ADR: lock compute per five-block (dedicated/K8s vs serverless vs edge), multi-tenant, onboarding, LLM-gateway-as-product. Writes docs/specs/agent-platform.md. Use for compute topology, cold-start, tenant isolation, inherited thresholds, LLM gateway vs API Gateway. Do NOT: framework/graph (`ns-agent-architecture`, `ns-langgraph-agents`), provider-selection.md, coding."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
  - ns-agent-architecture
---

# Agent Platform

Where each ADR block **runs**. Tenant/platform product. Not framework. Not graph wiring.

**Grill-me:** one question per turn. Recommended answer. Product example. Wait.

Vendor / local-vs-API / data egress / tool-surface failover = `ns-agent-architecture` `provider-selection.md`. This skill: **compute placement** + **LLM gateway as product**. Failover here = hosting/gateway product, not second tool schema.

## Language (mandatory)

Lock **one** language: human **first** message. Interview, ~150–200 word chat, `docs/specs/agent-platform.md` = that language.

**Doctrine ids** English: Gateway, Orchestrator, Model + Tools/RAG, Approval Gate, Observability. Compute modes: dedicated, serverless, edge. Policy names: Loose Coupling, Clear Interfaces, Policy-Driven Control, `AllowlistPolicy`.

## Gate 0 — ADR present

Missing `docs/specs/agent-architecture.md`: **Stop**. Run `ns-agent-architecture`. No compute interview without five-block ADR.

## Core behavior (grill-me)

1. **One question per turn.** Never bundle. Wait.
2. **Recommended answer every question.** Best call + one-sentence rationale. **Example** from this product.
3. **Lock before next.** Re-ask only if contradict.
4. **Probe.** Vague: narrow. No skip.
5. **No cheerleading.**
6. **No graph/framework/code.** Not LangGraph vs CrewAI. Not `graph-spec.md` wiring.

AskQuestion: recommended option `(preferred)` first.

Codebase or ADR already answers: explore first. Confirm only.

## Per-turn output format

Every interview turn except opening intro and final report:

```markdown
**Q[n]:** [single focused question]

**Recommended answer:** [your call] — [one-sentence rationale]

**Example (this use case):** [one concrete instance from context already given]
```

Resolved without ask: append `(Or: I explored [source] and found [evidence]. Confirm?)`.

## Conversation flow

### Step 1 — Opening

One short intro. Confirm ADR five-block map exists. Then Gate 1.

### Gate 1 — Compute topology (`references/compute-topology.md`)

One **row per ADR five-block**. Dedicated/K8s vs serverless vs edge. Mixed valid. **FORBIDDEN** one system-wide hosting answer when blocks differ.

Serverless row: **name** cold-start (budget or accept-gap). Unnamed = incomplete.

Break-even: **example** in report + **measure-your-own**. No borrowed course numeric threshold.

Edge: still ships to **central** Observability. Edge does not waive audit.

### Gate 2 — Multi-tenant (`references/multi-tenant.md`)

Per concern: shared-once vs per-tenant. Lock Loose Coupling, Clear Interfaces, Policy-Driven Control.

Policy: **central** vs copied. Runtime allowlist shape: `ns-langgraph-agents` `references/capability-governance.md` `AllowlistPolicy`. Copied per-tenant policy = drift risk; record why if copied.

### Gate 3 — Onboarding (`references/onboarding.md`)

Who approves new tenant. What is reviewed. Skip consequence. Thresholds **inherited** until reviewed — flag inherited; do not treat copy as measured lock.

### Gate 4 — LLM gateway as product (`references/llm-gateway-product.md`)

ADR Gateway = **API entry** (`ns-agent-architecture` `reference-architecture.md`). This gate: **LLM gateway product** (tenant keys, quota, provider hosting failover, audit). Not “just an API route.”

Local prototype to production: **re-run Gate 1** compute table. Failover = gateway/hosting product.

### Gate 5 — Report

Locked: Gate 0–4.

1. Announce complete.
2. **Phase 1 (chat):** ~150–200 words. Mixed topology yes/no, tenant model, onboarding owner, LLM-gateway-as-product vs route, top risk.
3. **Phase 2 (file):** living **`docs/specs/agent-platform.md`**. Create `docs/specs/` if missing. Canonical path. Do not ask. **Missing:** fill from `templates/agent-platform-report.md` (do not caveman that template). **Exists:** update current-state; **append** Changelog + Interview Record. Never blind-replace.

**Standalone (no project FS):** full report in chat. Tell user save as `docs/specs/agent-platform.md`.

File = platform handoff. Self-contained. Not ADR. Not `graph-spec.md`.

## Critical rules

- No platform lock without ADR (Gate 0)
- No one-hosting-fits-all when five-block compute differs
- Never copy course numeric thresholds; break-even = example + measure-your-own
- Edge ≠ audit waiver
- Inherited tenant thresholds flagged until reviewed
- LLM gateway product ≠ ADR Gateway API route
- Not `provider-selection.md` (vendor/egress/tool-schema)
- Not implementation

## Reference map

| Reference | Read when |
| --------- | --------- |
| `references/compute-topology.md` | Gate 1 |
| `references/multi-tenant.md` | Gate 2 |
| `references/onboarding.md` | Gate 3 |
| `references/llm-gateway-product.md` | Gate 4 |
| `templates/agent-platform-report.md` | Gate 5 schema (copy; do not compress) |

## Related skills (optional — when installed)

- `ns-agent-architecture` — ADR required first (`docs/specs/agent-architecture.md`)
- `ns-langgraph-agents` — runtime after ADR; `AllowlistPolicy` in `capability-governance.md`
- `ns-agent-adaptation` — conceptual design before ADR
