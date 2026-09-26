/**
 * 3D Neuroanatomy Atlas: Neuroimaging Features & Radiological Context Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * MRI signal intensities (hypo/iso/hyperintense) are NEVER universal constants.
 * They depend strictly on pulse sequence physics (T1 spin echo vs 3D MPRAGE vs T2 vs FLAIR),
 * magnetic field strength (1.5T vs 3T vs 7T), and explicit reference tissue comparators.
 * Distinguishes normal anatomical morphology from psychiatric/neurological pathology.
 */

export type ImagingModality =
  | 'mri_structural'
  | 'mri_diffusion_dti'
  | 'mri_functional_bold'
  | 'mri_perfusion_asl'
  | 'pet_molecular_radiotracer'
  | 'spect'
  | 'ct_radiography';

export type MRISequencePhysics =
  | 't1_weighted_spin_echo'
  | 't1_weighted_3d_gradient_echo_mprage'
  | 't2_weighted_fast_spin_echo'
  | 't2_flair_fluid_attenuated_inversion_recovery'
  | 'diffusion_weighted_dwi'
  | 'apparent_diffusion_coefficient_adc_map'
  | 'susceptibility_weighted_swi_t2_star'
  | 'proton_density_pd';

export type MagneticFieldStrength =
  | '1.5_tesla_clinical'
  | '3.0_tesla_high_field'
  | '7.0_tesla_ultra_high_field'
  | 'field_independent';

export type RelativeSignalIntensity =
  | 'strongly_hypointense'
  | 'mildly_hypointense'
  | 'isointense'
  | 'mildly_hyperintense'
  | 'strongly_hyperintense'
  | 'signal_void'
  | 'variable_heterogeneous';

export interface PathologicalImagingSign {
  pathological_condition: string; // e.g., 'Mesial Temporal Sclerosis (MTS)', 'Small Vessel Subcortical Ischemia'
  sequence_finding: string;       // e.g., 'Hippocampal volume loss with ipsilateral FLAIR hyperintensity'
  differential_diagnosis: string[];
  radiological_significance: string;
}

export interface ImagingFeature {
  feature_id: string;
  structure_id: string;
  modality: ImagingModality;
  sequence: MRISequencePhysics;
  field_strength: MagneticFieldStrength;
  contrast_enhanced: boolean;
  relative_signal_intensity: RelativeSignalIntensity;
  reference_comparator_tissue: string; // e.g., 'Relative to neocortical gray matter', 'Relative to centrum semiovale white matter'
  normal_morphological_appearance: string;
  key_radiological_landmarks: string; // e.g., 'Identified on coronal oblique T2 views perpendicular to hippocampal long axis'
  pathological_imaging_manifestations: PathologicalImagingSign[];
  technical_artifacts_or_pitfalls: string[]; // e.g., 'Susceptibility artifact near temporal bone petrous apex', 'Pulsatile CSF flow void'
  evidence_claim_ids: string[];
}
