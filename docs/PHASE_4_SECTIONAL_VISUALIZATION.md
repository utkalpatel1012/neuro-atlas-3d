# Phase 4A Sectional Visualization (mesh-based anatomical sectioning)

**Status:** implemented, headless-tested, device-UNVERIFIED. No MRI, no parcellation,
no psychiatry overlays. Cut surfaces render hollow: `SECTION_CAPS_PENDING`.

## Architecture

```
SectionPlaneSet (application state, outside renderer)
  │ onChange(version) — fires ONLY on state change, never per frame
  ▼
ClippingAdapter (single bridge, no renderer branches)
  │ stable THREE.Plane pool (mutated in place) + ONE shared plane array
  ▼
entity materials (per-entity MeshStandardMaterial.clippingPlanes = shared array)
  + renderer.localClippingEnabled (guarded; set only where exposed)
  + PlaneHelper gizmos (cyan, hideable, never tissue)
```

State → adapter → materials. Renderer recreation re-reads application state
(`resyncClipping()`), so GPU loss cannot lose planes (§21–23).

## Plane mathematics

`src/engine/sectionPlanes.ts` (extended, no competing implementation):
n·(p−p₀)=0, retained d≥−ε (ε=1e-6 mm), degenerate inputs rejected, inversion =
retainedSide flip, `toThreePlane` maps retained '+n' to three.js keep-side
(constant = −n·p₀). Standard kinds in CANONICAL axes: sagittal→X, coronal→Z,
axial→Y (spec §6 verified; the RAS coronal→Y/axial→Z mapping is wrong here).

## Coordinate conventions

Canonical (+X R, +Y S, +Z Posterior, mm). UI readout shows coordinates only
("SAGITTAL · X = 12.4 mm"); the sole annotation is "(midline)" at sagittal X=0
exactly — the repo's defined midline. No lobe/region inference (§17).

## Renderer integration

- WebGL2: material.clippingPlanes + guarded localClippingEnabled. Headless tests
prove state transfer (exact plane values on materials); rasterization UNVERIFIED.
- WebGPU: code-identical path (three r186 implements clipping in WebGPU build);
DEVICE-UNVERIFIED. No WebGPU-only code exists.
- Multi-plane: 0–3+ planes as intersection of half-spaces via GPU clipping; order
deterministic (store insertion order); no Boolean mesh ops ever.

## Multi-plane behavior

Planes compose by intersection. Enable/disable per plane + reset to neutral
defaults (origin, disabled). Serialization round-trips the full set.

## LOD interaction

Clipping lives on materials, not geometries: `applyLOD` swaps geometry on the same
mesh/material, so clipping persists across LOD0–3 (tested). LOD ref-balance fix
(TEST 11) holds; switches add no clipping work.

## BVH interaction

Raycasting (three.js + three-mesh-bvh) tests ORIGINAL geometry and ignores GPU
clipping — pinned by test. Consequence: selection may resolve an entity clipped
from view. Entity ID, metadata, provenance never change under clipping (tested).
BVHs are never rebuilt for clipping (no per-frame CPU slicing, ever).

## Performance strategy

No per-frame clipping work exists: sync on state change only; moves mutate plane
values in place (no recompile — version-pinned in test); set changes mark
needsUpdate once; shared array (no per-material clones, no per-frame allocation).
100-move stress bounded in-test. Measured FPS: NOT MEASURED (headless).

## Lifecycle/disposal

Adapter owns no DOM/canvas listeners (store subscription only, unsubscribed on
dispose). dispose() clears material planes, removes + disposes all gizmos, empties
pool, unbinds. Reload path (`reloadAllMeshes` → `resyncClipping`) re-registers
fresh materials. Full context/device recovery remains PARTIAL per prior audits —
clipping state itself survives as application state by construction.

## Known limitations (Phase 4A)

- Cut interiors render HOLLOW (`SECTION_CAPS_PENDING`) — no disks, no fake solids.
- Incomplete dataset clips as-is; absent structures are absent, never substituted.
- Grazing-incidence rays can slip between adjacent triangles (observed in testing);
edge-watertight ≠ pinhole-free at grazing angles — relevant to future cap work.
- Labels/gizmos are orientation aids, not anatomy; anchors remain schematic.
- No browser/device testing; no iPad/WebGPU proof; UI is functional, unpolished.

## Future MRI compatibility

Plane math is volume-agnostic (applies to voxel centers when MRI arrives). MRI
volumes will need their own verified voxel→canonical transform first; planes never
imply registration. Parcellation overlays clip as label sets under the same
predicate (parcel ≠ structure preserved).
