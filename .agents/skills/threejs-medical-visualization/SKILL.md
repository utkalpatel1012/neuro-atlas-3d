---
name: threejs-medical-visualization
description: Best practices and shader implementations for Three.js WebGPURenderer, Three Shading Language (TSL), stencil capping, order-independent transparency, BVH raycasting, and BatchedMesh optimization in medical web applications.
---

# Three.js Medical Visualization Skill

## Purpose
Provides technical specifications, architectural patterns, and shader implementations for high-performance medical and neuroanatomical rendering in Three.js (r172+).

## Core Architectural Rules

### 1. Viewport Lifecycle & Renderer Initialization
* Initialize `WebGPURenderer` with automatic fallback to `WebGLBackend`:
```typescript
import { WebGPURenderer } from 'three/webgpu';
const renderer = new WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
await renderer.init();
```
* Configure color management:
```typescript
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

### 2. Raycast Optimization (`three-mesh-bvh`)
* Accelerate all anatomical meshes using BVH:
```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
```
* Generates sub-millisecond intersection tests on mouse move over 500k+ polygons.

### 3. Stencil Capped Clipping Planes
* Use Three.js `StencilPass` to render solid interior caps when slicing through 3D brain geometry:
  1. Render front faces to stencil buffer (`IncrementWrap`).
  2. Render back faces to stencil buffer (`DecrementWrap`).
  3. Render capping plane geometry where stencil value is non-zero, displaying interior tissue cross-section texture.

### 4. Order-Independent Transparency (OIT)
* Implement blue-noise dithered screen-door transparency for overlapping cortical and subcortical structures.
* Avoids standard alpha-sorting popping and transparent geometry sorting glitches in WebGL.

### 5. Draw Call Minimization (`BatchedMesh`)
* Consolidate static anatomical sub-meshes sharing common materials into `THREE.BatchedMesh`.
* Preserves individual structure matrix transforms, color overrides, and bounding boxes while executing in a single GPU draw call.
