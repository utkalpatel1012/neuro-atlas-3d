# 3D Neuroanatomy Atlas: Project Architecture Specification

**Document Version**: 1.0.0  
**Status**: APPROVED FOUNDATION  
**Primary Audience**: Psychiatry Residents, Clinical Neuroscientists, Neuroanatomy Educators, Technical Engineers  
**Project Root**: `C:\Users\UTKAL PATEL\.gemini\antigravity\scratch\neuro-atlas-3d`

---

## A. Project Vision

To build a scientifically rigorous, medically accurate, interactive 3D human brain atlas engineered specifically for the advanced clinical, academic, and diagnostic needs of psychiatry residents, neuroscientists, and neuropsychiatrists. 

Unlike conventional high-level anatomy viewers or stylized 3D brain models, this application bridges macroscopic morphological topography (sulci, gyri, fissures), granular subcortical nuclear complexes (basal ganglia, thalamus, amygdala, hippocampus), cerebellar circuitry, the complete brainstem, ventricles, major white-matter projection/association pathways, and cerebral vasculature directly to psychiatric clinical relevance (DSM-5-TR diagnostic criteria, RDoC functional domains, psychopharmacological receptor mapping, lesion/stroke syndromes, and targeted neuromodulation targets like TMS, DBS, and ECT).

The platform operates client-side at 60+ FPS on desktop workstations and high-end tablets (iPad Pro/Air), functioning reliably offline as a Progressive Web Application (PWA) with zero tolerance for anatomical hallucination or geometric fabrication.

---

## B. Functional Requirements

### 1. 3D Spatial Exploration & Camera Navigation
* **True 6DOF / OrbitControls / CameraControls**: Smooth orbit, zoom, pan, and pivot around arbitrary anatomical structures.
* **Smart Focal Centering**: Clicking or selecting any structure smoothly animates the camera to frame that specific structure's bounding box and center of mass (`lookAt`), with automatic calculation of optimal viewing distance.
* **Orthogonal & Standard Anatomical Views**: Instant one-click alignment to standard neuroanatomical orientations:
  * Anterior (Rostral) / Posterior (Caudal)
  * Superior (Dorsal) / Inferior (Ventral)
  * Left Lateral / Right Lateral
  * Mid-Sagittal (Medial) Cross-Section
  * Coronal and Axial/Horizontal standard projections.

### 2. Anatomical Structure Manipulation
* **Click-to-Select**: Raycasting with Bounding Volume Hierarchy (`three-mesh-bvh`) to instantly pick individual gyri, subcortical nuclei, cranial nerves, tracts, or vessels with sub-millisecond latency.
* **Hover Identification**: Instant tooltip and subtle emissive rim illumination displaying the official anatomical name and classification.
* **Isolate Mode**: Dim or hide all non-selected structures, keeping the selected structure or anatomical circuit in full focus.
* **Hide / Show Toggle**: Granular visibility controls at the level of individual structures, lobes, functional systems, or embryonic divisions.
* **Continuous Transparency / X-Ray**: Dynamic alpha/opacity sliders per structure or per layer, revealing deep basal ganglia or ventricular systems beneath translucent cortical gyri without z-fighting or alpha sorting artifacts.
* **Explode / Deconstruction View**: Progressive radial or anatomical expansion along centroid vectors, allowing users to unpack the brain from cortex to deep brainstem.
* **Layer-by-Layer Progressive Reveal**: Discrete anatomical peel steps:
  * Layer 0: Vasculature & Meninges
  * Layer 1: Cerebral Cortex (Gyri & Sulci)
  * Layer 2: White Matter Pathways & Association Bundles
  * Layer 3: Ventricular System
  * Layer 4: Basal Ganglia & Diencephalon
  * Layer 5: Limbic System & Hippocampal Complex
  * Layer 6: Brainstem (Midbrain, Pons, Medulla) & Cerebellum
  * Layer 7: Cranial Nerves I–XII & Deep Brainstem Nuclei.
