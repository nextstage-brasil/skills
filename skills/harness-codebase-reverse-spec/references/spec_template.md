# System Specification: [Product/System Name]

> Reverse-engineered from the existing implementation. Describes observed product behavior in business language.

## 1. Overview

[2–4 paragraphs: what problem the system solves, who uses it, the main operational flow, and any market/locale context observable from the product (language, compliance framing, etc.). Present tense. No stack mentions.]

## 2. Actors

| Actor | Role |
| ----- | ---- |
| **[Actor name]** | [What they do in the system and their relationship to the business process] |
| **[External system/channel]** | [Business role — e.g., messaging channel, map provider, payment gateway] |

[Note any absence of differentiated roles if the system operates with a flat access model.]

## 3. Domain glossary

| Term | Definition |
| ---- | ---------- |
| **[Term]** | [Clear business definition — not a technical field description] |

## 4. Business entities

For each entity:

### [Entity name]

- **What it represents**: [Business meaning]
- **Business-relevant attributes**: [List only what matters for operations/decisions]
- **Relations**: [How it connects to other entities, in business language]
- **Possible states** (if applicable): [Each state and when it applies]
- **Lifecycle / transitions** (if applicable): [Who can move between states, allowed paths, terminal states]

## 5. Use cases / Behavior flows

For each use case:

### UC-NN — [Short title]

- **Actor**: [Who initiates]
- **Goal**: [Business objective]
- **Preconditions**: [What must be true before starting]
- **Main flow**:
  1. [Step in business language]
  2. [...]
- **Alternative flows / exceptions**:
  - [What happens when preconditions fail, permissions denied, validation fails, etc.]
- **Expected outcome**: [Observable business result]

## 6. Business rules

Group rules by domain area. Use the pattern: *When [condition], the system [behavior], unless [exception].*

### [Domain area — e.g., Registration, Authorization, Billing]

- When [...], the system [...], unless [...].
- [...]

## 7. Cross-cutting policies

### Access model

- **[Role/profile]**: [What they can and cannot do]
- [...]

### [Other policy area — privacy, audit, rate limits, data retention, operational rhythm]

[Describe policies that span multiple use cases.]

### External integrations

| Integration | Business purpose | Impact if unavailable |
| ----------- | ---------------- | --------------------- |
| **[Name]** | [Why the system uses it] | [Operational consequence — fallback, block, manual workaround] |

## 8. Restrictions and validations

Explicit list of what the system **prevents** (negative rules):

- [Cannot do X without Y]
- [...]

## 9. Appendix — Areas to validate with the team

### Inferred rules

- [Rule or behavior deduced but not directly confirmed]

### Ambiguous points

- [Behavior that could be interpreted multiple ways]

### Possible bugs / unintentional behavior

- [Code that looks broken, inconsistent, or dead — not promoted to intentional rules]

---

*Updated [month/year] by reverse engineering of the implemented system.*
