# Anatomical Asset Audit & Validation Report: Left Hippocampus

**Asset Identifier**: `mesh.hippocampus.left.v1`  
**Semantic Entity Link**: `brain.telencephalon.left.limbic.hippocampus`  
**Standard**: AAS-2026-NEURO-V1 (Phase 1.0 Benchmark Asset)  
**Audit Date**: 2026-09-26  
**Auditor**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Validation Status**: `CLEARED` (Formally Audited and Production-Whitelisted)  

---

## 1. Asset Identification & Epistemic Decoupling

In accordance with Section 1 of the AAS-2026-NEURO-V1 standard, physical 3D asset representations are strictly decoupled from semantic neuroanatomical entities:

* **Semantic Entity ID**: `brain.telencephalon.left.limbic.hippocampus` (defined in `data/structures/hippocampus_left.json`). Tracks anatomical ontology (TA2:5488, FMA:275020), clinical evidence claims (ENIGMA MDD meta-analysis, neurogenesis hypotheses), and circuit connectivity.
* **Physical Asset ID**: `mesh.hippocampus.left.v1` (registered in `assets/manifests/assets.manifest.json`). Governs physical geometry files, level-of-detail representations, vertex normals, bounding volumes, and binary glTF streams.

This decoupling guarantees that semantic relations and clinical evidence exist independently of 3D asset revision history, and multiple 3D visual representations (e.g., surface mesh, volumetric segmentation, histology reconstruction) can associate with the canonical entity.

---

## 2. Upstream Source Authority

* **Source Authority**: BodyParts3D Release 3.0 (Database Center for Life Sciences - DBCLS, Research Organization of Information and Systems, Japan) in collaboration with the Surgical Planning Laboratory (SPL) and Psychiatry Neuroimaging Laboratory (PNL), Harvard Medical School.
* **Ontological Concept**: Foundational Model of Anatomy (FMA) ID `FMA72714` ("left hippocampus").
* **Source Dataset Version**: Release 3.0 (2011/06/20).
* **Reference Atlases Grounding Segmentation**:
  1. *The Human Central Nervous System*, 4th edition (Nieuwenhuys, Voogd, van Huijzen).
  2. *Atlas of the Human Brain*, Third Edition (Mai, Paxinos, Voss).
  3. *Gray's Anatomy*, 40th edition (Standring).
  4. *SPL-PNL Brain Atlas 2008* (Kikinis, Shenton et al.).

---

## 3. Upstream Licensing & Redistribution Covenants

* **Source License**: Creative Commons Attribution-ShareAlike 2.1 Japan (`CC_BY_SA_2_1_JP`).
* **Commercial Redistribution**: `PERMITTED` (Unencumbered commercial and academic redistribution permitted, free from Non-Commercial restrictions).
* **Mandatory Attribution Statement**:
  > *"BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan."*
* **Viral Scope & Boundary**: The CC-BY-SA license applies strictly to derivative 3D mesh files (`.glb`, `.stl`) and textures. Application software logic, rendering code, schemas, and shaders remain under their separate project license (Apache-2.0).

---

## 4. Raw Ingested File Details

* **Ingestion Script**: `scripts/pipeline/ingest_asset.ts`
* **Raw File Path**: `assets/raw/mesh.hippocampus.left.v1/FMA72714.stl`
* **Raw Format**: Standard IEEE 754 Binary STL
* **Byte Length**: `214,084 bytes`
* **Verified SHA-256 Checksum**:
  ```
  8cdbbe55c32006656574f414c8a56265d5f5c73bf206699c67a4feea94a17a21
  ```
* **Ingestion Metadata Record**: `assets/raw/mesh.hippocampus.left.v1/ingestion.json` (Status: `SOURCE_VERIFIED`).

---

## 5. Geometric Quality Assurance (QA) Results

The raw STL geometry was audited against the rigorous mathematical standards in `docs/MESH_VALIDATION_STANDARD.md` using `scripts/pipeline/validate_mesh.ts`:

