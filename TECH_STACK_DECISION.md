# Technology Stack Decision Record

**Document Version**: 1.0.0  
**Authority**: Lead Technical Architect & Senior 3D Web Developer  
**Project**: 3D Interactive Neuroanatomy Atlas for Psychiatry

---

## 1. Executive Summary of Recommended Stack

| Layer | Selected Technology | Primary Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Industry standard, optimal component lifecycle, concurrent rendering for high-density clinical panels |
| **Language** | **TypeScript 5.x (Strict Mode)** | Absolute type safety for complex neuroanatomical schemas, preventing runtime data bugs |
| **Build Tool & Bundler** | **Vite 6.x** | Sub-second HMR, optimized tree-shaking, native ES module support |
| **3D Engine** | **Three.js (r172+) with `WebGPURenderer`** | Next-generation WebGPU engine with automatic WebGL2 fallback; unified Three Shading Language (TSL) |
| **3D React Binding** | **React Three Fiber (R3F) + Drei** *(Hybrid Architecture)* | Declarative scene lifecycle and automatic WebGL resource disposal, paired with imperative refs inside `useFrame` |
| **3D File Format** | **glTF 2.0 Binary (`.glb`)** | ISO standard for 3D web delivery; compact single-file binary containing geometry, hierarchy, and materials |
| **Mesh Compression** | **Meshopt (`EXT_meshopt_compression`)** | 10x–50x faster CPU decompression than Draco; SIMD/WASM accelerated; zero main-thread UI jank |
| **Texture Compression** | **KTX2 / Basis Universal (`KHR_texture_basisu`)** | Transcodes directly in worker to native GPU formats (ASTC/BC7); saves 75% VRAM compared to PNG |
| **Raycast Acceleration** | **three-mesh-bvh** | Accelerates spatial raycasting from O(N) to O(log N); hover latency < 1 ms over 500,000+ polygons |
| **Model Preparation** | **Blender 4.x + Python Headless Pipeline** | Open-source, python-scriptable, native glTF export, advanced retopology and hierarchy tools |
| **Data Format & Validation** | **Static Partitioned JSON + Zod** | Zero runtime server requirement, build-time schema enforcement, instant client-side evaluation |
| **Application State** | **Zustand** | Fast, unopinionated, outside-React mutation capabilities; decoupled from high-frequency 3D render loop |
| **Client-Side Search** | **MiniSearch** | Lightweight (< 7 KB), sub-millisecond prefix & fuzzy search across multi-field medical terms |
| **Local Persistence** | **Dexie.js (IndexedDB) + Cache API** | Offline storage for user clinical notes, custom bookmarks, and binary 3D model caching |
| **PWA Engine** | **Vite PWA (Workbox)** | Aggressive CacheFirst strategy for 3D assets; seamless offline operation on iPad and desktop |
| **Testing Suite** | **Vitest + Playwright + gltf-validator** | Rapid unit/schema testing, headless browser canvas regression testing, and 3D asset compliance |

---

## 2. In-Depth Comparative Evaluations & Rejection Rationales

### A. 3D Engine: Three.js (r172+) vs. Alternatives
* **Selected**: **Three.js (r172+) with `WebGPURenderer` (TSL)**
  * *Why*: Three.js possesses the world’s most mature 3D web ecosystem, extensive documentation, universal browser support, and seamless integration with Draco, Meshopt, and KTX2. The recent transition to `WebGPURenderer` provides future-proof WebGPU compute shader capabilities while automatically falling back to `WebGLBackend` on older devices. Writing custom highlighting and clipping shaders in Three Shading Language (TSL) ensures cross-compilation to both WGSL and GLSL.
* **Alternatives Evaluated & Rejected**:
  * *Babylon.js*: Highly capable, but has a larger bundle footprint, a more monolithic architecture, and less flexible community tooling for custom scientific neuroimaging post-processing and React integration.
  * *VTK.js*: Superb for raw scientific volume raycasting, but poorly suited for complex consumer-grade interactive UI, modern PBR lighting, custom medical material aesthetics, and PWA workflows.
  * *Unity / Unreal WebGL Export*: Monolithic WASM runtime (>50–150 MB initial load), slow startup times (>15 seconds), terrible mobile/tablet browser battery efficiency, and inability to integrate cleanly with standard responsive DOM/React UI.

---

### B. 3D Architecture: R3F Hybrid vs. Pure Vanilla vs. Pure React
* **Selected**: **Hybrid React Three Fiber (R3F) + Imperative Three.js Core**
  * *Why*: R3F handles the complex component lifecycle, mounting/unmounting of anatomical overlays, and automatic disposal of GPU buffers when navigating between modes. Critical performance logic (raycasting, camera tweening, vertex mutations) executes imperatively via refs inside `useFrame`, completely bypassing React state updates.
* **Alternatives Evaluated & Rejected**:
  * *Pure React (calling setState in 3D loops)*: Catastrophic performance anti-pattern. Triggers React reconciliation on every frame, causing frame rates to drop below 15 FPS.
  * *Pure Vanilla Three.js (No UI Framework)*: Results in messy, unmaintainable imperative spaghetti code when synchronizing 200+ anatomical structures with complex multi-tab clinical UI drawers, search modals, and diagnostic checklists.

---

