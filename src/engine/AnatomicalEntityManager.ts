/**
 * 3D Neuroanatomy Atlas: Anatomical Entity Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Establishes an explicit two-way mapping:
 *   Anatomical Entity (Semantic identity & knowledge)
 *       ↕
 *   Physical Asset (Cryptographic lineage & LOD models)
 *       ↕
 *   Runtime Object3D (Interactive Three.js scene graph node)
 * 
 * Guarantees that mesh names are never used as authoritative identity.
 */

import * as THREE from 'three';
import { AnatomicalEntityRecord } from './types';

export class AnatomicalEntityManager {
  private entityRecords: Map<string, AnatomicalEntityRecord> = new Map();
  private entityToMesh: Map<string, THREE.Mesh> = new Map();
  private meshToEntity: Map<THREE.Mesh, string> = new Map();

  /**
   * Registers an anatomical entity and attaches provenance metadata to Object3D.userData.
   */
  public registerEntity(record: AnatomicalEntityRecord, mesh: THREE.Mesh): void {
    this.entityRecords.set(record.entityId, record);
    this.entityToMesh.set(record.entityId, mesh);
    this.meshToEntity.set(mesh, record.entityId);

    // Attach immutable metadata reference onto Object3D userData
    mesh.userData.neuroAtlas = {
      entityId: record.entityId,
      assetId: record.assetId,
      canonicalName: record.name,
      latinName: record.officialLatin,
      laterality: record.laterality,
      volumeCm3: record.volumeCm3,
      upstreamDataset: record.upstreamDataset,
      upstreamLicense: record.upstreamLicense,
      validationStatus: record.validationStatus
    };
  }

  /**
   * Resolves semantic anatomical entity from an intersected Three.js Mesh.
   */
  public getEntityByMesh(mesh: THREE.Mesh): AnatomicalEntityRecord | undefined {
    const entityId = this.meshToEntity.get(mesh) || mesh.userData?.neuroAtlas?.entityId;
    if (!entityId) return undefined;
    return this.entityRecords.get(entityId);
  }

  /**
   * Resolves semantic anatomical entity by its canonical entity ID.
   */
  public getEntityById(entityId: string): AnatomicalEntityRecord | undefined {
    return this.entityRecords.get(entityId);
  }

  public getRecord(entityId: string): AnatomicalEntityRecord | null {
    return this.entityRecords.get(entityId) || null;
  }

  public hasEntity(entityId: string): boolean {
    return this.entityRecords.has(entityId);
  }

  /**
   * Resolves runtime Three.js Mesh by its canonical entity ID.
   */
  public getMeshByEntityId(entityId: string): THREE.Mesh | undefined {
    return this.entityToMesh.get(entityId);
  }

  public getMesh(entityId: string): THREE.Mesh | null {
    return this.entityToMesh.get(entityId) || null;
  }

  /**
   * Returns all registered anatomical entity records.
   */
  public getAllEntities(): AnatomicalEntityRecord[] {
    return Array.from(this.entityRecords.values());
  }

  public getAllRecords(): AnatomicalEntityRecord[] {
    return Array.from(this.entityRecords.values());
  }

  public getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.entityToMesh.values());
  }

  public getEntityCount(): number {
    return this.entityRecords.size;
  }

  /**
   * Updates the runtime mesh associated with an entity ID (e.g. during LOD hot-swaps).
   */
  public updateEntityMesh(entityId: string, newMesh: THREE.Mesh): void {
    const oldMesh = this.entityToMesh.get(entityId);
    if (oldMesh) {
      this.meshToEntity.delete(oldMesh);
    }
    const record = this.entityRecords.get(entityId);
    if (record) {
      this.registerEntity(record, newMesh);
    }
  }

  /**
   * Unregisters an entity and clears mappings.
   */
  public unregisterEntity(entityId: string): void {
    const mesh = this.entityToMesh.get(entityId);
    if (mesh) {
      this.meshToEntity.delete(mesh);
      if (mesh.userData.neuroAtlas) {
        delete mesh.userData.neuroAtlas;
      }
    }
    this.entityToMesh.delete(entityId);
    this.entityRecords.delete(entityId);
  }

  public clear(): void {
    this.entityRecords.clear();
    this.entityToMesh.clear();
    this.meshToEntity.clear();
  }
}
