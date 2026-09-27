/**
 * 3D Neuroanatomy Atlas: Asset-Level and Entity-Level Provenance & Licensing Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandates:
 * 1. ENTITY PROVENANCE != ASSET PROVENANCE:
 *    - An entity (functional network, pathway, evidence claim, or planned structure) has
 *      epistemic/source provenance (scientific literature, ontologies, authorities).
 *    - A physical asset (.glb, .ktx2, point cloud) has asset provenance (cryptographic hash,
 *      decimation pipeline, upstream 3D repository, licensing restrictions).
 * 2. Licensing is tracked at the granular ASSET level, not broad dataset level.
 * 3. Research-only datasets (e.g., CC-BY-NC-SA) are strictly quarantined.
 * 4. Fake hashes and fake production clearance states are strictly prohibited.
 */

export type ProductionEligibility =
  | 'PRODUCTION_ALLOWED'       // Permitted for bundling in production web deliverables
  | 'RESEARCH_ONLY'             // Strictly quarantined for validation/research; barred from production bundles
  | 'LEGAL_REVIEW_REQUIRED';    // Licensing ambiguous or undergoing formal legal compliance review

export type CommercialPermission =
  | 'PERMITTED'                 // Unencumbered commercial redistribution permitted (subject to attribution/SA)
  | 'PROHIBITED'                // Explicitly prohibited by NC clauses or terms of use
  | 'LEGAL_REVIEW_REQUIRED';    // Complex terms requiring counsel evaluation

export type UpstreamLicenseType =
  | 'CC_BY_SA_4_0'              // Creative Commons Attribution-ShareAlike 4.0 International (Z-Anatomy)
  | 'CC_BY_SA_2_1_JP'           // Creative Commons Attribution-ShareAlike 2.1 Japan (BodyParts3D)
  | 'CC_BY_4_0'                 // Creative Commons Attribution 4.0 International
  | 'CC0_1_0'                   // Public Domain Dedication (OpenNeuro raw data)
  | 'BSD_3_CLAUSE'              // FreeSurfer open source license
  | 'MIT'                       // MIT License
  | 'APACHE_2_0'                // Apache 2.0 License
  | 'HCP_OPEN_ACCESS_DATA_USE'  // WU-Minn Human Connectome Project Open Access Data Use Terms
  | 'CC_BY_NC_SA_4_0'           // Creative Commons Attribution-NonCommercial-ShareAlike (EBRAINS / Julich-Brain / BigBrain)
  | 'ALLEN_INSTITUTE_TERMS'     // Allen Institute Terms of Use (Academic / Non-commercial research)
  | 'PROPRIETARY_RESTRICTIVE';  // Custom institutional restrictions

export type AssetValidationStatus =
  | 'UNVERIFIED'   // Asset has been registered but not yet cryptographically verified or processed
  | 'PENDING'      // Asset transformation or legal review currently in progress
  | 'VERIFIED'     // Geometry validated, manifold verified, hash cryptographically confirmed
  | 'CLEARED'      // Formally audited and approved for production web bundle
  | 'RESTRICTED';  // Quarantined, research-only, or third-party license restricted

/**
 * Granular multi-stage validation states preventing the conflation
 * of geometric validity with anatomical accuracy or device readiness.
 */
export type GranularValidationStage =
  | 'SOURCE_VERIFIED'               // Upstream source release, authentic file hash, and licensing provenance verified
  | 'PROVENANCE_VERIFIED'           // Transform pipeline lineage, cryptographic SHA-256 hashes, and license covenants documented
  | 'GEOMETRY_VALIDATED'            // 2-manifold, watertight (if required), non-degenerate surface geometry verified
  | 'ANATOMICAL_MAPPING_VALIDATED'  // Stereotaxic laterality, anatomical landmarks, and ontology grounding verified
  | 'RUNTIME_READY'                 // Meshopt-compressed, multi-resolution LODs generated, BVH acceleration tree built
  | 'DEVICE_VALIDATED';             // Tested and profiled on actual physical hardware

/**
 * Explicit device validation verification level.
 * Prevents automated Node / headless unit tests from being claimed as physical device proof.
 */
