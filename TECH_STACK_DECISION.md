# Technology Stack Decision Record & Failure Modes

**Document Version**: 2.0.0 (Remediated in Phase 0.1)  
**Authority**: Lead Technical Architect & Senior 3D Web Developer  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Technology Selection, Rationale & Failure Mode Analysis

| Technology Component | Why It Was Selected | Known Failure Modes & Limitations | Mitigation & Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **Three.js (r172+) with `WebGPURenderer`** | Forward-looking WebGPU engine delivering compute shader support, storage buffers, and direct GPU pipeline state caching. Unified Three Shading Language (TSL) cross-compiles to WGSL and GLSL. | 1. WebGPU device loss (`GPUDevice.lost`) triggered by OS sleep or heavy compute.<br>2. Driver bugs or incomplete implementations on older mobile chips or Linux.<br>3. Rapid API evolution across Three.js minor versions. | Automatic fallback to `WebGLBackend` if WebGPU initialization fails. Implementation of formal `RENDERER_RESILIENCE.md` state machine to re-instantiate device and restore application state seamlessly. |
| **glTF 2.0 Binary (`.glb`)** | ISO standard for 3D web delivery. Compact single-file binary containing geometry buffers, hierarchy nodes, and material accessors. | Parsing overhead if JSON chunk is excessively large; potential node duplication if hierarchy is deeply nested. | Node names kept strictly unique; hierarchy depth capped at 4 levels (`Assembly -> System -> Organ -> Subpart`). |
| **Meshopt Compression (`EXT_meshopt_compression`) via `gltfpack`** | Decompresses 10x–50x faster than Draco on CPU using SIMD instructions; pre-optimizes vertex cache layouts and overdraw on GPU. Eliminates main-thread UI jank. | 1. Older browser engines lacking WASM SIMD fall back to slower scalar decoding.<br>2. Extreme quantization (e.g., 10-bit) can cause visible vertex snapping on fine cranial nerves. | 14-bit position quantization used for delicate cranial nerves; fallback scalar WASM decoder included in vendor bundle. |
| **KTX2 / Basis Universal (`KHR_texture_basisu`)** | Transcodes on a worker thread to native GPU formats (ASTC for Apple Silicon/iOS, BC7 for desktop). **Saves 75% VRAM**, preventing mobile Safari Jetsam memory crashes. | 1. Transcoder worker download latency on cold start (~200 KB).<br>2. ETC1S compression introduces block artifacts on high-frequency normal maps. | Transcoder worker preloaded during splash screen. High-detail normal and curvature maps strictly encoded using **UASTC with Zstandard level 18**, reserving ETC1S only for diffuse albedo masks. |
| **`three-mesh-bvh`** | Accelerates spatial raycasting from $O(N)$ to $O(\log N)$, keeping hover and click selection latency well within device-class targets (<1.5 ms) over 500,000+ polygons. | 1. Initial BVH tree generation incurs a one-time CPU compute cost and minor memory overhead during asset loading.<br>2. Dynamic vertex deconstruction requires BVH refit. | BVH trees pre-computed once upon geometry upload and cached. Raycasting disabled during continuous camera tweening. |
| **Three.js `BatchedMesh`** | Consolidates multiple distinct anatomical geometries sharing a common material into a single GPU multi-draw call, reducing CPU driver overhead on mobile and iPad. | 1. Maximum vertex and index counts must be pre-allocated upon batch creation.<br>2. Cannot dynamically add arbitrary new geometries that exceed buffer capacity without full rebuild. | Batch capacities budgeted during Phase 1 based on anatomical system groupings (e.g., `CortexBatch`, `SubcorticalBatch`, `VascularBatch`). |
| **React 19 (Hybrid R3F Architecture)** | Concurrent UI rendering, declarative component lifecycle, optimal for complex multi-tab clinical drawers and search dialogs. | The "React Pitfall": Calling `setState()` inside Three.js animation loops (`useFrame`) causes React reconciliation on every frame, collapsing FPS. | **MANDATORY RULE**: Zero `setState()` inside render loops. High-frequency updates (hover coordinates, camera metrics) mutate imperative refs or transient Zustand subscriptions directly. |
| **MiniSearch** | Lightweight (<7 KB), sub-millisecond client-side prefix and fuzzy search across multi-field medical terms, Latin synonyms, and acronyms. | Inverted index must be resident in memory; large vocabularies increase memory footprint. | Index built at build time and partitioned; memory footprint kept <5 MB. |
| **Dexie.js (IndexedDB) + Cache API** | Asynchronous offline storage for user clinical notes, custom bookmarks, and binary 3D assets. | Storage quotas subject to browser eviction under extreme disk pressure on iOS. | Quota inspection via `navigator.storage.estimate()`; critical bookmarks synced to optional local JSON export. |
| **Vite PWA (Workbox)** | Aggressive `CacheFirst` service worker caching for 100% offline hospital and clinical usage. | Stale-while-revalidate can serve cached assets during an update until service worker reload is accepted. | Explicit user notification banner when an updated atlas build is available. |

---

## 2. Alternatives Evaluated & Rejected

* **Draco Compression (`KHR_draco_mesh_compression`)**: Rejected as primary format due to high CPU decode latency and UI micro-stutters when loading dozens of separate anatomical meshes.
* **Uncompressed PNG/JPEG Textures**: Strictly prohibited due to VRAM explosion (64 MB per 4K texture), which triggers fatal iPadOS Safari Jetsam memory termination.
* **Babylon.js**: Larger bundle footprint and less flexible community tooling for custom scientific neuroimaging post-processing and React integration.
* **Unity / Unreal WebGL Export**: Monolithic WASM runtime (>50–150 MB initial load), slow startup times (>15 seconds), terrible mobile/tablet browser battery efficiency, and inability to integrate cleanly with standard responsive DOM/React UI.
