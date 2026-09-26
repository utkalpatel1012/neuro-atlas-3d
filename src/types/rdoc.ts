/**
 * 3D Neuroanatomy Atlas: NIMH Research Domain Criteria (RDoC) Schema
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * RDoC is a versioned, evolving hierarchical framework, NOT a static 5-domain enum.
 * Supports the 6th domain ('Sensorimotor Systems', added 2019) and future matrix revisions
 * without requiring TypeScript architectural rewrites.
 */

export type RDoCUnitOfAnalysis =
  | 'genes'
  | 'molecules'
  | 'cells'
  | 'circuits'
  | 'physiology'
  | 'behavior'
  | 'self_reports'
  | 'paradigms';

export interface RDoCConstructDefinition {
  construct_id: string; // e.g., 'acute_threat_fear', 'working_memory'
  construct_name: string;
  description: string;
  subconstructs?: Array<{
    subconstruct_id: string;
    subconstruct_name: string;
    description: string;
  }>;
}

export interface RDoCDomainDefinition {
  domain_id: string; // e.g., 'negative_valence', 'positive_valence', 'cognitive_systems', 'social_processes', 'arousal_regulatory', 'sensorimotor'
  domain_name: string;
  description: string;
  constructs: RDoCConstructDefinition[];
}

export interface RDoCFrameworkVersion {
  version_tag: string; // e.g., 'NIMH_RDoC_Matrix_2019_v2'
  release_date: string;
  source_authority: 'National Institute of Mental Health (NIMH)';
  domains: RDoCDomainDefinition[];
}

/**
 * Concrete link between an anatomical structure / neural pathway
 * and an RDoC construct unit of analysis.
 */
export interface RDoCAssociation {
  framework_version: string;
  domain_id: string;
  domain_name: string;
  construct_id: string;
  construct_name: string;
  subconstruct_id?: string;
  subconstruct_name?: string;
  unit_of_analysis: RDoCUnitOfAnalysis;
  finding_summary: string;
  evidence_claim_ids: string[];
}
