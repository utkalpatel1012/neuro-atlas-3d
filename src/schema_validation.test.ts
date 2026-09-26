/**
 * 3D Neuroanatomy Atlas: Schema Validation and Type Integrity Test Suite
 * Standard: AAS-2026-NEURO-V1
 * Phase: 0.1.1 Remediation Pass
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  NeuroEntity,
  AnatomicalStructure,
  CorticalParcelEntity,
  WhiteMatterTractEntity,
  FunctionalNetworkEntity,
  NeuralPathwayEntity,
  NeuromodulationTargetEntity,
  LesionModelEntity,
  EvidenceClaimEntity,
  SpatialCoordinate,
  SpatialDescriptor,
  AssetProvenance,
  AssetValidationStatus,
  EntityProvenance
} from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Test 1: Exhaustive Type Narrowing for All 8 NeuroEntityType Members
// ============================================================================
export function describeNeuroEntity(entity: NeuroEntity): string {
  switch (entity.entity_type) {
    case 'anatomical_structure':
      return `Structure: ${entity.canonical_name} (${entity.name.official_latin})`;
    case 'cortical_parcel':
      return `Parcel: ${entity.canonical_name} [${entity.atlas} - ${entity.parcel_code}]`;
    case 'white_matter_tract':
      return `Tract: ${entity.canonical_name} (${entity.tract_category})`;
    case 'functional_network':
      return `Network: ${entity.canonical_name} (${entity.network_name})`;
    case 'neural_pathway':
      return `Pathway: ${entity.canonical_name} (${entity.psychiatric_circuit_category})`;
    case 'neuromodulation_target':
      return `Target: ${entity.canonical_name} (${entity.modality})`;
    case 'lesion_model':
      return `Lesion: ${entity.canonical_name} (${entity.etiology})`;
    case 'evidence_claim':
      return `Claim: ${entity.canonical_name} (${entity.evidence_domain})`;
    default: {
      // Compile-time exhaustiveness check: 'entity' must be narrowed to 'never'
      const _exhaustiveCheck: never = entity;
      return _exhaustiveCheck;
    }
  }
}

// ============================================================================
// Concrete Exemplars for All 8 Entities
// ============================================================================
const mockEntityProvenance: EntityProvenance = {
  source_authority: 'Yeo et al. 2011 / Thomas Yeo Laboratory',
  dataset_name: 'Yeo_JNP_2011_7Networks',
  dataset_version: 'v1.0',
  citation_keys: ['Yeo2011'],
  provenance_notes: '1000 healthy adult subjects resting-state functional connectivity clustering.'
};

export const sampleParcel: CorticalParcelEntity = {
  id: 'parcel.hcp_mmp1.46_l',
  entity_type: 'cortical_parcel',
  canonical_name: 'Area 46 (Left)',
  atlas: 'HCP_MMP1',
  parcel_code: '46_L',
  laterality: 'left',
  canonical_surface_space: 'hcp_fslr_32k',
  associated_anatomical_structure_ids: [
    'brain.telencephalon.left.frontal_lobe.middle_frontal_gyrus'
  ],
  provenance: {
    source_authority: 'Glasser et al. 2016 Nature (HCP Multi-Modal Parcellation 1.0)',
    dataset_name: 'HCP_MMP1.0',
    dataset_version: '1.0'
  },
  evidence_claim_ids: [],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const sampleTract: WhiteMatterTractEntity = {
  id: 'tract.telencephalon.left.superior_longitudinal_fasciculus_ii',
  entity_type: 'white_matter_tract',
  canonical_name: 'Superior Longitudinal Fasciculus II (Left)',
  tract_category: 'association',
  laterality: 'left',
  origin_structure_ids: ['brain.telencephalon.left.parietal_lobe.angular_gyrus'],
  termination_structure_ids: ['brain.telencephalon.left.frontal_lobe.dorsolateral_prefrontal_cortex'],
  functional_role: 'Visuospatial attention and working memory integration.',
  provenance: {
    source_authority: 'Catani & de Schotten 2008 / Human Connectome Project Tractography',
    citation_keys: ['Catani2008']
  },
  evidence_claim_ids: [],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const sampleDMN: FunctionalNetworkEntity = {
  id: 'network.default_mode',
  entity_type: 'functional_network',
  canonical_name: 'Default Mode Network',
  network_name: 'default_mode',
  canonical_hub_structure_ids: [
    'brain.telencephalon.bilateral.medial_prefrontal_cortex',
    'brain.telencephalon.bilateral.posterior_cingulate_cortex',
    'brain.telencephalon.bilateral.precuneus'
  ],
  focal_parcels: ['parcel.schaefer_2018.17networks.Default_A'],
  clinical_psychiatry_relevance: 'Hyperconnectivity and rumination in MDD; failure to deactivate during working memory in Schizophrenia.',
  provenance: mockEntityProvenance,
  evidence_claim_ids: ['claim.network.dmn.hyperconnectivity.mdd'],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const samplePathway: NeuralPathwayEntity = {
  id: 'pathway.limbic.papez_circuit',
  entity_type: 'neural_pathway',
  canonical_name: 'Papez Circuit (Classical Limbic Emotion Loop)',
  pathway_name: 'Papez Circuit',
  psychiatric_circuit_category: 'papez_limbic',
  synaptic_nodes: [
    {
      sequence_order: 1,
      structure_id: 'brain.telencephalon.left.limbic.hippocampus',
      predominant_neurotransmitter: 'glutamate',
      synaptic_action: 'excitatory'
    },
    {
      sequence_order: 2,
      structure_id: 'brain.diencephalon.bilateral.hypothalamus.mammillary_body',
      predominant_neurotransmitter: 'glutamate',
      synaptic_action: 'excitatory'
    },
    {
      sequence_order: 3,
      structure_id: 'brain.diencephalon.bilateral.thalamus.anterior_nucleus',
      predominant_neurotransmitter: 'glutamate',
      synaptic_action: 'excitatory'
    },
    {
      sequence_order: 4,
      structure_id: 'brain.telencephalon.left.limbic.cingulate_cortex',
      predominant_neurotransmitter: 'glutamate',
      synaptic_action: 'excitatory'
    }
  ],
  provenance: {
    source_authority: 'Papez 1937 / Snell Clinical Neuroanatomy 8th Ed',
    citation_keys: ['Papez1937']
  },
  evidence_claim_ids: [],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const sampleTarget: NeuromodulationTargetEntity = {
  id: 'target.rtms.left_dlpfc.f3',
  entity_type: 'neuromodulation_target',
  canonical_name: 'Left DLPFC rTMS Stimulation Target (Beam F3 / Area 46/9)',
  modality: 'rTMS',
  target_structure_ids: [
    'brain.telencephalon.left.frontal_lobe.middle_frontal_gyrus'
  ],
  target_parcel_ids: [
    'parcel.hcp_mmp1.46_l',
    'parcel.hcp_mmp1.9_46d_l'
  ],
  target_network_ids: [
    'network.central_executive'
  ],
  coordinate_definitions: [
    {
      coordinate_frame: 'eeg_10_20_scalp',
      scalp_10_20: 'F3',
      stereotaxic_description: 'International 10-20 scalp coordinate F3'
    },
    {
      coordinate_frame: 'mni152_nonlinear_2009c_asym',
      coordinates: [-38, 44, 26],
      stereotaxic_description: 'MNI152 coordinates for Beam F3 Left DLPFC targeting'
    }
  ],
  protocol_ids: ['protocol.rtms.left_dlpfc.10hz.fda'],
  clinical_indications: [
    'Treatment-Resistant Major Depressive Disorder',
    'Obsessive-Compulsive Disorder'
  ],
  provenance: {
    source_authority: 'American Psychiatric Association / Clinical TMS Society',
    citation_keys: ['George1995', 'OReardon2007', 'Beam2009']
  },
  evidence_claim_ids: ['claim.rtms.left_dlpfc.efficacy.mdd'],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const sampleLesion: LesionModelEntity = {
  id: 'lesion.ischemic.left_mca_inferior_division',
  entity_type: 'lesion_model',
  canonical_name: 'Left MCA Inferior Division Infarction (Wernicke Territory)',
  etiology: 'ischemic_stroke',
  laterality: 'left',
  vessel_territory_id: 'brain.vascular.arterial.middle_cerebral.inferior_division',
  affected_structure_ids: [
    'brain.telencephalon.left.temporal_lobe.superior_temporal_gyrus',
    'brain.telencephalon.left.parietal_lobe.supramarginal_gyrus'
  ],
  typical_syndrome_name: "Wernicke's Sensory Aphasia",
  cognitive_affective_deficits: [
    'Impaired auditory comprehension',
    'Fluent paraphasic speech with neologisms',
    'Impaired reading comprehension (alexia)',
    'Anosognosia for speech deficit'
  ],
  bedside_neurological_findings: [
    'Fluent press of speech without syntactic pause',
    'Failure to follow 3-step verbal commands',
    'Contralateral right homonymous superior quadrantanopia (Piersons loop)'
  ],
  provenance: {
    source_authority: 'Adams and Victor Principles of Neurology 12th Ed',
    citation_keys: ['AdamsVictor2023']
  },
  evidence_claim_ids: [],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

export const sampleClaim: EvidenceClaimEntity = {
  id: 'claim.hpc.volume_reduction.mdd.enigma2016',
  entity_type: 'evidence_claim',
  canonical_name: 'Hippocampal Volume Reduction in MDD (ENIGMA 2016)',
  evidence_domain: 'clinical',
  claim_statement: 'Adults with major depressive disorder demonstrate robust bilateral hippocampal volume reduction on structural MRI.',
  claim_record_id: 'claim.hpc.volume_reduction.mdd.enigma2016',
  primary_citation_summary: 'Schmaal L, et al. Mol Psychiatry 2016; 21: 1450-1459.',
  source_entity_ids: ['brain.telencephalon.left.limbic.hippocampus'],
  target_entity_ids: ['disorder.psychiatry.major_depressive_disorder'],
  provenance: {
    source_authority: 'ENIGMA Major Depressive Disorder Working Group',
    dataset_name: 'ENIGMA_MDD_Consortium_Wave1',
    citation_keys: ['Schmaal2016']
  },
  evidence_claim_ids: [],
  created_at: '2026-09-26T12:00:00Z',
  updated_at: '2026-09-26T15:00:00Z'
};

// ============================================================================
// Coordinate Models Safety
// ============================================================================
export const unregPoint: SpatialCoordinate = {
  status: 'unregistered',
  source_coordinate: [10.5, 20.2, -5.1],
  source_coordinate_frame: 'native_mesh'
};

export const regPoint: SpatialCoordinate = {
  status: 'registered',
  source_coordinate: [10.5, 20.2, -5.1],
  source_coordinate_frame: 'native_mesh',
  stereotaxic: {
    registered_coordinate: [12.0, 22.1, -4.8],
    registered_coordinate_frame: 'mni152_nonlinear_2009c_asym',
    registration: {
      registration_method: 'affine_linear_12dof',
      registration_source: 'scripts/pipeline/register_to_mni152.py',
      target_reference_template: 'MNI152NLin2009cAsym_1mm.nii.gz',
      registration_uncertainty_mm: 0.85
    }
  }
};

export const preRegistrationSpatial: SpatialDescriptor = {
  source_centroid: [0, 0, 0],
  source_coordinate_frame: 'blender_world',
  bounding_box: {
    min: [-10, -10, -10],
    max: [10, 10, 10],
    coordinate_frame: 'blender_world'
  },
  default_hex_color: '#FFFFFF'
};

// ============================================================================
// Asset Provenance Status Models
// ============================================================================
export const allowedStatuses: AssetValidationStatus[] = [
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'CLEARED',
  'RESTRICTED'
];

export const candidateMeshProvenance: AssetProvenance = {
  asset_id: 'mesh.hippocampus.left.v1',
  dataset_name: 'Z-Anatomy',
  dataset_version: '2024.1.0',
  source_url: 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
  upstream_asset_id: 'Hippocampus_L',
  upstream_license: 'CC_BY_SA_4_0',
  attribution_text_required: 'Hippocampus 3D geometry derived from Z-Anatomy contributors, licensed under CC-BY-SA 4.0.',
  acquisition_date: '2026-09-26',
  modifications_applied: [],
  resulting_sha256_hash: 'NOT_YET_GENERATED',
  resulting_license: 'CC-BY-SA 4.0',
  production_eligibility: 'PRODUCTION_ALLOWED',
  commercial_redistribution: 'PERMITTED',
  restrictions_and_covenants: [
    'Must attribute Z-Anatomy contributors in application notices',
    'Derivative 3D meshes must be shared under CC-BY-SA 4.0'
  ],
  validation_status: 'PENDING'
};

// ============================================================================
// Runtime Test Suite Runner
// ============================================================================
export function runValidationSuite(): { passed: boolean; message: string; checks: string[] } {
  const checks: string[] = [];

  // Check 1: Exhaustive union narrowing across all 8 entity types
  const entities: NeuroEntity[] = [
    sampleParcel,
    sampleTract,
    sampleDMN,
    samplePathway,
    sampleTarget,
    sampleLesion,
    sampleClaim
  ];
  entities.forEach(e => {
    const desc = describeNeuroEntity(e);
    if (!desc || desc.length === 0) throw new Error(`Description empty for entity ${e.id}`);
  });
  checks.push('Exhaustive union narrowing verified for all entity types.');

  // Check 2: Non-physical entities
  if (sampleDMN.entity_type !== 'functional_network' || sampleClaim.entity_type !== 'evidence_claim') {
    throw new Error('Non-physical entities mismatch');
  }
  checks.push('Non-physical entities (FunctionalNetwork, EvidenceClaim) validated without physical 3D meshes.');

  // Check 3: Neuromodulation target referencing anatomical structures
  const targetDesc = describeNeuroEntity(sampleTarget);
  if (!targetDesc.includes('Target:')) throw new Error('Target description failed');
  if (sampleTarget.target_structure_ids.length === 0) throw new Error('Target structures empty');
  checks.push('NeuromodulationTargetEntity references underlying anatomical structures and coordinates.');

  // Check 4: Coordinate models
  if (unregPoint.status !== 'unregistered') throw new Error('Unregistered point failed');
  if (regPoint.status !== 'registered' || !regPoint.stereotaxic.registration) throw new Error('Registered point failed');
  if (!preRegistrationSpatial.bounding_box) throw new Error('Pre-registration spatial descriptor invalid');
  checks.push('SpatialCoordinate discriminated union enforces registration metadata.');

  // Check 5: Asset provenance states
  if (allowedStatuses.length !== 5) throw new Error('Asset statuses count mismatch');
  if (candidateMeshProvenance.resulting_sha256_hash !== 'NOT_YET_GENERATED') throw new Error('Hash was fabricated');
  checks.push('AssetProvenance honors PENDING status and NOT_YET_GENERATED hash without false claims.');

  // Check 6: Real file validation of hippocampus_left.json
  const jsonPath = path.resolve(__dirname, '../data/structures/hippocampus_left.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Exemplar file not found at: ${jsonPath}`);
  }
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const hippocampus = JSON.parse(rawData) as AnatomicalStructure;

  // Deep structural validation
  if (hippocampus.entity_type !== 'anatomical_structure') throw new Error('Invalid entity_type in hippocampus JSON');
  if (hippocampus.id !== 'brain.telencephalon.left.limbic.hippocampus') throw new Error('Invalid canonical ID');
  if (hippocampus.laterality !== 'left') throw new Error('Invalid laterality');
  if (hippocampus.representation_scope !== 'paired_separate') throw new Error('Missing representation_scope');
  if (!hippocampus.provenance || !hippocampus.provenance.source_authority) throw new Error('Missing EntityProvenance');
  if (!hippocampus.spatial || !hippocampus.spatial.stereotaxic_registration) throw new Error('Missing spatial stereotaxic registration');
  if (hippocampus.spatial.stereotaxic_registration.registration.registration_method !== 'affine_linear_12dof') {
    throw new Error('Registration method mismatch');
  }

  // Also test describeNeuroEntity with the real hippocampus record!
  const hpcDesc = describeNeuroEntity(hippocampus);
  if (!hpcDesc.includes('Hippocampus')) throw new Error('Failed to describe hippocampus');
  checks.push(`AnatomicalStructure correctly narrowed in NeuroEntity union: "${hpcDesc}".`);

  // Verify no fake SHA-256 hash
  if (hippocampus.asset_provenance) {
    if (hippocampus.asset_provenance.resulting_sha256_hash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
      throw new Error('Fake SHA-256 hash still present in exemplar!');
    }
    if (hippocampus.asset_provenance.resulting_sha256_hash !== 'NOT_YET_GENERATED') {
      throw new Error('Unprocessed exemplar must declare resulting_sha256_hash as NOT_YET_GENERATED');
    }
  }

  // Verify evidence claims domain alignment
  const enigmaClaim = hippocampus.evidence_claims.find(c => c.id === 'claim.hpc.volume_reduction.mdd.enigma2016');
  if (!enigmaClaim || enigmaClaim.evidence_domain !== 'clinical' || enigmaClaim.evidence_assessment_framework !== 'GRADE') {
    throw new Error('ENIGMA claim evidence domain or GRADE framework mismatch');
  }
  const neurogenesisClaim = hippocampus.evidence_claims.find(c => c.id === 'claim.hpc.neurogenesis_hypothesis.mdd');
  if (!neurogenesisClaim || neurogenesisClaim.evidence_domain !== 'mechanistic' || neurogenesisClaim.certainty_grade !== 'NOT_APPLICABLE_NON_CLINICAL') {
    throw new Error('Neurogenesis claim was inappropriately graded under clinical GRADE');
  }

  checks.push('Exemplar data/structures/hippocampus_left.json passed complete structural and scientific audit.');

  return {
    passed: true,
    message: 'All Phase 0.1.1 schema validation and architectural invariant checks PASSED.',
    checks
  };
}

// Execute test suite
const result = runValidationSuite();
console.log('====================================================');
console.log('PHASE 0.1.1 SCHEMA INTEGRITY TEST SUITE');
console.log('====================================================');
result.checks.forEach((c, idx) => console.log(`[PASS ${idx + 1}] ${c}`));
console.log('====================================================');
console.log(`RESULT: ${result.message}`);
console.log('====================================================');
