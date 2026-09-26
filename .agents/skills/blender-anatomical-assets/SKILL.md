---
name: blender-anatomical-assets
description: Standard operating procedures and automated Python scripts for anatomical mesh cleanup, retopology, semantic hierarchy naming, origin alignment, decimation, and gltfpack Meshopt optimization.
---

# Blender Anatomical Assets Pipeline Skill

## Purpose
Establishes the step-by-step pipeline for importing raw scientific meshes (e.g., Z-Anatomy `.blend`, FreeSurfer surfaces, GIfTI parcellations), repairing non-manifold defects, structuring anatomical hierarchies, and exporting production-ready, hyper-optimized glTF 2.0 binaries.

## 1. Mesh Topology & Cleanup Checklist
1. **Remove Non-Manifold Geometry**:
   - Merge overlapping vertices (`Merge by Distance` with epsilon `0.0001m`).
   - Remove internal/interior faces and zero-area degenerate triangles.
   - Fill non-manifold holes on closed nuclear volumes (e.g., Thalamus, Putamen).
2. **Normal Verification**:
   - Recalculate outward-facing normals (`Shift + N`).
   - Compute custom split normals / weighted normals to produce smooth biological curvature without faceting.
3. **Origin & Pivot Alignment**:
   - Every discrete structure mesh must have its origin set to its anatomical center-of-mass (`Origin to Center of Mass (Surface)`).
   - This ensures accurate radial expansion during explosion views and proper target framing for camera controllers.

## 2. Naming & Hierarchical Organization
* Objects in the Outliner must strictly match canonical dot-delimited IDs:
  `brain.telencephalon.left.frontal_lobe.superior_frontal_gyrus`
* Maintain anatomical parent collections:
  `Scene Collection -> BrainAssembly -> Telencephalon -> Cortex_Left`

## 3. Decimation & LOD Strategy
* Target budget for full central nervous system assembly: **~350,000 triangles**.
* Use Quadric Error Metric (QEM) decimation (`Decimate Modifier` -> `Collapse`):
  - Large cortical lobes: Decimate with boundary preservation.
  - Small delicate structures (Cranial Nerves, Mamillary Bodies, Habenula): Preserve higher relative density.

## 4. glTF Export & Optimization Command
Export from Blender:
- Format: `glTF Binary (.glb)`
- Include: Selected Objects, Custom Properties, Normals, Vertex Colors.
- Geometry: Apply Modifiers, Tangents (if normal mapped).
- Transform: `+Y Up`.

Optimize via CLI (`gltfpack`):
```bash
gltfpack -i raw_brain.glb -o brain_optimized.glb -cc -kn -tc
```
* `-cc`: Enable Meshopt compression (`EXT_meshopt_compression`).
* `-kn`: Keep node names (essential for matching runtime IDs to metadata).
* `-tc`: Apply KTX2 texture compression.
