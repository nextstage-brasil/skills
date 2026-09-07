# Gateway calibration

Intent routing lives in **Gateway** — deterministic only (rule, cheap non-LLM classifier, embedding similarity). **FORBIDDEN:** dedicated LLM `intent_classify` hop in runtime (`ns-langgraph-agents` `anti-patterns.md`). Cascade escalation stays post-generation on confidence.

## One classification, two consumers

Same locked intent category feeds:

| Consumer | Use |
| -------- | --- |
| Model tier | cheap vs strong per category |
| Index routing | Multi-Index key when `ns-postgres-rag` augmentation enabled (`retrieval-augmentations.md`) |

Single taxonomy in ADR. No second routing table at retrieval layer.

## Intent category table (ADR lock)

Fill during interview when Gateway classifies intent. Example shape — replace rows with product categories:

| Category | Example request | Target agent / index | Model tier | Why (P2 cost-of-error / irreversibility) |
| -------- | ----------------- | -------------------- | ---------- | ---------------------------------------- |
| faq_routine | "What are your hours?" | default FAQ index | cheap | Low error cost; reversible |
| billing_lookup | "Show invoice 8842 status" | billing index + billing tools | strong | Wrong total irreversible downstream |
| regulated_publish | "File this compliance report" | filing workflow | strong + always-escalate | Irreversible external publish |

**Tier rule:** justify each tier with Step 4 P2 — cost of error and reversibility. Cheap tier only when wrong answer is cheap and recoverable.

## Classifier viability lock

Classifier must be **cheaper and faster** than the strong-tier work it avoids. If routing cost exceeds savings, drop routing — strong tier for all, or rule-only subset.

Mechanisms allowed: keyword/rule table, embedding nearest-category, lightweight classifier. Not an LLM hop before generation.

## Threshold discipline

| Rule | Detail |
| ---- | ------ |
| Measure on project data | Project's own embedding model + language |
| Forbidden | Copy course example thresholds or vendor demo numbers |
| Margin | Calibrate gap between near-paraphrase and unrelated-topic — not a single exact cut point |
| Low confidence | Escalate (strong tier or human) — do not guess category |

Document threshold source in ADR Gateway calibration section (eval set size, date, model id).

## Re-classification (multi-turn)

User shifts domain mid-thread: re-run deterministic classifier on latest turn (or turn window policy locked in ADR). Prior category does not stick when new turn scores below margin. Low confidence on re-classify = escalate, not default to prior.

## Always-escalate categories

Independent of classifier score — gate or strong tier first:

| Trigger | Example |
| ------- | ------- |
| Irreversible external write | send email, file report, payment |
| Regulated publish | compliance filing, official customer comms |
| Destructive tool class | delete, drop, privilege change |

List locked categories in ADR. Runtime audit must record category + always-escalate flag (see `ns-langgraph-agents` `capability-governance.md`).

## Mandatory audit fields (runtime alignment)

Canonical list — copy identically to ADR Gateway calibration, `tool_executions`, and routing/`turn_decisions` rows when Gateway classifies intent:

| Field | Content |
| ----- | ------- |
| `intent_category` | Locked category id |
| `model_tier` | cheap \| strong |
| `model_id` | Provider model id and version string |
| `prompt_version` | Composed prompt / persona version id at invoke |
| `threshold_applied` | Gateway routing, HITL band, or semantic-cache threshold id / value |
| `score_obtained` | Classifier score or confidence that triggered the decision |
| `decision_outcome` | `ran` \| `approved` \| `rejected` \| `escalated` |
| `always_escalate` | yes / no — Gateway always-escalate category (HITL: same list as **always-scale**) |

Same fields in Observability block of ADR when Gateway classifies.

## Anti-patterns

| Anti-pattern | Fix |
| ------------ | --- |
| LLM router before generation | Deterministic Gateway only |
| Second taxonomy at retrieval | Reuse ADR categories |
| Borrowed threshold constants | Measure on project embedding + language |
| Sticky category across domain shift | Re-classify per turn policy |
| Always-escalate category on cheap tier | Strong tier or gate regardless of score |
