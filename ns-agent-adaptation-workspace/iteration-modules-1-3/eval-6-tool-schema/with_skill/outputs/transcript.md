# Eval 6 — tool-schema (with_skill)

**Initial context (user):** Agent tools: one named search and another also basically search, both take free-text status. Lock the tool design.

**Mode:** Grill-me with auto-accept (user accepts every Recommended answer until lock).

---

## Interview

### Opening

Foundation-model adaptation interview. One question per turn. I'll recommend an answer each time; you confirm to lock.

---

**Q1:** What is the overall objective of this agent — what business outcome must it achieve?

**Recommended answer:** An internal warehouse-ops copilot that helps fulfillment staff answer "where is my order?" and "do we have stock?" in one conversational turn, without opening two separate admin UIs — rationale: the duplicate `search` tools map to two distinct lookup domains (orders vs inventory) that staff currently chase manually.

**Example (this use case):** A picker asks "show open orders for SKU-4421 and lots on hand in aisle B" and expects a single reply with both result sets.

**User reply:** Yes — accepted.

**Locked:** Objective = unified conversational lookup for fulfillment staff across orders and inventory.

---

**Q2:** End-to-end journey in one sentence — what goes in and what comes out?

**Recommended answer:** Input = natural-language question plus optional order ID / SKU / aisle hint; output = structured answer citing matching orders and inventory lots with counts, never raw API dumps — rationale: caps token load and forces the model to synthesize, not parrot tool JSON.

**Example (this use case):** Input: "Any delayed orders for customer ACME and stock for widget-7?" → Output: "2 orders (ORD-991 pending_pick, ORD-992 packed); 14 units in LOT-W7-A3 (available)."

**User reply:** Yes — accepted.

**Locked:** I/O = NL question (+ optional identifiers) → synthesized dual-domain lookup answer.

---

**Q3:** What does "done" mean — how will you measure success before choosing any adaptation technique?

**Recommended answer:** Functional correctness on a 30-case golden set: correct domain chosen (orders vs inventory vs both), correct status filter applied, zero hallucinated IDs; usefulness threshold ≥ 90% pass; business link = mean time to answer drops from ~4 min (two UIs) to < 30 s — rationale: Evaluation gate must lock before Agent.

**Example (this use case):** Golden case #12: "orders stuck in packed" must call order search with `fulfillment_status=packed`, not inventory.

**User reply:** Yes — accepted.

**Locked:** Evaluation = 30-case golden set, ≥90% functional pass, MTTA < 30 s target.

---

**Q4:** Are current failures primarily information-based (missing facts), behavior-based (format/instruction), both, or neither?

**Recommended answer:** **Both** — information-based because staff need live WMS data the model lacks; behavior-based because early prototypes pick the wrong `search` tool and pass free-text status strings the API rejects — rationale: info gap needs retrieval tools; behavior gap shows up as wrong-tool / wrong-arg, which is schema design not prompt tuning alone.

**Example (this use case):** Model calls generic `search` with `status="waiting to ship"` → 400 from API expecting `pending_pick | packed | shipped`.

**User reply:** Yes — accepted.

**Locked:** Failure diagnosis = **both** (live data + tool-selection / arg-format errors).

---

**Q5:** (Evaluation gate) Confirm metrics are locked before adaptation — any change?

**Recommended answer:** Keep as locked — no change — rationale: blocking gate satisfied.

**Example (this use case):** Same 30-case rubric stands.

**User reply:** Yes — accepted.

**Locked:** Evaluation gate = locked.

---

**Q6:** (Prompt gate) Can in-context examples + system instructions fix wrong-tool and status-arg errors without tools?

**Recommended answer:** **No — Prompt exhausted for arg surface** — examples help tone but cannot fix ambiguous tool names at selection time; proceed past Prompt — rationale: two similarly named search tools will keep colliding under load.

**Example (this use case):** Even with 5-shot examples, `search` vs `search` sibling still ties on embedding similarity.

**User reply:** Yes — accepted.

**Locked:** Prompt = tried; insufficient for tool disambiguation.

---

**Q7:** (RAG gate) Is a passive corpus retrieval path enough without agentic tool use?

**Recommended answer:** **RAG alone insufficient** — staff need live WMS state, not document retrieval; RAG may supplement SOP docs later but does not replace lookups — rationale: information gap is dynamic operational data.

**Example (this use case):** "How many units in LOT-8812?" requires live inventory API, not handbook search.

**User reply:** Yes — accepted.

**Locked:** RAG = supplementary only; not primary path.

---

**Q8:** (Agent gate) Must the system perceive, decide, act with tools, and learn from outcomes?

**Recommended answer:** **Yes — Agent justified** — must choose order vs inventory lookup (or both), apply filters, merge results; no single deterministic pipeline covers arbitrary NL — rationale: multi-domain routing + live reads beyond passive RAG.

