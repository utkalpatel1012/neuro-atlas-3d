# Phase 3 Performance Baseline & Benchmarks
**Standard**: AAS-2026-NEURO-V1
**Target Mesh**: Bilateral Cerebral Cortex (`mesh.cortex.left.v1`, `mesh.cortex.right.v1`) + Bilateral Hippocampus
**Combined Triangle Budget**: ~400,000 Triangles (LOD0) to ~100,000 Triangles (LOD3)
**Status**: ~~Benchmarked & Verified~~ → **Phase 3.1 reclassified: single-environment spot timings + UNMEASURED targets (see classification per number below). No browser/device measurement exists in this repo.**

> Phase 3.1 (D8) classification key: MEASURED = reproduced by a repo harness;
> CONSISTENT = compatible with a repo test but from an unrecorded run; ASSERTED = no
> producing harness in repo; TARGET = budget/goal, never presented as observed.  

---

## 1. Executive Summary

Phase 3 introduces the largest 3D geometry loaded into the atlas runtime to date: ~400,000 bilateral cortical triangles and ~200,000 vertices. Device-class frame-rate figures below are TARGETS (see `PERFORMANCE_BUDGETS.md`); nothing in this document was measured in a browser or on a physical device. Quantitative content covers:
1. **Raycasting & Spatial Selection (BVH Acceleration)** — headless-Node CPU spot timings only
2. **Memory Footprint & VRAM Allocation** — arithmetic estimates, never GPU-profiled
3. **Multi-Resolution LOD Transitioning** — distance schedule implemented; stability claims unmeasured
4. **Meshopt Runtime Decompression Overhead** — asserted, no harness
5. **Screen-Space 3D Labeling & Annotation Overhead** — asserted, no harness

---

## 2. BVH Spatial Indexing & Picking Performance (headless Node.js CPU)

Raycasting a raw 198,230-triangle mesh using Three.js's default brute-force raycaster performs an $O(N)$ test against every triangle.

By integrating `three-mesh-bvh` via `AssetManager.ts` during asset ingestion, an AABB Bounding Volume Hierarchy tree is constructed once at load time.

### Timings (classifications per Phase 3.1 D8)
| Raycasting Method | Reported Time | Classification |
| :--- | :--- | :--- |
| **Default Three.js Raycaster (Naive $O(N)$)** | 34.82 ms avg / 52.10 ms p95 ("1,000 raycasts") | **ASSERTED** — no 1,000-ray harness exists in repo; single-ray repo tests do not reproduce this row |
| **BVH-Accelerated (`firstHitOnly: true`)** | **1.317 ms** avg / **1.840 ms** p95 | **CONSISTENT** — repo test measures single-ray CPU times of 0.97–1.32 ms across runs (run-varying); the p95/1,000-ray framing is unrecorded |

Unit is MILLISECONDS on headless CPU (1 ms = 1000 µs — never "microsecond"). No GPU,
browser, or device frame context was measured. "26x speedup" is ASSERTED (depends on
the unrecorded naive row).

---

## 3. Storage, Wire Transfer, and GPU VRAM Metrics

### Meshopt Compression Efficiency
| Asset | LOD Level | Uncompressed GLB | Meshopt Runtime GLB | Bandwidth Reduction |
| :--- | :--- | :--- | :--- | :--- |
| **Left Cortex** | LOD0 (198k tris) | 4.76 MB | 2.27 MB | **-52.29%** |
| | LOD1 (148k tris) | 3.57 MB | 1.74 MB | **-51.24%** |
| | LOD2 ( 99k tris) | 1.79 MB | 1.19 MB | **-33.13%** |
| | LOD3 ( 49k tris) | 0.89 MB | 0.63 MB | **-30.02%** |
| **Right Cortex** | LOD0 (198k tris) | 4.76 MB | 2.27 MB | **-52.33%** |
| | LOD1 (148k tris) | 3.57 MB | 1.74 MB | **-51.29%** |
| | LOD2 ( 99k tris) | 1.79 MB | 1.19 MB | **-33.20%** |
| | LOD3 ( 49k tris) | 0.89 MB | 0.62 MB | **-30.12%** |
| **Combined Atlas Bundle** | **All 4 Structures (LOD0-3)** | **22.56 MB** | **11.95 MB** | **-47.03%** |

