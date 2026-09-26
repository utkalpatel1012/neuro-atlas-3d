/**
 * 3D Neuroanatomy Atlas: Resource and Memory Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Implements reference-counted resource tracking and deterministic GPU resource disposal
 * (BufferGeometry, BVH bounds trees, Materials, and Textures) preventing VRAM leaks.
 */

import * as THREE from 'three';

interface TrackedResource {
  refCount: number;
  resource: THREE.BufferGeometry | THREE.Material | THREE.Texture;
  type: 'geometry' | 'material' | 'texture';
}

export class ResourceManager {
  private resources: Map<string, TrackedResource> = new Map();

  /**
   * Registers or increments the reference count of a GPU resource.
   */
  public retain(
    key: string,
    resource: THREE.BufferGeometry | THREE.Material | THREE.Texture,
    type: 'geometry' | 'material' | 'texture'
  ): void {
    const existing = this.resources.get(key);
    if (existing) {
      existing.refCount++;
    } else {
      this.resources.set(key, {
        refCount: 1,
        resource,
        type
      });
    }
  }

  /**
   * Decrements reference count, disposing GPU buffers when refCount drops to 0.
   */
  public release(key: string): boolean {
    const entry = this.resources.get(key);
    if (!entry) return false;

    entry.refCount--;
    if (entry.refCount <= 0) {
      this.disposeResource(entry.resource, entry.type);
      this.resources.delete(key);
      return true; // Disposed
    }
    return false; // Still referenced
  }

  /**
   * Safely disposes a Three.js Mesh, its geometry (including BVH bounds tree), and its material.
   */
  public disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      if (typeof (mesh.geometry as any).disposeBoundsTree === 'function') {
        (mesh.geometry as any).disposeBoundsTree();
      }
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }

    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  }

  /**
   * Recursively traverses and disposes an Object3D hierarchy.
   */
  public disposeObject(root: THREE.Object3D): void {
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        this.disposeMesh(child as THREE.Mesh);
      }
    });

    if (root.parent) {
      root.parent.remove(root);
    }
  }

  private disposeResource(
    resource: THREE.BufferGeometry | THREE.Material | THREE.Texture,
    type: 'geometry' | 'material' | 'texture'
  ): void {
    if (type === 'geometry') {
      const geom = resource as THREE.BufferGeometry;
      if (typeof (geom as any).disposeBoundsTree === 'function') {
        (geom as any).disposeBoundsTree();
      }
      geom.dispose();
    } else if (type === 'material') {
      const mat = resource as THREE.Material;
      mat.dispose();
    } else if (type === 'texture') {
      const tex = resource as THREE.Texture;
      tex.dispose();
    }
  }

  public getResidentCount(): number {
    return this.resources.size;
  }

  public getRefCount(key: string): number {
    return this.resources.get(key)?.refCount ?? 0;
  }

  /**
   * Complete purge of all tracked GPU resources.
   */
  public disposeAll(): void {
    for (const entry of this.resources.values()) {
      this.disposeResource(entry.resource, entry.type);
    }
    this.resources.clear();
  }
}
