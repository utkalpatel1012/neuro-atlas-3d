# Production Asset Provenance & Manifest Specification

**Document Version**: 1.0.0  
**Authority**: Lead Technical Architect & Digital Neuroanatomy Specialist  
**Standard**: AAS-2026-NEURO-V1  
**Target Manifest**: `assets/assets.manifest.json`

---

## 1. Core Principle: Asset-Level vs. Dataset-Level Provenance

> **Every production asset must possess its own verifiable cryptographic and legal provenance chain.**
> 
> General assertions such as "Z-Anatomy is CC-BY-SA" or "HCP is open access" are insufficient for production medical software. Z-Anatomy contains meshes integrated from BodyParts3D (under CC-BY-SA 2.1 Japan) alongside newer Blender retopologies under CC-BY-SA 4.0. Connectome data is governed by the WU-Minn HCP Open Access Data Use Agreement with strict subject protection covenants.
> 
> Therefore, provenance is enforced at the **individual asset level** (per `.glb` node, `.ktx2` texture, or `.json` dataset).

---

## 2. Production Eligibility Tiers

Every asset registered in the manifest must be categorized under one of three strict operational tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Asset Eligibility Tiers                         │
├─────────────────────────┬──────────────────────────────────────────────┤
│ `PRODUCTION_ALLOWED`    │ Permitted for compilation and distribution   │
│                         │ in public web client bundles.                │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `RESEARCH_ONLY`         │ Strictly quarantined for internal scientific │
│                         │ validation; barred from client builds.       │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `LEGAL_REVIEW_REQUIRED` │ Ambiguous or complex data use terms;         │
│                         │ barred from production pending clearance.    │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Schema of `assets.manifest.json`

The production asset manifest (`assets/assets.manifest.json`) is the machine-readable registry generated during the Phase-1 asset pipeline. Its TypeScript schema is defined in [`src/types/provenance.ts`](file:///C:/Users/UTKAL%20PATEL/.gemini/antigravity/scratch/neuro-atlas-3d/src/types/provenance.ts).

### Exemplar Manifest Structure
```json
{
  "$schema": "./assets.manifest.schema.json",
  "manifest_version": "1.0.0",
  "generated_at": "2026-09-26T12:00:00Z",
  "generator_script": "scripts/pipeline/generate_manifest.py",
  "total_assets": 1,
  "production_whitelist": ["mesh.hippocampus.left.v2"],
  "research_quarantine": ["julich.cyto.ca1.prob_map.v3"],
  "assets": {
    "mesh.hippocampus.left.v2": {
      "asset_id": "mesh.hippocampus.left.v2",
      "dataset_name": "Z-Anatomy",
      "dataset_version": "2024.1.0",
      "source_url": "https://github.com/Z-Anatomy/Models-of-human-anatomy",
      "upstream_asset_id": "Hippocampus_L",
      "upstream_license": "CC_BY_SA_4_0",
      "attribution_text_required": "Hippocampus 3D geometry derived from Z-Anatomy contributors, licensed under CC-BY-SA 4.0.",
      "acquisition_date": "2026-09-26",
      "modifications_applied": [
        {
          "step_number": 1,
          "operation_name": "NonManifold_Repair",
          "script_relative_path": "scripts/pipeline/clean_mesh.py",
          "parameters": { "merge_distance_mm": 0.0001, "recalculate_normals": true },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "d03cacf",
          "timestamp": "2026-09-26T12:30:00Z"
        },
        {
          "step_number": 2,
          "operation_name": "Taubin_Smoothing",
          "script_relative_path": "scripts/pipeline/smooth_mesh.py",
          "parameters": { "iterations": 15, "pass_band": 0.1 },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "d03cacf",
          "timestamp": "2026-09-26T12:31:00Z"
        },
        {
          "step_number": 3,
          "operation_name": "QEM_Decimation",
          "script_relative_path": "scripts/pipeline/decimate_mesh.py",
          "parameters": { "target_triangles": 3240, "preserve_boundaries": true },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "d03cacf",
          "timestamp": "2026-09-26T12:32:00Z"
        },
        {
          "step_number": 4,
          "operation_name": "Meshopt_Quantization",
          "script_relative_path": "scripts/pipeline/compress_meshopt.py",
          "parameters": { "position_bits": 14, "normal_bits": 8, "subgroup_optimization": true },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "d03cacf",
          "timestamp": "2026-09-26T12:33:00Z"
        }
      ],
      "resulting_sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "resulting_license": "CC-BY-SA 4.0",
      "production_eligibility": "PRODUCTION_ALLOWED",
      "commercial_redistribution": "PERMITTED",
      "restrictions_and_covenants": [
        "Must preserve author attribution to Z-Anatomy in application NOTICE file",
        "Derivative 3D meshes must be shared under identical CC-BY-SA 4.0 terms"
      ],
      "legal_review_status": "CLEARED",
      "legal_review_notes": "Meets all ShareAlike downstream criteria. Codebase remains separate Apache-2.0 work."
    }
  }
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
