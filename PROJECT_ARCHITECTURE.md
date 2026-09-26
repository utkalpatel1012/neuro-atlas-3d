# 3D Neuroanatomy Atlas: Project Architecture Specification

**Document Version**: 2.1.0 (Phase 0.1.1 Remediation Pass)  
**Status**: APPROVED FOUNDATION & LOCKED  
**Primary Audience**: Psychiatry Residents, Clinical Neuroscientists, Neuroanatomy Educators, Technical Engineers  
**Project Root**: `C:\Users\UTKAL PATEL\.gemini\antigravity\scratch\neuro-atlas-3d`  

---

## A. Project Vision

To build a scientifically rigorous, medically accurate, interactive 3D human brain atlas engineered specifically for the advanced clinical, academic, and diagnostic training of psychiatry residents, neuroscientists, and neuropsychiatrists.

Unlike conventional high-level anatomy viewers or stylized 3D brain models, this application bridges macroscopic morphological topography (sulci, gyri, fissures), granular subcortical nuclear complexes (basal ganglia, thalamus, amygdala, hippocampus), cerebellar circuitry, the complete brainstem, ventricles, major white-matter projection/association pathways, and cerebral vasculature directly to psychiatric clinical relevance (DSM-5-TR diagnostic criteria, RDoC functional domains, psychopharmacological receptor mapping, lesion/stroke syndromes, and targeted neuromodulation targets like TMS, DBS, and ECT).

The platform operates client-side at steady frame rates (targeting 60 FPS on desktop and iPad Pro; 30–60 FPS on base iPad) as an offline Progressive Web Application (PWA) with zero tolerance for anatomical hallucination or geometric fabrication.

---

## B. 11-Tier Conceptual Architecture Stack

To prevent conflation of physical anatomy, atlas parcellations, coordinates, and clinical hypotheses, the application enforces a strict **11-Tier Layered Architecture**:

```
1. SOURCE DATA              Raw scientific geometries (Z-Anatomy, HCP, FreeSurfer)
      ↓
2. PROVENANCE               Decoupled EntityProvenance (authority) & AssetProvenance (crypto hash, quarantine)
      ↓
3. ANATOMICAL ONTOLOGY      8-type NeuroEntity discriminated union (Anatomy, Parcels, Tracts, Networks, Pathways, Targets, Lesions, Claims)
      ↓
4. COORDINATE SYSTEMS       Coupled stereotaxic frames (Native, World, MNI152, fs_LR 32k, AC-PC, 10-20)
      ↓
5. CANONICAL GEOMETRY       Resting manifold meshes with weighted normals & center pivots (unaltered by presentation)
      ↓
6. ATLAS/PARCELLATION       HCP MMP 1.0 & Brodmann areas mapped as GPU vertex attributes
      ↓
7. EVIDENCE/KNOWLEDGE       Structured EvidenceClaims with domain-appropriate assessment (GRADE, CEBM, Anatomical Consensus)
      ↓
8. RENDERING ENGINE         Three.js r172+ WebGPURenderer (TSL) with WebGL2 fallback
      ↓
9. INTERACTION SYSTEM       BVH raycasting, visibility presets, runtime explosion & slicing
      ↓
10. PSYCHIATRY LAYER        RDoC matrices, psychopharmacology receptors, neuromodulation
      ↓
11. AI CLINICAL TUTOR       RAG agent grounded strictly in Snell, Stahl, Kandel, & DSM-5
```

---

## C. Functional Requirements

### 1. 3D Spatial Exploration & Camera Navigation
* **6DOF Camera Navigation**: Smooth orbit, zoom, pan, and pivot around arbitrary anatomical structures using `CameraControls` / `OrbitControls`.
* **Smart Bounding-Sphere Framing**: Smoothly interpolates the camera to frame any selected structure's center of mass and bounding box.
* **Orthogonal & Standard Anatomical Views**: Instant one-click alignment to standard neuroanatomical orientations (Anterior/Posterior, Superior/Inferior, Left/Right Lateral, Mid-Sagittal, Coronal, and Axial).

### 2. Anatomical Structure Manipulation
* **Click-to-Select**: Accelerated by `three-mesh-bvh` (<1.5 ms raycasting latency across device classes).
* **Hover Identification**: Instant tooltip and subtle emissive rim illumination displaying official TA2 Latin and English names.
* **Isolate Mode**: Dims or hides surrounding brain tissue to highlight a specific nucleus or circuit.
* **Alpha-Hashed Transparency**: Uses blue-noise dithered stochastic transparency for superficial layers to expose deep basal ganglia in situ without WebGL triangle-sorting glitches.
* **Runtime Explosion Mode**: Dynamic deconstruction along customized unit displacement vectors defined in `ExplosionProfile`; canonical resting geometry in vertex buffers is never altered.
* **Progressive Visibility Presets**: 8 semantic visibility stages (Vasculature → Neocortex → White Matter → Ventricles → Basal Ganglia → Limbic → Brainstem/Cerebellum → Cranial Nerves).
* **Sectional Cutaways & Stencil Capping**: Real-time axial, sagittal, and coronal clipping planes with dual-sided `StencilPass` capping, rendering solid cross-sections rather than hollow polygon hulls.

---

## D. Scientific & Neuroanatomical Requirements

