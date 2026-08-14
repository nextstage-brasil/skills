# Documentation style guide

## Voice

- Direct, second person optional ("Run …" / "You can …")
- Present tense for current behavior
- English unless team defines otherwise

## Structure

- One `#` title per file
- `##` sections with scannable headings
- Lead with **what** and **why** before **how**
- Code blocks with language tags and copy-pasteable commands

## Formatting

| Element | Rule |
| ------- | ---- |
| Commands | Fenced blocks; include working directory when not repo root |
| Paths | Backticks; repo-relative when possible |
| Options | Tables for CLI flags |
| Warnings | Blockquote or bold **Note:** — sparingly |

## README minimum (when updating)

1. What the project/product is (one paragraph)
2. Prerequisites
3. Install / run (verified commands)
4. Link to deeper `docs/` — not a dump of every detail

## Maintenance

- Date or version stamp only when the team already uses that convention
- Remove docs for removed features in the same PR as code removal
- Prefer linking to harness-generated `AGENTS.md` for agent rules
