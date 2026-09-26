/**
 * 3D Neuroanatomy Atlas: Renderer Manager & Backend Abstraction
 * Standard: AAS-2026-NEURO-V1 (Phase 2.0 Foundation)
 * 
 * Manages Three.js rendering pipelines with seamless WebGPU support,
 * graceful WebGL2 fallback, capability detection, context-loss resilience,
 * and adaptive pixel ratio clamping for iPad/mobile displays.
 */

import * as THREE from 'three';
import {
  BackendType,
  CapabilityReport,
  PerformanceProfile,
  PERFORMANCE_PROFILES
} from './types';

export interface RendererManagerOptions {
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
  forceBackend?: BackendType;
  performanceProfile?: PerformanceProfile;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export class RendererManager {
  private canvas?: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | any; // WebGPURenderer or WebGLRenderer
  private capabilities: CapabilityReport;
  private activeBackend: BackendType = 'unsupported';
  private performanceProfile: PerformanceProfile;
  private isContextLost = false;
  private onContextLostCallback?: () => void;
  private onContextRestoredCallback?: () => void;

  constructor(options: RendererManagerOptions = {}) {
    this.canvas = options.canvas;
    this.performanceProfile = options.performanceProfile || PERFORMANCE_PROFILES.HIGH;
    this.onContextLostCallback = options.onContextLost;
    this.onContextRestoredCallback = options.onContextRestored;

    if (!this.canvas && options.container && typeof document !== 'undefined') {
      let foundCanvas = options.container.querySelector('canvas');
      if (!foundCanvas) {
        foundCanvas = document.createElement('canvas');
        foundCanvas.style.width = '100%';
        foundCanvas.style.height = '100%';
        foundCanvas.style.display = 'block';
        options.container.appendChild(foundCanvas);
      }
      this.canvas = foundCanvas;
    }

    // Initial placeholder capabilities (will be populated during init)
    this.capabilities = {
      hasWebGPU: false,
      hasWebGL2: false,
      hasWebGL: false,
      preferredBackend: 'unsupported',
      activeBackend: 'unsupported',
      maxTextureSize: 4096,
      maxSamples: 4,
      supportsFloatTextures: true,
      supportsMeshopt: true,
      deviceType: 'desktop',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node'
    };
  }

  /**
   * Static alias for detectCapabilities
   */
  public static async checkCapabilities(): Promise<CapabilityReport> {
    return RendererManager.detectCapabilities();
  }

  /**
   * Probes environment capabilities and initializes the optimal renderer.
   */
  public async initialize(
    target?: HTMLElement | HTMLCanvasElement | BackendType,
    forceBackend?: BackendType
  ): Promise<THREE.WebGLRenderer | any> {
    let resolvedTargetBackend: BackendType | undefined = forceBackend;

    if (typeof target === 'string') {
      resolvedTargetBackend = target as BackendType;
    } else if (target && typeof (target as any).getContext === 'function') {
      this.canvas = target as HTMLCanvasElement;
    } else if (target && (target as HTMLElement).appendChild) {
      if (typeof document !== 'undefined') {
        let foundCanvas = (target as HTMLElement).querySelector('canvas');
        if (!foundCanvas) {
          foundCanvas = document.createElement('canvas');
          foundCanvas.style.width = '100%';
          foundCanvas.style.height = '100%';
          foundCanvas.style.display = 'block';
          (target as HTMLElement).appendChild(foundCanvas);
        }
        this.canvas = foundCanvas;
      }
    }

    const caps = await RendererManager.detectCapabilities();
    this.capabilities = { ...caps };

    const targetBackend = resolvedTargetBackend || caps.preferredBackend;
    console.log(`[RENDERER MANAGER] Probed capabilities. Target backend: ${targetBackend}`);

    if (targetBackend === 'webgpu' && caps.hasWebGPU) {
      try {
        await this.initWebGPU();
        this.activeBackend = 'webgpu';
        console.log('[RENDERER MANAGER] WebGPURenderer successfully initialized.');
      } catch (err: any) {
        console.warn(`[RENDERER MANAGER] WebGPU initialization failed: ${err.message}. Falling back to WebGL2...`);
        if (caps.hasWebGL2) {
          this.initWebGL2();
          this.activeBackend = 'webgl2';
        } else if (caps.hasWebGL) {
          this.initWebGL1();
          this.activeBackend = 'webgl';
        } else {
          this.activeBackend = 'unsupported';
          throw new Error('Neither WebGPU nor WebGL is supported in this environment.');
        }
      }
    } else if (targetBackend === 'webgl2' && caps.hasWebGL2) {
      this.initWebGL2();
      this.activeBackend = 'webgl2';
    } else if (caps.hasWebGL) {
      this.initWebGL1();
      this.activeBackend = 'webgl';
    } else {
      this.activeBackend = 'unsupported';
      // In headless test environments without WebGL, instantiate a dummy renderer to avoid throwing
      if (typeof window === 'undefined') {
        this.renderer = {
          domElement: this.canvas || { style: {}, addEventListener: () => {}, removeEventListener: () => {} },
          setSize: () => {},
          setPixelRatio: () => {},
          render: () => {},
          dispose: () => {},
          info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } }
        };
        this.capabilities.activeBackend = 'unsupported';
        return this.renderer;
      }
      throw new Error('Hardware acceleration unavailable: No WebGPU or WebGL2 context available.');
    }