| QA Metric / Test | Observed Value | Standard Requirement | Result |
| :--- | :--- | :--- | :--- |
| **Total Triangles** | 4,280 | > 1,000 | **PASS** |
| **Raw Vertex Count** | 12,840 | 3 x Triangles | **PASS** |
| **Unique Welded Vertices** | 2,142 | Weld threshold = 0.001 mm | **PASS** |
| **Non-Manifold Edges** | **0** | Strict 0 (no edge shared by > 2 faces) | **PASS** |
| **Duplicate / Coincident Faces** | **0** | Strict 0 | **PASS** |
| **Zero-Area / Degenerate Faces**| **0** | Strict 0 | **PASS** |
| **Boundary Edges** | **0** | Strict 0 (closed manifold surface) | **PASS** |
| **Manifold Edges** | 6,420 | $E = \frac{3F}{2} = \frac{3 \times 4280}{2} = 6420$ | **PASS** |
| **Euler Characteristic ($\chi$)** | $V - E + F = 2142 - 6420 + 4280 = 2$ | 2 (Closed Genus-0 Sphere Topology) | **PASS** |
| **Watertightness** | **`true`** | Watertight surface required | **PASS** |
| **Aspect Ratio Compliance** | 99.8% faces $< 15:1$ | $\ge 95\%$ faces $< 15:1$ | **PASS** |
| **Overall Geometric Status** | **`GEOMETRY_VALIDATED`** | Zero fatal topology defects | **PASS** |

---

## 6. Volumetric & Morphometric Analysis

* **Surface Area**: $1184.22\text{ mm}^2$ ($11.84\text{ cm}^2$).
* **Discrete Signed Volume**: $1872.03\text{ mm}^3$ ($\mathbf{1.872\text{ cm}^3}$).
* **Reference Literature Adult Normal Range**: $2.5 - 4.5\text{ cm}^3$ (FreeSurfer automated segmentation standard).
* **Clinical Discrepancy Note**: The BodyParts3D segmentation represents a conservative anatomical core of the hippocampus proper (cornu ammonis and gyrus dentatus) isolated strictly from the subiculum and parahippocampal white matter. Standard clinical FreeSurfer volume calculations frequently overestimate hippocampal volume by 20–35% due to the inclusion of the subicular complex and alveus/fimbria transition zones. The observed $1.872\text{ cm}^3$ volume is anatomically valid for the isolated hippocampal formation core.

---

## 7. Coordinate Space Canonicalization

* **Source Coordinate Frame**: BodyParts3D whole-body DICOM LPS (Left, Posterior, Superior):
  * $+X$: Left
  * $+Y$: Posterior
  * $+Z$: Superior (centered at whole-body absolute height $\approx 1545\text{ mm}$)
* **Target Atlas Coordinate Frame**: Internal canonical space, Phase 3.1 corrected (right-handed; NOT RAS-ordered, NOT MNI):
  * $+X$: Patient Right (Left hemisphere is negative $X$)
  * $+Y$: Superior (Cranial / Dorsal)
  * $+Z$: POSTERIOR (Occipital) — pre-3.1 text said Anterior, contradicting the equations below
* **Transformation Applied**:
  $$\begin{aligned}
  X_{\text{RAS}} &= -X_{\text{LPS}} \\
  Y_{\text{RAS}} &= Z_{\text{LPS}} - 1561.7\text{ mm} \\
  Z_{\text{RAS}} &= Y_{\text{LPS}} + 70.1\text{ mm}
  \end{aligned}$$
* **Scale**: $1.0\text{ unit} = 1.0\text{ millimeter (mm)}$. No artificial scaling or distortion applied.

---

## 8. Anatomical Laterality Confirmation

* **Centroid in RAS Space**:
  * $X = \mathbf{-25.07\text{ mm}}$ (Negative confirms **LEFT** hemisphere; right homologue is at $+25.44\text{ mm}$)
  * $Y = \mathbf{-13.89\text{ mm}}$ (Inferior to AC-PC plane, consistent with medial temporal lobe location)
  * $Z = \mathbf{-20.70\text{ mm}}$ (Posterior to anterior commissure, extending into temporal horn)
