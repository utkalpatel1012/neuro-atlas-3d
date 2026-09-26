# Production Asset Provenance & Manifest Specification

**Document Version**: 1.1.0  
**Authority**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Standard**: AAS-2026-NEURO-V1 (Phase 0.1.1 Remediation)  
**Target Manifest**: `assets/assets.manifest.json`  

---

## 1. Core Principle: Entity Provenance vs. Asset Provenance

In the Phase 0.1.1 architecture, we strictly decouple **Entity Provenance** from **Asset Provenance**:

1. **Entity Provenance (`EntityProvenance` in `src/types/provenance.ts`)**:
   * Applied to semantic and epistemic graph entities (structures, functional networks, pathways, evidence claims).
   * Tracks scientific authorities (e.g., FIPAT TA2, NIMH RDoC, Glasser et al.), dataset references, literature citations, and ontological cross-references.
   * Enables an entity to exist and be fully validated **before any physical 3D mesh is modeled or acquired**.
2. **Asset Provenance (`AssetProvenance` in `src/types/provenance.ts`)**:
   * Applied strictly to physical 3D files (`.glb`, `.ktx2`, displacement warps).
   * Tracks cryptographic SHA-256 hashes, upstream mesh nodes, geometric cleaning steps, decimation history, and legal redistribution covenants.

> **Every production asset must possess its own verifiable cryptographic and legal provenance chain.**  
> Non-commercial datasets (e.g., CC-BY-NC-SA 4.0) are strictly quarantined. Fake hashes and simulated commit records are prohibited. Pre-pipeline assets must declare `resulting_sha256_hash: "NOT_YET_GENERATED"`.

---

## 2. Asset Lifecycle & Validation Status

