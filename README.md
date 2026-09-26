# 3D Interactive Neuroanatomy Atlas for Psychiatry

An anatomically accurate, scientifically grounded 3D human brain atlas engineered specifically for the academic and clinical training of psychiatry residents, neuroscientists, and medical trainees.

---

## 📌 Project Overview

This repository houses the foundational architecture, neuroanatomical standards, data schemas, and technical blueprints for an interactive, browser-based 3D human brain atlas.

The ultimate objective is to bridge:
* **Macroscopic Cortical Topography**: Detailed cerebral gyri, sulci, fissures, and lobes.
* **Granular Subcortical Structures**: Basal ganglia (Caudate, Putamen, Globus Pallidus, Nucleus Accumbens), Diencephalon (Thalamus, STN, Epithalamus/Habenula).
* **Limbic Circuitry**: Hippocampus (CA1–CA3, Dentate Gyrus, Subiculum), Amygdala, Fornix, Mammillary bodies.
* **Brainstem & Cerebellum**: Midbrain, Pons, Medulla, deep cerebellar nuclei, and cranial nerves I–XII.
* **Ventricular System**: Watertight casts of lateral, third, and fourth ventricles with internal foramina.
* **White-Matter Pathways**: Projection, association, and commissural bundles.
* **Cerebral Vasculature**: Circle of Willis, major cerebral arteries (ACA, MCA, PCA), and vertebrobasilar branches.
* **Psychiatric Clinical Grounding**: DSM-5-TR diagnostic pathophysiology, NIMH Research Domain Criteria (RDoC) functional domains (including Sensorimotor Systems), psychopharmacology receptor profiles, neuromodulation protocols (rTMS, DBS, ECT), and neurological lesion bedside tests.

---

## 🧭 Repository Structure & Documentation

### Core Architectural Specifications (Phase 0 & 0.1)
* [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md): Complete 11-tier architectural blueprint covering technical, 3D, data, knowledge, and AI tutor architectures.
* [`ANATOMICAL_ACCURACY_STANDARD.md`](./ANATOMICAL_ACCURACY_STANDARD.md): Standard AAS-2026-NEURO-V2 defining non-negotiable scientific policies, anti-hallucination rules, and evidence criteria.
* [`SOURCES_AND_LICENSES.md`](./SOURCES_AND_LICENSES.md): Tri-tier provenance matrix (`PRODUCTION_ALLOWED`, `RESEARCH_ONLY`, `LEGAL_REVIEW_REQUIRED`) covering Z-Anatomy, BodyParts3D, HCP, and EBRAINS.
* [`TECH_STACK_DECISION.md`](./TECH_STACK_DECISION.md): Technical justifications and failure mode analysis (Three.js WebGPURenderer, TSL, Meshopt, KTX2, BatchedMesh, BVH raycasting).
* [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md): Detailed execution plan from Phase 0 to Phase 8.
* [`ANTIGRAVITY_RULES.md`](./ANTIGRAVITY_RULES.md): 15 mandatory directives for AI coding agents and human contributors.

### Phase 0.1 Technical & Spatial Architecture
* [`PHASE_0_1_AUDIT.md`](./PHASE_0_1_AUDIT.md): Comprehensive architectural and scientific audit identifying 14 critical-to-medium issues and remediation actions.
* [`COORDINATE_SYSTEMS.md`](./COORDINATE_SYSTEMS.md): Coordinate space taxonomy (`native_mesh`, `blender_world`, `mni152_nonlinear_2009c_asym`, `hcp_fslr_32k`, `ac_pc_surgical`, `eeg_10_20_scalp`) and registration uncertainty metrics.
* [`RENDERER_RESILIENCE.md`](./RENDERER_RESILIENCE.md): Lifecycle state machine (`HEALTHY`, `DEGRADED`, `CONTEXT_LOST`, `RECOVERING`, `FAILED`) and state-restoration snapshot architecture.
* [`PERFORMANCE_BUDGETS.md`](./PERFORMANCE_BUDGETS.md): Empirical budgets stratified across 7 device classes (Desktop, Mac, iPad Pro, Base iPad, Mobile).
* [`CORTICAL_PARCELLATION_ARCHITECTURE.md`](./CORTICAL_PARCELLATION_ARCHITECTURE.md): Technical strategy for separating physical cortex from HCP MMP 1.0 parcels and GPU vertex attribute shading.
* [`ANATOMICAL_CATALOGUE_SPEC.md`](./ANATOMICAL_CATALOGUE_SPEC.md): Machine-readable catalogue architecture and 7-stage validation lifecycle (`PLANNED` to `PRODUCTION_READY`).
* [`assets/ASSET_PROVENANCE_SCHEMA.md`](./assets/ASSET_PROVENANCE_SCHEMA.md): Granular asset-level provenance schema and `assets.manifest.json` specification.
* [`docs/ASSET_STREAMING_ARCHITECTURE.md`](./docs/ASSET_STREAMING_ARCHITECTURE.md): Lazy loading, priority queues, Web Worker decoding, and LRU memory-pressure recovery.
* [`docs/BATCHING_AND_LABELING_ARCHITECTURE.md`](./docs/BATCHING_AND_LABELING_ARCHITECTURE.md): Semantic `THREE.BatchedMesh` multi-draw batching and label LOD architecture.
* [`PHASE_0_1_COMPLETION_CHECKLIST.md`](./PHASE_0_1_COMPLETION_CHECKLIST.md): Formal verification checklist verifying all 27 remediation mandates.

