# OpenCode Project Handoff Audit — Documented State vs Actual Repository State

**Date:** 2026-09-27
**Auditor:** OpenCode primary engineering agent (project takeover from previous AI environment)
**Method:** Full repository read (docs, source, pipeline, assets, tests), git history review
(11 commits, `main`), independent geometric re-measurement of raw STL assets (vertex-level
shell/centroid analysis), live test/typecheck/build execution, authoritative external
verification (BodyParts3D distribution name list, DBCLS/LSDB portal, mirror repository).
**History rewritten:** Nothing. Prior phase reports are preserved as-is; corrections are
recorded in Phase 3.1 documents, not by editing history.

---

## PART C — CURRENT PROJECT REALITY CHECK

### C1. Phases genuinely implemented (verified in code, assets, passing tests)

| Phase | Genuine state |
|---|---|
| Phase 0 / 0.1 / 0.1.1 | Schema/type ontology (`src/types/*`, 8-namespace entity URIs), GRADE/OXFORD evidence types, provenance manifest types, architectural invariants docs. Tests: `schema_validation.test.ts` passes. **IMPLEMENTED.** |
| Phase 1.0 / 1.0.1 | Asset pipeline for single STLs (ingest → QA → canonicalize → LOD → meshopt → manifest) proven on bilateral hippocampus. Derived GLBs + validation reports on disk. Tests: `pipeline_regression.test.ts` (15 checks) passes. **IMPLEMENTED (geometric pipeline only).** |
| Phase 2.0 / 2.1 / 2.1.1 | Vanilla-TS Three.js engine (WebGPU attempt w/ WebGL fallback), assembly/groups, selection/visibility, LOD manager, labels, camera presets. Tests: `rendering_engine`, `anatomical_assembly` (20), `architecture_consolidation` (8) pass **in Node/headless only**. **IMPLEMENTED as code; DEVICE_VALIDATION_PENDING.** |
| Phase 3 (as specified in roadmap = dissection engine) | **NOT IMPLEMENTED.** No peel/isolate/explode/split, no clipping planes. |
| Phase 3 (as executed in commit 995f7be = bilateral cortex ingestion) | Geometry pipeline executed for 2 composite cortex assets; 39-check suite passes. **EXECUTED but scientifically MISDESCRIBED** (see D1–D8). Geometric facts hold; anatomical/terminological claims do not. |

### C2. What phase reports claim vs what exists

- `PHASE_3_REPORT.md` (status `PHASE_3_COMPLETE`) claims: welded continuous pial surfaces,
28 structures, closed surfaces, lossless compression, microsecond raycasting. **Geometry
executed; descriptions false** (D1, D6, D8). Additionally, 10 of 28 component names are
mislabeled against the authoritative source name list (new finding F1, below).
- `PART_3_ENTRY_CRITERIA.md` (`PART_3_READY`) claims are the most honest in the repo
(explicit PENDING registration, automated-vs-device validation split) and **hold**.
- `DEVELOPMENT_ROADMAP.md` still describes Phase 3 as "Interactive Dissection Engine" —
**stale relative to what was built** (cortex ingestion). Terminology clash documented, not
rewritten.

### C3–C4. What actually exists vs what is only planned

EXISTS: 4 production mesh assets + LOD/meshopt derivatives + manifests + 4 structure JSONs
+ engine + 6 headless test files + full pipeline scripts.
PLANNED ONLY (no code, no deps, no assets): React 19, React Three Fiber, Zustand,
MiniSearch, Dexie, PWA/service worker, KTX2/Basis textures, HCP MMP runtime parcels,
Julich-Brain/BigBrain runtime data, MRI co-registration, clipping planes, psychiatry
modules, AI tutor. (`package.json` dependencies are ONLY `three` + `three-mesh-bvh`.)

### C5–C8. Verification stratification

- **Scientifically verified:** bilateral laterality chain (FMA lateral IDs → sign-flipping
rigid transform → canonical X signs; independently re-measured); triangle-count
conservation through ingestion (198230 / 198310); SHA-256 manifest consistency;
research-quarantine (no HCP/Julich/BigBrain bytes in production paths).
- **Geometrically verified only:** edge-based manifold/watertight accounting, volumes,
bounds, LOD ratios, meshopt round-trip (≤1e-6 mm), Node-side BVH raycast timing.
- **Automatically tested only:** all 6 suites (custom assert+`tsx`, no framework). All pass.
- **NOT tested on a real browser/device:** everything GPU-related (FPS, VRAM, PWA,
iPad/Jetsam, WebGPU fallback behavior). Build emits a warning that `fs`/`path` are
externalized in the browser bundle (`AssetManager.ts` imports Node modules; browser path
uses `fetch`, Node path uses `fs` — works by environment branch, but'transforms' cleanly
only because of the branch; flagged for future hardening, out of Phase 3.1 scope).

