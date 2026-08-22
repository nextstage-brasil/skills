# Task decomposition — subtask grid

The three questions are answered **per subtask**, never for the whole product. Decompose first, classify second.

## Skip conditions

Skip decomposition (state it in one line, still fill the grid from what was given) when:

- The user already delivered a broken-down flow (named steps or existing nodes).
- The scope is a single indivisible action (one extraction, one draft, one lookup).

## Step A — Propose the grid

From context already given, propose **4–8 subtasks**. Hard cap 8; merge finer steps into the row that owns the decision. Under 4 usually means the flow was not read end-to-end.

Cut the flow by **discrete verbs** on the path input → output: fetch, extract, classify, route, draft, validate, publish. One row per verb that changes the artifact or the decision.

Label each row:

| Type | Meaning | Usual component |
| ---- | ------- | --------------- |
| Extraction / interpretation | Reads messy input, produces meaning | Agent |
| Business decision | Applies policy to structured input | Rule (orchestrator) |

Present the grid **once**, in a single turn, and ask the user to confirm, cut, rename, or add. This is the only bundled turn in the interview.

## Step B — Classify each row

Then walk rows one at a time with the standard one-question-per-turn format:

| Q | Answer | Component |
| - | ------ | --------- |
| P1 — finite rule covers >90% of **real** (observed) cases? | yes | Deterministic rule. Stop. |
| P2 — error costly **and** irreversible? | yes | Agent drafts; approval gate before the action (**sync** — no undo). |
| P3 — behavior changes with input context? | yes | Autonomous agent + full observability. |
| P3 | no | Deterministic rule — an enumerable 40-branch tree is still a rule. |

Costly but **reversible** → async review, not a sync gate.

Rows that mix a rule with a conditional gate (e.g. route by criticality) do not map to one boolean triple. Record the component as `rule + conditional gate` and note the limitation — do not force a triple.

## Step C — Aggregate

- Rows classified **agent** → size memory / planning / tools / action per row, then apply one-vs-many (`decision-pillars.md`). Agent rows → Model **nodes**.
- Rows classified **rule** → orchestrator **nodes** or plain code; they are not nodes to design as agents. Rule and agent nodes live in the same compiled graph.
- Rows with a gate → HITL placement (sync vs async) in the report constraints.
- Order between rows → concurrency (data dependence vs calendar order).

Classification is not permanent: a stable pattern in the logs can turn an agent row into a rule; growing exceptions can turn a rule row into an agent.

## Reverse mode (existing codebase)

When the system already exists, derive candidate rows from code instead of asking:

| Evidence | Candidate row |
| -------- | ------------- |
| Graph node / crew task | one row |
| Deterministic tool or service call | one row, likely `rule` |
| `interrupt` / approval endpoint | gate on the adjacent row |
| Conditional edge / router | `rule + conditional gate` |

Infer P1/P2/P3 (yes/no/n/a) from code plus `docs/context/system-reverse-spec.md` or `brownfield-map.md` when present. Mark unconfirmed rows `status: inferred` until user confirms; confirmation flips to `confirmed`. Grill only what code cannot prove — cost of error, reversibility, real-case coverage.
