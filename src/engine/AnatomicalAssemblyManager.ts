/**
 * 3D Neuroanatomy Atlas: Anatomical Assembly Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.1 Multi-Structure Foundation)
 * 
 * Manages the semantic anatomical hierarchy, data-driven group relationships,
 * hierarchical visibility derivation, and multi-entity selection.
 * Remains strictly decoupled from material rendering and GPU buffers.
 */

import * as THREE from 'three';
import {
  AnatomicalEntityRecord,
  AnatomicalGroup,
  EntityRepresentation,
  GroupSemanticType,
  MultiSelectionState,
  VisibilityState
} from './types';

export type SelectionChangeListener = (state: MultiSelectionState) => void;
export type VisibilityChangeListener = () => void;
export type AssemblyChangeListener = () => void;

export class AnatomicalAssemblyManager {
  private entities: Map<string, AnatomicalEntityRecord> = new Map();
  private groups: Map<string, AnatomicalGroup> = new Map();
  private entityToGroups: Map<string, Set<string>> = new Map();
  private entityMeshes: Map<string, THREE.Mesh> = new Map();
  private entityRepresentations: Map<string, EntityRepresentation[]> = new Map();

  // Visibility state
  private hiddenEntityIds: Set<string> = new Set();
  private hiddenGroupIds: Set<string> = new Set();
  private isolatedEntityId: string | null = null;
  private isolatedGroupId: string | null = null;

  // Selection state
  private selectedEntityIds: Set<string> = new Set();
  private selectedGroupIds: Set<string> = new Set();
  private primarySelectedEntityId: string | null = null;
  private primarySelectedGroupId: string | null = null;

  // Event listeners
  private selectionListeners: Set<SelectionChangeListener> = new Set();
  private visibilityListeners: Set<VisibilityChangeListener> = new Set();
  private assemblyListeners: Set<AssemblyChangeListener> = new Set();

  constructor() {
    this.initDefaultHierarchy();
  }

