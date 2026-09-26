# Part 3 Asset Ingestion Contract & Specification

**Document Standard**: AAS-2026-NEURO-V1  
**Phase**: Phase 2.1.1 Consolidation / Part 3 Gate  
**Authority**: Lead Neuroanatomy Architect, Graphics Lead & Asset Pipeline Engineer  
**Status**: ACTIVE & MANDATORY  
**Target Audience**: All automated asset pipelines, AI autonomous subagents, and human anatomical curators  

---

## Preamble

This document defines the strict, binding engineering contract for ingesting any anatomical asset into the Neuro Atlas 3D project during Part 3 and beyond. No anatomical asset may enter the repository or runtime bundle without satisfying every criterion set forth herein.

---

## 1. Permitted Raw Source Formats
The ingestion pipeline accepts only the following five source formats:
- **NIfTI (`.nii.gz`)**: Volumetric neuroimaging segmentations (e.g. from FreeSurfer, FSL, ANTs, or HCP). Surface extraction must be performed via Marching Cubes / Flying Edges with Laplacian smoothing.
- **GLTF / GLB (`.gltf`, `.glb`)**: 3D scene and mesh standard format.
- **Wavefront OBJ (`.obj`)**: Polygonal geometry with vertex normals.
- **Stereolithography (`.stl`)**: Binary or ASCII triangular surface representations (e.g. DBCLS BodyParts3D).
- **Blender Scene (`.blend`)**: Blender 4.x scene files (e.g. Z-Anatomy master models). Must be extracted via automated headless Blender Python scripts (`scripts/pipeline/extract_blender.py`).

## 2. Prohibited Source Formats
The following formats are **strictly prohibited** from the repository and ingestion scripts:
- Proprietary DCC formats without open CLI tooling: FBX, 3DS, DAE/Collada, C4D, MAX, Maya (`.ma`, `.mb`).
- Unstandardized CAD formats: STEP, IGES, SolidWorks (`.sldprt`), Rhino (`.3dm`).
- Raw Point Clouds: PLY without polygonal faces, LAS, XYZ, PCD (point clouds must be polygonized and reconstructed prior to pipeline ingestion).
- Proprietary medical archive formats directly in git: DICOM (`.dcm`), Bruker, Philips PAR/REC (must be converted to NIfTI before ingestion).

## 3. Coordinate Transformation Requirements (`source -> canonical_atlas_ras`)
All raw vertex coordinates must be transformed into the engine's canonical coordinate space:
- **Canonical Space Name**: `canonical_atlas_ras` (identifier retained for stability)
- **Units**: Millimeters ($1.0\text{ unit} = 1.0\text{ mm}$).
- **Orientation (Phase 3.1 measured — NOT RAS order, NOT MNI)**:
  - $+X$: Right lateral
  - $+Y$: Superior (Dorsal)
  - $+Z$: POSTERIOR (Occipital)
- **Origin $(0,0,0)$**: Canonical atlas origin (approximating interhemispheric mid-commissural plane; asserted, method undocumented).
- **Transformation Provenance**: The transformation adapter (e.g. `bodyparts3d-lps-to-ras`) must be recorded in `modifications_applied` in the manifest and entity metadata.

## 4. Orientation & Chirality Verification
- **Source-to-canonical mapping (exact coded math, Phase 3.1)**: the BodyParts3D adapter computes $X_c=-X_s,\; Y_c=Z_s-1561.7,\; Z_c=Y_s+70.1$ (x-negation + y/z axis swap, determinant +1, no mirroring). The pre-3.1 formula ($Y=-Y_{LPS},\; Z=+Z_{LPS}$) described a different transform that the code never implemented — DO NOT use it as a contract requirement.
- **Winding Order**: Triangle winding order must be evaluated and corrected after coordinate reflection so that face normals point outwards (Counter-Clockwise in standard right-handed orientation).
- **Bilateral Centroid Audit**: Left-sided structures must yield negative $X$ centroids ($X < 0$), and right-sided structures must yield positive $X$ centroids ($X > 0$). Any sign violation triggers immediate pipeline abort.

## 5. Watertightness Rules by Structure Class
- **Solid Structures (`SOLID`)**: Deep gray matter nuclei (hippocampus, amygdala, thalamus, caudate, putamen, globus pallidus), brainstem subnuclei, cerebellar lobes.
  - Requirement: **Strictly watertight manifold**. Boundary edges $= 0$, non-manifold edges $= 0$.
