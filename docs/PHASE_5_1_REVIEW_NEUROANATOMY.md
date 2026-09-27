# Independent Neuroanatomy Review — Phase 5.1 (implementer fixes applied)

**Reviewer:** independent subagent (read-only pass; findings below). All items
verified with file:line evidence; anatomical identity, FMA mapping,
laterality, hierarchy, subdivision, topology, and Latin items PASS.

## FAIL-1 (fixed): manifest `legal_review_notes` misnamed deep structures

`update_manifest.ts` built the note from a hippocampus-default name string,
writing e.g. "(FMA258716 left hippocampus)" for thalamus across all 11 deep
entries. Machine-readable identity (`upstream_asset_id`, `structure_id`,
`ontology.fma_id`) was always correct — a provenance-note defect, not a
misregistration. **Fix applied:** name resolution now prefers the ingestion
`component_name`/`distribution_name`; manifest rebuilt; legacy 4 entries
verified byte-identical.

## FAIL-2 (fixed): `data/phase51_batch_qa.json` batch tag mislabeled

Tag read `phase5-batch1-gyral` (reused runner default) for the deep/limbic
batch. **Fix applied:** tag corrected to `phase51-deep-limbic`.

## OBS-1 (documented, no rename): `closed-pial-surface` profile on deep nuclei

"Pial" is cortico-centric, but thresholds (1 shell, 0 boundary) are
topologically correct for the measured geometry. Renaming profile IDs would
ripple through reports/manifest/tests for zero scientific gain; the QA doc
records that profile labels describe topology checks, not tissue classes.

## PASS items (evidence on file)

Identity/FMA/laterality/hierarchy/no-subdivisions/topology/Latin verified per
record (see reviewer evidence: distribution list, ingestion `source_asset_id`,
manifest centroids, hierarchy parents, QA shell counts). Septum correctly
absent everywhere except staging + rejection record. Scope doc accurate with
the as-built amendment (6 structures, 11 assets + 1 rejection).
