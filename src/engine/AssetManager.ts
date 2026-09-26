/**
 * 3D Neuroanatomy Atlas: Asset Loader & Cache Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.1 Multi-Structure Foundation)
 * 
 * Reusable manifest-driven anatomical asset loader:
 * - Decodes glTF 2.0 Binary (.glb) with EXT_meshopt_compression via MeshoptDecoder
 * - Generates three-mesh-bvh bounding volume trees for spatial raycasting
 * - Caches multi-resolution LOD geometries (LOD0 - LOD3)
 * - Tracks per-asset loading states (NOT_LOADED, LOADING, LOADED, FAILED, UNLOADING, CACHED)
 * - Reference-counted asset caching preventing premature GPU deallocation
 * - Deterministic error isolation preventing cascade failures
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { AssetLoadingState, LODLevel } from './types';
import { AssetsManifest, AssetProvenance } from '../types/provenance';

// Initialize BVH raycasting extensions onto Three.js prototypes
(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

export interface LoadedMeshResult {
  assetId: string;
  lod: LODLevel;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
  triangleCount: number;
  vertexCount: number;
}

export class AssetManager {
  private gltfLoader: GLTFLoader;
  private manifest: AssetsManifest | null = null;
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private loadingStates: Map<string, AssetLoadingState> = new Map();
  private failureReasons: Map<string, string> = new Map();
  private refCounts: Map<string, number> = new Map();
  private assetBaseUrl: string;

  constructor(assetBaseUrl = '') {
    this.assetBaseUrl = assetBaseUrl;
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * Loads or registers the master asset manifest.
   */
  public async loadManifest(manifestOrUrl: AssetsManifest | string = 'assets/manifests/assets.manifest.json'): Promise<AssetsManifest> {
    if (typeof manifestOrUrl === 'object') {
      this.manifest = manifestOrUrl;
      this.initManifestStates();
      return this.manifest;
    }

    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const url = this.assetBaseUrl ? `${this.assetBaseUrl}/${manifestOrUrl}` : manifestOrUrl;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching manifest from ${url}`);
        this.manifest = (await res.json()) as AssetsManifest;
      } else {
        // Node / test environment fallback
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.resolve(process.cwd(), manifestOrUrl);
        const data = fs.readFileSync(localPath, 'utf8');
        this.manifest = JSON.parse(data) as AssetsManifest;
      }
      this.initManifestStates();
      return this.manifest;
    } catch (err: any) {
      throw new Error(`[ASSET MANAGER] Failed to load asset manifest: ${err.message}`);
    }
  }

  private initManifestStates(): void {
    if (!this.manifest) return;
    for (const assetId of Object.keys(this.manifest.assets)) {
      if (!this.loadingStates.has(assetId)) {
        this.loadingStates.set(assetId, 'NOT_LOADED');
      }
    }
  }

  /**
   * Retrieves asset metadata record from manifest.
   */
  public getAssetProvenance(assetId: string): AssetProvenance {
    if (!this.manifest || !this.manifest.assets[assetId]) {
      throw new Error(`Asset ID "${assetId}" is not registered in the active manifest.`);
    }
    return this.manifest.assets[assetId];
  }

  public getAssetLoadingState(assetId: string): AssetLoadingState {
    return this.loadingStates.get(assetId) || 'NOT_LOADED';
  }

  public getAllLoadingStates(): Map<string, AssetLoadingState> {
    return new Map(this.loadingStates);
  }

  public getAssetFailureReason(assetId: string): string | undefined {
    return this.failureReasons.get(assetId);
  }

  public getRefCount(assetId: string): number {
    return this.refCounts.get(assetId) || 0;
  }

  public getLoadedCount(): number {
    let count = 0;
    for (const state of this.loadingStates.values()) {
      if (state === 'LOADED' || state === 'CACHED') count++;
    }
    return count;
  }

  public getFailedCount(): number {
    let count = 0;
    for (const state of this.loadingStates.values()) {
      if (state === 'FAILED') count++;
    }
    return count;
  }

  /**
   * Loads an anatomical mesh at the specified LOD level.
   * Tracks loading lifecycle state and provides error isolation.
   */
  public async loadAsset(assetId: string, lod: LODLevel = 'lod0'): Promise<LoadedMeshResult> {
    const cacheKey = `${assetId}:${lod}`;
    let geometry = this.geometryCache.get(cacheKey);

    if (geometry) {
      // Retain reference
      const curRef = this.refCounts.get(assetId) || 0;
      this.refCounts.set(assetId, curRef + 1);
      this.loadingStates.set(assetId, 'LOADED');

      const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
      const triangleCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;

      const mesh = new THREE.Mesh(geometry);
      mesh.name = `Mesh_${assetId.replace(/\./g, '_')}_${lod.toUpperCase()}`;

      return {
        assetId,
        lod,
        geometry,
        mesh,
        triangleCount,
        vertexCount
      };
    }

    this.loadingStates.set(assetId, 'LOADING');

    try {
      const arrayBuffer = await this.fetchAssetBuffer(assetId, lod);
      const gltf = await this.gltfLoader.parseAsync(arrayBuffer, '');

      let foundMesh: THREE.Mesh | null = null;
      gltf.scene.traverse((child) => {
        if (!foundMesh && (child as THREE.Mesh).isMesh) {
          foundMesh = child as THREE.Mesh;
        }
      });

      if (!foundMesh) {
        throw new Error(`No 3D Mesh found inside asset container for ${assetId}:${lod}`);
      }

      geometry = (foundMesh as THREE.Mesh).geometry;
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      // Compute spatial BVH tree for micro-second accelerated picking
      if (typeof (geometry as any).computeBoundsTree === 'function') {
        (geometry as any).computeBoundsTree();
      }

      this.geometryCache.set(cacheKey, geometry);

      // Increment reference count
      const curRef = this.refCounts.get(assetId) || 0;
      this.refCounts.set(assetId, curRef + 1);
      this.loadingStates.set(assetId, 'LOADED');
      this.failureReasons.delete(assetId);

      const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
      const triangleCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;

      const mesh = new THREE.Mesh(geometry);
      mesh.name = `Mesh_${assetId.replace(/\./g, '_')}_${lod.toUpperCase()}`;

      return {
        assetId,
        lod,
        geometry,
        mesh,
        triangleCount,
        vertexCount
      };
    } catch (err: any) {
      this.loadingStates.set(assetId, 'FAILED');
      this.failureReasons.set(assetId, err.message);
      throw err;
    }
  }

  /**
   * Loads all 4 multi-resolution LODs for an asset into the cache.
   */
  public async preloadAllLODs(assetId: string): Promise<Record<LODLevel, THREE.BufferGeometry>> {
    const lods: LODLevel[] = ['lod0', 'lod1', 'lod2', 'lod3'];
    const results: Partial<Record<LODLevel, THREE.BufferGeometry>> = {};

    await Promise.all(
      lods.map(async (lod) => {
        const res = await this.loadAsset(assetId, lod);
        results[lod] = res.geometry;
      })
    );

    return results as Record<LODLevel, THREE.BufferGeometry>;
  }

  /**
   * Retrieves array buffer from network or local filesystem.
   */
  private async fetchAssetBuffer(assetId: string, lod: LODLevel): Promise<ArrayBuffer> {
    const relativePath = `assets/derived/${assetId}/runtime/${assetId}.${lod}.meshopt.glb`;

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      const url = this.assetBaseUrl ? `${this.assetBaseUrl}/${relativePath}` : `/${relativePath}`;
      const res = await fetch(url);
      if (!res.ok) {
        // Fallback to relative URL
        const fallbackRes = await fetch(relativePath);
        if (!fallbackRes.ok) {
          throw new Error(`Failed to load asset buffer from ${url}: HTTP ${res.status}`);
        }
        return await fallbackRes.arrayBuffer();
      }
      return await res.arrayBuffer();
    } else {
      // Node / test execution
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Local asset file not found at ${fullPath}`);
      }
      const buffer = fs.readFileSync(fullPath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
  }

  public getCachedGeometry(assetId: string, lod: LODLevel): THREE.BufferGeometry | undefined {
    return this.geometryCache.get(`${assetId}:${lod}`);
  }

  /**
   * Decrements reference count and disposes GPU resources when reference drops to 0.
   */
  public unloadAsset(assetId: string): boolean {
    const curRef = this.refCounts.get(assetId) || 0;
    if (curRef <= 1) {
      this.refCounts.set(assetId, 0);
      this.loadingStates.set(assetId, 'UNLOADING');
      this.disposeAsset(assetId);
      this.loadingStates.set(assetId, 'NOT_LOADED');
      return true; // Disposed
    }

    this.refCounts.set(assetId, curRef - 1);
    return false; // Still referenced
  }

  public disposeAsset(assetId: string): void {
    const lods: LODLevel[] = ['lod0', 'lod1', 'lod2', 'lod3'];
    for (const lod of lods) {
      const key = `${assetId}:${lod}`;
      const geom = this.geometryCache.get(key);
      if (geom) {
        if (typeof (geom as any).disposeBoundsTree === 'function') {
          (geom as any).disposeBoundsTree();
        }
        geom.dispose();
        this.geometryCache.delete(key);
      }
    }
  }

  public dispose(): void {
    for (const geom of this.geometryCache.values()) {
      if (typeof (geom as any).disposeBoundsTree === 'function') {
        (geom as any).disposeBoundsTree();
      }
      geom.dispose();
    }
    this.geometryCache.clear();
    this.refCounts.clear();
    this.loadingStates.clear();
    this.failureReasons.clear();
  }
}
