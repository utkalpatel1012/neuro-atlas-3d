/**
 * 3D Neuroanatomy Atlas: Core Data Model & Schema Definitions
 * Standard: AAS-2026-NEURO-V1 / TA2 / FIPAT
 */

export type EmbryologicalDivision =
  | 'telencephalon'
  | 'diencephalon'
  | 'mesencephalon'
  | 'metencephalon'
  | 'myelencephalon'
  | 'peripheral_nervous_system';

export type Hemisphere = 'left' | 'right' | 'bilateral' | 'midline';

export type AnatomicalClassification =
  | 'cortical'
  | 'subcortical_gray'
  | 'diencephalic'
  | 'brainstem'
  | 'cerebellar'
  | 'ventricular'
  | 'white_matter_tract'
  | 'cranial_nerve'
  | 'cerebral_artery'
  | 'cerebral_vein'
  | 'meningeal';

export type EvidenceLevel = 'established_consensus' | 'investigational';

export type RDoCDomain =
  | 'negative_valence'
  | 'positive_valence'
  | 'cognitive_systems'
  | 'social_processes'
  | 'arousal_regulatory';

export type NeuromodulationModality =
  | 'rTMS'
  | 'DBS'
  | 'ECT'
  | 'tDCS'
  | 'VNS';

export interface Citation {
  title: string;
  authors: string[];
  journal_or_book: string;
  year: number;
  pmid?: string;
  doi?: string;
  isbn?: string;
}

export interface PsychiatricCorrelate {
  disorder: string;
  pathophysiology_summary: string;
  evidence_level: EvidenceLevel;
  associated_symptoms: string[];
  references: Citation[];
}

export interface PsychopharmacologyMapping {
  neurotransmitter_system: 'dopamine' | 'serotonin' | 'norepinephrine' | 'gaba' | 'glutamate' | 'acetylcholine' | 'opioid';
  predominant_receptors: string[];
  mechanism_summary: string;
  clinical_agents: string[];
}

export interface NeuromodulationTarget {
  modality: NeuromodulationModality;
  target_name: string;
  stereotaxic_mni_coordinates?: [number, number, number];
  clinical_indication: string;
  clinical_trials_or_fda_status: string;
}

export interface NeurologicalDeficit {
  syndrome_or_lesion_name: string;
  clinical_manifestation: string;
  bedside_examination_test: string;
}

export interface NeuroimagingFeatures {
  t1_intensity: 'hypointense' | 'isointense' | 'hyperintense';
  t2_flair_intensity: 'hypointense' | 'isointense' | 'hyperintense';
  radiological_landmarks: string;
}

export interface TopographicalBoundaries {
  superior?: string;
  inferior?: string;
  anterior?: string;
  posterior?: string;
  medial?: string;
  lateral?: string;
}

export interface AnatomicalStructure {
  /**
   * Deterministic canonical identifier:
   * e.g., 'brain.telencephalon.left.frontal_lobe.precentral_gyrus'
   */
  id: string;

  /** Standard Names & Synonyms */
  name: {
    official_latin: string;
    official_english: string;
    clinical_aliases: string[];
    standard_abbreviations: string[];
  };

  /** Ontological Cross-References */
  ontology: {
    ta2_id: string;           // Terminologia Anatomica 2 (e.g., 'TA2:5488')
    fma_id?: string;          // Foundational Model of Anatomy (e.g., 'FMA:275020')
    uberon_id?: string;       // Uber-anatomy ontology (e.g., 'UBERON:0001954')
    neuronaes_id?: string;    // NeuroNames ID
    brodmann_areas: number[]; // Matching Brodmann cytoarchitectonic areas
  };

  /** Hierarchical Taxonomy */
  hierarchy: {
    division: EmbryologicalDivision;
    hemisphere: Hemisphere;
    lobe?: string;
    subsystem: string;        // e.g., 'basal_ganglia', 'limbic_system', 'tectum'
    parent_id?: string;
    children_ids: string[];
    layer_peel_index: number; // 0 = Vasculature, 1 = Cortex, ..., 7 = Cranial Nerves
  };

  /** 3D Spatial & Render Properties */
  spatial: {
    mesh_node_name: string;   // Exact node name in .glb file
    centroid_mni: [number, number, number];
    bounding_box: {
      min: [number, number, number];
      max: [number, number, number];
    };
    estimated_volume_cm3?: number;
    default_color_hex: string;
  };

  /** Anatomical Classification */
  classification: AnatomicalClassification;

  /** Relational Topography & Boundaries */
  topography: {
    boundaries: TopographicalBoundaries;
    adjacent_structure_ids: string[];
  };

  /** Neural Circuitry & Connectivity */
  circuitry: {
    major_afferents: string[];
    major_efferents: string[];
    traversing_tract_ids: string[];
  };

  /** Vascular Supply & Drainage */
  vasculature: {
    arterial_supply: string[];
    venous_drainage: string[];
  };

  /** Functional Neuroanatomy */
  functional_neuroanatomy: {
    primary_functions: string[];
    rdoc_domains: RDoCDomain[];
  };

  /** Academic Psychiatry & Clinical Neurobiology */
  psychiatric_relevance: {
    disorders: PsychiatricCorrelate[];
    psychopharmacology: PsychopharmacologyMapping[];
    neuromodulation_targets: NeuromodulationTarget[];
    clinical_pearls: string[];
  };

  /** Clinical Neurological Examination */
  neurological_deficits: NeurologicalDeficit[];

  /** Magnetic Resonance & Neuroimaging Notes */
  imaging: NeuroimagingFeatures;

  /** Asset Provenance & Licensing */
  provenance: {
    source_dataset: string;
    source_mesh_id: string;
    license: string;
    modification_log: string[];
  };

  /** Authoritative Citations */
  references: Citation[];
}
