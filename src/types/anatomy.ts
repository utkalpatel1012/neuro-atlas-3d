/**
 * 3D Neuroanatomy Atlas: Core Anatomical Structure Data Model
 * Standard: AAS-2026-NEURO-V1 / TA2 / FIPAT
 * 
 * Re-architected in Phase 0.1 to decouple anatomical identity from
 * atlas parcellations, coordinates, evidence claims, and presentation states.
 */

import { BaseNeuroEntity, AnatomicalStructureSubtype, EntityRelationship } from './entity';
import { SpatialDescriptor } from './coordinates';
import { AssetProvenance } from './provenance';
import { EvidenceClaim, Citation } from './evidence';
import { RDoCAssociation } from './rdoc';
import { PsychopharmacologyMapping } from './pharmacology';
import { NeuromodulationProtocol } from './neuromodulation';
import { ImagingFeature } from './imaging';
import { SemanticVisibilityGroup } from './presentation';

export type EmbryologicalDivision =
  | 'telencephalon'
  | 'diencephalon'
  | 'mesencephalon'
  | 'metencephalon'
  | 'myelencephalon'
  | 'peripheral_nervous_system';

export type Hemisphere = 'left' | 'right' | 'bilateral' | 'midline';

export interface TopographicalBoundaries {
  superior?: string;
  inferior?: string;
  anterior?: string;
  posterior?: string;
  medial?: string;
  lateral?: string;
}

export interface NeurologicalDeficit {
  syndrome_or_lesion_name: string;
  clinical_manifestation: string;
  bedside_examination_test: string;
  evidence_claim_ids: string[];
}

export interface PsychiatricConditionAssociation {
  disorder_name: string;
  dsm5_tr_code?: string;
  pathophysiological_role: string;
  associated_symptoms: string[];
  evidence_claim_ids: string[];
}

/**
 * Concrete Physical Anatomical Structure (Organ / Nucleus / Gyrus / Vessel).
 * Implements BaseNeuroEntity with rigorous separation of concerns.
 */
export interface AnatomicalStructure extends BaseNeuroEntity {
  entity_type: 'anatomical_structure';
  subtype: AnatomicalStructureSubtype;

  /** Standard Names & Synonyms */
  name: {
    official_latin: string;
    official_english: string;
    clinical_aliases: string[];
    standard_abbreviations: string[];
  };

  /** Ontological Grounding */
  ontology: {
    ta2_id: string;           // Terminologia Anatomica 2 (e.g., 'TA2:5488')
    fma_id?: string;          // Foundational Model of Anatomy (e.g., 'FMA:275020')
    uberon_id?: string;       // Uber-anatomy cross-species ontology (e.g., 'UBERON:0001954')
    neuronaes_id?: string;    // NeuroNames identifier
  };

  /** Hierarchical Taxonomy */
  hierarchy: {
    division: EmbryologicalDivision;
    hemisphere: Hemisphere;
    lobe?: string;
    subsystem: string;        // e.g., 'basal_ganglia', 'limbic_system', 'tegmentum'
    parent_id?: string;
    children_ids: string[];
  };

  /** Spatial Geometry & Registration Metadata */
  spatial: SpatialDescriptor;

  /** Presentation Layer Visibility Categorization */
  presentation: {
    visibility_groups: SemanticVisibilityGroup[];
  };

  /** Relational Topography & Explicit Graph Links */
  topography: {
    boundaries: TopographicalBoundaries;
    relationships: EntityRelationship[];
  };

  /** Vascular Supply & Drainage */
  vasculature: {
    arterial_supply_ids: string[];
    venous_drainage_ids: string[];
  };

  /** Functional Neuroanatomy & Cognitive Domains */
  functional_neuroanatomy: {
    primary_functions: string[];
    rdoc_associations: RDoCAssociation[];
  };

  /** Academic Psychiatry & Clinical Neurobiology */
  psychiatric_relevance: {
    associated_disorders: PsychiatricConditionAssociation[];
    pharmacology_mappings: PsychopharmacologyMapping[];
    neuromodulation_protocols: NeuromodulationProtocol[];
    clinical_pearls: string[];
  };

  /** Neurological Examination & Lesion Deficits */
  neurological_deficits: NeurologicalDeficit[];

  /** Neuroimaging Profile */
  imaging: ImagingFeature[];

  /** Granular Asset Provenance */
  provenance: AssetProvenance;

  /** Direct Evidence Claims Grounding this Structure */
  evidence_claims: EvidenceClaim[];

  /** Primary Literature Citations */
  references: Citation[];
}
