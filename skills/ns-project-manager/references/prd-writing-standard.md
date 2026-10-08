# PRD writing standard

The PRD is a formal document. Its readers are the development team, QA, the client's homologation team and the approvers. None of them were in the conversation. Write so that each of them can act on the document alone.

## Voice

- **Declarative, present tense.** "The system lists…", "Only the Supervisor profile can change…". Not "we will", "the idea is", "it was agreed that", "should probably".
- **Decisions as facts.** A decided point is stated as the rule. The reasoning and the history of how it was decided do not belong in the requirement (§14 logs date and decider only).
- **One meaning per term.** Every domain term an outsider could misread is defined in §16. Use the same term everywhere. No unexplained acronyms.
- **Concrete.** Name the screen, the profile, the field, the value, the message, the file. Not "the user", "properly", "quickly", "when applicable".
- **Product language.** No classes, tables, endpoints, libraries or algorithms. Engineering decides how; the PRD states what and under which rules.

## From decisions to requirement text

Every decision and every answer given in the conversation is **source material for the PRD**. Nothing decided may be lost. But the PRD never pastes a question with its answer. It **rewrites** each decision as requirement text that cannot raise a new doubt.

For each decided point:

1. Find the RF it governs (behavior, business rule, exception, or acceptance). If it governs several RFs, write it in each one, or once in a shared rule that each RF cites by id.
2. Rewrite it as a complete rule: who, when, what the system does, with which values, and what happens in the opposite case.
3. Turn it into at least one acceptance criterion with concrete data.
4. Add new terms to §16.
5. Merge answers that complement each other into one coherent rule. Resolve wording that conflicts with older text. Never leave both versions.

| Raw answer in chat | In the PRD |
|---|---|
| "Q7: yes, recommended" (tie → fewest items, then oldest due date) | **RN-06.2** When more than one combination of invoices matches the payment amount, the system suggests the one with the fewest invoices. If still tied, it suggests the one containing the invoice with the oldest due date. If still tied, it suggests none and the payment goes to the Unmatched tab. + an acceptance criterion with example amounts |
| "only Support changes it, the client just sees it" | **Actors:** Fivelabs Support (changes the posting mode). Client operator (views the configured mode; cannot change it). **Exceptions:** an operator opens the setting → the field is read-only. |
| "1 cent difference? goes to unmatched" | **RN-05.3** The combination must match the payment amount exactly, to the cent. No tolerance applies. A difference of any value, including R$ 0.01, sends the payment to the Unmatched tab without a suggestion. |

A question's id, its recommendation, the round, and who answered stay in the register (§14 may log date, decision and decider). The PRD carries the **rule**.

## RF structure

Each functional requirement is a self-contained unit. Use this structure (translate labels to the document language):

```markdown
### RF-NN: {verb + object, e.g. "Suggest the invoices that make up a batch payment"} — {P0 | P1 | P2}

**Story:** As a {named persona}, I want {action}, so that {benefit}.

**Actors:** {profiles that trigger, see, approve}
**Trigger and preconditions:** {when it happens; what must already exist}

**Behavior:**
1. {what the system does, step by step, as the user observes it}
2. {…}

**Business rules:**
- **RN-NN.1** {rule with exact values: limits, rounding, tolerance, tie-break, defaults for existing customers, who may, which date, undo}
- **RN-NN.2** {…}

**Exceptions:**
- {condition} → {what the system does and shows; exact message when relevant}

**Inputs and outputs:** {what the user provides; what the system records or exports}

**Acceptance criteria:**
- [ ] **Given** {context with concrete data}, **when** {action}, **then** {observable result}.
- [ ] **Given** {edge or error context}, **when** {action}, **then** {observable result}.

**Supports:** {OBJ-NN}
```

Rules:

- **Business rules** carry the decisions: values, rounding, tolerance, ties, partial and duplicate cases, defaults for current customers, permissions, undo, dates and calendars, what is exported. A decision that exists only in §14 or in chat is missing.
- **Acceptance criteria are the homologation script.** Use example values when the rule involves numbers or dates ("Given a batch of R$ 1,250.00 and invoices of R$ 500.00, R$ 750.00 and R$ 1,250.00…"). Then is observable: screen state, message, record, exported line. Never "works correctly".
- **Exceptions** cover at least: nothing qualifies, no permission, invalid or missing input, and every edge the business rules name.
- Drop a label only when it truly has nothing (e.g. no exceptions beyond the acceptance criteria). Never write "—" for a rule that was simply not decided; that is an open question.
- **Supports** points to objectives only. Do not cite internal working sources ("previous PRD §6.1", "Feature 001 of the budget", "round 3", "transcript line 40"). When a stakeholder or a client document originated a rule and the reader needs to know it, name it in prose ("as required by the client's accounting policy").

## Forbidden content (process leak)

None of the following may appear anywhere in the PRD. They belong in chat or in the decision register.

| Category | Examples of forbidden text |
|---|---|
| Conversation and rounds | "round 3", "as discussed", "the client answered", "after three rounds", "conforme conversado", "na rodada anterior" |
| Analysis workflow | "Readiness", "Ready for build", "Draft → Validated", "developer lens", "coverage", "D1–D14", "C-NN", "conflict", "proposal", "Recommended", "Recomendado", "premissa do analista" |
| Blocking and sequencing of the analysis | "blocks the start of phase 1: C3, C4…", "the others can be confirmed during the build", "pending validation before Design", "Bloqueia" |
| Other working artifacts | "the budget must be recounted based on this PRD", function points, hours, price, "orçamento", "Feature 001", "previous PRD", "Seq. 7", estimate status |
| Notes to the reader | "TODO", "check with…", "to be confirmed with the dev team", "the analyst assumed", "rascunho analítico", "requires human review before entering a sprint" |
| Hedging | "probably", "maybe", "we believe", "it is expected that" applied to a rule |

Allowed: §13 Open questions in a Draft the human asked for, written as neutral questions ("Which profiles can revert a discarded receipt?") with the affected RF and the owner. No recommendations, no blocking tiers, no deadlines invented by the analyst.

## Outside-reader check

Before delivering, read each RF as a developer and as a QA analyst who joined the project today and has only this document.

For each RF ask:

1. Can I tell who does what, when, and what the system shows?
2. Can I implement every rule without asking the business anything?
3. Can I run every acceptance criterion and decide pass or fail?
4. Is every term defined, either here or in §16?
5. Does anything refer to a conversation, an analysis step or another working document?

Any "no" on 1–4 is a missing business decision: send it to the chat proposal batch. Any "yes" on 5 is a process leak: rewrite it out.

Report in chat, not in the document: `Outside-reader check: {n} RFs pass, {m} missing decisions sent back (…)`.
