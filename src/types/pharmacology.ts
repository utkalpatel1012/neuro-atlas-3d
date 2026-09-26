/**
 * 3D Neuroanatomy Atlas: Psychopharmacology & Molecular Neurobiology Schema
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * Drug information is structured into precise molecular and circuit targets,
 * not unstructured prose strings. Explicitly captures receptor subtypes,
 * synaptic topologies (pre/postsynaptic), G-protein cascades, and clinical indications.
 */

export type NeurotransmitterFamily =
  | 'serotonin'
  | 'dopamine'
  | 'norepinephrine'
  | 'glutamate'
  | 'gaba'
  | 'acetylcholine'
  | 'histamine'
  | 'opioid'
  | 'cannabinoid'
  | 'orexin_hypocretin';

export type MolecularTargetClass =
  | 'g_protein_coupled_receptor'
  | 'ligand_gated_ion_channel'
  | 'monoamine_transporter'
  | 'vesicular_transporter'
  | 'metabolic_enzyme'
  | 'voltage_gated_ion_channel';

export type SynapticLocus =
  | 'presynaptic_somatodendritic_autoreceptor' // e.g., 5-HT1A in dorsal raphe
  | 'presynaptic_terminal_autoreceptor'       // e.g., 5-HT1B/D on axon terminals
  | 'presynaptic_heteroreceptor'              // e.g., alpha-2 on serotonergic terminals
  | 'postsynaptic_junctional'                 // e.g., D2 on striatal medium spiny neurons
  | 'postsynaptic_perisynaptic'               // e.g., mGluR5
  | 'extrasynaptic'                           // e.g., alpha-5 GABA-A, extrasynaptic GluN2B
  | 'intracellular_vesicular';                // e.g., VMAT2

export type PharmacologicalAction =
  | 'full_agonist'
  | 'partial_agonist'
  | 'competitive_antagonist'
  | 'non_competitive_antagonist'
  | 'inverse_agonist'
  | 'positive_allosteric_modulator_pam'
  | 'negative_allosteric_modulator_nam'
  | 'pore_channel_blocker'
  | 'reuptake_inhibitor'
  | 'enzyme_irreversible_inhibitor'
  | 'enzyme_reversible_inhibitor';

export type GProteinCoupling =
  | 'Gi_o'      // Inhibits adenylyl cyclase, opens GIRK channels (e.g., 5-HT1A, D2)
  | 'Gs'        // Stimulates adenylyl cyclase, increases cAMP (e.g., D1, 5-HT4/6/7)
  | 'Gq_11'     // Activates phospholipase C (PLC), increases IP3/DAG and intracellular Ca2+ (e.g., 5-HT2A, alpha-1)
  | 'G12_13'    // Rho family GTPase activation
  | 'ionotropic_channel' // Direct ion flux (e.g., NMDA, AMPA, GABA-A, 5-HT3)
  | 'non_gpcr';

export interface ReceptorTargetSpecification {
  target_id: string; // e.g., 'receptor.5ht.1a', 'receptor.dopamine.d2', 'transporter.sert'
  gene_symbol: string; // e.g., 'HTR1A', 'DRD2', 'SLC6A4'
  official_name: string;
  molecular_class: MolecularTargetClass;
  neurotransmitter_family: NeurotransmitterFamily;
  synaptic_locus: SynapticLocus;
  g_protein_or_channel_coupling: GProteinCoupling;
  downstream_signaling_cascade: string; // e.g., 'cAMP reduction -> PKA inhibition -> CREB phosphorylation modulation'
  predominant_cellular_expression: string; // e.g., 'Layer V pyramidal apical dendrites and parvalbumin-positive interneurons'
}

export interface DrugReceptorInteraction {
  generic_drug_name: string;
  drug_class: string; // e.g., 'SSRI', 'Atypical Antipsychotic (SDA)', 'NMDA Antagonist'
  target_id: string;
  action_type: PharmacologicalAction;
  binding_affinity_ki_nm?: number; // In vitro binding affinity Ki in nanomolar
  clinical_occupancy_percentage?: string; // e.g., '>65-70% D2 occupancy required for antipsychotic efficacy'
  functional_consequence: string;
}

export interface PsychopharmacologyMapping {
  mapping_id: string;
  structure_id: string; // Canonical anatomical structure ID
  receptor_target: ReceptorTargetSpecification;
  density_in_structure: 'very_high' | 'high' | 'moderate' | 'low' | 'negligible';
  lamina_distribution?: string; // e.g., 'Predominantly Layers I-II and Va'
  clinical_drug_interactions: DrugReceptorInteraction[];
  therapeutic_relevance: string;
  side_effect_vulnerability: string;
  evidence_claim_ids: string[];
}
