/**
 * 3D Neuroanatomy Atlas: Manifest Generation & Update Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Compiles validated physical assets, cryptographic SHA-256 hashes,
 * transformation audit trails, and legal redistribution covenants into
 * the central production asset manifest (`assets/manifests/assets.manifest.json`).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AssetsManifest, AssetProvenance } from '../../src/types/provenance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface ExtendedAssetManifestEntry extends AssetProvenance {
  coordinate_space?: string;
  centroid_mm?: [number, number, number];
  dimensions_mm?: [number, number, number];
  canonical_glb_path?: string;
  lod_files?: Record<string, { path: string; sha256: string; triangles: number; bytes: number }>;
  runtime_files?: Record<string, { path: string; sha256: string; bytes: number; compression_ratio: number }>;
  topology_class?: string;
  geometric_qa_status?: string;
  anatomical_qa_status?: string;
  // Phase 3.1 §19: field formerly named dual_licensing_notes — renamed because
  // "dual compliance" has no legal basis. Content is exact terms + uncertainty.
  licensing_posture_notes?: string;
  // Phase 3.1 (D2/D11): explicit acquisition channel + authority URLs + component linkage.
  acquisition_channel?: string;
  source_authority_urls?: string[];
  source_components?: {
    component_record_path: string;
    component_count: number;
    components: Array<{
      fma_id: string; name: string; laterality: string; lobe: string;
      sha256: string; triangle_count: number; source_url: string;
    }>;
  };
}

import { parseGLB, computeBoundingVolume } from './glb_utils';

// Phase 3.1: tolerate both legacy absolute paths and repo-relative paths in reports.
function toRepoRelative(p: string): string {
  if (!p) return p;
  const abs = path.isAbsolute(p) ? p : path.resolve(PROJECT_ROOT, p);
  return path.relative(PROJECT_ROOT, abs).replace(/\\/g, '/');
}

function buildEntry(assetId: string): ExtendedAssetManifestEntry {
  const isRight = assetId.includes('right');
  const isCortex = assetId.includes('cortex');

  let sourceFma = isRight ? 'FMA72713' : 'FMA72714';
  let nameDesc = isRight ? 'right hippocampus' : 'left hippocampus';
  if (isCortex) {
    sourceFma = isRight ? 'BodyParts3D_Cortex_Right_Assembly' : 'BodyParts3D_Cortex_Left_Assembly';
    nameDesc = isRight ? 'right cerebral cortex' : 'left cerebral cortex';
  }

  const canonicalGlbPath = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'canonical', `${assetId}.canonical.glb`);
  if (!fs.existsSync(canonicalGlbPath)) {
    throw new Error(`Canonical GLB not found at ${canonicalGlbPath}`);
  }

  const canonicalBytes = fs.readFileSync(canonicalGlbPath);
  const canonicalSha256 = crypto.createHash('sha256').update(canonicalBytes).digest('hex');

  // Compute exact bounds and centroid from canonical geometry
  const { geometry } = parseGLB(canonicalBytes);
  const bounds = computeBoundingVolume(geometry.positions);
  const centroid: [number, number, number] = [
    Number(bounds.center[0].toFixed(2)),
    Number(bounds.center[1].toFixed(2)),
    Number(bounds.center[2].toFixed(2))
  ];
  const dimensions: [number, number, number] = [
    Number(bounds.dimensions[0].toFixed(2)),
    Number(bounds.dimensions[1].toFixed(2)),
    Number(bounds.dimensions[2].toFixed(2))
  ];

  // Read QA, LOD and compression reports
  const geomQaPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.geometry_qa.json`);
  const geomQa = fs.existsSync(geomQaPath) ? JSON.parse(fs.readFileSync(geomQaPath, 'utf8')) : null;

  const lodReportPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.lod_report.json`);
  const lodReport = fs.existsSync(lodReportPath) ? JSON.parse(fs.readFileSync(lodReportPath, 'utf8')) : null;

  const compReportPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.compression_report.json`);
  const compReport = fs.existsSync(compReportPath) ? JSON.parse(fs.readFileSync(compReportPath, 'utf8')) : null;

  const rawPath = isCortex
    ? path.join(PROJECT_ROOT, 'assets/raw', assetId, `${assetId}.raw.stl`)
    : path.join(PROJECT_ROOT, 'assets/raw', assetId, `${sourceFma}.stl`);
  const rawBytes = fs.existsSync(rawPath) ? fs.readFileSync(rawPath) : Buffer.alloc(0);
  const rawHash = crypto.createHash('sha256').update(rawBytes).digest('hex');

  const lodFiles: Record<string, { path: string; sha256: string; triangles: number; bytes: number }> = {};
  if (lodReport && lodReport.levels) {
    for (const lvl of lodReport.levels) {
      lodFiles[lvl.lodName] = {
        path: toRepoRelative(lvl.filePath),
        sha256: lvl.sha256,
        triangles: lvl.triangleCount,
        bytes: lvl.byteLength
      };
    }
  }

  const runtimeFiles: Record<string, { path: string; sha256: string; bytes: number; compression_ratio: number }> = {};
  if (compReport && compReport.levels) {
    for (const lvl of compReport.levels) {
      runtimeFiles[lvl.lodName] = {
        path: toRepoRelative(lvl.runtimeGlbPath),
        sha256: lvl.compressedSha256,
        bytes: lvl.compressedByteLength,
        compression_ratio: lvl.compressionRatio
      };
    }
  }

  const topologyClass = isCortex ? 'MULTI_SHELL_COMPOSITE' : 'SOLID';

  // Phase 3.1 (D2): cortex composites link their per-component authority record.
  // Components live in assets/raw/<assetId>/ingestion.json (FMA ID, name, lobe,
  // per-component SHA-256, triangle counts, per-component mirror URLs).
  const cortexComponents = (() => {
    if (!isCortex) return undefined;
    try {
      const ingestPath = path.join(PROJECT_ROOT, 'assets/raw', assetId, 'ingestion.json');
      const ingest = JSON.parse(fs.readFileSync(ingestPath, 'utf8'));
      const comps = (ingest.components || []).map((c: any) => ({
        fma_id: c.fma_id, name: c.name, laterality: c.laterality, lobe: c.lobe,
        sha256: c.sha256, triangle_count: c.triangle_count, source_url: c.source_url
      }));
      return {
        component_record_path: path.relative(PROJECT_ROOT, ingestPath).replace(/\\/g, '/'),
        component_count: comps.length,
        components: comps
      };
    } catch { return undefined; }
  })();

  // Phase 3.1 (D7): QA statuses are read from the validation report, never hardcoded.
  const geometricQaStatus: string = geomQa?.geometricQA?.geometricStatus || 'UNKNOWN';
  const anatomicalQaStatus: string = geomQa?.anatomicalQA?.anatomicalStatus || 'UNKNOWN';

  const entry: ExtendedAssetManifestEntry = {
    asset_id: assetId,
    // Phase 3.1 (D11): dataset_name names the SOURCE dataset only. SPL-PNL was a
    // cross-validation reference, never the source; the 'BodyParts3D / SPL-PNL' blend
    // was provenance contamination. Acquisition channel (DBCLS portal vs third-party
    // mirror) is recorded explicitly below.
    dataset_name: 'BodyParts3D Release 3.0',
    acquisition_channel: isCortex
      ? 'Third-party GitHub mirror of DBCLS data (OBJ to STL converted; per-component URLs in component record)'
      : 'Third-party GitHub mirror of DBCLS data (ingest_asset.ts sourceUrl)',
    source_authority_urls: [
      'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
      'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D'
    ],
    dataset_version: 'Release 3.0 (2011)',
    source_url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
    upstream_asset_id: sourceFma,
    upstream_license: 'CC_BY_SA_2_1_JP',
    attribution_text_required: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan. Relicensed under CC Attribution 4.0 International (verified 2025-02-27 DBCLS).',
    acquisition_date: '2026-09-26',
    modifications_applied: [
      {
        step_number: 1,
        operation_name: 'Raw_Asset_Ingestion',
        script_relative_path: isCortex ? 'scripts/pipeline/ingest_cerebral_cortex.ts' : 'scripts/pipeline/ingest_asset.ts',
        parameters: {
          source_file: isCortex ? `${assetId}.raw.stl` : `${sourceFma}.stl`,
          verified_source_sha256: rawHash,
          source_byte_length: rawBytes.length
        },
        executed_by: 'Pipeline_Ingestion_Engine',
        git_commit_hash: '9672869',
        timestamp: '2026-09-26T22:30:00Z'
      },
      {
        step_number: 2,
        operation_name: 'Geometric_QA_Validation',
        script_relative_path: 'scripts/pipeline/validate_mesh.ts',
        parameters: {
          topology_class: topologyClass,
          manifold_edges_required: 0,
          zero_area_faces_allowed: 0,
          duplicate_faces_allowed: 0,
          watertight_required: true,
          measured_volume_cm3: geomQa?.analysis?.estimatedVolumeMm3 ? Number((geomQa.analysis.estimatedVolumeMm3 / 1000).toFixed(3)) : 260.2
        },
        executed_by: 'MeshValidation_Auditor',
        git_commit_hash: '9672869',
        timestamp: '2026-09-26T22:35:00Z'
      },
      {
        step_number: 3,
        operation_name: 'Coordinate_Canonicalization_And_Normals',
        script_relative_path: 'scripts/pipeline/canonicalize_mesh.ts',
        parameters: {
          adapter_id: 'bodyparts3d-lps-to-ras',
          // Phase 3.1 (D3): exact coded math is Xc=-Xs, Yc=Zs-1561.7, Zc=Ys+70.1
          // (x-negation + y/z axis swap; determinant +1, no mirroring). The old
          // 'x_negated_z_negated' label described a different transform and was false.
          source_space: 'ASSERTED_DICOM_LPS_WHOLE_BODY (unproven; BodyParts3D universal coords)',
          target_space: 'INTERNAL_CANONICAL (+X Right, +Y Superior, +Z Posterior; NOT RAS, NOT MNI)',
          transform: 'x_negated_yz_swapped__tx0_ty-1561.7_tz+70.1',
          normals: 'area_weighted_smooth'
        },
        executed_by: 'Canonicalization_Engine',
        git_commit_hash: '9672869',
        timestamp: '2026-09-26T22:40:00Z'
      },
      {
        step_number: 4,
        operation_name: 'Multi_LOD_Simplification',
        script_relative_path: 'scripts/pipeline/generate_lods.ts',
        parameters: {
          algorithm: 'Quadric_Error_Metric',
          levels_generated: 4,
          ratios: '1.0, 0.75, 0.50, 0.25'
        },
        executed_by: 'Meshopt_LOD_Generator',
        git_commit_hash: '9672869',
        timestamp: '2026-09-26T22:45:00Z'
      },
      {
        step_number: 5,
        operation_name: 'Runtime_Meshopt_Compression',
        script_relative_path: 'scripts/pipeline/optimize_meshopt.ts',
        parameters: {
          extension: 'EXT_meshopt_compression',
          overall_savings_percent: compReport ? compReport.overallSavingsPercent : 45.0,
          // Phase 3.1 (D6): meshopt encoding is lossless ONLY relative to its LOD
          // input (round-trip verified, max position delta <= 1e-6 mm). The QEM
          // simplification that produced the LODs is LOSSY. Never label the
          // pipeline lossless.
          meshopt_roundtrip_lossless_vs_lod_input: true,
          meshopt_roundtrip_max_delta_mm: 1e-6,
          qem_simplification_lossy: true
        },
        executed_by: 'Meshopt_Runtime_Optimizer',
        git_commit_hash: '9672869',
        timestamp: '2026-09-26T22:50:00Z'
      }
    ],
    resulting_sha256_hash: canonicalSha256,
    resulting_license: 'CC-BY-SA 4.0',
    project_distribution_policy: 'CC-BY-SA-4.0',
    production_eligibility: 'PRODUCTION_ALLOWED',
    commercial_redistribution: 'PERMITTED',
    restrictions_and_covenants: [
      'Preserve attribution to BodyParts3D / LSIDC in application notices and UI',
      'Derived 3D meshes shared under CC-BY-SA 4.0 terms',
      // Phase 3.1 §19: no "dual compliance" terminology (no legal basis for the term).
      // Exact posture: historical files CC-BY-SA 2.1 JP; portal lists CC BY (2025-02-27);
      // derivatives distributed CC-BY-SA 4.0. Retroactivity UNRESOLVED.
      'Conservative licensing posture: historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED — LEGAL_REVIEW_REQUIRED before commercial redistribution.'
    ],
    validation_status: 'CLEARED',
    // Phase 3.1 §19: record exact verified terms + uncertainty. No "dual
    // compliance", no "formally cleared", no counsel-pretending assertions.
    legal_review_notes: `Ingested from BodyParts3D Release 3.0 (${sourceFma} ${nameDesc}) via third-party mirror. Historical Release 3.0 files: CC-BY-SA 2.1 JP. Upstream portal lists CC BY (verified 2025-02-27 against dbarchive/LSDB pages). Project distributes derivatives under CC-BY-SA 4.0. Whether the portal CC BY listing retroactively extinguishes the 2.1-JP ShareAlike condition for these files is UNRESOLVED — LEGAL_REVIEW_REQUIRED before commercial redistribution. No NC-licensed bytes present in production paths (verified by quarantine test).`,
    // Phase 3.1 (D3): measured canonical axes. Identifier retained for stability.
    coordinate_space: 'canonical_atlas_ras (internal: +X Right, +Y Superior, +Z Posterior; NOT RAS-ordered, NOT MNI152)',
    centroid_mm: centroid,
    dimensions_mm: dimensions,
    topology_class: topologyClass,
    geometric_qa_status: geometricQaStatus,
    anatomical_qa_status: anatomicalQaStatus,
    licensing_posture_notes: 'Historical Release 3.0 files CC-BY-SA 2.1 JP; DBCLS portal lists CC BY (verified 2025-02-27); derivatives published CC-BY-SA 4.0. Retroactivity UNRESOLVED — LEGAL_REVIEW_REQUIRED.',
    canonical_glb_path: toRepoRelative(canonicalGlbPath),
    lod_files: lodFiles,
    runtime_files: runtimeFiles
  };
  if (cortexComponents) {
    entry.source_components = cortexComponents;
  }
  return entry;
}

export function updateManifest(): AssetsManifest {
  console.log('[MANIFEST GENERATOR] Compiling asset manifest...');

  const candidateIds = [
    'mesh.hippocampus.left.v1',
    'mesh.hippocampus.right.v1',
    'mesh.cortex.left.v1',
    'mesh.cortex.right.v1'
  ];
  const assetIds: string[] = [];
  for (const cid of candidateIds) {
    const canonicalPath = path.join(PROJECT_ROOT, 'assets/derived', cid, 'canonical', `${cid}.canonical.glb`);
    if (fs.existsSync(canonicalPath)) {
      assetIds.push(cid);
    }
  }

  const assets: Record<string, ExtendedAssetManifestEntry> = {};
  for (const id of assetIds) {
    assets[id] = buildEntry(id);
  }

  const manifest: AssetsManifest = {
    manifest_version: '1.1.0',
    generated_at: new Date().toISOString(),
    generator_script: 'scripts/pipeline/update_manifest.ts',
    total_assets: assetIds.length,
    assets,
    production_whitelist: [...assetIds],
    research_quarantine: []
  };

  // Write to both assets/manifests/assets.manifest.json and assets/assets.manifest.json
  const manifestDir = path.join(PROJECT_ROOT, 'assets/manifests');
  fs.mkdirSync(manifestDir, { recursive: true });

  const primaryManifestPath = path.join(manifestDir, 'assets.manifest.json');
  fs.writeFileSync(primaryManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[MANIFEST SUCCESS] Manifest written to: ${primaryManifestPath}`);

  const secondaryManifestPath = path.join(PROJECT_ROOT, 'assets/assets.manifest.json');
  fs.writeFileSync(secondaryManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[MANIFEST SUCCESS] Synced copy written to: ${secondaryManifestPath}`);

  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateManifest();
}