export type DeviceValidationLevel =
  | 'AUTOMATED_TEST_VALIDATION'     // Headless execution under Node.js / tsx / Vitest (simulated DOM/WebGL mocks)
  | 'BROWSER_VALIDATION'            // Interactive execution in modern desktop browser (Chrome, Edge, Firefox, Safari)
  | 'PHYSICAL_DEVICE_VALIDATION'    // Benchmarked on real physical devices (Apple Silicon, iPadOS, Android, discrete GPU)
  | 'DEVICE_VALIDATION_PENDING';    // Physical hardware testing has not yet been executed

export interface GranularValidationRecord {
  stages_completed: GranularValidationStage[];
  source_verified: boolean;
  provenance_verified: boolean;
  geometry_validated: boolean;
  anatomical_mapping_validated: boolean;
  runtime_ready: boolean;
  device_validation_level: DeviceValidationLevel;
  device_validation_notes?: string;
  audit_timestamp: string;
  auditor: string;
}

export interface TransformationStep {
  step_number: number;
  operation_name: string;       // e.g., 'Taubin_Smoothing', 'QEM_Decimation', 'Meshopt_Compression'
  script_relative_path: string; // e.g., 'scripts/pipeline/decimate_mesh.py'
  parameters: Record<string, string | number | boolean>;
  executed_by: string;
  git_commit_hash: string;
  timestamp: string;
}

/**
 * Physical Asset Provenance:
 * Applied strictly to material files (3D meshes, textures, binary point clouds, atlas buffers).
 */
export interface AssetProvenance {
  asset_id: string;                      // Unique ID of this specific 3D mesh, texture, or dataset record (e.g., 'mesh.hippocampus.left.v1')
  dataset_name: string;                  // e.g., 'Z-Anatomy', 'Human Connectome Project'
  dataset_version: string;               // e.g., 'v2024.1.0', '1200 Subjects Release'
  source_url: string;                    // Direct repository or data portal URL
  upstream_asset_id: string;             // Upstream node name or file path in source distribution
  upstream_license: UpstreamLicenseType;
  attribution_text_required: string;     // Exact citation text that must be published in NOTICE / About panel
  acquisition_date: string;              // ISO date format (YYYY-MM-DD)
  modifications_applied: TransformationStep[];
  resulting_sha256_hash: string;         // Cryptographic SHA-256 hash, or 'NOT_YET_GENERATED' for planned/pre-pipeline assets
  resulting_license: string;             // License governing the output asset (e.g., 'CC-BY-SA 4.0')
  project_distribution_policy?: string;  // Project-chosen distribution policy where applicable
  production_eligibility: ProductionEligibility;
  commercial_redistribution: CommercialPermission;
  restrictions_and_covenants: string[];  // e.g., 'Must not contact or re-identify subjects', 'Must redistribute derivatives under CC-BY-SA'
  validation_status: AssetValidationStatus;
  granular_validation?: GranularValidationRecord;
  legal_review_notes?: string;
}

/**
 * Entity-Level Provenance:
 * Applied to semantic graph entities (structures, functional networks, pathways, evidence claims).
 * An entity may exist before any 3D asset exists, or may never have a 3D asset.
 */
export interface EntityProvenance {
  source_authority: string;              // e.g., 'Terminologia Anatomica 2 (FIPAT)', 'Glasser et al. 2016 (HCP)', 'NIMH RDoC Matrix 2019'
  dataset_name?: string;                 // e.g., 'HCP_S1200', 'Julich-Brain_v3.0', 'Z-Anatomy'
  dataset_version?: string;              // e.g., 'v2024.1.0'
  ontology_reference?: string;           // e.g., 'TA2:5488', 'FMA:275020', 'UBERON:0001954'
  citation_keys?: string[];              // Literature references grounding this entity's definition
  provenance_notes?: string;             // Epistemic, historical, or boundary notes
  last_reviewed?: string;                // ISO date YYYY-MM-DD
}

/**
 * Schema for the central production asset manifest (`assets.manifest.json`).
 */
export interface AssetsManifest {
  manifest_version: string;
  generated_at: string;
  generator_script: string;
  total_assets: number;
  assets: Record<string, AssetProvenance>;
  production_whitelist: string[];       // Asset IDs listed for production bundling (technical listing; not legal clearance)
  research_quarantine: string[];        // Asset IDs restricted to research validation
}
