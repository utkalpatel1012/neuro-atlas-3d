# OpenCode Current-State Audit — Claim vs Code vs Asset vs Test vs Evidence

**Date:** 2026-09-27 (recovery pass; supersedes nothing — first audit under this name)
**HEAD:** `f2eca09` + uncommitted Phase 3.1 working tree (66 files; prior pass recovered intact)
**Method:** full re-read of docs/code/pipeline/assets/tests, live `npm test`/`typecheck`/`build`/
`asset:validate`/`audit:phase1` runs, independent vertex-level STL re-measurement,
authoritative external checks (BodyParts3D name list, DBCLS/LSDB portal, mirror repo,
live GitHub Pages fetch), two delegated read-only audits (deployment; resources+resilience).
**Scale:** VERIFIED = reproduced/measured here; PARTIALLY_VERIFIED = true in part or
right conclusion from incomplete means; PLANNED = decided, no implementation;
UNVERIFIED = asserted without evidence; INCORRECT = contradicted by evidence;
UNKNOWN = cannot determine from repo.

## 1. Cortical representation (§3)

| Claim | Verdict | Evidence |
|---|---|---|
| Composite built by triangle-buffer concatenation, no welding/union | VERIFIED | `ingest_cerebral_cortex.ts:86-108` slices + concats; measured 16 disjoint shells/side (union-find, pipeline + independent Python agree); tri sums exact |
| "welded / continuous pial / CLOSED_SURFACE" (old docs/records) | INCORRECT | Superseded by Phase 3.1: `MULTI_SHELL_COMPOSITE` + `composite-cortical-assembly` profile + `connectedShellCount`, test-enforced |
| 14 components/side with hashes + URLs preserved end-to-end | VERIFIED | ingestion.json → manifest.source_components → components doc; phase31 TEST 1 |
| Component identities (post-3.1 names) | VERIFIED | Distribution name list + positional cross-check; 10/28 corrected |

## 2. Coordinates (§6–7) and MNI (§8–9)

| Claim | Verdict | Evidence |
|---|---|---|
| Transform is Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1, det=+1, no mirroring | VERIFIED | Adapter code + corner-mapping test (TEST 2) + manifest centroids reproduced from raw STLs arithmetically |
| Canonical +Z = POSTERIOR (not RAS/MNI) | VERIFIED | Lobar ordering, pre/postcentral order, hippocampus position converge |
| Source frame = DICOM LPS; constants derived | UNVERIFIED | Asserted; BodyParts3D has its own system; method undocumented (L3/L4) |
| Any MNI registration computed | INCORRECT (none exists) | No registration code; records now `not_registered`/PENDING, zero metrics (TEST 6/7) |
| Laterality chain (metadata→math→signs, distinct meshes) | VERIFIED | FMA lateral IDs + sign-flip + canonical signs; 198230≠198310 tris (TEST 4) |

## 3. LOD / Meshopt (§11), QA (§12–14)

| Claim | Verdict | Evidence |
|---|---|---|
| QEM simplification is lossy; meshopt lossless only vs LOD input (≤1e-6 mm) | VERIFIED | Code paths + reports + scoped fields, test-enforced (TEST 8) |
| "Lossless LOD / bit-exact pipeline" (old) | INCORRECT | Removed repo-wide from live records |
| Geometric QA (edges/volume/bounds/shells) | VERIFIED | Regenerated reports; TEST 2 cortex suite |
| Morphological/sulcal verification vs atlases | INCORRECT (never performed) | Retracted in `PHASE_3_ANATOMICAL_QA.md`; status ANATOMICAL_MAPPING_PENDING |
| Expert neuroanatomist validation | UNVERIFIED (none occurred) | No expert record exists → EXPERT_REVIEW_PENDING (L-gate); anchors schematic |
| Landmark anchors as label guides | PARTIALLY_VERIFIED | Positions unmeasured, some misplaced (poles); marked SCHEMATIC_UNVALIDATED, test-gated |

## 4. Performance (§15–17)

| Claim | Verdict | Evidence |
|---|---|---|
| Single-ray BVH ≈1 ms, headless Node CPU, run-varying | VERIFIED | Repo tests across runs (0.97–1.86 ms) |
| "Microsecond", 26x, p95, naive-row table | INCORRECT/UNVERIFIED | Unit error; no 1,000-ray harness; reclassified in baseline doc |
| FPS/VRAM/PWA/iPad/decompression/label timings | UNVERIFIED | No harness; reclassified TARGET/ESTIMATED/ASSERTED |
| Geometry buffer arithmetic (~6.35 MB) | PARTIALLY_VERIFIED | Arithmetic correct; NOT GPU-measured (labeled ESTIMATED) |

