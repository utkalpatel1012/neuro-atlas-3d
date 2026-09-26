# ChatGPT Consultation Dossier: 3D Interactive Neuroanatomy Atlas for Psychiatry

**Document Version**: 2.0.0 (Phase 0.1 Remediated)  
**Standard**: AAS-2026-NEURO-V2  
**Target Repository**: `https://github.com/utkalpatel1012/neuro-atlas-3d`

---

## Ready-to-Use Consultation Prompt for ChatGPT

```text
Act as a Principal Medical Informatics Architect, Senior WebGL/WebGPU 3D Graphics Engineer, and Academic Neuroanatomy & Neuropsychiatry Specialist.

Please review the Phase 0.1 architecture hardening in this GitHub repository:
https://github.com/utkalpatel1012/neuro-atlas-3d

We recently conducted a rigorous Phase 0.1 remediation to prevent technical debt and scientific inaccuracies before launching Phase 1 (3D asset pipeline). 

Specifically critique:
1. Polymorphic Entity Model: We decoupled physical organs (AnatomicalStructure) from atlas-defined boundaries (CorticalParcel: HCP MMP 1.0, Brodmann), functional networks (DMN, Salience), tracts, and clinical concepts. Does this separation adequately protect against ontology conflation?
2. Coordinate Systems & Transforms (COORDINATE_SYSTEMS.md): We established that meshes and landmarks are NEVER assumed to be in MNI152 space without explicit registration metadata and uncertainty metrics. Is our registration taxonomy (native_mesh, blender_world, mni152, hcp_fslr_32k, ac_pc_surgical, eeg_10_20) mathematically robust?
3. Granular Asset Provenance (assets/ASSET_PROVENANCE_SCHEMA.md): We shifted from dataset-level licensing to asset-level cryptographic manifests (assets.manifest.json), strictly isolating CC-BY-NC-SA research datasets (EBRAINS Julich-Brain) and designating HCP commercial redistribution as LEGAL_REVIEW_REQUIRED. Is this legal interpretation sound?
4. Evidence Claim Model (src/types/evidence.ts): We replaced naive binary consensus/investigational with a GRADE-certainty EvidenceClaim schema that explicitly enforces: ASSOCIATION != CAUSATION and MECHANISTIC HYPOTHESIS != ESTABLISHED FACT. Does this meet academic psychiatry standards?
5. Technical Viewport Resilience & Budgets (RENDERER_RESILIENCE.md, PERFORMANCE_BUDGETS.md): We added a 5-state lifecycle machine for WebGL context loss / WebGPU device recovery, and stratified empirical performance targets across 7 device classes (enforcing a 150MB GPU VRAM ceiling on iPadOS Safari). Are there any unaddressed failure modes?
6. Final Question: Is the architecture now sufficiently hardened to begin Phase 1 (3D anatomical asset pipeline)?
```

---

## Core Schema & Exemplar Overview (Phase 0.1)

### 1. Refactored AnatomicalStructure Schema (`src/types/anatomy.ts`)

```typescript
export interface AnatomicalStructure extends BaseNeuroEntity {
  entity_type: 'anatomical_structure';
  subtype: AnatomicalStructureSubtype;
  name: {
    official_latin: string;
    official_english: string;
    clinical_aliases: string[];
    standard_abbreviations: string[];
  };
  ontology: {
    ta2_id: string;
    fma_id?: string;
    uberon_id?: string;
    neuronaes_id?: string;
  };
  hierarchy: {
    division: EmbryologicalDivision;
    hemisphere: Hemisphere;
    lobe?: string;
    subsystem: string;
    parent_id?: string;
    children_ids: string[];
  };
  spatial: SpatialDescriptor;
  presentation: {
    visibility_groups: SemanticVisibilityGroup[];
  };
  topography: {
    boundaries: TopographicalBoundaries;
    relationships: EntityRelationship[];
  };
  vasculature: {
    arterial_supply_ids: string[];
    venous_drainage_ids: string[];
  };
  functional_neuroanatomy: {
    primary_functions: string[];
    rdoc_associations: RDoCAssociation[];
  };
  psychiatric_relevance: {
    associated_disorders: PsychiatricConditionAssociation[];
    pharmacology_mappings: PsychopharmacologyMapping[];
    neuromodulation_protocols: NeuromodulationProtocol[];
    clinical_pearls: string[];
  };
  neurological_deficits: NeurologicalDeficit[];
  imaging: ImagingFeature[];
  provenance: AssetProvenance;
  evidence_claims: EvidenceClaim[];
  references: Citation[];
}
```

---

### 2. Remediated Left Hippocampus Exemplar (`data/structures/hippocampus_left.json`)

Key scientific remediations:
1. **Decoupled from Neocortical Brodmann Areas**: Hippocampus proper is 3-layered archicortex; removed direct assignment of BA 28/34/35/36. Mapped as explicit `topography.relationships` with `relationship_type: "associated_with_parcel"`.
2. **Explicit Spatial Registration**: Declared `source_coordinate_frame: "blender_world"`, `registered_coordinate_frame: "mni152_nonlinear_2009c_asym"` with `registration_uncertainty_mm: 1.1` and `dice_similarity_coefficient: 0.81`.
3. **GRADE Evidence Claims**:
   - Volume reduction in MDD: `relationship_nature: "replicated_statistical_association"`, `certainty_grade: "GRADE_HIGH"` (ENIGMA meta-analysis).
   - Adult neurogenesis in depression: `relationship_nature: "theoretical_mechanistic_hypothesis"`, `certainty_grade: "UNGRADED_THEORY"`, `verification_status: "NEEDS_SOURCE_VERIFICATION"`, documenting conflicting post-mortem evidence.
   - Patient H.M. lesion: `relationship_nature: "direct_causal_mechanism"`, `certainty_grade: "GRADE_HIGH"`.
4. **Distributed Neuromodulation**: ECT represented as a distributed bitemporal electrical stimulation montage with temporal lobe E-field distribution and downstream hippocampal neuroplasticity, rather than a single direct anatomical target.
