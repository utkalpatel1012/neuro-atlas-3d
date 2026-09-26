# Phase 3 Production Asset Pipeline Specification
**Standard**: AAS-2026-NEURO-V1  
**Target Anatomy**: Human Cerebral Macroanatomy (Bilateral Cerebral Hemispheres & Cortical Surfaces)  
**Status**: Production Validated  

---

## 1. Executive Summary & Pipeline Objectives

Phase 3 transitions the Neuro Atlas 3D pipeline from a single-structure subcortical nucleus testbed (Left Hippocampus) to large-scale, high-fidelity human cerebral macroanatomy. The asset pipeline must ingest, validate, canonicalize, decimate, and compress high-poly biological cortical surfaces with full scientific provenance and zero manual sculpting or geometric fabrication.

### Core Architecture Invariants
1. **Zero Fabrication**: All cortical surfaces originate from authentic human anatomical datasets (DBCLS BodyParts3D Release 3.0 / SPL-PNL Brain Atlas). Procedural approximations, AI blobs, and artistic sculpting are strictly prohibited.
2. **Decoupled Architecture**: Semantic regions (lobes, gyri, functional systems) are decoupled from physical mesh boundaries. A lobe is not a disconnected 3D mesh shell; it is an ontological grouping over a continuous cortical manifold.
3. **Rigorous Provenance**: Every raw geometry file is cryptographically pinned via SHA-256 digests, upstream database IDs (FMA), and legal dual-licensing covenants.
4. **Deterministic Multi-LOD Generation**: 4-level LOD meshes are generated using Meshopt Quadric Error Metric (QEM) simplification with empirical Hausdorff and volume deviation audit trails.
5. **Lossless Runtime Compression**: Production assets are delivered via `EXT_meshopt_compression` binary GLTF (`.meshopt.glb`), verifying zero bitwise vertex drift through round-trip decoding.

---

## 2. End-to-End Pipeline Stages

```
[Raw Anatomical Ingestion]
   ├── BodyParts3D Release 3.0 (14 bilateral components per hemisphere)
   ├── Cryptographic SHA-256 hashing & byte validation
   └── Native DICOM LPS coordinate space verification
              │
              ▼
[Decoupled Quality Assurance Audit]
   ├── Geometric QA: 0 non-manifold edges, 0 zero-area faces, 0 duplicate faces, watertight closed-surface
   └── Anatomical QA: Human scale check (65 x 110 x 170 mm), volume validation (180 - 380 cm³)
              │
              ▼
[Coordinate Canonicalization & Normals]
   ├── Transformation: BODYPARTS3D_LPS_TO_RAS_ADAPTER (x' = -x, y' = y, z' = -z)
   ├── Standard Target: canonical_atlas_ras (+X Right, +Y Superior, +Z Anterior, mm)
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
   └── Bit-exact roundtrip decode verification (47% file size reduction)
              │
              ▼
[Manifest Compilation & Synchronization]
   ├── Production manifest: assets/manifests/assets.manifest.json
   └── Runtime synced copy: assets/assets.manifest.json
```

---

## 3. Ingestion Manifest & Cortical Structural Assembly

BodyParts3D models each cerebral hemisphere as 14 authentic anatomical gyrus/lobar sub-structures in native DICOM LPS space. The ingestion engine (`scripts/pipeline/ingest_cerebral_cortex.ts`) downloads each authenticated component, verifies its upstream SHA-256 hash, and welds identical vertices into a continuous pial manifold.

| Structure Name | Upstream FMA (Left / Right) | Anatomical Region | Raw Triangle Count (L / R) |
| :--- | :--- | :--- | :--- |
| Superior Frontal Gyrus | FMA72654 / FMA72653 | Frontal Lobe | 30,450 / 30,450 |
| Middle Frontal Gyrus | FMA72656 / FMA72655 | Frontal Lobe | 15,544 / 15,544 |
| Precentral Gyrus | FMA72662 / FMA72661 | Frontal Lobe (Motor) | 16,846 / 16,846 |
| Postcentral Gyrus | FMA72666 / FMA72665 | Parietal Lobe (Sensory) | 18,296 / 18,296 |
| Supramarginal Gyrus | FMA72668 / FMA72667 | Parietal Lobe | 10,758 / 10,758 |
| Angular Gyrus | FMA72670 / FMA72669 | Parietal Lobe | 11,462 / 11,462 |
| Superior Temporal Gyrus | FMA72686 / FMA72685 | Temporal Lobe | 15,808 / 15,808 |
| Middle Temporal Gyrus | FMA72688 / FMA72687 | Temporal Lobe | 17,990 / 17,990 |
| Inferior Temporal Gyrus | FMA72690 / FMA72689 | Temporal Lobe | 14,218 / 14,218 |
| Lateral Occipital Lobe | FMA72976 / FMA72975 | Occipital Lobe | 16,346 / 16,426 |
| Cuneus | FMA72702 / FMA72701 | Occipital Lobe (Medial) | 7,868 / 7,868 |
| Lingual Gyrus | FMA72706 / FMA72705 | Occipital Lobe (Medial) | 9,454 / 9,454 |
| Insular Cortex | FMA72978 / FMA72977 | Insular Lobe | 6,340 / 6,340 |
| Parahippocampal Gyrus | FMA72718 / FMA72717 | Limbic / Temporal | 6,850 / 6,850 |
| **Combined Cortical Hemisphere** | **mesh.cortex.left.v1 / right.v1** | **Whole Cortex** | **198,230 / 198,310** |

---

## 4. Coordinate Transformation & Canonical Registration

The raw BodyParts3D coordinates reside in whole-body DICOM LPS (Left, Posterior, Superior in millimeters).
The Neuro Atlas standard coordinate frame is `canonical_atlas_ras`:
- **+X**: Right (Lateral Right > 0, Lateral Left < 0)
- **+Y**: Superior (Cranial > 0, Caudal < 0)
- **+Z**: Anterior (Rostral > 0, Occipital < 0)
- **Scale**: 1.0 unit = 1.0 mm

### Canonical Transformation Adapter
```ts
export const BODYPARTS3D_LPS_TO_RAS_ADAPTER: SourceCoordinateAdapter = {
  adapter_id: 'adapter.bodyparts3d.lps_whole_body_to_ras',
  source_coordinate_system: 'DICOM_LPS_WHOLE_BODY',
  target_canonical_system: 'THREEJS_RAS_CANONICAL',
  matrix: [
    -1,  0,  0, 0,
     0,  1,  0, 0,
     0,  0, -1, 0,
     0,  0,  0, 1
  ],
  scale: 1.0,
  unit: 'mm'
};
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
- **Interhemispheric Fissure Gap**: Minimum medial separation across $X = 0$ is $1.18 - 0.10 = 1.08\text{ mm}$, faithfully preserving the biological sagittal cleft accommodating the falx cerebri.

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
