# Tool taxonomy

Every planned tool gets **exactly one** primary tag.

| Category | Role | Examples (conceptual) |
| -------- | ---- | --------------------- |
| **Knowledge augmentation** | Feed model missing context | Search corpus, fetch ticket, read calendar |
| **Capability extension** | Compute / transform model cannot do alone | Calculator, code exec sandbox, SQL read, translate |
| **Write actions** | Change external world | Send email, update DB, create ticket, charge payment |

## Inventory rules

- List tool name, purpose, inputs, outputs, category tag
- Knowledge ≠ write. Read-only fetch = Knowledge (or Capability if heavy compute)
- Ambiguous: pick primary by side effect — any durable external change = Write

## Write-action safeguards (mandatory)

Each Write tool locks at least one:

| Control | When |
| ------- | ---- |
| **HITL / approval** | Irreversible or high-cost side effect |
| **Isolation** | Sandbox, staging, dry-run before prod |
| **Scoped authority** | Least privilege; no broad credentials in agent loop |
| **Confirm params** | Agent surfaces parameter values before execute |

No Write tool without safety note in `docs/specs/agent-design.md`.

## Prefer fewer tools

More tools → more wrong-tool / wrong-arg failures. Cap MVP inventory. Defer nice-to-have.
