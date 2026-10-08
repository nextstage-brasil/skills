# Decision coverage — close business decisions before handoff

Shared protocol for every PM artifact that feeds development: Phase 1 exit, **PRD** (`14-prd.md`), **commercial budget** (`ns-commercial-budget/workflow.md`), **version handoff** (`12-version-handoff.md`).

## Why this exists

A PM document is good when the developer who receives it has **no business questions left**. A polished document is not the goal. The failure this protocol prevents:

- The analyst scans only the **text** for ambiguity. Decisions nobody wrote down are never asked.
- Questions are **open** ("how should X work?"), so answering them takes work and they stay open.
- Rounds go by, the document gets more polished, and it is labeled "frozen" even though nobody has made the core decisions.
- Developers then send back dozens of questions. Most are about plan, permissions, defaults, rounding, ties, calendars, output, undo, data privacy and priority, which are business decisions, not code.

**Success metric:** business questions that development still asks after handoff. Target: **0**. Technical questions (algorithm, schema, library) are not counted. They belong to engineering.

## When to run

| Moment | Run |
| --- | --- |
| Phase 1 exit, when the input is a version or multi-capability scope | Coverage scan + proposal batch |
| Before every PRD draft and every PRD revision | Full protocol |
| Before a commercial budget that is called anything other than **provisional** | Full protocol |
| Before a version handoff card | Read the register. Block on open items (`12-version-handoff.md`) |
| Human pastes questions returned by development or QA | **Feedback mode** (below) |

A single small change (one screen, one rule) only uses the dimensions it touches. Mark the others N/A in one line. Do not interrogate a one-line fix with the full list.

## Step 1 — Coverage scan (dimensions)

For **each in-scope capability** (RF / Feature), walk every dimension below. Each dimension ends in exactly one state:

- `answered`: decided by the human or stated in the source. Cite where.
- `n/a`: does not apply. **Give the reason in one line.** "N/A" with no reason counts as `open`.
- `assumed`: the analyst's proposal is in place, but the human has not approved it. Counts as **open** for readiness.
- `open`: no decision yet. Becomes a proposal question.

| # | Dimension | What must be decided | Typical probes |
| --- | --- | --- | --- |
| D1 | **Commercial packaging and consumption** | Which plan, tier or edition gets it; add-on or included; do current subscribers get it automatically; does it use metered resources (credits, quota, API, AI tokens, SMS, storage); what happens when the quota runs out; who sets the price of new consumption | Plan/tier? Auto-enable for existing subscribers? Metered? Behavior at zero balance (block, degrade, continue without)? "Unlimited" plans with internal caps? |
| D2 | **Roles and permissions** | Who **configures**, who **uses**, who **approves**, who **reverts**, for each action (create, accept, bulk, undo, export). Internal staff vs customer admin vs operator | Is "internal user" one role or several? Can the operator run bulk actions? Do bulk actions apply to selected rows or to every filtered row? Who sees the new control or warning? |
| D3 | **Existing customers and defaults** | Default for current tenants, records and configurations; whether behavior changes without opt-in; what happens to in-flight data | Does today's behavior stay identical with zero configuration? Default mode for existing layouts or accounts? |
| D4 | **Configuration level and precedence** | Where a setting lives: global / template / tenant / end client / user / per transaction. Which level overrides which | Set once per template, per client, or per run on screen? |
| D5 | **Value and calculation rules** | Exact vs tolerance; rounding mode and precision; units and currency; allocation of extras (proportional, per item, separate line); where residual cents go; which accounts or categories receive them | Does a 0.01 difference fail the match? Pro-rata or separate entry? |
| D6 | **Matching, selection and exceptions** | Empty input; no match; tie **after** all tie-breakers; partial (partly paid, partly consumed); duplicate; item already linked elsewhere; coincidental match (false positive). Is that risk accepted? Which signal confirms it? Expected volume and limits (max items per batch, candidates per period); behavior above the limit | Still tied after both criteria: suggest one or none? Partly paid item: eligible? Can we propose limits for you to validate? |
| D7 | **Inputs the customer provides** | Which file or source; format and version; which screen uploads it; period it must cover; prerequisite data that must already exist; behavior when missing or stale; mandatory fields when the user enters data by hand; **granularity** (one row = one item, one payment or one whole file); sample availability before design | Which report, which columns, which period? Upload on which screen? Can we get a real sample? |
| D8 | **Time and calendar** | Which date drives the rule (event, due, scheduled, settlement); time zone; business-day calendar (national / state / municipal, who maintains it); windows; retention periods | Payment date or due date? Which holidays count? |
| D9 | **Output and downstream** | What goes to the file, report or integration; what happens to **unreviewed / pending** items at export (block, keep original, exclude); re-export (replace vs keep history); downstream format unchanged? | Export with pending suggestions: block or keep originals? Keep previous files? |
| D10 | **Lifecycle, undo and history** | Undo and revert; can a "discard" be undone; audit trail; reprocessing; what a re-run does to manual edits; how long items stay visible | Can "Discard" be reverted? How long does the pending tab keep items? |
| D11 | **Blast radius on existing behavior** | Does a new rule apply **only to the new flow** or to the **whole existing module**? Which previously validated results could change? | Does the new date window apply to all matching or only to batches? |
| D12 | **Data, privacy and third parties** | Personal or sensitive data; external processors (AI or SaaS providers); contract and terms coverage; **isolation unit** (platform tenant vs end client vs office); retention and deletion when the contract ends; who approves the policy | Is data sent to an external AI provider? Isolated per office or per end client? Delete, grace period or anonymize at contract end? |
| D13 | **Automation and AI behavior** *(only when automation or AI is in scope)* | What is AI vs a deterministic rule, and how each is labeled on screen; whether output ever auto-applies; which fields AI may fill; fallback when there is no basis; **quality metric definition** (unit, denominator, what counts as a hit, are "no suggestion" items excluded, sample, who measures) | Label rule-based suggestions as AI too? 99% of what: per entry, per field, both? |
| D14 | **Priority and phasing** | Must / should / could per capability; MVP cut if the delivery is split; external dependencies (other teams, vendors, components "in homologation") inside or outside this delivery | If we split, what ships first? Is component X part of this delivery? |

