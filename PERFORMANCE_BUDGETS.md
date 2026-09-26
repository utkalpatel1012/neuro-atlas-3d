# Device-Class Performance Budgets & Empirical Targets

**Document Version**: 1.0.0  
**Authority**: Senior 3D Web Graphics Engineer & Web Performance Architect  
**Standard**: AAS-2026-NEURO-V1  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. Executive Summary & Methodology

In Phase 0, theoretical performance targets were stated as rigid guarantees (e.g., "<0.1ms hover latency guaranteed", "350k triangles guaranteed"). 

In Phase 0.1, we formally replace absolute claims with **Empirical Target Budgets Stratified by Device Class**. Real-world performance on WebGL/WebGPU depends on heterogeneous GPU architectures, memory bus widths, browser execution policies, and OS memory management (specifically Apple iOS/iPadOS Jetsam).

All values in this document represent **hard ceiling budgets** for Phase 1 asset optimization and Phase 2 engine benchmarking.

---

## 2. Device Class Stratification

We define seven distinct benchmark target tiers:
1. **Tier A1: High-End Desktop Workstation** (Discrete GPU: NVIDIA RTX 3060+, AMD RX 6700+, Apple M2/M3/M4 Max/Ultra; $\ge 16\text{ GB RAM}$).
2. **Tier A2: Apple Silicon Mac (Base/Pro)** (M1/M2/M3 Base or Pro; unified memory architecture; 8–18 GB RAM).
3. **Tier B1: Mid-Range Desktop / Laptop** (Integrated GPU: Intel Iris Xe, AMD Radeon 680M/780M; 8–16 GB RAM).
4. **Tier B2: High-End iPad (iPad Pro)** (Apple M1/M2/M4 chip; 8–16 GB RAM; WebGPU/WebGL2 on iPadOS).
5. **Tier C1: Mid-Range iPad (iPad Air / Mini)** (Apple A14/A15 or M1; 4–8 GB RAM).
6. **Tier C2: Base iPad (9th/10th Gen)** (Apple A13/A14; 3–4 GB RAM; **tightest WebGL memory ceiling**).
7. **Tier D: Mobile Smartphone** (Modern iOS / Android; shared mobile GPU).

---

## 3. Comprehensive Performance Budget Matrix

| Metric | Tier A1 (High-End Desktop) | Tier A2 (Apple Silicon Mac) | Tier B1 (Mid-Range Desktop) | Tier B2 (iPad Pro) | Tier C1 (iPad Air) | Tier C2 (Base iPad) | Tier D (Mobile Phone) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Target FPS (Sustained)** | **60 FPS** | **60 FPS** | **60 FPS** | **60 FPS** | **60 FPS** | **30–60 FPS** | **30 FPS** |
| **Max Triangles in Viewport** | 750,000 | 500,000 | 350,000 | 350,000 | 250,000 | 150,000 | 100,000 |
| **Max Total GPU VRAM** | < 450 MB | < 350 MB | < 250 MB | < 220 MB | < 160 MB | **< 110 MB** | < 90 MB |
| **Max Texture VRAM (KTX2)** | < 180 MB | < 140 MB | < 100 MB | < 90 MB | < 60 MB | < 40 MB | < 30 MB |
| **Max Draw Calls per Frame** | < 75 | < 50 | < 35 | < 35 | < 25 | < 20 | < 15 |
| **Initial Network Transfer** | < 35 MB | < 30 MB | < 25 MB | < 25 MB | < 20 MB | < 15 MB | < 10 MB |
| **JS Heap Memory Budget** | < 180 MB | < 150 MB | < 120 MB | < 100 MB | < 80 MB | < 60 MB | < 50 MB |
| **Hover Latency Target** | < 0.5 ms | < 0.8 ms | < 1.5 ms | < 1.5 ms | < 2.5 ms | < 4.0 ms | < 6.0 ms |
| **Cold Startup to First Frame** | < 1.5 s | < 1.8 s | < 2.5 s | < 2.5 s | < 3.2 s | < 4.5 s | < 5.0 s |

---

## 4. Architectural Rules for Memory Protection

### A. iPadOS Safari Jetsam Thresholds
* On iPadOS, Safari will kill the web process if the WebGL canvas exceeds memory limits:
  * Base iPad (3GB RAM): Jetsam limit $\approx 384\text{ MB}$.
  * iPad Air (4-8GB RAM): Jetsam limit $\approx 512-768\text{ MB}$.
  * iPad Pro (8-16GB RAM): Jetsam limit $\approx 1.0-1.5\text{ GB}$.
* **Enforced Safety Factor**: The atlas enforces a **$2.5\times$ safety margin**. Total GPU memory allocation on iPad must never exceed **$150\text{ MB}$** on base iPad or **$220\text{ MB}$** on iPad Pro.

### B. Texture Memory Mathematics (KTX2 vs. PNG)
A common pitfall is underestimating uncompressed texture VRAM:
* One $2048 \times 2048$ RGBA texture in uncompressed PNG format expands to:
  $$2048 \times 2048 \times 4 \text{ bytes} = 16.78\text{ MB of VRAM}$$
  Ten such textures consume **$167.8\text{ MB}$**, exceeding the base iPad budget from textures alone.
* The identical texture compressed with **KTX2 / Basis Universal (ASTC 4x4 / BC7)** consumes:
  $$2048 \times 2048 \times 1 \text{ byte} \approx 4.19\text{ MB of VRAM}$$
  A **75% net VRAM reduction**.
* **Mandate**: All production normal, curvature, and albedo maps must be encoded as KTX2 UASTC/ETC1S. Raw PNG/JPEG textures in the 3D scene are prohibited.

### C. Zero Runtime Allocations in `useFrame`
* Instantiating `new THREE.Vector3()`, `new THREE.Matrix4()`, or `new THREE.Raycaster()` inside animation loops triggers aggressive garbage collection (GC) cycles, causing periodic 100ms micro-stutters.
* **Mandate**: All scratch vectors, quaternions, and raycasters must be pre-allocated once in module scope and re-used via `.copy()` or `.set()`.