---

## PART D — PRE-PHASE-4 BLOCKER AUDIT (findings)

### D1. Cortical representation — CONCATENATION, not welding. [CONFIRMED FALSE CLAIM]

`combineBinarySTLs` (`scripts/pipeline/ingest_cerebral_cortex.ts:86-108`) slices raw
triangle payloads (`buf.subarray(84, 84 + count*50)`) and `Buffer.concat`s them. No vertex
welding, no mesh union, no deduplication, no hole filling.
Independent re-measurement (vertex-quantized union-find over both raw masters):
**16 disjoint closed shells per hemisphere** (14 components; FMA72654/FMA72702 contain
2 shells each). Triangle sums match exactly (L 198230, R 198310) — pure concatenation.
Edge-based QA passes only because each shell is individually closed; `stl_utils.ts` has
no shell/component counting, so the QA **cannot distinguish** one continuous pial surface
from 16 disjoint shells.
False strings: "welded" (`PHASE_3_REPORT.md:16`, `docs/PHASE_3_ASSET_PIPELINE.md:62`),
"continuous pial manifold/meshes", `topology_class: CLOSED_SURFACE`,
`topology: closed_pial_surface`, `profileId: closed-pial-surface` for cortex assets.

### D2. Source-component provenance — present at raw layer, mislabeled, absent downstream.

`assets/raw/mesh.cortex.{left,right}.v1/ingestion.json` retains per-component FMA ID, name,
lobe, SHA-256, triangle count, byte length, per-component mirror URL. Downstream
(manifest, `data/structures/cortex_*.json`, derived assets) carries **no component
breakdown** — only the composite hash. **F1 (new, critical): 10 of 28 component names are
wrong** versus the authoritative BodyParts3D name list (`parts_list_e.txt` from the same
distribution the files were downloaded from):

| File | Repo label | Authoritative name |
|---|---|---|
| FMA72685/72686 | superior temporal gyrus | **middle** temporal gyrus |
| FMA72687/72688 | middle temporal gyrus | **inferior** temporal gyrus |
| FMA72689/72690 | inferior temporal gyrus | **fusiform** gyrus |
| FMA72701/72702 | cuneus (lobe: occipital) | **accessory short gyrus** (insular; lobe must be insula) |
| FMA72705/72706 | lingual gyrus (lobe: occipital) | **parahippocampal** gyrus (lobe must be limbic/medial-temporal) |
| FMA72717/72718 | parahippocampal gyrus | **cingulate** gyrus (lobe limbic retained) |

Positional cross-check (measured centroids) confirms the authoritative names: FMA72702
sits lateral-anterior (insular short gyri, not medial-posterior cuneus); FMA72718 sits
medial with long AP span (cingulate, not parahippocampal). Consequence: the composite
contains **no superior temporal gyrus, no cuneus, no lingual gyrus** (as separate pieces);
it DOES contain fusiform, insular accessory gyri, and cingulate under wrong names. The
"28 authentic structures" count is right; the identity list is 36% wrong. Lobe
assignments wrong for 2 components/side (72702 → insula, 72706 → limbic).
Hippocampus FMA72713/72714 labels verified correct.

### D3. Coordinate system — documented axes contradict the coded math. [CONFIRMED]

