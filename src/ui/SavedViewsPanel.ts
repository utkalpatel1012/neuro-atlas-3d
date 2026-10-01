/**
 * 3D Neuroanatomy Atlas: Phase 9 saved-views panel.
 * Standard: AAS-2026-NEURO-V1
 *
 * Save / restore / delete named view snapshots ({camera pose, selection
 * ids, clipping state} + label flag). The panel owns NO viewer state:
 * capture/restore run through injected adapter callbacks that the host
 * wires to the existing managers (SelectionManager, CameraManager,
 * LabelManager, SectionPlaneSet/SectionPresentation serialize+deserialize).
 * Snapshots persist in the single shared StudyStore (bounded, quota-grace).
 * Collapsible (collapsed by default); dispose() detaches everything.
 * Requires document (browser only).
 */

import type {
  CameraPoseSnapshot,
  ClippingSnapshot,
  SavedView,
  StudyStore,
} from '../study/studyStore';

export interface SavedViewAdapters {
  /** Capture camera pose from the existing CameraManager (null when unavailable). */
  captureCamera: () => CameraPoseSnapshot | null;
  /** Capture selection from the existing SelectionManager. */
  captureSelection: () => { selectedEntityId: string | null };
  /** Capture clipping via SectionPlaneSet.serialize + SectionPresentation.serialize. */
  captureClipping: () => ClippingSnapshot | null;
  /** Read LabelManager enabled state. */
  captureLabelsEnabled: () => boolean;
  /**
   * Restore a view through the existing managers (camera pose apply,
   * selection select, plane/presentation deserialize, label flag).
   */
  applyView: (view: SavedView) => void;
}

const NULL_ADAPTERS: SavedViewAdapters = {
  captureCamera: () => null,
  captureSelection: () => ({ selectedEntityId: null }),
  captureClipping: () => null,
  captureLabelsEnabled: () => true,
  applyView: () => undefined,
};

export class SavedViewsPanel {
  private element: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private list: HTMLElement;
  private labelInput: HTMLInputElement;
  private store: StudyStore;
  private adapters: SavedViewAdapters;
  private disposables: Array<() => void> = [];
  private disposed = false;

  constructor(container: HTMLElement, store: StudyStore, adapters: SavedViewAdapters = NULL_ADAPTERS) {
    this.store = store;
    this.adapters = adapters;

    this.element = document.createElement('section');
    this.element.className = 'neuro-study-panel neuro-saved-views-panel';
    this.element.setAttribute('aria-label', 'Saved views');
    this.element.innerHTML = `
      <div class="controls-group">
        <button class="btn btn-secondary study-toggle" aria-label="Expand or collapse saved views" aria-expanded="false">Views ▸</button>
        <span class="study-status" role="status">0 saved</span>
      </div>
      <div class="study-body" hidden>
        <div class="controls-group">
          <input class="study-view-label" type="text" maxlength="80" placeholder="View label…" aria-label="Saved view label" />
          <button class="btn btn-action study-save-view">Save current view</button>
        </div>
        <div class="study-views-list" role="list" aria-label="Saved views"></div>
      </div>
    `;
    container.appendChild(this.element);

    const toggle = this.element.querySelector('.study-toggle') as HTMLButtonElement | null;
    this.body = this.element.querySelector('.study-body') as HTMLElement;
    this.status = this.element.querySelector('.study-status') as HTMLElement;
    this.list = this.element.querySelector('.study-views-list') as HTMLElement;
    this.labelInput = this.element.querySelector('.study-view-label') as HTMLInputElement;
    const saveBtn = this.element.querySelector('.study-save-view') as HTMLButtonElement | null;

    if (toggle && this.body) {
      const onToggle = (): void => {
        const hidden = this.body.hasAttribute('hidden');
        if (hidden) {
          this.body.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = 'Views ▾';
        } else {
          this.body.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Views ▸';
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
    // Single delegated listener for all Restore/Delete buttons (wired once — rows
    // re-render without allocating listeners, so per-render disposal is unnecessary).
    const onListClick = (ev: Event): void => {
      const target = ev.target as HTMLElement | null;
      const btn = target?.closest?.('button[data-action]') as HTMLElement | null;
      if (!btn || !this.list.contains(btn)) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (btn.getAttribute('data-action') === 'restore') this.restoreView(id);
      else if (btn.getAttribute('data-action') === 'delete') this.deleteView(id);
    };
    this.list.addEventListener('click', onListClick);
    this.disposables.push(() => this.list.removeEventListener('click', onListClick));

    const unsubscribe = this.store.subscribe(() => this.render());
    this.disposables.push(unsubscribe);
    this.render();
  }

  /** Capture the current viewer state through the adapters into the store. */
  public saveCurrent(label?: string): void {
    const { view, result } = this.store.saveView({
      label: label ?? this.labelInput.value,
      camera: this.adapters.captureCamera(),
      selection: this.adapters.captureSelection(),
      clipping: this.adapters.captureClipping(),
      labelsEnabled: this.adapters.captureLabelsEnabled(),
    });
    if (view === null || !result.ok) {
      this.status.textContent = result.reason ?? 'view not saved';
      return;
    }
    this.labelInput.value = '';
    this.status.textContent = result.evicted === true
      ? `view saved (oldest evicted) · ${this.store.getViewCount()} saved`
      : `view saved · ${this.store.getViewCount()} saved`;
    this.render();
  }

  public restoreView(id: string): void {
    const view = this.store.getView(id);
    if (!view) {
      this.status.textContent = 'saved view not found';
      return;
    }
    try {
      this.adapters.applyView(view);
      this.status.textContent = `restored "${view.label}"`;
    } catch (err) {
      this.status.textContent = `restore failed (${(err as Error).message})`;
    }
  }

  public deleteView(id: string): void {
    this.store.deleteView(id);
    this.render();
  }

  private render(): void {
    if (this.disposed) return;
    const views = this.store.listViews();
    this.status.textContent = `${views.length} saved`;
    // Phase 9 review MAJOR fix: this previously attached Restore/Delete listeners
    // per row per render and never pruned them, leaking 2 closures + detached nodes
    // per row on every store notification. Now a single delegated listener (wired once
    // in bindEvents) reads data-action/data-id, so re-renders allocate no listeners.
    this.list.innerHTML = '';
    for (const view of views) {
      const row = document.createElement('div');
      row.setAttribute('role', 'listitem');
      row.className = 'study-view-row';
      const name = document.createElement('span');
      name.textContent = view.label;
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-secondary';
      restoreBtn.textContent = 'Restore';
      restoreBtn.setAttribute('aria-label', `Restore saved view ${view.label}`);
      restoreBtn.setAttribute('data-action', 'restore');
      restoreBtn.setAttribute('data-id', view.id);
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-secondary';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete saved view ${view.label}`);
      deleteBtn.setAttribute('data-action', 'delete');
      deleteBtn.setAttribute('data-id', view.id);
      row.appendChild(name);
      row.appendChild(restoreBtn);
      row.appendChild(deleteBtn);
      this.list.appendChild(row);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const dispose of this.disposables) {
      try {
        dispose();
      } catch (err) {
        console.error('[SavedViewsPanel] Dispose error:', err);
      }
    }
    this.disposables.length = 0;
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
