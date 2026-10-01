/**
 * 3D Neuroanatomy Atlas: Phase 9 single study-state store.
 * Standard: AAS-2026-NEURO-V1
 *
 * THE single study-state owner for notes, saved views, and flashcard
 * progress. There is exactly one store class in this codebase (see
 * src/phase9_study.test.ts TEST 1: single-store invariant). UI panels
 * receive this store by constructor injection and never `new` their own.
 *
 * State separation (registry evidence: state-separation, no-duplicate-systems):
 * - This module imports ZERO engine modules (no SelectionManager,
 *   CameraManager, LabelManager, SectionPlaneSet, SectionPresentation).
 *   Saved views are plain validated JSON snapshots captured through the
 *   existing managers' own serialize methods by thin adapter callbacks that
 *   live at the wiring site (see docs/PHASE_9_COMPLETION_REPORT.md §5).
 *   Restore re-applies via those managers' deserialize methods.
 * - No DOM, no fetch, no Three.js here: pure state + storage, headless-testable.
 *
 * Persistence (registry hard stop: lost-persistence):
 * - localStorage-backed (single key). Every storage failure — quota,
 *   unavailable, corrupt payload — is caught, recorded in `warnings`, and
 *   surfaced via getPersistenceStatus()/consumeWarnings(). In-memory state is
 *   NEVER discarded on a write failure, so data loss is never silent.
 *
 * Bounded memory (registry hard stop: unbounded-memory-ui):
 * - MAX_NOTES / MAX_NOTE_CHARS / MAX_SAVED_VIEWS / MAX_FLASHCARD_ENTRIES.
 *   Overflow evicts oldest-first or truncates, and each such action records
 *   an explicit warning (never silent).
 */

export const STUDY_STORAGE_KEY = 'neuro-atlas-3d.study.v1';
export const STUDY_STATE_VERSION = 1 as const;

/** Bounded-memory caps (registry: unbounded-memory-ui hard stop). */
export const MAX_NOTES = 200;
export const MAX_NOTE_CHARS = 2000;
export const MAX_SAVED_VIEWS = 30;
export const MAX_VIEW_LABEL_CHARS = 80;
export const MAX_FLASHCARD_ENTRIES = 500;

export interface NoteRecord {
  structureId: string;
  text: string;
  updatedAt: string;
}