    this.capabilities.activeBackend = this.activeBackend;
    this.applyPixelRatio();
    this.setupContextLossHandling();

    return this.renderer;
  }

  /**
   * Initializes modern Three.js WebGPURenderer.
   */
  private async initWebGPU(): Promise<void> {
    if (!this.canvas) {
      throw new Error('No canvas element available for WebGPU initialization.');
    }
    const { WebGPURenderer } = await import('three/webgpu');
    this.renderer = new WebGPURenderer({
      canvas: this.canvas,
      antialias: this.performanceProfile.antialias,
      powerPreference: 'high-performance'
    });

    if (typeof this.renderer.init === 'function') {
      await this.renderer.init();
    }

    // Configure color management
    if (this.renderer.outputColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
  }

  /**
   * Initializes standard Three.js WebGL2Renderer fallback.
   */
  private initWebGL2(): void {
    if (!this.canvas) {
      throw new Error('No canvas element available for WebGL2 initialization.');
    }

    const glContext = this.canvas.getContext('webgl2', {
      antialias: this.performanceProfile.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: false,
      stencil: true
    });

    if (!glContext) {
      throw new Error('Failed to acquire WebGL2 context from canvas.');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context: glContext as WebGL2RenderingContext,
      antialias: this.performanceProfile.antialias,
      powerPreference: 'high-performance'
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  /**
   * Initializes standard WebGL 1.0 fallback for legacy devices.
   */
  private initWebGL1(): void {
    if (!this.canvas) {
      throw new Error('No canvas element available for WebGL initialization.');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.performanceProfile.antialias,
      powerPreference: 'default'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  /**
   * Detects available GPU acceleration backends and hardware capabilities.
   */
  public static async detectCapabilities(): Promise<CapabilityReport> {
    const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
    let hasWebGPU = false;
    let hasWebGL2 = false;
    let hasWebGL = false;
    let adapterInfo: any = undefined;
    let maxTextureSize = 4096;
    let maxSamples = 4;
    let userAgent = isBrowser ? navigator.userAgent : 'node';

    // Device classification
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isBrowser) {
      const ua = userAgent.toLowerCase();
      const isTouch = navigator.maxTouchPoints > 0;
      if (/ipad|tablet|(android(?!.*mobile))/i.test(ua) || (isTouch && window.innerWidth >= 768)) {
        deviceType = 'tablet';
      } else if (/mobile|iphone|ipod|android/i.test(ua)) {
        deviceType = 'mobile';
      }
    }

    // Probe WebGPU
    if (isBrowser && 'gpu' in navigator && typeof (navigator as any).gpu?.requestAdapter === 'function') {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
          hasWebGPU = true;
          if (typeof adapter.requestAdapterInfo === 'function') {
            const info = await adapter.requestAdapterInfo();
            adapterInfo = {
              vendor: info.vendor || 'Generic WebGPU Vendor',
              architecture: info.architecture,
              device: info.device,
              description: info.description
            };
          } else if (adapter.info) {
            adapterInfo = {
              vendor: adapter.info.vendor || 'WebGPU Vendor',
              architecture: adapter.info.architecture,
              device: adapter.info.device,
              description: adapter.info.description
            };
          }
          if (adapter.limits) {
            maxTextureSize = adapter.limits.maxTextureDimension2D || 8192;
            maxSamples = 4;
          }
        }
      } catch (e) {
        hasWebGPU = false;
      }
    }

    // Probe WebGL2 & WebGL
    if (isBrowser && typeof document !== 'undefined') {
      const probeCanvas = document.createElement('canvas');
      const gl2 = probeCanvas.getContext('webgl2');
      if (gl2) {
        hasWebGL2 = true;
        maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || maxTextureSize;
        maxSamples = gl2.getParameter(gl2.MAX_SAMPLES) || maxSamples;
        if (!adapterInfo) {
          const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
          if (dbg) {
            adapterInfo = {
              vendor: gl2.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || 'WebGL2 Vendor',
              description: gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'WebGL2 Renderer'
            };
          }
        }
      }

      const gl1 = probeCanvas.getContext('webgl') || probeCanvas.getContext('experimental-webgl');
      if (gl1) {
        hasWebGL = true;
      }
    }

    let preferredBackend: BackendType = 'unsupported';
    if (hasWebGPU) {
      preferredBackend = 'webgpu';
    } else if (hasWebGL2) {
      preferredBackend = 'webgl2';
    } else if (hasWebGL) {
      preferredBackend = 'webgl';
    }

    return {
      hasWebGPU,
      hasWebGL2,
      hasWebGL,
      preferredBackend,
      activeBackend: preferredBackend,
      adapterInfo,
      maxTextureSize,
      maxSamples,
      supportsFloatTextures: true,
      supportsMeshopt: true,
      deviceType,
      userAgent
    };
  }

  /**
   * Applies pixel ratio clamped to active performance profile.
   */
  public applyPixelRatio(): void {
    if (!this.renderer) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const clampedDpr = Math.min(dpr, this.performanceProfile.maxPixelRatio);
    this.renderer.setPixelRatio(clampedDpr);
  }

  /**
   * Updates renderer size on window/container resize.
   */
  public setSize(width: number, height: number, updateStyle = true): void {
    if (this.renderer) {
      this.renderer.setSize(width, height, updateStyle);
    }
  }

  /**
   * Renders the scene through the active backend.
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.renderer || this.isContextLost) return;
    this.renderer.render(scene, camera);
  }

  /**
   * Sets up context loss and recovery event listeners for WebGL, and monitors
   * GPUDevice.lost promise for WebGPU pipelines.
   * 
   * WebGPU Device Loss Lifecycle (Status: PARTIAL / FUTURE IMPLEMENTATION):
   * 1. DEVICE_HEALTHY: Normal active frame rendering.
   * 2. DEVICE_LOST: Hardware reset, TDR timeout, or driver crash triggered.
   * 3. RECOVERY_ATTEMPT: Render loop paused, resources quarantined.
   * 4. DEVICE_RECREATED: Re-probe GPUAdapter and request new GPUDevice (Future).
   * 5. RESOURCES_REBOUND: Re-bind buffers and recompile pipelines (Future).
   * 6. DEVICE_HEALTHY: Rendering resumed.
   */
  private setupContextLossHandling(): void {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    // 1. WebGL Context Loss Handlers (Canvas DOM Events)
    this.canvas.addEventListener('webglcontextlost', (event: Event) => {
      event.preventDefault();
      this.isContextLost = true;
      console.warn('[RENDERER MANAGER] WebGL context lost! Pausing render loop.');
      if (this.onContextLostCallback) this.onContextLostCallback();
    }, false);

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
      console.log('[RENDERER MANAGER] WebGL context restored! Restoring pipeline state.');
      if (this.onContextRestoredCallback) this.onContextRestoredCallback();
    }, false);

    // 2. WebGPU Device Loss Monitoring (GPUDevice Promise API)
    this.setupWebGPUDeviceLossHandling();
  }

  private setupWebGPUDeviceLossHandling(): void {
    try {
      const gpuDevice = (this.renderer as any)?.backend?.device || (this.renderer as any)?.device;
      if (gpuDevice && typeof gpuDevice.lost?.then === 'function') {
        gpuDevice.lost.then((info: any) => {
          this.isContextLost = true;
          console.warn(`[RENDERER MANAGER] WebGPU device lost! Reason: ${info.reason}, Message: ${info.message}`);
          console.warn('[RENDERER MANAGER] WebGPU Device Re-creation: PARTIAL / FUTURE IMPLEMENTATION');
          if (this.onContextLostCallback) this.onContextLostCallback();
        });
      }
    } catch {
      // Graceful ignore if WebGPU device inspection not accessible in current runtime
    }
  }

  public onContextLost(cb: () => void): void {
    this.onContextLostCallback = cb;
  }

  public onContextRestored(cb: () => void): void {
    this.onContextRestoredCallback = cb;
  }

  /**
   * Sets the active performance profile.
   */
  public setPerformanceProfile(profile: PerformanceProfile): void {
    this.performanceProfile = profile;
    this.applyPixelRatio();
  }

  public getPerformanceProfile(): PerformanceProfile {
    return this.performanceProfile;
  }

  public getCapabilities(): CapabilityReport {
    return this.capabilities;
  }

  public getCapabilityReport(): CapabilityReport {
    return this.capabilities;
  }

  public getActiveBackend(): BackendType {
    return this.activeBackend;
  }

  public getRenderer(): any {
    return this.renderer;
  }

  public getCanvas(): HTMLCanvasElement | undefined {
    return this.canvas || this.renderer?.domElement;
  }

  public getUnderlyingRenderer(): any {
    return this.renderer;
  }

  public isLost(): boolean {
    return this.isContextLost;
  }

  public isWebGPULost(): boolean {
    return this.isContextLost;
  }

  public dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
