/**
 * 3D Neuroanatomy Atlas: Neuromodulation Interventions & Clinical Bioengineering Schema
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. Neuromodulation is NOT a simple 1:1 anatomical target property.
 * 2. ECT is a distributed multi-circuit intervention whose effects CANNOT be reduced to the hippocampus.
 * 3. Distinguishes: Physical Application Site != Electrode/Coil Montage != Local Induced Field (VTA/E-field) != Downstream Network Engagement.
 */

import { CoordinateFrame } from './coordinates';

export type NeuromodulationModality =
  | 'rTMS'              // Repetitive Transcranial Magnetic Stimulation (e.g., 10 Hz, 1 Hz)
  | 'iTBS'              // Intermittent Theta Burst Stimulation (FDA-cleared 3-minute depression protocol)
  | 'cTBS'              // Continuous Theta Burst Stimulation (inhibitory)
  | 'dTMS'              // Deep Transcranial Magnetic Stimulation (Hesed H-coils)
  | 'DBS'               // Deep Brain Stimulation (implanted intracranial quadripolar/directional leads)
  | 'ECT'               // Electroconvulsive Therapy
  | 'taVNS'             // Transcutaneous Auricular Vagus Nerve Stimulation
  | 'invasive_VNS'      // Cervical vagus nerve pulse generator
  | 'tDCS'              // Transcranial Direct Current Stimulation (anodal/cathodal)
  | 'tACS'              // Transcranial Alternating Current Stimulation
  | 'tFUS';             // Transcranial Focused Ultrasound (low-intensity neuromodulation)

export type RegulatoryApprovalStatus =
  | 'FDA_CLEARED_FIRST_LINE'        // FDA cleared indication (e.g., rTMS for MDD, OCD)
  | 'FDA_CLEARED_HUMANITARIAN'      // Humanitarian Device Exemption (e.g., DBS for severe refractory OCD)
  | 'CE_MARKED_EUROPE'
  | 'INVESTIGATIONAL_CLINICAL_TRIAL'// Active IDE / Phase II-III trial (e.g., DBS for TRD in Area 25)
  | 'OFF_LABEL_CLINICAL_PRACTICE';

export interface PhysicalApplicationSite {
  site_designation: string; // e.g., 'Left DLPFC (Beam F3 / 5.5cm rule)', 'Subcallosal Cingulate Area 25 (Bilateral)'
  scalp_10_20_coordinate?: string; // e.g., 'F3', 'F4', 'FCz'
  stereotaxic_lead_coordinate?: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
    coordinate_frame: CoordinateFrame; // e.g., 'ac_pc_surgical' or 'mni152_nonlinear_2009c_asym'
  };
  coil_or_electrode_orientation?: string; // e.g., 'Figure-of-8 coil held 45 degrees to mid-sagittal line'
  electrode_montage_type?:
    | 'right_unilateral_delia'       // RUL ECT (preserves verbal memory)
    | 'bitemporal_bifrontotemporal'  // Standard bilateral ECT (fastest clinical remission, higher memory burden)
    | 'bifrontal'                    // Bifrontal ECT (favorable cognitive profile)
    | 'subthalamic_quadripolar'      // DBS lead in STN
    | 'ventral_capsule_ventral_striatum'; // VC/VS lead for OCD
}

export interface DownstreamNetworkEngagement {
  network_or_structure_id: string; // e.g., 'brain.diencephalon.bilateral.epithalamus.habenula', 'network.default_mode'
  modulation_nature:
    | 'transsynaptic_inhibition'
    | 'transsynaptic_excitation'
    | 'functional_network_desynchronization'
    | 'neuroplastic_bdnf_induction'
    | 'pathological_hyperconnectivity_disruption';
  clinical_mechanism_description: string;
}

export interface NeuromodulationProtocol {
  protocol_id: string; // e.g., 'protocol.rtms.left_dlpfc.10hz.fda'
  modality: NeuromodulationModality;
  protocol_name: string; // e.g., 'High-Frequency 10 Hz Left DLPFC rTMS'
  physical_application: PhysicalApplicationSite;
  stimulation_parameters: {
    frequency_hz?: number;
    intensity_description: string; // e.g., '120% of resting motor threshold (RMT)'
    pulse_train_duration_sec?: number;
    intertrain_interval_sec?: number;
    total_pulses_per_session?: number;
    session_duration_minutes: number;
    standard_course_sessions: number; // e.g., 30-36 daily sessions
  };
  local_induced_field_description: string; // Describes the electric field (E-field) or Volume of Tissue Activated (VTA)
  downstream_network_effects: DownstreamNetworkEngagement[];
  primary_clinical_indication: string; // e.g., 'Treatment-Resistant Major Depressive Disorder without psychosis'
  regulatory_status: RegulatoryApprovalStatus;
  jurisdiction: 'United States (FDA)' | 'European Union (CE)' | 'International / Investigational';
  adverse_effect_profile: string[];
  contraindications: string[]; // e.g., 'Ferromagnetic intracranial implants', 'History of non-iatrogenic seizure disorder'
  evidence_claim_ids: string[];
}
