/**
 * 3D Neuroanatomy Atlas: Coordinate System & Spatial Transformation Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. Meshes and anatomical landmarks are NOT assumed to be in universal MNI space.
 * 2. Every registered coordinate requires an explicit coordinate frame AND registration metadata.
 *    No registered point may exist without provenance and uncertainty metrics.
 * 3. Surface coordinate frames (e.g., fs_LR 32k) are topologically and mathematically distinct
 *    from 3D volumetric Cartesian frames (e.g., MNI152).
 * 4. Surgical AC-PC stereotaxic space is distinct from population-averaged MNI template spaces.
 */

export type VolumetricCoordinateFrame =
  | 'native_mesh'                      // Local untransformed vertex positions from source 3D asset
  // Phase 3.1 (D3, measured): 'canonical_atlas_ras' is a RETAINED IDENTIFIER for the
  // internal engine space +X Right, +Y Superior, +Z POSTERIOR (right-handed). It is NOT
  // RAS-ordered (+X R, +Y A, +Z S) and NOT MNI152. The ID is kept to avoid invalidating
  // manifests/records/tests; the ID itself makes no anatomical claim.
  | 'canonical_atlas_ras'              // Internal canonical space: +X Right, +Y Superior, +Z Posterior, 1mm (NOT RAS, NOT MNI)
  | 'blender_world'                    // Scene world space in Blender 4.x (+Y Up, +Z Forward)
  | 'mni152_nonlinear_2009c_asym'      // ICBM 152 Nonlinear Asymmetric 2009c (Standard neuroimaging space)
  | 'mni152_linear_6th_gen'            // Legacy linear MNI template
  | 'talairach_tournoux'               // Classical stereotaxic atlas space
  | 'ac_pc_surgical'                   // Anterior Commissure - Posterior Commissure aligned stereotaxic space (DBS)
  | 'patient_dicom_lps';               // Native scanner physical space (Left-Posterior-Superior)

export type SurfaceCoordinateFrame =
  | 'hcp_fslr_32k'                      // Human Connectome Project fs_LR surface mesh (32,492 vertices/hemisphere)
  | 'freesurfer_fsaverage'              // FreeSurfer standard spherical average surface
  | 'freesurfer_fsaverage6'             // FreeSurfer fsaverage6 intermediate surface resolution
  | 'eeg_10_20_scalp';                  // Scalp surface coordinate system (TMS/EEG)

export type CoordinateFrame = VolumetricCoordinateFrame | SurfaceCoordinateFrame;

export type RegistrationMethod =
  | 'not_registered'                  // Phase 3.1: NO stereotaxic template registration performed. Use with
                                      // REGISTRATION_PENDING status and NO uncertainty/dice metrics. Never pair
                                      // with a target_reference_template.
  | 'unregistered_raw'                // Native unaligned source mesh
  | 'manual_anatomical_landmarks'       // Co-registered via manual landmark matching (e.g., AC, PC, midsagittal points)
  | 'rigid_body_6dof'                   // Translation and rotation only
  | 'affine_linear_12dof'               // 12-parameter linear affine transformation (FLIRT / NiftyReg)
  | 'nonlinear_diffeomorphic_syn'       // Symmetric Normalization (ANTs SyN / FNIRT)
  | 'surface_spherical_registration'    // Cortical sulcal curvature driven spherical alignment (FreeSurfer / MSM)
  | 'algorithmic_centroid_fit';         // Automated bounding box centroid approximation

export interface RegistrationMetadata {
  registration_method: RegistrationMethod;
  registration_source: string;          // Script, pipeline version, or literature citation (DOI/PMID)
  // Phase 3.1: optional because unregistered assets (method 'not_registered') MUST
  // NOT name a template. A present template with unmeasured metrics is fabrication.
  target_reference_template?: string;   // e.g., 'MNI152NLin2009cAsym_1mm.nii.gz' (only if really registered)
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
 * Coupled Stereotaxic Registration Record:
 * Guarantees that a registered point cannot exist without its target frame
 * and registration metadata.
 */
export interface StereotaxicRegistrationRecord {
  registered_coordinate: [number, number, number];
  registered_coordinate_frame: CoordinateFrame;
  registration: RegistrationMetadata;
}

/**
 * Discriminated spatial coordinate record ensuring compile-time safety
 * between raw unregistered points and verified stereotaxic registrations.
 */
export type SpatialCoordinate =
  | {
      status: 'unregistered';
      source_coordinate: [number, number, number];
      source_coordinate_frame: CoordinateFrame;
    }
  | {
      status: 'registered';
      source_coordinate: [number, number, number];
      source_coordinate_frame: CoordinateFrame;
      stereotaxic: StereotaxicRegistrationRecord;
    };

/**
 * Complete spatial configuration of an anatomical structure mesh.
 * Couples registered centroid with registration metadata for semantic safety.
 */
export interface SpatialDescriptor {
  mesh_node_name?: string;               // Exact Node ID in .glb scene graph (optional for pre-mesh records)
  source_centroid: [number, number, number];
  source_coordinate_frame: CoordinateFrame;
  stereotaxic_registration?: {
    registered_centroid: [number, number, number];
    registered_coordinate_frame: CoordinateFrame;
    registration: RegistrationMetadata;
  };
  bounding_box: SpatialBoundingBox;
  estimated_volume_cm3?: number;
  default_hex_color: string;
}
