# MCP Security Minimum Bar (review checklist)

Walk item by item on reviews. An unmet item is a **finding**, not a suggestion. For each failure report: risk (from `vulnerability-landscape.md`), location, and the concrete control from `controls.md`.

```
1. Strong identity, auth & policy enforcement
- [ ] All remote MCP servers use OAuth 2.1/OIDC
- [ ] Tokens are short-lived, scoped, validated on every call
- [ ] No token passthrough; policy enforcement is centralized

2. Strict isolation & lifecycle control
- [ ] Users, sessions and execution contexts are fully isolated
- [ ] No shared state for user data
- [ ] Sessions have deterministic cleanup and enforced resource quotas

3. Trusted, controlled tooling
- [ ] Tools are cryptographically signed, version-pinned and formally approved
- [ ] Tool descriptions are validated against runtime behavior
- [ ] Only minimal, necessary tool fields are exposed to the model

4. Schema-driven validation everywhere
- [ ] All MCP messages, tool inputs and outputs are schema-validated
- [ ] Inputs/outputs are sanitized, size-limited and treated as untrusted
- [ ] Structured (JSON) tool invocation is required

5. Hardened deployment & continuous oversight
- [ ] Server runs containerized, non-root, network-restricted
- [ ] Secrets are stored in vaults and never exposed to the LLM
- [ ] CI/CD security gates, audit logs and continuous monitoring are mandatory
```
