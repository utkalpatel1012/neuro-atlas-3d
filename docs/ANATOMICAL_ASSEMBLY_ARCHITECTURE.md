# Anatomical Assembly Architecture Specification
**Document Standard:** AAS-2026-NEURO-V1  
**Phase:** 2.1 (Multi-Structure Foundation)  
**Status:** Approved & Implemented  
**Date:** September 2026  

---

## 1. Architectural Philosophy & Core Principles

The Neuro Atlas 3D application is not a collection of arbitrary 3D meshes or a video game scene graph. It is an **Anatomical Assembly System** designed for high-precision neuropsychiatric education, clinical reference, and computational neuroscience.

### The Four Decoupled Tiers
A fundamental architectural invariant of the system is the strict decoupling of four core concepts:

```
+-------------------------------------------------------------------------+
| Tier 1: Semantic Entity Identity (Anatomical Entity Record)             |
|   - Canonical Identifier: "brain.telencephalon.left.limbic.hippocampus" |
|   - Ontology: TA2:5488, FMA:61884, UBERON:0001954                       |
|   - Scientific Morphometry: Centroid [-25.07, -13.89, -20.70] mm, 3.18cm³|
|   - Group Memberships: ["division.cerebrum", "system.limbic", ...]     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
| Tier 2: Physical Asset (Cryptographic Lineage & LOD Meshes)             |
|   - Asset ID: "mesh.hippocampus.left.v1"                                |
|   - Upstream Provenance: DBCLS BodyParts3D Release 3.0 (FMA61884)       |
|   - Immutable Lineage: raw -> validated -> canonical -> lod -> meshopt  |
|   - Multi-Resolution LODs: lod0 (4,280 tris) to lod3 (1,070 tris)       |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
| Tier 3: Anatomical Group (Hierarchical Assembly & Relationships)         |
|   - Hierarchy: Brain -> Cerebrum -> Hemisphere -> System -> Region      |
|   - Group IDs: "division.cerebrum", "hemisphere.left", "system.limbic"  |
|   - Aggregations: Dynamic aggregate bounding boxes, centroid union      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
| Tier 4: Runtime Object3D (Scene Graph & GPU Buffers)                    |
|   - Three.js Mesh instance attached under scene hierarchy               |
|   - Ephemeral Material State: DEFAULT, HOVER, SELECTED, GROUP_SELECTED  |
|   - Spatial BVH acceleration via three-mesh-bvh                         |
|   - UserData: Reference to Entity ID (Never authoritative identity)     |
+-------------------------------------------------------------------------+
```

---

## 2. Anatomical Hierarchy & Group Assembly

Anatomy is fundamentally hierarchical and functional. Structures do not exist in isolation; they belong to anatomical divisions, embryonic developments, functional systems, and vascular/neural territories.

### Hierarchy Specification

```
Brain (Whole Organ - Abstract Root)
  |
  +---> Cerebrum (division.cerebrum)
  |       |
  |       +---> Left Hemisphere (hemisphere.left)
  |       |       |
  |       |       +---> Left Limbic System (system.limbic.left)
  |       |               |
  |       |               +---> Left Hippocampus (brain.telencephalon.left.limbic.hippocampus)
  |       |
  |       +---> Right Hemisphere (hemisphere.right)
  |               |
  |               +---> Right Limbic System (system.limbic.right)
  |                       |
  |                       +---> Right Hippocampus (brain.telencephalon.right.limbic.hippocampus)
  |
  +---> Bilateral Functional Systems (Cross-Hemispheric)
          |
          +---> Limbic System (system.limbic)
                  |-- childGroupIds: ["system.limbic.left", "system.limbic.right"]
                  |-- memberEntities: [Left Hippocampus, Right Hippocampus]
```

### Data-Driven Group Representation
Every anatomical group is represented by an `AnatomicalGroup` interface:
```typescript
export interface AnatomicalGroup {
  groupId: string;
  name: string;
  category: GroupCategory; // 'division' | 'hemisphere' | 'system' | 'lobe' | 'region' | 'tract_bundle' | 'parcellation'
  parentGroupId?: string;
  childGroupIds: string[];
  memberEntityIds: string[];
  status: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE';
  description?: string;
}
```

Planned structures without available geometry (e.g. `division.cerebellum`, `division.brainstem`) remain registered with `status: 'UNAVAILABLE'` without synthetic or decorative meshes.

---

## 3. Hierarchical Visibility & State Propagation

Visibility in the assembly is not a simple boolean flag on a mesh. It is a derived state resulting from the logical conjunction of an entity's own state, ancestor groups, and global isolation modes.

### Visibility States
- `VISIBLE`: Entity is explicitly visible and all ancestor groups are visible.
- `HIDDEN`: Entity itself has been explicitly hidden by user action.
- `ANCESTOR_HIDDEN`: Entity is nominally visible, but one or more ancestor groups are hidden (e.g. hiding `hemisphere.left` hides the Left Hippocampus).
- `ISOLATED`: Either the entity itself is isolated, or an ancestor group containing the entity is isolated.

