/**
 * 3D Neuroanatomy Atlas: Level of Detail (LOD) Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Automatically manages continuous, distance-based LOD switching
 * and manual user override between LOD0, LOD1, LOD2, and LOD3.
 * Preserves stereotaxic coordinates and mesh integrity during hot-swaps.
 */

import * as THREE from 'three';
import { AssetManager } from './AssetManager';
import { AnatomicalEntityManager } from './AnatomicalEntityManager';
import { LODLevel, LODMode, LODState } from './types';

export type LODChangeListener = (entityId: string, level: LODLevel) => void;

export interface LODThresholds {
  lod0MaxMm: number; // e.g. 80 mm
  lod1MaxMm: number; // e.g. 150 mm
  lod2MaxMm: number; // e.g. 250 mm
}

export class LODManager {
  private assetManager: AssetManager;
  private entityManager: AnatomicalEntityManager;
  private mode: LODMode = 'AUTO';
  private activeLODs: Map<string, LODLevel> = new Map();
  private distanceMultiplier: number = 1.0;
  private listeners: Set<LODChangeListener> = new Set();

  // Anatomically calibrated viewing distances in millimeters
  private thresholds: LODThresholds = {
    lod0MaxMm: 80,
    lod1MaxMm: 150,
    lod2MaxMm: 250
  };

  // Hysteresis buffer in mm to prevent flickering near threshold boundaries
  private readonly HYSTERESIS_MM = 6.0;
  private lastDistances: Map<string, number> = new Map();

  constructor(assetManager: AssetManager, entityManager: AnatomicalEntityManager) {
    this.assetManager = assetManager;
    this.entityManager = entityManager;
  }

  /**
   * Sets LOD operational mode ('AUTO' or manual override: 'LOD0', 'LOD1', etc.)
   */
  public async setMode(mode: LODMode): Promise<void> {
    this.mode = mode;

    if (mode !== 'AUTO') {
      const targetLod = mode.toLowerCase() as LODLevel;
      const entities = this.entityManager.getAllRecords();
      for (const entity of entities) {
        await this.applyLOD(entity.entityId, targetLod);
      }
    }
  }

  public getMode(): LODMode {
    return this.mode;
  }

  public getActiveLOD(entityId: string): LODLevel {
    return this.activeLODs.get(entityId) || 'lod0';
  }

  public setDistanceMultiplier(mult: number): void {
    this.distanceMultiplier = Math.max(0.1, Math.min(2.0, mult));
  }

  /**
   * Evaluates camera distance and applies appropriate LOD if mode is AUTO.
   */
  public update(camera: THREE.Camera): void {
    if (this.mode !== 'AUTO') return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    const entities = this.entityManager.getAllRecords();
    for (const entity of entities) {
      const mesh = this.entityManager.getMesh(entity.entityId);
      if (!mesh || !mesh.visible) continue;

      const centroid = new THREE.Vector3(
        entity.canonicalCentroidMm[0],
        entity.canonicalCentroidMm[1],
        entity.canonicalCentroidMm[2]
      );

      const distanceMm = cameraPos.distanceTo(centroid);
      this.lastDistances.set(entity.entityId, distanceMm);

      const currentLod = this.activeLODs.get(entity.entityId) || 'lod0';
      const targetLod = this.calculateTargetLOD(distanceMm, currentLod);

      if (targetLod !== currentLod) {
        this.applyLOD(entity.entityId, targetLod).catch((err) => {
          console.error(`[LODManager] Failed to apply ${targetLod} for ${entity.entityId}:`, err);
        });
      }
    }
  }

  /**
   * Computes target LOD with hysteresis protection against boundary oscillation.
   */
  private calculateTargetLOD(distanceMm: number, currentLod: LODLevel): LODLevel {
    const scale = this.distanceMultiplier;
    const t0 = this.thresholds.lod0MaxMm * scale;
    const t1 = this.thresholds.lod1MaxMm * scale;
    const t2 = this.thresholds.lod2MaxMm * scale;
    const h = this.HYSTERESIS_MM;

    if (currentLod === 'lod0') {
      if (distanceMm > t0 + h) {
        return distanceMm > t1 + h ? (distanceMm > t2 + h ? 'lod3' : 'lod2') : 'lod1';
      }
      return 'lod0';
    }

    if (currentLod === 'lod1') {
      if (distanceMm < t0 - h) return 'lod0';
      if (distanceMm > t1 + h) return distanceMm > t2 + h ? 'lod3' : 'lod2';
      return 'lod1';
    }

    if (currentLod === 'lod2') {
      if (distanceMm < t1 - h) return distanceMm < t0 - h ? 'lod0' : 'lod1';
      if (distanceMm > t2 + h) return 'lod3';
      return 'lod2';
    }

    // currentLod === 'lod3'
    if (distanceMm < t2 - h) {
      return distanceMm < t1 - h ? (distanceMm < t0 - h ? 'lod0' : 'lod1') : 'lod2';
    }
    return 'lod3';
  }

  /**
   * Hot-swaps the underlying BufferGeometry on the registered mesh.
   */
  public async applyLOD(entityId: string, targetLod: LODLevel): Promise<void> {
    const currentLod = this.activeLODs.get(entityId);
    if (currentLod === targetLod) return;

    const record = this.entityManager.getRecord(entityId);
    const mesh = this.entityManager.getMesh(entityId);
    if (!record || !mesh) return;

    let targetGeometry = this.assetManager.getCachedGeometry(record.assetId, targetLod);
    if (!targetGeometry) {
      // Async fetch & decode if not yet in cache
      const loaded = await this.assetManager.loadAsset(record.assetId, targetLod);
      targetGeometry = loaded.geometry;
    }

    // Swap geometry safely
    mesh.geometry = targetGeometry;
    mesh.userData.activeLOD = targetLod;
    this.activeLODs.set(entityId, targetLod);

    this.notifyListeners(entityId, targetLod);
  }

  public getEntityLODState(entityId: string, camera?: THREE.Camera): LODState | null {
    const record = this.entityManager.getRecord(entityId);
    const mesh = this.entityManager.getMesh(entityId);
    if (!record || !mesh) return null;

    let distanceMm = this.lastDistances.get(entityId) ?? 0;
    if (camera) {
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);
      const centroid = new THREE.Vector3(
        record.canonicalCentroidMm[0],
        record.canonicalCentroidMm[1],
        record.canonicalCentroidMm[2]
      );
      distanceMm = cameraPos.distanceTo(centroid);
    }

    const activeLevel = this.activeLODs.get(entityId) || 'lod0';
    const triangleCount = mesh.geometry.index
      ? mesh.geometry.index.count / 3
      : (mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count / 3 : 0);

    return {
      mode: this.mode,
      activeLevel,
      distanceMm,
      triangleCount
    };
  }

  public onLODChanged(listener: LODChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(entityId: string, level: LODLevel): void {
    for (const listener of this.listeners) {
      try {
        listener(entityId, level);
      } catch (err) {
        console.error('[LODManager] Listener error:', err);
      }
    }
  }

  public dispose(): void {
    this.listeners.clear();
    this.activeLODs.clear();
    this.lastDistances.clear();
  }
}
