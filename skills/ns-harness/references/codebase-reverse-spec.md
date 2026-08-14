# Codebase Reverse System Description

Reconstruct from existing codebase **technology-agnostic** description: observed behavior, business rules, permissions, hierarchies, external integrations relevant to product operation.

## Output language (hard rule)

**English only** for both:

- `docs/context/system-reverse-spec.md` (human body)
- `docs/context/system-reverse-spec.agent.md` (agent index)

No mixed languages. Section titles, labels, rule patterns (`When …, the system …`), glossary, use cases, prose — all English — even when chat or UI is another language. Translate domain terms; keep proper nouns / product names as-is.

## Central principle

Code = evidence of behavior. Answer **what system does and why**, not how built. Avoid programming languages, frameworks, libraries, databases, architecture patterns (MVC, microservices, etc.), class/function names as explanation axis.

Golden rule per sentence: _"If I rewrote this system from scratch on another stack, would this sentence still be true?"_ If not, rewrite in business terms.

Permitted exceptions (only when essential):

- External integration/provider names (ERPs, gateways, BI, identity, analytics).
- Access roles/profiles + organizational hierarchy levels.
- Entity attribute names when needed for business semantics (not technical structure).

## When to use

Legacy modernization; undocumented system; team onboarding; business-rule audit before rewrite; faithful functional description of current system.

## Scope and repository access

1. Confirm repository path (or ask). `Read` / `Glob` for structure overview.
2. Monorepos: confirm product/module folder in scope — analyze **only** that subtree unless user wants whole repo.
3. External/legacy: confirm read access + out-of-scope folders (generated, vendored, infra-only).

## Workflow

Follow phases in order. Do not skip Phase 0.

### Phase 0 — Scope and intent

Ask user (one question at a time, or `AskQuestion`):

| Question | Why |
| -------- | --- |
| Whole system or specific module/domain? | Prevents scope creep |
| Executive or exhaustive? (default: **executive**) | Depth; prepare/autonomous default executive |
| Critical/risky domain needing extra scrutiny? | Prioritizes financial, fiscal, permission, compliance |
| Incremental delivery or single document? | Large repos: domain-by-domain |

Do **not** ask output language — always English.

Large repo: reconnaissance first (Phase 1); prioritize by business impact, not file size.

### Phase 1 — Reconnaissance (map, not line-by-line)

Locate business logic before detail read.

1. Directory tree (root, ~2 levels) via `Glob`.
2. Domain-core candidates: `services`, `domain`, `rules`, `validators`, `models`, `usecases`, `handlers`, `controllers`, equivalents.
3. Entry points: API routes, jobs, queues, screens/forms, CLI — basis for use cases.
4. Data sources (tables, entities, schemas) — which **things** business tracks.
5. Existing tests — often better rule documentation than production code.
6. Map: permission model; org/functional hierarchies; external integrations + business role.
7. **Prioritized investigation list** by business value.

**Checkpoint (recommended):** Present map + list before deep extraction. Skip only on fully autonomous run.

Use `codebase-reverse-spec/coverage_matrix.md` as checklist.

### Phase 2 — Rule extraction

Working log: `codebase-reverse-spec/extraction_log_template.md`. No final spec yet.

Per logic fragment:

1. Read relevant code (handlers, validations, calculations, conditionals, state machines).
2. Ask: business decision? input data + why? each branch outcome? plausible business reason?
3. Translate to: **"When [condition], the system [behavior], unless [exception]."** No function/class/variable names in sentence.
4. Confidence: **Confirmed** | **Inferred** | **Ambiguous/Suspect** (flag bugs — do **not** promote to intentional rule without warning).
5. **Negative rules** — validations, permissions, blocks.
6. Integrations: trigger; business data (no payload); success/failure outcome; impact when unavailable.
7. Entities: attributes by semantics; names only when ambiguity remains.
8. Status fields: **lifecycle** — transitions, triggers, terminal states, enforcement.

### Phase 3 — Domain structuring

Organize into: **entities** + attributes; **relations** in business language; **use cases** (actor, goal, preconditions, steps, outcome, exceptions); **cross-cutting policies**; **access model**; **external integrations**; **glossary**; **state lifecycles**.

### Phase 4 — Final spec writing

Human body: `codebase-reverse-spec/spec_template.md`. Declarative, present tense, observed behavior. **English** throughout.

| Mode | Human body | Agent index |
| ---- | ---------- | ----------- |
| **Executive** (default) | Compact tables/bullets | **Always** `system-reverse-spec.agent.md` from `agent_index.template.md` |
| **Exhaustive** | Full template sections | Still write agent index |

Agent index: tables + one-liners only; no paragraph prose.

**Pre-save agent index only:** `./agent-artifact-compress.md` (caveman ultra). Do **not** caveman human body.

Sanity pass:

1. `anti_leakage_checklist.md`
2. Optional `scripts/scan_leakage.sh <spec-file>`
3. `coverage_matrix.md` — each dimension covered or N/A with reason
4. Permissions, hierarchies, integrations functional
5. Confidence markers in appendix, not main body
6. Bugs in appendix, not as rules
7. Answers **what** + **why**, never **how implemented**
8. Entire deliverable English

### Phase 5 — Delivery

Deliver: `system-reverse-spec.md`; `system-reverse-spec.agent.md`; optional extraction log; appendix "Areas to validate with the team" (+ agent one-liners).

Ask: deepen module? exhaustive mode? next domain slice? other format?

## Large codebase strategy

1. Phases 0–1 whole scope; checkpoint on domain map.
2. Phases 2–4 per domain; section or separate file each.
3. Synthesis: merge, dedupe glossary, reconcile policies, verify coverage matrix once.
4. Do not block on 100% — deliver completed domains + "not yet analyzed" list.

## Common mistakes

- Non-English or mixed-language output.
- Tech stack listing instead of business behavior.
- Folder structure as domain structure.
- Future requirements doc instead of **current** system description.
- DB/variable names as business terms without verification.
- Omitting integrations, roles, hierarchies.
- File-by-file read without prioritization.
- Promoting broken logic to intentional rule.
- Lost confidence markers between extraction + final write.

## Reference files

| File | When |
| ---- | ---- |
| `codebase-reverse-spec/spec_template.md` | Phase 4 human body |
| `codebase-reverse-spec/agent_index.template.md` | Phase 4 agent index |
| `./agent-artifact-compress.md` | Pre-save agent index only |
| `codebase-reverse-spec/extraction_log_template.md` | Phase 2 working notes |
| `codebase-reverse-spec/coverage_matrix.md` | Phases 1 + 4 |
| `codebase-reverse-spec/anti_leakage_checklist.md` | Phase 4 sanity |
| `../scripts/scan_leakage.sh` | Phase 4 optional |
