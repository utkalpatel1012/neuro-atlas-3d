# Phase 2 Entry Criteria & Architectural Checklist Contract

**Standard**: AAS-2026-NEURO-V1  
**Project**: 3D Human Brain Atlas for Advanced Academic Neuropsychiatry  
**Document**: `PHASE_2_ENTRY_CRITERIA.md`  
**Phase Transition**: Phase 1.0.1 (Asset Pipeline Hardening) $\rightarrow$ Phase 2.0 (Interactive 3D Renderer)  
**Authority**: Lead Technical Architect & Senior Scientific Visualization Engineer  
**Status**: SIGNED & COMMITTED  

---

## 1. Purpose of this Contract

This document establishes the binding architectural contract that must be satisfied prior to commencing **Phase 2: Interactive 3D Neuroanatomy Atlas Viewport & Rendering Engine**.

Phase 2 will introduce Three.js (r160+ / modern WebGPU / WebGL2 fallback), scene graphs, depth sorting, shader materials, anatomical picking, slicing planes, and camera orbital controls.

No rendering code may be written until every item in this checklist is verified as `PASSED`.

---

## 2. Phase 2 Entry Criteria Checklist

### 2.1. Architectural & Schema Integrity
- [x] **Strict TypeScript Compilation**: `tsc --noEmit` runs with 0 errors.
- [x] **Five Disjoint URI Namespaces**: All entities and files belong strictly to `entity://`, `asset://`, `mesh://`, `texture://`, or `evidence://`.
- [x] **Decoupled Entity Model**: Semantic entities exist independently of physical 3D mesh assets.
- [x] **Exemplar Record Compliance**: `data/structures/hippocampus_left.json` is fully typed, valid JSON, and contains accurate macroscopic subfield metadata and Oxford CEBM Level 4 lesion evidence.

### 2.2. Provenance & Licensing Integrity
- [x] **Immutable Raw Assets**: Raw source assets cannot be overwritten without triggering hash invalidation. Atomic check-before-write enforced.
- [x] **Complete Cryptographic Lineage**: Raw source, canonical master GLB, multi-LOD GLBs, and runtime Meshopt GLBs form an unbroken SHA-256 audit chain.
- [x] **Manifest Synchronization**: Both `assets/manifests/assets.manifest.json` and root mirror `assets/assets.manifest.json` are synchronized.
- [x] **Defensive Dual Compliance**: DBCLS BodyParts3D Release 3.0 (CC-BY-SA 2.1 JP) and modern portal update (CC BY 4.0 International verified 2025-02-27) are documented with compliant derivative CC-BY-SA 4.0 terms.
- [x] **Quarantine Isolation**: Zero research-only (NC) datasets present in `production_whitelist`.

### 2.3. Coordinate Transformation & Laterality Framework
- [x] **Generic Coordinate Adapter**: Reusable `SourceCoordinateAdapter` abstraction in place; hardcoded procedural transforms eliminated.
- [x] **4-Stage Coordinate Validation**:
  1. Source definition verified (DICOM LPS whole-body table origin, mm).
  2. Isometry & metric preservation verified ($\Delta \text{dim} = 0.0000\text{ mm}$, $\Delta \text{center} < 0.0001\text{ mm}$).
  3. Canonical Three.js RAS frame verified at 1:1 millimeter scale.
  4. Laterality verified across all 4 classes (`left`, `right`, `midline`, `bilateral`).
- [x] **Centroid Sign Invariant**: Anatomical laterality is proven through the 4-stage validation chain, never inferred solely from centroid X sign.

### 2.4. Topology & Geometric QA Standards
- [x] **10 Topology Classes**: All 10 classes (`SOLID`, `CLOSED_SURFACE`, `OPEN_SURFACE`, `SHEET`, `TUBE`, `CENTERLINE`, `TRACT_STREAMLINE`, `SURFACE_PARCELLATION`, `VOXEL_DERIVED_SURFACE`, `POINT_TARGET`) formally categorized.
- [x] **Decoupled Geometric QA**: Technical manifoldness audited per topology profile (watertightness only required for `SOLID` and `CLOSED_SURFACE`).
- [x] **Decoupled Anatomical QA**: Scientific veracity, volume plausibility, and subfield representation audited independently of mesh flaws.

### 2.5. Multi-Resolution LOD & Compression Runtime
- [x] **Decoupled LOD Metrics**: QEM residual error is distinguished from geometric surface accuracy.
- [x] **Independent Geometric Fidelity**: Discrete Hausdorff surface deviation ($d_H \le 3.0\text{ mm}$) and volume delta ($|\Delta V| \le 1.0\%$) verified across all LOD levels.
- [x] **Lossless Runtime Meshopt Compression**: `EXT_meshopt_compression` verified bit-exact on round-trip decoding with $> 30\%$ bandwidth savings.
- [x] **Canonical Master Preservation**: Canonical uncompressed GLBs remain pristine and distinct from runtime compressed files.

### 2.6. Automated Verification Pipeline
- [x] `npm run typecheck` — 0 errors.
- [x] `npm run test` — 7 schema invariants + 15 pipeline regression tests passed.
- [x] `npm run asset:validate` — 10 checks passed on canonical exemplar.
- [x] `npm run audit:phase1` — 7 sections / 12 checks passed.

---

## 3. Phase 2 Scope Boundaries & Invariants

When Phase 2 begins, the following constraints must be strictly observed:
1. **Never Render Raw Assets**: Viewports must load derived runtime Meshopt GLBs (`mesh://[assetId]/runtime/*.meshopt.glb`), never raw STLs or uncompressed canonical master GLBs.
2. **Preserve Canonical Vertex Coordinates**: Viewport panning, rotation, and zooming must be executed exclusively via Three.js camera/view matrices, never by transforming vertex buffer attributes.
3. **Layered Material Architecture**: Shaders must support independent visual layers (anatomic pial surface, subcortical transparency, functional fMRI co-activation, Brodmann parcellation lines).
4. **BVH Raycasting Acceleration**: All raycasting and pointer interactions must utilize `three-mesh-bvh` for performance.
5. **Progressive Mesh Ingestion**: Structures are ingested incrementally through the Phase 1 pipeline, validated against `audit:phase1`, before registration in the Phase 2 scene graph.
