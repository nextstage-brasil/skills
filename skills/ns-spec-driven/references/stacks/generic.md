# Generic stack profile

No specific framework confirmed. Keep requirements technology-agnostic where possible. Name stacks only when user or brownfield map confirms.

## Setup feature order (greenfield)

1. Repository / CI / environment baseline
2. Data store + migrations strategy
3. API or service layer bootstrap
4. Client/UI shell (if applicable)
5. Test strategy (unit, integration, E2E as applicable)

## Data model section

- English `snake_case` table/column names unless product convention differs
- Explicit FK creation order
- Key API operations as method + path

## Acceptance criteria defaults

- Each feature: ≥2 testable criteria
- Backend: response contract + error cases when API exists
- Frontend: interactive elements identifiable for automation when UI exists
- Tests: unit coverage for business logic; E2E for critical user paths when UI exists

## NFRs to consider

- Authentication + authorization model
- Multitenancy / data isolation if applicable
- Observability (logging, metrics)
- Performance expectations from user or Clarify phase
