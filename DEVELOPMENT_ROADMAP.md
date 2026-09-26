# 3D Neuroanatomy Atlas: Development Roadmap

**Document Version**: 1.0.0  
**Status**: APPROVED EXECUTION PLAN  
**Methodology**: Iterative Verification Loop (`RESEARCH → PLAN → IMPLEMENT → RUN → VISUALLY INSPECT → TEST → VERIFY → DOCUMENT → CHECKPOINT`)

---

## Phase Overview

```
Phase 0: Research, Technical Architecture & Schemas (CURRENT)
   │
   ▼
Phase 1: 3D Anatomical Asset Pipeline & Geometry Optimization
   │
   ▼
Phase 2: High-Performance 3D Viewport Engine (Three.js WebGPU/WebGL)
   │
   ▼
Phase 3: Interactive Dissection Engine (Peel, Isolate, Explode, Split)
   │
   ▼
Phase 4: Sectional Neuroanatomy & Stencil Clipping Planes
   │
   ▼
Phase 5: Anatomical Metadata Core & Sub-millisecond Search
   │
   ▼
Phase 6: Advanced Psychiatry Knowledge Layer (RDoC & Circuits)
   │
   ▼
Phase 7: Clinical UI/UX, 3D Annotations & Offline PWA Persistence
   │
   ▼
Phase 8: Grounded AI Tutor & Academic Resident Validation
```

---

## Phase 0: Research, Technical Architecture & Schemas *(Current Phase)*
* **Objective**: Establish the scientific, architectural, legal, and ontological foundation before writing production application code.
* **Deliverables**:
  - [x] Complete technical evaluation of rendering engines (Three.js WebGPU/TSL vs WebGL).
  - [x] Complete evaluation of open anatomical datasets, vertex counts, and legal licenses.
  - [x] Deterministic anatomical ID standard mapped to TA2, FMA, and UBERON.
  - [x] Full TypeScript / Zod metadata schema for anatomical structures and psychiatric data.
  - [x] Authoring of `PROJECT_ARCHITECTURE.md`, `ANATOMICAL_ACCURACY_STANDARD.md`, `SOURCES_AND_LICENSES.md`, `TECH_STACK_DECISION.md`, `DEVELOPMENT_ROADMAP.md`, and `ANTIGRAVITY_RULES.md`.
  - [x] Creation of workspace directory structure and custom Antigravity agent skills.
* **Verification Gate**: Explicit user review and sign-off on the foundational architecture.

---

## Phase 1: 3D Anatomical Asset Pipeline & Geometry Optimization
* **Objective**: Ingest source meshes, clean geometry, enforce anatomical hierarchy, optimize polygon budgets, and export production-ready glTF/GLB assets.
* **Detailed Steps**:
  1. Ingest macroscopic brain collections from Z-Anatomy (Blender 4.x / Python scripts):
     - Telencephalon (Cerebral gyri, Sulci, Basal ganglia).
     - Diencephalon (Thalamus, Hypothalamus, Epithalamus).
     - Limbic structures (Hippocampus, Amygdala, Fornix, Mammillary bodies).
     - Ventricular system (Watertight lateral, 3rd, and 4th ventricular casts).
     - Complete brainstem (Midbrain, Pons, Medulla) and Cerebellum.
     - Cranial Nerves I through XII.
     - Major white-matter tracts (Corpus callosum, Internal capsule, Corona radiata).
     - Vasculature (Circle of Willis, ACA, MCA, PCA, Vertebrobasilar).
  2. Geometry Cleanup & Normal Alignment:
     - Remove non-manifold edges, isolated vertices, and zero-area faces.
     - Enforce outward-facing face normals; calculate weighted split normals for organic biological contours.
  3. Pivot & Origin Alignment:
     - Set local object origin (`(0, 0, 0)`) of every discrete structure to its true anatomical center of mass.
  4. Hierarchy & Node Naming:
     - Rename all objects to strictly conform to canonical IDs (`brain.telencephalon.left.frontal_lobe.precentral_gyrus`).
  5. Decimation & LOD Generation:
     - Quadric Error Metric (QEM) decimation targeting ~350,000 total triangles across the full brain assembly.
  6. glTF 2.0 Export & Optimization:
     - Run `gltfpack -i brain_raw.glb -o brain_web.glb -cc -kn -tc` (Meshopt compression, node name preservation, texture quantization).
* **Verification Gate**: `gltf-validator` passes with 0 errors; total compressed asset size < 20 MB; uncompressed GPU memory < 150 MB.

---

