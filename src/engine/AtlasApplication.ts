/**
 * 3D Neuroanatomy Atlas: Application Orchestrator
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Master runtime engine coordinating RendererManager, SceneManager,
 * CameraManager, MaterialManager, AssetManager, AnatomicalEntityManager,
 * InteractionManager, SelectionManager, VisibilityManager, LODManager,
 * PerformanceManager, and ResourceManager.
 */

import * as THREE from 'three';
import { RendererManager } from './RendererManager';
import { SceneManager } from './SceneManager';
import { CameraManager } from './CameraManager';
import { MaterialManager } from './MaterialManager';
import { AssetManager } from './AssetManager';
import { AnatomicalEntityManager } from './AnatomicalEntityManager';
import { InteractionManager } from './InteractionManager';
import { SelectionManager } from './SelectionManager';
import { VisibilityManager } from './VisibilityManager';
import { LODManager } from './LODManager';
import { PerformanceManager } from './PerformanceManager';
import { ResourceManager } from './ResourceManager';
import { AnatomicalAssemblyManager } from './AnatomicalAssemblyManager';
import { LabelManager } from './LabelManager';
import { SectionPlaneSet } from './SectionPlaneSet';
import { ClippingAdapter } from './ClippingAdapter';
import { SectionCapsManager } from './SectionCaps';
import { SectionPresentation, computeSectionStats, SectionStats } from './sectionPresentation';
import {
  AnatomicalEntityRecord,
  CameraViewPreset,
  LODMode,
  MultiSelectionState,
  PerformanceProfileType
} from './types';

export interface AtlasApplicationOptions {
  container: HTMLElement;
  manifestPath?: string;
  initialProfile?: PerformanceProfileType;
  enableGrid?: boolean;
  enableOriginMarker?: boolean;
}

export class AtlasApplication {
  private container: HTMLElement;
  private rendererManager: RendererManager;
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;
  private materialManager: MaterialManager;
  private assetManager: AssetManager;
  private entityManager: AnatomicalEntityManager;
  private interactionManager: InteractionManager;
  private selectionManager: SelectionManager;
  private visibilityManager: VisibilityManager;
  private lodManager: LODManager;
  private performanceManager: PerformanceManager;
  private resourceManager: ResourceManager;
  private assemblyManager: AnatomicalAssemblyManager;
  private labelManager: LabelManager;
  private sectionPlaneSet: SectionPlaneSet;
  private clippingAdapter: ClippingAdapter;
  private sectionCaps: SectionCapsManager;
  private sectionPresentation: SectionPresentation;
  private planeUnsub: (() => void) | null = null;
  private lodUnsub: (() => void) | null = null;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  constructor(options: AtlasApplicationOptions) {
    this.container = options.container;

    // 1. Core Subsystem Initialization
    this.rendererManager = new RendererManager();
    this.sceneManager = new SceneManager();
    this.materialManager = new MaterialManager();
    this.assetManager = new AssetManager();
    this.entityManager = new AnatomicalEntityManager();
    this.assemblyManager = new AnatomicalAssemblyManager();
    this.labelManager = new LabelManager();
    this.resourceManager = new ResourceManager();
    // Phase 4A: plane state lives outside the renderer; the adapter bridges it.
    this.sectionPlaneSet = new SectionPlaneSet();
    this.clippingAdapter = new ClippingAdapter();
    this.clippingAdapter.bind(this.sectionPlaneSet);
    // Phase 4B: presentation state + derived section surfaces (caps/edges).
    // Caps are DERIVED VISUALIZATION — no entity IDs, no anatomical provenance.
    this.sectionPresentation = new SectionPresentation();
    this.sectionCaps = new SectionCapsManager();
    this.sectionCaps.setSharedPlanes(this.clippingAdapter.getSharedPlanes());
    this.sectionCaps.attachMeshProvider(() => this.collectCapsMeshes());
    this.planeUnsub = this.sectionPlaneSet.onChange(() => this.refreshSectionDerivatives());

    // Secondary Subsystems
    this.selectionManager = new SelectionManager(this.entityManager, this.materialManager);
    this.visibilityManager = new VisibilityManager(this.entityManager, this.materialManager);
    this.lodManager = new LODManager(this.assetManager, this.entityManager);
    this.performanceManager = new PerformanceManager('webgpu', options.initialProfile ?? 'HIGH');
    // Phase 4B wiring that needs LODManager (after its assignment).
    this.sectionCaps.attachLODManager(this.lodManager);

    // Camera will be created upon container attachment
    this.cameraManager = new CameraManager(
      this.container.clientWidth || 800,
      this.container.clientHeight || 600
    );

    // Interaction will be created upon canvas mount
    this.interactionManager = new InteractionManager(
      this.cameraManager.getCamera(),
      this.sceneManager.getBrainRoot(),
      this.entityManager
    );

    if (options.enableGrid === false) {
      this.sceneManager.setGridVisible(false);
    }
    if (options.enableOriginMarker === false) {
      this.sceneManager.setOriginMarkerVisible(false);
    }
  }

