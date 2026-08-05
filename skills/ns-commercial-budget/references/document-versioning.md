# Document versioning (commercial budget)

The **file path stays fixed** per artifact. Versioning lives in the **document header** only.

## Paths (immutable names)

**Internal (delivery):**

```
{product_root}/docs/versions/{version_san}/commercial-budget-internal.md
```

**Client export (optional):**

```
{product_root}/docs/versions/{version_san}/commercial-budget-costumer.md
```

Overwrite each file on regenerate. Do **not** create subfolders or timestamped filenames.

**Versão / referência** in client header: `{version_san}-costumer`.

Each file has its **own** Sequência counter — bump independently on regenerate.

## Header fields (mandatory)

| Field | Rule |
|-------|------|
| **Sequência** | Integer starting at `1` for the first generation under this `{version_san}`; increment by 1 on every regenerate |
| **Gerado em** | Local **date and time** at write (e.g. `2026-08-03 15:06:45`) |
| **Versão / referência** | Internal: `{version_san}` · Client: `{version_san}-costumer` |

## How to compute Sequência

Apply separately to `commercial-budget-internal.md` and `commercial-budget-costumer.md`:

1. If the target file does not exist → Sequência = `1`.
2. If it exists → read the current `**Sequência:**` value in that file's header; next = that value + 1.
3. If the header is missing or unparseable → Sequência = `1` and note `[ASSUMPTION: sequência reiniciada — header anterior ilegível]`.

Always refresh **Gerado em** to the clock time at persist.

## Chat-only mode

No file write. Still show **Sequência** (use `chat` or omit) and **Gerado em** date+time in the message header.
