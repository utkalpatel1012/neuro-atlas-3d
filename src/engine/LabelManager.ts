/**
 * 3D Neuroanatomy Atlas: Scalable 3D Screen-Space Label Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 3 Macroanatomy Foundation)
 * 
 * Projects 3D anatomical anchor coordinates into 2D screen space with:
 * - Distance-based priority culling (LOD for annotations)
 * - Anatomical surface normal occlusion testing (backface / medial culling)
 * - Screen-space 2D collision decluttering
 * - Laterality and anatomical category filtering
 */

import * as THREE from 'three';
import { AnatomicalLandmark, CEREBRAL_LANDMARKS } from '../types/semantic';

export type LabelCategory = 'STRUCTURE' | 'LOBE' | 'SULCUS' | 'GYRUS' | 'LANDMARK' | 'POLE';

export interface ProjectedLabel {
  id: string;
  name: string;
  latinName?: string;
  category: LabelCategory;
  laterality: 'left' | 'right' | 'midline' | 'bilateral';
  priority: number;
  worldPosition: THREE.Vector3;
  normalVector?: THREE.Vector3;
  screenPosition: {
    x: number;
    y: number;
    depth: number;
  };
  isVisible: boolean;
  isOccluded: boolean;
  isCulledByDistance: boolean;
  isCulledByCollision: boolean;
  description?: string;
  associatedEntityId?: string;
}

export interface LabelFilterOptions {
  showLeft: boolean;
  showRight: boolean;
  showMidline: boolean;
  showSulci: boolean;
  showGyri: boolean;
  showPoles: boolean;
  showStructures: boolean;
  maxLabelsVisible: number;
}

export class LabelManager {
  private labels: Map<string, ProjectedLabel> = new Map();
  private filterOptions: LabelFilterOptions = {
    showLeft: true,
    showRight: true,
    showMidline: true,
    showSulci: true,
    showGyri: true,
    showPoles: true,
    showStructures: true,
    maxLabelsVisible: 20
  };

  private tempVec = new THREE.Vector3();
  private tempCamDir = new THREE.Vector3();
  private isEnabled = true;

  constructor() {
    this.initDefaultLandmarks();
  }

  /**
   * Initializes landmark labels from the canonical landmark registry.
   * Phase 3.1 (D7): registry anchors are SCHEMATIC_UNVALIDATED label guides, not
   * measured localizations — labels are orientation aids, never anatomical proof.
   */
  public initDefaultLandmarks(): void {
    for (const lm of CEREBRAL_LANDMARKS) {
      this.registerLandmark(lm);
    }
  }

  /**
   * Registers an individual anatomical landmark as a candidate label.
   */
  public registerLandmark(lm: AnatomicalLandmark, associatedEntityId?: string): void {
    let cat: LabelCategory = 'LANDMARK';
    if (lm.category === 'SULCAL_LANDMARK' || lm.category === 'FISSURE') cat = 'SULCUS';
    else if (lm.category === 'GYRAL_LANDMARK') cat = 'GYRUS';
    else if (lm.category === 'CORTICAL_POLE') cat = 'POLE';

    const projected: ProjectedLabel = {
      id: lm.landmarkId,
      name: lm.name,
      latinName: lm.officialLatin,
      category: cat,
      laterality: lm.laterality,
      priority: lm.priority,
      worldPosition: new THREE.Vector3(...lm.worldPositionMm),
      normalVector: lm.normalVector ? new THREE.Vector3(...lm.normalVector).normalize() : undefined,
      screenPosition: { x: 0, y: 0, depth: 1 },
      isVisible: false,
      isOccluded: false,
      isCulledByDistance: false,
      isCulledByCollision: false,
      description: lm.description,
      associatedEntityId
    };

    this.labels.set(projected.id, projected);
  }

