# Phase 1 Anatomical Asset Pipeline Architecture

**Standard**: AAS-2026-NEURO-V1  
**Authority**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Document**: `docs/PHASE_1_ASSET_PIPELINE.md`  
**Phase**: 1.0 Production Anatomical Asset Pipeline Foundation  
**Status**: APPROVED & LOCKED  

---

## 1. Core Pipeline Philosophy: Reproducibility & Scientific Provenance

The objective of Phase 1 is **not** to create a one-off 3D brain or manually sculpt visual models. The objective is to build a **reproducible, provenance-safe, scientifically auditable anatomical asset pipeline** and prove it using one benchmark structure: the **Left Hippocampus**.

Once validated, this identical pipeline will scale without architectural redesign to process:
* Cerebral cortex gyri and sulci
* Deep subcortical nuclei and basal ganglia
* Diencephalic nuclei and epithalamus
* Ventricular compartments
* Brainstem segments and cerebellar lobules
* Cranial nerves and vascular branches
* White-matter projection, association, and commissural pathways.

### The Canonical Separation Mandate
Canonical anatomical truth must remain strictly separated from:
1. **Source meshes**: Raw geometry from upstream databases (Z-Anatomy, BodyParts3D, HCP).
2. **Cleaned meshes**: Geometry with manifold repairs and normal recalculations.
3. **Optimized / Decimated meshes**: Simplified polygon approximations for LOD.
4. **Runtime GPU representations**: Compressed Meshopt bitstreams and quantized buffers.
5. **Visualization transforms**: Runtime camera offsets, layer peeling, and explosion vectors.
6. **Atlas / Parcellation data**: Multi-modal cortical parcellation vertex attributes.

---

## 2. End-to-End Pipeline Stages

Every anatomical asset processed by this pipeline progresses through a deterministic, auditable 15-stage workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 15-STAGE ANATOMICAL ASSET TRANSFORMATION PIPELINE           │
└─────────────────────────────────────────────────────────────────────────────┘
  1. [SOURCE]                  Authoritative open dataset identified & verified
        │
  2. [INGEST]                  Acquisition into sources/ with original hash
        │
  3. [IMMUTABLE RAW ARCHIVE]   Stored in raw/[asset-id]/ with read-only lock
        │
  4. [PROVENANCE REGISTRATION] AssetProvenance record registered in manifest
        │
  5. [VALIDATION]              File integrity, vertex parsing, format checking
        │
  6. [NORMALIZATION]           Metric scale (mm), LPS/RAS orientation checking
        │
  7. [ANATOMICAL QA]           Laterality, structural boundaries, clinical review
        │
  8. [CLEANING]                Duplicate vertices, zero-area faces, non-manifold edges
        │
  9. [TOPOLOGY QA]             Watertightness, normal consistency, boundary check
        │
 10. [CANONICALIZATION]        Canonical glTF/GLB with center-of-mass tracked
        │
 11. [LOD GENERATION]          Deterministic QEM decimation (LOD0, LOD1, LOD2, LOD3)
        │
 12. [FORMAT CONVERSION]       Binary glTF 2.0 (.glb) container creation
        │
 13. [COMPRESSION]             Derived Meshopt quantization (position, normal, index)
        │
 14. [HASHING]                 Cryptographic SHA-256 calculation of all outputs
        │
 15. [MANIFEST GENERATION]     Registry update in assets/manifests/assets.manifest.json
        │
        ▼
   (RUNTIME ASSET: Ready for Device-Aware Streaming Engine)
