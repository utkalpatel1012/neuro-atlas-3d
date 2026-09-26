# Anatomical Asset Ingestion Specification

**Standard**: AAS-2026-NEURO-V1  
**Authority**: Senior Digital Neuroanatomy Specialist & Lead Technical Architect  
**Document**: `docs/ASSET_INGESTION_SPEC.md`  
**Phase**: 1.0 Production Anatomical Asset Pipeline Foundation  
**Status**: APPROVED & LOCKED  

---

## 1. Purpose & Ingestion Policy

This specification governs the intake of raw 3D polygon meshes and anatomical dataset files into the atlas repository.

No asset may enter the processing pipeline without a complete, verified, and cryptographically hashed **Ingestion Record** (`ingestion.json`). Ingesting unverified files, guessing licenses, or modifying raw source data directly in `assets/raw/` is strictly prohibited.

---

## 2. Mandatory Ingestion Record Fields

Every raw asset stored in `assets/raw/[asset-id]/` must be accompanied by an `ingestion.json` document containing the following 16 mandatory fields:

```typescript
export interface AssetIngestionRecord {
  asset_id: string;                      // Canonical asset identifier (e.g., 'mesh.hippocampus.left.v1')
  source_dataset: string;                // e.g., 'BodyParts3D / Database Center for Life Sciences (DBCLS)'
  source_dataset_version: string;        // e.g., 'Release 3.0 (2011/06/20)'
  source_asset_id: string;               // Upstream concept or node identifier (e.g., 'FMA72714')
  source_url: string;                    // Authoritative download or repository URL
  source_license: string;                // e.g., 'CC-BY-SA 2.1 Japan'
  source_license_version: string;        // e.g., '2.1 JP'
  attribution: string;                   // Exact required attribution text
  acquisition_date: string;              // ISO date format (YYYY-MM-DD)
  original_filename: string;             // Exact filename from upstream source (e.g., 'FMA72714.stl')
  original_format: string;               // File format (e.g., 'STL_BINARY', 'OBJ', 'PLY', 'GLTF')
  original_hash: string;                 // Cryptographic SHA-256 hash of the exact original file
  source_coordinate_space: string;       // e.g., 'dicom_lps_whole_body', 'mni152', 'native_blender'
  source_units: string;                  // e.g., 'millimeters (mm)'
  source_metadata: Record<string, any>;  // Raw metadata from source catalogue/index
  ingestion_status:                      // Ingestion verification status
    | 'INGESTED'
    | 'SOURCE_VERIFIED'
    | 'LEGAL_REVIEW_REQUIRED'
    | 'REJECTED';
}
```

---

## 3. Left Hippocampus Ingestion Record (Benchmark Asset)

Below is the formal, verified Ingestion Record for the left hippocampus benchmark asset:

```json
{
  "asset_id": "mesh.hippocampus.left.v1",
  "source_dataset": "BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)",
  "source_dataset_version": "Release 3.0 (2011/06/20)",
  "source_asset_id": "FMA72714",
  "source_url": "https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/master/assets/BodyParts3D_data/stl/FMA72714.stl",
  "source_license": "CC-BY-SA 2.1 Japan",
  "source_license_version": "2.1 JP",
  "attribution": "BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan.",
  "acquisition_date": "2026-09-26",
  "original_filename": "FMA72714.stl",
  "original_format": "STL_BINARY",
  "original_hash": "249d32b55f1a55928d1720d20d7593c66a4bc2ca19277f0a1492ba26efd79f04",
  "source_coordinate_space": "dicom_lps_whole_body",
  "source_units": "millimeters (mm)",
  "source_metadata": {
    "fma_id": "FMA72714",
    "fma_name": "left hippocampus",
    "organ_type": "central_nervous_system",
    "polygon_reduction_rate": "95%",
    "reference_atlases": [
      "The Human Central Nervous System 4th edition",
      "Atlas of the Human Brain, Third Edition",
      "Gray's Anatomy 40th edition",
      "SPL-PNL Brain Atlas 2008"
    ]
  },
  "ingestion_status": "SOURCE_VERIFIED"
}
```

---

## 4. Ingestion Integrity Rules

1. **Immutable Ingestion Directory**: Files in `assets/raw/[asset-id]/` must be marked read-only upon download and checksum verification. No human or automated script may edit a file in `assets/raw/`.
2. **Immediate Checksumming**: SHA-256 calculation must take place immediately upon byte stream receipt.
3. **Traceability**: The `original_hash` in `ingestion.json` serves as the root `input_asset_hash` for the first transformation step in the asset pipeline.
4. **Legal Review Gate**: If an asset originates from a source with ambiguous terms or an unverified license, `ingestion_status` must be set to `LEGAL_REVIEW_REQUIRED`, halting the pipeline until formal clearance is documented.