## Phase 2: High-Performance 3D Viewport Engine
* **Objective**: Build the core client-side rendering environment in Three.js (r172+) with WebGPURenderer (and WebGLBackend fallback).
* **Detailed Steps**:
  1. Initialize Vite + React 19 + TypeScript project setup.
  2. Implement `BrainViewport`:
     - Three.js `WebGPURenderer` with auto-fallback to WebGL2.
     - Dynamic tone mapping (`ACESFilmicToneMapping`) and color management (`SRGBColorSpace`).
     - Neutral studio lighting: HDRI diffuse environment + key, fill, and rim lights.
  3. Implement Camera Controller:
     - 6DOF navigation via `CameraControls` / `OrbitControls`.
     - Smart framing: Smooth camera tweening to bounding sphere center when any structure is selected.
     - Instant orthogonal perspective presets (Anterior, Posterior, Superior, Medial, Coronal, Axial).
  4. Implement Raycast Acceleration:
     - Integrate `three-mesh-bvh` across all loaded anatomical meshes.
     - Implement hover identification (< 1 ms latency) and click-to-select.
  5. Organic PBR Shaders:
     - Three Shading Language (TSL) node materials.
     - Soft biological translucency (subsurface scattering approximation) and wet pia-arachnoid clearcoat sheen.
* **Verification Gate**: Smooth 60 FPS rendering on desktop and tablet with real-time hover feedback.

---

## Phase 3: Interactive Dissection Engine
* **Objective**: Provide clinical residents with intuitive spatial tools to deconstruct and examine complex structural relationships.
* **Detailed Steps**:
  1. Granular Visibility System:
     - Selective show/hide per structure, per lobe, per system.
     - "Isolate" mode: Dim or hide surrounding brain tissue to highlight a specific nucleus or circuit.
  2. Order-Independent Transparency (OIT):
     - Blue-noise dithered screen-door transparency for overlapping structures.
     - Dynamic opacity sliders for superficial cortical gyri to visualize deep basal ganglia in situ.
  3. Progressive Layer-by-Layer Reveal:
     - Discrete 8-stage anatomical peel (Vasculature → Cortex → White Matter → Ventricles → Basal Ganglia → Limbic → Brainstem/Cerebellum → Cranial Nerves).
  4. Hemispheric Separation:
     - Smooth translation of left and right hemispheres along the X-axis to expose the medial sagittal wall, corpus callosum, and ventricular third ventricle.
  5. Explode / Deconstruction Mode:
     - Radial centroid-driven expansion slider separating gyri, nuclei, and brainstem for exploded assembly visualization.
* **Verification Gate**: User can smoothly peel cortex, isolate the left amygdala, and view its exact relationship to the hippocampal head and temporal horn without visual glitches.

---

## Phase 4: Sectional Neuroanatomy & Stencil Clipping Planes
* **Objective**: Bridge 3D surface models with traditional 2D MRI and histological sectional planes.
* **Detailed Steps**:
  1. Sectioning Engine:
     - Dynamic 3-axis clipping planes (Axial, Sagittal, Coronal).
  2. Stencil Buffer Capping:
     - Dual-pass stencil rendering (`StencilPass`) to render solid cap geometry over cut planes, preventing hollow mesh appearances.
  3. Co-Registered MRI Slicing:
     - Display synchronized 2D MNI152 MRI slice textures (T1-weighted) mapped directly onto the clipping plane geometry.
  4. Measurement & Coordinate Readout:
     - Real-time MNI coordinate readout `(X, Y, Z)` at cursor intersection on sectional planes.
* **Verification Gate**: Smooth dragging of an axial clipping plane down through the lateral ventricles with solid cap filling and precise MNI coordinate display.

---

## Phase 5: Anatomical Metadata Core & Fast Search Engine
* **Objective**: Connect 3D geometry to an authoritative, strongly-typed neuroanatomical knowledge base.
* **Detailed Steps**:
  1. TypeScript Data Schema & Zod Validators:
     - Full validation of all metadata fields (TA2 IDs, names, synonyms, boundaries, vascular supply, Brodmann areas).
  2. Compile Static Partitioned JSON Datasets:
     - Authoritative anatomical records for all 500+ structures.
  3. Client-Side Fuzzy Search Engine:
     - Index structures using `MiniSearch` or `FlexSearch`.
     - Multi-field search supporting Latin names, English names, clinical acronyms (e.g., "OFC", "DLPFC", "VTA"), Brodmann areas ("BA 24"), and symptoms.
  4. Inspection Drawer / Detail Panel:
     - Clean, responsive slide-out panel rendering complete anatomical information, connectivity, and literature citations when a structure is selected.