  /**
   * Initializes GPU renderer, attaches canvas to DOM, loads manifest, and wires event listeners.
   */
  public async initialize(manifestPath: string = 'assets/manifests/assets.manifest.json'): Promise<void> {
    // Initialize WebGPU / WebGL2 renderer
    const renderer = await this.rendererManager.initialize(this.container);
    this.performanceManager.setBackendType(this.rendererManager.getActiveBackend());

    const canvas = renderer.domElement;
    this.cameraManager.setupControls(canvas);

    // Rebind interaction manager to current camera and domElement
    this.interactionManager.dispose();
    this.interactionManager = new InteractionManager(
      this.cameraManager.getCamera(),
      this.sceneManager.getBrainRoot(),
      this.entityManager,
      canvas
    );

    // Phase 4A (§8): picking skips GPU-clipped fragments using application plane
    // state. BVH/geometry untouched; filter is event-driven CPU half-space tests.
    const planeSet = this.sectionPlaneSet;
    this.interactionManager.setClippingFilter({
      isPointCulled: (p) => planeSet.isPointCulled([p.x, p.y, p.z]),
      hasActivePlanes: () => planeSet.getEnabledPlanes().length > 0
    });

    // Wire Interaction -> Selection / Hover
    this.interactionManager.onHover((entityId) => {
      this.handleHover(entityId);
    });

    this.interactionManager.onSelect((entityId) => {
      this.handleSelect(entityId);
    });

    // Wire AnatomicalAssemblyManager -> Visual Materials & Meshes
    this.assemblyManager.onSelectionChanged((state) => {
      this.syncVisualSelection(state);
    });

    this.assemblyManager.onVisibilityChanged(() => {
      this.syncVisualVisibility();
    });

    // Wire Context Loss / Restored
    this.rendererManager.onContextLost(() => {
      console.warn('[AtlasApplication] GPU context lost! Pausing rendering loop.');
      this.stop();
    });

    this.rendererManager.onContextRestored(async () => {
      console.info('[AtlasApplication] GPU context restored! Re-initializing.');
      await this.reloadAllMeshes();
      this.start();
    });

    // Load asset manifest
    await this.assetManager.loadManifest(manifestPath);

    // Phase 4A: renderer clipping flag (guarded; WebGL2 path verified by design,
    // WebGPU device behavior unverified) + plane gizmo mount (hidden until used).
    this.clippingAdapter.applyRendererState(this.rendererManager.getRenderer());
    this.clippingAdapter.setGizmoVisible(false);
    this.sceneManager.getVisualizationRoot().add(this.clippingAdapter.getGizmoGroup());
    // Phase 4B: derived caps/edges group (visualization aids, never anatomy).
    this.sceneManager.getVisualizationRoot().add(this.sectionCaps.getGroup());
    this.sectionCaps.setSharedPlanes(this.clippingAdapter.getSharedPlanes());
    // Phase 4B §14-§15: labels respect clipping + visibility (no invented anchors).
    this.labelManager.setSectionFilter({
      isPointCulled: (p) => this.sectionPlaneSet.isPointCulled([p.x, p.y, p.z]),
      isEntityFullyClipped: (entityId) => this.isEntityFullyClipped(entityId),
      hasActivePlanes: () => this.sectionPlaneSet.getEnabledPlanes().length > 0
    });
    this.labelManager.setEntityVisibilityProvider((entityId) => {
      const mesh = this.entityManager.getMesh(entityId);
      if (!mesh) return false;
      if (!mesh.visible) return false;
      return this.assemblyManager.isEntityEffectivelyVisible(entityId);
    });
    // Phase 4B §33: LOD switches invalidate derived caps for the re-lodded asset.
    if (this.lodUnsub) this.lodUnsub();
    this.lodUnsub = this.lodManager.onLODChanged(() => {
      this.refreshSectionDerivatives();
    });

    // Configure profile
    this.applyProfile(this.performanceManager.getProfile().id);
  }

