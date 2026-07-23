# Version roadmap — {version_san}

**Product:** {product_name}  
**Master requirements:** `docs/versions/{version_san}/requirements.md`  
**Generated:** {date}

## Subversion plan

| NN | subversion_san | Features | deps | tasks est. | tokens est. | status |
|----|----------------|----------|------|------------|-------------|--------|
| 01 | 01-auth | F001, F002 | - | 6 | 120 | pending |
| 02 | 02-billing | F003, F004 | 01-auth | 5 | 95 | pending |

## Notes

{Partition rationale — oversized groups split, merges for undersized slices}

## Next steps

1. Human validates roadmap (Gate Roadmap)
2. For each subversion in dependency order: run consistency + task generation on slice `requirements.md`
3. Update `status` → `planned` after each slice is planned
