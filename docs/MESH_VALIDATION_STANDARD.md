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
│ Axis Orientation         │ +Y Up (Superior), +Z BACKWARD (Posterior),│
│ (Phase 3.1 measured)     │ +X Right (Lateral). NOT RAS-ordered,      │
│                          │ NOT MNI.                                  │
│ Measurement Units        │ Millimeters (1.0 unit = 1.0 mm)             │
│ True Anatomical Scale    │ 1:1 Real Human Morphology                   │
│ Vertex Normal Convention │ Weighted Area/Angle Smooth Normals          │
│ Triangle Winding         │ Counter-Clockwise (CCW) Front Facing        │
│ Pivot / Origin           │ Anatomical Centroid / Center of Mass        │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Topology Classification Matrix (10 Classes)

Brain structures exhibit fundamentally distinct mathematical and geometric topologies. Applying universal watertightness criteria to non-solid anatomy (e.g., open cortical ribbons, ventricular drainage channels, white matter streamlines) produces false rejections. AAS-2026-NEURO-V1 defines 10 formal topology classes:

| Topology Class | Typical Anatomical Examples | Watertight Required | Open Boundaries Allowed | Manifold Edges Required | Primary Geometric Metrics |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `SOLID` | Hippocampus, Amygdala, Thalamus, Putamen, Caudate | **YES** | **0** | Strictly 0 | Volume ($mm^3$), Watertightness, Area |
| `CLOSED_SURFACE` | Ventricular system envelope, closed dural sac | **YES** | **0** | Strictly 0 | Enclosed volume, Area |
| `OPEN_SURFACE` | Hemispheric cortical pial surface, ventricular horns | **NO** | Permitted ($\ge 0$) | Strictly 0 | Surface area ($mm^2$), Curvature |
| `SHEET` | Dural septa (falx cerebri, tentorium cerebelli) | **NO** | Permitted ($\ge 0$) | Strictly 0 | Thickness ($mm$), Planar curvature |
| `TUBE` | Cerebral aqueduct, cranial nerves, vascular conduits | Contextual | Endpoint openings permitted | Strictly 0 | Cross-sectional diameter ($mm$), Length |
| `CENTERLINE` | Vessel centerlines, sulcal fundal lines | **N/A** (1D) | Open endpoints | N/A | Arc length ($mm$), Tortuosity |
| `TRACT_STREAMLINE` | Corpus callosum, corticospinal tract, arcuate fasciculus | **N/A** (Polyline) | Uncapped fiber ends | N/A | Fiber count, Streamline length ($mm$) |
| `SURFACE_PARCELLATION`| Brodmann / HCP MMP 1.0 cortical label patches | **NO** | Inter-parcel boundaries | Strictly 0 | Cortical area ($mm^2$), Border alignment |
| `VOXEL_DERIVED_SURFACE`| Marching Cubes ISO-surfaces from 7T ex vivo MRI | Preferred | Defect repair allowed | Strictly 0 | Step artifacts, Normal smoothness |
| `POINT_TARGET` | Stereotaxic DBS targets (STN, GPi), stimulation foci | **N/A** (0D) | N/A | N/A | Stereotaxic coordinates ($x, y, z$) |

---

## 4. Decoupled QA Architecture: Geometric vs Anatomical QA

To prevent conflation between rendering/pipeline bugs and anatomical anomalies, validation strictly decouples **Technical Geometric QA** from **Scientific Anatomical QA**:

```
                              Raw Mesh / Derived GLB
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        [GEOMETRIC QA STAGE]                    [ANATOMICAL QA STAGE]
   - Evaluated per Topology Class          - Independent of Mesh Topology
   - Manifoldness (Edges, Vertices)        - Canonical Laterality (Left/Right/Midline)
   - Degenerate faces (0-area, slivers)    - Adult human volume plausibility ($cm^3$)
   - Vertex normal consistency             - Subfield boundary mapping status
   - Watertightness (if SOLID)             - Anatomical landmark alignment
                    │                                       │
                    ▼                                       ▼
       Status: GEOMETRY_VALIDATED              Status: ANATOMY_VALIDATED
                    └───────────────────┬───────────────────┘
                                        ▼
                         [COMBINED PRODUCTION PASS]
```

### 4.1. Geometric QA Criteria
1. **Non-Manifold Edges**: Must be strictly 0 across all 2D surface classes.
2. **Duplicate Faces & Zero-Area Faces**: Strictly 0.
3. **Watertightness**: Enforced strictly for `SOLID` and `CLOSED_SURFACE` classes. Not enforced for `OPEN_SURFACE`, `SHEET`, `TUBE`, or `SURFACE_PARCELLATION`.
4. **Vertex Normal Coherence**: Smooth outward normals verified.

### 4.2. Anatomical QA Criteria
1. **4-Stage Coordinate & Laterality Chain**:
   - Stage 1: Verified source coordinate definition (system, orientation, units).
   - Stage 2: Isometric bijective transformation preservation (bounding box dimensions preserved within scale factor).
   - Stage 3: Canonical Three.js RAS frame (scale in mm, macroscopic adult dimensions).
   - Stage 4: Laterality verification (Left: $X < 0$, Right: $X > 0$, Midline: symmetric spanning $X = 0$, Bilateral: spans bilateral hemispheres).
2. **Subfield Mapping Status**:
   - `MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED`: Ingested gross anatomical boundary.
   - `DISCRETE_SUBFIELDS_SEGMENTED`: Parcellated internal subfield meshes.
   - `ANATOMICAL_MAPPING_PENDING`: Explicitly acknowledged unsegmented volume.

---

## 5. LOD Multi-Resolution Fidelity Standards

Mesh simplification is governed by independent geometric metrics, not internal decimation heuristics:

1. **QEM Residual Error ($\epsilon_{qem}$)**:
   - Measures internal quadric collapse distance relative to the mesh bounding sphere diameter.
   - Distinct from surface fidelity. Max allowable tolerance: $\epsilon_{qem} \le 0.01$ (1%).
2. **Discrete Hausdorff Surface Deviation ($d_H$)**:
   - Maximum directed distance from any original canonical vertex to the nearest LOD surface:
     $$d_H(S_{\text{orig}}, S_{\text{lod}}) = \max_{v \in S_{\text{orig}}} \min_{u \in S_{\text{lod}}} \|v - u\|$$
   - Maximum allowable deviation:
     - LOD1 ($75\%$): $d_H \le 2.0\text{ mm}$
     - LOD2 ($50\%$): $d_H \le 2.5\text{ mm}$
     - LOD3 ($25\%$): $d_H \le 3.0\text{ mm}$
3. **Volume Preservation ($\Delta V$)**:
   - Measured via the Divergence Theorem:
     $$V = \frac{1}{6} \left| \sum_{i=1}^{N_{\text{tri}}} \mathbf{v}_{0,i} \cdot (\mathbf{v}_{1,i} \times \mathbf{v}_{2,i}) \right|$$
   - Volume deviation $|\Delta V| \le 1.0\%$ across all levels. (LOD3 left hippocampus: $-0.837\%$).

---

## 6. Remediation Protocol: Before $\rightarrow$ Operation $\rightarrow$ After

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
