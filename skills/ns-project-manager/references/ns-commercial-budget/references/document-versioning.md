# Document versioning (commercial budget)

**File path stays fixed** per artifact. Versioning lives in **document header** only.

## Paths (immutable names)

**Internal (delivery):**

```
docs/versions/{version_san}/pm/commercial-budget-internal.md
```

**Client export (optional):**

```
docs/versions/{version_san}/pm/commercial-budget-costumer.md
```

Create `pm/` if missing. Overwrite each file on regenerate. Do **not** use timestamped filenames. Do **not** write these files at the version folder root (beside `requirements.md`).

**Misplaced copy:** if the file already exists outside `pm/` (or both root and `pm/` exist), follow `../../pm-persist.md` — **STOP gate**. Search references, propose from-path → to-path, ask confirm/decline, **end the turn**. Do not write, move, delete, or duplicate until the human answers that gate explicitly. `proceed` / assumptions / silence are not confirmation.

**Versão / referência** in client header: `{version_san}-costumer`.

Each file has **own** Sequência counter — bump independently on regenerate.

## Header fields (mandatory)

| Field | Rule |
|-------|------|
| **Sequência** | Integer starting at `1` for first generation under this `{version_san}`; increment by 1 every regenerate |
| **Gerado em** | Local **date and time** at write (e.g. `2026-08-03 15:06:45`) |
| **Versão / referência** | Internal: `{version_san}` · Client: `{version_san}-costumer` |

## How to compute Sequência

Apply separately to `commercial-budget-internal.md` and `commercial-budget-costumer.md`:

1. If the canonical `pm/` file exists: read `**Sequência:**`; next = that value + 1.
2. Else if only a misplaced copy exists: after the approved move (`../../pm-persist.md`), use that file’s Sequência, then +1 for this regenerate.
3. Else Sequência = `1`.
4. If header missing or unparseable: Sequência = `1` and note `[ASSUMPTION: sequência reiniciada — header anterior ilegível]`.

Always refresh **Gerado em** to clock time at persist.

## Chat-only mode

No file write. Still show **Sequência** (use `chat` or omit) and **Gerado em** date+time in message header.
