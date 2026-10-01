# Phase 9 Completion Report (clinical/study UI)

Registry: phase `9` — Clinical/study UI. Allowed scope kept:
`ui-components` (5 new panels + touch/responsive CSS only), `study-state`
(new `src/study/` module), `phase-tests` (`src/phase9_study.test.ts`),
`phase-docs` (this report + `PHASE_9_TOUCH_SUPPORT.md`).
No assets, manifests, structure/knowledge/psychiatry records, hierarchy
data, or `src/engine/` logic touched. No commit (per instruction).

## 1. Files created

- `src/study/studyStore.ts` — the SINGLE study-state store (notes keyed by
  structure id; saved views as `{camera pose, selection ids, clipping
  state}` + label flag; flashcard progress). localStorage-backed under one
  key (`neuro-atlas-3d.study.v1`), quota-failure grace, bounded sizes.
- `src/study/flashcards.ts` — cards ONLY from Phase 6 `data/knowledge/`
  usable claims (front: name/laterality prompt; back: verbatim claim +
  source + citation + evidence). Zero usable claims → explicit counted
  skip, never invention. Deck capped at 500.
- `src/study/quiz.ts` — self-test engine (free-text overlap grading +
  2-option verify against the record; verify-false items grounded in the
  record's own `gaps[]`; UNKNOWN where the layer has no claim;
  NOT_REPRESENTED where the record marks the topic absent). Score held in
  instance memory only — never persisted.
- `src/study/index.ts` — barrel (no state on import).
- `src/ui/NotesPanel.ts` — per-structure note editor (selection-injected,
  collapsible, disposes cleanly).
- `src/ui/FlashcardPanel.ts` — deck viewer (flip, prev/next, mark
  known/unknown into the store, skip counts surfaced).
- `src/ui/SavedViewsPanel.ts` — save/restore/delete via the store;
  capture/restore run through injected adapters (existing managers only).
- `src/ui/QuizPanel.ts` — start/answer (free-text + True/False)/reveal/
  next/restart with UNKNOWN and NOT_REPRESENTED as first-class UI states.
- `src/ui/StudyPanel.ts` — single composition point sharing ONE store;
  dispose cascades to all four sub-panels.
- `src/ui/atlas.css` (appended Phase 9 block ONLY) — study panel styling,
  `touch-action: none` canvas guard, coarse-pointer 44 px targets,
  `1024px` + `768px` responsive rules (bottom-sheet/collapsed; canvas
  never obscured by default).
- `src/phase9_study.test.ts` — 11 test groups (see §6).
- `docs/PHASE_9_TOUCH_SUPPORT.md` — touch-support notes.
- `package.json` — added `test:study9`; appended the suite to `test`.

## 2. Hard stops (all hold)

- **state-duplication**: exactly one `StudyStore` class; `getStudyStore()`
  singleton; panels receive the store by injection and construct none;
  zero engine imports in `src/study/` and the five panels (no second
  selection/bookmark/camera/label state). Asserted by import-graph scan +
  behavior (TEST 1, TEST 11).
- **unbounded-memory-ui**: `MAX_NOTES 200 / MAX_NOTE_CHARS 2000 /
  MAX_SAVED_VIEWS 30 / MAX_FLASHCARD_ENTRIES 500 / MAX_DECK_CARDS 500`;
  overflow evicts oldest-first or truncates, each with an explicit
  warning. Asserted (TEST 10).
- **lost-persistence**: every storage read/write is guarded; quota,
  unavailable, corrupt, and version-mismatch paths keep in-memory state
  and queue explicit warnings via `consumeWarnings()` — never silent
  loss. Asserted (TEST 2, TEST 8).
- No feature needed a second store, so no cuts were required.

## 3. Required evidence

- **state-separation**: study core imports zero engine modules, touches no
  DOM/fetch/Three.js (asserted by source scan); UI state flows one way
  (store → subscribe → render).
- **touch-support-notes**: `docs/PHASE_9_TOUCH_SUPPORT.md` + TEST 7
  assertions (tap-select, pinch-zoom, two-finger pan verified in
  `CameraManager`/`InteractionManager`, not rebuilt).
