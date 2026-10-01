# Phase 9 Scope (clinical/study UI)

## Objective (registry)

Annotations, labels, depth-aware occlusion, responsive desktop/tablet UI, iPad
touch, bookmarks, notes, flashcards, saved views, quiz integration. No duplicated
state systems.

## What already exists (reuse, do not rebuild)

Bookmarks (`sectionBookmarks`), labels (`LabelManager`), selection
(`SelectionManager`), camera (`CameraManager`), section planes + presets, search
panel, info panel, hierarchy panel with load-all, cavity translucency. Phase 9 adds
the missing resident-facing layer on top of these systems, never beside them.

## New in Phase 9

- **Notes**: per-structure resident notes, stored in a single study-state store
  (localStorage-backed), surfaced in the info panel. Plain text only; no clinical
  interpretation prompts.
- **Flashcards**: generated ONLY from Phase 6 verified knowledge claims (front:
  structure prompt; back: typed claim + source). Anything without a verified claim
  produces no card (refusal, not invention).
- **Saved views**: camera pose + selection + clipping snapshot via existing
  managers, restorable in one click.
- **Quiz integration**: self-test mode — question from verified claims, answer
  checked against the record, UNKNOWN/NOT REPRESENTED where the layer has no claim.
  Never invents distractors from unverified content.
- **Touch + responsive**: iPad-usable touch controls (tap select, pinch zoom,
  two-finger pan via existing controls), responsive layout holding at tablet widths.
- **Depth-aware annotations**: labels occlude correctly with depth (no labels
  shining through structures); annotation placement reuses the label pipeline.

## Hard stops (registry)

State-duplication (any second bookmark/selection/camera/label store),
unbounded-memory UI (bounded lists, disposal on close), lost persistence (graceful
localStorage failure, never silent data loss).

## Out of scope

Offline (Phase 10), AI tutor (Phase 11), new anatomy, new knowledge claims.
