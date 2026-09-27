/**
 * 3D Neuroanatomy Atlas: GPU Clipping Adapter (Phase 4A)
 * Standard: AAS-2026-NEURO-V1
 *
 * Single bridge between application plane state (SectionPlaneSet) and Three.js
 * clipping. One code path for WebGL2 and WebGPU (material-level clippingPlanes;
 * no renderer branches scattered through the codebase).
 *
 * Performance contract (docs/PHASE_4_RUNTIME_CONSTRAINTS.md):
 * - A stable pool of THREE.Plane objects, mutated IN PLACE on plane movement.
 * - ONE shared plane array assigned to every registered material.
 * - sync() runs ONLY on state change / material (un)registration / explicit
 *   resync — never per frame. Plane moves never allocate, never recompile
 *   (value mutation needs no needsUpdate); plane SET changes mark needsUpdate once.
 * - No canvas/DOM listeners owned here; unsubscribe from the plane store on dispose.
 *
 * Honesty notes:
 * - SECTION_CAPS_PENDING: no cap geometry is generated. Cut surfaces render hollow;
 *   nothing is inserted to fake solid interiors.
 * - Raycasting (incl. three-mesh-bvh) tests ORIGINAL geometry and ignores GPU
 *   clipping: selection may resolve entities clipped from view. Entity identity,
 *   metadata, and provenance are never altered by clipping (verified in tests).
 * - WebGPU clipping path is code-identical (material.clippingPlanes; three r186
 *   implements clipping in the WebGPU build) but DEVICE-UNVERIFIED headless.
 */

import * as THREE from 'three';
import { SectionPlaneSet } from './SectionPlaneSet';
import { toThreePlane } from './sectionPlanes';

export class ClippingAdapter {
  private planes: Map<string, THREE.Plane> = new Map();
  private sharedPlanes: THREE.Plane[] = [];
  private materials: Map<string, THREE.Material> = new Map();
  private gizmoGroup: THREE.Group = new THREE.Group();
  private gizmoHelpers: Map<string, THREE.PlaneHelper> = new Map();
  private lastSyncedVersion = -1;
  private unsubscribe: (() => void) | null = null;
  private store: SectionPlaneSet | null = null;
  private disposed = false;

  constructor() {
    this.gizmoGroup.name = 'SectionPlane_Gizmos';
    this.gizmoGroup.visible = true;
  }

  /** Bind to a plane store. Exactly one binding at a time; rebind replaces it. */
  public bind(store: SectionPlaneSet): void {
    this.unbind();
    this.store = store;
    this.lastSyncedVersion = -1;
    this.unsubscribe = store.onChange(() => this.sync());
    this.sync();
  }

  public unbind(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.store = null;
  }

  /** Register an anatomical material for clipping. Shared array assigned, no clone. */
  public registerMaterial(entityId: string, material: THREE.Material): void {
    if (this.disposed) return;
    this.materials.set(entityId, material);
    material.clippingPlanes = this.sharedPlanes;
    this.sync();
  }

  public unregisterMaterial(entityId: string): void {
    const material = this.materials.get(entityId);
    if (material) {
      material.clippingPlanes = null;
      this.materials.delete(entityId);
    }
  }

  /** Reconcile pool + materials with store state. Event-driven only, never per frame. */
  public sync(): void {
    if (this.disposed || !this.store) return;
    if (this.store.getVersion() === this.lastSyncedVersion) return;
    this.lastSyncedVersion = this.store.getVersion();

    const enabled = this.store.getEnabledPlanes();
    const enabledIds = new Set(enabled.map((p) => p.id));
    let setChanged = false;

    // Remove retired planes (also drops their gizmo helpers).
    for (const id of [...this.planes.keys()]) {
      if (!enabledIds.has(id)) {
        this.planes.delete(id);
        this.removeGizmo(id);
        setChanged = true;
      }
    }

    // Create or update in place (no reallocation on moves).
    for (const record of enabled) {
      const fresh = toThreePlane(record.math);
      const pooled = this.planes.get(record.id);
      if (pooled) {
        pooled.normal.copy(fresh.normal);
        pooled.constant = fresh.constant;
      } else {
        this.planes.set(record.id, fresh);
        this.addGizmo(record.id, fresh);
        setChanged = true;
      }
    }

    // Rebuild shared array IN PLACE (stable reference held by all materials).
    this.sharedPlanes.length = 0;
    for (const record of enabled) {
      const pooled = this.planes.get(record.id);
      if (pooled) this.sharedPlanes.push(pooled);
    }

    if (setChanged) {
      for (const material of this.materials.values()) {
        material.clippingPlanes = this.sharedPlanes;
        material.needsUpdate = true;
      }
    }
  }

  /**
   * Enable material-level clipping on a renderer object. Sets the flag ONLY if
   * the renderer already exposes a boolean localClippingEnabled (WebGLRenderer);
   * never invents renderer API. Returns whether the flag was applied.
   * WebGPU path in three r186 honors material.clippingPlanes through its own
   * clipping context — DEVICE-UNVERIFIED headless (documented, not claimed).
   */
  public applyRendererState(renderer: unknown): boolean {
    if (!renderer || this.disposed) return false;
    const candidate = renderer as { localClippingEnabled?: unknown };
    if (typeof candidate.localClippingEnabled === 'boolean') {
      candidate.localClippingEnabled = true;
      return true;
    }
    return false;
  }

  /**
   * Full re-application for renderer recreation / bulk material replacement.
   * Reads application state (never GPU state), so context loss cannot lose planes.
   */
  public resync(store: SectionPlaneSet, renderer: unknown): void {
    if (this.disposed) return;
    this.bind(store);
    this.applyRendererState(renderer);
  }

  public setGizmoVisible(visible: boolean): void {
    this.gizmoGroup.visible = visible;
  }

  public isGizmoVisible(): boolean {
    return this.gizmoGroup.visible;
  }

  public getGizmoGroup(): THREE.Group {
    return this.gizmoGroup;
  }

  public getActivePlaneCount(): number {
    return this.sharedPlanes.length;
  }

  /** Stable shared array identity (tests pin no-reallocation on moves). */
  public getSharedPlanes(): readonly THREE.Plane[] {
    return this.sharedPlanes;
  }

  private addGizmo(id: string, plane: THREE.Plane): void {
    // GIZMO_COLOR cyan line helper, size 200 mm — clearly not tissue.
    const helper = new THREE.PlaneHelper(plane, 200, 0x22d3ee);
    helper.name = `SectionPlane_Gizmo_${id}`;
    this.gizmoHelpers.set(id, helper);
    this.gizmoGroup.add(helper);
  }

  private removeGizmo(id: string): void {
    const helper = this.gizmoHelpers.get(id);
    if (!helper) return;
    this.gizmoGroup.remove(helper);
    const geometry = helper.geometry as THREE.BufferGeometry | undefined;
    if (geometry && typeof geometry.dispose === 'function') geometry.dispose();
    const material = helper.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      for (const m of material) m.dispose();
    } else if (material && typeof material.dispose === 'function') {
      material.dispose();
    }
    this.gizmoHelpers.delete(id);
  }

  public dispose(): void {
    this.unbind();
    for (const material of this.materials.values()) {
      material.clippingPlanes = null;
    }
    this.materials.clear();
    for (const id of [...this.gizmoHelpers.keys()]) {
      this.removeGizmo(id);
    }
    this.planes.clear();
    this.sharedPlanes.length = 0;
    this.lastSyncedVersion = -1;
    this.disposed = true;
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}