  /**
   * Initializes standard, data-driven neuroanatomical hierarchy skeleton.
   */
  private initDefaultHierarchy(): void {
    // 1. Major Structural Divisions (Physical Containment)
    this.registerGroup({
      groupId: 'division.cerebrum',
      name: 'Cerebrum',
      semanticType: 'STRUCTURAL_CONTAINER',
      category: 'division',
      childGroupIds: ['hemisphere.left', 'hemisphere.right'],
      memberEntityIds: [],
      status: 'PARTIALLY_AVAILABLE',
      description: 'Telencephalic cerebral cortex and subcortical structures'
    });

    this.registerGroup({
      groupId: 'division.cerebellum',
      name: 'Cerebellum',
      semanticType: 'STRUCTURAL_CONTAINER',
      category: 'division',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'UNAVAILABLE',
      description: 'Cerebellar hemispheres and vermis (Asset pending)'
    });

    this.registerGroup({
      groupId: 'division.brainstem',
      name: 'Brainstem',
      semanticType: 'STRUCTURAL_CONTAINER',
      category: 'division',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'UNAVAILABLE',
      description: 'Midbrain, pons, and medulla oblongata (Asset pending)'
    });

    // 2. Hemispheres (Physical Structural Containment)
    this.registerGroup({
      groupId: 'hemisphere.left',
      name: 'Left Hemisphere',
      semanticType: 'STRUCTURAL_CONTAINER',
      category: 'hemisphere',
      parentGroupId: 'division.cerebrum',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'PARTIALLY_AVAILABLE'
    });

    this.registerGroup({
      groupId: 'hemisphere.right',
      name: 'Right Hemisphere',
      semanticType: 'STRUCTURAL_CONTAINER',
      category: 'hemisphere',
      parentGroupId: 'division.cerebrum',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'PARTIALLY_AVAILABLE'
    });

    // 3. Bilateral Functional / Anatomical System (Functional Membership - NOT structural container)
    this.registerGroup({
      groupId: 'system.limbic',
      name: 'Limbic System (Bilateral)',
      semanticType: 'FUNCTIONAL_SYSTEM',
      category: 'system',
      childGroupIds: ['system.limbic.left', 'system.limbic.right'],
      memberEntityIds: [],
      status: 'AVAILABLE',
      description: 'Allocortical and nuclear network subserving memory and emotion'
    });

    // 4. Lateralized Subsystems (Functional Subsystems)
    this.registerGroup({
      groupId: 'system.limbic.left',
      name: 'Limbic System (Left)',
      semanticType: 'FUNCTIONAL_SYSTEM',
      category: 'system',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'AVAILABLE'
    });

    this.registerGroup({
      groupId: 'system.limbic.right',
      name: 'Limbic System (Right)',
      semanticType: 'FUNCTIONAL_SYSTEM',
      category: 'system',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'AVAILABLE'
    });

    // 5. Anatomical Region (Conceptual / Topographical Zone)
    this.registerGroup({
      groupId: 'region.medial_temporal',
      name: 'Medial Temporal Region',
      semanticType: 'ANATOMICAL_REGION',
      category: 'region',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'AVAILABLE',
      description: 'Medial temporal lobe structures including hippocampal formation and parahippocampal gyrus'
    });

    // 6. Cerebral Cortex Regions (Continuous Physical & Functional Macroanatomy)
    this.registerGroup({
      groupId: 'region.cortex',
      name: 'Cerebral Cortex (Bilateral)',
      semanticType: 'ANATOMICAL_REGION',
      category: 'region',
      childGroupIds: ['region.cortex.left', 'region.cortex.right'],
      memberEntityIds: [],
      status: 'AVAILABLE',
      description: 'Bilateral cerebral cortical mantle and pial surfaces'
    });

    this.registerGroup({
      groupId: 'region.cortex.left',
      name: 'Cerebral Cortex (Left)',
      semanticType: 'ANATOMICAL_REGION',
      category: 'region',
      parentGroupId: 'hemisphere.left',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'AVAILABLE',
      description: 'Left cerebral cortical mantle'
    });

    this.registerGroup({
      groupId: 'region.cortex.right',
      name: 'Cerebral Cortex (Right)',
      semanticType: 'ANATOMICAL_REGION',
      category: 'region',
      parentGroupId: 'hemisphere.right',
      childGroupIds: [],
      memberEntityIds: [],
      status: 'AVAILABLE',
      description: 'Right cerebral cortical mantle'
    });

    // 7. Major Lobes (Semantic Organization - distinct from physical mesh boundary)
    const lobes: Array<{ id: string; name: string; desc: string }> = [
      { id: 'frontal', name: 'Frontal Lobe', desc: 'Motor control, executive function, expressive language' },
      { id: 'parietal', name: 'Parietal Lobe', desc: 'Somatosensation, spatial attention, sensorimotor integration' },
      { id: 'temporal', name: 'Temporal Lobe', desc: 'Auditory processing, language comprehension, memory' },
      { id: 'occipital', name: 'Occipital Lobe', desc: 'Primary visual perception and extrastriate visual processing' },
      { id: 'insula', name: 'Insular Cortex', desc: 'Interoception, salience network, gustatory processing' },
      { id: 'limbic', name: 'Limbic Lobe', desc: 'Cingulate and parahippocampal gyri encircling corpus callosum' }
    ];

    for (const l of lobes) {
      this.registerGroup({
        groupId: `lobe.${l.id}`,
        name: `${l.name} (Bilateral)`,
        semanticType: 'ANATOMICAL_REGION',
        category: 'lobe',
        childGroupIds: [`lobe.${l.id}.left`, `lobe.${l.id}.right`],
        memberEntityIds: [],
        status: 'AVAILABLE',
        description: l.desc
      });
      this.registerGroup({
        groupId: `lobe.${l.id}.left`,
        name: `${l.name} (Left)`,
        semanticType: 'ANATOMICAL_REGION',
        category: 'lobe',
        parentGroupId: 'hemisphere.left',
        childGroupIds: [],
        memberEntityIds: [],
        status: 'AVAILABLE'
      });
      this.registerGroup({
        groupId: `lobe.${l.id}.right`,
        name: `${l.name} (Right)`,
        semanticType: 'ANATOMICAL_REGION',
        category: 'lobe',
        parentGroupId: 'hemisphere.right',
        childGroupIds: [],
        memberEntityIds: [],
        status: 'AVAILABLE'
      });
    }
  }

