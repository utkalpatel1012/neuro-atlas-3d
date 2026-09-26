/**
 * 3D Neuroanatomy Atlas: Asset Loader & Cache Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Reusable manifest-driven anatomical asset loader:
 * - Decodes glTF 2.0 Binary (.glb) with EXT_meshopt_compression via MeshoptDecoder
 * - Generates three-mesh-bvh bounding volume trees for spatial raycasting
 * - Caches multi-resolution LOD geometries (LOD0 - LOD3)
 * - Obtains asset metadata and lineage strictly from asset manifests
 * - Works in browser (fetch) and Node test environments (fs)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { LODLevel } from './types';
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
      return this.manifest;
    } catch (err: any) {
      throw new Error(`[ASSET MANAGER] Failed to load asset manifest: ${err.message}`);
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

  /**
   * Loads an anatomical mesh at the specified LOD level.
   */
  public async loadAsset(assetId: string, lod: LODLevel = 'lod0'): Promise<LoadedMeshResult> {
    const cacheKey = `${assetId}:${lod}`;
    let geometry = this.geometryCache.get(cacheKey);

    if (!geometry) {
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
      // Ensure normals and bounding box exist
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
    }

    const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
    const triangleCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;

    // Create a new mesh instance referencing the cached geometry
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
        // Try fallback to relative url
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
  }
}