* **Hemisphere Separation**: Independent translation of the left and right cerebral hemispheres along the transverse axis (X-axis) to expose the medial surfaces, corpus callosum, and third ventricle.
* **Interactive Sectional Cutaways / Clipping Planes**: Real-time cross-sectional clipping planes along axial, sagittal, and coronal axes with solid stencil capping to inspect internal white-gray matter differentiation without exposing hollow polygon hulls.

### 3. Annotation & Search Engine
* **Anatomical Markers & 3D Labels**: Crisp 2D DOM labels (`CSS2DRenderer`) anchored in 3D space with leader lines, dynamic clustering, and occlusion culling.
* **Multi-Field Instant Search**: Sub-millisecond fuzzy search indexing:
  * Official anatomical names (Latin & English)
  * Clinical aliases & acronyms (e.g., "OFC", "DLPFC", "NAc", "VTA")
  * Brodmann areas (e.g., "BA 24", "Area 46")
  * Psychiatric disorders & symptoms (e.g., "Major Depressive Disorder", "Anhedonia", "Obsessive-Compulsive Disorder", "Auditory Hallucinations")
  * Neurotransmitter systems & receptor targets (e.g., "5-HT2A", "D2", "NMDA", "Ventral Tegmental Area")
  * Deep Brain Stimulation / TMS clinical targets (e.g., "Subcallosal Cingulate Area 25", "Dorsolateral Prefrontal Cortex", "STN").

---

## C. Scientific & Neuroanatomical Requirements

### 1. Structural Granularity & Coverage
The atlas must explicitly represent and differentiate:
* **Telencephalon (Cerebral Cortex)**:
  * Frontal Lobe: Precentral gyrus, superior/middle/inferior frontal gyri (pars opercularis, triangularis, orbitalis), orbitofrontal cortex (medial, lateral, anterior, posterior), frontopolar cortex.
  * Parietal Lobe: Postcentral gyrus, superior parietal lobule, inferior parietal lobule (supramarginal gyrus, angular gyrus), precuneus.
  * Temporal Lobe: Superior, middle, and inferior temporal gyri, Heschl’s gyrus (primary auditory cortex), fusiform (occipitotemporal) gyrus, parahippocampal gyrus.
  * Occipital Lobe: Cuneus, lingual gyrus, superior/inferior lateral occipital gyri, calcarine sulcus.
  * Insular Cortex: Anterior short gyri, posterior long gyri, central insular sulcus.
  * Limbic Lobe: Cingulate cortex (subgenual, anterior, mid, posterior, retrosplenial), subcallosal area.
* **Deep Gray Matter / Basal Ganglia & Diencephalon**:
  * Striatum: Caudate nucleus (head, body, tail), Putamen, Nucleus Accumbens (core & shell).
  * Pallidum: Globus Pallidus externa (GPe), Globus Pallidus interna (GPi).
  * Diencephalon: Thalamus (anterior, mediodorsal, ventral anterior, ventral lateral, VPL, VPM, pulvinar, LGN, MGN), Subthalamic Nucleus (STN), Hypothalamus (mammillary bodies, preoptic, arcuate, paraventricular), Epithalamus (habenula, pineal gland).
* **Limbic Circuitry (Papez & Extended)**:
  * Hippocampal formation (Dentate Gyrus, CA1, CA2, CA3, Subiculum).
  * Amygdaloid complex (Basolateral, Centromedial, Cortical nuclei).
  * Fornix (Fimbria, Crura, Body, Columns).
* **Ventricular System**:
  * Lateral ventricles (anterior horn, body, trigone/atrium, posterior horn, inferior horn).
  * Interventricular foramina of Monro.
  * Third ventricle with interthalamic adhesion.
  * Cerebral aqueduct of Sylvius.
  * Fourth ventricle, lateral apertures of Luschka, median aperture of Magendie, central canal.