### 1. Structural Granularity & Coverage
* **Telencephalon**: Discrete gyri/sulci of frontal, parietal, temporal, occipital, insular, and limbic lobes.
* **Basal Ganglia**: Caudate nucleus (head, body, tail), Putamen, Globus Pallidus (GPe, GPi), Nucleus Accumbens (core & shell).
* **Diencephalon**: Thalamus (anterior, mediodorsal, pulvinar, ventral lateral, VPL, VPM, LGN, MGN), Subthalamic Nucleus (STN), Epithalamus (habenula, pineal).
* **Limbic Circuitry**: Hippocampus proper (CA1, CA2, CA3), Dentate Gyrus, Subiculum, Amygdala (basolateral & centromedial complexes), Fornix (crura, body, columns), Mammillary bodies.
* **Ventricular System**: Lateral ventricles (frontal horn, body, atrium, posterior horn, temporal horn), Foramina of Monro, 3rd ventricle, Aqueduct of Sylvius, 4th ventricle with foramina of Luschka and Magendie.
* **Brainstem & Cerebellum**: Midbrain (colliculi, peduncles, red nucleus, substantia nigra, VTA, PAG), Pons, Medulla (pyramids, olives), Cerebellar hemispheres, vermis, deep nuclei (dentate, emboliform, globose, fastigial).
* **Cranial Nerves**: Complete anatomical courses for CN I through CN XII.
* **White-Matter Pathways**: Projection (Internal capsule, corona radiata), Association (SLF, Arcuate, ILF, Uncinate, Cingulum), Commissural (Corpus callosum, anterior/posterior commissures).
* **Vasculature**: Circle of Willis, ACA, MCA, PCA, Vertebrobasilar arterial branches.

---

## E. Knowledge Architecture: Academic Psychiatry Focus

1. **Polymorphic NeuroEntity Ontology (`src/types/entity.ts`)**:
   * Complete 8-member discriminated union (`AnatomicalStructure`, `CorticalParcelEntity`, `WhiteMatterTractEntity`, `FunctionalNetworkEntity`, `NeuralPathwayEntity`, `NeuromodulationTargetEntity`, `LesionModelEntity`, `EvidenceClaimEntity`).
   * Strict separation of concerns enforced by [`ARCHITECTURAL_INVARIANTS.md`](./ARCHITECTURAL_INVARIANTS.md).
   * 8 distinct URI namespaces documented in [`ENTITY_IDENTITY_AND_REFERENCING.md`](./ENTITY_IDENTITY_AND_REFERENCING.md).
2. **RDoC Versioned Matrix (`src/types/rdoc.ts`)**:
   * Versioned hierarchical representation supporting all 6 domains (including Sensorimotor Systems).
3. **Psychopharmacology & Molecular Neurobiology (`src/types/pharmacology.ts`)**:
   * Structured targets specifying receptor subtypes, quantitative affinity ($K_i, \text{IC}_{50}, \text{EC}_{50}$), synaptic locus, G-protein cascades, and contextual density profiles with measurement methodology.
4. **Neuromodulation Protocols & Targets (`src/types/neuromodulation.ts`, `src/types/entity.ts`)**:
   * Distinguishes clinical stimulation targets (`NeuromodulationTargetEntity`) from underlying anatomy and protocols. Extensible structured regulatory records across jurisdictions.
5. **Epistemological Certainty (`src/types/evidence.ts`)**:
   * Domains: `anatomical`, `functional`, `mechanistic`, `clinical`, `pharmacological`, `neuromodulatory`.
   * Frameworks: GRADE (clinical), Oxford CEBM, Qualitative Anatomical Consensus (textbooks/FIPAT), and Preclinical/Theoretical.

---

## F. 3D & Technical Architecture

### 1. Viewport Lifecycle & Renderer Resilience (`RENDERER_RESILIENCE.md`)
* Next-generation **Three.js (r172+) with `WebGPURenderer`** and automatic `WebGLBackend` fallback.
* Formal lifecycle state machine: `HEALTHY` $\leftrightarrow$ `DEGRADED` $\rightarrow$ `CONTEXT_LOST` $\rightarrow$ `RECOVERING` $\rightarrow$ `FAILED`.
* Automated state preservation: Captures selection, camera position, clipping offsets, and visibility presets during WebGL context loss and restores them seamlessly upon context recreation.

### 2. Geometry & Asset Delivery
* **Format**: glTF 2.0 Binary (`.glb`) compressed with **Meshopt (`EXT_meshopt_compression`)**.
* **Textures**: **KTX2 / Basis Universal (`KHR_texture_basisu`)** saving 75% VRAM.
* **Raycast Acceleration**: `three-mesh-bvh` for sub-millisecond intersection testing.
* **Batching**: Grouped into semantic batches (Cortex, SubcorticalGray, WhiteMatter, Ventricular, Vascular, CranialNerve) to keep draw calls within empirical budgets.

---

## G. Empirical Performance Targets (`PERFORMANCE_BUDGETS.md`)

* **High-End Desktop (Tier A1)**: 60 FPS sustained, <750k tris, <450 MB VRAM, <75 draw calls.
* **iPad Pro (Tier B2)**: 60 FPS sustained, <350k tris, <220 MB VRAM, <35 draw calls.
* **Base iPad (Tier C2)**: 30–60 FPS, <150k tris, **<110 MB VRAM**, <20 draw calls.

---

## H. Provenance & Legal Architecture (`SOURCES_AND_LICENSES.md`)

* **Z-Anatomy derivative meshes**: Released under **CC-BY-SA 4.0** with author attribution.
* **HCP Cortical Parcellations**: Governed by **HCP Open Access Terms**; commercial software distribution treated as **`LEGAL_REVIEW_REQUIRED`**.
* **EBRAINS Julich-Brain / BigBrain**: Governed by **CC-BY-NC-SA 4.0**; strictly **quarantined to `RESEARCH_ONLY`** for offline verification and barred from client production bundles.
* **Application Codebase**: Licensed under **Apache-2.0**.