Every asset registered in `assets.manifest.json` progresses through a strict state machine:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Asset Validation States                         │
├─────────────────────────┬──────────────────────────────────────────────┤
│ `UNVERIFIED`            │ Registered in manifest, not yet validated.   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `PENDING`               │ Pipeline decimation/cleaning in progress.    │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `VERIFIED`              │ Geometry manifold checked, hash verified.    │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `CLEARED`               │ Signed off for production web bundle.        │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `RESTRICTED`            │ Quarantined for research only or barred.     │
└─────────────────────────┴──────────────────────────────────────────────┘
```

Along with the validation status, every asset declares its `production_eligibility`:
* `PRODUCTION_ALLOWED`: Permitted for public web client bundles.
* `RESEARCH_ONLY`: Quarantined for internal validation; barred from client builds.
* `LEGAL_REVIEW_REQUIRED`: Ambiguous terms undergoing formal review.

---

## 3. Schema of `assets.manifest.json`

The production asset manifest (`assets/assets.manifest.json`) is the machine-readable registry generated during the Phase-1 asset pipeline. Its TypeScript schema is defined in [`src/types/provenance.ts`](file:///C:/Users/UTKAL%20PATEL/.gemini/antigravity/scratch/neuro-atlas-3d/src/types/provenance.ts).

### Production Benchmark Manifest Record (`mesh.hippocampus.left.v1`)
```json
{
  "manifest_version": "1.1.0",
  "generated_at": "2026-09-26T11:08:02.806Z",
  "generator_script": "scripts/pipeline/update_manifest.ts",
  "total_assets": 1,
  "assets": {
    "mesh.hippocampus.left.v1": {
      "asset_id": "mesh.hippocampus.left.v1",
      "dataset_name": "BodyParts3D / SPL-PNL Brain Atlas",
      "dataset_version": "Release 3.0 (2011)",
      "source_url": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
      "upstream_asset_id": "FMA72714",
      "upstream_license": "CC_BY_SA_2_1_JP",
      "attribution_text_required": "BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan.",
      "acquisition_date": "2026-09-26",
      "modifications_applied": [
        {
          "step_number": 1,
          "operation_name": "Raw_Asset_Ingestion",
          "script_relative_path": "scripts/pipeline/ingest_asset.ts",
          "parameters": {
            "source_file": "FMA72714.stl",
            "verified_source_sha256": "8cdbbe55c32006656574f414c8a56265d5f5c73bf206699c67a4feea94a17a21",
            "source_byte_length": 214084
          },
          "executed_by": "Pipeline_Ingestion_Engine",
          "git_commit_hash": "fe88bb7d00f6810c950a4aa31e3fe1a8a25c347f",
          "timestamp": "2026-09-26T10:45:00Z"
        },
        {
          "step_number": 2,
          "operation_name": "Geometric_QA_Validation",
          "script_relative_path": "scripts/pipeline/validate_mesh.ts",
          "parameters": {
            "manifold_edges_required": 0,
            "zero_area_faces_allowed": 0,
            "duplicate_faces_allowed": 0,
            "watertight_required": true,
            "measured_volume_cm3": 1.872
          },
          "executed_by": "MeshValidation_Auditor",
          "git_commit_hash": "fe88bb7d00f6810c950a4aa31e3fe1a8a25c347f",
          "timestamp": "2026-09-26T10:47:00Z"
        },
        {
          "step_number": 3,
          "operation_name": "Coordinate_Canonicalization_And_Normals",
          "script_relative_path": "scripts/pipeline/canonicalize_mesh.ts",
          "parameters": {
            "input_space": "DICOM_LPS",
            "output_space": "THREEJS_RAS",
            "transform": "x_negated_z_negated",
            "normals": "area_weighted_smooth"
          },
          "executed_by": "Canonicalization_Engine",
          "git_commit_hash": "fe88bb7d00f6810c950a4aa31e3fe1a8a25c347f",
          "timestamp": "2026-09-26T10:50:00Z"
        },
        {
          "step_number": 4,
          "operation_name": "Multi_LOD_Simplification",
          "script_relative_path": "scripts/pipeline/generate_lods.ts",
          "parameters": {
            "algorithm": "Quadric_Error_Metric",
            "levels_generated": 4,
            "ratios": "1.0, 0.75, 0.50, 0.25"
          },
          "executed_by": "Meshopt_LOD_Generator",
          "git_commit_hash": "fe88bb7d00f6810c950a4aa31e3fe1a8a25c347f",
          "timestamp": "2026-09-26T11:04:00Z"
        },
        {
          "step_number": 5,
          "operation_name": "Runtime_Meshopt_Compression",
          "script_relative_path": "scripts/pipeline/optimize_meshopt.ts",
          "parameters": {
            "extension": "EXT_meshopt_compression",
            "overall_savings_percent": 45.05,
            "lossless_verification": true
          },
          "executed_by": "Meshopt_Runtime_Optimizer",
          "git_commit_hash": "fe88bb7d00f6810c950a4aa31e3fe1a8a25c347f",
          "timestamp": "2026-09-26T11:07:00Z"
        }
      ],
      "resulting_sha256_hash": "c361b544d06ce687f1b8b7510a5699581a9aaf3686d3a0904484b12b820cc613",
      "resulting_license": "CC-BY-SA 2.1 Japan",
      "production_eligibility": "PRODUCTION_ALLOWED",
      "commercial_redistribution": "PERMITTED",
      "restrictions_and_covenants": [
        "Must preserve attribution to BodyParts3D / LSIDC in application notices and UI",
        "Derived 3D meshes must be shared under identical or compatible CC-BY-SA terms"
      ],
      "validation_status": "CLEARED",
      "legal_review_notes": "Ingested from BodyParts3D Release 3.0 (FMA72714 left hippocampus). Free from non-commercial restriction. Formally cleared for production 3D web bundle."
    }
  },
  "production_whitelist": [
    "mesh.hippocampus.left.v1"
  ],
  "research_quarantine": []
}
```

---

## 4. Automated Build-Time Quarantine Enforcement

To prevent accidental inclusion of research-only assets in production web builds:

1. **Manifest Audit Pre-Build Script (`npm run verify:assets`)**:
   * Inspects all asset references in the WebGL scene graph.
   * If any asset with `production_eligibility: "RESEARCH_ONLY"` or `"LEGAL_REVIEW_REQUIRED"` is bundled in `public/models/`, the build immediately fails with exit code 1.
2. **Attribution Aggregator (`npm run generate:notice`)**:
   * Scans `assets.manifest.json` and automatically compiles all mandatory `attribution_text_required` strings into the application's `public/NOTICE.txt` file and UI "About & Provenance" drawer.
