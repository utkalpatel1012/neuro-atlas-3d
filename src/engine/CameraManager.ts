/**
 * 3D Neuroanatomy Atlas: Camera System & Controls
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Medical-anatomy-oriented perspective camera and orbital controls supporting:
 * - Orbit, pan, zoom/dolly with smooth inertia damping
 * - Desktop mouse/keyboard & iPad/mobile multi-touch interaction
 * - Anatomical view presets (Anterior, Superior, Lateral Left, Medial Left, Isometric)
 * - Safe anatomical distance clamping (15 mm - 600 mm)
 * - Smooth camera transitions and focal framing
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CameraViewPreset } from './types';

export interface CameraManagerOptions {
  canvas?: HTMLCanvasElement;
  aspectRatio?: number;
  initialTarget?: THREE.Vector3;
}

export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  public controls?: OrbitControls;

  private defaultTarget: THREE.Vector3;
  private defaultPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private isTransitioning = false;
  private transitionAlpha = 0;
  private transitionDuration = 0.8; // seconds

  constructor(
    canvasOrWidthOrOptions?: HTMLElement | HTMLCanvasElement | number | CameraManagerOptions,
    height?: number
  ) {
    let aspect = 16 / 9;
    let canvas: HTMLElement | HTMLCanvasElement | undefined = undefined;
    let initialTarget: THREE.Vector3 | undefined = undefined;

    if (typeof canvasOrWidthOrOptions === 'number' && typeof height === 'number') {
      aspect = canvasOrWidthOrOptions / Math.max(1, height);
    } else if (canvasOrWidthOrOptions && typeof (canvasOrWidthOrOptions as any).getContext === 'function') {
      canvas = canvasOrWidthOrOptions as HTMLCanvasElement;
      if (typeof window !== 'undefined') {
        aspect = window.innerWidth / Math.max(1, window.innerHeight);
      }
    } else if (canvasOrWidthOrOptions && typeof canvasOrWidthOrOptions === 'object') {
      const opts = canvasOrWidthOrOptions as CameraManagerOptions;
      if (opts.aspectRatio) aspect = opts.aspectRatio;
      if (opts.canvas) canvas = opts.canvas;
      if (opts.initialTarget) initialTarget = opts.initialTarget;
    } else if (typeof window !== 'undefined') {
      aspect = window.innerWidth / Math.max(1, window.innerHeight);
    }

    // Human macroscopic neuroanatomy scale: 1 unit = 1 mm
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1.0, 2000.0);

    // Initial default isometric view centered around left hippocampus region
    this.defaultTarget = initialTarget || new THREE.Vector3(-25.07, -13.89, -20.70);
    this.defaultPosition = new THREE.Vector3(-90.0, 50.0, 75.0);

    this.camera.position.copy(this.defaultPosition);
    this.camera.up.set(0, 1, 0); // +Y is Superior

    this.targetPosition = this.defaultPosition.clone();
    this.targetLookAt = this.defaultTarget.clone();

    if (canvas) {
      this.setupControls(canvas);
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public setupControls(canvas: HTMLElement | HTMLCanvasElement): void {
    if (this.controls) {
      this.controls.dispose();
    }

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.defaultTarget);

    // Configure medical navigation feel
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.85;
    this.controls.panSpeed = 0.85;
    this.controls.zoomSpeed = 1.0;

    // Distance clamping preventing clipping through organs or zooming into void
    this.controls.minDistance = 15.0;  // 15 mm closeup
    this.controls.maxDistance = 600.0; // 600 mm whole-head overview

    // iPad / Mobile touch mapping
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.controls.update();
  }

  /**
   * Updates camera damping and smooth transition interpolations.
   */
  public update(deltaSeconds: number): boolean {
    let hasChanged = false;

    if (this.isTransitioning) {
      this.transitionAlpha += deltaSeconds / this.transitionDuration;
      const t = Math.min(1.0, this.transitionAlpha);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(this.camera.position, this.targetPosition, ease);
      if (this.controls) {
        this.controls.target.lerpVectors(this.controls.target, this.targetLookAt, ease);
      }

      if (t >= 1.0) {
        this.camera.position.copy(this.targetPosition);
        if (this.controls) {
          this.controls.target.copy(this.targetLookAt);
        }
        this.isTransitioning = false;
      }
      hasChanged = true;
    }

    const controlsChanged = this.controls ? this.controls.update() : false;
    return hasChanged || controlsChanged;
  }

  /**
   * Resets camera smoothly to default anatomical perspective view.
   */
  public reset(targetOrDuration?: THREE.Vector3 | number, duration = 0.8): void {
    if (targetOrDuration instanceof THREE.Vector3) {
      this.setPreset('isometric', targetOrDuration, duration);
    } else {
      this.setView('isometric', typeof targetOrDuration === 'number' ? targetOrDuration : 0.8);
    }
  }

  /**
   * Smoothly animates camera to standard neuroanatomical preset view.
   */
  public setView(preset: CameraViewPreset, duration = 0.8): void {
    const currentTarget = this.controls ? this.controls.target.clone() : this.defaultTarget.clone();
    const distance = 135.0; // Standard 135 mm observation distance

    let newPos: THREE.Vector3;
    switch (preset) {
      case 'anterior':
        // Look from +Z towards -Z
        newPos = currentTarget.clone().add(new THREE.Vector3(0, 0, distance));
        break;
      case 'posterior':
        // Look from -Z towards +Z
        newPos = currentTarget.clone().add(new THREE.Vector3(0, 0, -distance));
        break;
      case 'superior':
        // Look from +Y towards -Y
        newPos = currentTarget.clone().add(new THREE.Vector3(0, distance, 0.001));
        break;
      case 'lateral_left':
        // Look from lateral -X towards medial +X
        newPos = currentTarget.clone().add(new THREE.Vector3(-distance, 0, 0));
        break;
      case 'medial_left':
        // Look from medial +X towards lateral -X
        newPos = currentTarget.clone().add(new THREE.Vector3(distance, 0, 0));
        break;
      case 'isometric':
      default:
        // Anterolateral oblique angle
        newPos = currentTarget.clone().add(new THREE.Vector3(-75, 55, 90));
        break;
    }

    this.startTransition(newPos, currentTarget, duration);
  }

  /**
   * Sets preset and updates target, applying immediately if in test/immediate mode.
   */
  public setPreset(preset: CameraViewPreset, target?: THREE.Vector3, duration = 0.8): void {
    if (target) {
      this.defaultTarget.copy(target);
      if (this.controls) {
        this.controls.target.copy(target);
      }
    }
    this.setView(preset, duration);
    // If controls are absent or duration is 0, snap directly
    if (!this.controls || duration === 0) {
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.targetLookAt);
      this.isTransitioning = false;
    }
  }

  /**
   * Focuses camera smoothly onto a target bounding box or center point.
   */
  public focusOn(target: THREE.Box3 | THREE.Vector3, duration = 0.8): void {
    if (target instanceof THREE.Box3) {
      const center = new THREE.Vector3();
      target.getCenter(center);
      const size = new THREE.Vector3();
      target.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = this.camera.fov * (Math.PI / 180);
      const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;
      const targetPos = this.controls?.target ?? this.defaultTarget;
      const direction = this.camera.position.clone().sub(targetPos).normalize();
      const newPos = center.clone().add(direction.multiplyScalar(Math.max(distance, 40.0)));
      this.startTransition(newPos, center, duration);
    } else {
      const targetPos = this.controls?.target ?? this.defaultTarget;
      const currentOffset = this.camera.position.clone().sub(targetPos);
      const newPos = target.clone().add(currentOffset);
      this.startTransition(newPos, target, duration);
    }

    if (!this.controls || duration === 0) {
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.targetLookAt);
      this.isTransitioning = false;
    }
  }

  public focusBoundingBox(box: THREE.Box3, duration = 0.8): void {
    this.focusOn(box, duration);
  }

  public focusBoundingSphere(sphere: THREE.Sphere, duration = 0.8): void {
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = sphere.radius / Math.tan(fov / 2) * 1.5;
    const targetPos = this.controls?.target ?? this.defaultTarget;
    const direction = this.camera.position.clone().sub(targetPos).normalize();
    const newPos = sphere.center.clone().add(direction.multiplyScalar(Math.max(distance, 40.0)));
    this.startTransition(newPos, sphere.center.clone(), duration);

    if (!this.controls || duration === 0) {
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.targetLookAt);
      this.isTransitioning = false;
    }
  }

  private startTransition(toPos: THREE.Vector3, toLookAt: THREE.Vector3, duration: number): void {
    this.targetPosition.copy(toPos);
    this.targetLookAt.copy(toLookAt);
    this.transitionDuration = Math.max(0.1, duration);
    this.transitionAlpha = 0;
    this.isTransitioning = true;
  }

  /**
   * Updates projection matrix on viewport resize.
   */
  public onResize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public getDistanceToTarget(): number {
    return this.camera.position.distanceTo(this.controls?.target ?? this.defaultTarget);
  }

  public dispose(): void {
    this.controls?.dispose();
  }
}