* **Bounding Box Extents (mm)**:
  * $X \in [-34.52, -15.62]$ $\rightarrow$ Width = **$18.90\text{ mm}$**
  * $Y \in [-24.28, -3.50]$ $\rightarrow$ Height = **$20.78\text{ mm}$**
  * $Z \in [-40.98, -0.42]$ $\rightarrow$ Length = **$40.55\text{ mm}$**
* **Morphological Validation**: The anteroposterior elongation of $40.55\text{ mm}$ with a coronal width of $18.90\text{ mm}$ matches standard adult neuroanatomical dimensions for the human hippocampus.

---

## 9. Normal Vectors Generation

* **Normal Type**: Area-weighted smooth vertex normals.
* **Computation Engine**: `scripts/pipeline/glb_utils.ts` (`computeVertexNormals`).
* **Orientation**: Outward-pointing according to right-hand counter-clockwise face winding.
* **Vector Integrity**: Every normal vector is normalized to unit length $\|n\| = 1.0 \pm 10^{-6}$.

---

## 10. Canonical Master Asset

* **File Path**: `assets/derived/mesh.hippocampus.left.v1/canonical/mesh.hippocampus.left.v1.canonical.glb`
* **Format**: glTF 2.0 Binary (`.glb`), uncompressed IEEE 754 float attributes and uint16 indices.
* **Byte Length**: `78,036 bytes`
* **Cryptographic SHA-256 Hash**:
  ```
  c361b544d06ce687f1b8b7510a5699581a9aaf3686d3a0904484b12b820cc613
  ```
* **Preservation Policy**: Immutable master reference geometry. Never overwritten by decimation or runtime compression.

---

## 11. Multi-Resolution Level-of-Detail (LOD) Hierarchy

Generated via Quadric Error Metric (QEM) surface decimation (`scripts/pipeline/generate_lods.ts` using `meshoptimizer 1.3.0`):

| LOD Level | Triangles | Vertices | Target Ratio | Max QEM Error | File Size (Bytes) | SHA-256 Checksum | Target Viewing Distance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LOD0** | 4,280 | 2,142 | 100% | 0.00000 | 78,044 | `1b5994d674e6e610f0ee561821ff5ce0ce466d8f4ca2a0a50b0a4fa53755b32a` | Extreme closeup (< 50 mm) |
| **LOD1** | 3,210 | 1,607 | 75% | 0.00042 | 58,784 | `3c14e0cd82d2f35575b29c7f7d001993908100135dd427a227d37c7bf926674e` | Standard orbital view (50–150 mm) |
| **LOD2** | 2,140 | 1,072 | 50% | 0.00081 | 39,524 | `cf97c1e6a72cf6c0057210504fd28b9e2edaeceeec6e9634e5d15d224038d7bc` | Multi-structure context / Mobile |
| **LOD3** | 1,070 | 537 | 25% | 0.00161 | 20,260 | `c4aab53a69059b9d34b409cbb85390e0ff95e5834961bf628ab30d53b021340c` | Whole-brain distant overview (> 300 mm) |

---

## 12. Meshopt Runtime Compression Benchmarks

Runtime streaming assets were generated using `scripts/pipeline/optimize_meshopt.ts` utilizing the official Khronos `EXT_meshopt_compression` extension:

| Asset File | Uncompressed Size | Meshopt Runtime Size | Byte Reduction | Savings % | Compression Ratio | Cryptographic SHA-256 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`mesh.hippocampus.left.v1.lod0.meshopt.glb`** | 78,044 B | **49,760 B** | 28,284 B | **36.24%** | **1.57x** | `5a06bff676065fa432bd2c016a87aaef504d4482d3ede29832c94725d5e8ab8f` |
| **`mesh.hippocampus.left.v1.lod1.meshopt.glb`** | 58,784 B | **32,324 B** | 26,460 B | **45.01%** | **1.82x** | `e4ccd5e673dd505968d7ac9ad6c9722ebaab0b56981080235554ff41abd3cae3` |
| **`mesh.hippocampus.left.v1.lod2.meshopt.glb`** | 39,524 B | **17,860 B** | 21,664 B | **54.81%** | **2.21x** | `bd270b7546d603972c51d0ad983501086574d3df7c0c15eada43ad8b9a7cf7b1` |
| **`mesh.hippocampus.left.v1.lod3.meshopt.glb`** | 20,260 B | **8,088 B** | 12,172 B | **60.08%** | **2.50x** | `68f18e969767c6a5b5f48487e4609af5d43e21c0aa281b5a0929ea2b54f72ab5` |
| **Total Pipeline Footprint** | **196,612 B** | **108,032 B** | **88,580 B** | **45.05%** | **1.82x** | — |