  /**
   * Loads an anatomical entity definition and mounts its 3D mesh into the scene hierarchy.
   */
  public async loadEntity(entityRecord: AnatomicalEntityRecord): Promise<THREE.Mesh> {
    // Preload LOD0 geometry
    const loaded = await this.assetManager.loadAsset(entityRecord.assetId, 'lod0');
    const mesh = loaded.mesh;

    // Register material
    const material = this.materialManager.registerEntityMaterial(entityRecord.entityId);
    mesh.material = material;

    // Phase 4A: clipping follows the material, never the entity record.
    this.clippingAdapter.registerMaterial(entityRecord.entityId, material);

    // Attach to Scene under brainRoot
    this.sceneManager.getBrainRoot().add(mesh);

    // Register with AnatomicalEntityManager and AnatomicalAssemblyManager
    this.entityManager.registerEntity(entityRecord, mesh);
    this.assemblyManager.registerEntity(entityRecord, mesh);

    // Preload other LODs in background for seamless transitions
    this.assetManager.preloadAllLODs(entityRecord.assetId).catch((err) => {
      console.warn(`[AtlasApplication] Background LOD preloading for ${entityRecord.assetId}:`, err);
    });

    this.refreshSectionDerivatives();
    return mesh;
  }

  private syncVisualSelection(state: MultiSelectionState): void {
    const meshes = this.entityManager.getAllMeshes();
    for (const mesh of meshes) {
      const id = mesh.userData?.neuroAtlas?.entityId;
      if (!id) continue;

      if (!this.assemblyManager.isEntityEffectivelyVisible(id)) {
        this.materialManager.setEntityState(mesh, id, 'HIDDEN');
        continue;
      }

      if (id === state.primaryEntityId) {
        this.materialManager.setEntityState(mesh, id, 'SELECTED');
      } else if (state.selectedEntityIds.has(id)) {
        this.materialManager.setEntityState(mesh, id, 'GROUP_SELECTED');
      } else {
        this.materialManager.setEntityState(mesh, id, 'DEFAULT');
      }
    }
  }

  private syncVisualVisibility(): void {
    const meshes = this.entityManager.getAllMeshes();
    const primaryId = this.assemblyManager.getPrimarySelectedEntity()?.entityId;
    const selectedIds = this.assemblyManager.getSelectedEntityIds();

    for (const mesh of meshes) {
      const id = mesh.userData?.neuroAtlas?.entityId;
      if (!id) continue;

      const isVisible = this.assemblyManager.isEntityEffectivelyVisible(id);
      mesh.visible = isVisible;

      if (!isVisible) {
        this.materialManager.setEntityState(mesh, id, 'HIDDEN');
      } else {
        if (id === primaryId) {
          this.materialManager.setEntityState(mesh, id, 'SELECTED');
        } else if (selectedIds.has(id)) {
          this.materialManager.setEntityState(mesh, id, 'GROUP_SELECTED');
        } else {
          this.materialManager.setEntityState(mesh, id, 'DEFAULT');
        }
      }
    }
  }