- **Thin Sheets & Membranes (`SHEET`)**: Ventricular ependyma, dural septa (falx cerebri, tentorium cerebelli), pia-arachnoid membranes.
  - Requirement: Open manifold with explicit 2-manifold topology; non-manifold edges $= 0$; boundary edges $> 0$ allowed along anatomical cut planes only.
- **Tubular / Segmental Assemblies (`TUBULAR`)**: Cranial nerves, arterial branches (circle of Willis), venous sinuses.
  - Requirement: Capped tubular manifold or continuous cylindrical mesh; non-manifold edges $= 0$.

## 6. Non-Manifold Edge Tolerance
- **Non-Manifold Edges**: Exactly **0 allowed** across all structural classes. Edges shared by 3 or more faces are strictly rejected.
- **Non-Manifold Vertices**: Exactly **0 allowed** (e.g. "bowtie" or "hourglass" vertex singularities where two cones touch at an apex).
- **Duplicate Faces / Zero-Area Degenerate Faces**: Exactly **0 allowed**.

## 7. Self-Intersection Policy
- Raw meshes must undergo self-intersection auditing (`scripts/pipeline/validate_mesh.ts`).
- Coplanar intersecting triangles and self-penetrating folds that produce visual Z-fighting or erroneous raycast intersection normals must be eliminated during geometric remediation.

## 8. Decimation & Multi-LOD Generation Requirements
Every ingested anatomical structure must be exported with four discrete Level of Detail (LOD) representations:
- **LOD0**: Master full-resolution mesh ($100\%$ target triangle count). Preserves full anatomical morphology and sulcal/nuclear contours.
- **LOD1**: High LOD ($75\%$ triangle count). Decimated via Quadric Error Metric (QEM) simplification. Maximum Hausdorff distance error $< 0.15\text{ mm}$.
- **LOD2**: Medium LOD ($50\%$ triangle count). Decimated via QEM. Maximum Hausdorff distance error $< 0.35\text{ mm}$.
- **LOD3**: Low LOD ($25\%$ triangle count). Decimated via QEM. Suitable for mobile fallback and zoomed-out whole-brain context.
- All LOD levels must maintain identical bounding boxes, centroids, and origin positions.

## 9. Compression Policy: Runtime Meshopt vs DRACO
- **Runtime Default**: **Meshopt (`EXT_meshopt_compression`)**.
  - Rationale: Meshopt provides fast decompression speed (up to $5\times$ faster than Draco in WebAssembly / JS), minimal CPU overhead on mobile devices, low battery consumption, and streamable progressive vertex buffer layout.
  - Required for all production `.glb` assets served over HTTP to client viewports.
- **Secondary / Archival**: **DRACO (`KHR_draco_mesh_compression`)**.
  - Reserved strictly for cold-storage archival of ultra-dense raw segmentations or offline pipelines. Not permitted in primary web runtime asset paths due to high JS decompression latency on mobile devices.

## 10. Triangle Count Budgets per Structure Class
To guarantee mobile and desktop performance invariants, assets must satisfy strict polycount envelopes:

| Structure Class | LOD0 Max Triangles | LOD1 Max Triangles | LOD2 Max Triangles | LOD3 Max Triangles |
| :--- | :--- | :--- | :--- | :--- |
| **Cerebral Hemisphere (Cortex)** | $\le 120{,}000$ | $\le 90{,}000$ | $\le 60{,}000$ | $\le 30{,}000$ |
| **Deep Gray Nucleus (e.g. Hippocampus)** | $\le 10{,}000$ | $\le 7{,}500$ | $\le 5{,}000$ | $\le 2{,}500$ |
| **Brainstem / Cerebellar Lobe** | $\le 40{,}000$ | $\le 30{,}000$ | $\le 20{,}000$ | $\le 10{,}000$ |
| **Cranial Nerve (I - XII)** | $\le 5{,}000$ | $\le 3{,}750$ | $\le 2{,}500$ | $\le 1{,}250$ |
| **Vascular Segment (e.g. MCA, ACA)** | $\le 8{,}000$ | $\le 6{,}000$ | $\le 4{,}000$ | $\le 2{,}000$ |
| **Ventricular Cavity (Lateral, 3rd, 4th)** | $\le 15{,}000$ | $\le 11{,}250$ | $\le 7{,}500$ | $\le 3{,}750$ |
| **Cortical Parcel (Single HCP MMP Region)** | $\le 3{,}000$ | $\le 2{,}250$ | $\le 1{,}500$ | $\le 750$ |