  /**
   * Registers an anatomical group.
   */
  public registerGroup(group: AnatomicalGroup): void {
    this.groups.set(group.groupId, group);

    // Update parent's childGroupIds if parent exists
    if (group.parentGroupId) {
      const parent = this.groups.get(group.parentGroupId);
      if (parent && !parent.childGroupIds.includes(group.groupId)) {
        parent.childGroupIds.push(group.groupId);
      }
    }

    this.notifyAssemblyChanged();
  }

  public getGroup(groupId: string): AnatomicalGroup | undefined {
    return this.groups.get(groupId);
  }

  public getAllGroups(): AnatomicalGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Registers an anatomical entity and binds its group memberships.
   */
  public registerEntity(record: AnatomicalEntityRecord, mesh?: THREE.Mesh): void {
    this.entities.set(record.entityId, record);

    // Register representations (enforcing ONE ENTITY -> MANY REPRESENTATIONS)
    if (record.representations && record.representations.length > 0) {
      this.entityRepresentations.set(record.entityId, [...record.representations]);
    } else {
      this.entityRepresentations.set(record.entityId, [{
        representationId: `${record.entityId}.default_mesh`,
        representationType: 'macroscopic_mesh',
        assetId: record.assetId,
        isDefault: true,
        description: 'Default macroscopic surface mesh'
      }]);
    }

    if (mesh) {
      this.attachMesh(record.entityId, mesh);
    }

    // Process declared groups
    const declaredGroups = record.groups || [];
    for (const groupId of declaredGroups) {
      this.addEntityToGroup(record.entityId, groupId);
    }

    this.notifyAssemblyChanged();
  }

  public addRepresentation(entityId: string, representation: EntityRepresentation): void {
    let reps = this.entityRepresentations.get(entityId);
    if (!reps) {
      reps = [];
      this.entityRepresentations.set(entityId, reps);
    }
    // If only auto-fallback exists, replace it
    if (reps.length === 1 && reps[0].representationId === `${entityId}.default_mesh`) {
      reps.length = 0;
    }
    const idx = reps.findIndex((r) => r.representationId === representation.representationId);
    if (idx >= 0) {
      reps[idx] = representation;
    } else {
      reps.push(representation);
    }
  }

  public getRepresentations(entityId: string): EntityRepresentation[] {
    return this.entityRepresentations.get(entityId) || [];
  }

  public getActiveRepresentation(entityId: string): EntityRepresentation | undefined {
    const reps = this.getRepresentations(entityId);
    return reps.find((r) => r.isDefault) || reps[0];
  }

  public attachMesh(entityId: string, mesh: THREE.Mesh): void {
    this.entityMeshes.set(entityId, mesh);
    mesh.userData.neuroAtlas = {
      ...(mesh.userData.neuroAtlas || {}),
      entityId
    };
  }

  public getMesh(entityId: string): THREE.Mesh | undefined {
    return this.entityMeshes.get(entityId);
  }

