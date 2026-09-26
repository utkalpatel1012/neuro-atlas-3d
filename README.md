# 3D Interactive Neuroanatomy Atlas for Psychiatry

An interactive 3D human brain atlas for the academic and clinical training of psychiatry
residents, neuroscientists, and medical trainees. Scientific posture: TRUTH > APPEARANCE —
see [`AGENTS.md`](./AGENTS.md), [`PHASE_3_1_SCIENTIFIC_INTEGRITY_REPORT.md`](./PHASE_3_1_SCIENTIFIC_INTEGRITY_REPORT.md)
and [`docs/KNOWN_ANATOMICAL_LIMITATIONS.md`](./docs/KNOWN_ANATOMICAL_LIMITATIONS.md) before
quoting any anatomical, performance, or provenance claim from this repo.

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

### Core Architectural Specifications (Phase 0, 0.1, & 0.1.1)
* [`ARCHITECTURAL_INVARIANTS.md`](./ARCHITECTURAL_INVARIANTS.md): **[Phase 0.1.1 Locked]** Ten core architectural mandates enforcing ontological separation, coordinate coupling, and provenance integrity.
* [`ENTITY_IDENTITY_AND_REFERENCING.md`](./ENTITY_IDENTITY_AND_REFERENCING.md): **[Phase 0.1.1 Locked]** Deterministic URI taxonomy across 8 distinct namespaces (`brain.*`, `parcel.*`, `mesh.*`, `claim.*`, `network.*`, `pathway.*`, `target.*`, `lesion.*`).
* [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md): Complete 11-tier architectural blueprint covering technical, 3D, data, knowledge, and AI tutor architectures.
* [`ANATOMICAL_ACCURACY_STANDARD.md`](./ANATOMICAL_ACCURACY_STANDARD.md): Standard AAS-2026-NEURO-V2 defining non-negotiable scientific policies, anti-hallucination rules, and evidence criteria.
* [`SOURCES_AND_LICENSES.md`](./SOURCES_AND_LICENSES.md): Tri-tier provenance matrix (`PRODUCTION_ALLOWED`, `RESEARCH_ONLY`, `LEGAL_REVIEW_REQUIRED`) covering Z-Anatomy, BodyParts3D, HCP, and EBRAINS.
* [`TECH_STACK_DECISION.md`](./TECH_STACK_DECISION.md): Technical justifications and failure mode analysis (Three.js WebGPURenderer, TSL, Meshopt, KTX2, BatchedMesh, BVH raycasting).
* [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md): Detailed execution plan from Phase 0 to Phase 8.
* [`ANTIGRAVITY_RULES.md`](./ANTIGRAVITY_RULES.md): 16 mandatory directives for AI coding agents and human contributors.

### Phase 0.1 Technical & Spatial Architecture
* [`PHASE_0_1_AUDIT.md`](./PHASE_0_1_AUDIT.md): Comprehensive architectural and scientific audit identifying 14 critical-to-medium issues and remediation actions.
* [`COORDINATE_SYSTEMS.md`](./COORDINATE_SYSTEMS.md): Coordinate space taxonomy (`native_mesh`, `blender_world`, `mni152_nonlinear_2009c_asym`, `hcp_fslr_32k`, `ac_pc_surgical`, `eeg_10_20_scalp`) and coupled registration records.
* [`RENDERER_RESILIENCE.md`](./RENDERER_RESILIENCE.md): Lifecycle state machine (`HEALTHY`, `DEGRADED`, `CONTEXT_LOST`, `RECOVERING`, `FAILED`) and state-restoration snapshot architecture.
* [`PERFORMANCE_BUDGETS.md`](./PERFORMANCE_BUDGETS.md): Empirical budgets stratified across 7 device classes (Desktop, Mac, iPad Pro, Base iPad, Mobile).
* [`CORTICAL_PARCELLATION_ARCHITECTURE.md`](./CORTICAL_PARCELLATION_ARCHITECTURE.md): Technical strategy for separating physical cortex from HCP MMP 1.0 parcels and GPU vertex attribute shading.
* [`ANATOMICAL_CATALOGUE_SPEC.md`](./ANATOMICAL_CATALOGUE_SPEC.md): Machine-readable catalogue architecture and 7-stage validation lifecycle (`PLANNED` to `PRODUCTION_READY`).
* [`assets/ASSET_PROVENANCE_SCHEMA.md`](./assets/ASSET_PROVENANCE_SCHEMA.md): Granular asset-level provenance schema and `assets.manifest.json` specification.
* [`docs/ASSET_STREAMING_ARCHITECTURE.md`](./docs/ASSET_STREAMING_ARCHITECTURE.md): Lazy loading, priority queues, Web Worker decoding, and LRU memory-pressure recovery.
* [`docs/BATCHING_AND_LABELING_ARCHITECTURE.md`](./docs/BATCHING_AND_LABELING_ARCHITECTURE.md): Semantic `THREE.BatchedMesh` multi-draw batching and label LOD architecture.
* [`PHASE_0_1_COMPLETION_CHECKLIST.md`](./PHASE_0_1_COMPLETION_CHECKLIST.md): Formal verification checklist verifying all 27 remediation mandates.
* [`PHASE_0_1_1_REPORT.md`](./PHASE_0_1_1_REPORT.md): Final schema-integrity and architectural-consistency audit report.