## 5. Licensing (§18–20)

| Claim | Verdict | Evidence |
|---|---|---|
| Geometry = BodyParts3D Rel.3.0 via mirror; HCP/Julich/BigBrain absent from production | VERIFIED | ingestion URLs + hash pins + quarantine test (TEST 9); no restricted bytes |
| Historical files CC-BY-SA 2.1 JP; portal lists CC BY (2025-02-27) | PARTIALLY_VERIFIED | Portal pages confirm CC BY listing; per-file retroactivity UNRESOLVED |
| "Dual compliance / formally cleared / 100% permitted" | INCORRECT (term without basis) | Removed repo-wide (§19); exact terms + LEGAL_REVIEW_REQUIRED |
| Code license | UNKNOWN (conflict) | package.json CC-BY-SA-4.0 vs Apache-2.0 claim, no LICENSE file (L8) |

## 6. README / packages / deployment (§21–23)

| Claim | Verdict | Evidence |
|---|---|---|
| README stack (post-3.1: actual vs planned split) | VERIFIED | Deps audit: three/three-mesh-bvh/meshoptimizer/tsx/tsc/vite/gh-pages all used-or-required; React/R3F/Zustand/MiniSearch/Dexie/PWA/KTX2 absent (0 imports, 0 assets) |
| `gh-pages` dependency | PARTIALLY_VERIFIED | Referenced by `deploy` script, but Actions workflow is the parallel mechanism — dual deploy, source-of-truth UNKNOWN |
| Vite `base './'` subpath serving | VERIFIED | Build output relative; AssetManager base-aware; live site + manifest fetch OK |
| Deployed content currency | PARTIALLY_VERIFIED | Mechanics work; live manifest is pre-3.1 (deploy predates corrections) |
| Manifest↔disk consistency (16/16 runtime files, hashes) | VERIFIED | Disk check + Check 3 hash revalidation in-test (not trusted blindly) |
| lod/canonical manifest paths on Pages | INCORRECT (as deployable refs) | Plugin ships runtime/ only; nothing reads them at runtime (documented limitation) |
| Refresh/deep-link | VERIFIED (single route, no fallback needed) | No router; no 404.html required |

## 7. Assembly / identity / resources / resilience (§28–32)

| Claim | Verdict | Evidence |
|---|---|---|
| Structural ≠ functional separation; limbic never a structural parent | VERIFIED | `FUNCTIONAL_SYSTEM` typing + filtered ancestor queries; delegation audit |
| entityId≠assetId≠mesh name≠file | VERIFIED | userData.neuroAtlas.entityId authoritative; mesh.name never used for identity |
| Reference counting | PARTIALLY_VERIFIED | Primitives exist; ResourceManager orphaned; LOD leak fixed+tested (§30 TEST 11); bulk-dispose + per-asset key granularity remain limitations |
| BVH disposal | PARTIALLY_VERIFIED | Guarded disposeBoundsTree where called; absent on LOD-swap/scene-remove paths |
| Scene-removal cleanup | INCORRECT (leaks) | remove/clear/unregister detach only; GPU + entityRepresentations leak (documented, Phase 4 gate) |
| Failed-load isolation | PARTIALLY_VERIFIED | FAILED state + no poisoning verified in-test; no backoff |
| WebGPU device-loss recovery | PARTIALLY_VERIFIED | Detection present, full recreation self-marked FUTURE (not claimed) |
| WebGL context restoration | PARTIALLY_VERIFIED | Listeners + pause/resume real; snapshot/re-init absent; naive reload can duplicate nodes |
| "Zero memory leakage" (old invariant) | INCORRECT | Contradicted by above; invariant text must be softened (see §36 gate) |

## 8. Aggregate verdicts (§42 inputs)

Architecture: READY (with corrected docs) · Asset pipeline: READY · Cortical
representation: LIMITED (honest partial composite) · Coordinate system: READY (as
documented internal space; external registration absent by declaration) ·
Provenance: READY · Licensing metadata: LEGAL_REVIEW_REQUIRED (code conflict +
retroactivity) · Renderer: LIMITED (works headless; resilience partial; no device
proof) · Testing: READY (headless) · Scientific integrity: READY (no known false
claim left in live records; see gate checkboxes in PART_4_ENTRY_CRITERIA.md).