* **Brainstem & Cranial Nerves**:
  * Midbrain: Superior/inferior colliculi, cerebral peduncles, interpeduncular fossa, substantia nigra (pars compacta & pars reticulata), red nucleus, periaqueductal gray (PAG), ventral tegmental area (VTA).
  * Pons: Basilar pons, middle cerebellar peduncles, pontine tegmentum, locus coeruleus, raphe nuclei.
  * Medulla Oblongata: Ventral pyramids, pyramidal decussation, inferior olivary eminences, gracile/cuneate tubercles.
  * Cranial Nerves I through XII: Complete anatomical courses from brainstem exit to skull base foramina.
* **Cerebellum**:
  * Hemispheres, Vermis, Flocculonodular lobe, Primary fissure, Horizontal fissure.
  * Deep cerebellar nuclei (Dentate, Emboliform, Globose, Fastigial).
* **Major White-Matter Pathways**:
  * Projection fibers: Internal capsule (anterior limb, genu, posterior limb, retrolenticular part), corona radiata, corticospinal tracts.
  * Association fibers: Superior longitudinal fasciculus (SLF I, II, III), Arcuate fasciculus, Inferior longitudinal fasciculus (ILF), Uncinate fasciculus, Cingulum bundle, Fronto-occipital fasciculus.
  * Commissural fibers: Corpus callosum (rostrum, genu, body, tapetum, splenium), Anterior commissure, Posterior commissure.
* **Cerebral & Basilar Vasculature**:
  * Circle of Willis: Internal carotid arteries, anterior cerebral arteries (A1, A2), anterior communicating artery, middle cerebral arteries (M1, M2, M3, M4), posterior communicating arteries, posterior cerebral arteries (P1, P2).
  * Vertebrobasilar system: Vertebral arteries, posterior inferior cerebellar artery (PICA), anterior inferior cerebellar artery (AICA), basilar artery, superior cerebellar artery (SCA).
  * Deep perforating branches: Lenticulostriate arteries, recurrent artery of Heubner, anterior choroidal artery.

### 2. Standardization & Ontological Grounding
* Primary Ontology: **Terminologia Anatomica 2 (TA2)** and **Terminologia Neuroanatomica (TNA)**.
* Secondary Mappings: **Foundational Model of Anatomy (FMA)**, **UBERON** cross-species ontology, and **NeuroNames (NN)**.
* Stereotaxic Reference Frame: **MNI152 (ICBM 2009c Nonlinear Asymmetric)** / **FreeSurfer fsaverage**.

---

