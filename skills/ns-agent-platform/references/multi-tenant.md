# Multi-tenant (Gate 2)

## Shared-once vs per-tenant

| Concern | Shared-once | Per-tenant | Default probe |
| ------- | ----------- | --------- | ------------- |
| Graph binary / runtime image | One build | Forked image | Shared unless isolation requires fork |
| Tenant config | `config/tenants/{id}/` | Isolated store | Versioned config, not new `src/` modules |
| Policy (tools / classes) | Central `AllowlistPolicy` | Copied YAML per tenant | Central; copy = drift — record why |
| Data / checkpointer | Shared cluster, `tenant_id` filter | Isolated DB | Filter mandatory if shared |
| LLM gateway product | Shared control plane | Dedicated keys/quota | Product can share plane; keys tenant-scoped |

## Three rules

| Rule | Meaning |
| ----- | ------- |
| Loose Coupling | Tenant A failure / scale / deploy does not require Tenant B graph rewrite |
| Clear Interfaces | Tenant talks to Gateway product + documented capability ids — not another tenant's store |
| Policy-Driven Control | Bind list from policy object, not hardcoded per-tenant ifs |

Runtime shape: `ns-langgraph-agents` `references/capability-governance.md` — `AllowlistPolicy` (`allow` set + `denyClasses`). Filter **before** `bind_tools`. Platform lock: **where** that policy lives (central vs copied). Do not restate allowlist mechanics here.

Copied policy without owner + review cadence = incomplete Gate 2.
