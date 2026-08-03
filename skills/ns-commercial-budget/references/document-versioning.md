# Document versioning (commercial budget)

The **file path stays fixed**. Versioning lives in the **document header** only.

## Path (immutable name)

```
{product_root}/docs/versions/{version_san}/commercial-budget.md
```

Overwrite this file on each regenerate. Do **not** create `commercial-budget/` subfolders or timestamped filenames.

## Header fields (mandatory)

| Field | Rule |
|-------|------|
| **Sequência** | Integer starting at `1` for the first generation under this `{version_san}`; increment by 1 on every regenerate |
| **Gerado em** | Local **date and time** at write (e.g. `2026-08-03 15:06:45`) |
| **Versão / referência** | `{version_san}` |

## How to compute Sequência

1. If `commercial-budget.md` does not exist → Sequência = `1`.
2. If it exists → read the current `**Sequência:**` value in the header; next = that value + 1.
3. If the header is missing or unparseable → Sequência = `1` and note `[ASSUMPTION: sequência reiniciada — header anterior ilegível]`.

Always refresh **Gerado em** to the clock time at persist.

## Chat-only mode

No file write. Still show **Sequência** (use `chat` or omit) and **Gerado em** date+time in the message header.
