<!--
TEMPLATE METADATA (skill only — strip this whole comment from the final document)
template: prd
template_version: 2.0
profiles: [small-feature, new-product, ai-data, client-project]

FILL RULES
- {field}                 placeholder to fill.
- [REQUIRED]               section always present. Never leave it blank.
- [OPTIONAL]               omit the whole section when there is no sourced information.
- <!-- prd-profile: X -->  include only when profile X is active.
- <!-- hint: ... -->       fill instruction. Remove every HTML comment from the final document.
- The PRD is a formal document for readers outside the conversation: references/prd-writing-standard.md.
- Decisions are closed in chat first (references/decision-coverage.md). Every decided register row is rewritten into the RF it governs as complete requirement text (prd-writing-standard.md → From decisions to requirement text). Never paste question/answer pairs.
- Gap token only in a Draft the human explicitly asked for: TO BE DEFINED (EN) / A DEFINIR (PT), plus one neutral §13 question.
- Never invent metrics, dates, names, baselines, or priorities.
- small-feature (default): sections 1, 2, 3, 4, 6, 11, 13, 14 only.
- new-product: required sections plus any optional section that has sourced data, plus section 15.
- ai-data: include section 9.
- client-project: include section 10.
- Section 16 (Glossary): any profile, only when the input uses domain terms an implementer could misread.
- Profiles combine. Example: client project with AI = client-project + ai-data.
- Stable ids: OBJ-NN (objectives), RF-NN (functional requirements), RN-NN.n (business rules), NFR-NN (non-functional), Q-NN (open questions, Draft only).
- Never in the document: rounds, proposals, readiness, coverage, dimension codes, conflicts, blocking lists, budget/FP/hours, notes to the reader.
-->

# PRD: {product_or_feature_name}

| Field | Value |
|---|---|
| **Owner (PM/PO)** | {owner} |
| **Status** | {draft \| in review \| approved \| in development \| delivered} |
| **Version** | {version_san} |
| **Target release** | {date_or_milestone} |
| **Last updated** | {YYYY-MM-DD} |
| **Stakeholders** | {names and roles} |
| **Approvers** | {names and roles who sign off} |
| **Links** | {epic/issue, prototype, doc folder} |

---

## 1. Overview [REQUIRED]

<!-- hint: 2–3 sentences. What it is, for whom, and why now. No solution design. -->

{executive_summary}

---

## 2. Context and problem [REQUIRED]

<!-- hint: describe the pain without naming the solution. Evidence only from input (data, feedback, tickets). -->

- **Problem:** {problem}
- **Who is affected:** {affected_audience}
- **Current workaround:** {how it is handled today, or gap token}
- **Evidence:** {data, quotes, ticket volume, research}
- **Impact of not solving:** {consequence}

---

## 3. Objectives and success metrics [REQUIRED]

<!-- hint: each objective needs one metric. Type = primary (what must move) or guardrail (what must not get worse).
     Guardrail rows only when the input names one. Missing baseline, target, date, or measurement source = gap token, not a guessed value. -->

| ID | Objective | Metric | Type | Baseline | Target | Due | Measured by |
|---|---|---|---|---|---|---|---|
| OBJ-01 | {objective_1} | {metric} | {primary \| guardrail} | {current_value} | {target} | {date} | {data source or event} |

---

## 4. Scope [REQUIRED]

<!-- hint: In scope = one line per capability, mapped to RF ids. Out of scope = explicit non-goals for this version, with the reason when the input gives one. Do not invent extras. -->

**In scope**

- {capability_1} — RF-01

**Out of scope (non-goals)**

- {out_of_scope_1} — {reason_or_later_version}

---

## 5. Personas and use cases [OPTIONAL]

<!-- hint: who decides or uses. Never a generic "user". -->

| Persona | Context | Primary need |
|---|---|---|
| {persona} | {situation} | {need} |

---

## 6. Functional requirements [REQUIRED]

<!-- hint: one observable behavior per RF; independently testable.
     Priority P0 (must), P1 (should), P2 (could) only when the input states it. Otherwise gap token on the priority, not a default P0.
     Every requirement has testable acceptance in Given / When / Then (Portuguese output: Dado / Quando / Então).
     Happy path plus at least one error or edge scenario (no permission, empty, invalid input, limit, duplicate) — only edges the input supports or the gap token.
     Then is observable (screen state, message, record, notification). Never "correctly" or "properly".
     Supports = OBJ ids only. No citations of chat rounds, earlier drafts, the budget or its features.
     Structure and rules: references/prd-writing-standard.md → RF structure. Each RF must make sense to a reader outside the conversation. -->

### RF-01: {verb + object} — {P0 | P1 | P2}

**Story:** As a {persona}, I want {action}, so that {benefit}.

**Actors:** {profiles that trigger, see, approve}
**Trigger and preconditions:** {when it happens; what must already exist}

**Behavior:**

1. {what the system does, as the user observes it}

**Business rules:**

- **RN-01.1** {decided rule with exact values}

