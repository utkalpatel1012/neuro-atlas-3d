# PHASE 5.0.2 COMPLETION REPORT — Scientific Validation-State Audit

## Scope

Integrity-only audit (§2 scope respected): no new assets, no geometry changes,
no LOD regeneration, no coordinate changes, no new datasets, no Phase 5.1.

## Production assets audited

20/20 (4 legacy + 16 batch). Full matrix with actual values:
`docs/PHASE_5_VALIDATION_STATE_MATRIX.md` (13 states per asset + status
definitions + evidence Levels A–D + family audit notes).

## Validation states found

- PROVENANCE/GEOMETRY/COORDINATE validated: all 20 (hash-verified).
- ANATOMY_VALIDATED: 18 (2 hippocampi + 16 gyri). ANATOMICAL_MAPPING_PENDING:
  2 cortex composites (unchanged, correct — composite mapping unverified).
- CLEARED (`validation_status`): all 20 (pipeline QA clearance; never legal/
  scientific clearance — mechanically tested).
- Ontology: batch TA2/UBERON UNVERIFIED (marked); legacy CLAIMED (L5-flagged).
- Expert review: EXPERT_REVIEW_PENDING repo-wide (no EXPERT_VALIDATED claim
  anywhere in production records — tested).
- License: exact terms + LEGAL_REVIEW_REQUIRED on all 20; prohibited terms
  absent from live records (re-scanned).
- Runtime: RUNTIME_READY on all 20 (technical clearance only, documented).

## Inconsistencies found (2, both corrected with documented reasons)

1. Misapplied volume expectation: gyral QA reports carried a FAILED
   "Anatomical Volume Estimation Check" because the hippocampus band
   (1.5–4.8 cm³) was applied to 12–40 cm³ gyri. The geometry was never
   defective — the expectation was (L6: no documented gyral band exists).
   Fix: `validate_mesh.ts` measures without a reference band for non-cortex,
   non-hippocampus assets; 16 QA reports regenerated (timestamps + volume
   check only — analysis byte-identical, statuses unchanged).
2. Ambiguous ANATOMY_VALIDATED definitions across AGENTS.md, catalogue
   comment, six-criteria doc, and D7 implementation. Fix: single documented
   definition (source-authoritative identity + conformant geometry + measured
   scale/laterality plausibility; expert review separate; composites PENDING)
   in the matrix doc + scoped notes in AGENTS.md and ANATOMICAL_ASSET_QA.md.
   No blind downgrades: 18 statuses retained under §18 (documented source
   authority), 2 PENDING retained; every assignment mechanically tested.

## Assets downgraded

NONE — retention is evidence-backed per asset (matrix documents the exact
evidence per row); the alternative (downgrade) would have conflated
source-verified single parts with unverified composites.

## Evidence supporting retained statuses

Distribution taxonomy + positional cross-check (components record),
profile-conformant geometry (per-asset QA), measured scale/laterality,
hash-linked provenance; hippocampus additionally has the §3 benchmark audit.
Expert review: none claimed, none implied (separate PENDING state tested).

## Geometry hash verification

248/248 tracked source/canonical/LOD/structure files byte-identical before
and after (SHA-256 file-by-file, 0 changed). QA-report regeneration touched
only report JSON (timestamps + corrected volume check); no .stl/.glb/LODs.

## Exact test results

`npm test` 13/13 exit 0 (schema, pipeline 15, engine 10, assembly 20,
consolidation 8, cortex 40, integrity 49, plane-math 44, clipping 86,
presentation 92, mri-reference 103, registration 64, expansion 1069 —
incl. NEW evidence-rule/CLEARED/laterality tests). Typecheck clean. Build OK.
Asset validation 10/10 × sampled legacy + batch. `audit:phase1` passes.

## Remaining limitations

L1–L18 stand (no limitation resolved, none hidden). No new limitation class
introduced; the two corrected items above are recorded as fixed
inconsistencies, not limitations.

**PHASE_5_0_2_COMPLETE — READY_FOR_PHASE_5_1 (no Phase 5.1 work started).**
