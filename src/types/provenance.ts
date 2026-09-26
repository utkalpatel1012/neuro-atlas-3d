/**
 * 3D Neuroanatomy Atlas: Asset-Level Provenance & Licensing Model
 * Standard: AAS-2026-NEURO-V1
 * 
 * Core Architectural Mandate:
 * Licensing is tracked at the granular ASSET level, not dataset level.
 * Research-only datasets (e.g., CC-BY-NC-SA) are strictly quarantined.
 * Assets with ambiguous terms are explicitly marked LEGAL_REVIEW_REQUIRED.
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

export interface TransformationStep {
  step_number: number;
  operation_name: string;       // e.g., 'Taubin_Smoothing', 'QEM_Decimation', 'Meshopt_Compression'
  script_relative_path: string; // e.g., 'scripts/pipeline/decimate_mesh.py'
  parameters: Record<string, string | number | boolean>;
  executed_by: string;
  git_commit_hash: string;
  timestamp: string;
}

export interface AssetProvenance {
  asset_id: string;                      // Unique ID of this specific 3D mesh, texture, or dataset record
  dataset_name: string;                  // e.g., 'Z-Anatomy', 'Human Connectome Project'
  dataset_version: string;               // e.g., 'v2024.1.0', '1200 Subjects Release'
  source_url: string;                    // Direct repository or data portal URL
  upstream_asset_id: string;             // Upstream node name or file path in source distribution
  upstream_license: UpstreamLicenseType;
  attribution_text_required: string;     // Exact citation text that must be published in NOTICE / About panel
  acquisition_date: string;              // ISO date format (YYYY-MM-DD)
  modifications_applied: TransformationStep[];
  resulting_sha256_hash: string;         // Cryptographic SHA-256 hash of the final processed asset
  resulting_license: string;             // License governing the output asset (e.g., 'CC-BY-SA 4.0')
  production_eligibility: ProductionEligibility;
  commercial_redistribution: CommercialPermission;
  restrictions_and_covenants: string[];  // e.g., 'Must not contact or re-identify subjects', 'Must redistribute derivatives under CC-BY-SA'
  legal_review_status: 'NOT_REQUIRED' | 'PENDING' | 'CLEARED' | 'RESTRICTED';
  legal_review_notes?: string;
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
  production_whitelist: string[];       // Asset IDs formally cleared for production bundling
  research_quarantine: string[];        // Asset IDs restricted to research validation
}
