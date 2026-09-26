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
import { AnatomicalEntityRecord, CameraViewPreset, LODMode, PerformanceProfileType } from './types';

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
    this.resourceManager = new ResourceManager();

    // Secondary Subsystems
    this.selectionManager = new SelectionManager(this.entityManager, this.materialManager);
    this.visibilityManager = new VisibilityManager(this.entityManager, this.materialManager);
    this.lodManager = new LODManager(this.assetManager, this.entityManager);
    this.performanceManager = new PerformanceManager('webgpu', options.initialProfile ?? 'HIGH');

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

    // Wire Interaction -> Selection / Hover
    this.interactionManager.onHover((entityId) => {
      this.handleHover(entityId);
    });

    this.interactionManager.onSelect((entityId) => {
      this.handleSelect(entityId);
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

    // Attach to Scene under brainRoot
    this.sceneManager.getBrainRoot().add(mesh);

    // Register with AnatomicalEntityManager
    this.entityManager.registerEntity(entityRecord, mesh);

    // Preload other LODs in background for seamless transitions
    this.assetManager.preloadAllLODs(entityRecord.assetId).catch((err) => {
      console.warn(`[AtlasApplication] Background LOD preloading for ${entityRecord.assetId}:`, err);
    });

    return mesh;
  }

  private handleHover(entityId: string | null): void {
    const selectedId = this.selectionManager.getSelectedEntityId();
    const isolatedId = this.visibilityManager.getIsolatedEntityId();

    const meshes = this.entityManager.getAllMeshes();
    for (const mesh of meshes) {
      const id = mesh.userData?.neuroAtlas?.entityId;
      if (!id) continue;

      // Do not alter selected or isolated states on hover
      if (id === selectedId) continue;
      if (isolatedId && id !== isolatedId) continue;

      if (id === entityId) {
        this.materialManager.setEntityState(mesh, id, 'HOVER');
      } else {
        const isHidden = this.visibilityManager.isHidden(id);
        if (!isHidden) {
          this.materialManager.setEntityState(mesh, id, 'DEFAULT');
        }
      }
    }
  }

  private handleSelect(entityId: string | null): void {
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
      this.performanceManager.endFrame(
        renderer,
        camera,
        activeLod,
        this.entityManager.getEntityCount(),
        centroid
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
    }
  }

  public restoreAllVisibility(): void {
    this.visibilityManager.restoreAll();
  }

  public setLODMode(mode: LODMode): Promise<void> {
    return this.lodManager.setMode(mode);
  }

  private async reloadAllMeshes(): Promise<void> {
    const records = this.entityManager.getAllRecords();
    for (const record of records) {
      await this.loadEntity(record);
    }
  }

  // Subsystem Getters
  public getRendererManager(): RendererManager { return this.rendererManager; }
  public getSceneManager(): SceneManager { return this.sceneManager; }
  public getCameraManager(): CameraManager { return this.cameraManager; }
  public getMaterialManager(): MaterialManager { return this.materialManager; }
  public getAssetManager(): AssetManager { return this.assetManager; }
  public getEntityManager(): AnatomicalEntityManager { return this.entityManager; }
  public getInteractionManager(): InteractionManager { return this.interactionManager; }
  public getSelectionManager(): SelectionManager { return this.selectionManager; }
  public getVisibilityManager(): VisibilityManager { return this.visibilityManager; }
  public getLODManager(): LODManager { return this.lodManager; }
  public getPerformanceManager(): PerformanceManager { return this.performanceManager; }
  public getResourceManager(): ResourceManager { return this.resourceManager; }

  public dispose(): void {
    this.stop();
    this.interactionManager.dispose();
    this.selectionManager.dispose();
    this.visibilityManager.dispose();
    this.lodManager.dispose();
    this.performanceManager.dispose();
    this.materialManager.dispose();
    this.assetManager.dispose();
    this.resourceManager.disposeAll();
    this.cameraManager.dispose();
    this.rendererManager.dispose();
    this.sceneManager.dispose();
  }
}
