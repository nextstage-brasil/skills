# Investigation map — consumer discovery

Read this when tracing a product report. Do **not** hardcode a product layout. Discover paths in this order, then trace only the layers that exist.

## Path discovery (in order)

1. **Consumer overlay**, if the file exists: `docs/context/investigation-map.md`. Follow it. It may name screens, HTTP clients, routers, and write-boundaries for this product.
2. **Else:** the **Stack** table in `.nextstage-harness/rules/architecture-rules.md` (or the legacy adapter if harness rules are absent). Take paths for UI, API, HTTP client, routers, handlers, domain, persistence, jobs — whichever rows exist.
3. If the report names an entity and `docs/context/brownfield-map.md` exists: open **that row only**. Do not reread the whole map.

Skip any path `architecture-rules.md` marks out of scope.

## Default trace

A product report is usually a **screen story**. Start at the UI entry the user named, then follow the call into the server. Stopping at the first file that "looks related" misses client/server mismatches (wrong body, v1 vs v2 route, mapper dropping a field).

Trace only the layers that exist after discovery:

```
UI entry named in the report
  → client state / screen module
  → HTTP client (path, method, body)
  → router → handler → domain use case
  → persistence / jobs
```

| Layer | Typical signals in architecture-rules |
| ----- | ------------------------------------- |
| UI entry | SPA/screens, pages, views, CLI command named in the report |
| Client state | store, container, hook, form module that owns the action |
| HTTP client | Axios/fetch/SDK path + method + body |
| Router / handler | route table, controller, resolver |
| Domain | use case, service, aggregate |
| Persistence / jobs | repository, ORM, queue worker |

Monolith / API-only / CLI: trace the **real** layer and say so with evidence. Do not invent a missing SPA or a missing API.

Only declare "UI only" or "API only" **after** opening the other layers listed in the rules.

## What to look for (ask the code, not the user)

1. Does the UI URL match the router that is actually mounted?
2. Does the JSON the client sends match the handler / DTO / mapper?
3. Does an error return in a shape the UI actually shows?
4. Is there a v1 and v2 of the same resource, and which one is live?
5. If data is wrong after save: display bug, or persist bug? Prove with one side's contract.

### UI-side symptoms (when a UI layer exists)

- Control stays busy / infinite loading: pending flag vs error swallowed in `catch`
- Toast vs silent fail: interceptor vs caller that ignores the response
- Form not sending a field: initial values vs mapper in the client module
- List stale after save: missing reload / state not updated

### Server-side symptoms (when an API layer exists)

- Client path has no matching router, or matches a legacy version while rules name another as canonical
- Handler does work that rules say belongs in a domain use case
- Mapper drops or renames a field the screen still sends
- Validation error shape the UI does not display
- Write that consumer rules require to go through an engine / aggregate / facade done (or proposed) outside that path

## Optional runtime

- Browser: exercise the screen if the UI is up. Do not invent credentials. Do not click destructive production actions.
- `docker ps`: confirm containers **named in the rules** if you need logs. Do not start stacks. Do not `docker compose up/down`.
- Live DB: only if the report is about persisted values **and** the consumer has a readonly DB skill — then follow that skill. This skill stays readonly.

## Do not

- Treat prototype / design-exploration folders as shipped product when rules mark them out of scope
- Recommend new logic on a legacy path when rules name a preferred domain path
- Recommend raw persistence writes when rules name a write-boundary
- Run the consumer test suite as part of diagnosis (that is the fixer agent's validation)