  private handleHover(entityId: string | null): void {
    const primaryId = this.assemblyManager.getPrimarySelectedEntity()?.entityId;
    const selectedIds = this.assemblyManager.getSelectedEntityIds();

    const meshes = this.entityManager.getAllMeshes();
    for (const mesh of meshes) {
      const id = mesh.userData?.neuroAtlas?.entityId;
      if (!id) continue;
      if (!this.assemblyManager.isEntityEffectivelyVisible(id)) continue;

      // Do not alter selected states on hover
      if (id === primaryId) continue;
      if (selectedIds.has(id)) continue;

      if (id === entityId) {
        this.materialManager.setEntityState(mesh, id, 'HOVER');
      } else {
        this.materialManager.setEntityState(mesh, id, 'DEFAULT');
      }
    }
  }

  private handleSelect(entityId: string | null): void {
    this.assemblyManager.selectEntity(entityId);
    this.selectionManager.select(entityId);
  }

  /**
   * Starts the animation and rendering loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  /**
   * Stops the animation and rendering loop.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const delta = this.clock.getDelta();
    this.performanceManager.beginFrame();

    // 1. Update Camera and Controls
    this.cameraManager.update(delta);

    // 2. Update Continuous LOD
    this.lodManager.update(this.cameraManager.getCamera());

    // 2b. Update 3D Screen-space Labels
    const canvas = this.rendererManager.getCanvas();
    if (canvas) {
      this.labelManager.update(
        this.cameraManager.getCamera(),
        canvas.clientWidth || 800,
        canvas.clientHeight || 600
      );
    }

    // 3. Render Scene
    const renderer = this.rendererManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.cameraManager.getCamera();

    if (renderer && scene && camera) {
      this.rendererManager.render(scene, camera);
    }

    // 4. Record Frame Telemetry
    const firstEntity = this.entityManager.getAllRecords()[0];
    const centroid = firstEntity ? firstEntity.canonicalCentroidMm : undefined;
    const activeLod = firstEntity ? this.lodManager.getActiveLOD(firstEntity.entityId) : 'lod0';

    if (renderer) {
      const allEnts = this.assemblyManager.getAllEntities();
      const visibleCount = allEnts.filter((e) => this.assemblyManager.isEntityEffectivelyVisible(e.entityId)).length;
      const primaryEnt = this.assemblyManager.getPrimarySelectedEntity();
      const primaryGrp = this.assemblyManager.getPrimarySelectedGroup();

      this.performanceManager.endFrame(
        renderer,
        camera,
        activeLod,
        this.entityManager.getEntityCount(),
        centroid,
        {
          totalEntities: allEnts.length,
          loadedEntities: this.entityManager.getEntityCount(),
          failedEntities: this.assetManager.getFailedCount(),
          visibleEntities: visibleCount,
          hiddenEntities: allEnts.length - visibleCount,
          selectedEntityName: primaryEnt?.name || null,
          selectedGroupName: primaryGrp?.name || null
        }
      );
    }
  };

  /**
   * Applies performance profile to renderer and LOD manager.
   */
  public applyProfile(profileType: PerformanceProfileType): void {
    const profile = this.performanceManager.setProfile(profileType);
    this.rendererManager.setPerformanceProfile(profile);
    this.lodManager.setDistanceMultiplier(profile.lodDistanceMultiplier);
  }

  public setViewPreset(preset: CameraViewPreset): void {
    const selectedRecord = this.selectionManager.getSelectedRecord();
    const target = selectedRecord
      ? new THREE.Vector3(...selectedRecord.canonicalCentroidMm)
      : new THREE.Vector3(-25.2, -20.6, -11.4); // Canonical Left Hippocampus centroid default
    this.cameraManager.setPreset(preset, target);
  }

