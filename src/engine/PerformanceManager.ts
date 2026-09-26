/**
 * 3D Neuroanatomy Atlas: Performance and Telemetry Manager
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Continuous rolling frame telemetry, GPU draw metrics,
 * and adaptive performance profiling (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three';
import {
  BackendType,
  LODLevel,
  PERFORMANCE_PROFILES,
  PerformanceProfile,
  PerformanceProfileType,
  TelemetryMetrics
} from './types';

export type TelemetryListener = (metrics: TelemetryMetrics) => void;

export class PerformanceManager {
  private activeProfile: PerformanceProfile;
  private backendType: BackendType;
  private frameTimestamps: number[] = [];
  private frameDurations: number[] = [];
  private readonly WINDOW_SIZE = 60;
  private frameStartTime: number = 0;

  // Cached current telemetry
  private metrics: TelemetryMetrics;
  private listeners: Set<TelemetryListener> = new Set();
  private lastEmitTime: number = 0;
  private readonly EMIT_INTERVAL_MS = 250; // Emit 4 times/sec to avoid UI thrash

  constructor(backendType: BackendType, initialProfile: PerformanceProfileType = 'HIGH') {
    this.backendType = backendType;
    this.activeProfile = PERFORMANCE_PROFILES[initialProfile];

    this.metrics = {
      fps: 60,
      frameTimeMs: 16.6,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      activeBackend: backendType,
      activeLOD: 'lod0',
      residentAssets: 0,
      cameraDistanceMm: 0,
      pixelRatio: 1.0
    };
  }

  public setBackendType(backendType: BackendType): void {
    this.backendType = backendType;
    this.metrics.activeBackend = backendType;
  }

  public getProfile(): PerformanceProfile {
    return this.activeProfile;
  }

  public setProfile(profileType: PerformanceProfileType): PerformanceProfile {
    this.activeProfile = PERFORMANCE_PROFILES[profileType];
    return this.activeProfile;
  }

  /**
   * Called immediately before scene rendering begins.
   */
  public beginFrame(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * Called immediately after scene rendering completes.
   */
  public endFrame(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    activeLOD: LODLevel,
    residentAssets: number,
    targetCentroid?: [number, number, number],
    extra?: Partial<TelemetryMetrics>
  ): void {
    const now = performance.now();
    const frameDuration = now - this.frameStartTime;

    this.frameTimestamps.push(now);
    this.frameDurations.push(frameDuration);

    if (this.frameTimestamps.length > this.WINDOW_SIZE) {
      this.frameTimestamps.shift();
      this.frameDurations.shift();
    }

    // Compute rolling average FPS
    let fps = 60;
    if (this.frameTimestamps.length > 1) {
      const elapsedTotal =
        this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      if (elapsedTotal > 0) {
        fps = Math.round(((this.frameTimestamps.length - 1) / elapsedTotal) * 1000);
      }
    }

    // Average frame time
    const avgFrameTime =
      this.frameDurations.reduce((a, b) => a + b, 0) / (this.frameDurations.length || 1);

    // Camera distance to target
    let cameraDistanceMm = 0;
    if (targetCentroid) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const targetPos = new THREE.Vector3(targetCentroid[0], targetCentroid[1], targetCentroid[2]);
      cameraDistanceMm = Math.round(camPos.distanceTo(targetPos));
    }

    // Extract renderer stats if available
    let drawCalls = 0;
    let triangles = 0;
    let geometries = 0;
    let textures = 0;

    if (renderer && renderer.info) {
      drawCalls = renderer.info.render.calls;
      triangles = renderer.info.render.triangles;
      geometries = renderer.info.memory.geometries;
      textures = renderer.info.memory.textures;
    }

    this.metrics = {
      fps,
      frameTimeMs: Number(avgFrameTime.toFixed(2)),
      drawCalls,
      triangles,
      geometries,
      textures,
      activeBackend: this.backendType,
      activeLOD,
      residentAssets,
      cameraDistanceMm,
      pixelRatio: renderer?.getPixelRatio?.() ?? 1.0,
      ...extra
    };

    // Throttle listener notifications
    if (now - this.lastEmitTime >= this.EMIT_INTERVAL_MS) {
      this.lastEmitTime = now;
      this.notifyListeners();
    }
  }

  public getMetrics(): TelemetryMetrics {
    return { ...this.metrics };
  }

  public onMetricsUpdated(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.metrics);
      } catch (err) {
        console.error('[PerformanceManager] Listener error:', err);
      }
    }
  }

  public dispose(): void {
    this.listeners.clear();
    this.frameTimestamps = [];
    this.frameDurations = [];
  }
}
