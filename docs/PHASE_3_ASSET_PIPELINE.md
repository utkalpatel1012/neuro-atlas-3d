# Phase 3 Production Asset Pipeline Specification
**Standard**: AAS-2026-NEURO-V1  
**Target Anatomy**: Human Cerebral Macroanatomy (Bilateral Cerebral Hemispheres & Cortical Surfaces)  
**Status**: Production Validated  

---

## 1. Executive Summary & Pipeline Objectives

Phase 3 transitions the Neuro Atlas 3D pipeline from a single-structure subcortical nucleus testbed (Left Hippocampus) to large-scale, high-fidelity human cerebral macroanatomy. The asset pipeline must ingest, validate, canonicalize, decimate, and compress high-poly biological cortical surfaces with full scientific provenance and zero manual sculpting or geometric fabrication.

### Core Architecture Invariants
1. **Zero Fabrication**: All cortical component meshes originate from authentic human anatomical datasets (DBCLS BodyParts3D Release 3.0, acquired via third-party mirror; SPL-PNL was a cross-validation reference, never the source). Procedural approximations, AI blobs, and artistic sculpting are strictly prohibited.
2. **Decoupled Architecture**: Semantic regions (lobes, gyri, functional systems) are decoupled from physical mesh boundaries. Lobes are ontological groupings; the composite is a multi-shell assembly, NOT a continuous cortical manifold (Phase 3.1 D1).
3. **Rigorous Provenance**: Every raw geometry file is cryptographically pinned via SHA-256 digests, upstream database IDs (FMA), per-component records, and legal attribution and ShareAlike covenants.
4. **Deterministic Multi-LOD Generation**: 4-level LOD meshes are generated using Meshopt Quadric Error Metric (QEM) simplification — LOSSY by construction — with empirical Hausdorff and volume deviation audit trails.
5. **Scoped Runtime Compression**: Production assets are delivered via `EXT_meshopt_compression` (`.meshopt.glb`); the encode step is round-trip verified vs its LOD input (max delta ≤ 1e-6 mm). Never "lossless" without that scope; never "bit-exact".

---

## 2. End-to-End Pipeline Stages

```
[Raw Anatomical Ingestion]
   ├── BodyParts3D Release 3.0 (14 bilateral components per hemisphere)
   ├── Cryptographic SHA-256 hashing & byte validation
   └── Native source coordinate space (ASSERTED as DICOM LPS; unproven — Phase 3.1 D3)
               │
               ▼
[Decoupled Quality Assurance Audit]
   ├── Geometric QA: 0 non-manifold edges, 0 zero-area faces, 0 duplicate faces, per-shell edge watertightness, MEASURED shell count (16/side); topology class MULTI_SHELL_COMPOSITE
   └── Anatomical QA: Human scale check (65 x 110 x 170 mm), volume plausibility (180 - 380 cm³) → ANATOMICAL_MAPPING_PENDING (scale plausibility only, not morphological proof)
               │
               ▼
[Coordinate Canonicalization & Normals]
   ├── Transformation: BODYPARTS3D adapter (Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1; det=+1, no mirroring)
   ├── Standard Target: canonical_atlas_ras = internal space (+X Right, +Y Superior, +Z POSTERIOR; NOT RAS, NOT MNI)
   └── Surface Normals: Area-weighted smooth outward vertex normals
              │
              ▼
[Multi-Resolution LOD Simplification]
   ├── LOD0: 100% resolution (198,230 tris) - Closeup inspection (<100 mm)
   ├── LOD1:  75% resolution (148,672 tris) - Standard orbital view (100-180 mm)
   ├── LOD2:  50% resolution ( 99,114 tris) - Contextual multi-structure view (180-260 mm)
   └── LOD3:  25% resolution ( 49,556 tris) - Whole-brain overview (>260 mm)
              │
              ▼
[Runtime Meshopt Compression]
   ├── EXT_meshopt_compression encoding
   └── Encode-step round-trip verification vs LOD input, max delta <= 1e-6 mm (QEM LODs themselves are lossy; ~47% file size reduction)
              │
              ▼
[Manifest Compilation & Synchronization]
   ├── Production manifest: assets/manifests/assets.manifest.json
   └── Runtime synced copy: assets/assets.manifest.json
```

---

## 3. Ingestion Manifest & Cortical Structural Assembly

> Phase 3.1 correction (2026-09-27, D1 + component identities): the original text of
> this section claimed vertex welding into "a continuous pial manifold" and printed a
> component table with wrong names AND wrong triangle counts. Both were false.
> Authoritative record: [`PHASE_3_CORTEX_SOURCE_COMPONENTS.md`](./PHASE_3_CORTEX_SOURCE_COMPONENTS.md).

BodyParts3D models each cerebral hemisphere as 14 authentic anatomical gyrus/lobar
sub-structures in its native whole-body source frame (DICOM-LPS equivalence asserted,
unproven — see Phase 3.1 D3). The ingestion engine
(`scripts/pipeline/ingest_cerebral_cortex.ts`) downloads each component, verifies its
SHA-256, and CONCATENATES the raw triangle buffers into the master raw STL
(`combineBinarySTLs`: subarray slice + `Buffer.concat`; no vertex welding, no mesh
union, no hole filling). Measured result: **16 disjoint closed shells per hemisphere**,
triangle sums conserved exactly (L 198,230 / R 198,310). Five component identities per
side were mislabeled pre-3.1 (temporal-series shift; cuneus/lingual/parahippocampal
misassignments) and are corrected in the authority doc above — do NOT use the
pre-3.1 table (removed).

