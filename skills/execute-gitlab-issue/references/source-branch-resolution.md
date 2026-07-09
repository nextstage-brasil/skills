# SOURCE_BRANCH — resolution and remote validation

Used by Gate 1 in `execute-gitlab-issue` (skipped when `REUSE_MODE = true`).

## Resolution order

Apply the **first** match; record the source (field, excerpt, or rule name).

| Priority | Source | Action |
| -------- | ------ | ------ |
| 1 | **Human this run** | Use the branch the operator names/confirms now. |
| 2 | **Explicit in the issue** | Branch stated unambiguously in title, description, or comments — record field + excerpt. |
| 3 | **Product rule** | `{harness_root}/rules/branch-resolution.md` when present. |
| 4 | **Milestone / version discovery** | Derive candidates from the issue milestone or version signals (below). |
| 5 | **Mandatory fallback** | `develop` — use **only** when step 4 finds no relative branch on the remote. |

**Forbidden without human confirmation (priority 1):** never auto-select `main`, `master`, `homolog`, the current checkout, or any branch other than a step 1–4 result or the `develop` fallback.

`main` / `master` are **always invalid** as `SOURCE_BRANCH`, even if named explicitly in the issue — reject and ask the operator for an allowed base.

## Milestone / version discovery (step 4)

Load signals from the issue payload (`read_issue`):

1. **Milestone** — `milestone.title` (preferred) or milestone-related labels (e.g. `Milestone: …`).
2. **Version** — semver in milestone title (e.g. `1.32 - Billing`, `2.1.0 - Multitenant`) or an explicit version label on the issue when no milestone is set.

Extract semver with the first match of `\d+\.\d+(?:\.\d+)?`. When the patch is `.0`, also try the `major.minor` form (e.g. `2.1.0` → try `2.1.0` and `2.1`).

For each version token `V`, build candidates (both separator styles):

- `develop_{V}` (underscore after `develop`, dots kept in `V`)
- `develop-{V}` (hyphen after `develop`, dots kept in `V`)

Try **more specific** version tokens first (full semver before shortened `major.minor`).

```bash
git -C "{product_root}" fetch origin
git -C "{product_root}" ls-remote --heads origin
```

Pick the first candidate that exists on the remote (exact name or separator alternate per below). Set `SOURCE_BRANCH` to the **exact remote branch name**.

When no candidate exists → proceed to step 5 (`develop`). Do not substitute `homolog`, `main`, or another name.

## Validate on remote (mandatory)

After `SOURCE_BRANCH` is resolved (steps 1–5), validate:

```bash
git -C "{product_root}" fetch origin
```

1. **Exact match** — if `git ls-remote --exit-code --heads origin {SOURCE_BRANCH}` succeeds, keep `{SOURCE_BRANCH}` as-is.
2. **Separator alternates** — versioned develop branches may use `_` or `-` interchangeably between `develop` and the version (e.g. `develop_1.32` and `develop-1.32`). When the exact name is missing:
   - Build alternates by swapping every `_` ↔ `-` in `{SOURCE_BRANCH}` (try each distinct candidate).
   - Or list heads and pick the head whose name matches a candidate after normalizing separators.
3. **Canonical name** — when an alternate exists on the remote, set `SOURCE_BRANCH` to the **exact remote branch name**.
4. **Missing** — when no candidate exists after step 2:
   - If `SOURCE_BRANCH` was `develop` (fallback) → abort with the exact `ls-remote` error; ask the operator once.
   - Otherwise → do not pick another branch; ask the operator once.

## Examples

| Milestone / version | Remote has | `SOURCE_BRANCH` |
| ------------------- | ---------- | --------------- |
| `1.32 - Billing` | `develop_1.32` | `develop_1.32` |
| `1.32 - Billing` | `develop-1.32` only | `develop-1.32` |
| `1.32 - Billing` | *(none)* | `develop` |
| `2.1.0 - Multitenant` | `develop_2.1` | `develop_2.1` |
| `develop-1.32` (explicit) | `develop_1.32` | `develop_1.32` |
| *(no milestone/version)* | *(no develop\_*)* | `develop` |

## Product rule

When `{harness_root}/rules/branch-resolution.md` exists, apply it at priority 3 **before** milestone/version discovery. Its output is still subject to remote validation and separator alternates above.
