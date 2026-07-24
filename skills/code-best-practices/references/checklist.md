# Security and quality checklist

Apply sections that match the detected stack. Skip N/A rows; note "not applicable".

## HTTP security headers

| Check | Target |
| ----- | ------ |
| Content-Security-Policy | Restrictive default; document required inline exceptions |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options or frame-ancestors | Clickjacking protection |
| Referrer-Policy | Explicit policy |
| Strict-Transport-Security | HTTPS deployments only |
| Permissions-Policy | Disable unused browser features |

## Application

| Check | Notes |
| ----- | ----- |
| Secrets not in repo | `.env` gitignored; scan for keys in history if asked |
| Dependencies | Known CVEs on direct deps; pin or upgrade plan |
| Auth cookies | `Secure`, `HttpOnly`, `SameSite` where applicable |
| CORS | Not `*` with credentials |
| Input validation | Server-side for all trust boundaries |

## Frontend

| Check | Notes |
| ----- | ----- |
| Dependencies | Outdated major frameworks flagged |
| `rel=noopener` on `target=_blank` | Where used |
| Subresource integrity | CDN scripts when applicable |
| `prefers-reduced-motion` | Respected in CSS |

## Accessibility (baseline)

| Check | Notes |
| ----- | ----- |
| Images | `alt` meaningful or empty decorative |
| Forms | Labels associated |
| Focus | Visible focus styles |
| Color | Not sole indicator of state |

## Reporting format

```markdown
| Severity | Area | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| High | CSP | Missing on /api | Add middleware … |
```

Severity: **High** (exploit path), **Medium** (defense in depth), **Low** (nice-to-have).
