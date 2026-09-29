# Phase 6 Scope (anatomical knowledge + search)

## Objective (registry)

Authoritative info layer (names/Latin/aliases/hierarchy/ontology/boundaries/
neighbors/vascular relations/sources/evidence) + high-performance search
QUERY→STRUCTURE→SELECTION→DETAIL. Knowledge-evidence reviewer mandatory.
No psychiatric claims unless authorized.

## Citation honesty (the defining constraint)

Every claim carries type + source + citation + evidence level. Provenance types:
- **DISTRIBUTION** — the name as listed in BodyParts3D `parts_list_e.txt`.
- **RECORD** — our own structure record / manifest / QA measurement.
- **ONTOLOGY** — FMA/TA2/Uberon identifiers **only where verified**; unverified
  lookups stay `UNVERIFIED`, never invented.
- **LITERATURE** — only with a real, checkable citation. No textbook claim without
  one. When in doubt, the claim is OMITTED and the gap recorded.

There is no literature corpus in this repo. Phase 6 therefore indexes what the atlas
actually contains (63 structures' records, hierarchy, distribution names, measured
spatial facts) and wires QUERY→STRUCTURE→SELECTION→DETAIL. Boundaries, neighbors,
and vascular relations are included **only** where already recorded in structure
records or hierarchy — nothing is newly asserted from general knowledge.

## Search requirements

Official names, aliases, abbreviations, hierarchy path, laterality. Precision over
recall: a query must never resolve to a structure the evidence does not support.
DOCUMENTED (geometry-free) nodes are searchable and clearly marked as such; selecting
one explains what is known vs what is not meshed.

## Out of scope

Psychiatric/RDoC/network/receptor/pharmacology content (Phase 8). Parcellation
labels (Phase 7). Any claim whose source cannot be named.