  public resetCamera(): void {
    const first = this.entityManager.getAllRecords()[0];
    const target = first ? new THREE.Vector3(...first.canonicalCentroidMm) : new THREE.Vector3(0, 0, 0);
    this.cameraManager.reset(target);
  }

  public isolateSelected(): void {
    const selectedId = this.selectionManager.getSelectedEntityId();
    if (selectedId) {
      this.visibilityManager.isolate(selectedId);
      this.assemblyManager.isolateEntity(selectedId);
    }
  }

  public restoreAllVisibility(): void {
    this.visibilityManager.restoreAll();
    this.assemblyManager.restoreAll();
  }

  public selectGroup(groupId: string | null): void {
    this.assemblyManager.selectGroup(groupId);
  }

  public isolateGroup(groupId: string): void {
    this.assemblyManager.isolateGroup(groupId);
  }

  public focusGroup(groupId: string): void {
    const box = this.assemblyManager.getGroupBoundingBox(groupId);
    this.cameraManager.focusBoundingBox(box);
  }

  public focusEntity(entityId: string): void {
    const box = this.assemblyManager.getEntityBoundingBox(entityId);
    this.cameraManager.focusBoundingBox(box);
  }

  public focusSelection(): void {
    const primaryEntity = this.assemblyManager.getPrimarySelectedEntity();
    const primaryGroup = this.assemblyManager.getPrimarySelectedGroup();
    if (primaryEntity) {
      this.focusEntity(primaryEntity.entityId);
    } else if (primaryGroup) {
      this.focusGroup(primaryGroup.groupId);
    } else {
      this.resetCamera();
    }
  }

  /**
   * Frames the selection or a specified bounding box smoothly in the viewport.
   */
  public frameSelection(box?: THREE.Box3, duration?: number): void {
    if (box) {
      this.cameraManager.frameSelection(box, duration);
      return;
    }
    const primaryEntity = this.assemblyManager.getPrimarySelectedEntity();
    const primaryGroup = this.assemblyManager.getPrimarySelectedGroup();
    if (primaryEntity) {
      const b = this.assemblyManager.getEntityBoundingBox(primaryEntity.entityId);
      this.cameraManager.frameSelection(b, duration);
    } else if (primaryGroup) {
      const b = this.assemblyManager.getGroupBoundingBox(primaryGroup.groupId);
      this.cameraManager.frameSelection(b, duration);
    } else {
      this.resetCamera();
    }
  }

  public restoreAll(): void {
    this.restoreAllVisibility();
  }

  public setLODMode(mode: LODMode): Promise<void> {
    return this.lodManager.setMode(mode);
  }

  private async reloadAllMeshes(): Promise<void> {
    const records = this.entityManager.getAllRecords();
    for (const record of records) {
      await this.loadEntity(record);
    }
    // Phase 4A: reload creates fresh materials — re-apply plane state to them.
    this.resyncClipping();
  }

  /**
   * Phase 4A: re-derive GPU clipping state from application plane state.
   * Phase 4B: also re-derives caps/edges + label section filter (§37).
   * Call after renderer (re)creation and after bulk material replacement.
   * Application state reconstructs everything; no GPU objects persist as state.
   */
  public resyncClipping(): void {
    this.clippingAdapter.resync(
      this.sectionPlaneSet,
      this.rendererManager.getRenderer()
    );
    this.sectionCaps.setSharedPlanes(this.clippingAdapter.getSharedPlanes());
    this.refreshSectionDerivatives();
  }

  public getSectionPlaneSet(): SectionPlaneSet { return this.sectionPlaneSet; }
  public getClippingAdapter(): ClippingAdapter { return this.clippingAdapter; }
  public getSectionCaps(): SectionCapsManager { return this.sectionCaps; }
  public getSectionPresentation(): SectionPresentation { return this.sectionPresentation; }

