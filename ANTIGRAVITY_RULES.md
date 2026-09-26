# Antigravity Persistent Agent Rules & Operational Guidelines

**Project**: 3D Interactive Neuroanatomy Atlas for Psychiatry  
**Standard**: AAS-2026-NEURO-V2 (Remediated in Phase 0.1 & Phase 0.1.1)  
**Scope**: All AI coding agents, subagents, and automated workflows interacting with this repository.  

---

## 1. Sixteen Prime Directives (Non-Negotiable)

Every AI agent, subagent, and human contributor must adhere to these 16 mandatory rules:

1. **RESEARCH BEFORE IMPLEMENTING**:
   * Always verify anatomical terms, boundaries, and clinical claims against primary sources (Snell, Netter, TA2, HCP, Stahl, DSM-5-TR) before generating schemas or code.
2. **NEVER INVENT ANATOMICAL STRUCTURES**:
   * All structures, gyri, sulci, and nuclei must formally exist in Terminologia Anatomica 2 (TA2/TNA) or Foundational Model of Anatomy (FMA). Never fabricate imaginary morphology.
3. **NEVER FABRICATE SCIENTIFIC CITATIONS**:
   * Every citation must reference a verifiable paper or textbook with real authors, publication year, and valid PMID, DOI, or ISBN.
4. **NEVER SILENTLY UPGRADE AN ASSOCIATION INTO CAUSATION**:
   * Observational neuroimaging correlations (e.g., volume reduction, resting-state fMRI hyperconnectivity) must never be stated as proven direct causal mechanisms.
5. **NEVER SILENTLY TREAT A HYPOTHESIS AS CONSENSUS**:
   * Mechanistic models (e.g., adult hippocampal neurogenesis, dopamine excess models) must be explicitly classified as `theoretical_mechanistic_hypothesis` and domain-appropriate frameworks.
6. **NEVER MERGE DATASETS WITH INCOMPATIBLE LICENSING WITHOUT PROVENANCE REVIEW**:
   * Strictly quarantine Non-Commercial (NC) datasets (e.g., EBRAINS Julich-Brain, BigBrain) to internal research validation. Never bundle NC assets into production deliverables.
7. **NEVER ASSUME COORDINATE SYSTEMS ARE INTERCHANGEABLE**:
   * Raw mesh coordinates are NOT MNI152 coordinates. Transformations between native mesh, Blender world, MNI152, and HCP fs_LR must be mathematically explicit. In TypeScript, registered coordinates must be strictly coupled to target frames and registration metadata.
8. **NEVER ALTER CANONICAL GEOMETRY FOR VISUALIZATION EFFECTS**:
   * Peeling, explosion views, and clipping planes are runtime presentation transforms. The canonical resting geometry in vertex buffers must remain anatomically pristine.
9. **PRESERVE ASSET-LEVEL AND ENTITY-LEVEL PROVENANCE**:
   * Every production mesh, texture, and data record must possess an individual provenance entry in `assets/assets.manifest.json`. Non-physical entities use `EntityProvenance`.
10. **NEVER FABRICATE ASSET PROVENANCE OR PLACEHOLDER HASHES**:
    * Pre-pipeline assets must declare `resulting_sha256_hash: "NOT_YET_GENERATED"`. Fabricating fake commit hashes or empty-string SHA-256 digests in JSON metadata is strictly prohibited.
11. **PRESERVE EXACT SOURCE AND VERSION INFORMATION**:
    * Always document the exact upstream version (e.g., Z-Anatomy v2024.1.0, HCP 1200 Subjects, FreeSurfer v7.4.1).
12. **USE EMPIRICAL PERFORMANCE MEASUREMENTS**:
    * Do not state unsupported theoretical guarantees. Evaluate performance against stratified device-class targets defined in `PERFORMANCE_BUDGETS.md`.
13. **TEST WEBGPU AND WEBGL2 INDEPENDENTLY**:
    * Verify that custom shaders in Three Shading Language (TSL) compile cleanly to both WGSL (WebGPU) and GLSL ES 3.00 (WebGL2 backend fallback).
14. **VERIFY IPADOS AND MOBILE MEMORY BEHAVIOR**:
    * Strictly enforce the 150 MB GPU memory budget to prevent iPadOS Safari Jetsam OOM crashes.
15. **KEEP SCIENTIFIC DATA SEPARATE FROM UI**:
    * Anatomical knowledge and evidence claims must reside in pure TypeScript/JSON data layers with zero DOM or Three.js dependencies.
16. **HONOR THE TEN ARCHITECTURAL INVARIANTS**:
    * Strictly adhere to [`ARCHITECTURAL_INVARIANTS.md`](./ARCHITECTURAL_INVARIANTS.md) and [`ENTITY_IDENTITY_AND_REFERENCING.md`](./ENTITY_IDENTITY_AND_REFERENCING.md).

---

## 2. Strict Development Loop

Every future phase, feature, and commit must strictly follow this 9-step execution cycle:

$$\text{RESEARCH} \rightarrow \text{PLAN} \rightarrow \text{IMPLEMENT} \rightarrow \text{RUN} \rightarrow \text{VISUALLY INSPECT} \rightarrow \text{TEST} \rightarrow \text{VERIFY} \rightarrow \text{DOCUMENT} \rightarrow \text{CHECKPOINT}$$
