# Access and citation

Trust is retrieval **plus** permission **plus** quotes. Generation does not invent access it did not receive.

## ACL before search

Apply the same permission predicates used by existing document search **before** vector, hybrid, or hop expansion. Post-filtering after ANN leaks neighbors into scores and timing.

Denied rows are **absent**. Never return “you cannot see this.” Absence and empty corpus are indistinguishable to the caller.

Every retrieval tool (vector, graph, batch gets) checks the same permission family. No generic “search everything” bypass.

## Cite or refuse

Grounded generation instructions:

- Use retrieved context only.
- If insufficient, **do not know**.
- Each asserted fact carries **verbatim** source spans (unit text) and document/page links the operator can open.

Nested structured fields (title, year, …) each have their own `sources` + `reasoning`. A table of values without quotes is not done.

## Path as citation

Multi-hop answers cite **edges** (document, page, confidence) not only the last node. The UI may draw that path; clicking a node/edge opens the source record in the host system.

## Uncatalogued mentions

People or orgs in files but not on cadastre stay labeled as not registered. Do not silently promote them to surviving identities without resolution policy.

## Logging

Audit query, retrieved ids, path, and answer for mean-time-to-detect of citation failures. Session/thread persistence follows product isolation rules (not this skill’s store choice).