  /**
   * Registers a high-level anatomical structure label (e.g. Hippocampus, Cortex).
   */
  public registerStructureLabel(params: {
    id: string;
    name: string;
    latinName?: string;
    laterality: 'left' | 'right' | 'midline' | 'bilateral';
    worldPositionMm: [number, number, number];
    priority?: number;
    associatedEntityId?: string;
  }): void {
    const projected: ProjectedLabel = {
      id: params.id,
      name: params.name,
      latinName: params.latinName,
      category: 'STRUCTURE',
      laterality: params.laterality,
      priority: params.priority ?? 1,
      worldPosition: new THREE.Vector3(...params.worldPositionMm),
      screenPosition: { x: 0, y: 0, depth: 1 },
      isVisible: false,
      isOccluded: false,
      isCulledByDistance: false,
      isCulledByCollision: false,
      associatedEntityId: params.associatedEntityId
    };
    this.labels.set(projected.id, projected);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setFilters(options: Partial<LabelFilterOptions>): void {
    this.filterOptions = { ...this.filterOptions, ...options };
  }

  public getFilters(): LabelFilterOptions {
    return { ...this.filterOptions };
  }

  /**
   * Projects all 3D labels to screen space, performing:
   * 1. Frustum & behind-camera culling
   * 2. Anatomical normal occlusion test
   * 3. Distance-based priority culling
   * 4. 2D screen-space decluttering / collision resolution
   */
  public update(camera: THREE.Camera, viewportWidth: number, viewportHeight: number): void {
    if (!this.isEnabled || viewportWidth <= 0 || viewportHeight <= 0) {
      for (const label of this.labels.values()) {
        label.isVisible = false;
      }
      return;
    }

    camera.getWorldDirection(this.tempCamDir);
    const cameraPos = camera.position;

    // Estimate observation distance to scene center (origin)
    const cameraDistanceMm = cameraPos.length();

    // Priority threshold based on camera distance
    // Far (> 240mm): Only priority 1
    // Medium (120-240mm): Priority 1 and 2
    // Closeup (< 120mm): Priority 1, 2, and 3
    let maxAllowedPriority = 3;
    if (cameraDistanceMm > 240.0) {
      maxAllowedPriority = 1;
    } else if (cameraDistanceMm > 140.0) {
      maxAllowedPriority = 2;
    }

    const candidateLabels: ProjectedLabel[] = [];

    for (const label of this.labels.values()) {
      // Category / Laterality filter check
      if (!this.matchesFilters(label)) {
        label.isVisible = false;
        continue;
      }

      // Priority distance LOD check
      if (label.priority > maxAllowedPriority) {
        label.isCulledByDistance = true;
        label.isVisible = false;
        continue;
      }
      label.isCulledByDistance = false;

      // Project 3D point to NDC [-1, 1]
      this.tempVec.copy(label.worldPosition);
      this.tempVec.project(camera);

      // Frustum culling: check if outside viewport NDC or behind near plane
      if (
        this.tempVec.z > 1.0 ||
        this.tempVec.z < -1.0 ||
        this.tempVec.x < -0.95 ||
        this.tempVec.x > 0.95 ||
        this.tempVec.y < -0.95 ||
        this.tempVec.y > 0.95
      ) {
        label.isVisible = false;
        continue;
      }

      // Convert NDC to screen pixel coordinates
      const screenX = ((this.tempVec.x + 1) / 2) * viewportWidth;
      const screenY = ((-this.tempVec.y + 1) / 2) * viewportHeight;

      label.screenPosition.x = Math.round(screenX);
      label.screenPosition.y = Math.round(screenY);
      label.screenPosition.depth = this.tempVec.z;

      // Surface Normal Occlusion Test
      // If landmark has outward surface normal, test if it faces away from camera
      if (label.normalVector) {
        const viewVec = cameraPos.clone().sub(label.worldPosition).normalize();
        const dot = label.normalVector.dot(viewVec);
        // If facing away from camera (dot < -0.15), it is on the back or hidden medial surface
        if (dot < -0.15) {
          label.isOccluded = true;
          label.isVisible = false;
          continue;
        }
      }
      label.isOccluded = false;

      candidateLabels.push(label);
    }

    // Sort candidate labels by priority (1 first) then by depth (closer to camera first)
    candidateLabels.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.screenPosition.depth - b.screenPosition.depth;
    });

    // 2D Screen-space decluttering / collision culling
    const occupiedRects: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let visibleCount = 0;

    for (const label of candidateLabels) {
      if (visibleCount >= this.filterOptions.maxLabelsVisible) {
        label.isCulledByCollision = true;
        label.isVisible = false;
        continue;
      }

      // Approximate label bounding box: ~120px wide by 28px high
      const w = 110;
      const h = 26;
      const x1 = label.screenPosition.x - w / 2;
      const y1 = label.screenPosition.y - h / 2;
      const x2 = label.screenPosition.x + w / 2;
      const y2 = label.screenPosition.y + h / 2;

      let collides = false;
      for (const rect of occupiedRects) {
        // Standard AABB intersection test with 6px margin
        if (
          x1 < rect.x2 + 6 &&
          x2 > rect.x1 - 6 &&
          y1 < rect.y2 + 6 &&
          y2 > rect.y1 - 6
        ) {
          collides = true;
          break;
        }
      }

      if (collides) {
        label.isCulledByCollision = true;
        label.isVisible = false;
      } else {
        label.isCulledByCollision = false;
        label.isVisible = true;
        occupiedRects.push({ x1, y1, x2, y2 });
        visibleCount++;
      }
    }
  }

  private matchesFilters(label: ProjectedLabel): boolean {
    if (label.laterality === 'left' && !this.filterOptions.showLeft) return false;
    if (label.laterality === 'right' && !this.filterOptions.showRight) return false;
    if (label.laterality === 'midline' && !this.filterOptions.showMidline) return false;

    if (label.category === 'SULCUS' && !this.filterOptions.showSulci) return false;
    if (label.category === 'GYRUS' && !this.filterOptions.showGyri) return false;
    if (label.category === 'POLE' && !this.filterOptions.showPoles) return false;
    if (label.category === 'STRUCTURE' && !this.filterOptions.showStructures) return false;

    return true;
  }

  public getVisibleLabels(): ProjectedLabel[] {
    const res: ProjectedLabel[] = [];
    for (const l of this.labels.values()) {
      if (l.isVisible) res.push(l);
    }
    return res;
  }

  public getAllLabels(): ProjectedLabel[] {
    return Array.from(this.labels.values());
  }

  public getLabel(id: string): ProjectedLabel | undefined {
    return this.labels.get(id);
  }

  public clear(): void {
    this.labels.clear();
  }
}
