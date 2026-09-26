# 3D Viewport Renderer Resilience & Fault-Tolerance Specification

**Document Version**: 1.0.0  
**Authority**: Senior 3D Web Graphics Engineer & Lead Technical Architect  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Executive Summary & Problem Statement

In browser-based medical visualization—particularly on iPadOS Safari and mobile workstations with shared unified memory—WebGL context loss and WebGPU device loss are **expected runtime events**, not rare exceptions.

### Primary Triggers of Context Loss
1. **OS Memory Pressure (Jetsam / OOM Killer)**: iPadOS kills or evicts WebGL processes when GPU canvas allocations exceed memory thresholds (~384 MB on base iPads; 1–1.5 GB on iPad Pro).
2. **GPU Driver Resets / TDR (Timeout Detection and Recovery)**: Heavy compute shaders or massive draw calls exceeding ~2 seconds on Windows/macOS trigger an OS-level GPU driver reset.
3. **Background Tab Suspension**: Mobile browsers systematically drop WebGL contexts when the user switches tabs or puts the device to sleep.
4. **Display Sleep / Power Transitions**: Disconnecting an external monitor or switching between integrated and discrete GPUs.

A professional clinical application must never crash into an unrecoverable blank screen. It must implement an explicit **Renderer Health Lifecycle State Machine** with automated state preservation and seamless recovery.

---

## 2. Renderer Lifecycle State Machine

```
               ┌───────────────┐
               │    INIT       │
               └───────┬───────┘
                       │ Device/Context Acquired
                       ▼
               ┌───────────────┐
         ┌────►│    HEALTHY    ├─────┐
         │     └───────┬───────┘     │
Performance      Frame │   ▲ Frame   │ Low Memory /
Degradation      Drops │   │ Recovery│ Context Loss
Triggered              ▼   │         │
               ┌───────────────┴┐    │
               │   DEGRADED     │    │
               └───────┬────────┘    │
                       │             │
                       ▼             ▼
               ┌─────────────────────┐
               │    CONTEXT_LOST     │
               └───────┬─────────────┘
                       │ Event: webglcontextrestored / GPUDevice.lost handled
                       ▼
               ┌─────────────────────┐
               │    RECOVERING       │
               └───────┬─────────────┘
                       │
             ┌─────────┴─────────┐
             │                   │
      Success│            Failure│ Max retries exceeded (3x)
             ▼                   ▼
       [HEALTHY]             [FAILED]
                         (Graceful 2D Orthogonal Fallback)
```

### State Definitions & Operational Rules

| Lifecycle State | Operational Condition | Action & Self-Healing Protocol |
| :--- | :--- | :--- |
| **`HEALTHY`** | 60 FPS maintained; VRAM within device budget; 0 dropped frames. | Full PBR materials, ambient occlusion, active stencil clipping, and smooth raycasting. |
| **`DEGRADED`** | Frame rate drops below 35 FPS for >3 consecutive seconds, or memory warning event received. | 1. Halve canvas pixel ratio (`pixelRatio = 1.0` or `0.75`).<br>2. Disable post-processing ambient occlusion (GTAO) and soft shadows.<br>3. Downgrade non-selected structures to lower LOD meshes.<br>4. Disable runtime alpha-hashed transparency. |
| **`CONTEXT_LOST`** | `webglcontextlost` event or `GPUDevice.lost` promise resolved. | 1. Halt animation loop (`cancelAnimationFrame`).<br>2. Freeze UI and display unobtrusive "Restoring 3D Viewport..." overlay.<br>3. Snapshot current application state to memory cache.<br>4. Call `event.preventDefault()` to signal browser that recovery is intended. |
| **`RECOVERING`** | `webglcontextrestored` fired or new `GPUDevice` requested. | 1. Re-initialize `WebGPURenderer` / `WebGLBackend`.<br>2. Re-upload geometries from Cache API / IndexedDB.<br>3. Recompile TSL shaders.<br>4. Restore saved application snapshot (camera, selection, clipping).<br>5. Resume animation loop. |
| **`FAILED`** | 3 consecutive recovery attempts fail within 30 seconds. | 1. Terminate 3D canvas gracefully.<br>2. Display diagnostics dialog explaining GPU memory exhaustion.<br>3. Switch UI seamlessly to fallback **2D Orthogonal Slice Viewer** (axial/coronal/sagittal static slices) so the resident can continue studying without interruption. |

---

## 3. Session State Snapshot & Restoration

When context loss occurs, the application state must be instantly preserved. The snapshot is serialized to memory and mirrored in `sessionStorage`:

```typescript
export interface ViewportSessionSnapshot {
  timestamp: number;
  active_structure_id: string | null;
  camera_transform: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
  active_visibility_preset_id: string;
  active_peel_stage: number;
  active_visualization_mode: 'OPAQUE' | 'GHOSTED' | 'X_RAY' | 'SLICE' | 'EXPLODED';
  clipping_planes: {
    axial_offset_mm: number;
    coronal_offset_mm: number;
    sagittal_offset_mm: number;
    planes_enabled: boolean;
  };
  active_circuit_highlight_ids: string[];
}
```

---

## 4. Implementation Protocol for Three.js (r172+)

### A. WebGL2 Context Loss Handling
```typescript
const canvas = renderer.domElement;

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault(); // MANDATORY: Prevents browser from permanently disabling context
  useRendererStore.getState().setLifecycleState('CONTEXT_LOST');
  cancelAnimationFrame(animationFrameId);
  snapshotCurrentSession();
}, false);

canvas.addEventListener('webglcontextrestored', async () => {
  useRendererStore.getState().setLifecycleState('RECOVERING');
  try {
    await reinitializeRenderer();
    restoreSessionSnapshot();
    useRendererStore.getState().setLifecycleState('HEALTHY');
    requestAnimationFrame(renderLoop);
  } catch (error) {
    useRendererStore.getState().setLifecycleState('FAILED');
  }
}, false);
```

### B. WebGPU Device Loss Handling
```typescript
if (renderer.backend.isWebGPUBackend) {
  const device = renderer.backend.device as GPUDevice;
  device.lost.then(async (info) => {
    console.warn(`WebGPU device was lost: ${info.reason}. Message: ${info.message}`);
    useRendererStore.getState().setLifecycleState('CONTEXT_LOST');
    snapshotCurrentSession();
    
    if (info.reason !== 'destroyed') {
      useRendererStore.getState().setLifecycleState('RECOVERING');
      await reinitializeWebGPURenderer();
      restoreSessionSnapshot();
      useRendererStore.getState().setLifecycleState('HEALTHY');
    }
  });
}
```