### Type System & Exemplar Datasets
* [`src/types/`](./src/types/): Modular, strongly-typed TypeScript models:
  * `entity.ts`: Polymorphic `NeuroEntity` discriminated union separating organs, parcels, tracts, networks, and lesions.
  * `coordinates.ts`: Explicit coordinate spaces, bounding boxes, and registration metadata.
  * `provenance.ts`: Asset-level provenance tracking and manifest types.
  * `evidence.ts`: Structured `EvidenceClaim` model with GRADE certainty levels.
  * `rdoc.ts`: Versioned hierarchical RDoC framework (including the 6th Sensorimotor domain).
  * `pharmacology.ts`: Detailed neuroreceptors, transporters, and synaptic locus mechanisms.
  * `neuromodulation.ts`: Multi-modal protocols separating physical montages from network engagement.
  * `imaging.ts`: Contextual neuroimaging features parameterized by pulse sequences and field strength.
  * `presentation.ts`: Decoupled `VisibilityPreset` and `ExplosionProfile` runtime models.
  * `catalogue.ts`: Master catalogue entries and validation transition events.
  * `anatomy.ts`: Canonical `AnatomicalStructure` model.
* [`data/structures/hippocampus_left.json`](./data/structures/hippocampus_left.json): Remediated clinical dataset for the Left Hippocampus decoupled from BA28 and grounded in GRADE evidence claims.

---

## 🛠️ Technology Stack Summary

* **Frontend**: React 19 + TypeScript (Strict Mode) + Vite
* **3D Engine**: Three.js (r172+) with `WebGPURenderer` (auto-fallback to `WebGLBackend`) & Three Shading Language (TSL)
* **3D Binding**: Hybrid React Three Fiber (R3F) + Imperative Three.js Core
* **3D Compression**: glTF 2.0 Binary (`.glb`) with **Meshopt (`EXT_meshopt_compression`)** & **KTX2 / Basis Universal (`KHR_texture_basisu`)**
* **Acceleration**: `three-mesh-bvh` (<1.5 ms raycasting latency target over 500,000+ polygons)
* **State & Search**: Zustand (spatial state) + MiniSearch (client-side fuzzy medical term search)
* **Persistence & PWA**: Dexie.js (IndexedDB) + Service Worker Cache API for 100% offline usage on iPadOS and desktop

---

## ⚖️ Scientific Provenance & Licensing

* **Macroscopic & Subcortical Geometry**: Sourced and optimized from **Z-Anatomy**, licensed under **Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)**.
* **Cortical Parcellation**: Sourced from the **Human Connectome Project (HCP) Glasser MMP 1.0** under **HCP Open Access Terms** (Commercial software redistribution designated as `LEGAL_REVIEW_REQUIRED`).
* **Research Reference Data**: **EBRAINS Julich-Brain** and **BigBrain** are strictly quarantined to `RESEARCH_ONLY` for offline academic validation and barred from client production bundles.
* **Stereotaxic Space**: Explicitly declared per asset (`mni152_nonlinear_2009c_asym`, `hcp_fslr_32k`, or `blender_world`).
* **Application Source Code**: Licensed under **Apache-2.0**.
* **Medical Disclaimer**: This application is an educational and academic reference atlas for medical training and research, not a certified medical device for primary surgical planning or primary diagnostic decision-making.
