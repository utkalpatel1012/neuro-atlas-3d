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

### Exemplar Manifest Structure (Illustrative)
```json
{
  "$schema": "./assets.manifest.schema.json",
  "manifest_version": "1.1.0",
  "generated_at": "2026-09-26T12:00:00Z",
  "generator_script": "scripts/pipeline/generate_manifest.py",
  "total_assets": 1,
  "production_whitelist": ["mesh.hippocampus.left.v1"],
  "research_quarantine": ["julich.cyto.ca1.prob_map.v3"],
  "assets": {
    "mesh.hippocampus.left.v1": {
      "asset_id": "mesh.hippocampus.left.v1",
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
          "git_commit_hash": "EXAMPLE_PIPELINE_COMMIT",
          "timestamp": "2026-09-26T12:30:00Z"
        },
        {
          "step_number": 2,
          "operation_name": "Taubin_Smoothing",
          "script_relative_path": "scripts/pipeline/smooth_mesh.py",
          "parameters": { "iterations": 15, "pass_band": 0.1 },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "EXAMPLE_PIPELINE_COMMIT",
          "timestamp": "2026-09-26T12:31:00Z"
        },
        {
          "step_number": 3,
          "operation_name": "QEM_Decimation",
          "script_relative_path": "scripts/pipeline/decimate_mesh.py",
          "parameters": { "target_triangles": 3240, "preserve_boundaries": true },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "EXAMPLE_PIPELINE_COMMIT",
          "timestamp": "2026-09-26T12:32:00Z"
        },
        {
          "step_number": 4,
          "operation_name": "Meshopt_Quantization",
          "script_relative_path": "scripts/pipeline/compress_meshopt.py",
          "parameters": { "position_bits": 14, "normal_bits": 8, "subgroup_optimization": true },
          "executed_by": "AssetPipeline_Agent",
          "git_commit_hash": "EXAMPLE_PIPELINE_COMMIT",
          "timestamp": "2026-09-26T12:33:00Z"
        }
      ],
      "resulting_sha256_hash": "EXAMPLE_ONLY_NOT_YET_CALCULATED",
      "resulting_license": "CC-BY-SA 4.0",
      "production_eligibility": "PRODUCTION_ALLOWED",
      "commercial_redistribution": "PERMITTED",
      "restrictions_and_covenants": [
        "Must preserve author attribution to Z-Anatomy in application NOTICE file",
        "Derivative 3D meshes must be shared under identical CC-BY-SA 4.0 terms"
      ],
      "validation_status": "CLEARED",
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
