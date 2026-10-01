/**
 * 3D Neuroanatomy Atlas: Phase 9 study module barrel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Re-exports the single study-state store, the verified-claims-only
 * flashcard generator, and the in-session quiz engine. Importing this
 * barrel creates no state: the one shared store is created lazily via
 * getStudyStore().
 */

export {
  StudyStore,
  getStudyStore,
  resetStudyStoreForTests,
  STUDY_STORAGE_KEY,
  STUDY_STATE_VERSION,
  MAX_NOTES,
  MAX_NOTE_CHARS,
  MAX_SAVED_VIEWS,
  MAX_VIEW_LABEL_CHARS,
  MAX_FLASHCARD_ENTRIES,
} from './studyStore';
export type {
  NoteRecord,
  CameraPoseSnapshot,
  ClippingSnapshot,
  SavedView,
  SavedViewInput,
  SavedViewSelection,
  CardMark,
  FlashcardProgressEntry,
  PersistenceStatus,
  StudyStoreListener,
  StorageLike,
  MutationResult,
} from './studyStore';

export {
  generateFlashcards,
  generateDeck,
  isUsableClaim,
  MAX_DECK_CARDS,
} from './flashcards';
export type { Flashcard, SkippedStructure, DeckBuildResult } from './flashcards';

export {
  QuizEngine,
  questionFromCard,
  questionForRecord,
  refusalQuestionForGap,
  gradeFreeText,
  gradeVerify,
} from './quiz';
export type { QuizVerdict, QuizMode, QuizQuestion, QuizScore } from './quiz';
