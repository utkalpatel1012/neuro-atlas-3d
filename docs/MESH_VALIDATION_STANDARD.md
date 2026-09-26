# Mesh Validation & Geometric Quality Assurance Standard

**Standard**: AAS-2026-NEURO-V1  
**Authority**: Senior Visualization Engineer & 3D Computational Geometry Specialist  
**Document**: `docs/MESH_VALIDATION_STANDARD.md`  
**Phase**: 1.0 Production Anatomical Asset Pipeline Foundation  
**Status**: APPROVED & LOCKED  

---

## 1. Scope & Objective

This standard defines the mandatory geometric and topological quality gates for all 3D surface meshes in the atlas.

A 3D mesh that is visually convincing may still harbor severe topological flaws (non-manifold edges, T-junctions, duplicate vertices, flipped normals) that cause raycasting failures in `three-mesh-bvh`, depth sorting artifacts in alpha-hashed transparency, rendering blackouts in WebGPU, or physics simulation errors.

Every mesh passing through the asset pipeline must be audited against these mathematical criteria.

---

## 2. Canonical Geometry Standard

All canonical master meshes (`assets/derived/[asset-id]/canonical/*.glb`) must strictly conform to these baseline geometric specifications:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Canonical Geometry Standard                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Container Format         │ glTF 2.0 Binary (.glb)                      │
│ Compression              │ UNCOMPRESSED (Meshopt reserved for runtime) │
│ Coordinate Handedness    │ Right-Handed                                │
│ Axis Orientation         │ +Y Up (Superior), +Z Forward (Anterior),    │
│                          │ +X Right (Lateral)                          │
│ Measurement Units        │ Millimeters (1.0 unit = 1.0 mm)             │
│ True Anatomical Scale    │ 1:1 Real Human Morphology                   │
│ Vertex Normal Convention │ Weighted Area/Angle Smooth Normals          │
│ Triangle Winding         │ Counter-Clockwise (CCW) Front Facing        │
│ Pivot / Origin           │ Anatomical Centroid / Center of Mass        │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Geometric QA Failure Criteria (Non-Negotiable)

A mesh fails Geometric QA and cannot be promoted to `GEOMETRY_VALIDATED` if any of the following defects are detected:

### 3.1. Topological Manifoldness
* **Non-Manifold Edges**: An edge shared by more than two triangles. Must be **strictly 0**.
* **Non-Manifold Vertices**: Vertices where two disconnected fans meet. Must be **strictly 0**.
* **Open Boundaries / Holes**: For watertight closed organ meshes (e.g., Hippocampus, Putamen, Thalamus), boundary edge count must be **strictly 0**. (Open cortical sheets like FreeSurfer pial surfaces must explicitly document open boundaries).

### 3.2. Degenerate Geometry
* **Zero-Area Faces**: Triangles with collinear vertices producing zero surface area ($A < 10^{-7}\text{ mm}^2$). Must be **strictly 0**.
* **Duplicate Vertices**: Distinct vertex indices sharing identical $(x, y, z)$ coordinates within $\epsilon < 10^{-5}\text{ mm}$. Must be merged.
* **Duplicate Faces**: Triangles referencing the exact same three vertices. Must be **strictly 0**.
* **Extreme Aspect Ratio Faces (Slivers)**: Triangles with aspect ratios exceeding $1:100$, causing numerical instability in bounding volume hierarchy (BVH) raycasting.

### 3.3. Normals & Winding
* **Inverted / Flipped Normals**: Face normals pointing inward toward the organ interior.
* **Inconsistent Winding**: Adjacent triangles with opposing vertex winding orders. All surface normals must point outward into extracellular CSF or surrounding white matter.

### 3.4. Bounding Box & Scale Sanity
* **Bounding Dimensions**: Dimensions must match adult human macroscopic neuroanatomy (e.g., Hippocampus length: $35 - 45\text{ mm}$, height: $15 - 25\text{ mm}$, width: $15 - 22\text{ mm}$). Meshes scaled in meters (e.g., $0.04\text{ m}$) or micrometers are flagged as scale errors.
* **NaN / Infinite Values**: Zero tolerance for `NaN`, `null`, or `inf` floating-point coordinates.

---

## 4. Remediation Protocol: Before $\rightarrow$ Operation $\rightarrow$ After

Automatic "magic" cleanup tools often distort anatomical morphology (e.g., eroding the delicate pes hippocampi digitationes or merging the hippocampal fissure with the subiculum).

Therefore, every geometry repair operation must be recorded with full parameter traceability:

```
[Input Mesh: HASH_A]
       │
       ▼  Record: Vertex count, triangle count, non-manifold edges
[Cleaning Operation: NonManifold_Repair]
   - Parameters: merge_distance_mm = 0.0001, preserve_boundaries = true
   - Executed By: scripts/pipeline/clean_mesh.py v1.0
       │
       ▼  Record: Vertex count, triangle count, non-manifold edges
[Output Mesh: HASH_B]
       │
       ▼  Validation Test: Verify geometric error < 0.05 mm (Hausdorff distance)
[Audit Sign-off: PASS]
```

If any cleanup operation produces a maximum Hausdorff geometric displacement exceeding **$0.25\text{ mm}$**, the operation is aborted and flagged for specialist manual review.
