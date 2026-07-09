# SOURCE_BRANCH — remote validation

Used by Gate 1 in `execute-gitlab-issue` after `SOURCE_BRANCH` is resolved from a
product rule, the issue text, or human confirmation.

## Validate on remote (mandatory)

```bash
git -C "{product_root}" fetch origin
```

1. **Exact match** — if `git ls-remote --exit-code --heads origin {SOURCE_BRANCH}` succeeds, keep `{SOURCE_BRANCH}` as-is.
2. **Separator alternates** — versioned develop branches may use `_` or `-` interchangeably on the remote (e.g. `develop_1.32` and `develop-1.32` are the same logical branch). When the exact name is missing:
   - Build alternates by swapping every `_` ↔ `-` in `{SOURCE_BRANCH}` (try each distinct candidate).
   - Or list heads: `git ls-remote --heads origin` and pick the head whose name matches a candidate after normalizing separators to a single form (e.g. compare with `_` replaced by `-`).
3. **Canonical name** — when an alternate exists on the remote, set `SOURCE_BRANCH` to the **exact remote branch name** (do not keep the unresolved spelling).
4. **Missing** — when no candidate exists after step 2, abort with the exact `ls-remote` error. Do not substitute `main`, `master`, or the current checkout.

## Examples

| Resolved / expected | Remote has              | Use              |
| ------------------- | ----------------------- | ---------------- |
| `develop-1.32`      | `develop_1.32`          | `develop_1.32`   |
| `develop_1.32`      | `develop-1.32`          | `develop-1.32`   |
| `develop-1.32`      | *(none)*                | Abort            |

## Product rule

When `{harness_root}/rules/branch-resolution.md` exists, apply it **before** this
remote validation. Its output is still subject to the separator-alternate check
above when the exact name is not on the remote.
