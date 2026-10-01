/**
 * 3D Neuroanatomy Atlas: Psychiatry + Neurobiology Knowledge Layer Types (Phase 8)
 * Standard: AAS-2026-NEURO-V1
 *
 * Restraint model (docs/PHASE_8_ANATOMICAL_SCOPE.md): this project holds no
 * clinical corpus, no receptor-mapping dataset, no trial data, and no expert
 * review. Phase 8 therefore records ONLY gross-anatomical co-location of
 * atlas structures within classically described territories of named systems
 * under study — with LOW certainty, correlation only, and explicit gaps.
 *
 * Hard stops enforced at the type level: causation-leap (every relationship
 * carries a causation disclaimer), diagnostic-automation (clinical-intent
 * queries resolve to guard + refusal, never to a relationship),
 * uncited-psychiatric-claim (source + citation required), receptor-invention
 * (no receptor/drug-mechanism fields exist anywhere in this schema).
 */

/** Evidence levels for Phase 8 relationships. INSUFFICIENT_EVIDENCE and
 * NOT_REPRESENTED are first-class outcomes, not afterthoughts. */
export type PsychEvidenceLevel =
  | 'ESTABLISHED'
  | 'MODERATE'
  | 'PRELIMINARY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NOT_REPRESENTED';

/** Certainty of a Phase 8 relationship. All shipped records are LOW (no
 * clinical corpus, no receptor data, no trial data, no expert review). */
export type PsychCertainty = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

/**
 * A single structure→system relationship. The ONLY supportable claim shape:
 * "structure X is anatomically positioned within system Y's classically
 * described anatomy — membership based on textbook-standard system
 * definitions, certainty LOW, correlation only."
 *
 * There are deliberately NO fields for receptors, drug mechanisms, disorder
 * causation, diagnostic-manual criteria, diagnosis, or treatment. Questions in those
 * directions resolve to refusals (see PsychRefusal / refusal_templates.json).
 */
export interface PsychRelationship {
  /** Stable id, e.g. 'p8.cstc.middle_frontal_gyrus_left'. */
  relationship_id: string;
  /** Canonical atlas structure id, e.g. 'brain.telencephalon.left.frontal_lobe.middle_frontal_gyrus'. */
  structure_id: string;
  /** Repo-relative structure record backing the anatomical half of the claim. */
  structure_record: string;
  /** Owning named system, e.g. 'cstc'. */
  system_id: string;
  /** Named system / network / circuit as a study topic (never a mechanism). */
  function_or_network: string;
  /** The single supportable claim: anatomical co-location, correlation only. */
  claim_text: string;
  /** Human-readable source statement (atlas record + restraint model). */
  source: string;
  /** Checkable citation: repo-relative paths that exist on disk. */
  citation: string;
  evidence_level: PsychEvidenceLevel;
  certainty: PsychCertainty;
  /** Why certainty is what it is (always states the missing evidence). */
  certainty_reason: string;
  /** Explicit correlation-is-not-causation statement, present on EVERY record. */
  causation_disclaimer: string;
}

/** Refusal outcome for anything beyond the supportable layer. */
export type RefusalStatus = 'INSUFFICIENT_EVIDENCE' | 'NOT_REPRESENTED';

export interface PsychRefusal {
  status: RefusalStatus;
  /** Machine-stable refusal topic, e.g. 'receptor_localization'. */
  topic: string;
  /** Human-readable reason: what is missing and why no answer is synthesized. */
  reason: string;
  /** Stable template id from data/psychiatry/refusal_templates.json (if any). */
  refusal_id: string | null;
}

/** Result of a structure→system lookup: the relationship OR an explicit refusal. Never a synthesized answer. */
export type RelationshipQueryResult =
  | { kind: 'relationship'; relationship: PsychRelationship }
  | { kind: 'refusal'; refusal: PsychRefusal };

/** A named system under study (circuit or network). Recorded as a study
 * topic with atlas-supported members + explicit gaps — never as an
 * established functional, mechanistic, or disorder entity. */
export interface PsychSystemMember {
  structure_id: string;
  relationship_id: string;
  membership_basis: string;
}

/** A classically described member that is NOT in our structure records. */
export interface PsychSystemGap {
  classical_member: string;
  reason: string;
  status: RefusalStatus;
}

export interface PsychFrameworkCitation {
  label: string;
  url: string;
  /** Always identity-only: no matrix/domain/construct content is asserted. */
  scope_note: string;
}

export interface PsychSystem {
  system_id: string;
  display_name: string;
  kind: 'named_circuit_under_study' | 'named_network_under_study' | 'named_system_under_study';
  description: string;
  framework_citations: PsychFrameworkCitation[];
  members: PsychSystemMember[];
  member_gaps: PsychSystemGap[];
  overall_certainty: PsychCertainty;
  overall_certainty_reasons: string[];
}

/** A refusal template for a natural-but-unsupportable question class. */
export interface RefusalTemplate {
  refusal_id: string;
  topic: string;
  status: RefusalStatus;
  reason: string;
  template: string;
}

/** JSON document shapes (data/psychiatry/*.json). */
export interface RelationshipsDoc {
  registry_version: string;
  relationships: PsychRelationship[];
}

export interface SystemsRegistryDoc {
  registry_version: string;
  framework_identity_note: string;
  systems: PsychSystem[];
}

export interface RefusalTemplatesDoc {
  registry_version: string;
  templates: RefusalTemplate[];
}

/**
 * Educational-use guard. Rendered on EVERY Phase 8 surface (overlays,
 * relationship views, refusals). Exact wording is contractual — the Phase 8
 * test asserts it verbatim.
 */
export const EDUCATIONAL_USE_GUARD =
  'Academic teaching resource. Not for diagnosis, treatment decisions, or clinical use.';

/**
 * Canonical causation disclaimer. Every relationship carries this text
 * verbatim in `causation_disclaimer` (the Phase 8 test asserts equality).
 */
export const CAUSATION_DISCLAIMER =
  'Correlation is not causation: this record states anatomical co-location of an atlas-recorded structure ' +
  'within the classically described territory of a named system under study. It does not assert functional ' +
  'membership, a causal mechanism, or any disorder association.';
