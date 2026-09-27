# Part 4 Entry Criteria (Phase 4 = Sectional Neuroanatomy + Clipping + MRI Co-registration)

**Rule: Phase 4 must NOT begin until every box is checked with evidence.
A documented limitation does NOT block; a false claim, fabricated metric, broken
provenance chain, or unresolved critical contradiction DOES (per §43).**

## Representation honesty

- [x] Current cortical representation is described accurately (16-shell concatenated composite, partial covering — manifest, records, docs, TEST 1)
- [x] No false "welded" or "continuous surface" claims remain in live records (scanner TEST 6/7/8 + grep audit; history preserved with notices)
- [x] All source components remain traceable (14/side: ingestion.json → manifest.source_components → components doc → TEST 1)

## Coordinates and registration

- [x] Coordinate axes are mathematically defined (+X R, +Y S, +Z Posterior; det=+1; TEST 2)
- [x] Coordinate transform is verified (corner mapping + centroid reproduction + camera realignment)
- [x] MNI registration is not falsely claimed (all records `not_registered`/PENDING, zero metrics, TEST 6/7)
- [x] Laterality is explicit and validated (metadata→math→signs chain, TEST 4)

## QA and terminology

- [x] LOD/compression terminology is correct (QEM lossy; meshopt scoped; TEST 8)
- [x] Geometric QA and anatomical QA are separate (ANATOMICAL_MAPPING_PENDING for cortex; morphological claims retracted)
- [x] No fabricated validation metrics remain (scanner TEST 6/7; phantom script gone)
- [x] Landmark anchors explicitly schematic (SCHEMATIC_UNVALIDATED, TEST 10; EXPERT_REVIEW_PENDING per L13)

## Licensing and separation

- [x] Licensing metadata is source/version-specific (exact terms; mirror named; no counsel-pretending language; TEST 5 + Check 15)
- [x] Research-only assets are quarantined (4-asset whitelist; zero restricted bytes; TEST 9)
- [ ] Code-license conflict resolved (L8: package.json CC-BY-SA-4.0 vs Apache-2.0 claim, no LICENSE file) — **OPEN, documented, blocks commercial redistribution (not Phase 4 planning)**

## Implementation consistency

- [x] README matches actual implementation (actual-vs-planned split; TEST 12)
- [x] Production manifest is internally consistent (16/16 runtime files exist; hashes revalidated in-test, not trusted)
- [x] Runtime resources have documented ownership (owns/gaps itemized in L11 + current-state audit §7; LOD leak fixed + TEST 11)
- [x] Device validation is honestly labeled (AUTOMATED_TEST_VALIDATION everywhere; no device claims)
- [x] Tests pass (7/7 suites) and build passes (`tsc` + `vite build` + `asset:validate` + `audit:phase1`)
- [x] No critical scientific-integrity contradiction remains (invariants 6/8/10 amended to match reality)

## Verdict linkage

All boxes except the explicitly non-blocking L8 documentation item are checked.
Per §43 (documented limitation ≠ block), the repository may proceed to Phase 4
PLANNING when instructed. Phase 4 execution additionally requires, per phase:
verified dataset provenance BEFORE any MRI import, section-plane math proofs, and
reviewer-agent sign-off as defined by the Phase 4 plan.

## Phase 3.2 certification (entry-certification pass, same file, no boxes altered)

Phase 3.2 verified every box above still holds after its own changes and added:
landmark policy (`docs/ANATOMICAL_LANDMARK_VALIDATION.md`, all 24 anchors classified
SCHEMATIC with misplacements itemized); section-plane math spec + tested pure module
(`docs/SECTION_PLANE_SPECIFICATION.md`, `src/engine/sectionPlanes.ts`, 22 checks;
coronal→Z / axial→Y mapping verified against measured axes); MRI strategy with
acquisition deferred (`docs/MRI_REFERENCE_DATA_STRATEGY.md` + machine-checked
`data/mri_candidates.json`); license matrix (`docs/PRODUCTION_DATASET_LICENSE_MATRIX.md`);
independent review (`docs/PHASE_3_2_INDEPENDENT_REVIEW.md`: 2 MAJOR fixed, rest
documented); runtime constraints (`docs/PHASE_4_RUNTIME_CONSTRAINTS.md`); parcellation
+ psychiatry schema compatibility verified additive-only (no schema change needed).
Verdict: `PHASE_3_2_ENTRY_CERTIFICATION.md`.

## Phase 4A completion record (certification pass � entry boxes above unchanged)

Phase 4A (mesh-based sectional visualization) implemented and certified:
sagittal/coronal/axial/oblique GPU clipping, inversion, multi-plane intersection,
enable/disable/reset, gizmo, minimal UI, LOD persistence, BVH-documented picking
with fully-clipped exclusion (TEST 7), bounded lifecycle. Evidence:
docs/PHASE_4_SECTIONAL_VISUALIZATION.md, PHASE_4A_COMPLETION_REPORT.md,
44 math + 86 clipping checks green. Unrelated Phase 4 requirements (MRI,
parcellation, psychiatry layers, caps, device validation, L8 license conflict,
expert review) remain exactly as previously stated � nothing marked complete
beyond what Phase 4A did.

## Phase 4B completion record (certification pass � entry boxes above unchanged)

Phase 4B (anatomical section presentation) implemented and certified over the
intact Phase 4A clipping layer: presentation state, 7 explicit-number presets,
logical bookmarks, deterministic serialization, data-driven ranges, honest
stats, orientation/readout aids, section-aware labels/selection/focus/
isolation, TRUE derived caps/edges (mesh∩plane → contours → earcut; open/
grazing/disconnected/failure → edge-only/no-cap, never fake), LRU-12
LOD-keyed cache, explicit disposal, application-state reinit survival.
Evidence: docs/PHASE_4B_ANATOMICAL_SECTION_PRESENTATION.md,
PHASE_4B_COMPLETION_REPORT.md, 92 new presentation checks green (10/10 suites).
Caps are visualization geometry (no entity ID, no provenance) and imply no
MRI/internal anatomy. Still deferred: MRI, MNI, HCP/Julich/BigBrain runtime,
psychiatric overlays, AI tutor, new anatomy, device proof, L8, expert review.