### C. 3D Mesh Compression: Meshopt vs. Draco
* **Selected**: **Meshopt (`EXT_meshopt_compression`) via `gltfpack`**
  * *Why*: Draco achieves slightly higher raw compression (5–10% smaller files on disk), but requires an intensive JavaScript/WASM CPU decompression cycle. When decompressing 50–200 separate anatomical meshes, Draco causes noticeable 500ms–2000ms UI freezes and main-thread jank. Meshopt decompresses 10x to 50x faster using SIMD instructions and pre-optimizes vertex cache layouts for GPU rendering.
* **Alternatives Evaluated & Rejected**:
  * *Draco Compression*: Rejected as primary format due to high client decompression latency and UI frame stuttering.
  * *Uncompressed glTF/GLB*: Rejected due to massive network payloads (>80 MB) and slow initial downloads.

---

### D. Texture Pipeline: KTX2 / Basis Universal vs. PNG / JPEG / WebP
* **Selected**: **KTX2 / Basis Universal (`KHR_texture_basisu`)**
  * *Why*: Standard PNG, JPEG, and WebP textures must be completely uncompressed in GPU VRAM (a 4096×4096 PNG expands to 64 MB of uncompressed VRAM). In a high-detail brain atlas with multiple surface normal maps, curvature maps, and vascular textures, uncompressed textures will quickly exceed iPadOS Safari’s strict VRAM limit (384 MB–1 GB), causing the browser tab to crash. KTX2 stays compressed in VRAM (transcoding directly to GPU-native BC7 on desktop and ASTC on iOS/macOS), reducing VRAM consumption by 75%.
* **Alternatives Evaluated & Rejected**:
  * *Standard PNG / JPEG*: Rejected due to fatal VRAM explosion and mobile Safari memory crashes.

---

### E. Draw Call Strategy: Three.js `BatchedMesh` vs. `InstancedMesh` vs. Individual Meshes
* **Selected**: **Three.js `BatchedMesh` + Selective Dynamic Extraction**
  * *Why*: Having 300+ individual meshes in the scene graph generates 300+ draw calls per frame, overwhelming the CPU draw call budget on mobile and tablet devices. `BatchedMesh` combines multiple distinct geometries that share a common material into a single multi-draw call, while still allowing individual visibility, color tinting, and matrix transformations per anatomical part.
* **Alternatives Evaluated & Rejected**:
  * *Individual Mesh Nodes (300+ Draw Calls)*: Severe CPU driver bottleneck; frame rates drop significantly on iPad and integrated GPUs.
  * *Standard InstancedMesh*: Only works when every instance shares the exact same geometry (useful for repeated cells, but useless for distinct anatomical structures like the hippocampus, caudate, and cerebellum).

---

### F. State Management: Zustand vs. Redux Toolkit vs. React Context
* **Selected**: **Zustand**
  * *Why*: Zustand is lightweight (< 1.5 KB), provides transient state updates without re-rendering components, and allows reading/updating state directly outside the React render tree (e.g., inside Three.js animation frames or raycasting event listeners).
* **Alternatives Evaluated & Rejected**:
  * *Redux Toolkit*: Overly verbose boilerplate, unnecessary complexity for client-side spatial state.
  * *React Context*: Inefficient for high-frequency updates (hovering, coordinate tracking); triggers unnecessary re-renders of the entire component tree.

---

### G. Client-Side Search: MiniSearch vs. Fuse.js vs. Lunr.js
* **Selected**: **MiniSearch**
  * *Why*: MiniSearch is exceptionally fast (< 7 KB gzipped), supports prefix search, fuzzy matching (Levenshtein distance), and multi-field weighting (e.g., boosting official Latin names and clinical acronyms like "DLPFC" and "OFC"). It executes queries in under 2 milliseconds across thousands of neuroanatomical terms.
* **Alternatives Evaluated & Rejected**:
  * *Fuse.js*: Slower on large datasets, lack of prefix indexing, and higher CPU consumption during live keystroke search.
  * *Lunr.js*: Older architecture, lacks built-in fuzzy/prefix matching, and has not been actively modernized.

---

### H. Local Persistence: Dexie.js (IndexedDB) + Cache API vs. LocalStorage
* **Selected**: **Dexie.js (IndexedDB) + Service Worker Cache API**
  * *Why*: IndexedDB handles structured storage of large datasets (user annotations, custom case studies, clinical vignettes, bookmark collections) asynchronously without blocking the main UI thread. The Cache API stores binary 3D assets (`.glb`, `.ktx2`) for instant offline launch.
* **Alternatives Evaluated & Rejected**:
  * *LocalStorage*: Synchronous (blocks UI thread), strictly limited to 5 MB, and cannot store binary blobs efficiently.

---

### I. Raycasting Acceleration: `three-mesh-bvh` vs. Naive Raycasting
* **Selected**: **`three-mesh-bvh`**
  * *Why*: Naive raycasting in Three.js iterates through every single triangle in a mesh to test for intersections. On a detailed brain model with 350,000 triangles, naive raycasting on every mouse move causes severe frame drops. `three-mesh-bvh` constructs a Bounding Volume Hierarchy tree, accelerating intersection tests by 100x–1000x (< 0.1 ms per raycast).
* **Alternatives Evaluated & Rejected**:
  * *Naive Three.js Raycaster*: Unusable for smooth 60 FPS hover interactions over high-resolution anatomical geometry.
