/**
 * 3D Neuroanatomy Atlas: Phase 9 study container panel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Single composition point for the four study panels (notes, flashcards,
 * saved views, quiz). Composes them with ONE shared StudyStore instance —
 * sub-panels receive the store and never create their own (registry hard
 * stop: state-duplication). dispose() cascades to every sub-panel.
 * Collapsible (collapsed by default); requires document (browser only).
 *
 * NOTE (no main.ts edit in Phase 9 — allowed scope is ui-components only):
 * mount this container from the bootstrap wiring site, e.g.
 *   const study = new StudyPanel(appContainer, {
 *     store: getStudyStore(),
 *     getSelectedStructureId: () => app.getAssemblyManager().getPrimarySelectedEntity()?.entityId ?? null,
 *     getDeck: () => deck.cards, getSkippedCount: () => deck.skipped.length,
 *     getQuestions: () => questions,
 *     viewAdapters: { captureCamera, captureSelection, captureClipping,
 *       captureLabelsEnabled, applyView },   // thin wrappers over the
 *   });                                        // existing managers (see
 *                                              // docs/PHASE_9_COMPLETION_REPORT.md §5)
 */

import type { Flashcard } from '../study/flashcards';
import type { QuizQuestion } from '../study/quiz';
import { getStudyStore, type StudyStore } from '../study/studyStore';
import { FlashcardPanel } from './FlashcardPanel';
import { NotesPanel } from './NotesPanel';
import { QuizPanel } from './QuizPanel';
import { SavedViewsPanel, type SavedViewAdapters } from './SavedViewsPanel';

export interface StudyPanelDeps {
  store?: StudyStore;
  getSelectedStructureId?: () => string | null;
  getDeck?: () => Flashcard[];
  getSkippedCount?: () => number;
  getQuestions?: () => QuizQuestion[];
  viewAdapters?: SavedViewAdapters;
}

export class StudyPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private notes: NotesPanel;
  private flashcards: FlashcardPanel;
  private views: SavedViewsPanel;
  private quiz: QuizPanel;
  private store: StudyStore;
  private toggle: HTMLButtonElement | null = null;
  private onToggle: (() => void) | null = null;
  private disposed = false;

  constructor(container: HTMLElement, deps: StudyPanelDeps = {}) {
    // Single-store rule: default to the shared singleton; a host-supplied
    // store is accepted only so tests can isolate state.
    this.store = deps.store ?? getStudyStore();

    this.element = document.createElement('section');
    this.element.className = 'neuro-study-panel neuro-study-container';
    this.element.setAttribute('aria-label', 'Study tools');
    this.element.innerHTML = `
      <div class="controls-group">
        <button class="btn btn-secondary study-toggle" aria-label="Expand or collapse study tools" aria-expanded="false">Study ▸</button>
        <span class="study-status" role="status">notes · cards · views · quiz</span>
      </div>
      <div class="study-body" hidden></div>
    `;
    container.appendChild(this.element);

    this.toggle = this.element.querySelector('.study-toggle') as HTMLButtonElement | null;
    this.body = this.element.querySelector('.study-body') as HTMLElement;
    if (this.toggle && this.body) {
      const toggleEl = this.toggle;
      const bodyEl = this.body;
      this.onToggle = (): void => {
        const hidden = bodyEl.hasAttribute('hidden');
        if (hidden) {
          bodyEl.removeAttribute('hidden');
          toggleEl.setAttribute('aria-expanded', 'true');
          toggleEl.textContent = 'Study ▾';
        } else {
          bodyEl.setAttribute('hidden', '');
          toggleEl.setAttribute('aria-expanded', 'false');
          toggleEl.textContent = 'Study ▸';
        }
      };
      toggleEl.addEventListener('click', this.onToggle);
    }

    this.notes = new NotesPanel(this.body, this.store, {
      getSelectedStructureId: deps.getSelectedStructureId,
    });
    this.flashcards = new FlashcardPanel(this.body, this.store, {
      getDeck: deps.getDeck,
      getSkippedCount: deps.getSkippedCount,
    });
    this.views = new SavedViewsPanel(this.body, this.store, deps.viewAdapters);
    this.quiz = new QuizPanel(this.body, { getQuestions: deps.getQuestions });
  }

  public getStore(): StudyStore {
    return this.store;
  }

  public getNotesPanel(): NotesPanel {
    return this.notes;
  }

  public getFlashcardPanel(): FlashcardPanel {
    return this.flashcards;
  }

  public getSavedViewsPanel(): SavedViewsPanel {
    return this.views;
  }

  public getQuizPanel(): QuizPanel {
    return this.quiz;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.notes.dispose();
    } catch (err) {
      console.error('[StudyPanel] Notes dispose error:', err);
    }
    try {
      this.flashcards.dispose();
    } catch (err) {
      console.error('[StudyPanel] Flashcards dispose error:', err);
    }
    try {
      this.views.dispose();
    } catch (err) {
      console.error('[StudyPanel] Views dispose error:', err);
    }
    try {
      this.quiz.dispose();
    } catch (err) {
      console.error('[StudyPanel] Quiz dispose error:', err);
    }
    if (this.toggle !== null && this.onToggle !== null) {
      this.toggle.removeEventListener('click', this.onToggle);
    }
    this.toggle = null;
    this.onToggle = null;
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