**Exceptions:**

- {condition} → {what the system does and shows}

**Inputs and outputs:** {what the user provides; what the system records or exports}

**Acceptance criteria:**

- [ ] **Given** {context with concrete data}, **when** {action}, **then** {observable result}.
- [ ] **Given** {edge or error context}, **when** {action}, **then** {observable result}.

**Supports:** {OBJ-01}

<!-- repeat the RF-NN block per in-scope capability -->

---

## 7. Non-functional requirements [OPTIONAL]

<!-- hint: only categories that appear in the input; delete the other rows. Measurable value when the input has one. Do not invent latency, SLA, or legal basis. -->

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | {example: p95 response under a stated bound} |
| NFR-02 | Security and access | {roles, authentication, audit} |
| NFR-03 | Privacy / LGPD | {personal data, legal basis, retention} |
| NFR-04 | Accessibility | {standard named in the input} |
| NFR-05 | Integrations and constraints | {systems, APIs, mandated platform or stack named in the input} |
| NFR-06 | Observability and analytics | {events, logs, or dashboards needed to measure section 3} |
| NFR-07 | Availability and support | {SLA, monitoring} |

---

## 8. Flows and design [OPTIONAL]

<!-- hint: links, not long descriptions. -->

- **Wireframes / prototype:** {link}
- **Main flow:** {link or diagram}
- **States and edges:** {empty, error, loading, no permission}

---

## 9. Data and AI [OPTIONAL]

<!-- prd-profile: ai-data -->

<!-- hint: only for products with AI, data, or analytics in scope. -->

- **Data sources:** {origin, quality, refresh}
- **Expected model or agent behavior:** {what it must and must not do}
- **Quality and evaluation:** {eval set, metrics, thresholds — metric unit, denominator, what counts as a hit, whether "no suggestion" items count, sample, who measures}
- **Consumption and packaging:** {metered usage (credits, quota), behavior at zero balance, which plans — or gap token}
- **Guardrails and error handling:** {refusals, fallback, human escalation}
- **AI risks:** {hallucination, bias, data leak, prompt injection}

---

## 10. Client engagement [OPTIONAL]

<!-- prd-profile: client-project -->

<!-- hint: not a commercial quote. No money, hours, FP or budget references in the PRD. -->

- **Client and approvers:** {names, roles}
- **Contract assumptions:** {fixed scope, hours, SLA — sourced only}
- **Client acceptance:** {milestones and approval conditions}

---

## 11. Dependencies, risks, and assumptions [REQUIRED]

| Type | Description | Likelihood | Impact | Mitigation / owner |
|---|---|---|---|---|
| Dependency | {description} | — | — | {owner} |
| Risk | {description} | {low \| medium \| high} | {low \| medium \| high} | {mitigation} |
| Assumption | {description} | — | — | {how to validate} |

---

## 12. Release plan [OPTIONAL]

<!-- hint: rollout, flag, rollback, and migration only when the input states them. -->

| Phase / milestone | Scope (RF ids) | Target date | Done when |
|---|---|---|---|
| {phase_or_mvp} | {RF-01, RF-02} | {date} | {criterion} |

- **Rollout:** {feature flag, pilot group, percentage, or big bang}
- **Rollback:** {how to revert}
- **Data migration:** {existing data affected}

**Launch criteria (go/no-go):**

- [ ] {criterion_1}

---

## 13. Open questions [REQUIRED]

<!-- hint: Approved PRD: write "None." (PT: "Nenhuma.").
     Draft the human explicitly asked for: one row per gap token, written as a neutral question.
     No recommendations, no blocking tiers, no dimension codes, no conflicts, no analysis status. Those stay in chat. -->

| ID | Question | Affects | Owner |
|---|---|---|---|
| Q-01 | {neutral question} | {RF-01} | {who decides} |

---

## 14. Decisions and version log [REQUIRED]

**Decisions**

<!-- hint: log only. Each decision is already written inside the RF it governs. No round numbers, no proposals. -->

| Date | Decision | Affects | Decided by |
|---|---|---|---|
| {date} | {decision} | {RF-01} | {person or role} |

**Approvals**

| Role | Name | Date | Status |
|---|---|---|---|
| {role} | {name} | {date} | {pending \| approved \| changes requested} |

**Version history**

| Version | Date | Author | Changes |
|---|---|---|---|
| {version_san} | {date} | {author} | First draft |

---

## 15. Market, competition, and go-to-market [OPTIONAL]

<!-- prd-profile: new-product -->

<!-- hint: only for a new product or a large initiative. Facts from input only. -->

- **Market context:** {who buys and why now}
- **Alternatives:** {competitor or current workaround named in the input}
- **Go-to-market:** {channel, audience, launch constraint}

---

## 16. Glossary [OPTIONAL]

<!-- hint: domain terms, acronyms, and status names an engineer or coding agent could misread. Definitions from input only. -->

| Term | Definition |
|---|---|
| {term} | {definition} |