### Visibility Resolution Logic
```typescript
public isEntityEffectivelyVisible(entityId: string): boolean {
  // 1. Direct entity hiding
  if (this.hiddenEntityIds.has(entityId)) return false;

  // 2. Ancestor group hiding
  const ancestors = this.getAncestorGroupIds(entityId);
  for (const gid of ancestors) {
    if (this.hiddenGroupIds.has(gid)) return false;
  }

  // 3. Isolation mode evaluation
  if (this.isolatedEntityId) {
    return this.isolatedEntityId === entityId;
  }
  if (this.isolatedGroupId) {
    const descendants = this.getDescendantEntityIds(this.isolatedGroupId);
    return descendants.includes(entityId);
  }

  return true;
}
```

---

## 4. Multi-Selection & Visual Highlighting Model

The assembly manager separates direct entity selection from group selection.

### Visual State Transitions
| Visual State | Material Emissive Color | Emissive Intensity | Roughness | Meaning |
|---|---|---|---|---|
| `DEFAULT` | `#000000` (None) | 0.00 | 0.65 | Rest baseline medical appearance (`#D4A373` allocortex beige) |
| `HOVER` | `#38BDF8` (Sky Cyan) | 0.22 | 0.55 | Pointer hover preview |
| `SELECTED` | `#0EA5E9` (Vivid Blue) | 0.40 | 0.42 | Primary selected individual structure |
| `GROUP_SELECTED` | `#0284C7` (Cobalt Blue) | 0.28 | 0.48 | Member of an active group selection |
| `GHOSTED` | `#64748B` (Slate Gray) | 0.00 | 0.65 | Transparent context structure (opacity 0.12, depthWrite false) |
| `HIDDEN` | N/A | N/A | N/A | `mesh.visible = false` |

---

## 5. Aggregate Spatial Bounding Volumes

Camera framing, projection presets, and spatial queries operate on data-driven bounding volumes calculated on demand:
- **Entity Bounding Box:** Derived from runtime `mesh.geometry.boundingBox` transformed by `mesh.matrixWorld`, or fallback to canonical dimensions from metadata.
- **Group Bounding Box:** Computed as the spatial union ($\bigcup$) of all descendant entity bounding boxes.
- **Group Bounding Sphere:** Smallest enclosing sphere calculated from the aggregate bounding box.
- **Group Centroid:** Center point of the aggregate bounding box ($\frac{\min + \max}{2}$).

For the bilateral limbic system containing both Left Hippocampus ($X \approx -25\text{ mm}$) and Right Hippocampus ($X \approx +26\text{ mm}$), the group bounding box spans $X \in [-35.8, +35.8]\text{ mm}$, yielding an aggregate centroid at the neuroanatomical midline ($X \approx +0.66\text{ mm}$).

---

## 6. Multi-Asset Lifecycle, Caching & Error Isolation

`AssetManager` manages asset lifecycles through explicit states:
`NOT_LOADED` $\rightarrow$ `LOADING` $\rightarrow$ `LOADED` $\leftrightarrow$ `CACHED` $\rightarrow$ `UNLOADING` $\rightarrow$ `NOT_LOADED` (or `FAILED`).

### Key Invariants
1. **Reference Counting:** Multiple entities sharing or re-requesting an asset increment `refCounts`. Disposing an asset decrements the ref count; GPU buffer deallocation only occurs when the ref count reaches zero.
2. **Deterministic Error Isolation:** If an asset fails to fetch or decode (e.g. network failure or missing asset), its state transitions to `FAILED` and records `failureReasons`. Existing resident assets and the rendering loop remain completely stable without crashing.
3. **Raycast Filtering:** Raycasting ignores meshes where `visible === false` or any ancestor `visible === false`, preventing pointer interaction on hidden structures.

---

## 7. Independent Level of Detail (LOD) Management

Each anatomical structure maintains its own active LOD level (`lod0`, `lod1`, `lod2`, `lod3`).
- **Continuous Mode (`AUTO`):** Distances from camera to each entity centroid are evaluated independently per frame. Structure A may switch to LOD1 while Structure B remains at LOD0.
- **Manual Mode:** Individual structures can be forced to specific LODs via `setEntityLOD(entityId, level)` for high-resolution anatomical study.
- **Geometry Hot-Swapping:** Buffer geometries are swapped atomically without mutating transformation matrices, material bindings, or stereotaxic positions.

---

## 8. Provenance Lineage for Ingested Structures

| Metric | Left Hippocampus | Right Hippocampus | Validation Gate |
|---|---|---|---|
| **Entity ID** | `brain.telencephalon.left.limbic.hippocampus` | `brain.telencephalon.right.limbic.hippocampus` | Unique AAS Namespace |
| **Asset ID** | `mesh.hippocampus.left.v1` | `mesh.hippocampus.right.v1` | Cryptographic Manifest |
| **Upstream Dataset** | DBCLS BodyParts3D Release 3.0 | DBCLS BodyParts3D Release 3.0 | Academic Open Access |
| **Source Identifier** | FJ3162 (FMA61884) | FMA72713 | Authentic DBCLS Upstream |
| **Upstream License** | CC BY 4.0 | CC BY 4.0 | Fully Compliant |
| **Laterality** | Left ($X < 0$) | Right ($X > 0$) | Anatomically Validated |
| **Centroid (RAS)** | $[-25.07, -13.89, -20.70]\text{ mm}$ | $[+26.38, -13.89, -20.74]\text{ mm}$ | Bilaterally Symmetric |
| **Triangle Count (LOD0)**| 4,280 triangles | 4,452 triangles | 2-Manifold Watertight |
| **Volume** | $3.18\text{ cm}^3$ | $1.85\text{ cm}^3$ | In Vivo Range (1.8-3.8 cm³) |
