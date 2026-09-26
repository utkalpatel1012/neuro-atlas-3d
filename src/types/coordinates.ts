/**
 * 3D Neuroanatomy Atlas: Coordinate System & Spatial Transformation Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * Meshes and anatomical landmarks are NOT assumed to be in universal MNI space.
 * Every spatial point or bounding volume must explicitly specify its coordinate frame,
 * registration method, transformation provenance, and uncertainty metric.
 */

export type CoordinateFrame =
  | 'native_mesh'                      // Local untransformed vertex positions from source 3D asset
  | 'blender_world'                     // Scene world space in Blender 4.x (standardized +Y Up, +Z Forward)
  | 'mni152_nonlinear_2009c_asym'       // ICBM 152 Nonlinear Asymmetric 2009c (Standard neuroimaging space)
  | 'mni152_linear_6th_gen'             // Legacy linear MNI template
  | 'talairach_tournoux'                // Classical stereotaxic atlas space
  | 'hcp_fslr_32k'                      // Human Connectome Project fs_LR surface mesh (32,492 vertices/hemisphere)
  | 'freesurfer_fsaverage'              // FreeSurfer standard spherical average surface
  | 'ac_pc_surgical'                    // Anterior Commissure - Posterior Commissure aligned stereotaxic space (DBS)
  | 'eeg_10_20_scalp'                   // International 10-20 electroencephalographic scalp coordinate system (TMS)
  | 'patient_dicom_lps';                // Native scanner physical space (Left-Posterior-Superior)

export type RegistrationMethod =
  | 'unregistered_raw'                  // Native unaligned source mesh
  | 'manual_anatomical_landmarks'       // Co-registered via manual landmark matching (e.g., AC, PC, midsagittal points)
  | 'rigid_body_6dof'                   // Translation and rotation only
  | 'affine_linear_12dof'               // 12-parameter linear affine transformation (FLIRT / NiftyReg)
  | 'nonlinear_diffeomorphic_syn'       // Symmetric Normalization (ANTs SyN / FNIRT)
  | 'surface_spherical_registration'    // Cortical sulcal curvature driven spherical alignment (FreeSurfer / MSM)
  | 'algorithmic_centroid_fit';         // Automated bounding box centroid approximation

export interface RegistrationMetadata {
  registration_method: RegistrationMethod;
  registration_source: string;          // Script, pipeline version, or literature citation (DOI/PMID)
  target_reference_template: string;    // e.g., 'MNI152NLin2009cAsym_1mm.nii.gz'
  transformation_matrix_4x4?: number[]; // Column-major 16-element affine matrix if linear
  warp_field_asset_id?: string;         // Asset ID of 3D displacement vector field if non-linear
  registration_uncertainty_mm?: number; // Estimated mean target registration error (TRE) in mm
  dice_similarity_coefficient?: number; // Overlap index (0.0 to 1.0) against reference mask if validated
  validation_date?: string;
  validator_notes?: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SpatialBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  coordinate_frame: CoordinateFrame;
}

/**
 * Explicit Spatial Coordinate record distinguishing raw source coordinates
 * from verified stereotaxic registered coordinates.
 */
export interface RegisteredCoordinate {
  source_coordinate: [number, number, number];
  source_coordinate_frame: CoordinateFrame;
  registered_coordinate?: [number, number, number];
  registered_coordinate_frame?: CoordinateFrame;
  registration?: RegistrationMetadata;
}

/**
 * Complete spatial configuration of an anatomical structure mesh.
 */
export interface SpatialDescriptor {
  mesh_node_name: string;               // Exact Node ID in .glb scene graph
  source_centroid: [number, number, number];
  source_coordinate_frame: CoordinateFrame;
  registered_centroid?: [number, number, number];
  registered_coordinate_frame?: CoordinateFrame;
  registration?: RegistrationMetadata;
  bounding_box: SpatialBoundingBox;
  estimated_volume_cm3?: number;
  default_hex_color: string;
}
