<!--
TEMPLATE METADATA (skill only — strip this whole comment from the final document)
template: prd
template_version: 1.1
profiles: [small-feature, new-product, ai-data, client-project]

FILL RULES
- {field}                 placeholder to fill.
- [REQUIRED]               section always present. Never leave it blank.
- [OPTIONAL]               omit the whole section when there is no sourced information.
- <!-- prd-profile: X -->  include only when profile X is active.
- <!-- hint: ... -->       fill instruction. Remove every HTML comment from the final document.
- Missing required fact: write the gap token and add a row in Open questions.
  English output: TO BE DEFINED. Portuguese output: A DEFINIR.
- Never invent metrics, dates, names, baselines, or priorities.
- small-feature (default): sections 1, 2, 3, 4, 6, 11, 13, 14 only.
  13 and 14 stay: they are required and they are where gaps and decisions go.
- new-product: required sections plus any optional section that has sourced data, plus section 15.
- ai-data: include section 9.
- client-project: include section 10.
- Section 16 (Glossary): any profile, only when the input uses domain terms an implementer could misread.
- Profiles combine. Example: client project with AI = client-project + ai-data.
- Stable ids: OBJ-NN (objectives), RF-NN (functional requirements), NFR-NN (non-functional), Q-NN (open questions).
-->

# PRD: {product_or_feature_name}

| Field | Value |
|---|---|
| **Owner (PM/PO)** | {owner} |
| **Status** | {draft \| in review \| approved \| in development \| delivered} |
| **Ready for build** | {yes \| no — blocked by Q-NN} |
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
     Supports = OBJ ids. Source = who or what in the input stated it. -->

### RF-01: {title} — {P0 | P1 | P2 | gap token}

**Story:** As a {persona}, I want {action}, so that {benefit}.

**Supports:** {OBJ-01} · **Source:** {stakeholder, transcript, ticket}

**Acceptance criteria:**

- [ ] **Given** {context}, **when** {action}, **then** {expected_result}.
- [ ] **Given** {error_or_edge_context}, **when** {action}, **then** {error_or_edge_behavior}.

**Business rules:** {rules_or_exceptions_or_gap_token}

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
- **Quality and evaluation:** {eval set, metrics, thresholds}
- **Guardrails and error handling:** {refusals, fallback, human escalation}
- **AI risks:** {hallucination, bias, data leak, prompt injection}

---

## 10. Client engagement [OPTIONAL]

<!-- prd-profile: client-project -->

<!-- hint: not a commercial quote. Money, hours, and FP stay in commercial-budget mode. Here, only what the input already states. -->

- **Client and approvers:** {names, roles}
- **Contract assumptions:** {fixed scope, hours, SLA — sourced only}
- **Budget / estimate:** {stated figure or range, else gap token}
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

<!-- hint: every gap token in the sections above gets one row here. Blocks = RF/OBJ ids that cannot be built or measured until answered; "—" when none.
     Any open row that blocks an in-scope RF sets "Ready for build" to "no". -->

| ID | Question | Blocks | Owner | Due | Status |
|---|---|---|---|---|---|
| Q-01 | {question} | {RF-01 \| OBJ-01 \| —} | {who} | {date} | open |

---

## 14. Decisions and version log [REQUIRED]

**Decisions**

| Date | Decision | Reason | Decided by |
|---|---|---|---|
| {date} | {decision} | {reason} | {person} |

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