  public getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.entityMeshes.values());
  }

  public getEntity(entityId: string): AnatomicalEntityRecord | undefined {
    return this.entities.get(entityId);
  }

  public getAllEntities(): AnatomicalEntityRecord[] {
    return Array.from(this.entities.values());
  }

  public addEntityToGroup(entityId: string, groupId: string): void {
    let group = this.groups.get(groupId);
    if (!group) {
      // Auto-create missing group with reasonable defaults
      const inferredSemanticType: GroupSemanticType =
        groupId.startsWith('division') || groupId.startsWith('hemisphere')
          ? 'STRUCTURAL_CONTAINER'
          : groupId.startsWith('system')
          ? 'FUNCTIONAL_SYSTEM'
          : groupId.startsWith('network')
          ? 'NETWORK'
          : groupId.startsWith('pathway')
          ? 'PATHWAY'
          : 'ANATOMICAL_REGION';

      group = {
        groupId,
        name: groupId.split('.').pop()?.replace(/_/g, ' ') || groupId,
        semanticType: inferredSemanticType,
        category: 'region',
        childGroupIds: [],
        memberEntityIds: [],
        status: 'AVAILABLE'
      };
      this.registerGroup(group);
    }

    if (!group.memberEntityIds.includes(entityId)) {
      group.memberEntityIds.push(entityId);
    }

    let eg = this.entityToGroups.get(entityId);
    if (!eg) {
      eg = new Set();
      this.entityToGroups.set(entityId, eg);
    }
    eg.add(groupId);
  }

  /**
   * Returns ancestor group IDs that represent strict PHYSICAL STRUCTURAL CONTAINMENT.
   * Disambiguates structural containment (Cerebrum -> Hemisphere) from functional membership.
   */
  public getStructuralAncestorGroupIds(entityId: string): string[] {
    const ancestors = this.getAncestorGroupIds(entityId);
    return ancestors.filter((gid) => {
      const g = this.groups.get(gid);
      return g?.semanticType === 'STRUCTURAL_CONTAINER';
    });
  }

  /**
   * Returns group IDs that represent FUNCTIONAL or CONCEPTUAL membership (e.g. Limbic System, Networks).
   */
  public getFunctionalGroupIds(entityId: string): string[] {
    const ancestors = this.getAncestorGroupIds(entityId);
    return ancestors.filter((gid) => {
      const g = this.groups.get(gid);
      return (
        g?.semanticType === 'FUNCTIONAL_SYSTEM' ||
        g?.semanticType === 'NETWORK' ||
        g?.semanticType === 'PATHWAY'
      );
    });
  }

  /**
   * Returns group IDs that represent ANATOMICAL REGIONS (e.g. Medial Temporal Region).
   */
  public getRegionalGroupIds(entityId: string): string[] {
    const ancestors = this.getAncestorGroupIds(entityId);
    return ancestors.filter((gid) => {
      const g = this.groups.get(gid);
      return g?.semanticType === 'ANATOMICAL_REGION';
    });
  }

  /**
   * Returns all groups classified by a specific semantic type.
   */
  public getGroupsBySemanticType(type: GroupSemanticType): AnatomicalGroup[] {
    return Array.from(this.groups.values()).filter((g) => g.semanticType === type);
  }

  /**
   * Returns all entity IDs belonging to this group and its descendant groups.
   */
  public getDescendantEntityIds(groupId: string): string[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    const result = new Set<string>(group.memberEntityIds);
    for (const childId of group.childGroupIds) {
      const childEntities = this.getDescendantEntityIds(childId);
      for (const e of childEntities) {
        result.add(e);
      }
    }

    return Array.from(result);
  }

  /**
   * Returns all ancestor group IDs for an entity or group.
   */
  public getAncestorGroupIds(entityOrGroupId: string): string[] {
    const ancestors = new Set<string>();

    if (this.entities.has(entityOrGroupId)) {
      const groups = this.entityToGroups.get(entityOrGroupId);
      if (groups) {
        for (const gid of groups) {
          ancestors.add(gid);
          const parentAncestors = this.getAncestorGroupIds(gid);
          parentAncestors.forEach((pa) => ancestors.add(pa));
        }
      }
    } else if (this.groups.has(entityOrGroupId)) {
      const group = this.groups.get(entityOrGroupId);
      if (group?.parentGroupId) {
        ancestors.add(group.parentGroupId);
        const parentAncestors = this.getAncestorGroupIds(group.parentGroupId);
        parentAncestors.forEach((pa) => ancestors.add(pa));
      }
    }

    return Array.from(ancestors);
  }

  // ==========================================================================
  // Bounding Volumes
  // ==========================================================================

  public getEntityBoundingBox(entityId: string): THREE.Box3 {
    const mesh = this.entityMeshes.get(entityId);
    if (mesh) {
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox!.clone();
      box.applyMatrix4(mesh.matrixWorld);
      return box;
    }

    const entity = this.entities.get(entityId);
    if (entity) {
      const [cx, cy, cz] = entity.canonicalCentroidMm;
      const [dx, dy, dz] = entity.dimensionsMm;
      const min = new THREE.Vector3(cx - dx / 2, cy - dy / 2, cz - dz / 2);
      const max = new THREE.Vector3(cx + dx / 2, cy + dy / 2, cz + dz / 2);
      return new THREE.Box3(min, max);
    }

    return new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
  }

  public getGroupBoundingBox(groupId: string): THREE.Box3 {
    const entityIds = this.getDescendantEntityIds(groupId);
    const box = new THREE.Box3();

    let hasPoints = false;
    for (const eid of entityIds) {
      const eBox = this.getEntityBoundingBox(eid);
      if (!eBox.isEmpty()) {
        box.union(eBox);
        hasPoints = true;
      }
    }

    if (!hasPoints) {
      box.set(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
    }

    return box;
  }

  public getGroupBoundingSphere(groupId: string): THREE.Sphere {
    const box = this.getGroupBoundingBox(groupId);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return sphere;
  }

  public getGroupCentroid(groupId: string): THREE.Vector3 {
    const box = this.getGroupBoundingBox(groupId);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  // ==========================================================================
  // Hierarchical Visibility
  // ==========================================================================

  public setEntityVisibility(entityId: string, visible: boolean): void {
    if (visible) {
      this.hiddenEntityIds.delete(entityId);
    } else {
      this.hiddenEntityIds.add(entityId);
    }
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  public setGroupVisibility(groupId: string, visible: boolean): void {
    if (visible) {
      this.hiddenGroupIds.delete(groupId);
    } else {
      this.hiddenGroupIds.add(groupId);
    }
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  public hideEntity(entityId: string): void {
    this.setEntityVisibility(entityId, false);
  }

  public showEntity(entityId: string): void {
    this.setEntityVisibility(entityId, true);
  }

  public hideGroup(groupId: string): void {
    this.setGroupVisibility(groupId, false);
  }

  public showGroup(groupId: string): void {
    this.setGroupVisibility(groupId, true);
  }

  public isolateEntity(entityId: string): void {
    if (this.isolatedEntityId === entityId) {
      this.restoreAll();
      return;
    }
    this.isolatedEntityId = entityId;
    this.isolatedGroupId = null;
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  public isolateGroup(groupId: string): void {
    if (this.isolatedGroupId === groupId) {
      this.restoreAll();
      return;
    }
    this.isolatedGroupId = groupId;
    this.isolatedEntityId = null;
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  public restoreAll(): void {
    this.isolatedEntityId = null;
    this.isolatedGroupId = null;
    this.hiddenEntityIds.clear();
    this.hiddenGroupIds.clear();
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  public restoreGroup(groupId: string): void {
    this.hiddenGroupIds.delete(groupId);
    const descendants = this.getDescendantEntityIds(groupId);
    for (const eid of descendants) {
      this.hiddenEntityIds.delete(eid);
    }
    if (this.isolatedGroupId === groupId) {
      this.isolatedGroupId = null;
    }
    this.syncMeshVisibilities();
    this.notifyVisibilityChanged();
  }

  /**
   * Evaluates effective visibility derived from entity and all ancestor groups.
   */
  public isEntityEffectivelyVisible(entityId: string): boolean {
    // 1. Direct entity hiding
    if (this.hiddenEntityIds.has(entityId)) return false;

    // 2. Ancestor group hiding
    const ancestors = this.getAncestorGroupIds(entityId);
    for (const gid of ancestors) {
      if (this.hiddenGroupIds.has(gid)) return false;
    }

    // 3. Isolation mode evaluation
    if (this.isolatedEntityId) {
      return this.isolatedEntityId === entityId;
    }

    if (this.isolatedGroupId) {
      const descendants = this.getDescendantEntityIds(this.isolatedGroupId);
      return descendants.includes(entityId);
    }

    return true;
  }

  public getEntityVisibilityState(entityId: string): VisibilityState {
    if (this.isolatedEntityId === entityId) return 'ISOLATED';
    if (this.isolatedGroupId) {
      const descendants = this.getDescendantEntityIds(this.isolatedGroupId);
      if (descendants.includes(entityId)) return 'ISOLATED';
    }

    if (this.hiddenEntityIds.has(entityId)) return 'HIDDEN';

    const ancestors = this.getAncestorGroupIds(entityId);
    for (const gid of ancestors) {
      if (this.hiddenGroupIds.has(gid)) return 'ANCESTOR_HIDDEN';
    }

    return 'VISIBLE';
  }

  private syncMeshVisibilities(): void {
    for (const [entityId, mesh] of this.entityMeshes.entries()) {
      mesh.visible = this.isEntityEffectivelyVisible(entityId);
    }
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  public selectEntity(entityId: string | null, multiSelect = false): void {
    if (!multiSelect) {
      this.selectedEntityIds.clear();
      this.selectedGroupIds.clear();
      this.primarySelectedGroupId = null;
    }

    if (entityId) {
      if (this.selectedEntityIds.has(entityId) && multiSelect) {
        this.selectedEntityIds.delete(entityId);
        if (this.primarySelectedEntityId === entityId) {
          this.primarySelectedEntityId = Array.from(this.selectedEntityIds)[0] || null;
        }
      } else {
        this.selectedEntityIds.add(entityId);
        this.primarySelectedEntityId = entityId;
      }
    } else if (!multiSelect) {
      this.primarySelectedEntityId = null;
    }

    this.notifySelectionChanged();
  }

  public selectGroup(groupId: string | null, multiSelect = false): void {
    if (!multiSelect) {
      this.selectedEntityIds.clear();
      this.selectedGroupIds.clear();
      this.primarySelectedEntityId = null;
    }

    if (groupId) {
      this.selectedGroupIds.add(groupId);
      this.primarySelectedGroupId = groupId;

      // Select all currently loaded descendant entities
      const descendants = this.getDescendantEntityIds(groupId);
      for (const eid of descendants) {
        if (this.entityMeshes.has(eid)) {
          this.selectedEntityIds.add(eid);
        }
      }
    } else if (!multiSelect) {
      this.primarySelectedGroupId = null;
    }

    this.notifySelectionChanged();
  }

  public clearSelection(): void {
    this.selectedEntityIds.clear();
    this.selectedGroupIds.clear();
    this.primarySelectedEntityId = null;
    this.primarySelectedGroupId = null;
    this.notifySelectionChanged();
  }

  public isEntitySelected(entityId: string): boolean {
    return this.selectedEntityIds.has(entityId);
  }

  public isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds.has(groupId);
  }

  public getSelectedEntityIds(): Set<string> {
    return new Set(this.selectedEntityIds);
  }

  public getSelectedGroupIds(): Set<string> {
    return new Set(this.selectedGroupIds);
  }

  public getPrimarySelectedEntity(): AnatomicalEntityRecord | null {
    if (!this.primarySelectedEntityId) return null;
    return this.entities.get(this.primarySelectedEntityId) || null;
  }

  public getPrimarySelectedGroup(): AnatomicalGroup | null {
    if (!this.primarySelectedGroupId) return null;
    return this.groups.get(this.primarySelectedGroupId) || null;
  }

  // ==========================================================================
  // Event Listeners & Disposal
  // ==========================================================================

  public onSelectionChanged(listener: SelectionChangeListener): () => void {
    this.selectionListeners.add(listener);
    return () => {
      this.selectionListeners.delete(listener);
    };
  }

  public onVisibilityChanged(listener: VisibilityChangeListener): () => void {
    this.visibilityListeners.add(listener);
    return () => {
      this.visibilityListeners.delete(listener);
    };
  }

  public onAssemblyChanged(listener: AssemblyChangeListener): () => void {
    this.assemblyListeners.add(listener);
    return () => {
      this.assemblyListeners.delete(listener);
    };
  }

  private notifySelectionChanged(): void {
    const state: MultiSelectionState = {
      selectedEntityIds: new Set(this.selectedEntityIds),
      selectedGroupIds: new Set(this.selectedGroupIds),
      primaryEntityId: this.primarySelectedEntityId,
      primaryGroupId: this.primarySelectedGroupId
    };

    for (const listener of this.selectionListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[AnatomicalAssemblyManager] Selection listener error:', err);
      }
    }
  }

  private notifyVisibilityChanged(): void {
    for (const listener of this.visibilityListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[AnatomicalAssemblyManager] Visibility listener error:', err);
      }
    }
  }

  private notifyAssemblyChanged(): void {
    for (const listener of this.assemblyListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[AnatomicalAssemblyManager] Assembly listener error:', err);
      }
    }
  }

  public dispose(): void {
    this.selectionListeners.clear();
    this.visibilityListeners.clear();
    this.assemblyListeners.clear();
    this.entities.clear();
    this.groups.clear();
    this.entityToGroups.clear();
    this.entityMeshes.clear();
    this.selectedEntityIds.clear();
    this.selectedGroupIds.clear();
    this.hiddenEntityIds.clear();
    this.hiddenGroupIds.clear();
  }
}
