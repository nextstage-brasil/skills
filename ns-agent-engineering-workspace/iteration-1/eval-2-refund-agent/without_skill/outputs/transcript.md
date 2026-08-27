# Eval transcript — without_skill (baseline)

**Eval:** eval-2-refund-agent  
**Condition:** without_skill (BASELINE — did not read ns-agent-engineering)  
**Task:** Multi-step agent: SQL order lookup → refund decision → customer email; must not send mail without approval.

---

## Response

You need a **linear agent pipeline with a hard human-in-the-loop gate before any email send**. Lookup and policy can run automatically; outbound mail must be blocked until a reviewer issues a one-shot approval token that `send_email` validates.

### Recommended shape

```
Intake → SQL order lookup → refund decision (policy) → email draft
                                                         ↓
                                               Human approval gate
                                              /                  \
                                       Send email            Reject / revise
                                              ↓
                                       Audit / record
```

### Tools

| Tool | Side effect | Role |
|------|-------------|------|
| `lookup_orders` | Read (SQL) | Parameterized query by `customer_id` / `order_id` |
| `get_refund_policy` | Read | Window, status, caps, prior-refund rules |
| `draft_refund_email` | None | Subject + body only |
| `request_approval` | Interrupt | Pause; await approve / reject / revise |
| `send_email` | **Write** | Only with valid `approval_id` |
| `record_refund_decision` | Audit write | Decision + approval outcome |

**Invariant:** no path from draft → send without approved `approval_id`. Enforce in the tool layer, not only in the prompt.

### Decision logic (fail closed)

1. Order exists and belongs to customer  
2. No successful prior refund  
3. Status in refundable set  
4. Within refund window  
5. Amount ≤ total and ≤ policy cap  
6. Payment method refundable  

Emit structured output: `refund_applies`, `amount`, `reason_codes`, `rationale`. LLM may draft email copy; eligibility should be a pure/policy function so prompt injection cannot force a refund.

### Approval gate

Show reviewer: verdict + amount, reason codes, order evidence, editable draft. Actions: Approve (issue single-use `approval_id`), Reject (no send), Revise (edit then re-gate). Timeout → stay `pending`, never auto-send.

### Safety

- Bound SQL params; read-only DB for lookup  
- Idempotency on `(order_id, run_id)`  
- One-shot approval tokens so retries cannot double-send  
- Persist run state so approval can resume later  

### Deliverable

Full design written to:

`outputs/refund-agent-design.md`

Covers architecture, tools, state schema, SQL shape, workflow steps, approval UX, failure modes, observability, and acceptance criteria. Payment-processor refund is out of scope for v1 (same approval pattern if added later).

---

## Artifacts written

1. `transcript.md` (this file)  
2. `refund-agent-design.md`

## Paths confirmed

```
/Users/cristoferbatschauer/apps/nextstage/skills/ns-agent-engineering-workspace/iteration-1/eval-2-refund-agent/without_skill/outputs/transcript.md
/Users/cristoferbatschauer/apps/nextstage/skills/ns-agent-engineering-workspace/iteration-1/eval-2-refund-agent/without_skill/outputs/refund-agent-design.md
```