## 11. Naming Conventions
- **Entity IDs**: Dot-delimited lowercase hierarchy matching embryology and ontology:
  - Format: `brain.<division>.<laterality>.<subsystem>.<structure_name>`
  - Examples: `brain.telencephalon.left.limbic.hippocampus`, `brain.diencephalon.bilateral.thalamus`, `brain.cranial_nerve.left.cn_05_trigeminal`
- **Asset IDs**:
  - Format: `mesh.<structure_name>.<laterality>.<version>`
  - Examples: `mesh.hippocampus.left.v1`, `mesh.thalamus.right.v1`
- **Mesh Node Names**:
  - Format: `Mesh_<StructureName>_<LateralityUpper>`
  - Examples: `Mesh_Hippocampus_L`, `Mesh_Thalamus_R`
- **File Names**:
  - Canonical: `<asset_id>.canonical.glb`
  - LOD: `<asset_id>.lod<0-3>.glb`
  - Runtime Meshopt: `<asset_id>.lod<0-3>.meshopt.glb`

## 12. Required Metadata Fields for Any New Entity
Every entity JSON record in `data/structures/<entity_name>.json` must provide:
- `id`: Canonical dot-delimited entity identifier.
- `entity_type`: `'anatomical_structure'`.
- `subtype`: Valid `AnatomicalStructureSubtype` (e.g. `'subcortical_nucleus'`, `'cortical_gyrus'`).
- `canonical_name`: Standard English anatomical name with laterality.
- `latin_name`: Terminologia Anatomica official Latin name.
- `laterality`: `'left' | 'right' | 'bilateral' | 'midline'`.
- `representation_scope`: `'paired_separate' | 'paired_combined' | 'unpaired_midline'`.
- `ontology`: `ta2_id`, `fma_id`, `uberon_id`.
- `hierarchy`: `division`, `hemisphere`, `subsystem`, `parent_id`, `groups`, `children_ids`.
- `spatial`: `coordinate_frame: "canonical_atlas_ras"`, `bounding_box`, `estimated_volume_cm3`.
- `representations`: Array containing at least one `EntityRepresentation` record.
- `asset_id`: Matching asset ID in `assets.manifest.json`.
- `asset_provenance`: Full provenance record with upstream source, licenses, and granular validation.
- `topography`: Anatomical boundaries and typed relationships with `semantic_class`.

## 13. Manifest Entry Schema & Required Hashes
Every asset in `assets/manifests/assets.manifest.json` must declare:
- `asset_id`: Unique string.
- `dataset_name`, `dataset_version`, `source_url`, `upstream_asset_id`.
- `upstream_license`: Exact upstream source license.
- `project_distribution_policy`: Chosen distribution license for the derived mesh (`CC-BY-SA-4.0`).
- `modifications_applied`: Step-by-step list of executed pipeline operations with tool name, parameters, execution timestamp, and Git commit hash.
- `resulting_sha256_hash`: Cryptographic SHA-256 hash of the canonical mesh.
- `lod_files`: Path, SHA-256 hash, triangle count, byte length for LOD0-LOD3.
- `runtime_files`: Path, SHA-256 hash, byte length, compression ratio for LOD0-LOD3 Meshopt files.

## 14. Provenance Tracking Requirements
- All intermediate assets must be traceable from source file download to final runtime GLB.
- Modification records must log the git commit hash of the pipeline code that produced them.
- Any manual cleanups (e.g. in Blender) must be accompanied by an export script or reproducible parameter log. Unrecorded manual edits are strictly prohibited.

