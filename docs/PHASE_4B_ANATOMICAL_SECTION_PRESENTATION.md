# Phase 4B Anatomical Section Presentation (educational layer over Phase 4A)

**Status:** implemented, headless-tested, device-UNVERIFIED. No MRI, no
registration, no parcellation, no psychiatry overlays. Phase 4A clipping is
untouched (single implementation; extended only by wiring).

## Architecture

```
SectionPlaneSet (geometry state: planes, enable, invert, constants)
  │ onChange(version) — event-driven, never per frame
  ▼
SectionPresentation (presentation state: mode, gizmo, edges, interior,
│                     labels, orientation, readout, crosshair, visual mode)
  ▼
ClippingAdapter (GPU clipping, Phase 4A unchanged)
+ SectionCapsManager (derived caps/edges from mesh∩plane, bounded cache)
+ LabelManager section filter + VisibilityManager (independent states)
+ CameraManager focus (focusVisibleSection scans retained verts on demand)
```

`src/engine/sectionPresentation.ts` — presentation state, canonical readouts,
orientation math, data-driven ranges, honest stats.
`src/engine/sectionPresets.ts` — 7 educational presets (explicit canonical
numbers; names imply no registration).
`src/engine/sectionBookmarks.ts` — logical-state bookmarks (no geometry/GPU).
`src/engine/SectionCaps.ts` — TRUE derived caps/edges with safe fallbacks.
`src/ui/SectionPresentationPanel.ts` — orientation, readout, presets, stats,
neutral empty message, focus-visible (browser only; logic headless-tested).

## Section presentation state

`sectionModeEnabled, activePlaneId, gizmoVisible, cutEdgeVisible,
interiorMode (TRUE_CAP_WHERE_VALID | EDGE_ONLY | NO_CAP), labelsEnabled,
orientationVisible, readoutVisible, crosshairVisible,
visualMode (NORMAL_SECTION | SECTION_EDGE | SECTION_GHOST | SECTION_FOCUS),
capsVisible, edgesVisible`. Versioned, serializable (v1), deterministic
round-trip. Separate from entity records — never an entity ID.

## Cut-edge/cap strategy (§5-§8)

Per mesh per enabled plane: triangles × plane → segments (consistent
per-triangle rule: 3-on-plane = coplanar-skip; 2-on-plane = skip; 1-on-plane +
opposite crossing = segment; 0-on-plane sign-split = segment) → stitch with
1e-4 mm quantization → closed loops (earcut after dropping the dominant-normal
axis, lifted EXACTLY onto the plane) + open polylines (edges only).

- A: TRUE DERIVED SECTION SURFACE — only from actual intersections; flat unlit
  amber, DoubleSide, `derivedSectionSurface: true`, NO entityId, NO provenance.
- B: SECTION EDGE ONLY — slate lines for open/grazing/disconnected leftovers.
- C: NO CAP — hollow (misses, triangulation failures → null, never fake).
- Nested-loop holes NOT resolved (documented): loops triangulate
  independently; donut overfill possible.
- Cache key = assetId + LOD + planeId + quantized plane (0.5 mm threshold =
  movement threshold); retained side excluded (intersection set is
  side-independent). Bounded LRU (12), explicit geometry disposal.
- Event-driven recompute only (plane change / mesh / LOD / visibility);
  slider moves ride Phase 4A GPU clipping; caps refresh on change events.

## Labeling (§14-§15)

`LabelManager.setSectionFilter + setEntityVisibilityProvider`: fully-clipped
entities hide labels; partially-visible keep labels only when the anchor
itself is retained (no invented anchors; schematic status unchanged).
Section culling runs BEFORE projection so labels never float over empty cuts.
Filter failure fails open. `isCulledBySection` flag recorded per label.

## Selection (§16) / Focus (§17) / Isolation (§18)

- Selection resolves the ORIGINAL entity (picking filter from 4A unchanged;
  no fragment/section IDs; entity→asset→provenance path intact).
- `focusVisibleSection(entityId)`: bounded vertex scan (≤2000 samples) of
  retained fragments → frame retained bbox; fully-clipped → false (caller
  shows the neutral empty message). `focusEntity()` unchanged when no planes.
- Isolation (VisibilityManager) independent of clipping: isolate + clip
  compose; visibility state never mutates plane state.

## Bookmarks (§20) / Serialization (§21)

Bookmark v1 = planes (SerializedPlaneSet) + presentation + camera
(position/target) + selected/isolated/hidden + labelsEnabled. No geometry,
no Three.js/GPU/material/Object3D. `serializeBookmark` sorts hidden IDs for
determinism; `state → serialize → deserialize → equivalent` tested.

## Performance (§31-§32) / Resource ownership (§35)

No per-frame section work by construction (version-gated sync, in-place plane
mutation, event-driven caps). Caps share two materials (no clones); geometries
disposed on evict/clear/dispose; plane moves below 0.5 mm quantization hit the
cache. Memory: caps add ≤12 small derived geometries; budget line stays within
the 110 MB iPad discipline (no new textures, no volume data).

## Renderer compatibility (§36) / Context loss (§37)

- WebGL2: clippingPlanes + guarded localClippingEnabled (4A path).
- WebGPU: code-identical material path (three r186); DEVICE-UNVERIFIED.
- Caps/edges are plain meshes/lines with clippingPlanes assigned — no
  WebGPU-only code; a renderer without clipping support simply shows
  unclipped geometry + derived aids (documented fallback).
- Context loss: planes + presentation + selection/visibility/labels are
  application state; `resyncClipping()` + `refreshSectionDerivatives()`
  rebuild GPU state from it. No GPU objects persisted.

## Accessibility (§38) / Language (§39, §9, §12, §26)

Controls have aria-labels; plane state has text equivalents (readout,
orientation summary, stats, empty message). No visual-only understanding.
No diagnostic/surgical/lesion language. Empty sections: "No validated
anatomical geometry intersects this plane." Context note: "Only validated
structures currently included in the atlas are displayed." Coordinates only
("SAGITTAL · X = 12.4 mm · Retained: +normal"); "(midline)" solely at X = 0.

## Limitations (new in 4B; see KNOWN_ANATOMICAL_LIMITATIONS L15)

- Caps are diagrammatic aids (amber flats), not tissue; donut overfill
  possible; grazing seams can break loops (edges shown instead).
- Orientation indicator follows camera math, not anatomy; anchors schematic.
- No browser/device/iPad proof (headless environment); UI functional.
- Presets are explicit numbers, not registered anatomy.
