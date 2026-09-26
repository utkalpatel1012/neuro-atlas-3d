# Architectural Invariants: 10 Core Mandates

**Document Standard**: AAS-2026-NEURO-V1  
**Phase**: 0.1.1 Remediation & Pre-Phase-1 Invariant Lock  
**Target Audience**: All AI Autonomous Agents, Lead Architects, and Medical Visualization Engineers  
**Enforcement**: STRICT & UNCOMPROMISING  

---

## Preamble

Medical digital applications frequently suffer catastrophic technical debt and scientific corruption when subtle ontological distinctions are blurred for UI convenience. In our 3D interactive brain atlas, every software engineer, subagent, and automated pipeline must adhere to the following **Ten Architectural Invariants**. Violating any invariant is treated as a critical regression.

---

### Invariant 1: Anatomical Identity ≠ Mesh Asset
* **Principle**: A biological anatomical organ (`brain.*`) is a permanent neuroanatomical concept grounded in Terminologia Anatomica 2 (TA2). A 3D mesh (`mesh.*`) is a temporary, versioned geometric polygon approximation.
* **Invariant Rule**: An `AnatomicalStructure` entity can exist in the atlas catalogue and knowledge graph **before** any 3D geometry file is created, downloaded, or cleaned. The physical mesh file is linked strictly via an optional `asset_id?: string` and tracked in `assets/assets.manifest.json`.

### Invariant 2: Anatomical Identity ≠ Atlas Parcel
* **Principle**: Gross macroscopic anatomy (e.g., gyri, sulci, subcortical nuclei) is defined by physical landmarks, sulcal fissures, and embryological origin. An atlas parcellation (`parcel.*`, e.g., Glasser HCP-MMP1.0, Schaefer, Brodmann) is an operational coordinate system or statistical boundary.
* **Invariant Rule**: Parcellations and anatomical structures must never share the same entity schema or identifier. A cortical parcel references the gyri it covers via `associated_anatomical_structure_ids`; an anatomical gyrus references intersecting parcels via `topography.relationships`.

### Invariant 3: Atlas Parcel ≠ Functional Network
* **Principle**: An atlas parcel represents a specific contiguous region on a cortical surface mesh. A functional network (`network.*`, e.g., Default Mode Network, Salience Network) is a distributed collection of spatially disjoint cortical and subcortical nodes exhibiting synchronous resting-state BOLD or task co-activation.
* **Invariant Rule**: Functional networks are non-contiguous graph collections referencing focal parcels and canonical hub structures. They must never be treated as single contiguous 3D anatomical meshes.

### Invariant 4: Functional Network ≠ Neural Pathway
* **Principle**: A functional network describes macroscale statistical co-activation across disparate brain regions without asserting direct monosynaptic connectivity. A neural pathway (`pathway.*`, e.g., Papez circuit, Nigrostriatal pathway, Cortico-Striatal-Thalamo-Cortical loops) describes an ordered chain of physical synaptic projections with specific neurotransmitters and action polarities (excitatory, inhibitory, modulatory).
* **Invariant Rule**: Functional networks and neural pathways must be modeled under distinct specialized schemas (`FunctionalNetworkEntity` vs `NeuralPathwayEntity`).

### Invariant 5: Evidence Claim ≠ Anatomical Structure
* **Principle**: An anatomical structure is a physical entity. An empirical scientific finding (e.g., "Hippocampal volume is reduced in MDD", "CA1 receives perforant path projection") is an epistemic assertion subject to peer review, methodological limitations, sample sizes, and potential contradiction.
* **Invariant Rule**: Scientific claims must never be flattened into unverified string literals on anatomy records. Every scientific correlation must reference a structured `EvidenceClaim` record (`claim.*`) evaluated under a recognized framework (`GRADE`, `OXFORD_CEBM`, or `QUALITATIVE_ANATOMICAL_CONSENSUS`).

### Invariant 6: Clinical Target ≠ Anatomical Structure
* **Principle**: A neuromodulation target (`target.*`, e.g., Left DLPFC Beam F3, Area 25 DBS lead location) represents a bioengineering stimulation target defined by physical coils, scalp coordinates, stereotaxic leads, and induced electric fields (E-field / VTA). It is not identical to the underlying gray matter structure.
* **Invariant Rule**: Neuromodulation targets must be instantiated as `NeuromodulationTargetEntity`, referencing underlying anatomical structures and parcels by ID rather than duplicating or replacing them.

### Invariant 7: Source Coordinate ≠ Registered Coordinate
* **Principle**: Untransformed 3D vertex positions in native meshes or Blender scene space are arbitrary. Stereotaxic coordinates (e.g., MNI152NLin2009cAsym, AC-PC stereotactic space) are standardized population references.
* **Invariant Rule**: A registered coordinate must **never** exist without an explicit `registered_coordinate_frame` and complete `RegistrationMetadata` (including registration method, reference template, and Target Registration Error uncertainty metric). Unregistered meshes must be explicitly labeled `'unregistered_raw'`.

### Invariant 8: Canonical Geometry ≠ Presentation Transform
* **Principle**: Anatomical structures in real life exist in close physical contact with zero margins. Visual deconstructions (layer peeling, exploded views, opacity fades, cutting planes) are runtime camera/material operations.
* **Invariant Rule**: The underlying canonical geometry files (`.glb`) stored on disk and in GPU buffers must **never** have exploded offsets or transparency baked into vertex positions. All exploded offsets must be applied dynamically at runtime using shader uniforms or scene graph transformation matrices.

### Invariant 9: Research Asset ≠ Production Asset
* **Principle**: Datasets licensed under Non-Commercial terms (e.g., CC-BY-NC-SA 4.0, EBRAINS / Julich-Brain, BigBrain, Allen Institute) are legally quarantined from production commercial web applications. Production assets must carry unencumbered licenses (e.g., CC-BY-SA 4.0, CC-BY 4.0, MIT, Apache 2.0).
* **Invariant Rule**: Every production asset must be explicitly whitelisted in `assets/assets.manifest.json` with status `PRODUCTION_ALLOWED` and `CLEARED`. Any asset originating from a non-commercial research source must be quarantined under `RESEARCH_ONLY` and barred from build bundles.

### Invariant 10: Association ≠ Causation
* **Principle**: In clinical psychiatric neuroimaging, statistical volumetric or functional associations (e.g., correlation between hippocampal volume and depression severity) do not establish primary biological etiology.
* **Invariant Rule**: Every evidence claim must explicitly declare its `relationship_nature` (`replicated_statistical_association` vs `direct_causal_mechanism` vs `theoretical_mechanistic_hypothesis`). Causality must never be claimed where literature demonstrates only correlation.

---

## Permanent Compliance Verification

Every CI workflow, automated test run, and pull request must execute `npm test`, verifying that:
1. `src/schema_validation.test.ts` passes with zero invariant violations.
2. `tsc --noEmit` compiles cleanly with strict type safety.
3. No fake cryptographic hashes or placeholder commit IDs exist in production JSON records.