### Client-Side GPU VRAM Consumption (Bilateral Cortex + Bilateral Hippocampus)
- **Position Attribute Buffer** ($198,334 \text{ verts} \times 3 \text{ floats} \times 4 \text{ bytes}$): ~2.38 MB **[ESTIMATED arithmetic, never GPU-measured]**
- **Normal Attribute Buffer** ($198,334 \text{ verts} \times 3 \text{ floats} \times 4 \text{ bytes}$): ~2.38 MB **[ESTIMATED]**
- **Index Element Buffer** ($396,540 \text{ indices} \times 4 \text{ bytes}$): ~1.59 MB **[ESTIMATED]**
- **Total VRAM Geometry Allocation (LOD0)**: **~6.35 MB [ESTIMATED — no GPU profiling exists]**
- **Meshopt WASM Decompression Time**: $< 18\text{ ms}$ on initial load (non-blocking). **[ASSERTED — no load-timing harness in repo]**

---

## 4. Multi-Resolution Level-of-Detail (LOD) Performance

`LODManager.ts` dynamically evaluates observation distance from camera to mesh bounding centers every frame:

| Observation Range | Active LOD | Triangle Count (Bilateral Cortex) | Frame Rate **[TARGET, unmeasured]** | Target Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **$< 100\text{ mm}$** | **LOD0** (100%) | 396,540 tris | 60 FPS | Detailed sulcal exploration, microscopic inspection |
| **$100 - 180\text{ mm}$** | **LOD1** (75%) | 297,404 tris | 60 FPS | Standard anatomical orbital examination |
| **$180 - 260\text{ mm}$** | **LOD2** (50%) | 198,268 tris | 60 FPS | Multi-system contextual assembly inspection |
| **$> 260\text{ mm}$** | **LOD3** (25%) | 99,132 tris | 60 FPS | Full-brain global rotation, whole-head overview |

### LOD Transition Stability
- Hysteresis band: $\pm 10\text{ mm}$ around threshold distances prevents rapid flickering at boundary distances.
- Memory caching: Pre-cached geometry prevents garbage collection thrashing during transitions.

---

## 5. Screen-Space LabelManager Performance

`LabelManager.ts` calculates 3D-to-2D screen projections, frustum culling, distance priority filtering, backface occlusion, and 2D collision resolution for all 20+ cerebral landmarks:

- **Projection & Normal Occlusion Test (24 landmarks)**: $0.12\text{ ms}$ per frame **[ASSERTED — no per-frame harness]**
- **2D Collision & Decluttering Loop (AABB)**: $0.08\text{ ms}$ per frame **[ASSERTED]**
- **Total Label Engine CPU Cost**: **$< 0.25\text{ ms}$ per frame [ASSERTED]**

---

## 6. Target Performance Profile Compliance

| Metric | High Profile (Desktop) | Medium Profile (Laptop) | Low Profile (Mobile / Tablet) |
| :--- | :--- | :--- | :--- |
| **Target FPS [TARGET]** | 60 FPS | 60 FPS | 30 FPS |
| **Pixel Ratio** | 2.0x | 1.5x | 1.0x |
| **LOD Multiplier** | 1.0x | 0.8x | 0.6x |
| **Max Resident Meshes** | 200 | 100 | 50 |
| **Observed Framerate** | **UNMEASURED [was "60 FPS" — no browser/device harness exists]** | **UNMEASURED [was "60 FPS"]** | **UNMEASURED [was "45-60 FPS"]** |
