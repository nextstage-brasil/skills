# Anti-leakage checklist

Walk this list before delivering the final spec. For each hit, rewrite in business language or confirm the exception (external provider name, role name, business attribute name).

## Programming languages and runtimes

- [ ] No language names used as system description (Python, JavaScript, PHP, Java, Go, Rust, Ruby, C#, TypeScript, etc.)
- [ ] No runtime/platform references (Node, JVM, .NET, browser engine names) unless the **product feature** explicitly depends on client device capability described in business terms (e.g., "device location services")

## Frameworks and libraries

- [ ] No web framework names (React, Vue, Angular, Laravel, Django, Rails, Express, Spring, etc.)
- [ ] No ORM/query builder names (Eloquent, Hibernate, Prisma, Sequelize, ActiveRecord, etc.)
- [ ] No UI library or CSS framework names
- [ ] No test framework names in the spec body

## Infrastructure and protocols

- [ ] No database product names (PostgreSQL, MySQL, MongoDB, Redis, Supabase, Firebase, etc.)
- [ ] No cloud provider or hosting names (AWS, GCP, Azure, Vercel, Heroku, Docker, Kubernetes)
- [ ] No protocol/stack jargon (HTTP, REST, GraphQL, WebSocket, JWT, OAuth) — describe the **business effect** instead (e.g., "the operator must present a shared secret" not "JWT in Authorization header")
- [ ] No message broker or queue product names unless they are the **external integration** the business cares about

## Code structure leakage

- [ ] No class, struct, interface, trait, or module names from the codebase
- [ ] No function/method/variable names from the codebase
- [ ] No file paths or folder names as domain structure ("the `services/` layer handles…")
- [ ] No design pattern names (MVC, repository, factory, singleton, middleware pipeline)
- [ ] No "the API returns JSON" — describe what information is exchanged

## Data model leakage

- [ ] No column types (VARCHAR, UUID, BIGINT, TIMESTAMP, JSONB)
- [ ] No primary/foreign key terminology — use business relations
- [ ] No migration or schema version references
- [ ] Attribute names used only when they carry business meaning, not as a schema dump

## Architecture leakage

- [ ] No microservices/monolith/serverless labels
- [ ] No "frontend/backend" split — describe actors and channels (operator panel, client link, etc.)
- [ ] No caching, indexing, or performance implementation details unless they create a **user-visible business constraint** (e.g., "the list shows at most 50 recent records")

## Tone and intent

- [ ] Present tense, describing **current** behavior — not future requirements
- [ ] No "should" / "will" for unimplemented behavior (use "the system does" / "the system prevents")
- [ ] Suspected bugs are in the appendix, not stated as intentional rules
- [ ] Inferred rules are flagged in the appendix, not presented as confirmed fact in the body

## Quick self-test

Pick three random sentences from the spec. For each, ask: *"Would this still be true if the system were rebuilt in a completely different technology?"* If any answer is no, rewrite.