## D. Technical Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│    React 19 + Tailwind CSS + Lucide Icons + Radix UI Primitives        │
├────────────────────────────────────────────────────────────────────────┤
│                 Reactive Application State (Zustand)                   │
│  [SelectionStore] [LayerStore] [SearchStore] [CameraStore] [ToolStore] │
├───────────────────────────────────┬────────────────────────────────────┤
│         3D Viewport Engine        │      Anatomical Knowledge Core     │
│   Three.js r172+ (WebGPURenderer) │  TypeScript Types + Zod Schemas    │
│   - Three Shading Language (TSL)  │  - Static Partitioned JSON Store   │
│   - Meshopt / Draco Decoders      │  - MiniSearch Fuzzy Search Index   │
│   - KTX2 Basis Universal Transcoder│  - Citations & Psych Clinical Data │
│   - BVH Raycast Accelerator       │  - Graph Connectivity Engine       │
│   - Stencil Cap Sectioning Engine │                                    │
├───────────────────────────────────┴────────────────────────────────────┤
│                       Client Persistence Layer                         │
│   Dexie.js (IndexedDB) for User Notes, Bookmarks & Custom Presets      │
│   Cache API (Service Worker) for 3D Binary Meshes & High-Res Textures  │
└────────────────────────────────────────────────────────────────────────┘
```

### Modular Separation of Concerns
1. **Presentation Layer (React 19 / DOM)**: Renders UI panels, sidebars, inspection drawers, search modals, and diagnostic overlays. Purely declarative.
2. **Viewport Engine (Three.js WebGPU/WebGL Core)**: Manages scene graph, camera frustum, lighting, materials, post-processing, and render loop. Imperative execution; completely decoupled from React render triggers.
3. **Anatomical Knowledge Layer**: Independent data model and graph query engine. Contains no WebGL or UI code; fully testable in Node.js/Vitest.
4. **Persistence Layer**: Manages offline caching, user bookmarks, and custom clinical case studies.

---

## E. 3D Architecture

### 1. Scene Graph Hierarchy
```
Scene (Root)
 ├── Environment / Lighting Group
 │    ├── AmbientLight / Neutral Studio HDRI Map
 │    ├── Key Directional Light (Soft Shadows)
 │    ├── Fill Directional Light
 │    └── Rim Light (Contour Enhancement)
 ├── Clipping Plane System (Axial, Sagittal, Coronal Planes)
 ├── Brain Model Root (`BrainAssembly`)
 │    ├── `Telencephalon`
 │    │    ├── `Cortex_Left` (Individual Gyral Meshes)
 │    │    ├── `Cortex_Right` (Individual Gyral Meshes)
 │    │    ├── `BasalGanglia_Left` (Striatum, Pallidum)
 │    │    └── `BasalGanglia_Right` (Striatum, Pallidum)
 │    ├── `Diencephalon` (Thalamus, Hypothalamus, Epithalamus)
 │    ├── `LimbicSystem` (Hippocampus, Amygdala, Fornix, Mammillary)
 │    ├── `VentricularSystem` (Lateral, 3rd, Aqueduct, 4th)
 │    ├── `Brainstem` (Midbrain, Pons, Medulla)
 │    ├── `Cerebellum` (Hemispheres, Vermis, Deep Nuclei)
 │    ├── `CranialNerves` (CN I through CN XII)
 │    ├── `WhiteMatterTracts` (Corpus Callosum, Internal Capsule, Bundles)
 │    └── `Vasculature` (Circle of Willis, Perforators, Dural Sinuses)
 └── Helper Group (Selection Outlines, Section Cap Stencils, CSS2D Markers)
