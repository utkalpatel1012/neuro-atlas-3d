/**
 * 3D Neuroanatomy Atlas: Interaction & Spatial Raycasting Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Manages pointer hover, click, and tap selection across desktop and mobile.
 * Uses three-mesh-bvh accelerated BVH raycasting for O(log N) picking performance.
 */

import * as THREE from 'three';
import { AnatomicalEntityManager } from './AnatomicalEntityManager';

export type HoverCallback = (entityId: string | null, hitPoint?: THREE.Vector3) => void;
export type SelectCallback = (entityId: string | null, hitPoint?: THREE.Vector3) => void;

export interface InteractionCallbacks {
  onHover?: HoverCallback;
  onSelect?: SelectCallback;
}

/**
 * Phase 4A clipping filter (§8): lets picking skip surface fragments the GPU
 * clipping planes remove, without touching BVHs. Supplied by application state
 * (SectionPlaneSet); null = pre-4A behavior. Event-driven only.
 */
export interface ClippingPickFilter {
  isPointCulled(p: THREE.Vector3): boolean;
  hasActivePlanes(): boolean;
}

export class InteractionManager {
  private canvas?: HTMLCanvasElement;
  private camera: THREE.Camera;
  private searchRoot: THREE.Object3D;
  private entityManager: AnatomicalEntityManager;
  private raycaster: THREE.Raycaster;
  private pointerNdc: THREE.Vector2;
  private hoverListeners: Set<HoverCallback> = new Set();
  private selectListeners: Set<SelectCallback> = new Set();

  private isPointerDown = false;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private currentHoveredEntityId: string | null = null;
  private enabled = true;
  private clippingFilter: ClippingPickFilter | null = null;

  // Bound event listener references for clean removal
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerLeave: () => void;

  constructor(
    camera: THREE.Camera,
    searchRoot: THREE.Object3D,
    entityManager: AnatomicalEntityManager,
    canvas?: HTMLCanvasElement,
    callbacks: InteractionCallbacks = {}
  ) {
    this.camera = camera;
    this.searchRoot = searchRoot;
    this.entityManager = entityManager;

    if (callbacks.onHover) this.hoverListeners.add(callbacks.onHover);
    if (callbacks.onSelect) this.selectListeners.add(callbacks.onSelect);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh = { threshold: 0.1 } as any;
    (this.raycaster as any).firstHitOnly = true;

    this.pointerNdc = new THREE.Vector2(-999, -999);

    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundPointerLeave = this.onPointerLeave.bind(this);

    if (canvas) {
      this.attach(canvas);
    }
  }

  public attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.canvas = canvas;
    this.canvas.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    this.canvas.addEventListener('pointerdown', this.boundPointerDown, { passive: true });
    this.canvas.addEventListener('pointerup', this.boundPointerUp, { passive: true });
    this.canvas.addEventListener('pointerleave', this.boundPointerLeave, { passive: true });
  }

  public detach(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this.boundPointerMove);
      this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      this.canvas.removeEventListener('pointerup', this.boundPointerUp);
      this.canvas.removeEventListener('pointerleave', this.boundPointerLeave);
      this.canvas = undefined;
    }
  }

  public onHover(cb: HoverCallback): () => void {
    this.hoverListeners.add(cb);
    return () => {
      this.hoverListeners.delete(cb);
    };
  }

  public onSelect(cb: SelectCallback): () => void {
    this.selectListeners.add(cb);
    return () => {
      this.selectListeners.delete(cb);
    };
  }

  private updatePointerNdc(clientX: number, clientY: number): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled) return;
    this.updatePointerNdc(event.clientX, event.clientY);
    this.performHoverRaycast();
  }

  private onPointerDown(event: PointerEvent): void {
    this.isPointerDown = true;
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isPointerDown || !this.enabled) return;
    this.isPointerDown = false;

    // Reject drag gestures (camera orbit/pan moves) using a 5-pixel radius threshold
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const dragDistanceSq = dx * dx + dy * dy;

    if (dragDistanceSq < 25) {
      this.updatePointerNdc(event.clientX, event.clientY);
      this.performSelectRaycast();
    }
  }

  private onPointerLeave(): void {
    if (this.currentHoveredEntityId !== null) {
      this.currentHoveredEntityId = null;
      for (const listener of this.hoverListeners) {
        listener(null);
      }
    }
    this.pointerNdc.set(-999, -999);
  }

  /**
   * Phase 4A (§8): install/remove the clipping pick filter. When planes are
   * active, single-hit mode is disabled so farther visible fragments can still
   * resolve (correctness over the firstHitOnly shortcut, only while clipping).
   */
  public setClippingFilter(filter: ClippingPickFilter | null): void {
    this.clippingFilter = filter;
  }

  private clippingActive(): boolean {
    return this.clippingFilter !== null && this.clippingFilter.hasActivePlanes();
  }

  /**
   * Raycasts the scene for pointer hover state.
   */
  public performHoverRaycast(): string | null {
    if (this.pointerNdc.x < -1 || this.pointerNdc.x > 1) return null;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    (this.raycaster as any).firstHitOnly = !this.clippingActive();
    const intersects = this.raycaster.intersectObjects(this.searchRoot.children, true);

    let topEntityId: string | null = null;
    let hitPoint: THREE.Vector3 | undefined = undefined;

    for (const hit of intersects) {
      let isVis = true;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (!obj.visible) {
          isVis = false;
          break;
        }
        obj = obj.parent;
      }
      if (!isVis) continue;

      // Phase 4A: skip fragments the GPU clipping planes remove. BVH still
      // tests original geometry (never rebuilt for clipping); this filter
      // applies the same half-spaces on the CPU at pick time only.
      if (this.clippingActive() && this.clippingFilter!.isPointCulled(hit.point)) continue;

      const entity = this.entityManager.getEntityByMesh(hit.object as THREE.Mesh);
      if (entity) {
        topEntityId = entity.entityId;
        hitPoint = hit.point;
        break;
      }
    }

    if (topEntityId !== this.currentHoveredEntityId) {
      this.currentHoveredEntityId = topEntityId;
      for (const listener of this.hoverListeners) {
        listener(topEntityId, hitPoint);
      }
    }

    return topEntityId;
  }

  /**
   * Raycasts the scene for click/tap selection state.
   */
  public performSelectRaycast(): string | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    (this.raycaster as any).firstHitOnly = !this.clippingActive();
    const intersects = this.raycaster.intersectObjects(this.searchRoot.children, true);

    let selectedId: string | null = null;
    let hitPoint: THREE.Vector3 | undefined = undefined;

    for (const hit of intersects) {
      let isVis = true;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (!obj.visible) {
          isVis = false;
          break;
        }
        obj = obj.parent;
      }
      if (!isVis) continue;

      // Phase 4A: same clipping filter as hover (see above).
      if (this.clippingActive() && this.clippingFilter!.isPointCulled(hit.point)) continue;

      const entity = this.entityManager.getEntityByMesh(hit.object as THREE.Mesh);
      if (entity) {
        selectedId = entity.entityId;
        hitPoint = hit.point;
        break;
      }
    }

    for (const listener of this.selectListeners) {
      listener(selectedId, hitPoint);
    }

    return selectedId;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.currentHoveredEntityId !== null) {
      this.onPointerLeave();
    }
  }

  public dispose(): void {
    this.detach();
    this.hoverListeners.clear();
    this.selectListeners.clear();
  }
}
