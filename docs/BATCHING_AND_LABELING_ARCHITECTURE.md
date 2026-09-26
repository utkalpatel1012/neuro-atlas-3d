# Semantic Batching & 3D Spatial Labeling Architecture

**Document Version**: 1.0.0  
**Authority**: Senior 3D Web Graphics Engineer & Technical Architect  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Semantic Geometry Batching Architecture

### The Problem
Rendering 500+ distinct anatomical structures as individual Three.js `Mesh` instances issues >500 separate draw calls per frame, exceeding the CPU driver budget on mobile and iPad devices and collapsing frame rates. Conversely, merging all structures into a single monolithic mesh destroys individual structure addressability, hover detection, and selective visibility.

### The Solution: Semantic Multi-Draw Batching (`THREE.BatchedMesh`)
Instead of one universal batch, geometry is partitioned into **Semantic Batches** sharing common material properties:

```
Scene Root
 ├── CortexBatch (Left & Right Hemispheres)
 ├── SubcorticalGrayBatch (Striatum, Pallidum, Thalamic Nuclei, Amygdala)
 ├── VentricularBatch (Lateral, 3rd, Aqueduct, 4th Ventricles)
 ├── WhiteMatterBatch (Corpus Callosum, Internal Capsule, Bundles)
 ├── BrainstemCerebellarBatch (Midbrain, Pons, Medulla, Cerebellum)
 ├── CranialNerveBatch (CN I through CN XII)
 └── VascularBatch (Circle of Willis Arteries & Sinuses)
```

### Deterministic Three-Level Addressability
Every anatomical structure in the atlas maintains deterministic two-way mapping:
```text
structureId (Canonical URI) 
    ◄──► batchId (Semantic Group) 
    ◄──► instanceId / subGeometryId (Buffer Offset)
```
* **Visibility Control**: `batchedMesh.setVisibleAt(instanceId, isVisible)`
* **Color / Highlight Override**: `batchedMesh.setColorAt(instanceId, highlightColor)`
* **Transform Override**: `batchedMesh.setMatrixAt(instanceId, explosionMatrix)`
* **Draw Call Reduction**: Reduces total draw calls from **>500 down to <25**, satisfying the tightest base iPad budget.

---

## 2. 3D Spatial Labeling & Label Level-of-Detail (LOD)

### The Problem
Rendering hundreds of 2D DOM labels simultaneously produces screen clutter, visual overlapping, and massive DOM reflow bottlenecks.

### The Solution: Label LOD & Occlusion Engine
1. **Priority-Tiered Activation**:
   * *Tier 1 (Always Visible when group active)*: Major Lobes and Primary Subcortical Hubs (e.g., "Frontal Lobe", "Thalamus", "Brainstem").
   * *Tier 2 (Proximity Activated)*: Major Gyri and Ventricles (visible when camera distance $< 150\text{ mm}$).
   * *Tier 3 (Detail Activated)*: Specific gyral subparts, sulci, and small nuclei (visible when camera distance $< 75\text{ mm}$ or when structure is hovered/selected).
2. **Depth Buffer Occlusion Testing**:
   * Casts a low-cost GPU depth query or single raycast from the camera to the label anchor point.
   * If an opaque anatomical mesh occludes the anchor point, the label opacity smoothly fades to `0.0`.
3. **Screen-Space Collision Detection**:
   * Evaluates 2D screen-space bounding boxes; if two labels overlap, the lower-priority label is hidden.
4. **Migration Path to GPU / SDF Vector Text**:
   * Phase 2/7 begins with `CSS2DRenderer` for crisp vector typography.
   * As structure density increases in Phase 7, labels transition to GPU Signed Distance Field (SDF) instanced billboards (`Troika 3D Text`), eliminating all DOM overhead.