```

### 2. Geometry & Asset Delivery
* **Format**: glTF 2.0 Binary (`.glb`).
* **Compression**: `EXT_meshopt_compression` via `gltfpack -cc -kn -tc`.
  * Preserves node hierarchy and object naming (`-kn`).
  * Re-indexes vertex buffer for optimal GPU vertex cache and overdraw reduction.
  * Quantizes positions to 14 bits, normals to 8 bits, UVs to 12 bits.
* **Texture Pipeline**: KTX2 / Basis Universal (`KHR_texture_basisu`).
  * Albedo maps: ETC1S.
  * Normal and Curvature maps: UASTC with Zstandard level 18.
  * Transcodes in a dedicated Web Worker to native GPU compression formats (ASTC for Apple Silicon/iOS, BC7 for Desktop NVidia/AMD/Intel).
* **Raycasting**: Accelerated by `three-mesh-bvh`. Raycast hit testing takes `<0.1ms` per frame even against detailed anatomical meshes.

### 3. Shaders & Material Pipeline
* **Physically Based Rendering (PBR)**:
  * `MeshPhysicalMaterial` or custom TSL node materials.
  * Roughness: 0.45 – 0.65 (organic biological tissue).
  * Metalness: 0.0 (strictly non-metallic).
  * Clearcoat: 0.15 – 0.3 (simulating glistening pia-arachnoid fluid).
  * Subsurface Scattering approximation: Warm transmission tint on thin gyral margins.
* **Clipping & Stencils**: Dual-sided stencil pass (`StencilPass`) rendering capping planes with anatomical cross-sectional textures (gray-white matter boundary rendering).
* **Transparency**: Order-Independent Transparency (OIT) via depth-tested screen-door dithered alpha (blue noise mask), eliminating WebGL sorting artifacts when multiple translucent anatomical layers overlap.

---

## F. Anatomical Data Architecture

### 1. Deterministic Canonical ID Convention
Every structure possesses a unique, immutable, dot-delimited URI:
```
brain.<division>.<hemisphere>.<subsystem_or_lobe>.<structure>.<subregion>
```
* **Examples**:
  * `brain.telencephalon.left.frontal_lobe.precentral_gyrus`
  * `brain.telencephalon.right.frontal_lobe.inferior_frontal_gyrus.pars_opercularis`
  * `brain.telencephalon.left.limbic.hippocampal_formation.ca1`
  * `brain.diencephalon.bilateral.epithalamus.habenula.lateral_nucleus`
  * `brain.mesencephalon.bilateral.tegmentum.substantia_nigra.pars_compacta`
  * `brain.tract.bilateral.commissural.corpus_callosum.genu`
  * `brain.vascular.arterial.anterior_circulation.middle_cerebral_artery.m1_segment`

### 2. Ontological Cross-Referencing
Every structure links directly to authoritative international bio-ontologies:
* `ta2_id`: Terminologia Anatomica 2 unique identifier (e.g., `TA2:5488`).
* `fma_id`: Foundational Model of Anatomy ID (e.g., `FMA:275020`).
* `uberon_id`: Cross-species Uber-anatomy ontology ID (e.g., `UBERON:0001954`).
* `neuronaes_id`: NeuroNames index ID.
* `brodmann_areas`: Array of matching Brodmann area identifiers (e.g., `[4, 6]`).

---

## G. Knowledge Architecture: Psychiatry & Clinical Focus

To serve as an advanced academic tool for psychiatry residency training, every anatomical record is linked to a structured psychiatric knowledge payload:

1. **RDoC (Research Domain Criteria) Matrix**:
   * Negative Valence Systems (Acute threat/fear, Potential threat/anxiety, Sustained threat, Loss).
   * Positive Valence Systems (Reward responsiveness, Reward learning, Habit).
   * Cognitive Systems (Working memory, Declarative memory, Cognitive control).
   * Social Processes (Affiliation/attachment, Theory of mind, Social communication).
   * Arousal and Regulatory Systems (Arousal, Circadian rhythms, Sleep and wakefulness).
2. **Psychiatric Syndromes & Clinical Pathophysiology**:
   * Major Depressive Disorder (e.g., subgenual cingulate hypermetabolism, dorsolateral prefrontal hypoactivity, hippocampal volume reduction).
   * Bipolar Disorder (fronto-limbic dysregulation, amygdala hyper-reactivity).
   * Schizophrenia (aberrant salience network, temporal horn dilation, auditory cortex disconnectivity, dorsolateral prefrontal working memory dysfunction).
   * Obsessive-Compulsive Disorder (cortico-striatal-thalamo-cortical CSTC hyperactive loop: orbitofrontal cortex, caudate nucleus, mediodorsal thalamus).
   * PTSD & Anxiety Disorders (hypoactive ventromedial prefrontal inhibition over hyper-responsive basolateral amygdala).
   * Substance Use & Addiction (mesolimbic dopamine pathway: VTA to nucleus accumbens shell; prefrontal executive habituation).
3. **Psychopharmacological Receptor Mapping**:
   * Dopamine pathways (Nigrostriatal, Mesolimbic, Mesocortical, Tuberoinfundibular) and D1-D5 receptor densities.
   * Serotonin raphe projections and 5-HT1A, 5-HT2A, 5-HT2C, 5-HT3, 5-HT7 distributions.
   * Norepinephrine locus coeruleus projections and alpha-1, alpha-2, beta-1/2 receptor distributions.
   * Cholinergic basal forebrain (nucleus basalis of Meynert) and muscarinic/nicotinic distributions.
   * Glutamatergic (NMDA, AMPA) and GABAergic (GABA-A, GABA-B) balance in cortical microcircuits.
4. **Interventional Neuromodulation Targets**:
   * Repetitive Transcranial Magnetic Stimulation (rTMS): Left DLPFC (depression), Right DLPFC (anxiety/PTSD), Supplementary Motor Area (OCD).
   * Deep Brain Stimulation (DBS): Subcallosal Cingulate Gyrus (Area 25) for treatment-resistant depression; Ventral Capsule/Ventral Striatum (VC/VS) and Subthalamic Nucleus (STN) for severe refractory OCD.
   * Electroconvulsive Therapy (ECT): Bitemporal, Right Unilateral (d'Elia), Bifrontal electrode placement and current vector trajectories through hippocampus and temporal lobes.

---

## H. AI Architecture: Grounded Clinical Tutor

The platform is designed to incorporate an AI-assisted neuroanatomy and neuropsychiatry tutor:

1. **Retrieval-Augmented Generation (RAG) Boundary**:
   * The AI tutor is strictly restricted from generating ungrounded neuroanatomical claims.
   * The context window is populated exclusively from:
     * Structured JSON records of the selected anatomical structure.
     * Primary textbooks: *Snell's Clinical Neuroanatomy 8th Ed.*, *Stahl's Essential Psychopharmacology*, *Kandel's Principles of Neural Science*, and *DSM-5-TR*.
     * Validated peer-reviewed clinical citations.
2. **Interactive 3D-to-Chat Synchronization**:
   * When the AI tutor references an anatomical structure (e.g., "the subgenual cingulate area 25"), the UI automatically highlights the 3D structure, frames it with the camera, or exposes the pathway.
   * When the user clicks an anatomical structure, the tutor automatically loads the relevant clinical summary, quiz vignettes, and board-style review questions.
3. **Anti-Hallucination Guardrails**:
   * Any query regarding controversial or evolving circuitry (e.g., adult hippocampal neurogenesis in humans) must explicitly state consensus versus ongoing research debate.

---

## I. Performance Strategy & Budgets

| Target Metric | Desktop Workstation | iPad Pro / iPad Air | Baseline Mobile Device |
| :--- | :--- | :--- | :--- |
| **Target Frame Rate** | Constant 60 FPS | Constant 60 FPS | Steady 30–60 FPS |
| **Initial Network Payload** | < 25 MB (compressed) | < 25 MB (compressed) | < 15 MB (LOD 1) |
| **Total VRAM Consumption** | < 250 MB | < 180 MB | < 120 MB |
| **Total Polygon Budget** | ~350,000 – 500,000 tris | ~200,000 – 300,000 tris | ~100,000 – 150,000 tris |
| **Draw Calls per Frame** | < 45 (via BatchedMesh) | < 35 (via BatchedMesh) | < 25 (via BatchedMesh) |
| **Raycast Hover Latency** | < 1 ms (BVH accelerated) | < 2 ms (BVH accelerated) | < 5 ms (BVH accelerated) |

### Memory Management & Disposal Lifecycle
* **Aggressive Resource Disposal**: When swapping LODs, switching modes, or unmounting viewports, all `BufferGeometry`, `Material`, and `Texture` instances are systematically traversed and explicitly disposed via `.dispose()`.
* **Zero Frame Allocations**: Avoid creating `Vector3`, `Matrix4`, `Raycaster`, or `Color` objects inside `useFrame` or animation loops; utilize pre-allocated scratch objects to prevent garbage collection pauses.

---

## J. Validation Strategy

1. **Schema Validation (Vitest + Zod)**:
   * 100% of anatomical metadata records are validated at build time against the Zod schema.
   * Any record missing a valid TA2 ID, English name, or bounding box fails the CI/CD pipeline.
2. **glTF Asset Integrity (`gltf-validator`)**:
   * Automated command-line validation of all `.glb` assets for spec compliance, non-degenerate triangles, clean normals, and absence of orphaned node trees.
3. **End-to-End Functional Testing (Playwright)**:
   * Automated browser tests verify that every structure can be clicked, hovered, isolated, and searched.
   * Automated screenshot regression testing ensures visual consistency across updates.
4. **Anatomical Peer Review**:
   * Verification against standard reference atlases (*Snell*, *Duvernoy’s Atlas of the Human Brain Stem and Cerebellum*, *Schmahmann’s MRI Atlas of the Human Cerebellum*, *Glasser 2016 Nature*).

---

## K. Licensing & Legal Strategy

1. **Dual-Layer Licensing Architecture**:
   * **Application Source Code**: Apache-2.0 or MIT License (100% free and open-source).
   * **Anatomical 3D Derivative Assets (from Z-Anatomy)**: Released under **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)** with complete attribution to the Z-Anatomy contributors.
   * **Cortical Surface Parcellations (from HCP)**: Released under **Human Connectome Project Open Access Data Use Terms**.
   * **Textbook Quotations & Clinical Vignettes**: Original synthetic educational summaries authored according to fair use academic standards; no copyrighted textbook text copied verbatim.
2. **Commercial Encumbrance Prevention**:
   * EBRAINS Julich-Brain and BigBrain data containing Non-Commercial (NC) restrictions are kept strictly isolated and used purely as scientific reference/validation benchmarks, ensuring the core atlas codebase and models remain freely distributable for academic and broad community use.

---

## L. Development Roadmap Summary

* **Phase 0**: Research, Technical Architecture, Schema Design & Environment Setup *(Current Phase)*.
* **Phase 1**: Anatomical Source Asset Ingestion & Blender Geometry Optimization Pipeline.
* **Phase 2**: Core Three.js WebGPU/WebGL Viewport Engine & State Management.
* **Phase 3**: Granular Anatomical Hierarchy, Material Shaders & BVH Interaction Engine.
* **Phase 4**: Progressive Superficial-to-Deep Reveal, Sectional Stencil Clipping & Explosion Views.
* **Phase 5**: Anatomical Knowledge Base, Comprehensive Metadata & Fuzzy Search System.
* **Phase 6**: Advanced Psychiatry Knowledge Layer (RDoC, Circuits, Psychopharmacology, Neuromodulation).
* **Phase 7**: UI/UX Refinement, CSS2D Annotation Engine, PWA & Offline Persistence.
* **Phase 8**: AI Clinical Tutor Integration & Rigorous Academic Validation.

---

## M. Major Technical Risks

1. **Browser Memory Exhaustion (iPadOS / Mobile Safari)**: iOS Safari terminates browser processes that exceed WebGL VRAM limits (~384MB–1GB). Loading unoptimized raw brain models will crash mobile Safari immediately.
2. **Draw Call Overload from 200+ Distinct Meshes**: Having 200–500 separate mesh nodes in Three.js will cause CPU driver bottlenecks and severe frame drops.
3. **Alpha Sorting & Visual Artifacts in Multi-Layer Transparency**: Rendering translucent outer cerebral cortex while viewing deep basal ganglia routinely causes overlapping triangles to pop or render in the incorrect depth order.
4. **Scientific Inaccuracy / Hallucinated Structures**: Relying on unverified 3D models or generative AI descriptions can introduce fabricated gyral patterns, erroneous nuclear boundaries, or incorrect psychiatric claims.
5. **Asset Latency & Bandwidth Consumption**: 100MB+ model downloads result in unacceptable startup delays and poor user engagement.

---

## N. Mitigation Strategies

1. **VRAM Optimization**: Utilize **KTX2 / Basis Universal** GPU-compressed textures (saving 75% VRAM) and strict polygon budget enforcement (<350k total tris for the entire central nervous system assembly).
2. **Draw Call Optimization**: Group stationary anatomical sub-structures into Three.js **`BatchedMesh`** instances, reducing draw calls from >300 down to <30 while preserving individual color and visibility overrides.
3. **Transparency Artifact Elimination**: Implement **Order-Independent Transparency (OIT)** using screen-door dithered alpha masks with blue-noise sampling, guaranteeing flawless multi-layer depth sorting.
4. **Zero-Hallucination Protocol**: Enforce the **Anatomical Accuracy Standard** (`ANATOMICAL_ACCURACY_STANDARD.md`). Every structure must have documented provenance and cross-referencing against TA2, Snell, and HCP.
5. **Bandwidth Mitigation**: Apply **Meshopt compression (`gltfpack`)** combined with **HTTP range-requests and PWA Service Worker caching (Cache API)**, keeping the full initial asset payload under 25MB and instantaneous upon second launch.