## 15. License Compatibility Matrix
| Source License | Project Distribution Policy | Production Allowed? | Required Action |
| :--- | :--- | :--- | :--- |
| **CC BY 4.0** | CC-BY-SA-4.0 | YES | Preserve attribution notice |
| **CC-BY-SA 2.1 JP** | CC-BY-SA-4.0 | YES | Preserve attribution; distribute derived mesh under CC-BY-SA 4.0. Retroactivity of portal CC BY listings UNRESOLVED — LEGAL_REVIEW_REQUIRED (Phase 3.1 §19; no "dual compliance" terminology) |
| **CC-BY-SA 4.0** | CC-BY-SA-4.0 | YES | Preserve attribution; distribute derived mesh under CC-BY-SA 4.0 |
| **CC0 / Public Domain** | CC-BY-SA-4.0 / Apache-2.0 | YES | Document source |
| **CC-BY-NC-SA 4.0** | N/A | **NO (Quarantined)** | Quarantined under `RESEARCH_ONLY`. Prohibited in web bundle |
| **HCP Open Access** | HCP Terms | **LEGAL REVIEW REQUIRED** | Barred from commercial build until counsel clearance |

## 16. Stereotaxic Registration Documentation Requirements
- If an asset is registered to an external template (e.g. MNI152NLin2009cAsym):
  - Must specify `registration_method` (`affine_linear_12dof`, `nonlinear_diffeomorphic_syn`, etc.).
  - Must record `target_reference_template`.
  - Must record `registration_uncertainty_mm` (TRE) and `dice_similarity_coefficient`.
- If spatial normalization has not been empirically verified via ANTs SyN, FLIRT, or equivalent:
  - `registration_status` must be explicitly set to `"REGISTRATION_PENDING"`.
  - Approximated or affine-estimated values must not be presented as final registrations.

## 17. Automated Test Requirements Before Commit
Before any asset pull request or commit is merged, the following automated commands must succeed:
1. `npm run typecheck` (`tsc --noEmit`) - zero TypeScript compilation errors.
2. `npm test` - all Jest / test suites pass:
   - `src/schema_validation.test.ts`
   - `src/architecture_consolidation.test.ts`
   - Geometric QA validation scripts.
3. Cryptographic integrity check: All SHA-256 hashes in manifest must match actual file bytes on disk.

## 18. Visual Verification Checklist
1. Model renders without inverted face normals or black shadow artifacts.
2. Bilateral alignment: Left and right paired structures align symmetrically across the mid-sagittal plane ($X = 0$).
3. Boundary proximity: Structure does not clip or penetrate neighboring structures (e.g. hippocampus does not pierce the temporal horn floor or amygdala).
4. Selection & Hover: Raycast selection outlines the structure smoothly; selection state materials apply correctly.
5. Camera Framing: `frameSelection()` focuses cleanly on the structure's bounding box without clipping planes slicing through geometry.

## 19. Storage Organization
```
neuro-atlas-3d/
├── assets/
│   ├── raw/
│   │   └── <dataset_source>/
│   │       └── <upstream_asset_id>.<ext>
│   ├── derived/
│   │   └── <asset_id>/
│   │       ├── canonical/
│   │       │   └── <asset_id>.canonical.glb
│   │       ├── lod/
│   │       │   ├── <asset_id>.lod0.glb
│   │       │   ├── <asset_id>.lod1.glb
│   │       │   ├── <asset_id>.lod2.glb
│   │       │   └── <asset_id>.lod3.glb
│   │       └── runtime/
│   │           ├── <asset_id>.lod0.meshopt.glb
│   │           ├── <asset_id>.lod1.meshopt.glb
│   │           ├── <asset_id>.lod2.meshopt.glb
│   │           └── <asset_id>.lod3.meshopt.glb
│   └── manifests/
│       └── assets.manifest.json
└── data/
    └── structures/
        └── <structure_name>.json
```

## 20. Immediate Rejection Criteria (CI/CD Failure Triggers)
An asset is immediately rejected and fails CI/CD if:
1. **Geometric Defect**: Non-manifold edges $> 0$, degenerate zero-area faces $> 0$, or unclosed boundary edges on `SOLID` structures.
2. **License Non-Compliance**: Sourced from a Non-Commercial (`NC`) repository without quarantine, or missing upstream attribution.
3. **Coordinate Frame Error**: Mesh not transformed into `canonical_atlas_ras` ($1\text{ unit} = 1.0\text{ mm}$), or incorrect chirality ($X$ sign flipped).
4. **Polycount Violation**: Triangle count exceeds the maximum LOD envelope budget for its structural class.
5. **Hash Mismatch**: On-disk SHA-256 does not match the manifest record.
6. **Missing Invariant**: Lacks multi-LOD files (LOD0-LOD3) or lacks Meshopt runtime compression.
7. **Ad-Hoc Fields**: JSON entity or manifest introduces fields not defined in the core TypeScript schema interfaces.
