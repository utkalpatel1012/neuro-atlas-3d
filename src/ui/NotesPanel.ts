/**
 * 3D Neuroanatomy Atlas: Phase 9 resident notes panel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Per-structure plain-text note editor surfaced near the info panel.
 * - Owns NO state: every read/write goes through the injected single
 *   StudyStore (constructor injection; never `new StudyStore` here).
 * - Collapsible like the hierarchy panel (toggle button + aria-expanded +
 *   hidden body, collapsed by default so the canvas is never obscured).
 * - dispose() unsubscribes the store listener, removes bound DOM listeners,
 *   and detaches the element (no leaks; asserted in phase9 tests).
 * - Requires document (browser only).
 */

import type { StudyStore } from '../study/studyStore';

export interface NotesPanelOptions {
  /** Returns the currently selected structure id, if the host wires selection. */
  getSelectedStructureId?: () => string | null;
}

export class NotesPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private title: HTMLElement;
  private store: StudyStore;
  private getSelectedStructureId: () => string | null;
  private structureId: string | null = null;
  private disposables: Array<() => void> = [];
  private disposed = false;

  constructor(container: HTMLElement, store: StudyStore, options: NotesPanelOptions = {}) {
    this.store = store;
    this.getSelectedStructureId = options.getSelectedStructureId ?? (() => null);

    this.element = document.createElement('section');
    this.element.className = 'neuro-study-panel neuro-notes-panel';
    this.element.setAttribute('aria-label', 'Resident notes');
    this.element.innerHTML = `
      <div class="controls-group">
        <button class="btn btn-secondary study-toggle" aria-label="Expand or collapse resident notes" aria-expanded="false">Notes ▸</button>
        <span class="study-status" role="status">no structure</span>
      </div>
      <div class="study-body" hidden>
        <div class="study-title">No structure selected</div>
        <textarea class="study-note-input" rows="4" maxlength="2000"
          aria-label="Resident note for the selected structure"
          placeholder="Plain-text resident note for this structure…"></textarea>
        <div class="controls-group">
          <button class="btn btn-action study-save">Save note</button>
          <button class="btn btn-secondary study-clear">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(this.element);

    const toggle = this.element.querySelector('.study-toggle') as HTMLButtonElement | null;
    this.body = this.element.querySelector('.study-body') as HTMLElement;
    this.status = this.element.querySelector('.study-status') as HTMLElement;
    this.textarea = this.element.querySelector('.study-note-input') as HTMLTextAreaElement;
    this.title = this.element.querySelector('.study-title') as HTMLElement;
    const saveBtn = this.element.querySelector('.study-save') as HTMLButtonElement | null;
    const clearBtn = this.element.querySelector('.study-clear') as HTMLButtonElement | null;

    if (toggle && this.body) {
      const onToggle = (): void => {
        const hidden = this.body.hasAttribute('hidden');
        if (hidden) {
          this.body.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = 'Notes ▾';
        } else {
          this.body.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Notes ▸';
        }
      };
      toggle.addEventListener('click', onToggle);
      this.disposables.push(() => toggle.removeEventListener('click', onToggle));
    }
    if (saveBtn) {
      const onSave = (): void => this.saveCurrent();
      saveBtn.addEventListener('click', onSave);
      this.disposables.push(() => saveBtn.removeEventListener('click', onSave));
    }
    if (clearBtn) {
      const onClear = (): void => {
        if (this.structureId !== null) {
          this.store.deleteNote(this.structureId);
          this.refresh();
        }
      };
      clearBtn.addEventListener('click', onClear);
      this.disposables.push(() => clearBtn.removeEventListener('click', onClear));
    }

    const unsubscribe = this.store.subscribe(() => this.refresh());
    this.disposables.push(unsubscribe);

    const initial = this.getSelectedStructureId();
    if (initial !== null) this.setStructureId(initial);
  }

  /** Host (or selection wiring) sets the structure this editor edits. */
  public setStructureId(structureId: string | null): void {
    this.structureId = structureId;
    this.refresh();
  }

  public getStructureId(): string | null {
    return this.structureId;
  }

  private saveCurrent(): void {
    if (this.structureId === null) {
      this.status.textContent = 'select a structure before saving a note';
      return;
    }
    const result = this.store.setNote(this.structureId, this.textarea.value);
    if (!result.ok) {
      this.status.textContent = result.reason ?? 'note not saved';
      return;
    }
    const flags: string[] = [];
    if (result.truncated === true) flags.push('truncated to limit');
    if (result.evicted === true) flags.push('oldest note evicted');
    this.status.textContent = flags.length > 0 ? `note saved (${flags.join('; ')})` : 'note saved';
    this.refresh();
  }

  private refresh(): void {
    if (this.disposed) return;
    if (this.structureId === null) {
      this.title.textContent = 'No structure selected';
      this.textarea.value = '';
      if (this.status.textContent === '' || this.status.textContent === 'note saved') {
        this.status.textContent = 'no structure';
      }
      return;
    }
    this.title.textContent = `Note · ${this.structureId}`;
    const record = this.store.getNote(this.structureId);
    // Do not clobber in-progress typing on store notifications from other
    // panels: only sync the textarea when it does not have focus.
    if (document.activeElement !== this.textarea) {
      this.textarea.value = record?.text ?? '';
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const dispose of this.disposables) {
      try {
        dispose();
      } catch (err) {
        console.error('[NotesPanel] Dispose error:', err);
      }
    }
    this.disposables.length = 0;
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