Coded transform (`BODYPARTS3D_LPS_TO_RAS_ADAPTER`): `Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1`
(determinant +1: proper rigid rotation, **no mirroring** — verified). Measured consequence
(three independent lines: lobar rostrocaudal ordering, pre/postcentral neighbor order,
hippocampus ventral-anterior position): **canonical +Z points POSTERIOR** (frontal chunks
at low Z, occipital chunk at high Z). Every "+Z Anterior" string and the "RAS" label are
therefore false: the space is an internal right-handed (+X Right, +Y Superior,
+Z Posterior) space — neither RAS order nor MNI. Further contradictions: the file header
calls it "Right-Handed RAS (+X Right, +Y Superior, +Z Anterior)" (self-contradictory —
that axis order is not RAS); `docs/PHASE_3_SOURCE_EVALUATION.md:41` states a DIFFERENT
formula (`Y_RAS=-Y_LPS, Z_RAS=Z_LPS`, no permutation) that the code does not implement;
manifest/`cortex_*.json` step-3 records `transform: x_negated_z_negated`, which describes
neither the code (x-negate + y/z swap) nor the eval doc. Translation constants
(-1561.7, +70.1) are consistent with the data (they center it) but their derivation is
undocumented — ASSERTED, method unknown. Source frame `dicom_lps_whole_body` is ASSERTED:
BodyParts3D defines its own "universal coordinate system" (Mitsuhashi et al. 2009); no
citation in repo proves the mirror's STLs are DICOM LPS. Actual acquisition point is a
third-party GitHub mirror (OBJ→STL converted, mirror itself warns some models are
"display purposes" grade) — recorded per-component (good) but the top-level `source_url`
cites the DBCLS portal, and `source_asset_id: FMA61830_L/R` inherits the mirror's
labeling unverified.

### D4. MNI registration metadata — fabricated numbers + phantom script. [CONFIRMED]

`cortex_*.json`: `registration_status: REGISTRATION_PENDING` alongside
`registration_method: affine_linear_12dof`, `target_reference_template:
MNI152NLin2009cAsym_1mm.nii.gz`, `registration_uncertainty_mm: 1.2`,
`dice_similarity_coefficient: 0.85`. No registration computation exists anywhere in the
pipeline (only the rigid adapter). **These numbers are unmeasured and must go.**
Worse, `hippocampus_*.json` cite `registration_source:
scripts/pipeline/register_to_mni152.py` — **that file does not exist** in the repo
(glob-verified) — with uncertainty 1.1 / dice 0.81, plus a `registered_coordinate_frame:
mni152_nonlinear_2009c_asym` that was never registered. False provenance in all four
structure records. Additionally `source_centroid` == `registered_centroid` verbatim in
cortex records: the "source" value is actually the canonical bounding-box center
(reproduced arithmetically), i.e. the source-frame centroid was never measured.

### D5. Laterality — VERIFIED through the full chain (not centroid-sign alone).

Source: lateralized FMA IDs (odd/even L/R convention confirmed against parts list).
Transform: X-negation only (rigid, determinant +1, no mirror). Canonical: left comps
X>0→Xc<0 (min -0.10 mm midline touch from cingulate/occipital pieces), right mirrored;
bbox centers L -32.50 / R +33.78. Hemispheres are genuinely distinct meshes (198230 vs
198310 tris), not mirrored copies. **Laterality: PASS.**

### D6. LOD terminology — "lossless" mis-scoped. [CONFIRMED]

QEM simplification to 100/75/50/25% is **lossy by construction** (with measured fidelity
metrics — good). The meshopt step (`encodeGltfBuffer`, ATTRIBUTES+TRIANGLES modes, no
quantizer in this path) is entropy coding of the supplied LOD buffers, round-trip
verified to max Δ ≤ 1e-6 mm — "lossless" is legitimate **only for that step**, and
"bit-exact" overstates a 1e-6 tolerance check. Unqualified "lossless"/"bit-exact
lossless roundtrip" (`PHASE_3_REPORT`, both manifests, all four structure JSONs,
compression reports, `optimize_meshopt.ts` log, `cerebral_cortex.test.ts` log,
`audit_phase1.ts` log, `PHASE_2_1_REPORT`'s confused "index quantization") must be
re-scoped. Full-pipeline-"lossless" is never true.

### D7. Anatomical QA — status confers what was never tested. [CONFIRMED]

`runAnatomicalQA` returns `ANATOMY_VALIDATED` + "Macroscopic anatomical contours match
adult standard" from: a dimension string, a volume-in-wide-band check (180–380 cm³,
unjustified band), and one `notApplicable` subfield check. No contour comparison, no
landmark verification, no sulcus/gyrus check exists. The enum already provides the honest
value (`ANATOMICAL_MAPPING_PENDING`) — it was just never used. Semantic landmark anchors
(`src/types/semantic.ts`, 24 landmarks + lobe centroids) are hand-authored placements
with no measurement provenance; worse, they were authored under the false +Z=anterior
convention: the frontal-pole anchor (Z=+62) sits at the mesh's occipital end and the
occipital-pole anchor (Z=-102) at its frontal end (bounds-verified); pre/postcentral
relative order is likewise inverted vs the mesh. Anchors are schematic at best, actively
misleading at worst — recorded as limitation, not silently moved (repositioning them by
auditor judgment would itself be fabrication).

