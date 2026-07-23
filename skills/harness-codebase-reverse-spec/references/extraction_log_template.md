# Extraction log — [Domain or module name]

> Working document during Phase 2. Not delivered as the final spec unless the user requests traceability. Keeps evidence and confidence from getting lost between extraction and writing.

## Investigation scope

- **Repository path**: [path]
- **Domain/module**: [name]
- **Investigation priority**: [high/medium/low]
- **Key entry points found**: [routes, screens, jobs — described by what they allow, not file names]

---

## Rules extracted

### RULE-001

- **Business rule**: When [condition], the system [behavior], unless [exception].
- **Confidence**: Confirmed | Inferred | Ambiguous/Suspect
- **Evidence**: [Brief pointer — e.g., "validation on create form", "test scenario X describes Y". Do NOT paste code or cite function names in the rule itself.]
- **Notes**: [Business rationale if inferable; flag if this looks like a bug]

### RULE-002

[...]

---

## Negative rules (restrictions)

### RESTR-001

- **Restriction**: The system prevents [action] when [condition].
- **Confidence**: [...]
- **Evidence**: [...]

---

## Entities touched

### [Entity name]

- **Attributes identified**: [business-relevant only]
- **States/lifecycle**: [if any]
- **Relations**: [...]

---

## Integrations

### [Integration name]

- **Business trigger**: [...]
- **Data exchanged** (business terms): [...]
- **Success outcome**: [...]
- **Failure outcome**: [...]
- **Unavailable impact**: [...]
- **Confidence**: [...]

---

## Open questions

- [ ] [Ambiguity that needs human validation]
- [ ] [Contradictory behavior observed]
- [ ] [Suspected dead code or bug — do not promote to spec body]

---

## Coverage notes

| Dimension | Status | Notes |
| --------- | ------ | ----- |
| Actors | Found / Partial / N/A | |
| Permissions | Found / Partial / N/A | |
| State lifecycles | Found / Partial / N/A | |
| Integrations | Found / Partial / N/A | |
| Negative rules | Found / Partial / N/A | |
| Cross-cutting policies | Found / Partial / N/A | |
