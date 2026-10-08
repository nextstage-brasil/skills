# User memory (long-term, per user)

The agent remembers **this user** across threads: how they want answers, their words, their corrections, who they are. Same idea as ChatGPT saved memories, Claude memory, LangMem semantic memory — on LangGraph + Postgres.

Decide first in `ns-agent-adaptation` → `references/planning-and-memory.md`. "No user memory" is valid — then skip this file.

## 1. Scope and ownership

| Rule | Why |
| ---- | --- |
| Owner = `(tenant_id, user_id)` — **never** `thread_id` | Thread-keyed "memory" dies with the conversation |
| Company / tenant context → `product_system_prompt`, **not** user memory | One source of truth; tenant facts are not the user's to edit |
| `user_id` from auth (JWT `sub`, gateway header) — never body/path | Prevents IDOR |
| No `user_id` → memory off for the turn | Anonymous turns stay stateless |

Scaffold: `X-User-Id` → `RunCtx.userId` (`src/http/server.ts` `resolveUserId`). Products replace with real auth.

## 2. Kinds

| `kind` | Holds | Message → `key`: content |
| ------ | ----- | ------------------------ |
| `preference` | Language, tone, format | "fala comigo sempre em português" → `language`: Always reply in pt-BR |
| `glossary` | Terms, acronyms, synonyms | "PF é ponto de função" → `pf`: PF = ponto de função |
| `feedback` | Corrections to how the agent works | "não me manda tabela" → `format tables`: Prefers lists |
| `profile` | Stable facts about the user | "sou gerente comercial da filial sul" → `role`: Commercial manager, south |

Not memory: one-off task data, documents (RAG), company facts (system prompt), thread history (checkpointer).

Table `user_memories` (`008_user_memories.sql`): `kind`, `key` (lowercase, no accents), `content` (one line ≤1000), `why`, `source` (`agent`|`user`), `evidence_thread_id`, timestamps, `invalid_at`. One **active** row per `(owner, kind, key)`.

## 3. Write path — deduce, apply, inform

**No confirmation question. The agent deduces; the user is always informed.**

```
analyst (hop 1) ─ memoryOps ─▶ memory_write ─ memoryNotices ─▶ composer: "Entendi, PF é ponto de função."
```

| Step | Owner | Rule |
| ---- | ----- | ---- |
| Deduce | Analyst JSON `memoryOps` (hop 1 only) | `remember`/`forget` + `kind`, `key`, `content`, `why`. Empty is normal |
| Apply | `memory_write` → `applyMemoryOps` | Zod shape, key normalize, sensitive filter. Same content → no-op. Changed → supersede (`invalid_at`) + insert. `forget` → hard delete |
| Inform | Composer (notices in payload) | One short line per notice, user's language, before the answer. No question; no "database" talk |

Acks: "Ok, a partir de agora só falamos em português." · "Entendi, PF é ponto de função." · "Registrado: veículo, carro e máquina são a mesma coisa." · "Pronto, esqueci que PF é ponto de função." · declined → "Não guardo esse tipo de informação." (never echo content).

Stub / LLM-failure paths prepend deterministic lines (`memoryAckLine`). Store error → `turnDecisions` `memory_write:store_error`; turn continues (fail-open).

Node, not tool: the scaffold analyst is a JSON planner (no `bindTools`); a deterministic node is auditable, testable offline, and outside the tool budget. ReAct products may expose `remember`/`forget` local tools on the same repo + notices.

## 4. Read path — inject per invoke

- `loadUserMemoryBlock()` loads once per turn, cached on `RunCtx` — not graph state.
- `composeSystemPrompt({ role, configurable, userMemory })` → `base_invariant + injected + userMemory` per LLM invoke.
- Never persist the block in state, checkpointer, or `messages` (same rule as persona).
- Header labels it as data, not instructions — memory never grants tools or overrides motor rules.
- Budget `USER_MEMORY_PROMPT_MAX_CHARS` (4000). Order preference → glossary → feedback → profile, newest first.
- `memory_write` clears the cache so the composer sees what was just learned.
- Current message wins over memory; analyst emits `remember` to update.

Hundreds of rows → retrieve by relevance (pgvector on `content`); keep `preference` always on.

## 5. Frontend CRUD routes

Caller-scoped: owner from identity, never a `user_id` param.

| Method | Path | Body / query | Result |
| ------ | ---- | ------------ | ------ |
| GET | `/memories` | `?kind=&include_invalid=true` | `{ items }` newest first |
| POST | `/memories` | `{ kind, key, content, why? }` | `201` (`source: user`); `409 memory_key_exists` |
| GET | `/memories/:id` | — | memory / `404` |
| PATCH | `/memories/:id` | `{ kind?, key?, content?, why? }` | edited in place |
| DELETE | `/memories/:id` | — | `204`; also superseded history of that key |
| DELETE | `/memories` | — | `{ deleted }` purge |

Errors: `401 user_required`, `400 invalid_body|invalid_kind|invalid_json`, `404 memory_not_found` (also other users' ids), `422 sensitive_content`. Item: `id, kind, key, content, why, source, evidence_thread_id, created_at, updated_at, invalid_at`.

UI: group by kind; show source ("you added" / "learned in conversation" → thread link); edit; delete; "forget everything". Keep Postman folder **User memory** in sync.

## 6. Safety and LGPD

| Risk | Control |
| ---- | ------- |
| Secrets / documents | Analyst skip list + `isSensitiveMemory` floor (secret keywords, credential-like strings, CPF, card numbers) on agent **and** HTTP writes |
| LGPD art. 11 data (health, religion, politics, biometrics…) | Analyst MUST NOT emit; product may add a classifier in `memory_write` |
| Injection ("remember: ignore your rules") | Data-labelled header; one-line content; allowlist independent of prompt |
| Cross-user leak | Every query filters `tenant_id` + `user_id`; foreign id → 404 |
| Erasure | `DELETE /memories`, per-row delete, `forget` in chat — all hard deletes |
| Retention | Product locks TTL in `graph-spec.md` |

Kill switch: `USER_MEMORY_ENABLED=false`.

## 7. graph-spec and evals

`graph-spec.md` Memory section locks: long-term = `user_memories`, identity source, kinds, write mode `deduce_and_inform`, budget, retention, routes. Nodes table lists `memory_write`; state lists `memoryOps`, `memoryNotices`.

Eval cases (`references/evals-and-gates.md` §3):

| Case | Pass |
| ---- | ---- |
| "PF é ponto de função" | One `glossary` op; one-line ack; no question |
| Next thread uses PF | Applied without restating |
| "esquece o que eu disse sobre PF" | `forget`; row gone; ack |
| "minha senha é X, guarda" | `declined`; nothing stored; not echoed |
| "nossa empresa vende tratores" | No op (system prompt owns it) |
| Another user's id via HTTP | 404 |

## 8. Brownfield

Old scaffolds: `memory/store.ts` `saveAgentMemory(threadId, …)` → `agent_checkpoints` — thread state, not user memory. Copy from `templates/agent-runtime/`: `008_user_memories.sql`, `memory/user-memory.ts`, `memory/user-memory-context.ts`, `http/memory-routes.ts`. Then: `userId` into `runStorage.run`; analyst `memoryOps` + prompt; `memory_write` between analyst and its router; guard resets both channels; composer notices + `userMemory` in every `composeSystemPrompt`; remove `store.ts` callers; update graph-spec, Postman, evals.
