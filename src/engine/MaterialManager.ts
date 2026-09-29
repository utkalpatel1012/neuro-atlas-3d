/**
 * 3D Neuroanatomy Atlas: Anatomical Material System
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Manages anatomical shader states (default, hover, selected, ghosted, hidden).
 * Visual states remain strictly external to anatomical geometry assets.
 * Uses restrained medical visualization language, avoiding video game aesthetics.
 */

import * as THREE from 'three';
import { EntityVisualState } from './types';

export interface MaterialOptions {
  baseColor?: number | string;
  roughness?: number;
  metalness?: number;
  /**
   * Visibility fix: translucent cutaway-style material for cavity casts
   * (ventricular CSF spaces). Opaque rendering made cavities read as solid
   * lumps of tissue — the opposite of what they are.
   */
  translucent?: boolean;
}

export class MaterialManager {
  private baseMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private activeStates: Map<string, EntityVisualState> = new Map();

  // Anatomical Color Palette
  public static readonly DEFAULT_HIPPOCAMPUS_COLOR = 0xD4A373; // Anatomical allocortex / limbic beige
  public static readonly HOVER_EMISSIVE_COLOR = 0x38BDF8;      // Subtle cyan accent
  public static readonly SELECTED_EMISSIVE_COLOR = 0x0EA5E9;   // Distinct medical selection glow
  public static readonly GROUP_SELECTED_EMISSIVE_COLOR = 0x0284C7; // Group selection glow
  public static readonly GHOST_COLOR = 0x64748B;               // Slate gray ghost for isolated views

  /**
   * Registers a base material for an anatomical structure.
   */
  public registerEntityMaterial(
    entityId: string,
    options: MaterialOptions = {}
  ): THREE.MeshStandardMaterial {
    const translucent = options.translucent === true;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.baseColor ?? MaterialManager.DEFAULT_HIPPOCAMPUS_COLOR),
      roughness: options.roughness ?? 0.65,
      metalness: options.metalness ?? 0.08,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      transparent: translucent,
      opacity: translucent ? 0.35 : 1.0,
      depthWrite: !translucent,
      side: translucent ? THREE.DoubleSide : THREE.FrontSide
    });

    mat.name = `Mat_${entityId}`;
    this.baseMaterials.set(entityId, mat);
    this.activeStates.set(entityId, 'DEFAULT');

    return mat;
  }

  /**
   * Applies a visual state to an anatomical mesh.
   */
  public setEntityState(mesh: THREE.Mesh, entityId: string, state: EntityVisualState): void {
    let mat = this.baseMaterials.get(entityId);
    if (!mat) {
      if ((mesh.material as THREE.MeshStandardMaterial)?.emissive) {
        mat = mesh.material as THREE.MeshStandardMaterial;
      } else {
        mat = this.registerEntityMaterial(entityId);
        mesh.material = mat;
      }
    }

    this.activeStates.set(entityId, state);

    switch (state) {
      case 'HOVER':
        if (mat.emissive) mat.emissive.setHex(MaterialManager.HOVER_EMISSIVE_COLOR);
        mat.emissiveIntensity = 0.22;
        mat.roughness = 0.55;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mesh.visible = true;
        break;

      case 'SELECTED':
        if (mat.emissive) mat.emissive.setHex(MaterialManager.SELECTED_EMISSIVE_COLOR);
        mat.emissiveIntensity = 0.40;
        mat.roughness = 0.42;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mesh.visible = true;
        break;

      case 'GROUP_SELECTED':
        if (mat.emissive) mat.emissive.setHex(MaterialManager.GROUP_SELECTED_EMISSIVE_COLOR);
        mat.emissiveIntensity = 0.28;
        mat.roughness = 0.48;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mesh.visible = true;
        break;

      case 'GHOSTED':
        if (mat.emissive) mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        if (mat.color) mat.color.setHex(MaterialManager.GHOST_COLOR);
        mat.transparent = true;
        mat.opacity = 0.12;
        mat.depthWrite = false;
        mesh.visible = true;
        break;

      case 'HIDDEN':
        mesh.visible = false;
        break;

      case 'DEFAULT':
      default:
        if (mat.color) mat.color.setHex(MaterialManager.DEFAULT_HIPPOCAMPUS_COLOR);
        if (mat.emissive) mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.roughness = 0.65;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mesh.visible = true;
        break;
    }

    mat.needsUpdate = true;
  }

  /**
   * Convenience method to apply visual state directly to a mesh.
   */
  public applyVisualState(mesh: THREE.Mesh, state: EntityVisualState): void {
    const entityId = mesh.userData?.neuroAtlas?.entityId ?? 'default';
    this.setEntityState(mesh, entityId, state);
  }

  public getEntityState(entityId: string): EntityVisualState {
    return this.activeStates.get(entityId) || 'DEFAULT';
  }

  public getMaterial(entityId: string): THREE.MeshStandardMaterial | undefined {
    return this.baseMaterials.get(entityId);
  }

  public disposeEntity(entityId: string): void {
    const mat = this.baseMaterials.get(entityId);
    if (mat) {
      mat.dispose();
      this.baseMaterials.delete(entityId);
      this.activeStates.delete(entityId);
    }
  }

  public dispose(): void {
    for (const mat of this.baseMaterials.values()) {
      mat.dispose();
    }
    this.baseMaterials.clear();
    this.activeStates.clear();
  }
}
