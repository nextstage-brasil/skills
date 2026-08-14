# Coverage matrix

Phase 1 (plan) + Phase 4 (complete). Mark: **Covered** | **N/A** (reason) | **Gap** (appendix or next iteration).

| Dimension | Look for in code | Spec section |
| --------- | ---------------- | ------------ |
| **Actors** | Humans, external systems, scheduled processes | §2 Actors |
| **Entry points** | Routes, forms, CLI, webhooks, jobs | §5 Use cases |
| **Business entities** | Core nouns business tracks | §4 Entities |
| **Entity relations** | Ownership, composition, references | §4 Relations |
| **State lifecycles** | Status fields, transitions | §4 States + §6 Rules |
| **Use case flows** | Happy path + alternatives | §5 Use cases |
| **Positive business rules** | Validations, calculations, conditionals | §6 Business rules |
| **Negative rules** | Explicit blocks/forbids | §8 Restrictions |
| **Access model** | Roles, permissions, scopes, public vs protected | §7 Access model |
| **Hierarchies** | Org, parent-child, multi-tenant | §7 or §4 |
| **External integrations** | Third parties, triggers, failure | §7 Integrations |
| **Cross-cutting policies** | Privacy, audit, retention, limits | §7 Policies |
| **Domain glossary** | Statuses, enums, field labels | §3 Glossary |
| **Locale/market** | Language, compliance, currency/units if relevant | §1 Overview |
| **Edge cases** | Expiration, concurrency, empty, partial failure | §5 + §6 |
| **Inferred / ambiguous** | Unconfirmed | §9 Appendix |

## Red flags

Absent from matrix but codebase size says they should exist — investigate before final:

- No permissions in multi-user system
- No state/status when entities have lifecycle
- No integrations when external HTTP/SDK calls exist
- No negative rules when validations everywhere
- Use cases happy-path only