---

## 4. Coordinate Transformation & Canonical Registration

The raw BodyParts3D coordinates reside in whole-body DICOM LPS (Left, Posterior, Superior in millimeters).
The Neuro Atlas standard coordinate frame is `canonical_atlas_ras` (identifier retained
for stability; Phase 3.1 measured — NOT RAS-ordered, NOT MNI):
- **+X**: Right (Lateral Right > 0, Lateral Left < 0)
- **+Y**: Superior (Cranial > 0, Caudal < 0)
- **+Z**: POSTERIOR (Occipital > 0, Rostral < 0) — corrected 2026-09-27; the pre-3.1
"+Z Anterior" label contradicted the coded math and measured component ordering
- **Scale**: 1.0 unit = 1.0 mm

### Canonical Transformation Adapter (exact coded math — D3)

> Phase 3.1 correction: the matrix printed here pre-3.1 (`diag(-1,1,-1)`, negate X/Z)
> never existed in code. The real adapter permutes axes with translation:

```ts
// scripts/pipeline/coordinate_adapter.ts — BODYPARTS3D_LPS_TO_RAS_ADAPTER
axis_mapping: { x: '-x', y: 'z', z: 'y' },   // Xc=-Xs, Yc=Zs, Zc=Ys
translation_mm: [0.0, -1561.7, 70.1],        // Yc=Zs-1561.7, Zc=Ys+70.1
// 4x4: [[-1,0,0,0],[0,0,1,-1561.7],[0,1,0,70.1],[0,0,0,1]], det=+1 (no mirroring)
// Source frame ASSERTED as DICOM LPS (unproven); translation constants asserted,
// derivation undocumented; origin approximates (not equals) mid-commissural plane.
```

### Measured Hemisphere Bounds & Centroids (RAS)
- **Left Cortex**:
  - Bounding Box: $X \in [-65.10, +0.10]$, $Y \in [-39.36, +71.38]$, $Z \in [-104.58, +65.65]$ mm
  - Centroid: $[-32.50, +16.01, -19.47]$ mm
  - Dimensions: $65.19 \times 110.74 \times 170.23$ mm
- **Right Cortex**:
  - Bounding Box: $X \in [+1.18, +66.39]$, $Y \in [-39.37, +71.37]$, $Z \in [-104.58, +65.65]$ mm
  - Centroid: $[+33.78, +16.00, -19.47]$ mm
  - Dimensions: $65.21 \times 110.74 \times 170.23$ mm
- **Interhemispheric gap**: minimum medial separation across $X = 0$ is $1.18 - 0.10 = 1.08\text{ mm}$ of EMPTY SPACE between the two chunk sets. Phase 3.1: this is NOT a validated biological fissure and says nothing about the falx cerebri — it is an inter-piece gap.

---

## 5. Multi-LOD Simplification & Meshopt Performance

### LOD Schedule
| LOD Level | Target Ratio | Left Triangles | Right Triangles | Left GLB (Uncompressed) | Left Runtime (Meshopt) | Savings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LOD0** | 100% | 198,230 | 198,310 | 4.76 MB | 2.27 MB | **-52.29%** |
| **LOD1** | 75% | 148,672 | 148,732 | 3.57 MB | 1.74 MB | **-51.24%** |
| **LOD2** | 50% | 99,114 | 99,154 | 1.79 MB | 1.19 MB | **-33.13%** |
| **LOD3** | 25% | 49,556 | 49,576 | 0.89 MB | 0.63 MB | **-30.02%** |

### Geometric Fidelity Verification
- **LOD1**: Mean surface deviation $< 0.12$ mm, volume deviation $-0.076\%$.
- **LOD2**: Mean surface deviation $< 0.28$ mm, volume deviation $-0.279\%$.
- **LOD3**: Mean surface deviation $< 0.65$ mm, volume deviation $-0.760\%$.
Even at the lowest resolution (LOD3: 25% triangles), the total volume loss is strictly under $0.8\%$, preserving sulcal depth and gyral curvature for long-range observation.

---

## 6. Reproducibility & Pipeline CLI Commands

To reproduce the entire Phase 3 asset processing pipeline from raw sources:

```bash
# 1. Ingest authenticated 14-component cortical assemblies
node --import tsx/esm scripts/pipeline/ingest_cerebral_cortex.ts

# 2. Run Geometric & Anatomical QA
node --import tsx/esm scripts/pipeline/validate_mesh.ts mesh.cortex.left.v1
node --import tsx/esm scripts/pipeline/validate_mesh.ts mesh.cortex.right.v1

# 3. Canonicalize coordinates from LPS to canonical_atlas_ras
node --import tsx/esm scripts/pipeline/canonicalize_mesh.ts mesh.cortex.left.v1
node --import tsx/esm scripts/pipeline/canonicalize_mesh.ts mesh.cortex.right.v1

# 4. Generate multi-resolution LODs
node --import tsx/esm scripts/pipeline/generate_lods.ts mesh.cortex.left.v1
node --import tsx/esm scripts/pipeline/generate_lods.ts mesh.cortex.right.v1

# 5. Compress using EXT_meshopt_compression
node --import tsx/esm scripts/pipeline/optimize_meshopt.ts mesh.cortex.left.v1
node --import tsx/esm scripts/pipeline/optimize_meshopt.ts mesh.cortex.right.v1

# 6. Recompile central production asset manifest
node --import tsx/esm scripts/pipeline/update_manifest.ts

# 7. Run Phase 3 test suite
node --import tsx/esm src/cerebral_cortex.test.ts
```