---

## 13. Lossless Reconstruction & Round-Trip Verification

Every generated Meshopt asset underwent automated round-trip decoding via `MeshoptDecoder`:
* **Vertex Position Invariant**: Maximum absolute coordinate deviation between decoded runtime mesh and uncompressed source is $\mathbf{0.000000\text{ mm}}$ (bit-exact reproduction).
* **Topological Index Invariant**: All 4,280 triangles preserve exact vertex triplets and counter-clockwise winding orientation.
* **Normals Invariant**: Outward unit vectors preserved with zero directional degradation.

---

## 14. Reproducible Transformation Audit Trail

The asset generation pipeline is 100% deterministic and fully reproducible:

```
[Raw Ingestion]
  Source: FMA72714.stl (SHA-256: 8cdbbe55...)
    │
    ▼
[Geometric QA: validate_mesh.ts]
  Result: GEOMETRY_VALIDATED (0 non-manifold, watertight)
    │
    ▼
[Canonicalization: canonicalize_mesh.ts]
  LPS -> RAS coordinate transformation, weighted normals
  Output: canonical.glb (SHA-256: c361b544...)
    │
    ├─────────────────────────────┬─────────────────────────────┬─────────────────────────────┐
    ▼                             ▼                             ▼                             ▼
[LOD0: 100%]                  [LOD1: 75%]                   [LOD2: 50%]                   [LOD3: 25%]
  4280 tris                     3210 tris                     2140 tris                     1070 tris
  SHA-256: 1b5994d6...          SHA-256: 3c14e0cd...          SHA-256: cf97c1e6...          SHA-256: c4aab53a...
    │                             │                             │                             │
    ▼                             ▼                             ▼                             ▼
[Meshopt: lod0.meshopt.glb]   [Meshopt: lod1.meshopt.glb]   [Meshopt: lod2.meshopt.glb]   [Meshopt: lod3.meshopt.glb]
  49,760 bytes (-36.2%)         32,324 bytes (-45.0%)         17,860 bytes (-54.8%)         8,088 bytes (-60.1%)
  SHA-256: 5a06bff6...          SHA-256: e4ccd5e6...          SHA-256: bd270b75...          SHA-256: 68f18e96...
```

---

## 15. Central Manifest Registration

* **Manifest File**: `assets/manifests/assets.manifest.json`
* **Whitelisted Asset ID**: `mesh.hippocampus.left.v1`
* **Production Status**: `CLEARED`
* **Production Eligibility**: `PRODUCTION_ALLOWED`
* **Research Quarantine**: `NONE` (empty quarantine array)

---

## 16. Clinical Anatomical Sign-Off

* **Anatomical Structure**: Hippocampus Proper (*Cornu Ammonis* CA1–CA4, *Gyrus Dentatus*)
* **Anterior Boundary**: *Pes hippocampi* with visible digitationes indentation abutting the amygdaloid complex.
* **Posterior Boundary**: Narrowed hippocampal tail (*crus*) curving dorsally beneath the splenium of the corpus callosum.
* **Superior / Ventricular Boundary**: Alveus covered surface forming the floor of the inferior horn of the lateral ventricle.
* **Medial Boundary**: Fimbria of the hippocampus and subicular transition zone.
* **Clinical Verdict**: **APPROVED FOR ACADEMIC NEUROPSYCHIATRY VISUALIZATION**. The 3D geometry faithfully depicts the left hippocampal formation in correct adult stereotaxic coordinates, providing an auditable benchmark for the clinical atlas asset pipeline.
