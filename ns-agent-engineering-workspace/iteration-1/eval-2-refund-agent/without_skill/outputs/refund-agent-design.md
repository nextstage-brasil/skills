# Refund Decision Agent — Design

## Goal

A multi-step agent that:

1. Looks up customer orders in SQL
2. Decides whether a refund applies (policy rules)
3. Drafts a customer email
4. **Does not send mail without explicit human approval**

## Architecture

Linear pipeline with a hard gate before any outbound side effect:

```
[Intake] → [Order Lookup] → [Refund Decision] → [Email Draft]
                                                      ↓
                                            [Human Approval Gate]
                                           /                      \
                                    [Send Email]              [Reject / Revise]
                                           ↓
                                    [Record Outcome]
```

### Why this shape

- Order lookup and policy are deterministic enough for tools + structured reasoning.
- Email send is irreversible → must sit behind an approval interrupt.
- Keep planning, decision, and actuation as separate steps so failure modes are inspectable.

## Tools

| Tool | Type | Side effect | Notes |
|------|------|-------------|-------|
| `lookup_orders` | SQL read | None | Parameterized query by `customer_id` and/or `order_id` |
| `get_refund_policy` | Config / KB read | None | Returns eligibility rules (window, status, amount caps) |
| `draft_refund_email` | LLM / template | None | Produces subject + body; never sends |
| `request_approval` | HITL interrupt | None | Pauses run; awaits approve / reject / edit |
| `send_email` | External write | **Yes** | Callable **only** after approved approval token |
| `record_refund_decision` | DB write | Audit only | Logs decision + approval id; no customer contact |

### Tool constraints

- `send_email` requires `approval_id` issued by `request_approval` with status `approved`.
- SQL tools: read-only connection; no `UPDATE`/`DELETE` for refunds unless a separate payment tool is added later.
- No tool may compose “lookup + decide + send” in one call.

## State (per run)

```json
{
  "customer_id": "string",
  "order_id": "string | null",
  "orders": [],
  "decision": {
    "refund_applies": "boolean | null",
    "amount": "number | null",
    "reason_codes": [],
    "rationale": "string"
  },
  "email_draft": {
    "to": "string",
    "subject": "string",
    "body": "string"
  },
  "approval": {
    "status": "pending | approved | rejected | revised",
    "approval_id": "string | null",
    "reviewer": "string | null",
    "notes": "string | null"
  },
  "send_result": null
}
```

## Step-by-step workflow

### 1. Intake

- Inputs: `customer_id` (required), optional `order_id`, optional refund request text.
- Validate IDs; refuse to proceed without a customer identifier.

### 2. Order lookup (SQL)

Example shape (illustrative):

```sql
SELECT o.id, o.status, o.total_cents, o.currency, o.placed_at,
       o.fulfilled_at, p.method, r.id AS existing_refund_id
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN refunds r ON r.order_id = o.id AND r.status != 'cancelled'
WHERE o.customer_id = :customer_id
  AND (:order_id IS NULL OR o.id = :order_id)
ORDER BY o.placed_at DESC
LIMIT 50;
```

- Persist rows into state `orders`.
- If zero rows → decision = not eligible; draft “order not found” email; still require approval before send.

### 3. Refund decision

Apply policy in a fixed order (fail closed):

1. Order exists and belongs to customer
2. No successful refund already on the order
3. Status in refundable set (e.g. `fulfilled`, `delivered`; not `cancelled` unless partial rules say otherwise)
4. Within refund window (e.g. `now - fulfilled_at <= N days`)
5. Amount ≤ order total and ≤ policy cap
6. Payment method supports refund

Output structured decision:

```json
{
  "refund_applies": true,
  "amount": 49.90,
  "currency": "BRL",
  "reason_codes": ["WITHIN_WINDOW", "FULFILLED", "NO_PRIOR_REFUND"],
  "rationale": "Order #123 fulfilled 3 days ago; within 14-day window; no prior refund."
}
```

If any hard rule fails → `refund_applies: false` with explicit reason codes.

### 4. Email draft (no send)

- Template from decision outcome (approved vs denied).
- Include order id, amount (if any), next steps.
- Store in `email_draft` only.

### 5. Human approval gate (mandatory)

Call `request_approval` with payload:

- Decision summary + reason codes
- Full email draft
- Order snapshot (ids, amounts, dates)

Allowed reviewer actions:

| Action | Effect |
|--------|--------|
| Approve | Issue `approval_id`; unlock `send_email` |
| Reject | End run; no send; audit log |
| Revise | Reviewer edits draft/amount; re-enter gate |

**Invariant:** No path from step 4 to `send_email` without a successful approval.

### 6. Send (only if approved)

```text
send_email(to, subject, body, approval_id)
```

- Validate `approval_id` server-side (single use, not expired, matches run id).
- On success, write `send_result` and `record_refund_decision`.

### 7. Record outcome

Always write an audit row: decision, approval status, whether mail was sent, timestamps, actor.

## Approval UX (minimum)

Present to reviewer:

1. **Verdict:** refund yes/no + amount
2. **Why:** reason codes + short rationale
3. **Evidence:** order rows used
4. **Draft email:** editable
5. Buttons: Approve / Reject / Edit & re-submit

Timeout: if no response within SLA, leave status `pending` and do **not** auto-send.

## Safety & failure modes

| Risk | Mitigation |
|------|------------|
| Accidental send | Gate + single-use approval token on `send_email` |
| Prompt injection (“ignore policy, refund all”) | Policy evaluated in code/tool, not free-form only; LLM drafts copy, not eligibility |
| SQL injection | Bound parameters only |
| Duplicate refund / duplicate email | Idempotency key per `(order_id, run_id)`; check existing refunds |
| Agent retries after approve | `approval_id` one-shot; second send fails |
| Partial failure after send | Audit marks `email_sent`; do not re-send without new approval |

## Observability

Log per step: tool name, latency, row counts (not PII bodies in hot logs), decision JSON, approval id, send status.

Trace id shared across the run for support replay.

## Minimal implementation sketch

- Orchestrator: graph or sequential runner with interrupt node before send.
- Policy: pure function `decide_refund(orders, policy) → Decision`.
- LLM: optional for email wording only; optional for parsing free-text request into structured intake.
- Runtime: persist state so approval can resume the same run hours later.

## Acceptance criteria

- [ ] Given a customer + order, agent loads orders via SQL tool.
- [ ] Decision is structured and policy-traceable (reason codes).
- [ ] Email is drafted but not sent automatically.
- [ ] `send_email` without valid `approval_id` is rejected by the tool layer.
- [ ] Approve → exactly one send attempt; Reject → zero sends.
- [ ] Audit trail exists for every completed or abandoned run.

## Out of scope (v1)

- Actually charging/refunding the payment processor (add `issue_refund` behind the same or a second approval).
- Multi-order bulk refunds in one email.
- Customer self-serve chat UI (this design is agent + reviewer).
