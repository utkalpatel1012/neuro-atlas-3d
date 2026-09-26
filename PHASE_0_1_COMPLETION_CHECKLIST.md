# Phase 0.1 Architecture Hardening Completion Checklist

**Document Version**: 1.0.0  
**Audit & Remediation Scope**: Phase 0.1 Pre-Phase 1 Foundation Verification  
**Standard**: AAS-2026-NEURO-V2  
**Target Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## 1. System Verification Checklist

- [x] **Ontology Corrected**: Polymorphic `NeuroEntity` discriminated union implemented in [`src/types/entity.ts`](./src/types/entity.ts), decoupling anatomical structures from atlas parcels, tracts, networks, and clinical concepts.
- [x] **Coordinate System Model Corrected**: Explicit coordinate space taxonomy, registration metadata, and uncertainty metrics defined in [`src/types/coordinates.ts`](./src/types/coordinates.ts) and documented in [`COORDINATE_SYSTEMS.md`](./COORDINATE_SYSTEMS.md).
- [x] **Provenance Model Created**: Asset-level provenance tracking upstream datasets, git commits, cryptographic SHA-256 hashes, and license covenants implemented in [`src/types/provenance.ts`](./src/types/provenance.ts) and [`assets/ASSET_PROVENANCE_SCHEMA.md`](./assets/ASSET_PROVENANCE_SCHEMA.md).
- [x] **Licensing Language Corrected**: Removed oversimplified blanket claims in [`SOURCES_AND_LICENSES.md`](./SOURCES_AND_LICENSES.md).
- [x] **HCP Terms Reviewed**: WU-Minn HCP Open Access Data Use Agreement analyzed in detail; commercial software redistribution formally designated as `LEGAL_REVIEW_REQUIRED`.
- [x] **Z-Anatomy Provenance Corrected**: Exact version (`v2024.1.0`), CC-BY-SA 4.0 terms, attribution, and ShareAlike implications on 3D derivatives fully documented.
- [x] **BodyParts3D Provenance Corrected**: CC-BY-SA 2.1 Japan license and downstream CC-BY-SA 4.0 compatibility documented.
- [x] **Research-Only Assets Isolated**: Explicit tri-tier policy (`PRODUCTION_ALLOWED`, `RESEARCH_ONLY`, `LEGAL_REVIEW_REQUIRED`) established; EBRAINS Julich-Brain and BigBrain strictly quarantined from production bundles.
- [x] **Evidence Model Created**: Structured `EvidenceClaim` model with GRADE certainty levels, causal vs. associative distinctions, and verification statuses implemented in [`src/types/evidence.ts`](./src/types/evidence.ts).
- [x] **RDoC Model Versioned**: Versioned hierarchical framework supporting all 6 domains (including Sensorimotor Systems) implemented in [`src/types/rdoc.ts`](./src/types/rdoc.ts).
- [x] **Psychopharmacology Model Improved**: Granular molecular targets, synaptic loci (pre/post/extrasynaptic), G-protein cascades, and clinical drug interactions implemented in [`src/types/pharmacology.ts`](./src/types/pharmacology.ts).
- [x] **Neuromodulation Model Corrected**: Multi-modal protocols separating physical application sites, electrode montages, local induced fields, and downstream network effects implemented in [`src/types/neuromodulation.ts`](./src/types/neuromodulation.ts); ECT decoupled from monolithic single-target assumptions.
- [x] **Hippocampus Exemplar Corrected**: Decoupled from direct Brodmann area assignment; Ammon's horn isolated from Dentate Gyrus and Subiculum; psychiatric claims mapped to GRADE evidence claims; verified in [`data/structures/hippocampus_left.json`](./data/structures/hippocampus_left.json).
- [x] **Imaging Schema Corrected**: MRI pulse sequence physics, field strength, relative tissue comparators, and pathological signs modeled in [`src/types/imaging.ts`](./src/types/imaging.ts).
- [x] **Peel Architecture Corrected**: Decoupled from intrinsic anatomical hierarchy into runtime `VisibilityPreset` and `SemanticVisibilityGroup` in [`src/types/presentation.ts`](./src/types/presentation.ts).
- [x] **Explosion Architecture Corrected**: Centroid-only vectors replaced with customizable `ExplosionProfile` as runtime presentation transforms that never alter resting vertex geometry.
- [x] **Transparency Terminology Corrected**: Corrected to "alpha-hashed / stochastic screen-door transparency" across all documentation; discrete visualization modes defined (`OPAQUE`, `GHOSTED`, `X_RAY`, `SLICE`, `EXPLODED`).
- [x] **Renderer Resilience Documented**: Five-state lifecycle (`HEALTHY`, `DEGRADED`, `CONTEXT_LOST`, `RECOVERING`, `FAILED`) and state-restoration snapshot architecture specified in [`RENDERER_RESILIENCE.md`](./RENDERER_RESILIENCE.md).
- [x] **Performance Budgets Documented**: Unsupported absolute guarantees removed; empirical targets stratified across 7 device classes specified in [`PERFORMANCE_BUDGETS.md`](./PERFORMANCE_BUDGETS.md).
- [x] **Streaming Architecture Documented**: Lazy loading, priority queues, Web Worker decoding, and LRU memory eviction specified in [`docs/ASSET_STREAMING_ARCHITECTURE.md`](./docs/ASSET_STREAMING_ARCHITECTURE.md).
- [x] **Batching Architecture Documented**: Semantic `THREE.BatchedMesh` multi-draw batching with deterministic 3-level addressability specified in [`docs/BATCHING_AND_LABELING_ARCHITECTURE.md`](./docs/BATCHING_AND_LABELING_ARCHITECTURE.md).
- [x] **Label Architecture Documented**: Label LOD, distance activation, screen-space collision avoidance, and GPU/SDF migration path specified in [`docs/BATCHING_AND_LABELING_ARCHITECTURE.md`](./docs/BATCHING_AND_LABELING_ARCHITECTURE.md).
- [x] **Cortical Parcellation Architecture Documented**: Separation between physical cortex and HCP MMP 1.0 parcels, MSM surface matching, and TSL vertex attribute shading specified in [`CORTICAL_PARCELLATION_ARCHITECTURE.md`](./CORTICAL_PARCELLATION_ARCHITECTURE.md).
- [x] **Anatomy Catalogue Defined**: Machine-readable master catalogue schema and 7-stage validation lifecycle specified in [`src/types/catalogue.ts`](./src/types/catalogue.ts) and [`ANATOMICAL_CATALOGUE_SPEC.md`](./ANATOMICAL_CATALOGUE_SPEC.md).
- [x] **Anatomical Accuracy Rules Updated**: Strengthened scientific prohibitions and evidence standards committed to [`ANATOMICAL_ACCURACY_STANDARD.md`](./ANATOMICAL_ACCURACY_STANDARD.md).
- [x] **Antigravity Rules Updated**: 15 mandatory directives committed to [`ANTIGRAVITY_RULES.md`](./ANTIGRAVITY_RULES.md) and [`.agents/rules/medical-accuracy.md`](./.agents/rules/medical-accuracy.md).
- [x] **Architecture Documents Synchronized**: [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md), [`TECH_STACK_DECISION.md`](./TECH_STACK_DECISION.md), [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md), and [`README.md`](./README.md) fully updated with failure modes and the 11-tier architecture stack.
