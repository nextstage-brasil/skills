# Web Interface Guidelines review

Use when request = **UI / accessibility / UX audit**, or `ns-proto-creator` invokes at prototype close-out.

## Fetch (required)

WebFetch current guidelines:

`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

Do **not** rely on memory of older guideline versions. Network required; fetch fails → report + fall back to offline checklist in `checklist.md` only.

## How to review

1. Read fetched command.md fully.
2. Inspect scoped UI surfaces (prototype pages, components, or app routes user named).
3. Map each relevant guideline to concrete findings.
4. Cite evidence as `file:line` (or component + clear locator when line numbers unavailable).

## Report format

```markdown
## Web Interface Guidelines

| Severity | Guideline | Finding | Location | Recommendation |
| -------- | --------- | ------- | -------- | -------------- |
| High | … | … | path/to/File.tsx:42 | … |
```

- Severity: High / Medium / Low / Pass
- Skip guidelines that do not apply; note N/A briefly if user expects coverage.
- Keep security checklist pass separate (or second section) — guidelines do not replace headers/CSP/deps hygiene.