- **no-duplicate-systems**: TEST 11 scans all Phase 9 sources for any
  second bookmark/selection/camera/label system — zero found.

## 4. Depth-aware annotations (logic-verified only, no render proof)

Finding (downgraded per independent review — do NOT cite as rendering proof):
**no evidence of labels shining through at the logic level — no fix applied.**
Evidence is limited to code inspection: `LabelManager` backface culling
(`dot < -0.15`), section culling, distance LOD, and collision declutter; no
DOM/sprite label layer exists that could ignore depth. However, structure labels
registered without a `normalVector` skip the backface test, and NO raycast or
depth-buffer occlusion test exists anywhere — so true depth occlusion for structure
labels is UNVERIFIED and must not be claimed. A raycast/depth test is required
before any label layer is presented as depth-occluded.
- `MaterialManager`: opaque materials set `depthWrite: true, FrontSide`;
  only translucent cavity casts opt out (`depthWrite: false, DoubleSide`
  — deliberate so CSF spaces never read as solid tissue).
- Per the task constraint (fix ONLY if demonstrably shining through),
  zero engine/material changes were made. Asserted in TEST 7.

## 5. Wiring (host integration — existing managers only)

StudyPanel is MOUNTED in `src/main.ts` with fully wired capture/apply adapters
(camera pose, selection, clipping serialize, labels flag) through the existing
managers — no forks, no NULL adapters in production:

```ts
import { getStudyStore } from './study/studyStore';
import { generateDeck } from './study/flashcards';
import { questionFromCard, refusalQuestionForGap } from './study/quiz';
import { StudyPanel } from './ui/StudyPanel';

// Deck/questions built once from knowledge records (verified claims only).
const store = getStudyStore();
const study = new StudyPanel(appContainer, {
  store,
  getSelectedStructureId: () =>
    app.getAssemblyManager().getPrimarySelectedEntity()?.entityId ?? null,
  getDeck: () => deck.cards,
  getSkippedCount: () => deck.skipped.length,
  getQuestions: () => questions,
  viewAdapters: {
    captureCamera: () => {
      const p = app.getCameraManager().getCamera().position;
      const t = app.getCameraManager().getTarget();
      return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
    },
    captureSelection: () => ({
      selectedEntityId: app.getSelectionManager().getSelectedEntityId(),
    }),
    captureClipping: () => ({
      planes: app.getSectionPlaneSet().serialize(),
      presentation: app.getSectionPresentation().serialize(),
    }),
    captureLabelsEnabled: () => app.getLabelManager().getEnabled(),
    applyView: (view) => {
      if (view.camera) {
        app.getCameraManager().getCamera().position.set(...view.camera.position);
        // target restore via focus/controls target, then update
      }
      app.getSelectionManager().select(view.selection.selectedEntityId);
      if (view.clipping) {
        app.getSectionPlaneSet().deserialize(view.clipping.planes);
        app.getSectionPresentation().deserialize(view.clipping.presentation);
        app.resyncClipping();
      }
      app.getLabelManager().setEnabled(view.labelsEnabled);
    },
  },
});
```

## 6. Verification (observed)

- `npm.cmd run typecheck` — exit 0, 0 errors.
- `npm.cmd test` — exit 0, all 23 suites green (22 pre-existing +
  `src/phase9_study.test.ts`; pre-existing suites untouched, zero count
  bumps — no new structures).
- `npm.cmd run build` — exit 0.
- `npm.cmd run audit:phase1` — PASS.
- Phase 9 suite: 11 groups, all passing (single-store invariant, notes
  CRUD + quota grace, verified-claims-only flashcards, quiz verdicts +
  session-only score, saved-view round-trip via existing serializers,
  panel dispose with zero listener leak, touch/depth notes, corrupt
  persistence grace, package wiring, bounded memory, no-duplicate-systems).

## 7. Limitations (explicit)

- Touch/responsive claims are `AUTOMATED_TEST_VALIDATION` only — no
  browser or physical-device validation claimed (see touch notes §4).
- Quiz free-text grading is a deterministic token-overlap heuristic for
  self-study, not an assessment instrument.
- Label depth verdict is logic-level; on-screen label rendering remains
  future work that must reuse `LabelManager` (no second label system).
