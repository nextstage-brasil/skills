# Tenant onboarding (Gate 3)

## Locks

| Field | Meaning |
| ----- | ------- |
| Approver | Named role (not “the team”) |
| Reviewed | Checklist: compute rows, policy source, data plane, audit retention clock, **threshold inheritance** |
| Skip consequence | What ships if onboarding skipped (example: inherited defaults + no production always-escalate) |

## Inherited thresholds

New tenant **copies** platform defaults (HITL bands, cascade floors, cache similarity) until **reviewed on that tenant's data**.

| State | Report |
| ----- | ------ |
| Inherited | Flag. Not a measured lock. Owner still named |
| Reviewed | Measured on tenant traffic / golden set; owner recorded |

Skip onboarding = inherited thresholds in production **and** skip consequence recorded. Silent copy-as-lock = fail Gate 3.
