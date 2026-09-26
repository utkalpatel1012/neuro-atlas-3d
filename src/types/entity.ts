/**
 * 3D Neuroanatomy Atlas: NeuroEntity Polymorphic Ontology
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. ANATOMICAL IDENTITY != ATLAS PARCELLATION
 * 2. ATLAS PARCELLATION != FUNCTIONAL NETWORK
 * 3. FUNCTIONAL NETWORK != NEURAL PATHWAY
 * 4. CLINICAL / NEUROMODULATION TARGET != ANATOMICAL STRUCTURE
 * 5. EVIDENCE CLAIM != PHYSICAL ANATOMY
 * 6. PHYSICAL 3D ASSET != SEMANTIC GRAPH ENTITY
 */

import { CoordinateFrame } from './coordinates';
import { EntityProvenance } from './provenance';
import { EvidenceDomain } from './evidence';
import { NeuromodulationModality } from './neuromodulation';
import type { AnatomicalStructure } from './anatomy';

export type NeuroEntityType =
  | 'anatomical_structure'
  | 'cortical_parcel'
  | 'white_matter_tract'
  | 'functional_network'
  | 'neural_pathway'
  | 'neuromodulation_target'
  | 'lesion_model'
  | 'evidence_claim';

export type AnatomicalStructureSubtype =
  | 'lobe'
  | 'gyrus'
  | 'sulcus'
  | 'fissure'
  | 'subcortical_nucleus'
  | 'thalamic_nucleus'
  | 'hypothalamic_nucleus'
  | 'brainstem_structure'
  | 'cerebellar_structure'
  | 'ventricular_structure'
  | 'cerebral_artery'
  | 'cerebral_vein'
  | 'dural_sinus'
  | 'cranial_nerve'
  | 'meningeal_structure';

export type CorticalParcelAtlas =
  | 'HCP_MMP1'           // Glasser et al., 2016 Nature (180 areas/hemisphere)
  | 'Brodmann'           // Classical cytoarchitectonic areas (BA 1-52)
  | 'Julich_Brain'       // Amunts et al., probabilistic cytoarchitectonics
  | 'Schaefer_2018'      // Multi-resolution functional parcellation (100-1000 parcels)
  | 'AAL3'               // Automated Anatomical Labeling v3
  | 'Desikan_Killiany';  // FreeSurfer gyral/sulcal parcellation

export type Laterality = 'left' | 'right' | 'bilateral' | 'midline' | 'unpaired';

export type RepresentationScope =
  | 'paired_separate'      // Distinct bilateral pairs with individual 3D meshes (e.g., Left/Right Hippocampus)
  | 'single_midline_mesh'  // Unpaired or fused midline 3D asset (e.g., Corpus Callosum, Basilar Artery)
  | 'distributed_network'  // Multi-focal distributed non-contiguous geometry (e.g., Default Mode Network)
  | 'abstract_semantic';   // Conceptual/functional entity with no intrinsic physical mesh (e.g., Evidence Claims)

/**
 * Universal minimal base interface shared by all entities in the neuroanatomy graph.
 * Stripped of domain-specific fields (e.g., Latin names, 3D meshes, biological laterality)
 * which do not apply universally across functional networks, evidence claims, or targets.
 */
export interface BaseNeuroEntity {
  id: string; // Stable canonical URI (e.g., 'brain.telencephalon.left.limbic.hippocampus', 'network.default_mode')
  entity_type: NeuroEntityType;
  canonical_name: string;
  provenance: EntityProvenance;
  evidence_claim_ids: string[];
  created_at: string;
  updated_at: string;
}

export type AnatomicalRelationshipType =
  | 'part_of'
  | 'contains'
  | 'adjacent_to'
  | 'continuous_with'
  | 'anterior_to'
  | 'posterior_to'
  | 'superior_to'
  | 'inferior_to'
  | 'medial_to'
  | 'lateral_to';

export type ConnectivityRelationshipType =
  | 'receives_input_from'
  | 'projects_to'
  | 'synapses_with'
  | 'traversed_by';

export type FunctionalNetworkRelationshipType =
  | 'participates_in_network'
  | 'functional_hub_of'
  | 'component_of_pathway';

export type ParcellationRelationshipType =
  | 'associated_with_parcel'
  | 'contains_parcel';

export type VascularRelationshipType =
  | 'vascularized_by'
  | 'drained_by';

export type ClinicalInterventionRelationshipType =
  | 'modulated_by'
  | 'targets_structure'
  | 'affected_by_lesion';

export type EpistemicRelationshipType =
  | 'supports_claim'
  | 'contradicts_claim'
  | 'grounded_by_evidence';

export type RelationshipType =
  | AnatomicalRelationshipType
  | ConnectivityRelationshipType
  | FunctionalNetworkRelationshipType
  | ParcellationRelationshipType
  | VascularRelationshipType
  | ClinicalInterventionRelationshipType
  | EpistemicRelationshipType;

/**
 * Semantically typed relationship between entities in the neuro-knowledge graph.
 */
export interface EntityRelationship {
  source_entity_id: string;
  relationship_type: RelationshipType;
  target_entity_id: string;
  evidence_claim_ids: string[];
  provenance?: EntityProvenance;
  notes?: string;
}

/**
 * Cortical Parcel: Represents an atlas-defined or cytoarchitectonic boundary,
 * strictly distinguished from a physical anatomical organ/gyrus.
 */
