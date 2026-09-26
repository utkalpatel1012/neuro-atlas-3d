# Antigravity Persistent Agent Rules & Operational Guidelines

**Project**: 3D Interactive Neuroanatomy Atlas for Psychiatry  
**Scope**: All AI coding agents, subagents, and automated workflows interacting with this repository.

---

## 1. Prime Directives (Non-Negotiable)

1. **NEVER SACRIFICE ANATOMICAL ACCURACY FOR VISUAL APPEARANCE**:
   * Scientific veracity is the ultimate measure of quality in this project.
   * If an aesthetically pleasing shader, mesh simplification, or lighting effect compromises anatomical boundaries or clinical clarity, the effect must be modified or eliminated.

2. **ZERO AI-GENERATED OR FABRICATED GEOMETRY**:
   * Never introduce ungrounded generative meshes, AI-generated shapes, or procedural algorithms that fabricate anatomical structures.
   * All 3D assets must trace their provenance to empirical anatomical dissections, MRI/CT scans, or validated scientific atlases (e.g., Z-Anatomy, Human Connectome Project, FreeSurfer fsaverage).

3. **STRICT SEPARATION OF CONCERNS**:
   * **Anatomical Data Core**: Pure TypeScript schemas and JSON data. No Three.js, React, or DOM dependencies.
   * **3D Viewport Engine**: Imperative Three.js rendering, shaders, materials, and BVH acceleration. Completely isolated from React state render loops.
   * **Presentation / UI Layer**: Declarative React 19 components for drawers, panels, search modals, and diagnostic tools.
   * **Persistence Layer**: Offline caching via Dexie.js (IndexedDB) and Cache API.

4. **MAINTAIN PROVENANCE AND LICENSING INTEGRITY**:
   * Every 3D mesh, texture, and dataset must have documented provenance in `SOURCES_AND_LICENSES.md` and the application's `NOTICE` file.
   * Derivative 3D assets from Z-Anatomy remain under **CC-BY-SA 4.0**.
   * Application code remains under **Apache-2.0 / MIT**.
   * Never incorporate datasets with Non-Commercial (NC) restrictions into redistributable production binaries.

5. **PERFORMANCE BUDGETS ARE MANDATORY**:
   * Maintain a constant 60 FPS on desktop and high-end iPad (iPad Pro/Air).
   * Initial network payload must remain < 25 MB.
   * Total GPU VRAM consumption must remain < 180 MB.
   * Always use **Meshopt (`EXT_meshopt_compression`)** for geometry and **KTX2 Basis Universal** for textures.
   * Never execute state updates or object allocations (`new THREE.Vector3()`) inside `useFrame` or animation loops.

---

## 2. Strict Development Loop

Every agent task and implementation phase must strictly follow this 9-step execution cycle:

```
1. RESEARCH
   ├── Consult primary neuroanatomy sources (Snell, Netter, TA2, HCP).
   └── Review official documentation (Three.js r172+, WebGPU, TSL).
2. PLAN
   ├── Define exact file changes, interfaces, and mathematical bounds.
   └── Verify compliance with `ANATOMICAL_ACCURACY_STANDARD.md`.
3. IMPLEMENT
   ├── Write clean, strongly typed TypeScript and modular code.
   └── Adhere strictly to the naming and schema conventions.
4. RUN
   └── Execute local build and development server (`npm run dev`).
5. VISUALLY INSPECT
   ├── Launch browser and verify 3D rendering, lighting, and materials.
   └── Inspect responsive behavior across desktop and tablet viewports.
6. TEST
   ├── Run schema validators (`npm run test:schema`).
   └── Run headless E2E interaction tests via Playwright.
7. VERIFY
   ├── Profile frame rate, draw calls, and VRAM memory footprint.
   └── Validate glTF compliance via `gltf-validator`.
8. DOCUMENT
   └── Update architecture specifications, roadmaps, and changelogs.
9. CHECKPOINT
   └── Commit clean, verifiable milestones with descriptive messages.
```

---

## 3. Persistent Rules for Code & Architecture

### A. Anatomical Structure Naming
* Always use the canonical dot-delimited URI format:
  `brain.<division>.<hemisphere>.<subsystem_or_lobe>.<structure>.<subpart>`
  * *Example*: `brain.telencephalon.left.frontal_lobe.precentral_gyrus`
  * *Example*: `brain.telencephalon.right.basal_ganglia.caudate_nucleus.head`
* Never use abbreviated, arbitrary, or random object names (e.g., `Mesh_01`, `Cube.002`, `brain_part`).

### B. React & Three.js Interaction Guidelines
* **No `setState` inside 3D Render Loops**:
  * Use imperative refs (`useRef`) and mutate matrices or uniforms directly inside `useFrame`.
  * High-frequency spatial updates (cursor position, MNI coordinates) must update DOM text nodes directly or through transient Zustand subscriptions.
* **Aggressive WebGL Resource Disposal**:
  * Every geometry, material, and texture instantiated dynamically must be explicitly disposed using `.dispose()` in component unmount / cleanup hooks.

### C. Dependency Management
* Do not introduce third-party NPM packages without explicit justification.
* Prefer standard web APIs and lightweight, tree-shakeable utilities over heavy monolithic libraries.
