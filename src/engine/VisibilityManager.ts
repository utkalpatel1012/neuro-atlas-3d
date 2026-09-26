/**
 * 3D Neuroanatomy Atlas: Visibility Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Controls anatomical structure visibility, hiding, and isolation modes.
 * Coordinates with MaterialManager to ghost non-isolated anatomy or completely hide it.
 */

import { AnatomicalEntityManager } from './AnatomicalEntityManager';
import { MaterialManager } from './MaterialManager';

export type VisibilityChangeListener = () => void;

export class VisibilityManager {
  private entityManager: AnatomicalEntityManager;
  private materialManager: MaterialManager;
  private hiddenEntityIds: Set<string> = new Set();
  private isolatedEntityId: string | null = null;
  private ghostOthersOnIsolate: boolean = true;
  private listeners: Set<VisibilityChangeListener> = new Set();

  constructor(
    entityManager: AnatomicalEntityManager,
    materialManager: MaterialManager,
    ghostOthersOnIsolate: boolean = true
  ) {
    this.entityManager = entityManager;
    this.materialManager = materialManager;
    this.ghostOthersOnIsolate = ghostOthersOnIsolate;
  }

  /**
   * Sets whether isolating an entity ghosts others (true) or completely hides them (false).
   */
  public setGhostOthersOnIsolate(ghost: boolean): void {
    this.ghostOthersOnIsolate = ghost;
    if (this.isolatedEntityId) {
      this.reapplyIsolation();
    }
  }

  /**
   * Shows an entity.
   */
  public show(entityId: string): void {
    this.hiddenEntityIds.delete(entityId);
    const mesh = this.entityManager.getMesh(entityId);
    if (mesh) {
      mesh.visible = true;
      if (!this.isolatedEntityId || this.isolatedEntityId === entityId) {
        this.materialManager.setEntityState(mesh, entityId, 'DEFAULT');
      } else {
        this.materialManager.setEntityState(
          mesh,
          entityId,
          this.ghostOthersOnIsolate ? 'GHOSTED' : 'HIDDEN'
        );
      }
    }
    this.notifyListeners();
  }

  /**
   * Hides an entity.
   */
  public hide(entityId: string): void {
    this.hiddenEntityIds.add(entityId);
    const mesh = this.entityManager.getMesh(entityId);
    if (mesh) {
      mesh.visible = false;
      this.materialManager.setEntityState(mesh, entityId, 'HIDDEN');
    }
    if (this.isolatedEntityId === entityId) {
      this.isolatedEntityId = null;
    }
    this.notifyListeners();
  }

  /**
   * Toggles visibility of an entity.
   */
  public toggle(entityId: string): void {
    if (this.hiddenEntityIds.has(entityId)) {
      this.show(entityId);
    } else {
      this.hide(entityId);
    }
  }

  /**
   * Isolates an entity, making it the sole focus while ghosting or hiding all others.
   * If already isolated, calling isolate again with the same ID toggles isolation off (restores all).
   */
  public isolate(entityId: string, ghostOthers?: boolean): void {
    if (ghostOthers !== undefined) {
      this.ghostOthersOnIsolate = ghostOthers;
    }

    if (this.isolatedEntityId === entityId) {
      // Toggle off
      this.restoreAll();
      return;
    }

    this.isolatedEntityId = entityId;
    this.reapplyIsolation();
    this.notifyListeners();
  }

  /**
   * Restores all entities to full visibility and default rendering.
   */
  public restoreAll(): void {
    this.isolatedEntityId = null;
    this.hiddenEntityIds.clear();

    const meshes = this.entityManager.getAllMeshes();
    for (const mesh of meshes) {
      const entityId = mesh.userData?.neuroAtlas?.entityId;
      if (entityId) {
        mesh.visible = true;
        this.materialManager.setEntityState(mesh, entityId, 'DEFAULT');
      }
    }

    this.notifyListeners();
  }

  /**
   * Reapplies isolation styling across all registered entities.
   */
  private reapplyIsolation(): void {
    if (!this.isolatedEntityId) return;

    const meshes = this.entityManager.getAllMeshes();
    for (const mesh of meshes) {
      const entityId = mesh.userData?.neuroAtlas?.entityId;
      if (!entityId) continue;

      if (entityId === this.isolatedEntityId) {
        mesh.visible = true;
        this.materialManager.setEntityState(mesh, entityId, 'SELECTED');
      } else {
        if (this.ghostOthersOnIsolate) {
          mesh.visible = true;
          this.materialManager.setEntityState(mesh, entityId, 'GHOSTED');
        } else {
          mesh.visible = false;
          this.materialManager.setEntityState(mesh, entityId, 'HIDDEN');
        }
      }
    }
  }

  public isIsolated(entityId: string): boolean {
    return this.isolatedEntityId === entityId;
  }

  public getIsolatedEntityId(): string | null {
    return this.isolatedEntityId;
  }

  public isHidden(entityId: string): boolean {
    return this.hiddenEntityIds.has(entityId);
  }

  public getHiddenEntityIds(): ReadonlySet<string> {
    return this.hiddenEntityIds;
  }

  public onVisibilityChanged(listener: VisibilityChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[VisibilityManager] Listener error:', err);
      }
    }
  }

  public dispose(): void {
    this.listeners.clear();
    this.hiddenEntityIds.clear();
    this.isolatedEntityId = null;
  }
}
