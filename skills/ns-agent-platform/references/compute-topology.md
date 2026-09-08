# Compute topology (Gate 1)

Placement of **compute**, not vendor pick. Vendor / local-vs-API / egress: `ns-agent-architecture` `provider-selection.md`.

## Modes

| Mode | Typical | Cold-start |
| ---- | ------- | ---------- |
| Dedicated / K8s | Always-on process, pool | Warm; scale-to-zero not default |
| Serverless | Scale-to-zero function / container | **Name** budget or accept-gap per row |
| Edge | Close to user / PoP | Still emit to **central** Observability |

Unnamed serverless cold-start = incomplete row.

## Table — one row per ADR five-block

| Block | Mode | Why | Cold-start (serverless only) | Audit path |
| ----- | ---- | --- | ---------------------------- | ---------- |
| Gateway | | | named or n/a | |
| Orchestrator | | | named or n/a | |
| Model + Tools/RAG | | | named or n/a | |
| Approval Gate | | | named or n/a | |
| Observability | | | named or n/a | **central** — edge replica does not replace |

Mixed modes expected (example: serverless Gateway + dedicated Model). **FORBIDDEN** one system-wide hosting sentence when rows differ.

## Break-even

Report includes **one worked example** (idle reserved hours vs billed serverless duration at **this** product's measured concurrency) **and** “measure your own.” **FORBIDDEN** copied course numeric threshold as lock.

## Edge vs audit

Edge Gateway or edge classifier still records route, tenant, decision on **central** Observability. Edge-only logs = fail Gate 1.