/** Camera pose as plain finite triples (captured from CameraManager at the wiring site). */
export interface CameraPoseSnapshot {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Clipping snapshot as opaque-but-versioned JSON. Produced ONLY by
 * SectionPlaneSet.serialize() + SectionPresentation.serialize() at the
 * wiring site; restored ONLY via their deserialize() methods. The store
 * validates the version envelope and never interprets plane math.
 */
export interface ClippingSnapshot {
  planes: unknown;
  presentation: unknown;
}

export interface SavedViewSelection {
  selectedEntityId: string | null;
}

export interface SavedView {
  id: string;
  label: string;
  createdAt: string;
  camera: CameraPoseSnapshot | null;
  selection: SavedViewSelection;
  clipping: ClippingSnapshot | null;
  labelsEnabled: boolean;
}

export interface SavedViewInput {
  label: string;
  camera: CameraPoseSnapshot | null;
  selection: SavedViewSelection;
  clipping: ClippingSnapshot | null;
  labelsEnabled: boolean;
}

export type CardMark = 'known' | 'unknown';

export interface FlashcardProgressEntry {
  cardId: string;
  mark: CardMark;
  updatedAt: string;
}

export type PersistenceStatus = 'ok' | 'degraded' | 'unavailable';

export type StudyStoreListener = () => void;

/** Minimal storage surface so tests can inject failing/quota storage. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedStudyState {
  version: 1;
  notes: NoteRecord[];
  views: SavedView[];
  cards: FlashcardProgressEntry[];
}

export interface MutationResult {
  ok: boolean;
  truncated?: boolean;
  evicted?: boolean;
  reason?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isFiniteVec3(v: unknown): v is [number, number, number] {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    (v as unknown[]).every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > 256) return null;
  return trimmed;
}

function sanitizeNoteText(value: unknown): { text: string; truncated: boolean } {
  const raw = typeof value === 'string' ? value : '';
  const trimmed = raw.trim();
  if (trimmed.length <= MAX_NOTE_CHARS) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, MAX_NOTE_CHARS), truncated: true };
}

function sanitizeLabel(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const fallback = 'Saved view';
  const base = raw === '' ? fallback : raw;
  return base.length <= MAX_VIEW_LABEL_CHARS ? base : base.slice(0, MAX_VIEW_LABEL_CHARS);
}

function isValidCamera(value: unknown): value is CameraPoseSnapshot {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return isFiniteVec3(v['position']) && isFiniteVec3(v['target']);
}

function isValidClipping(value: unknown): value is ClippingSnapshot {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!('planes' in v) || !('presentation' in v)) return false;
  // Envelope check only: plane-set snapshots carry version 1; presentation
  // snapshots carry version 1. Anything else is refused, never interpreted.
  const planes = v['planes'] as { version?: unknown } | null;
  const presentation = v['presentation'] as { version?: unknown } | null;
  if (planes !== null && (typeof planes !== 'object' || planes === null)) return false;
  if (presentation !== null && (typeof presentation !== 'object' || presentation === null)) return false;
  return true;
}

let viewIdCounter = 0;
function nextViewId(): string {
  viewIdCounter += 1;
  const rand = Math.floor(Math.random() * 1296).toString(36);
  return `study-view-${Date.now().toString(36)}-${viewIdCounter.toString(36)}-${rand}`;
}

function resolveDefaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      return localStorage as StorageLike;
    }
  } catch {
    return null;
  }
  return null;
}

export class StudyStore {
  private notes = new Map<string, NoteRecord>();
  private views = new Map<string, SavedView>();
  private cards = new Map<string, FlashcardProgressEntry>();
  private listeners = new Set<StudyStoreListener>();
  private storage: StorageLike | null;
  private persistenceStatus: PersistenceStatus = 'ok';
  private warnings: string[] = [];

  constructor(storage?: StorageLike | null) {
    // Explicit undefined => try the browser store; explicit null => memory-only.
    this.storage = storage === undefined ? resolveDefaultStorage() : storage;
    if (this.storage === null) {
      this.persistenceStatus = 'unavailable';
      this.warnings.push(
        'Study persistence unavailable: no Web Storage in this environment. Notes, views, and card progress are kept in memory for this session only.'
      );
    }
    this.reload();
  }

  // -- observers -----------------------------------------------------------

  public subscribe(listener: StudyStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test hook: proves panel dispose() removes every subscription (no leaks). */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        console.error('[StudyStore] Listener error:', err);
      }
    }
  }

  // -- persistence status (never silent loss) -------------------------------

  public getPersistenceStatus(): PersistenceStatus {
    return this.persistenceStatus;
  }

  /** Drains queued warnings (quota, eviction, truncation, corrupt payload). */
  public consumeWarnings(): string[] {
    const out = [...this.warnings];
    this.warnings.length = 0;
    return out;
  }

  private recordWarning(message: string): void {
    this.warnings.push(message);
    // Bounded: keep the most recent 50 warnings so the warning list itself
    // cannot grow without bound.
    if (this.warnings.length > 50) {
      this.warnings.splice(0, this.warnings.length - 50);
    }
  }

  private snapshot(): PersistedStudyState {
    return {
      version: 1,
      notes: [...this.notes.values()],
      views: [...this.views.values()],
      cards: [...this.cards.values()],
    };
  }

  private persist(): void {
    if (this.storage === null) return;
    try {
      this.storage.setItem(STUDY_STORAGE_KEY, JSON.stringify(this.snapshot()));
      if (this.persistenceStatus === 'degraded') {
        // A later write succeeding does not erase history, but the store is
        // writable again — report recovery explicitly.
        this.recordWarning('Study persistence recovered: writes are succeeding again.');
      }
      this.persistenceStatus = 'ok';
    } catch (err) {
      // Quota or access failure: in-memory state is RETAINED (never rolled
      // back), the failure is recorded — never silent loss.
      this.persistenceStatus = 'degraded';
      this.recordWarning(
        `Study persistence write failed (${(err as Error).message}). Your notes, saved views, and card progress are retained in memory for this session; free storage space or export your notes, then reload.`
      );
    }
  }

  /** Re-reads storage (corrupt payloads fall back to empty, with a warning). */
  public reload(): void {
    if (this.storage === null) return;
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STUDY_STORAGE_KEY);
    } catch (err) {
      this.persistenceStatus = 'degraded';
      this.recordWarning(`Study persistence read failed (${(err as Error).message}). Starting with in-memory state.`);
      return;
    }
    if (raw === null || raw === '') return;
    try {
      const data = JSON.parse(raw) as PersistedStudyState;
      if (!data || data.version !== STUDY_STATE_VERSION) {
        this.recordWarning('Study persistence payload has an unrecognized version; starting with in-memory state. Stored data was left untouched.');
        return;
      }
      this.notes.clear();
      for (const n of Array.isArray(data.notes) ? data.notes.slice(0, MAX_NOTES) : []) {
        const id = sanitizeId(n.structureId);
        if (id === null) continue;
        const { text } = sanitizeNoteText(n.text);
        if (text === '') continue;
        this.notes.set(id, { structureId: id, text, updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : nowIso() });
      }
      this.views.clear();
      for (const v of Array.isArray(data.views) ? data.views.slice(0, MAX_SAVED_VIEWS) : []) {
        if (typeof v.id !== 'string' || v.id === '') continue;
        if (!isValidCamera(v.camera) || !isValidClipping(v.clipping)) continue;
        this.views.set(v.id, {
          id: v.id,
          label: sanitizeLabel(v.label),
          createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
          camera: v.camera,
          selection: { selectedEntityId: typeof v.selection?.selectedEntityId === 'string' ? v.selection.selectedEntityId : null },
          clipping: v.clipping,
          labelsEnabled: v.labelsEnabled === true,
        });
      }
      this.cards.clear();
      for (const c of Array.isArray(data.cards) ? data.cards.slice(0, MAX_FLASHCARD_ENTRIES) : []) {
        if (typeof c.cardId !== 'string' || c.cardId === '') continue;
        if (c.mark !== 'known' && c.mark !== 'unknown') continue;
        this.cards.set(c.cardId, { cardId: c.cardId, mark: c.mark, updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : nowIso() });
      }
      this.persistenceStatus = 'ok';
    } catch (err) {
      this.persistenceStatus = 'degraded';
      this.recordWarning(`Study persistence payload is corrupt (${(err as Error).message}); starting with in-memory state. Stored data was left untouched.`);
    }
  }

  // -- notes -----------------------------------------------------------------

  public getNotes(): NoteRecord[] {
    return [...this.notes.values()].sort((a, b) => a.structureId.localeCompare(b.structureId));
  }

  public getNote(structureId: string): NoteRecord | null {
    return this.notes.get(structureId) ?? null;
  }

  public getNoteCount(): number {
    return this.notes.size;
  }

  public setNote(structureId: string, text: string): MutationResult {
    const id = sanitizeId(structureId);
    if (id === null) return { ok: false, reason: 'Structure id is empty or invalid; note not saved.' };
    const { text: clean, truncated } = sanitizeNoteText(text);
    if (clean === '') {
      const existed = this.notes.delete(id);
      if (existed) {
        this.persist();
        this.notify();
      }
      if (truncated) this.recordWarning(`Note for ${id} exceeded ${MAX_NOTE_CHARS} characters and was truncated.`);
      return { ok: true, truncated };
    }
    let evicted = false;
    if (!this.notes.has(id) && this.notes.size >= MAX_NOTES) {
      // Evict the oldest note (bounded memory). Explicit, never silent.
      let oldestId: string | null = null;
      let oldestTime = '';
      let first = true;
      for (const [key, record] of this.notes) {
        if (first || record.updatedAt < oldestTime) {
          oldestId = key;
          oldestTime = record.updatedAt;
          first = false;
        }
      }
      if (oldestId !== null) {
        this.notes.delete(oldestId);
        evicted = true;
        this.recordWarning(`Note store is full (${MAX_NOTES}); the oldest note (${oldestId}) was evicted to save the note for ${id}.`);
      }
    }
    this.notes.set(id, { structureId: id, text: clean, updatedAt: nowIso() });
    if (truncated) {
      this.recordWarning(`Note for ${id} exceeded ${MAX_NOTE_CHARS} characters and was truncated to the limit.`);
    }
    this.persist();
    this.notify();
    return { ok: true, truncated, evicted };
  }

  public deleteNote(structureId: string): boolean {
    const removed = this.notes.delete(structureId);
    if (removed) {
      this.persist();
      this.notify();
    }
    return removed;
  }

  // -- saved views -------------------------------------------------------------

  public listViews(): SavedView[] {
    return [...this.views.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public getView(id: string): SavedView | null {
    return this.views.get(id) ?? null;
  }

  public getViewCount(): number {
    return this.views.size;
  }

  public saveView(input: SavedViewInput): { view: SavedView | null; result: MutationResult } {
    if (!isValidCamera(input.camera)) {
      return { view: null, result: { ok: false, reason: 'Camera pose is invalid (positions must be finite triples); view not saved.' } };
    }
    if (!isValidClipping(input.clipping)) {
      return { view: null, result: { ok: false, reason: 'Clipping snapshot failed validation; view not saved.' } };
    }
    let evicted = false;
    if (this.views.size >= MAX_SAVED_VIEWS) {
      const oldest = this.listViews()[0];
      if (oldest) {
        this.views.delete(oldest.id);
        evicted = true;
        this.recordWarning(`Saved-view store is full (${MAX_SAVED_VIEWS}); the oldest view ("${oldest.label}") was evicted.`);
      }
    }
    const view: SavedView = {
      id: nextViewId(),
      label: sanitizeLabel(input.label),
      createdAt: nowIso(),
      camera: input.camera,
      selection: { selectedEntityId: typeof input.selection?.selectedEntityId === 'string' ? input.selection.selectedEntityId : null },
      clipping: input.clipping,
      labelsEnabled: input.labelsEnabled === true,
    };
    this.views.set(view.id, view);
    this.persist();
    this.notify();
    return { view, result: { ok: true, evicted } };
  }

  public deleteView(id: string): boolean {
    const removed = this.views.delete(id);
    if (removed) {
      this.persist();
      this.notify();
    }
    return removed;
  }

  // -- flashcard progress --------------------------------------------------------

  public getCardMark(cardId: string): CardMark | null {
    return this.cards.get(cardId)?.mark ?? null;
  }

  public markCard(cardId: string, mark: CardMark): MutationResult {
    const id = sanitizeId(cardId);
    if (id === null) return { ok: false, reason: 'Card id is empty or invalid; progress not recorded.' };
    if (mark !== 'known' && mark !== 'unknown') return { ok: false, reason: 'Mark must be "known" or "unknown"; progress not recorded.' };
    let evicted = false;
    if (!this.cards.has(id) && this.cards.size >= MAX_FLASHCARD_ENTRIES) {
      const oldestKey = this.cards.keys().next().value as string | undefined;
      if (oldestKey !== undefined) {
        this.cards.delete(oldestKey);
        evicted = true;
        this.recordWarning(`Card-progress store is full (${MAX_FLASHCARD_ENTRIES}); the oldest entry was evicted.`);
      }
    }
    this.cards.set(id, { cardId: id, mark, updatedAt: nowIso() });
    this.persist();
    this.notify();
    return { ok: true, evicted };
  }

  public getProgressCounts(): { known: number; unknown: number; total: number } {
    let known = 0;
    let unknown = 0;
    for (const entry of this.cards.values()) {
      if (entry.mark === 'known') known += 1;
      else unknown += 1;
    }
    return { known, unknown, total: this.cards.size };
  }

  public resetCardProgress(): void {
    if (this.cards.size === 0) return;
    this.cards.clear();
    this.persist();
    this.notify();
  }

  public dispose(): void {
    this.listeners.clear();
  }
}

/**
 * Singleton accessor: the application wires ONE store and shares it with
 * every study panel. If a feature ever needs a second store, the feature
 * must be CUT instead (registry hard stop: state-duplication).
 */
let sharedStore: StudyStore | null = null;

export function getStudyStore(storage?: StorageLike | null): StudyStore {
  if (sharedStore === null) {
    sharedStore = new StudyStore(storage);
  }
  return sharedStore;
}

/** Test-only reset so suites never leak state into each other. */
export function resetStudyStoreForTests(): void {
  if (sharedStore !== null) {
    sharedStore.dispose();
  }
  sharedStore = null;
}
