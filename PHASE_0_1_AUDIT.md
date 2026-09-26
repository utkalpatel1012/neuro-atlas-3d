# Phase 0.1 Comprehensive Architectural & Scientific Audit

**Audit Date**: September 26, 2026  
**Auditor**: Lead Technical Architect, Senior 3D Web Developer, Scientific Visualization Engineer, & Digital Neuroanatomy Specialist  
**Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`  
**Status**: REMEDIATION ACTION PLAN

---

## 1. Executive Summary

Phase 0 established a comprehensive high-level blueprint for an interactive 3D neuroanatomy atlas for academic psychiatry. However, a rigorous scientific and technical audit revealed **14 critical, high, and medium severity inconsistencies and architectural oversimplifications** across the documentation, TypeScript schemas, exemplar datasets, licensing descriptions, and operational rules.

If Phase 1 (3D asset pipeline) were launched on the Phase-0 foundation without remediation, it would incur severe technical debt:
1. **Conflating distinct neurobiological concepts** (anatomical organs, atlas parcellations, functional networks, and treatment targets) into a single monolithic data type.
2. **Assuming a universal MNI152 coordinate system** for unaligned polygonal meshes from disparate sources.
3. **Overstating legal permissions** by describing the Human Connectome Project (HCP) data use agreement as simply "commercial allowed with attribution."
4. **Treating dataset-level licenses as blanket asset approvals**, overlooking upstream dependencies and ShareAlike implications.
5. **Oversimplifying scientific evidence** into a naive binary ("consensus" vs. "investigational"), risking the promotion of preliminary hypotheses (e.g., adult neurogenesis, simplistic dopamine excess) into pseudo-facts.
6. **Baking presentation-layer state** (such as layer peel indices and centroid explosion vectors) directly into canonical anatomical metadata.
7. **Publishing unsupported absolute performance guarantees** (e.g., "<0.1ms raycasting guaranteed", "350k triangles guaranteed") that disregard real-world device memory limits, WebGL context loss, and mobile Safari constraints.

This document details each audit finding, its severity, impact, proposed correction, and classification.

---

## 2. Detailed Audit Matrix

| Issue ID | Domain | Severity | Affected Files | Core Finding | Proposed Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | Legal / Provenance | **CRITICAL** | `SOURCES_AND_LICENSES.md`, `README.md` | HCP Glasser MMP 1.0 described as "Commercial Allowed?: Yes (with attribution)." The WU-Minn HCP Open Access Data Use Agreement is a specialized academic agreement requiring downstream redistribution under identical terms and subject protections; it is not a permissive commercial license. | Correct HCP legal analysis. Explicitly mark commercial software distribution as `LEGAL_REVIEW_REQUIRED`. Detail data-use covenants versus software redistribution. |
| **AUD-02** | Scientific / Ontology | **CRITICAL** | `src/types/anatomy.ts`, `data/structures/hippocampus_left.json` | Monolithic `AnatomicalStructure` type conflates macroscopic physical organs (gyri, sulci), cytoarchitectonic/multimodal parcels (Brodmann, HCP), functional networks (DMN, Salience), tracts, and clinical concepts. Hippocampus directly assigned Brodmann areas 28, 34, 35, 36 (which actually correspond to adjacent entorhinal/perirhinal cortex). | Implement a polymorphic `NeuroEntity` ontology separating `AnatomicalStructure`, `CorticalParcel`, `WhiteMatterTract`, `FunctionalNetwork`, `NeuralPathway`, `NeuromodulationTarget`, and `EvidenceClaim`. Use explicit graph relationship types (`adjacentTo`, `atlasParcelAssociation`). |
| **AUD-03** | Technical / Spatial | **CRITICAL** | `src/types/anatomy.ts`, `PROJECT_ARCHITECTURE.md`, `data/structures/hippocampus_left.json` | Direct assumption of universal `centroid_mni` coordinates across unaligned anatomical models. Z-Anatomy meshes are artistic/educational meshes modeled in Blender coordinates, NOT pre-registered MNI152 volumes. | Create a formal `CoordinateSpace` model in `COORDINATE_SYSTEMS.md` and `src/types/coordinates.ts` supporting `sourceCentroid`, `registeredCentroid`, coordinate frames, transformation matrices, registration methods, and uncertainty bounds. |
| **AUD-04** | Scientific / Evidence | **HIGH** | `src/types/anatomy.ts`, `data/structures/hippocampus_left.json` | Binary `EvidenceLevel` (`established_consensus` vs `investigational`) fails to distinguish correlation from causation, mechanistic hypotheses from clinical trials, or animal models from human replications. MDD neurogenesis and schizophrenia dopamine hyperactivity models presented as established facts. | Introduce a structured `EvidenceClaim` model in `src/types/evidence.ts` with GRADE certainty tiers, study designs, population distinctions, causal vs. associative relationships, and verification status (`VERIFIED`, `NEEDS_SOURCE_VERIFICATION`). |
| **AUD-05** | Legal / Provenance | **HIGH** | `SOURCES_AND_LICENSES.md`, `PROJECT_ARCHITECTURE.md` | Dataset-level licensing applied uniformly. Z-Anatomy is a composite of BodyParts3D (CC-BY-SA 2.1 Japan) and original contributions under CC-BY-SA 4.0. Upstream components may carry distinct attribution and derivative restrictions. | Introduce an asset-level provenance schema in `src/types/provenance.ts` and `assets/ASSET_PROVENANCE_SCHEMA.md` tracking exact upstream IDs, transformation hashes, licenses, and `PRODUCTION_ALLOWED` vs `RESEARCH_ONLY` status. |
| **AUD-06** | Scientific / Clinical | **HIGH** | `src/types/anatomy.ts`, `data/structures/hippocampus_left.json` | Neuromodulation targets represented as simple anatomical structures (e.g., "ECT -> Hippocampus"). ECT is a distributed electrical stimulation montage whose cognitive/antidepressant effects cannot be localized to a single discrete target. | Create a dedicated `NeuromodulationTarget` schema separating physical stimulation site (scalp 10-20 or stereotaxic coordinate), electrode/coil montage, E-field/VTA distribution, and downstream network engagement. |
| **AUD-07** | Scientific / Psychopharm | **HIGH** | `src/types/anatomy.ts`, `data/structures/hippocampus_left.json` | Psychopharmacology represented as unstructured prose strings lacking receptor subtype specifics, synaptic context (pre- vs post-synaptic), signaling pathways, or binding affinity data. | Design a structured `PharmacologyMapping` schema in `src/types/pharmacology.ts` modeling receptor/transporter subtypes, cellular distributions, functional mechanisms (PAM, partial agonist, antagonist), and clinical agents. |
| **AUD-08** | Scientific / RDoC | **MEDIUM** | `src/types/anatomy.ts`, `PROJECT_ARCHITECTURE.md` | RDoC modeled as a static 5-domain TypeScript union type. In reality, NIMH added the 6th domain (**Sensorimotor Systems**) in 2019, and constructs/subconstructs evolve periodically. | Refactor RDoC in `src/types/rdoc.ts` into a versioned hierarchical structure (Version -> Domain -> Construct -> Subconstruct -> Unit of Analysis -> Evidence) that accommodates future framework updates. |
| **AUD-09** | Architectural / State | **MEDIUM** | `src/types/anatomy.ts`, `PROJECT_ARCHITECTURE.md` | `layer_peel_index` hard-coded as an intrinsic anatomical property in the structure hierarchy. Peeling is a presentation/view concern, not an anatomical fact. | Decouple peel ordering into `VisibilityPreset` and `SemanticVisibilityGroup` in `src/types/presentation.ts`. Canonical anatomical structures must not store runtime UI state. |
| **AUD-10** | Architectural / 3D | **MEDIUM** | `PROJECT_ARCHITECTURE.md`, `ANTIGRAVITY_RULES.md` | Centroid-driven radial displacement used as the sole explosion mechanism. Rigid outward explosion causes severe collisions (e.g., between thalamus and internal capsule) and distorts clinical orientation. | Formulate an `ExplosionProfile` schema supporting customizable displacement vectors, reference frames, priority tiers, and collision constraints as runtime-only presentation transforms. |
| **AUD-11** | Technical / 3D Graphics | **MEDIUM** | `TECH_STACK_DECISION.md`, `PROJECT_ARCHITECTURE.md` | Blue-noise dithered screen-door transparency mislabeled as "true Order-Independent Transparency (OIT)". Screen-door is a stochastic approximation with high-frequency noise, temporal instability, and poor resolution for fine cranial nerves. | Correct terminology in documentation and shaders. Explicitly document limitations, WebGPU vs. WebGL2 behavior, and define discrete visualization modes: `OPAQUE`, `GHOSTED`, `X_RAY`, `SLICE`, `EXPLODED`. |
| **AUD-12** | Technical / Resilience | **MEDIUM** | `PROJECT_ARCHITECTURE.md`, `TECH_STACK_DECISION.md` | No architecture for renderer failure, WebGL context loss (`webglcontextlost`), or WebGPU device loss (`GPUDevice.lost`). In a complex medical app on mobile/iPad Safari, memory pressure frequently triggers context loss. | Author `RENDERER_RESILIENCE.md` establishing a formal lifecycle state machine (`HEALTHY`, `DEGRADED`, `CONTEXT_LOST`, `RECOVERING`, `FAILED`) and state-restoration protocols. |
| **AUD-13** | Technical / Performance | **MEDIUM** | `PROJECT_ARCHITECTURE.md`, `TECH_STACK_DECISION.md` | Document contains rigid, unsupported performance guarantees (e.g., "<0.1ms hover latency", "350k triangles guaranteed", "payload <25MB = X MB VRAM"). | Author `PERFORMANCE_BUDGETS.md` defining empirical budgets stratified by device class (high-end workstation, iPad Pro, base iPad, mobile). Treat numbers as empirical validation targets. |
| **AUD-14** | Scientific / Imaging | **LOW** | `src/types/anatomy.ts`, `data/structures/hippocampus_left.json` | MRI characteristics represented as universal properties (e.g., "T1 = isointense") without specifying sequence (T1w spin-echo vs MPRAGE), field strength (1.5T, 3T, 7T), or pathological contrasts. | Create a structured `ImagingFeature` model in `src/types/imaging.ts` documenting sequence, field strength, relative signal contrast, and pathological examples (e.g., mesial temporal sclerosis). |

---

## 3. Remediation Strategy & Action Plan

To systematically resolve these 14 audit findings before Phase 1, the following concrete actions will be taken:

1. **Schema Refactoring (`src/types/`)**:
   * Create `entity.ts`: Polymorphic `NeuroEntity` discriminated union separating structures, parcels, tracts, networks, pathways, targets, and claims.
   * Create `coordinates.ts`: Explicit `CoordinateSpace` model with transformation metadata and registration uncertainty.
   * Create `provenance.ts`: Asset-level provenance tracking upstream datasets, licenses, and production eligibility.
   * Create `evidence.ts`: Structured `EvidenceClaim` model with GRADE certainty levels and causal/mechanistic distinctions.
   * Create `rdoc.ts`: Versioned hierarchical RDoC framework (including the 6th Sensorimotor domain).
   * Create `pharmacology.ts`: Detailed neuroreceptor, transporter, and synaptic mechanism schemas.
   * Create `neuromodulation.ts`: Multi-modal intervention models separating physical target from network engagement.
   * Create `imaging.ts`: Contextual neuroimaging features parameterized by sequence and field strength.
   * Create `presentation.ts`: Decoupled `VisibilityPreset`, `ExplosionProfile`, and visualization modes.
   * Create `catalogue.ts`: Machine-readable anatomy catalogue with validation lifecycle states.
   * Update `src/types/anatomy.ts`: Refactor canonical anatomical structure schema to consume these modular types.

2. **Exemplar Dataset Remediation (`data/structures/hippocampus_left.json`)**:
   * Decouple Brodmann areas from intrinsic hippocampal ontology; map via `anatomicalRelationships.atlasParcelAssociation`.
   * Separate Ammon's horn, Dentate Gyrus, and Subiculum from adjacent entorhinal/parahippocampal cortex.
   * Rewrite psychiatric claims into explicit `EvidenceClaim` records; mark unverified human hypotheses with `NEEDS_SOURCE_VERIFICATION`.

3. **Documentation Updates & New Specifications**:
   * `SOURCES_AND_LICENSES.md`: Rigorous HCP data use terms analysis; asset-level provenance for Z-Anatomy and BodyParts3D; formal isolation of NC datasets.
   * `COORDINATE_SYSTEMS.md`: Comprehensive reference coordinate spaces, transforms, and registration methods.
   * `assets/ASSET_PROVENANCE_SCHEMA.md`: Specification for `assets.manifest.json`.
   * `RENDERER_RESILIENCE.md`: State machine for WebGL context loss and WebGPU device loss.
   * `PERFORMANCE_BUDGETS.md`: Empirical device-class performance targets.
   * `CORTICAL_PARCELLATION_ARCHITECTURE.md`: Technical strategy for mapping HCP MMP 1.0 parcels onto anatomical surfaces.
   * `ANATOMICAL_CATALOGUE_SPEC.md`: Machine-readable catalogue architecture and validation workflow.
   * `ANATOMICAL_ACCURACY_STANDARD.md`: Strengthened scientific prohibitions and evidence rules.
   * `ANTIGRAVITY_RULES.md` & `.agents/rules/medical-accuracy.md`: 15 persistent agent directives.
   * `PROJECT_ARCHITECTURE.md` & `TECH_STACK_DECISION.md`: Synchronized 11-tier architecture stack and failure modes.
