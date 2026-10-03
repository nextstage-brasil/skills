<!--
TEMPLATE METADATA (skill only — strip this whole comment from the final document)
template: prd
template_version: 1.0
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
- Profiles combine. Example: client project with AI = client-project + ai-data.
-->

# PRD: {product_or_feature_name}

| Field | Value |
|---|---|
| **Owner (PM/PO)** | {owner} |
| **Status** | {draft \| in review \| approved \| in development \| delivered} |
| **Version** | {version_san} |
| **Last updated** | {YYYY-MM-DD} |
| **Stakeholders** | {names and roles} |
| **Links** | {epic/issue, prototype, doc folder} |

---

## 1. Overview [REQUIRED]

<!-- hint: 2–3 sentences. What it is, for whom, and why it matters now. No solution design. -->

{executive_summary}

---

## 2. Context and problem [REQUIRED]

<!-- hint: describe the pain without naming the solution. Evidence only from input (data, feedback, tickets). -->

- **Problem:** {problem}
- **Who is affected:** {affected_audience}
- **Evidence:** {data, quotes, ticket volume, research}
- **Impact of not solving:** {consequence}

---

## 3. Objectives and success metrics [REQUIRED]

<!-- hint: each objective needs one metric. Missing baseline, target, or date = gap token, not a guessed number. -->

| Objective | Metric | Baseline | Target | Due |
|---|---|---|---|---|
| {objective_1} | {metric} | {current_value} | {target} | {date} |

---

## 4. Non-goals [REQUIRED]

<!-- hint: explicitly out of this version. Stops scope creep. Do not invent extras. -->

- {out_of_scope_1}

---

## 5. Personas and use cases [OPTIONAL]

<!-- hint: who decides or uses. Never a generic "user". -->

| Persona | Context | Primary need |
|---|---|---|
| {persona} | {situation} | {need} |

---

## 6. Functional requirements [REQUIRED]

<!-- hint: priority P0 (must), P1 (should), P2 (could) only when the input states it. Otherwise gap token on the priority, not a default P0.
     Every requirement has testable acceptance in Given / When / Then (Portuguese output: Dado / Quando / Então).
     Stable ids RF-01, RF-02 for QA and issues.
     Happy path plus one error or edge scenario. Then is observable. Never "correctly" or "properly". -->

### RF-01: {title} — {P0 | P1 | P2 | gap token}

**Story:** As a {persona}, I want {action}, so that {benefit}.

**Acceptance criteria:**

- [ ] **Given** {context}, **when** {action}, **then** {expected_result}.
- [ ] **Given** {error_context}, **when** {action}, **then** {error_behavior}.

**Notes:** {business_rules_or_exceptions_or_gap_token}

<!-- repeat the RF-NN block per in-scope capability -->

---

## 7. Non-functional requirements [OPTIONAL]

<!-- hint: only categories that appear in the input. Measurable value when the input has one. Do not invent latency, SLA, or legal basis. -->

| Category | Requirement |
|---|---|
| Performance | {example: p95 response under a stated bound} |
| Security and access | {roles, authentication, audit} |
| Privacy / LGPD | {personal data, legal basis, retention} |
| Accessibility | {standard named in the input} |
| Integrations | {systems and APIs named in the input} |
| Availability and support | {SLA, monitoring} |

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

## 12. Delivery plan [OPTIONAL]

| Phase / milestone | Scope (RF ids) | Target date | Done when |
|---|---|---|---|
| {phase_or_mvp} | {RF-01, RF-02} | {date} | {criterion} |

**Launch criteria (go/no-go):**

- [ ] {criterion_1}

---

## 13. Open questions [REQUIRED]

<!-- hint: every gap token in the sections above gets one row here. -->

| # | Question | Owner | Due | Status |
|---|---|---|---|---|
| 1 | {question} | {who} | {date} | open |

---

## 14. Decision and version log [REQUIRED]

**Decisions**

| Date | Decision | Reason | Decided by |
|---|---|---|---|
| {date} | {decision} | {reason} | {person} |

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