* **Verification Gate**: Searching "DLPFC" instantly highlights Brodmann Areas 9 and 46 in 3D and displays its anatomical boundaries and functions in < 5 ms.

---

## Phase 6: Advanced Psychiatry & Clinical Knowledge Layer
* **Objective**: Elevate the atlas into a specialized academic teaching tool for psychiatry residents.
* **Detailed Steps**:
  1. RDoC Domain Integration:
     - Categorize structures under NIMH Research Domain Criteria (Negative Valence, Positive Valence, Cognitive Systems, Social Processes, Arousal).
  2. Psychiatric Circuit Visualization:
     - Cortico-Striatal-Thalamo-Cortical (CSTC) Loops (Motor, Oculomotor, Dorsolateral Prefrontal, Orbitofrontal, Anterior Cingulate).
     - Limbic System / Papez Circuit (Hippocampus → Fornix → Mammillary Bodies → Anterior Thalamus → Cingulate → Entorhinal Cortex).
     - Salience Network (Anterior Insula + dACC).
     - Default Mode Network (mPFC + PCC + Precuneus + Angular Gyrus).
     - Central Executive Network (DLPFC + Posterior Parietal).
  3. Neurotransmitter & Psychopharmacology Mapping:
     - Dopamine pathways: Nigrostriatal, Mesolimbic, Mesocortical, Tuberoinfundibular with D1–D5 receptor localization.
     - Serotonergic raphe projections and 5-HT receptor maps.
     - Noradrenergic locus coeruleus projections.
  4. Neuromodulation Targets:
     - rTMS target coordinates (Left DLPFC for depression; Right DLPFC for anxiety).
     - DBS stereotaxic targets (Area 25 / Subcallosal Cingulate, VC/VS, STN).
     - ECT electric field distribution across temporal and frontal lobes.
  5. Clinical Vignettes & Board-Style Case Studies:
     - Interactive lesion simulation: clicking a stroke territory or lesion site highlights associated functional deficits and psychiatric manifestations.
* **Verification Gate**: Selecting the "CSTC Circuit (OCD)" highlights the Orbitofrontal Cortex, Caudate, and Mediodorsal Thalamus simultaneously, displaying the pathophysiological hyperconnectivity mechanism and first-line SSRI/CBT/DBS targets.

---

## Phase 7: Clinical UI/UX, Spatial Annotations & Offline PWA
* **Objective**: Deliver a seamless, responsive, modern academic application interface optimized for both desktop workstations and iPadOS touch devices.
* **Detailed Steps**:
  1. Spatial 3D Annotations:
     - `CSS2DRenderer` vector DOM labels anchored in 3D space with leader lines.
     - Depth-tested occlusion culling (labels fade when hidden behind brain structures).
  2. Responsive Dual-Pane Interface:
     - High-density desktop mode (multi-panel viewports, cross-sections, sidebar notes).
     - Touch-optimized iPad/tablet mode with gesture-based navigation (two-finger pinch zoom, two-finger rotate, single-finger pan).
  3. User Personalization & Study Tools:
     - Client-side persistence using `Dexie.js` (IndexedDB).
     - User bookmarks, private clinical study notes, custom anatomical pinsets, and flashcards.
  4. Progressive Web App (PWA):
     - Workbox service worker caching all 3D `.glb` assets and static JSON data for 100% offline hospital and clinical usage.
* **Verification Gate**: The application installs as a standalone PWA on iPad, runs completely offline in airplane mode, and responds smoothly to touch gestures.

---

## Phase 8: Grounded AI Tutor & Academic Resident Validation
* **Objective**: Deploy a source-grounded clinical AI tutor and perform rigorous academic verification.
* **Detailed Steps**:
  1. Retrieval-Augmented Generation (RAG) Architecture:
     - Ground the AI tutor exclusively in the verified structured knowledge base and authoritative clinical textbooks (*Snell*, *Stahl*, *Kandel*, *DSM-5-TR*).
  2. Bidirectional 3D Interaction:
     - The AI tutor triggers 3D actions (e.g., "Notice how the amygdala lies immediately anterior to the temporal horn..." automatically isolates and highlights both structures).
     - User 3D selections automatically provide context for tutor inquiries.
  3. Board Review & Oral Exam Preparation:
     - Interactive diagnostic cases with multi-step anatomical reasoning.
  4. Comprehensive Scientific Audit:
     - Systematic peer-review checklist against all criteria in `ANATOMICAL_ACCURACY_STANDARD.md`.
* **Verification Gate**: Peer-reviewed sign-off by academic psychiatry faculty; 100% test coverage on metadata validation schemas.
