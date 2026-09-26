/**
 * 3D Neuroanatomy Atlas: NeuroEntity Polymorphic Ontology
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * ANATOMICAL IDENTITY must be separate from ATLAS PARCELLATION,
 * which must be separate from FUNCTIONAL NETWORK,
 * which must be separate from CLINICAL/TREATMENT CONCEPT,
 * which must be separate from SCIENTIFIC EVIDENCE.
 */

import { CoordinateFrame } from './coordinates';
import { AssetProvenance } from './provenance';

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

export type Laterality = 'left' | 'right' | 'bilateral' | 'midline';

/**
 * Common base interface shared by all neuro-entities in the ontology.
 */
export interface BaseNeuroEntity {
  id: string; // Stable canonical URI (e.g., 'brain.telencephalon.left.frontal_lobe.precentral_gyrus')
  entity_type: NeuroEntityType;
  canonical_name: string;
  latin_name?: string;
  clinical_aliases: string[];
  abbreviations: string[];
  laterality: Laterality;
  provenance: AssetProvenance;
  evidence_claim_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Standard relationship descriptors between entities in the neuroanatomy graph.
 */
export interface EntityRelationship {
  target_entity_id: string;
  relationship_type:
    | 'part_of'
    | 'contains'
    | 'adjacent_to'
    | 'receives_input_from'
    | 'projects_to'
    | 'traversed_by'
    | 'vascularized_by'
    | 'drained_by'
    | 'associated_with_parcel'
    | 'participates_in_network'
    | 'component_of_pathway'
    | 'modulated_by';
  evidence_claim_ids: string[];
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
  canonical_surface_space: CoordinateFrame;
  vertex_indices_32k?: number[];
  associated_anatomical_structure_ids: string[]; // Gyri/sulci on which this parcel falls
  boundary_uncertainty_mm?: number;
}

/**
 * White Matter Tract: Represents an organized bundle of axonal fibers.
 */
export interface WhiteMatterTractEntity extends BaseNeuroEntity {
  entity_type: 'white_matter_tract';
  tract_category: 'projection' | 'association' | 'commissural' | 'striatal' | 'brainstem_tract';
  origin_structure_ids: string[];
  termination_structure_ids: string[];
  decussation_site?: string;
  functional_role: string;
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
 * Lesion Model: Represents stroke territories, resections, or focal brain trauma.
 */
export interface LesionModelEntity extends BaseNeuroEntity {
  entity_type: 'lesion_model';
  etiology: 'ischemic_stroke' | 'hemorrhagic_stroke' | 'surgical_resection' | 'tumor_invasion' | 'traumatic_contusion';
  vessel_territory_id?: string;
  affected_structure_ids: string[];
  typical_syndrome_name: string;
  cognitive_affective_deficits: string[];
  bedside_neurological_findings: string[];
}

/**
 * Discriminated Union representing any valid entity in the neuroanatomy graph.
 */
export type NeuroEntity =
  | CorticalParcelEntity
  | WhiteMatterTractEntity
  | FunctionalNetworkEntity
  | NeuralPathwayEntity
  | LesionModelEntity;
