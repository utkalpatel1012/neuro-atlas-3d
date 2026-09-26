/**
 * 3D Neuroanatomy Atlas: Scientific Evidence & Epistemic Hierarchy Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. ASSOCIATION != CAUSATION
 * 2. MECHANISTIC HYPOTHESIS != ESTABLISHED CLINICAL FACT
 * 3. ANIMAL TRANSLATION != PROVEN HUMAN PATHOPHYSIOLOGY
 */

export type EvidenceType =
  | 'systematic_review_meta_analysis'
  | 'randomized_controlled_trial'
  | 'controlled_clinical_trial'
  | 'prospective_cohort_study'
  | 'retrospective_case_control'
  | 'cross_sectional_study'
  | 'observational_registry'
  | 'human_neuroimaging_structural_mri'
  | 'human_neuroimaging_functional_fmri'
  | 'human_neuroimaging_pet_spect'
  | 'human_neuroimaging_dti_tractography'
  | 'post_mortem_histology_stereology'
  | 'preclinical_animal_in_vivo'
  | 'in_vitro_cellular_molecular'
  | 'expert_consensus_clinical_guideline'
  | 'computational_mechanistic_model'
  | 'theoretical_hypothesis';

export type StudyPopulation =
  | 'clinical_psychiatric_humans'
  | 'healthy_adult_humans'
  | 'developmental_pediatric_humans'
  | 'geriatric_neurodegenerative_humans'
  | 'non_human_primates'
  | 'rodent_models'
  | 'cell_culture_organoid';

export type RelationshipNature =
  | 'direct_causal_mechanism'              // Proven causal link (e.g., stroke lesion producing focal aphasia)
  | 'replicated_statistical_association'   // Robust statistical association without proven directionality
  | 'preliminary_correlative_observation'  // Early exploratory finding requiring independent replication
  | 'theoretical_mechanistic_hypothesis';  // Theoretical biological model (e.g., neurogenesis explanation of SSRI latency)

export type EvidenceCertaintyGRADE =
  | 'GRADE_HIGH'       // High confidence: Further research is very unlikely to change confidence in the estimate of effect
  | 'GRADE_MODERATE'   // Moderate confidence: Further research is likely to have an important impact on confidence
  | 'GRADE_LOW'        // Low confidence: Further research is very likely to have an important impact
  | 'GRADE_VERY_LOW'   // Very low confidence: Any estimate of effect is very uncertain
  | 'UNGRADED_THEORY'; // Conceptual, preclinical, or computational hypothesis

export type VerificationStatus =
  | 'VERIFIED'                   // Backed by primary peer-reviewed citation meeting methodological criteria
  | 'NEEDS_SOURCE_VERIFICATION'  // Useful clinical concept that requires formal academic verification before Phase 1 commit
  | 'CONTESTED_OR_INCONSISTENT'  // Conflicting findings in published literature (e.g., adult human hippocampal neurogenesis)
  | 'SUPERSEDED';                // Historically cited finding overturned by modern large-scale replications (e.g., candidate gene studies)

export interface Citation {
  title: string;
  authors: string[];
  journal_or_book: string;
  year: number;
  pmid?: string;
  doi?: string;
  isbn?: string;
  open_access_url?: string;
}

/**
 * Structured scientific evidence claim anchoring every functional,
 * pathological, and clinical correlation in the atlas.
 */
export interface EvidenceClaim {
  id: string; // e.g., 'claim.hpc.volume_reduction.mdd.enigma2016'
  claim_statement: string;
  evidence_type: EvidenceType;
  population: StudyPopulation;
  sample_size?: number;
  intervention_or_exposure?: string; // e.g., 'Major Depressive Disorder diagnosis', 'Escitalopram 20mg'
  comparator?: string;               // e.g., 'Healthy age-matched controls', 'Placebo'
  outcome_measure: string;           // e.g., 'Bilateral hippocampal gray matter volume in mm3'
  relationship_nature: RelationshipNature;
  certainty_grade: EvidenceCertaintyGRADE;
  replication_status: 'REPLICATED_INDEPENDENTLY' | 'SINGLE_STUDY' | 'FAILED_REPLICATION' | 'INCONCLUSIVE';
  clinical_applicability: 'DIRECT_CLINICAL_PRACTICE' | 'TRANSLATIONAL_INVESTIGATIONAL' | 'PRECLINICAL_BASIC_SCIENCE';
  limitations_identified: string[];
  contradictory_evidence?: Array<{
    opposing_finding_summary: string;
    citation: Citation;
  }>;
  verification_status: VerificationStatus;
  primary_citation: Citation;
  supporting_citations: Citation[];
}