## Step 2 — Rule probes (developer lens)

For **every business rule** in the scope (each "the system does X when Y"), ask the ten probes. Each probe that has no answer in the source and would make a developer guess becomes a proposal question under the matching dimension.

1. **Empty**: nothing qualifies, or the input is missing.
2. **Tie**: two candidates remain equal after every stated criterion.
3. **Partial**: half-done, partly paid, partly consumed.
4. **Duplicate / already used**: same item twice, or already linked to something else.
5. **Who may**: which role can trigger, see, override.
6. **Default for existing**: what current customers or records get with no action.
7. **Undo**: can it be reversed, and what state returns.
8. **User ignores it**: the user skips review, exports or closes. What is persisted or exported.
9. **Which date / which source**: when two dates or two sources could drive the rule.
10. **Where else**: does the rule leak into an existing flow (D11)?

## Step 3 — Cross-round detectors

Run on every round, against **everything said so far**: all chat rounds, the PRD, the budget, the register, the reverse-spec when loaded.

| Detector | Hit | Action |
| --- | --- | --- |
| **Contradiction** | Two statements disagree (round 1 says "client chooses", round 3 says "only internal staff changes it"; budget vs PRD) | Open a `C-NN` row. Ask which outcome wins, with a proposal. Never pick silently. Readiness stays Draft |
| **Orphan item** | Something is counted, priced or named (in the estimate, a diagram or a title) but has no described behavior | Ask: in scope? If yes, which behavior? Propose |
| **Scope-boundary leak** | An in-scope capability depends on something declared out of scope ("AI licensing out of scope" while the feature consumes AI) | Ask what exactly is out and who owns the dependent decision |
| **Dangling dependency** | A named external piece with no stated status ("reader X: ?") | Ask: part of this delivery, already delivered, or a dependency with an owner and date |
| **Ambiguous term** | A domain noun with two plausible meanings ("company", "user", "account", "title") | Ask which meaning, with the most likely one proposed. Add it to the glossary |
| **Analyst assumption** | Anything the analyst inferred | Keep it as `assumed` until the human approves it. Never promote it to `answered` yourself |

## Step 4 — Ask with proposals (never open questions)

Every question carries the **recommended answer**. Reviewing proposals takes the business seconds. Thinking from scratch takes days and usually never happens.

Shape, chat only, in the human's language:

```text
Q{n} — [D{k} {dimension}] {short title}
{What the source says or leaves open. One or two sentences.}

➡️ Recommended: {concrete default: what happens, what stays the same}
   Alternatives: {b} · {c}          (optional, only when a real choice exists)
   Decides: {role} · Blocks: {RF/Feature ids, estimate}
```

Rules:

- Blank line before `➡️`, which goes on its own line. Translate the label (`➡️ Recomendado:`, `Alternativas:`, `Decide:`, `Bloqueia:`).
- **No proposal is possible** (price, legal basis, contract policy)? Give **closed options** and name who decides. Never a bare "how should it work?".
- Base the proposal on: the source text, the existing product behavior (reverse-spec), the safest reversible option, and the option that changes nothing for current customers.
- Group by dimension. Order: blockers of in-scope capabilities first, then estimate-affecting, then the rest.
- **One batch per round with every open item.** Do not drip-feed. No hard cap on decisions. If there are more than 30, send the 30 most blocking items, give the remaining count, and continue in the next round.
- Closer: reply by number (`3: alternative b`), "all recommended", or ranges ("1–12 ok, 13: …"). Partial answers are fine.
- Never re-ask an `answered` item. Never ask technical-design questions (algorithm, schema, library, branch). Those go to engineering.

**Answers:** accepted proposals become `answered` with the source (`round N, {who}`). "Proceed with assumptions" turns every open item into `assumed` (proposal applied, pending approval). Readiness does **not** advance.

## Step 5 — Decision register

One register per version. It is the single source of truth that every PM artifact renders from.

- Persist: `docs/versions/{version_san}/pm/decision-register.md` (template `assets/decision-register.template.md`) when persistence is on. Chat-only: keep the same tables in the reply.
- Ids: `Q-NN` decisions (the same id in the chat batch, the register, PRD §13 / §14 and the budget's Premissas), `C-NN` conflicts.
- Update it **every round**. The PRD and the budget never contradict the register. When they differ, the register wins and the artifact is regenerated.

## Step 6 — Developer-lens self-check (before every gate)

Before you present a PRD, a budget or a handoff:

1. Reread the artifact as the developer who must implement each RF / Feature tomorrow, without access to the chat.
2. Write down every question that developer would ask.
3. Classify each one:
   - **Business**: back to Step 4 as a proposal. The artifact stays Draft.
   - **Answered only in chat**: write the decision into the artifact (RF business rules, acceptance, §14). A decision missing from the document counts as missing.
   - **Technical**: leave it to engineering. Do not ask the business.
4. Report one line in chat: `Developer lens: {n} business questions surfaced (Q-…), {m} technical left to engineering.`

## Readiness states

| State | Condition | Allowed wording |
| --- | --- | --- |
| **Draft** | Any `open` or `assumed` item, or any unresolved `C-NN` | "draft", "pending decisions: N" |
| **Business-validated** | Every dimension of every in-scope capability is `answered` or `n/a` with a reason; zero conflicts; zero unapproved assumptions | "validated with business" |
| **Dev-lens checked** | Business-validated **and** Step 6 surfaced 0 business questions | "ready for build" |
| **Frozen** | Dev-lens checked **and** the human explicitly says freeze / approve | "frozen", "congelado", "sem pendências" |

**Forbidden:** writing "frozen", "congelado", "escopo fechado", "sem pendências", "no open items" or **Ready for build: yes** below the matching state. The only move forward is the human's explicit word; never rename a state yourself because it sounds like progress.

## Provisional estimate seal

While readiness is **Draft**, every FP count, hour count and cost is **provisional**:

- Header line: `**Estimate status:** provisional — {n} open decisions can change FP or hours ({Q ids})` (PT-BR: `**Status da estimativa:** provisória — {n} decisões em aberto podem alterar PF/horas (…)`).
- Count only open items that touch sizing: new capability, rule complexity, D1 consumption, D7 inputs, D11 blast radius.
- Firm (`firme`) only at Business-validated or higher.

## Feedback mode — questions returned by development

Trigger: the human pastes a list of questions from developers, QA or the client after handoff.

1. Map every question to a dimension (D1–D14) or probe (1–10). Questions about the algorithm or schema are `technical`.
2. Already decided? Answer with the artifact section and the `Q-NN`. If the artifact did not state it explicitly, fix the artifact.
3. Not decided? Convert it into a proposal (Step 4) and add it to the register.
4. Report the coverage miss in one table: dimension → number of returned questions. That is the skill's defect metric for this version.
5. Readiness goes back to **Draft** until the new items close.

## What not to do

- Do not polish sections or add diagrams while business decisions are open. Close decisions first.
- Do not treat "the input did not mention it" as "not applicable". Silence is `open`, unless the dimension cannot apply (give the reason).
- Do not invent the answer. A proposal is a question, not a fact, until the human accepts it.
- Do not move business decisions into "technical notes" or "engineering will decide".
- Do not interrogate a one-line change with all fourteen dimensions. Scope the scan to what the change touches.