### D8. Performance claims — all TARGET or AUTOMATED_TEST, none MEASURED on device.

- "60 FPS / 30–60 iPad / VRAM ceilings / draw calls / startup seconds" (PROJECT_ARCHITECTURE,
PERFORMANCE_BUDGETS, roadmap gates): **TARGET** budgets, never measured. Budgets docs
already frame them as ceilings — but architecture/roadmap prose states them as operating
facts.
- "1.317 ms … 26x faster … microsecond raycasting" (PHASE_3_REPORT): a single Node.js
CPU timing of three-mesh-bvh (re-run here: 0.987 ms, 1.028 ms — run-varying). **Unit is
milliseconds, environment is headless CPU, GPU relevance zero.** Classify
AUTOMATED_TEST_VALIDATION; the "microsecond" word is numerically false (1 ms = 1000 µs).
- "iPad safe", KTX2 "saves 75% VRAM", "100% offline PWA": no iPad, no KTX2 bytes, no
service worker anywhere. **UNKNOWN / unimplemented.**
- Test-quality note: `cerebral_cortex.test.ts` TEST 3 asserts the fissure gap from
hardcoded literals (`1.179 - 0.098`) rather than measuring the GLBs; TEST 8's <15 ms
threshold is arbitrary and environment-dependent. Values reproduce from data (gap is
real), but the test proves arithmetic, not geometry.

---

## PART E — PACKAGE/ARCHITECTURE CONSISTENCY AUDIT

README describes **React 19, React Three Fiber, Zustand, MiniSearch, Dexie, PWA/service
worker, KTX2** as the stack. Actual: zero of these in `package.json`, zero imports in
`src/`, zero assets (`*.ktx2`), zero manifest/service-worker. The app is vanilla TS +
Three.js + three-mesh-bvh + OrbitControls + hand-rolled CSS UI. `TECH_STACK_DECISION.md`
is a legitimate *decision* record but is written in present tense as if implemented;
`PROJECT_ARCHITECTURE.md` Tier 6 claims HCP MMP/Brodmann "mapped as GPU vertex
attributes" — parcellation exists only as TypeScript types + test fixtures, no runtime
data. Nothing was installed to match the docs (per instruction); the docs must be
corrected to ACTUAL vs PLANNED. No HCP/Julich/BigBrain bytes found in production asset
or data paths — quarantine holds (claims about quarantine are TRUE; only the
forward-looking stack claims are false).

## Incidental findings (recorded, out of Phase 3.1 scope)

1. `geometry_qa.json` files embed full vertex/index arrays → **51 MB per cortex file**
(~200 MB across 4 assets) committed to git; `sourceFile` leaks a previous machine's
absolute path. Generator fix + regeneration is in scope (artifact honesty); history
itself is left alone.
2. `AssetManager.ts` imports Node `fs`/`path` (browser build externalizes them with a
Vite warning; works via `typeof window` branching). Fragile; future hardening only.
3. `DEVELOPMENT_ROADMAP.md` "Phase 3 = dissection engine" vs executed "Phase 3 =
cortex ingestion" — numbering clash for a future planning session; not renamed here.
4. `TA2:5415`, `FMA:242442/242443`, `UBERON:0000956` (0000956 is the UBERON ID for whole
*brain*, suspect for cortex), volume band 180–380, AC-PC constants: UNVERIFIED, listed
in `docs/KNOWN_ANATOMICAL_LIMITATIONS.md` for expert review — not asserted, not
"fixed" by invention.

## Audit verdict on blockers

D1 (terminology), D2 (labels + downstream linkage), D3 (axis docs), D4 (fabricated
metrics + phantom script), D6 (lossless scope), D7 (QA status + anchors), D8
(performance classification), E (README stack) are all correctable without touching
anatomy geometry and WITHOUT invalidating any passing geometric fact. F1 (component
mislabeling) is correctable as metadata against the authoritative source. **Proceed to
Phase 3.1.**