  /**
   * Phase 4B §16-§18: selection still resolves the ORIGINAL entity (no
   * fragment/section IDs). Picking already filters fully-clipped hits (§8);
   * this helper reports whether an entity has any retained visible geometry
   * by testing its bbox corners + centroid (event-driven, not per-frame).
   */
  public isEntityFullyClipped(entityId: string): boolean {
    if (this.sectionPlaneSet.getEnabledPlanes().length === 0) return false;
    const mesh = this.entityManager.getMesh(entityId);
    if (!mesh) return true;
    if (!mesh.visible) return true;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return false;
    const world = new THREE.Box3().copy(bb).applyMatrix4(mesh.matrixWorld);
    const pts: Array<[number, number, number]> = [
      [world.min.x, world.min.y, world.min.z],
      [world.max.x, world.min.y, world.min.z],
      [world.min.x, world.max.y, world.min.z],
      [world.min.x, world.min.y, world.max.z],
      [world.max.x, world.max.y, world.min.z],
      [world.max.x, world.min.y, world.max.z],
      [world.min.x, world.max.y, world.max.z],
      [world.max.x, world.max.y, world.max.z]
    ];
    const center = new THREE.Vector3();
    world.getCenter(center);
    pts.push([center.x, center.y, center.z]);
    for (const p of pts) {
      if (!this.sectionPlaneSet.isPointCulled(p)) return false;
    }
    return true;
  }

  /** Phase 4B §27: honest counts of LOADED entities (never biological counts). */
  public getSectionStats(): SectionStats {
    const samples = this.entityManager.getAllRecords().map((record) => {
      const mesh = this.entityManager.getMesh(record.entityId);
      if (!mesh) {
        return { entityId: record.entityId, samplePoints: [] as Array<[number, number, number]>, objectVisible: false };
      }
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (!bb) {
        return { entityId: record.entityId, samplePoints: [] as Array<[number, number, number]>, objectVisible: mesh.visible };
      }
      const world = new THREE.Box3().copy(bb).applyMatrix4(mesh.matrixWorld);
      const center = new THREE.Vector3();
      world.getCenter(center);
      return {
        entityId: record.entityId,
        samplePoints: [
          [world.min.x, world.min.y, world.min.z] as [number, number, number],
          [world.max.x, world.max.y, world.max.z] as [number, number, number],
          [center.x, center.y, center.z] as [number, number, number]
        ],
        objectVisible: mesh.visible && this.assemblyManager.isEntityEffectivelyVisible(record.entityId)
      };
    });
    return computeSectionStats(this.sectionPlaneSet, samples);
  }

