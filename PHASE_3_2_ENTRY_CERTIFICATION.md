# Phase 3.2 Entry Certification (FINAL PHASE 4 ENTRY CERTIFICATION)

## Purpose
Certify — not implement — Phase 4 entry. Resolve or formally document the five
gates from PART_4_ENTRY_CRITERIA.md. No anatomy added/modified; no geometry
regenerated; no HCP/Julich runtime; no psychiatry population; no renderer redesign.

## Starting repository commit
`606a36d` (`feat(phase-3.1): complete scientific integrity and phase 4 readiness gate`),
pushed to origin/main and remote-verified. Working tree clean at start.

## Phase 3.1 status
COMPLETE (all 15 corrections, 43 integrity checks green at handoff). Re-verified,
not assumed: full gate re-run in this pass before and after every change.

## Gate 1 — Anatomical landmark verification: DOCUMENTED (schematic, gated)
Evidence: all 24 anchors classified in `docs/ANATOMICAL_LANDMARK_VALIDATION.md`
(none VERIFIED/SOURCE-DERIVED; pole/parieto-occipital/calcarine anchors misplaced
under the old false convention — left in place per no-fabrication rule; STG/cuneus/
lingual anchors refer to geometry not in mesh; gyral anchors left-only).
Policy levels SOURCE-VERIFIED → EXPERT-REVIEWED defined; promotion requires evidence
trail; TEST 10 + TEST 13 enforce. Labeling≠validation stated explicitly (§3).
Phase 4 may use anchors for label placement only — never for measurement, section
anchoring, or clinical claims.

## Gate 2 — Section-plane mathematics: VERIFIED (spec + tested model)
Evidence: `docs/SECTION_PLANE_SPECIFICATION.md` + `src/engine/sectionPlanes.ts`
(pure math, no renderer) + 22 unit checks. Model: n·(p−p₀)=0, retained d≥−ε
(ε=1e-6 mm), degenerate inputs rejected, provenance mandatory. Axis mapping VERIFIED
against measured axes: SAGITTAL→X constant, CORONAL→Z constant, AXIAL→Y constant
(the naive RAS coronal→Y/axial→Z mapping is documented WRONG for this repo).
Mid-coronal plane separates measured frontal/occipital centroids in-test. Future-MRI
and annotation compatibility constrained (volumes need own verified transform first;
no unvalidated-anchor-defined planes).

## Gate 3 — MRI/reference strategy: DOCUMENTED (requirements defined, acquisition deferred)
Evidence: `docs/MRI_REFERENCE_DATA_STRATEGY.md` + machine-checked
`data/mri_candidates.json` (5 candidates, all deferred, none production-ready —
TEST 13). Needs A/B distinguished from C/D; MNI kept separate (§9: future pipeline
is CANONICAL → VERIFIED TRANSFORM → MNI, unimplemented). Explicit statement: no MRI
dataset is yet safe to integrate.

## Gate 4 — Licensing status: DOCUMENTED (exact terms + open questions)
Evidence: `docs/PRODUCTION_DATASET_LICENSE_MATRIX.md` (11 rows, VERIFIED or
LEGAL_REVIEW_REQUIRED). Production rests on one lineage (BodyParts3D Rel.3.0 →
mirror → CC-BY-SA-4.0 derivatives) with retroactivity UNRESOLVED; NC sources
quarantined; code-license conflict (L8) still open and flagged. No counsel language
anywhere in live records (scanner-enforced).

## Gate 5 — Independent reviewer audit: VERIFIED (hunt completed)
Evidence: `docs/PHASE_3_2_INDEPENDENT_REVIEW.md`. 2 MAJOR findings (SceneManager
orientation comments + AC-PC origin name; stale "Phase 3.0" UI subtitle) — both
FIXED and tested. Dead machine-local links across 7 files FIXED. Negative hunts
recorded (no stray binaries: 32 STL + 36 GLB exact; no secrets; no identity lookups;
no limbic-as-parent). No CRITICAL findings. Redeploy-then-reverify noted (L12).

## Evidence examined (this pass)
AGENTS.md, entry criteria, Phase 3.1 report, limitations, components doc, both prior
audits, accuracy standard, coordinates, architecture, tech stack, entity/provenance/
license/roadmap/README docs; src/types, src/engine (incl. Camera/Scene/LOD/Label
managers), scripts, data, manifests; full test/typecheck/build/validate/audit runs;
GitHub API remote verification; live Pages manifest fetch (pre-3.2 content, expected).

## Changes made (this pass only)
1. SceneManager orientation comments + node renames (`Ref_Canonical_Axes_30mm`,
`Ref_Canonical_Origin_Approx`); 2. index.html subtitle → Phase 3.1;
3. dead `file:///` links → relative (7 files); 4. new docs: landmark validation,
section-plane spec, MRI strategy, license matrix, independent review, runtime
constraints; 5. new pure module `sectionPlanes.ts` + 22 math checks;
6. `data/mri_candidates.json` + TEST 13; 7. entry-criteria linkage note.
NO geometry touched (zero .stl/.glb changes — verified via name-status).

## Unresolved limitations
L1–L13 stand (partial covering, schematic anchors, no registration, asserted frame/
constants, unverified ontology IDs, unjustified bands, UI duplication risk, license
conflict, heavy history, single-subject source, resource gaps, deploy caveats, no
expert review) + new: live Pages content predates 3.2 until redeploy; gyral-anchor
coverage left-only; per-LOD refcount granularity still coarse. All documented with
resolvers; none is a hidden falsehood.

## Test results (final run, this machine)
`npm test` 7/7 (schema 7, pipeline 15, engine 10, assembly 20, consolidation 8,
cortex 40, integrity 47); `typecheck` clean; `vite build` OK;
`asset:validate` 10/10 ×3; `audit:phase1` all pass. No tests removed or weakened
(two tests strengthened: schema fixture phantom-script string labeled synthetic).

## Final Phase 4 decision
All five gates resolve to VERIFIED-or-DOCUMENTED with zero CRITICAL findings and no
remaining false claim in live records. Per §43/§20 (documented limitation ≠ block):

## PHASE_3_2_COMPLETE — PHASE_4_READY_WITH_LIMITATIONS

(Limitations: expert/device/legal reviews pending; resource gaps fenced by runtime
constraints; MRI acquisition deferred by rule. None prevents the planned Phase 4
sectional-visualization work, which must itself satisfy the runtime constraints and
dataset-provenance rules above.)
