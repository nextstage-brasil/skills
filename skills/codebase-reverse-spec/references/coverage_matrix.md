# Coverage matrix

Use during Phase 1 (plan what to investigate) and Phase 4 (confirm the spec is complete). Mark each row: **Covered** | **N/A** (with reason) | **Gap** (explicitly list in appendix or next iteration).

| Dimension | What to look for in code | Spec section |
| --------- | ------------------------ | ------------ |
| **Actors** | Who interacts with the system — humans, external systems, scheduled processes | §2 Actors |
| **Entry points** | Routes, forms, CLI, webhooks, jobs — what actions are exposed | §5 Use cases |
| **Business entities** | Core nouns the business tracks (orders, users, tickets, etc.) | §4 Entities |
| **Entity relations** | Ownership, composition, references between entities | §4 Relations |
| **State lifecycles** | Status fields, state machines, allowed transitions | §4 States + §6 Rules |
| **Use case flows** | Happy path + alternatives for each major capability | §5 Use cases |
| **Positive business rules** | Validations, calculations, conditional behavior | §6 Business rules |
| **Negative rules** | Things explicitly blocked or forbidden | §8 Restrictions |
| **Access model** | Roles, permissions, scopes, shared secrets, public vs protected | §7 Access model |
| **Hierarchies** | Org structure, parent-child, multi-tenant boundaries | §7 or §4 |
| **External integrations** | Third-party systems, triggers, failure behavior | §7 Integrations |
| **Cross-cutting policies** | Privacy, audit, retention, rate limits, operational rhythm | §7 Policies |
| **Domain glossary** | Status names, enums, field labels with business meaning | §3 Glossary |
| **Locale/market context** | Language, compliance framing, currency/units if business-relevant | §1 Overview |
| **Edge cases** | Expiration, concurrency, empty states, partial failure | §5 exceptions + §6 |
| **Inferred / ambiguous** | Anything not fully confirmed | §9 Appendix |

## Red flags — investigate harder if missing

If after reconnaissance any of these are **absent from the matrix** but the codebase size suggests they should exist, go back before writing the final spec:

- No permissions model in a multi-user system
- No state/status handling when entities clearly have lifecycle
- No integrations section when external HTTP/SDK calls exist
- No negative rules when validations are present throughout the code
- Use cases only cover happy path with no failure branches