  /**
   * Phase 4B §17: focus the currently VISIBLE portion of an entity.
   * Scans retained vertices (event-driven on user action only) and frames the
   * retained bbox. Fully-clipped entities: no-op returning false (caller shows
   * the neutral empty-section message; never an error, never invented focus).
   */
  public focusVisibleSection(entityId: string, duration = 0.8): boolean {
    const mesh = this.entityManager.getMesh(entityId);
    if (!mesh) return false;
    if (this.sectionPlaneSet.getEnabledPlanes().length === 0) {
      this.focusEntity(entityId);
      return true;
    }
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) {
      this.focusEntity(entityId);
      return true;
    }
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let found = false;
    const stride = Math.max(1, Math.floor(pos.count / 2000)); // bounded scan.
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (!this.sectionPlaneSet.isPointCulled([v.x, v.y, v.z])) {
        box.expandByPoint(v.clone());
        found = true;
      }
    }
    if (!found) return false;
    this.cameraManager.focusBoundingBox(box, duration);
    return true;
  }

  /** Phase 4B §19/§28-§30: apply a visual mode without touching anatomy. */
  public applySectionVisualMode(): void {
    const mode = this.sectionPresentation.getState().visualMode;
    if (mode === 'SECTION_EDGE') {
      this.sectionCaps.setVisible(true);
      // Edges stay visible; caps hidden via presentation flags consumed by UI.
      // Caps manager holds both; per-mode cap hiding is done by clear-on-EDGE
      // callers reading presentation state (no geometry mutation here).
    } else {
      this.sectionCaps.setVisible(true);
    }
    this.refreshSectionDerivatives();
  }

  private collectCapsMeshes(): Array<{ mesh: THREE.Mesh; assetId: string; lod: string }> {
    const out: Array<{ mesh: THREE.Mesh; assetId: string; lod: string }> = [];
    for (const record of this.entityManager.getAllRecords()) {
      const mesh = this.entityManager.getMesh(record.entityId);
      if (!mesh || !mesh.visible) continue;
      if (!this.assemblyManager.isEntityEffectivelyVisible(record.entityId)) continue;
      const lod = this.lodManager.getActiveLOD(record.entityId);
      out.push({ mesh, assetId: record.assetId, lod });
    }
    return out;
  }

  /** Event-driven only (§31): plane/LOD/visibility changes — never per frame. */
  public refreshSectionDerivatives(): void {
    if (!this.sectionCaps) return;
    const presentation = this.sectionPresentation.getState();
    const enabled = this.sectionPlaneSet.getEnabledPlanes();
    if (!presentation.sectionModeEnabled || enabled.length === 0) {
      this.sectionCaps.clear();
      return;
    }
    this.sectionCaps.setSharedPlanes(this.clippingAdapter.getSharedPlanes());
    const planes = enabled.map((p) => ({ id: p.id, math: p.math }));
    this.sectionCaps.refresh(this.collectCapsMeshes(), planes);
    // Presentation-driven visibility (no per-frame work):
    const capsGroup = this.sectionCaps.getGroup();
    capsGroup.visible =
      presentation.visualMode !== 'SECTION_EDGE'
        ? presentation.capsVisible || presentation.edgesVisible
        : presentation.edgesVisible;
  }

  // Subsystem Getters
  public getRendererManager(): RendererManager { return this.rendererManager; }
  public getSceneManager(): SceneManager { return this.sceneManager; }
  public getCameraManager(): CameraManager { return this.cameraManager; }
  public getMaterialManager(): MaterialManager { return this.materialManager; }
  public getAssetManager(): AssetManager { return this.assetManager; }
  public getEntityManager(): AnatomicalEntityManager { return this.entityManager; }
  public getAssemblyManager(): AnatomicalAssemblyManager { return this.assemblyManager; }
  public getInteractionManager(): InteractionManager { return this.interactionManager; }
  public getSelectionManager(): SelectionManager { return this.selectionManager; }
  public getVisibilityManager(): VisibilityManager { return this.visibilityManager; }
  public getLODManager(): LODManager { return this.lodManager; }
  public getLabelManager(): LabelManager { return this.labelManager; }
  public getPerformanceManager(): PerformanceManager { return this.performanceManager; }
  public getResourceManager(): ResourceManager { return this.resourceManager; }

  public dispose(): void {
    this.stop();
    if (this.planeUnsub) {
      this.planeUnsub();
      this.planeUnsub = null;
    }
    if (this.lodUnsub) {
      this.lodUnsub();
      this.lodUnsub = null;
    }
    this.interactionManager.dispose();
    this.selectionManager.dispose();
    this.visibilityManager.dispose();
    this.assemblyManager.dispose();
    this.labelManager.clear();
    this.labelManager.setSectionFilter(null);
    this.labelManager.setEntityVisibilityProvider(null);
    this.lodManager.dispose();
    this.performanceManager.dispose();
    this.sectionCaps.dispose();
    this.sectionPresentation.dispose();
    this.clippingAdapter.dispose();
    this.materialManager.dispose();
    this.assetManager.dispose();
    this.resourceManager.disposeAll();
    this.cameraManager.dispose();
    this.rendererManager.dispose();
    this.sceneManager.dispose();
  }
}
