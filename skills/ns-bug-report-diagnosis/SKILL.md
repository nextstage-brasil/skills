---
name: ns-bug-report-diagnosis
description: "(NS) Diagnose a product bug report (screen, expected vs actual, ticket, screenshot description) by tracing the reported flow across every layer the consumer stack has. Chat-only report for testers and a fixer agent. Does NOT implement a patch. Use whenever the user pastes a relato, issue, ticket, screenshot description, \"what is happening\", \"diagnose this\", expected vs actual on a screen, or /ns-bug-report-diagnosis — even if they never name this skill. Do NOT use if they asked to implement/fix now (ns-coder), to execute a GitLab ISSUE_URL (ns-execution-gitlab-issue), for stack/CI/log with no screen story (ns-investigator), or for DB-only inspection when the consumer has a DB skill."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
---

# Bug report diagnosis

Readonly. Input = a **product report** (chat, ticket, described screenshot, user steps). Output = a chat diagnosis in **two audiences**: plain language for whoever will retest, and a short pointer for the next coding agent.

This skill does **not** change product code. The next agent owns the patch. Entry priority **4a**. Full routing: `../../ns-harness/references/code-skill-routing.md`.

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** before any other step — cold start only; mid-session skip if already booted and files unchanged. Never tool-Read `AGENTS.md`.

Load `architecture-rules.md` and `project-rules.md`. If `docs/context/` exists, open only what the investigation map asks (overlay or the matching brownfield row) — not the whole corpus. This skill does **not** write product code or `docs/context/` files (session-boot implementation writes do not apply).

## Routing (read first)

Trigger phrases: `references/entry-triggers.md`.

Use when the user wants a **product-story diagnosis** — screen, expected vs actual, ticket as a report — **without** asking to implement the fix.

Do **not** enter when the user asks to implement or fix code → `ns-coder` (priority 5). Do **not** enter for GitLab `ISSUE_URL` **execution** → `ns-execution-gitlab-issue` (priority 1). Do **not** enter for stack/CI/log with no screen story → `ns-investigator` (priority 4b). Do **not** enter for multi-day / version scope → `ns-spec-driven` (priority 2).

### Handoff out

End with the chat report to the **user**. Do **not** auto-dispatch `ns-coder`, `ns-autonomous`, or any implement skill.

When the user asks to implement, stop — they re-enter through the host entry router (usually priority 5 → `ns-coder`). Human gate sits between diagnosis and diff.

## NON-NEGOTIABLE

1. **No product edits.** Read / grep / glob / readonly explore / browser / `docker ps`. No writes under application source, schema, or migrations. No commits. No GitLab status, label, or comment mutations.
2. **No patch.** Do not write the fix, a PoC exploit, or "apply this diff". At most name **where** (screen, client module, route, use case, persistence). If tempted to implement, stop — the output is the handoff.
3. **Trace every listed layer.** Follow `references/investigation-map.md`. Only say "frontend only" or "backend only" (or "API-only" / "CLI-only") **after** opening the other layers the consumer rules list. Stopping at the first similar folder is a fail.
4. **Chat only.** Do not write a `.md` diagnosis file unless the user asked. The chat report **is** the artifact.
5. **Chat language.** Follow `project-rules.md` communication language when set; otherwise the language of the conversation. Sections 2–3 use full sentences — no telegraphic fragments.
6. **Facts vs guesses.** Label hypotheses. Do not invent logs, IDs, or files you did not open.
7. **Docker.** Never `docker compose up/down` or restart containers. `docker ps` is fine when rules name a test container. Do not run mutating tests "to see".
8. **Out of scope.** Skip paths `architecture-rules.md` marks out of scope. Do not invent login credentials.
9. **Write-boundary.** If consumer rules name a mandatory write path (engine, aggregate, facade, or equivalent), section 8 **Do not** cites that path. Do not invent a write path the rules do not name.

## Input

Accept any of:

- Free-text report in the prompt
- Attached spec / screenshot description / short stack snippet **as part of** a screen story
- GitLab issue URL — **read** via MCP (`mcp-gitlab-usage` is provisioned on the consumer, not a catalog skill). Do not change the issue.

If the report is empty (no symptom, no screen, no expected vs actual), ask **one** short clarifying question and stop. Do not explore the whole repo hoping to guess the bug.

## Flow

```
report
  → restated symptom (expected vs actual)
  → discover stack (overlay → architecture-rules Stack → brownfield row)
  → trace UI → client state → HTTP → router → handler → domain → persistence
  → confirm or reject with code evidence
  → reproduce if the environment allows (optional)
  → chat report (output template)
```

1. Restate the report in one paragraph: who, screen/action, expected, actual, error text if any.
2. Discover paths from `references/investigation-map.md`. If the report names an entity and `docs/context/brownfield-map.md` exists, skim **that row only**.
3. Trace the reported action through every layer that exists in this consumer.
4. Collect evidence: file + behavior mismatch. Quote only the lines that prove the story.
5. Reproduction: if a UI is reachable and the report is about a screen, try the steps. Do not invent credentials. If credentials fail or the app is down, write steps from code and say you did not execute them. If the bug is API-only or CLI-only, reproduce at that layer and say so. If you cannot reproduce, say why.
6. Write the chat report from `references/output-template.md`. Do not skip the simple-language block.

## Confidence

| Level | Use when |
|-------|----------|
| High | You opened the code path and it explains the symptom |
| Medium | Path fits, but a runtime detail (data, env, permission) is unverified |
| Low | Report ambiguous, or more than one layer still plausible with no smoking gun |

Low confidence still gets a report. List what would raise it (ID, HAR, which user, which record).

## Handoff to the next agent

End the technical section so another agent can start coding **without** rereading this skill:

- Symptom in one line
- Likely layer (UI state vs HTTP client vs handler vs domain vs persistence)
- Paths to touch — real files from this workspace
- What **not** to do (legacy path when the preferred path exists; write-boundary bypass)

Do not dispatch `ns-coder` or autonomous yourself.

## Pass / fail for this skill

**Pass:** a fixer-agent knows where to look; a non-engineer can explain the bug and how they will check the fix, after one read.

**Fail:** you edited code; you dumped a file tour; sections 2–3 still have engineering jargon; you only searched one side of a multi-layer stack; you proposed a diff.

## References

| File | When |
| ---- | ---- |
| `references/investigation-map.md` | How to discover stack paths and trace layers |
| `references/output-template.md` | Eight-section chat report |
| `references/entry-triggers.md` | Priority 4a vs investigator / coder |
| `../../ns-harness/references/code-skill-routing.md` | Entry priority and handoff |
