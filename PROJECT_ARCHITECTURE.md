# 3D Neuroanatomy Atlas: Project Architecture Specification

**Document Version**: 2.2.0 (Phase 1.0 Operational Asset Pipeline)  
**Status**: APPROVED FOUNDATION & PRODUCTION BENCHMARK PROVEN  
**Primary Audience**: Psychiatry Residents, Clinical Neuroscientists, Neuroanatomy Educators, Technical Engineers  
**Project Root**: `C:\Users\UTKAL PATEL\.gemini\antigravity\scratch\neuro-atlas-3d`  

---

## A. Project Vision

To build a scientifically rigorous, medically accurate, interactive 3D human brain atlas engineered specifically for the advanced clinical, academic, and diagnostic training of psychiatry residents, neuroscientists, and neuropsychiatrists.

Unlike conventional high-level anatomy viewers or stylized 3D brain models, this application bridges macroscopic morphological topography (sulci, gyri, fissures), granular subcortical nuclear complexes (basal ganglia, thalamus, amygdala, hippocampus), cerebellar circuitry, the complete brainstem, ventricles, major white-matter projection/association pathways, and cerebral vasculature directly to psychiatric clinical relevance (DSM-5-TR diagnostic criteria, RDoC functional domains, psychopharmacological receptor mapping, lesion/stroke syndromes, and targeted neuromodulation targets like TMS, DBS, and ECT).

The platform is DESIGNED to operate client-side with device-class frame-rate TARGETS (60 FPS desktop/iPad Pro; 30–60 base iPad — all unmeasured, see `docs/PHASE_3_PERFORMANCE_BASELINE.md` Phase 3.1 classification); offline PWA is PLANNED, not implemented (no service worker, no IndexedDB layer in repo). Zero tolerance for anatomical hallucination or geometric fabrication remains the governing rule — and Phase 3.1 found and corrected violations of it.

---

## B. 11-Tier Conceptual Architecture Stack

To prevent conflation of physical anatomy, atlas parcellations, coordinates, and clinical hypotheses, the application enforces a strict **11-Tier Layered Architecture**:

```
1. SOURCE DATA              Raw scientific geometries (BodyParts3D via mirror — ACTUAL; Z-Anatomy/HCP/FreeSurfer: evaluated, not ingested)
      ↓
2. PROVENANCE               Decoupled EntityProvenance (authority) & AssetProvenance (crypto hash, quarantine)
      ↓
3. ANATOMICAL ONTOLOGY      8-type NeuroEntity discriminated union (Anatomy, Parcels, Tracts, Networks, Pathways, Targets, Lesions, Claims)
      ↓
4. COORDINATE SYSTEMS       Internal canonical space + declared (pending) stereotaxic frames (MNI152, fs_LR 32k, AC-PC, 10-20)
      ↓
5. CANONICAL GEOMETRY       Resting meshes (incl. multi-shell composites) with weighted normals & center pivots (unaltered by presentation)
      ↓
6. ATLAS/PARCELLATION       PLANNED: HCP MMP 1.0 & Brodmann as GPU vertex attributes (types + fixtures only; zero runtime parcel data — Phase 3.1)
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
* **Format**: glTF 2.0 Binary (`.glb`) compressed with **Meshopt (`EXT_meshopt_compression`)** (encode-step round-trip verified vs LOD input; QEM simplification is lossy — Phase 3.1).
* **Textures**: **KTX2 / Basis Universal — PLANNED ONLY, zero KTX2 bytes in repo. "Saving 75% VRAM" is an unmeasured projection, not a result.**
* **Raycast Acceleration**: `three-mesh-bvh` (headless-Node CPU ≈1 ms single-ray on 198k tris, run-varying — NOT sub-millisecond, NOT device-measured).
* **Batching**: Semantic batches (Cortex, SubcorticalGray, …) are an architecture PLAN; no BatchedMesh multi-draw exists in `src/` (Phase 3.1 audit).

### 3. Operational Asset Pipeline (Phase 1.0 Proven Standard)
* **6-Stage Transformation Flow**:
  1. `ingest_asset.ts`: Ingestion of authoritative raw geometry (`assets/raw/`) with immutable SHA-256 verification.
  2. `validate_mesh.ts`: Geometric QA enforcing 0 non-manifold edges, 0 zero-area faces, 0 duplicate faces, and watertightness.
  3. `canonicalize_mesh.ts`: Coordinate standardization from asserted-LPS whole-body to the internal canonical space (+X Right, +Y Superior, +Z POSTERIOR — Phase 3.1 measured; NOT RAS/MNI) and area-weighted smooth normal generation.
  4. `generate_lods.ts`: Deterministic QEM surface simplification (LOSSY) generating 4-level LOD hierarchy (LOD0: 100%, LOD1: 75%, LOD2: 50%, LOD3: 25%).
  5. `optimize_meshopt.ts`: `EXT_meshopt_compression` runtime optimization saving ~45% streaming payload with encode-step round-trip verification vs LOD input (≤1e-6 mm).
* **Benchmark Proven Asset**: Left Hippocampus (`mesh.hippocampus.left.v1`), BodyParts3D Release 3.0 via third-party mirror (`FMA72714`) — SPL-PNL was a validation reference, never the source (Phase 3.1).
* **Validation CLI**: Single-command execution via `npm run asset:validate -- hippocampus_left`.

---

## G. Empirical Performance Targets (`PERFORMANCE_BUDGETS.md`)

> Phase 3.1: every figure below is an UNMEASURED TARGET (no browser/device harness exists).

* **High-End Desktop (Tier A1)**: 60 FPS target, <750k tris, <450 MB VRAM, <75 draw calls.
* **iPad Pro (Tier B2)**: 60 FPS target, <350k tris, <220 MB VRAM, <35 draw calls.
* **Base iPad (Tier C2)**: 30–60 FPS target, <150k tris, **<110 MB VRAM**, <20 draw calls.

---

## H. Provenance & Legal Architecture (`SOURCES_AND_LICENSES.md`)

* **BodyParts3D derivative meshes**: historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED — LEGAL_REVIEW_REQUIRED (Phase 3.1 §19; no "dual compliance" terminology). Z-Anatomy geometry was evaluated, never ingested.
* **HCP Cortical Parcellations**: NOT ingested (types + fixtures only). Governed by **HCP Open Access Terms**; commercial software distribution treated as **`LEGAL_REVIEW_REQUIRED`**.
* **EBRAINS Julich-Brain / BigBrain**: Governed by **CC-BY-NC-SA 4.0**; strictly **quarantined to `RESEARCH_ONLY`** for offline verification and barred from client production bundles.
* **Application Codebase**: LICENSE CONFLICT UNRESOLVED — `package.json` says CC-BY-SA-4.0, this doc previously said Apache-2.0, and no LICENSE file exists (Phase 3.1 D11).
