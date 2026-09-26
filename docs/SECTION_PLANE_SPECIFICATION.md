# Section-Plane Specification (Phase 3.2, Gate 2 — SPECIFICATION ONLY)

**Status:** mathematical model DEFINED and unit-tested (`src/engine/sectionPlanes.ts`).
No clipping renderer, no MRI viewer, no UI — Phase 4 work, explicitly out of scope.

## 1. Coordinate model

All planes live in the INTERNAL canonical space (millimeters, right-handed):
+X Right, +Y Superior, +Z POSTERIOR (Phase 3.1 D3 — NOT RAS, NOT MNI).
No MNI/Talairach/FreeSurfer/HCP assumption anywhere in this spec.

## 2. Mathematical definition

Plane: **n · (p − p₀) = 0**, with n normalized (‖n‖ = 1), p₀ a point on the plane,
p the point under test. Signed distance: **d(p) = n · (p − p₀)**.
Clipping semantics: RETAIN the half-space **d(p) ≥ −ε** (points ON the plane kept);
CULL **d(p) < −ε**. ε = 1e-6 mm (float32-safe; mesh extents are O(10²) mm).
Which side is retained is part of every plane record (`retainedSide: '+n' | '-n'`);
a plane without it is INVALID.

## 3. Standard planes (verified against measured axes — §6)

| Anatomical plane | Divides | Normal n | Constant | Retained side (convention) |
|---|---|---|---|---|
| SAGITTAL | left/right | (±1, 0, 0) | **X = c** | viewer picks hemisphere |
| CORONAL | anterior/posterior | (0, 0, ±1) | **Z = c** (NOT Y — Y is Superior here) | viewer picks front/back |
| AXIAL (horizontal) | superior/inferior | (0, ±1, 0) | **Y = c** (NOT Z — Z is Posterior here) | viewer picks top/bottom |

⚠️ The naive RAS mapping (coronal→Y, axial→Z) is WRONG for this repository and must
never be used: frontal chunks sit at LOW Z, occipital at HIGH Z; superior is +Y.

## 4. Oblique planes

Arbitrary unit normal + origin point. Normalization enforced at construction
(non-unit input normalized; zero vector REJECTED). Composition of plane + camera
orientation is Phase 4 work.

## 5. Numerical tolerances & precision

- ε (on-plane retention): 1e-6 mm. Coordinates stored float32 in GLBs (~7 decimal
digits; mesh extents ±170 mm → resolution ~1e-5 mm, so ε sits below signal but
above float noise for dot products — documented assumption, recheck if extents change).
- Degenerate inputs (zero normal, NaN, non-finite) must be rejected, never silently
defaulted (module throws/returns invalid flag; tests pin this).

## 6. Future MRI compatibility (design constraints, NOT implementation)

- Plane math is volume-agnostic: same (n, p₀, ε) applies to mesh vertices, voxel
centers, parcel centroids, annotation points. No imaging library added (§7 compliant).
- Future MRI volumes MUST carry their own verified voxel→canonical transform before
any plane is applied to them; planes never imply registration.
- Future parcellation overlays: parcels are labels on coordinates, clipped by the
same predicate; parcel ≠ structure (§13 compat verified separately).

## 7. Future annotation compatibility

Anchors from `CEREBRAL_LANDMARKS` are SCHEMATIC — planes must never be *defined* by
unvalidated anchors (e.g. "plane through calcarine anchor") until that anchor
reaches GEOMETRICALLY-LOCATED. Plane origins must be explicit numbers with provenance.
