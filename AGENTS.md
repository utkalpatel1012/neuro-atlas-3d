# AGENTS.md — neuro-atlas-3d Permanent Project Instructions

Academic interactive 3D human neuroanatomy atlas (psychiatry residents, neuropsychiatry,
neuroscience trainees). Vanilla TypeScript + Three.js + Vite. No test framework (custom
assert + `tsx` suites); PowerShell 5.1 on Windows contributor machines; repo language is
English.

## Mission (non-negotiable)

**TRUTH > APPEARANCE · TRACEABILITY > CONVENIENCE · REPRODUCIBILITY > MANUAL EDITING ·
VALIDATION > ASSERTION · REAL ANATOMY > GENERATED ANATOMY · EVIDENCE > ASSUMPTION ·
EXPLICIT UNCERTAINTY > INVENTED CERTAINTY.**
A missing feature is acceptable. A labeled limitation is acceptable. An invented
anatomical or scientific claim is not.

## Scientific prohibitions (violation blocks merge)

- No fabricated anatomy, provenance, citations, hashes, coordinates, registration
metrics, or performance measurements.
- No invented gyri/sulci/nuclei/tracts unless indexed in TA2/TNA/FMA (see
`ANATOMICAL_ACCURACY_STANDARD.md`).
- No unsupported clinical claims, causality, or association→causation.
- No silent coordinate transforms, mirroring, geometry substitution, or anatomical
relabeling (component renames require source-authority evidence + audit trail).
- Never conflate: anatomical entity ≠ mesh; structure ≠ atlas parcel (HCP/Brodmann);
structure ≠ functional network; structural relationship ≠ functional membership.
(8 namespaces in `ENTITY_IDENTITY_AND_REFERENCING.md`, never interchangeable.)
- Research-only asset ≠ production asset. Automated tests ≠ browser validation ≠
physical-device validation.
- Never fix anatomical uncertainty by generating geometry — document NOT CURRENTLY
REPRESENTED instead. No expert validation claimed without a documented expert review
(EXPERT_REVIEW_PENDING otherwise).

## Provenance & licensing

- Every structure record needs: source dataset + version + FMA/source ID + laterality +
source URL + source hash (or `NOT_YET_GENERATED` pre-pipeline) + source license +
processing lineage. Never cite scripts that don't exist; never paste metrics no
computation produced.
- Source/license separation: upstream license ≠ project distribution policy.
- `PRODUCTION_ALLOWED` vs `RESEARCH_ONLY` vs `LEGAL_REVIEW_REQUIRED`
(`SOURCES_AND_LICENSES.md`). HCP = legal-review gate; Julich-Brain/BigBrain = never in
production bundles. Check production bytes, not just docs. Record exact license terms
+ uncertainty; never counsel-pretending language ("dual compliance", "cleared",
"unrestricted") — LEGAL_REVIEW_REQUIRED where unresolved.
- Canonical vs runtime assets are separate: `assets/raw` (immutable source) →
`assets/derived/{canonical,lod,runtime}` → `assets/manifests`. Never edit derived
geometry by hand; fix the generator script and re-run the stage. Validation reports
(`assets/validation`) must not embed bulk vertex arrays or absolute local paths.

## Coordinates (audited 2026-09-27, see `docs/OPENCODE_PROJECT_HANDOFF_AUDIT.md`)

- Canonical space is an INTERNAL engine space: +X Right, +Y Superior, +Z **Posterior**
(right-handed). It is NOT RAS-ordered and NOT MNI152. Keep the `canonical_atlas_ras`
identifier (stability) but never describe it as RAS or MNI.
- Source frame for BodyParts3D-derived STLs is ASSERTED (`dicom_lps_whole_body`),
not proven — BodyParts3D defines its own universal coordinate system. AC-PC centering
constants (-1561.7, +70.1) are asserted, method undocumented.
- Registration to any stereotaxic template requires real computation (ANTs SyN/FLIRT or
equivalent). Until then `registration_status: REGISTRATION_PENDING` with NULL metrics —
never illustrative numbers.
- Laterality must be verified through source metadata → transform math → canonical
orientation, never centroid sign alone.

## Validation states (use exactly)

- Geometric ≠ anatomical. `GEOMETRY_VALIDATED` covers edge/volume/bounds accounting only.
`ANATOMY_VALIDATED` = source-authoritative identity + conformant geometry + measured
scale/laterality plausibility (Level A+B; the benchmark hippocampus additionally has
a morphological audit in `docs/ANATOMICAL_ASSET_QA.md` §3). It is NOT expert review
(`EXPERT_REVIEW_PENDING` is tracked separately) and NOT a morphological proof for
new segments. Multi-part composites with unverified component mapping stay
`ANATOMICAL_MAPPING_PENDING`. Landmark/label anchors in `src/types/semantic.ts` are
SCHEMATIC_UNVALIDATED until expert-verified against the mesh.
- QEM simplification is LOSSY. Meshopt encoding is lossless only vs its LOD input
(round-trip ≤1e-6 mm). Never call the pipeline lossless.
- Test tiers: `AUTOMATED_TEST_VALIDATION` (Node/`tsx` headless) ≠ `BROWSER_VALIDATION` ≠
`PHYSICAL_DEVICE_VALIDATION`. All FPS/VRAM/PWA/iPad claims are TARGETS until measured
on hardware; raycast timings are CPU-side milliseconds, run-varying.

## Workflow per phase

RESEARCH → INSPECT → PLAN → IMPLEMENT → TEST → VISUALLY VERIFY → SCIENTIFICALLY VERIFY
→ DOCUMENT → COMMIT → STOP AT PHASE BOUNDARY. Never drift into the next phase.
Before using any external scientific dataset verify: source, version, license,
attribution, coordinate system, population/reference, scope. If uncertain, do not guess.

## Commands (only these exist — no lint, no e2e, no framework)

- `npm.cmd test` — full suite (15 `tsx` test files: schema, pipeline, engine,
assembly, consolidation, cortex, phase31, section-math, section, presentation,
mri, registration, phase5, quality51, anatomy51). Focused runs: `test:schema|
pipeline|engine|assembly|consolidation|cortex|phase31|section-math|section|
presentation|mri|registration|phase5|quality51|anatomy51`.
`npm.cmd run typecheck` (`tsc --noEmit`, covers `src/**` only). `npm.cmd run build`
(Vite; `fs`/`path`-in-`AssetManager` externalization warning is known).
- `npm.cmd run pipeline:run | asset:validate | audit:phase1` for pipeline-side checks.
- Use `npm.cmd`, not `npm` (PowerShell execution policy blocks `npm.ps1`).

## Reviewers

For large phases, create independent reviewers under `.opencode/agents/` (e.g.
neuroanatomy, provenance, 3D-performance) and never let one agent certify its own work.
Small tasks need no new agents.

## History rule

Phase reports (`PHASE_*_REPORT.md`) are immutable history. Correct them via new
superseding documents (e.g. `PHASE_3_1_SCIENTIFIC_INTEGRITY_REPORT.md`) plus header
notices — never by rewriting.