### Type System & Exemplar Datasets
* [`src/types/`](./src/types/): Modular, strongly-typed TypeScript models:
  * `entity.ts`: Polymorphic `NeuroEntity` discriminated union covering all 8 concrete entities: `AnatomicalStructure`, `CorticalParcelEntity`, `WhiteMatterTractEntity`, `FunctionalNetworkEntity`, `NeuralPathwayEntity`, `NeuromodulationTargetEntity`, `LesionModelEntity`, and `EvidenceClaimEntity`.
  * `coordinates.ts`: Coupled stereotaxic registrations, bounding boxes, and coordinate frames.
  * `provenance.ts`: Decoupled `EntityProvenance` and `AssetProvenance` with `AssetValidationStatus`.
  * `evidence.ts`: Structured `EvidenceClaim` model with domain-appropriate assessment frameworks (`GRADE`, `OXFORD_CEBM`, `QUALITATIVE_ANATOMICAL_CONSENSUS`).
  * `rdoc.ts`: Versioned hierarchical RDoC framework (including the 6th Sensorimotor domain).
  * `pharmacology.ts`: Detailed neuroreceptors, transporters, and quantitative affinity constants.
  * `neuromodulation.ts`: Multi-modal protocols and extensible structured regulatory records.
  * `imaging.ts`: Contextual neuroimaging features parameterized by pulse sequences and field strength.
  * `presentation.ts`: Decoupled `VisibilityPreset` and `ExplosionProfile` runtime models.
  * `catalogue.ts`: Master catalogue entries and validation transition events.
  * `anatomy.ts`: Canonical `AnatomicalStructure` model with flexible `StructuralTaxonomy`.
* [`data/structures/hippocampus_left.json`](./data/structures/hippocampus_left.json): Remediated clinical dataset for the Left Hippocampus with zero fake hashes and verified scientific evidence claims.
* [`src/schema_validation.test.ts`](./src/schema_validation.test.ts): Automated test suite verifying type narrowing, coordinate safety, non-physical entities, and exemplar integrity (`npm test`).

---

## 🛠️ Technology Stack Summary

> Phase 3.1 audit (2026-09-27, Part E): the list below separates what is INSTALLED AND
> USED from what is DECIDED BUT NOT IMPLEMENTED. Previous versions of this section
> described the planned stack as current. `package.json` dependencies are ONLY
> `three` + `three-mesh-bvh` (runtime) and `tsx`/`typescript`/`vite`/`meshoptimizer`/
> `gh-pages` (dev).

**ACTUAL (implemented, in `package.json` + imported in `src/`):**
* **Frontend**: Vanilla TypeScript (Strict Mode) + Vite — no React, no R3F in the repo
* **3D Engine**: Three.js with WebGPU-attempt/WebGL-fallback `RendererManager`, OrbitControls, hand-rolled CSS UI (`src/ui/`)
* **3D Compression**: glTF 2.0 Binary (`.glb`) with **Meshopt (`EXT_meshopt_compression`)** — encode step round-trip verified vs LOD input (≤1e-6 mm); QEM simplification is lossy
* **Acceleration**: `three-mesh-bvh` (headless-Node CPU raycast ≈1 ms on 198k tris; NOT a device/GPU measurement)
* **Testing**: custom assert + `tsx` suites (`npm test`: 7 files) & `tsc --noEmit` (`npm run typecheck`)

**PLANNED ONLY (decided in `TECH_STACK_DECISION.md`, zero code/deps/assets):**
React 19, React Three Fiber, Zustand, MiniSearch, Dexie.js, PWA/service worker,
KTX2/Basis textures, `THREE.BatchedMesh` batching, HCP MMP runtime parcels. Do NOT
install or assume these without a phase plan.

---

## ⚖️ Scientific Provenance & Licensing

> Phase 3.1 corrected (2026-09-27). Previous versions of this section named Z-Anatomy
> as the geometry source and HCP as ingested parcellation data — both false.

* **Production mesh geometry (all 4 assets)**: **BodyParts3D Release 3.0** (DBCLS, Japan),
acquired as binary STLs via a third-party GitHub mirror (OBJ→STL converted); per-file
hashes and mirror URLs in `assets/raw/*/ingestion.json`, component breakdown in the
manifest's `source_components`. Historical files CC-BY-SA 2.1 JP; upstream portal lists
CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing
retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED —
`LEGAL_REVIEW_REQUIRED` before commercial redistribution (Phase 3.1 §19: no
"dual compliance" terminology — the term has no legal basis).
* **Cortical representation**: concatenated 14-component multi-shell composites per
hemisphere (16 disjoint closed shells measured) — NOT continuous pial surfaces; 5
component identities per side were mislabeled pre-3.1 and are corrected in
`docs/PHASE_3_CORTEX_SOURCE_COMPONENTS.md`.
* **Cortical parcellation (HCP MMP 1.0)**: NOT ingested — types + test fixtures only;
commercial redistribution stays `LEGAL_REVIEW_REQUIRED`.
* **Research Reference Data**: **EBRAINS Julich-Brain** and **BigBrain** are strictly quarantined to `RESEARCH_ONLY` for offline academic validation and barred from client production bundles (verified: zero restricted bytes in production paths).
* **Stereotaxic Space**: all production assets live in the INTERNAL canonical space
(+X Right, +Y Superior, +Z Posterior; NOT RAS-ordered, NOT MNI); every template
registration is explicitly `REGISTRATION_PENDING` with no metrics.
* **Code license conflict (UNRESOLVED, see `docs/KNOWN_ANATOMICAL_LIMITATIONS.md`)**:
`package.json` declares `CC-BY-SA-4.0` while `SOURCES_AND_LICENSES.md` claims Apache-2.0
for code, and no `LICENSE` file exists. Do not redistribute until resolved.
* **Medical Disclaimer**: This application is an educational and academic reference atlas for medical training and research, not a certified medical device for primary surgical planning or primary diagnostic decision-making.