export interface CorticalParcelEntity extends BaseNeuroEntity {
  entity_type: 'cortical_parcel';
  atlas: CorticalParcelAtlas;
  parcel_code: string; // e.g., 'Area 46', '46_L', 'BA25'
  laterality: Laterality;
  canonical_surface_space: CoordinateFrame;
  vertex_indices_32k?: number[];
  associated_anatomical_structure_ids: string[]; // Gyri/sulci on which this parcel falls
  boundary_uncertainty_mm?: number;
  asset_id?: string; // Optional surface patch asset
}

/**
 * White Matter Tract: Represents an organized bundle of axonal fibers.
 */
export interface WhiteMatterTractEntity extends BaseNeuroEntity {
  entity_type: 'white_matter_tract';
  tract_category: 'projection' | 'association' | 'commissural' | 'striatal' | 'brainstem_tract';
  laterality: Laterality;
  origin_structure_ids: string[];
  termination_structure_ids: string[];
  decussation_site?: string;
  functional_role: string;
  asset_id?: string; // Optional streamlines 3D asset
}

/**
 * Functional Network: Represents distributed resting-state or task-based co-activation networks.
 * Not a physical structural organ, but a multi-region functional synchronization pattern.
 */
export interface FunctionalNetworkEntity extends BaseNeuroEntity {
  entity_type: 'functional_network';
  network_name:
    | 'default_mode'
    | 'salience'
    | 'central_executive'
    | 'dorsal_attention'
    | 'ventral_attention'
    | 'somatomotor'
    | 'visual'
    | 'limbic'
    | 'reward_circuitry';
  canonical_hub_structure_ids: string[];
  focal_parcels: string[];
  clinical_psychiatry_relevance: string;
}

/**
 * Neural Pathway / Circuit: Represents specific sequential chains of synaptic transmission
 * (e.g., Papez circuit, Cortico-Striatal-Thalamo-Cortical CSTC loops, Mesolimbic Dopamine pathway).
 */
export interface NeuralPathwayEntity extends BaseNeuroEntity {
  entity_type: 'neural_pathway';
  pathway_name: string;
  synaptic_nodes: Array<{
    sequence_order: number;
    structure_id: string;
    predominant_neurotransmitter: string;
    synaptic_action: 'excitatory' | 'inhibitory' | 'modulatory';
  }>;
  psychiatric_circuit_category:
    | 'cstc_affective'
    | 'cstc_cognitive'
    | 'cstc_motor'
    | 'papez_limbic'
    | 'mesolimbic_reward'
    | 'mesocortical_executive'
    | 'nigrostriatal_motor'
    | 'tuberoinfundibular_endocrine';
}

/**
 * Neuromodulation Target: Represents physical/stereotaxic stimulation targets
 * for clinical interventions (rTMS, DBS, ECT, tFUS).
 * References underlying anatomical structures and parcels rather than duplicating them.
 */
export interface NeuromodulationTargetCoordinate {
  coordinate_frame: CoordinateFrame;
  coordinates?: [number, number, number];
  scalp_10_20?: string;
  stereotaxic_description: string;
}

export interface NeuromodulationTargetEntity extends BaseNeuroEntity {
  entity_type: 'neuromodulation_target';
  modality: NeuromodulationModality;
  target_structure_ids: string[];
  target_parcel_ids?: string[];
  target_network_ids?: string[];
  coordinate_definitions: NeuromodulationTargetCoordinate[];
  protocol_ids: string[];
  clinical_indications: string[];
}

/**
 * Lesion Model: Represents stroke territories, resections, or focal brain trauma.
 */
export interface LesionModelEntity extends BaseNeuroEntity {
  entity_type: 'lesion_model';
  etiology: 'ischemic_stroke' | 'hemorrhagic_stroke' | 'surgical_resection' | 'tumor_invasion' | 'traumatic_contusion';
  laterality?: Laterality;
  vessel_territory_id?: string;
  affected_structure_ids: string[];
  typical_syndrome_name: string;
  cognitive_affective_deficits: string[];
  bedside_neurological_findings: string[];
  asset_id?: string; // Optional 3D lesion volume mask
}

/**
 * Evidence Claim Entity: First-class graph node anchoring an epistemic claim
 * linking structures, pathways, disorders, or interventions.
 */
export interface EvidenceClaimEntity extends BaseNeuroEntity {
  entity_type: 'evidence_claim';
  evidence_domain: EvidenceDomain;
  claim_statement: string;
  claim_record_id: string; // Foreign key referencing full EvidenceClaim object
  primary_citation_summary: string;
  source_entity_ids: string[];
  target_entity_ids: string[];
}

/**
 * Exhaustive Discriminated Union representing any valid entity in the neuro-knowledge graph.
 * Covers all 8 declared NeuroEntityType values:
 * 1. anatomical_structure
 * 2. cortical_parcel
 * 3. white_matter_tract
 * 4. functional_network
 * 5. neural_pathway
 * 6. neuromodulation_target
 * 7. lesion_model
 * 8. evidence_claim
 */
export type NeuroEntity =
  | AnatomicalStructure
  | CorticalParcelEntity
  | WhiteMatterTractEntity
  | FunctionalNetworkEntity
  | NeuralPathwayEntity
  | NeuromodulationTargetEntity
  | LesionModelEntity
  | EvidenceClaimEntity;
