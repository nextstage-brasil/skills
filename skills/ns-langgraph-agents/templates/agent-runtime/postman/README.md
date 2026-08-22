# Postman — agent-api

Baseline collection for the HITL HTTP contract.

| File | Purpose |
|------|---------|
| `agent-api.postman_collection.json` | Requests + API description |
| `agent-api.postman_environment.json` | `baseUrl`, `thread_id` |

After changing routes in `src/http/`, update the collection (paths, bodies, examples) in the same delivery.

Import in Postman: **Import** → both JSON files → select environment **local**.
