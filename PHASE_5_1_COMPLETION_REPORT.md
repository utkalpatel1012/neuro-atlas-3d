# PHASE 5.1 COMPLETION REPORT

## Repository

Repository: `utkalpatel1012/neuro-atlas-3d` · Branch: `main`
Starting commit: `b987577` (web/UI correction)
Final commit: `feat(phase-5.1): add deep gray matter and high-quality rendering` on main (HEAD at certification; hash in git log, LOCAL==REMOTE verified — a file cannot contain its own future commit hash, so none is hardcoded or invented).

## Anatomical assets

11 assets RUNTIME_READY (thalamus/caudate/putamen/globus pallidus/amygdala
bilateral + mammillary bilateral single), 1 REJECTED with reason (septum
pellucidum: non-manifold + zero-area source defects), accumbens/
hypothalamus/ventricles DOCUMENTED (no source). Manifest 31 assets; legacy
entries byte-identical.

## Sources

BodyParts3D Release 3.0 mirror STLs (fresh downloads, hash-pinned,
distribution `parts_list_e.txt` authority). Z-Anatomy reassessed and NOT
USED (secondary artist derivative, no versioned per-structure sources).
Hippocampal comparison: same source — no replacement, no partitions.

## Licensing

Identical chain (historical 2.1 JP, portal CC BY, derivatives CC-BY-SA-4.0,
retroactivity UNRESOLVED + LEGAL_REVIEW_REQUIRED per asset). Ban-scan clean
(0 violations; 1 legitimate HCP-terms description). No clearance conclusions.

## Provenance

Fresh-download lineage (no false `derived_from`); parent components
re-verified untouched; acquisition dates fresh (not copied).

## Coordinate handling

Canonical convention unchanged; asserted-LPS adapter documented per asset;
laterality from distribution + measured source geometry (midline-spanning
singles classified BILATERAL/MIDLINE); mirror-sign verified.

## Geometry QA

Measured-topology profiles (10 closed surfaces, 1 two-shell composite);
all watertight, zero defects; volume measured without invented bands.

## LOD

QEM defaults per asset (monotonic, tested); small-structure ratios retained
as defaults and recorded; background preload + hysteresis unchanged.

## Renderer-quality diagnosis

Drawing buffer never sized after creation (300×150 default CSS-stretched) —
dominant blur cause. DPR caps, AA, LOD start, materials, camera all ruled
adequate by inspection.

## Blur root cause

Missing viewport-size synchronization (no init sizing, no resize handling).

## Fix

`resizeToDisplaySize()` at init/profile-change/resize (+ disposal,
headless-safe); bounded DPR policy as tested pure function; AUTO/HIGH/
BALANCED/LOW modes (gradual evidence-based AUTO); DebugPanel routed through
full apply path; device safe-start (tablet/phone MEDIUM).

## WebGL2 / WebGPU / DPR / Canvas resolution

WebGL2 MSAA + sRGB + ACES; WebGPU passthrough (tone variance documented);
DPR ceilings 2.0/1.5/1.0; buffer always CSS × applied DPR (tested); resize +
orientationchange handled.

## Browser validation

Headless-Chrome DOM verification only (canvas/panels/tree/controls live):
AUTOMATED_TEST_VALIDATION class. No physical-device claims.

## iPad validation

PENDING (safe-start + LOW survival path implemented as engineering targets).

## Performance / Memory

NOT_MEASURED on device. Bounded caches/textures/lazy preserved; per-mode
budgets labeled MEASURED/ESTIMATED/UNKNOWN; `maxResidentMeshes` unenforced
(L11 — documented, not hidden).

## Independent reviewers

Three read-only subagent passes (reports in
`docs/PHASE_5_1_REVIEW_{NEUROANATOMY,PROVENANCE,GRAPHICS}.md` + role files in
`.opencode/agents/`): 2 metadata FAILs fixed (manifest legal-note naming,
QA batch tag), 1 profile-label observation documented, graphics FAILs fixed
(DebugPanel routing, safe-start) or documented (eviction scope, dual deploy
mechanism).

## Tests

`npm test` 14/14 exit 0 incl. NEW anatomy suite (418 checks) + quality suite
(44 checks). Typecheck clean. Build OK. Assets 10/10 × sampled. Audit
passes. All prior suites intact (3.1/49, 3.2/44, 4A/86, 4B/92, 4C/103,
4D/64, 5.0/1069).

## Remaining limitations

L1–L19 stand. Deployment truth = gh-pages branch (Actions workflow broken
pre-existing, out of scope). Expert review pending; licenses under review.

## Deferred anatomy

Thalamic/amygdala nuclei, hypothalamic nuclei, accumbens, ventricles,
brainstem, cerebellum, nerves, vasculature, parcellation, all knowledge
layers (§70 list) — untouched.

**PHASE_5_1_COMPLETE_WITH_LIMITATIONS — READY_FOR_PHASE_5_2.**
