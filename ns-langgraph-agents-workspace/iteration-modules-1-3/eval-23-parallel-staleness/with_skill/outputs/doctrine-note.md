# Doctrine note — eval 23

Source: `skills/ns-langgraph-agents/references/error-and-reliability.md`

| Assertion | Doctrine hook |
| --------- | ------------- |
| Compensate only stale producer | Lines 108–109: mismatch → stale; compensate only stale producer |
| Preserve sibling (settle-all) | Lines 112–114: settle-all; retry failed branch only |
| Start + finish version records | Lines 106–107, 110: two-version record required |
| Cite parallel producer staleness | Section heading line 100 |

Graceful degradation table (line 129) reinforces: parallel producer stale → compensate stale producer only.
