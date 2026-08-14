# Anti-leakage checklist

Walk before delivery. Each hit: rewrite business language or confirm exception (provider / role / business attribute name).

## Document language

- [ ] Human body + agent index **English only**
- [ ] No mixed-language sentences
- [ ] Titles + template labels English; placeholders English

## Languages / runtimes

- [ ] No language names as system description (Python, JS, PHP, Java, Go, Rust, Ruby, C#, TypeScript, …)
- [ ] No runtime/platform (Node, JVM, .NET, browser engines) unless **product feature** needs device capability in business terms

## Frameworks / libraries

- [ ] No web frameworks (React, Vue, Angular, Laravel, Django, Rails, Express, Spring, …)
- [ ] No ORM/query builders (Eloquent, Hibernate, Prisma, Sequelize, ActiveRecord, …)
- [ ] No UI/CSS framework names
- [ ] No test framework names in body

## Infra / protocols

- [ ] No DB product names (PostgreSQL, MySQL, MongoDB, Redis, Supabase, Firebase, …)
- [ ] No cloud/hosting (AWS, GCP, Azure, Vercel, Heroku, Docker, Kubernetes)
- [ ] No protocol jargon (HTTP, REST, GraphQL, WebSocket, JWT, OAuth) — **business effect** instead
- [ ] No broker/queue product names unless **external integration** business cares about

## Code structure

- [ ] No class/struct/interface/trait/module names from codebase
- [ ] No function/method/variable names
- [ ] No file/folder names as domain structure
- [ ] No design pattern names (MVC, repository, factory, singleton, middleware)
- [ ] No "API returns JSON" — describe exchanged information

## Data model

- [ ] No column types (VARCHAR, UUID, BIGINT, TIMESTAMP, JSONB)
- [ ] No PK/FK terminology — business relations
- [ ] No migration/schema version refs
- [ ] Attribute names only for business meaning, not schema dump

## Architecture

- [ ] No microservices/monolith/serverless labels
- [ ] No "frontend/backend" split — actors + channels
- [ ] No cache/index/perf detail unless **user-visible business constraint**

## Tone

- [ ] Present tense = **current** behavior
- [ ] No "should"/"will" for unimplemented (use "system does"/"system prevents")
- [ ] Suspected bugs → appendix
- [ ] Inferred → appendix, not confirmed body fact

## Self-test

Three random sentences: *"Still true if rebuilt on different technology?"* Any no → rewrite.
