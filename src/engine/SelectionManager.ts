/**
 * 3D Neuroanatomy Atlas: Selection Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Manages active entity selection, triggers visual state changes,
 * and broadcasts selection lifecycle events to UI listeners.
 */

import { AnatomicalEntityManager } from './AnatomicalEntityManager';
import { MaterialManager } from './MaterialManager';
import { AnatomicalEntityRecord } from './types';

export type SelectionChangeListener = (
  entityId: string | null,
  record: AnatomicalEntityRecord | null
) => void;

export class SelectionManager {
  private selectedEntityId: string | null = null;
  private entityManager: AnatomicalEntityManager;
  private materialManager: MaterialManager;
  private listeners: Set<SelectionChangeListener> = new Set();

  constructor(entityManager: AnatomicalEntityManager, materialManager: MaterialManager) {
    this.entityManager = entityManager;
    this.materialManager = materialManager;
  }

  /**
   * Returns current selected entity ID, or null if none selected.
   */
  public getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Returns current selected entity record, or null if none selected.
   */
  public getSelectedRecord(): AnatomicalEntityRecord | null {
    if (!this.selectedEntityId) return null;
    return this.entityManager.getRecord(this.selectedEntityId);
  }

  /**
   * Selects an entity by ID, or deselects if null.
   */
  public select(entityId: string | null): void {
    if (this.selectedEntityId === entityId) {
      return; // No change
    }

    const previousId = this.selectedEntityId;
    this.selectedEntityId = entityId;

    // Reset previous selection visual state
    if (previousId) {
      const prevMesh = this.entityManager.getMesh(previousId);
      if (prevMesh) {
        this.materialManager.applyVisualState(prevMesh, 'DEFAULT');
      }
    }

    // Apply selected visual state to new entity
    let record: AnatomicalEntityRecord | null = null;
    if (entityId) {
      record = this.entityManager.getRecord(entityId);
      const mesh = this.entityManager.getMesh(entityId);
      if (mesh) {
        this.materialManager.applyVisualState(mesh, 'SELECTED');
      }
    }

    this.notifyListeners(entityId, record);
  }

  /**
   * Clears current selection.
   */
  public clearSelection(): void {
    this.select(null);
  }

  /**
   * Subscribes to selection change events.
   * Returns an unsubscribe function.
   */
  public onSelectionChanged(listener: SelectionChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(entityId: string | null, record: AnatomicalEntityRecord | null): void {
    for (const listener of this.listeners) {
      try {
        listener(entityId, record);
      } catch (err) {
        console.error('[SelectionManager] Listener error:', err);
      }
    }
  }

  /**
   * Cleanup listeners.
   */
  public dispose(): void {
    this.clearSelection();
    this.listeners.clear();
  }
}