**Example (this use case):** "Delayed ACME orders and stock for their SKUs" → plan: order search by customer + inventory search by SKU list.

**User reply:** Yes — accepted.

**Locked:** Agent = justified (multi-domain live lookup).

---

**Q9:** (Fine-Tune gate) Is behavior failure closed by schema fixes alone, or is Fine-Tune needed now?

**Recommended answer:** **Defer Fine-Tune** — fix typed schemas and enums first; re-measure golden set; Fine-Tune only if format/instruction failures remain after schema lock — rationale: cheaper gate order.

**Example (this use case):** After renaming tools and closing status enums, wrong-arg rate should drop without weight update.

**User reply:** Yes — accepted.

**Locked:** Fine-Tune = deferred pending post-schema eval.

---

**Q10:** You proposed two tools both named `search` with free-text `status`. Against the full bound tool set, what should each tool be called?

**Recommended answer:** Rename to `search_fulfillment_orders` and `search_warehouse_inventory_lots` — rationale: per `tool-schema-design.md` name disambiguation, generic `search` + similar sibling = selection collision; names must state domain.

**Example (this use case):** "orders stuck in packed" must route to `search_fulfillment_orders`, not inventory search.

**User reply:** Yes — accepted.

**Locked:** Tool names = `search_fulfillment_orders`, `search_warehouse_inventory_lots` (no generic `search`).

---

**Q11:** For `search_fulfillment_orders`, what is the one-line description (for + not-for)?

**Recommended answer:** "Look up customer fulfillment orders by ID, customer, SKU, or date range; filter by fulfillment lifecycle status. Not for warehouse lot/bin quantities or stock-on-hand." — rationale: domain-specific description cuts confusion with inventory sibling.

**Example (this use case):** Question about "units on shelf" → model should reject this tool per description.

**User reply:** Yes — accepted.

**Locked:** Order tool description = orders only, explicitly not inventory.

---

**Q12:** For `search_fulfillment_orders`, `status` was free text. What is the closed set?

**Recommended answer:** Replace free-text `status` with enum `fulfillment_status`: `pending_pick | packed | shipped | delivered | cancelled | returned` — rationale: WMS exposes fixed lifecycle states; free text → wrong-arg failures.

**Example (this use case):** "waiting to ship" is not a valid API value; map user intent to `pending_pick` or `packed` via model reasoning, but tool arg must be enum member.

**User reply:** Yes — accepted.

**Locked:** Order tool arg `fulfillment_status` = enum (6 values).

---

**Q13:** What declared return shape does `search_fulfillment_orders` advertise?

**Recommended answer:** `{ orders: [{ order_id, customer_id, sku, qty, fulfillment_status, promised_ship_date }], total_count, not_found: boolean }` — rationale: model must not infer shape from examples; not-found uses same keys with `orders: []` and `not_found: true`.

**Example (this use case):** No match for ORD-XXXX → `{ orders: [], total_count: 0, not_found: true }`.

**User reply:** Yes — accepted.

**Locked:** Order tool return shape declared as above.

---

**Q14:** For `search_warehouse_inventory_lots`, description and disambiguation?

**Recommended answer:** "Look up warehouse inventory lots by SKU, lot_id, aisle, or bin; filter by lot availability status. Not for customer order tracking or shipment state." — rationale: mirrors order tool pattern; states not-for against sibling.

**Example (this use case):** "ORD-991 status" must not use this tool.

**User reply:** Yes — accepted.

**Locked:** Inventory tool description = lots/stock only, not orders.

---

**Q15:** For `search_warehouse_inventory_lots`, `status` was free text. What is the closed set?

**Recommended answer:** Replace with enum `lot_status`: `available | reserved | quarantine | expired` — rationale: inventory lot states are a different closed set than order fulfillment; never share one `status` enum across both tools.

**Example (this use case):** `status="on hold"` → invalid; quarantine is the correct enum if QA hold.

**User reply:** Yes — accepted.

**Locked:** Inventory tool arg `lot_status` = enum (4 values).

---

**Q16:** Declared return shape for `search_warehouse_inventory_lots`?

**Recommended answer:** `{ lots: [{ lot_id, sku, aisle, bin, qty_on_hand, lot_status, expires_on }], total_count, not_found: boolean }` — rationale: parallel contract to order tool; explicit empty-not-found.

**Example (this use case):** Unknown SKU → `{ lots: [], total_count: 0, not_found: true }`.

**User reply:** Yes — accepted.

**Locked:** Inventory tool return shape declared as above.

---

**Q17:** Schema checklist before lock — do both tools pass all boxes?