```

### Detailed Stage Specifications

| Stage # | Stage Name | Inputs | Outputs | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `SOURCE` | Upstream repository URL, license, author citations | Source identification record | Legal audit & upstream license verification |
| **02** | `INGEST` | Upstream file (.stl / .obj / .blend) | Archived source copy | Ingestion specification checklist (`ASSET_INGESTION_SPEC.md`) |
| **03** | `RAW ARCHIVE` | Downloaded file | `assets/raw/[asset-id]/original.*` | SHA-256 hash verified against upstream |
| **04** | `PROVENANCE` | Upstream metadata | Ingestion metadata record | Mandatory field completeness check |
| **05** | `VALIDATION` | Raw binary | Parseable triangle buffer | Automated mesh parser |
| **06** | `NORMALIZATION` | Raw coordinates | Standard metric coordinates (mm) | Scale & bounding-box audit |
| **07** | `ANATOMICAL QA` | Normalized mesh | Anatomical sign-off | Specialist review against reference atlases |
| **08** | `CLEANING` | Uncleaned mesh | Manifold mesh in `working/` | `scripts/pipeline/clean_mesh.py` |
| **09** | `TOPOLOGY QA` | Cleaned mesh | Topology QA report | 0 non-manifold edges, 0 zero-area faces |
| **10** | `CANONICALIZATION` | Cleaned mesh | `canonical/[asset-id].canonical.glb` | Uncompressed glTF standard check |
| **11** | `LOD GENERATION` | Canonical mesh | `lod/[asset-id].lod[0-3].glb` | Geometric error & triangle budget audit |
| **12** | `FORMAT CONVERSION` | Multi-resolution meshes | Standard glTF 2.0 binary buffers | `gltf-validator` validation |
| **13** | `COMPRESSION` | LOD glb files | `runtime/[asset-id].lod*.meshopt.glb` | Meshopt decompression round-trip test |
| **14** | `HASHING` | All output files | SHA-256 hashes per artifact | Cryptographic hash computation |
| **15** | `MANIFEST UPDATE` | Hashes, metrics, provenance | `assets.manifest.json` updated | Schema validation against `AssetsManifest` |

---

## 3. Directory Separation Architecture

Raw source assets must **NEVER** be overwritten. Derived assets must always be **100% reproducible** from raw sources using the recorded transformation scripts.

```
assets/
├── sources/                          <- Remote repository references & raw mirrors
│   └── bodyparts3d/                  <- Upstream BodyParts3D Release 3.0
│
├── raw/                              <- Immutable original ingested files
│   └── mesh.hippocampus.left/
│       ├── FMA72714.stl              <- Exact bit-for-bit upstream file
│       └── ingestion.json            <- Ingestion provenance & source hash
│
├── working/                          <- Intermediate scratch & topology repair
│   └── mesh.hippocampus.left/
│       ├── cleaned.obj               <- Manifold-repaired intermediate
│       └── transform_log.json        <- Transformation parameter log
│
├── derived/                          <- Reproducible output deliverables
│   └── mesh.hippocampus.left/
│       ├── canonical/                <- Scientific master geometry (uncompressed)
│       │   └── mesh.hippocampus.left.canonical.glb
│       ├── lod/                      <- Multi-resolution geometry (uncompressed)
│       │   ├── mesh.hippocampus.left.lod0.glb
│       │   ├── mesh.hippocampus.left.lod1.glb
│       │   ├── mesh.hippocampus.left.lod2.glb
│       │   └── mesh.hippocampus.left.lod3.glb
│       └── runtime/                  <- Optimized web deliverables (Meshopt)
│           ├── mesh.hippocampus.left.lod0.meshopt.glb
│           ├── mesh.hippocampus.left.lod1.meshopt.glb
│           ├── mesh.hippocampus.left.lod2.meshopt.glb
│           └── mesh.hippocampus.left.lod3.meshopt.glb
│
├── manifests/
│   └── assets.manifest.json          <- Machine-readable production registry
│
└── validation/
    ├── hippocampus_left_report.md    <- Human-readable validation sign-off
    └── qa_logs/                      <- Automated test run artifacts
```

---

## 4. Validation Lifecycle & Promotion State Machine

An asset cannot become `PRODUCTION_READY` until every preceding validation gate passes:

```
[INGESTED]
    │  File integrity confirmed; raw SHA-256 recorded
    ▼
[SOURCE_VERIFIED]
    │  Upstream license, attribution, and dataset version confirmed
    ▼
[GEOMETRY_VALIDATED]
    │  0 non-manifold edges, 0 zero-area faces, 0 degenerate triangles
    ▼
[ANATOMY_REVIEW_PENDING]
    │  Morphology, laterality, and boundaries submitted for clinical review
    ▼
[ANATOMY_VALIDATED]
    │  Audited and signed off against anatomical benchmark literature
    ▼
[PROVENANCE_VERIFIED]
    │  Complete transformation log recorded; licenses clear of NC clauses
    ▼
[RUNTIME_READY]
    │  LODs generated, Meshopt compressed, BVH bounds calculated
    ▼
[PRODUCTION_READY]
    │  Whitelisted in assets.manifest.json; bundle memory budget satisfied
```

---

## 5. Traceability & Invariant Protection

Every asset in the manifest records its complete chain of custody:
1. **Source Hash**: Cryptographic SHA-256 of the raw ingested file.
2. **Transformation Steps**: Exact script name, version, parameter dictionary, execution timestamp, and operator identity.
3. **Input / Output Hashes**: Every intermediate step records `input_sha256` and `output_sha256`.
4. **No Placeholders**: If a step has not yet been executed, it is omitted or marked `PENDING`.
5. **No Visual Hallucination**: No vertex smoothing, edge erosion, or cosmetic reshaping may alter authentic anatomical morphology.
