# 3D Asset Streaming & Memory Lifecycle Architecture

**Document Version**: 1.0.0  
**Authority**: Senior 3D Web Graphics Engineer & Performance Architect  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Executive Summary & Core Principle

> **The complete 3D brain atlas (500+ structures, high-resolution cortical meshes, tracts, and vasculature) is NEVER assumed to be resident simultaneously in GPU memory.**
> 
> Loading all assets simultaneously would exceed mobile and tablet memory ceilings, causing instant Jetsam crashes on iPadOS Safari. The atlas architecture enforces an asynchronous **AssetManager** pipeline supporting lazy loading, priority queues, worker-based decoding, and automated memory-pressure cache eviction.

---

## 2. Asset Streaming Pipeline Architecture

```
[Asset Manifest (assets.manifest.json)]
                   │
                   ▼  (Step 1: Priority Queueing)
[Download Priority Queue]
  Priority 1: Core Subcortical & Ventricular Hubs (~2 MB)
  Priority 2: Primary Lobes & Major Gyri (~5 MB)
  Priority 3: White Matter Pathways & Cranial Nerves (~4 MB)
  Priority 4: Fine Gyral Sub-Parcellations & Vasculature (~6 MB)
                   │
                   ▼  (Step 2: Network / Cache API Fetch)
[Service Worker Cache API / IndexedDB Range Requests]
                   │
                   ▼  (Step 3: Web Worker SIMD Decoding)
[Worker Thread: Meshopt Decode + KTX2 Transcoding]
                   │
                   ▼  (Step 4: Main Thread Buffer Upload)
[GPU VRAM Buffer Allocation (BatchedMesh Geometry)]
                   │
                   ▼  (Step 5: Memory Monitor & Eviction)
[LRU Cache & Memory Pressure Eviction Pool]
```

---

## 3. AssetManager Subsystem Architecture

The client-side `AssetManager` manages asset lifecycles through distinct states:
1. **`UNLOADED`**: Asset entry exists in `assets.manifest.json`; no memory allocated.
2. **`DOWNLOADING`**: Compressed `.glb` / `.ktx2` chunk is streaming over network or reading from Cache API.
3. **`DECODING`**: Web Worker is performing Meshopt SIMD decompression and KTX2 transcoding into GPU-native ASTC/BC7 buffers.
4. **`GPU_RESIDENT`**: Buffers are uploaded to GPU VRAM and linked to Three.js `Object3D` scene nodes.
5. **`EVICTED`**: Structure geometry is disposed from VRAM under memory pressure; metadata remains in RAM.

### LRU Eviction & Memory-Pressure Recovery
* When the total GPU memory exceeds **85% of the device-class budget** (defined in `PERFORMANCE_BUDGETS.md`), the `AssetManager` triggers an **LRU (Least Recently Used) Eviction Cycle**:
  1. Identify structures that are currently hidden (`visible === false`) and not selected.
  2. Traverse non-visible structures in order of oldest interaction timestamp.
  3. Call `.dispose()` on their geometry and texture GPU buffers.
  4. Demote state to `UNLOADED`.
* If the user subsequently toggles visibility on an evicted structure, the `AssetManager` re-streams the asset instantly from the local Cache API (<50 ms latency).