**Recommended answer:** **Yes after Q10–Q16** — checklist per `tool-schema-design.md`: (1) domain description for + not-for ✓, (2) enum on fixed sets ✓, (3) declared return ✓, (4) Write gate N/A — both Knowledge augmentation reads ✓, (5) no P2 write gate needed ✓.

**Example (this use case):** Pre-checklist state (two `search`, free-text status) would fail boxes 1, 2, and 3.

**User reply:** Yes — accepted.

**Locked:** Tool schema checklist = pass; tools lockable.

---

**Q18:** Taxonomy tag for each tool?

**Recommended answer:** Both **Knowledge augmentation** — read-only WMS lookups feeding missing live context; no durable external writes — rationale: `tool-taxonomy.md` primary tag by side effect.

**Example (this use case):** Neither tool creates shipments or adjusts stock.

**User reply:** Yes — accepted.

**Locked:** Category = Knowledge augmentation (both).

---

**Q19:** Planning contract — plan before execute?

**Recommended answer:** Emit plan listing which search tool(s) and enum filters before any call; validator checks tool names ∈ allowed set and enum values ∈ schema; agent reports parameter values in plan — rationale: wrong-arg is top failure mode.

**Example (this use case):** Plan: "1) search_fulfillment_orders(customer_id=ACME, fulfillment_status=packed) 2) search_warehouse_inventory_lots(sku=widget-7, lot_status=available)".

**User reply:** Yes — accepted.

**Locked:** Planning = plan-first, schema validation, parameter reporting.

---

**Q20:** Memory — what persists beyond the session?

**Recommended answer:** **No long-term memory** — context window holds current thread + tool results; episodic audit log optional for compliance; no semantic user profile — rationale: retention liability; lookups are stateless per question.

**Example (this use case):** Yesterday's query not needed to answer today's stock check.

**User reply:** Yes — accepted.

**Locked:** Memory = context window + optional episodic audit; no semantic LTM.

---

**Q21:** Reality-test gate — all five checks pass?

**Recommended answer:** **Yes with MVP scope** — (1) LTM off: OK; (2) planning halved: still works for single-domain queries; (3) both tools: frequent; (4) final action: read-only reversible; (5) budget: two API reads max per turn fits latency target — rationale: gate before close.

**Example (this use case):** Simple "stock for SKU-9" needs only inventory tool — one step.

**User reply:** Yes — accepted.

**Locked:** Reality-test = pass.

---

**Q22:** Agent evaluation metrics beyond golden set?

**Recommended answer:** Track `wrong_tool_rate`, `argument_accuracy` on status enums, valid plan %, p95 latency vs 30 s SLA, cost per resolved question — rationale: separates planning vs tool failures per agent-evaluation doctrine.

**Example (this use case):** Spike in `argument_accuracy` after WMS adds `on_hold` lot status → add enum value, re-run eval.

**User reply:** Yes — accepted.

**Locked:** Agent eval metrics = wrong_tool_rate, argument_accuracy, valid plan %, latency, cost.

---

**Q23:** Guardrails and observability?

**Recommended answer:** Input: block PII export patterns; output: require cited order_id/lot_id from tool results only; log tool name, enum args, latency, not-found flags; MTTD via alert on wrong_tool_rate > 5% — rationale: read-only but customer data present.

**Example (this use case):** Model invents ORD-999 not in tool output → output guardrail rejects.

**User reply:** Yes — accepted.

**Locked:** Guardrails = input PII filter, output grounding; observability = structured tool logs + wrong_tool alert.

---

## Interview complete

Shared understanding locked across Evaluation, adaptation ladder, Agent justification, tool inventory (typed schemas), Planning, Memory, agent eval, Guardrails/Observability.

---

## Phase 1 summary (~180 words)

**Adaptation path:** Evaluation locked first (30-case golden set, ≥90% pass, MTTA < 30 s). Failures are **both** information- and behavior-based: live WMS data plus wrong-tool / wrong-arg collisions from two generic `search` tools and free-text `status`. Prompt exhausted for disambiguation; RAG cannot replace live lookups. **Agent** is justified for multi-domain NL routing. Fine-Tune deferred until post-schema measurement.

**Tool design lock:** Renamed to `search_fulfillment_orders` and `search_warehouse_inventory_lots`. Each has domain for/not-for description, distinct enums (`fulfillment_status` vs `lot_status`), and declared return shapes with explicit not-found. Schema checklist from `tool-schema-design.md` passes; both tagged Knowledge augmentation.

**Top risk:** Residual wrong-tool selection if a third search-like tool is added without renaming against the full bound set — cap MVP to these two reads.

**MVP:** Two typed read tools, plan-first validation, golden-set eval, no LTM.

**Next handoff:** `ns-agent-architecture` for framework/topology ADR once this design is approved.
