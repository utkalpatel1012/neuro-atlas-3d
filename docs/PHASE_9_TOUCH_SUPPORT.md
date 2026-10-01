# Phase 9 Touch Support Notes (clinical/study UI)

Scope: iPad / tablet touch for the neuro-atlas viewer + Phase 9 study panels.
Status: `AUTOMATED_TEST_VALIDATION` only (headless source + CSS assertions in
`src/phase9_study.test.ts` TEST 7). No physical-device validation is claimed:
tablet/phone behavior remains a TARGET until measured on hardware
(`PHYSICAL_DEVICE_VALIDATION` PENDING).

## 1. Verified (not rebuilt)

Phase 9 adds no input system. The existing pipeline already covers touch:

| Requirement | Existing mechanism | Source |
|---|---|---|
| Tap-select | `InteractionManager` unified `PointerEvent`s (`pointerdown`/`pointerup`); taps < 5 px radius select, drags orbit | `src/engine/InteractionManager.ts` (`dragDistanceSq < 25`) |
| 1-finger orbit | `OrbitControls` touch map `ONE: THREE.TOUCH.ROTATE` | `src/engine/CameraManager.ts` `setupControls` |
| Pinch-zoom | `OrbitControls` touch map `TWO: THREE.TOUCH.DOLLY_PAN` (dolly half) | `src/engine/CameraManager.ts` |
| Two-finger pan | Same `TWO: DOLLY_PAN` mapping (pan half) | `src/engine/CameraManager.ts` |
| Gesture stream | `touch-action: none` on the canvas so the OS delivers raw touch to the controls | `src/ui/atlas.css` (Phase 9 block) |

Because tap-select flows through the same `onSelect` path as mouse clicks,
Phase 9 panels that read selection (`NotesPanel` via
`getSelectedStructureId`) work with touch taps with no panel-side changes.

## 2. Phase 9 panel touch rules

- Panels are separate DOM layers; they never overlay the canvas by default
  (every study body ships `hidden` until its toggle is pressed), so panel
  hit areas cannot swallow orbit/pinch gestures.
- Coarse-pointer rule (`@media (pointer: coarse)`): study buttons get 44 px
  minimum tap targets; text inputs render at 1 rem to avoid iOS focus zoom.
- Note textareas set `user-select: text` so resident notes remain
  editable/selectable on touch keyboards.

## 3. Responsive breakpoints (verified in CSS)

- `1024px`: info panel narrows to 300 px, hierarchy to 260 px, saved-view
  list caps at 160 px — canvas stays usable at tablet widths.
- `768px`: study panels become a collapsed bottom sheet (full-width,
  `max-height: 40vh`, above the controls bar); info/hierarchy panels cap
  their heights. Nothing covers the canvas until the user expands a panel.

## 4. Not claimed

- No FPS, latency, or gesture-precision measurements on any tablet.
- No `PHYSICAL_DEVICE_VALIDATION`; an iPad pass is required before any
  device claim (feeds Phase 12).
- If touch testing reveals a second input store is needed, the feature is
  CUT per the state-duplication hard stop — no parallel gesture state.
