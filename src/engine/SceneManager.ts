/**
 * 3D Neuroanatomy Atlas: Scene Manager & Root Hierarchy
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Controls scene creation, lighting, background, and the canonical
 * 3-tier anatomical root hierarchy:
 * 
 * Scene
 * └── AnatomyRoot
 *     ├── BrainRoot          (Physical anatomical structure meshes)
 *     ├── ReferenceRoot      (AC-PC commissural origin, orientation axes, stereotaxic grid)
 *     └── VisualizationRoot  (Clipping planes, tract streamlines, target probes)
 */

import * as THREE from 'three';

export interface SceneManagerOptions {
  backgroundColor?: number | string;
  enableGrid?: boolean;
  enableAxes?: boolean;
}

export class SceneManager {
  public scene: THREE.Scene;
  public anatomyRoot: THREE.Group;
  public brainRoot: THREE.Group;
  public referenceRoot: THREE.Group;
  public visualizationRoot: THREE.Group;

  private lights: THREE.Light[] = [];
  private gridHelper?: THREE.GridHelper;
  private axesHelper?: THREE.AxesHelper;
  private originMarker?: THREE.Mesh;

  constructor(options: SceneManagerOptions = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(options.backgroundColor ?? '#0A0D14');

    // 1. Construct 3-tier root hierarchy
    this.anatomyRoot = new THREE.Group();
    this.anatomyRoot.name = 'AnatomyRoot';
    this.scene.add(this.anatomyRoot);

    this.brainRoot = new THREE.Group();
    this.brainRoot.name = 'BrainRoot';
    this.anatomyRoot.add(this.brainRoot);

    this.referenceRoot = new THREE.Group();
    this.referenceRoot.name = 'ReferenceRoot';
    this.anatomyRoot.add(this.referenceRoot);

    this.visualizationRoot = new THREE.Group();
    this.visualizationRoot.name = 'VisualizationRoot';
    this.anatomyRoot.add(this.visualizationRoot);

    // 2. Setup standard medical lighting
    this.setupLighting();

    // 3. Setup stereotaxic reference landmarks
    this.setupReferenceLandmarks(options.enableGrid ?? true, options.enableAxes ?? true);
  }

  /**
   * Configures a calibrated 3-point scientific daylight illumination setup.
   * Ensures subtle surface morphology, sulcal depths, and organ boundaries
   * are discernible without exaggerated cinematic shadows or color distortion.
   */
  private setupLighting(): void {
    // 1. Soft neutral ambient daylight
    const ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.85);
    ambientLight.name = 'Light_Ambient';
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // 2. Key directional light (Anterosuperior right)
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.25);
    keyLight.position.set(120, 180, 140);
    keyLight.name = 'Light_Key';
    this.scene.add(keyLight);
    this.lights.push(keyLight);

    // 3. Fill directional light (Posterosuperior left)
    const fillLight = new THREE.DirectionalLight(0xCBD5E1, 0.65);
    fillLight.position.set(-140, 80, -100);
    fillLight.name = 'Light_Fill';
    this.scene.add(fillLight);
    this.lights.push(fillLight);

    // 4. Subtle cool rim / bottom light (Accentuate ventral temporal contours)
    const rimLight = new THREE.DirectionalLight(0x94A3B8, 0.45);
    rimLight.position.set(0, -120, -140);
    rimLight.name = 'Light_Rim';
    this.scene.add(rimLight);
    this.lights.push(rimLight);
  }

  /**
   * Sets up stereotaxic reference landmarks in ReferenceRoot.
   * World coordinates are calibrated in 1:1 millimeters (RAS: +X Right, +Y Superior, +Z Anterior).
   */
  private setupReferenceLandmarks(enableGrid: boolean, enableAxes: boolean): void {
    if (enableGrid) {
      // Subtle 200 mm axial grid positioned below temporal lobes (Y = -50 mm)
      this.gridHelper = new THREE.GridHelper(200, 20, 0x334155, 0x1E293B);
      this.gridHelper.position.set(0, -50, 0);
      this.gridHelper.name = 'Ref_Axial_Grid_200mm';
      this.referenceRoot.add(this.gridHelper);
    }

    if (enableAxes) {
      // 30 mm anatomical orientation axes (+X Red Right, +Y Green Superior, +Z Blue Anterior)
      this.axesHelper = new THREE.AxesHelper(30);
      this.axesHelper.position.set(0, 0, 0);
      this.axesHelper.name = 'Ref_RAS_Axes_30mm';
      this.referenceRoot.add(this.axesHelper);

      // Subtle AC-PC Origin marker sphere (Radius 1.5 mm at [0, 0, 0])
      const originGeom = new THREE.SphereGeometry(1.5, 16, 16);
      const originMat = new THREE.MeshBasicMaterial({
        color: 0x38BDF8,
        wireframe: true,
        transparent: true,
        opacity: 0.6
      });
      this.originMarker = new THREE.Mesh(originGeom, originMat);
      this.originMarker.position.set(0, 0, 0);
      this.originMarker.name = 'Ref_AC_PC_Origin';
      this.referenceRoot.add(this.originMarker);
    }
  }

  /**
   * Registers an anatomical structure mesh into BrainRoot.
   */
  public addBrainMesh(object: THREE.Object3D): void {
    this.brainRoot.add(object);
  }

  /**
   * Removes an anatomical structure mesh from BrainRoot.
   */
  public removeBrainMesh(object: THREE.Object3D): void {
    this.brainRoot.remove(object);
  }

  /**
   * Clears all objects from BrainRoot.
   */
  public clearBrainMeshes(): void {
    while (this.brainRoot.children.length > 0) {
      this.brainRoot.remove(this.brainRoot.children[0]);
    }
  }

  public getScene(): THREE.Scene { return this.scene; }
  public getAnatomyRoot(): THREE.Group { return this.anatomyRoot; }
  public getBrainRoot(): THREE.Group { return this.brainRoot; }
  public getReferenceRoot(): THREE.Group { return this.referenceRoot; }
  public getVisualizationRoot(): THREE.Group { return this.visualizationRoot; }

  public isGridVisible(): boolean {
    return this.gridHelper?.visible ?? false;
  }

  public isOriginMarkerVisible(): boolean {
    return this.originMarker?.visible ?? false;
  }

  public setGridVisible(visible: boolean): void {
    if (this.gridHelper) this.gridHelper.visible = visible;
  }

  public setOriginMarkerVisible(visible: boolean): void {
    if (this.originMarker) this.originMarker.visible = visible;
    if (this.axesHelper) this.axesHelper.visible = visible;
  }

  public setBackground(color: number | string): void {
    this.scene.background = new THREE.Color(color);
  }

  public dispose(): void {
    this.clearBrainMeshes();
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
    }
    if (this.axesHelper) {
      this.axesHelper.geometry.dispose();
      (this.axesHelper.material as THREE.Material).dispose();
    }
    if (this.originMarker) {
      this.originMarker.geometry.dispose();
      (this.originMarker.material as THREE.Material).dispose();
    }
  }
}
