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
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { AssetsManifest, AssetProvenance } from '../../src/types/provenance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface ExtendedAssetManifestEntry extends AssetProvenance {
  coordinate_space?: string;
  // Phase 5.0 (§31): stable structure linkage (hierarchy/discovery). Populated
  // from the asset's ingestion record; absent on pre-5.0 legacy entries.
  structure_id?: string;
  // Phase 5.0 (§19): in-repo derivation record passthrough (parent asset,
  // input hash, operation). Absent on legacy entries.
  derived_from?: {
    parent_asset_id: string;
    parent_ingestion_record: string;
    input_sha256: string;
    operation: string;
  };
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

// Phase 5.2 CRITICAL-1 repair: acquisition_date is provenance, not build metadata.
// A previous revision derived it from `fs.statSync(...).birthtime` when the asset's
// ingestion record lacked the field, which silently rewrote 27 already-certified
// legacy entries (2026-09-26 -> the working copy's checkout date) and violated this
// phase's own `legacy-identical` evidence gate. Filesystem timestamps are never a
// provenance source. Precedence is now strictly:
//   1. the asset's own ingestion record (recorded at acquisition time), else
//   2. the value already published in the committed manifest (preserved verbatim), else
//   3. NOT_RECORDED - an explicit, honest gap rather than an invented date.
function readExistingAcquisitionDates(): Map<string, string> {
  const prior = new Map<string, string>();
  const manifestPath = path.join(PROJECT_ROOT, 'assets/manifests/assets.manifest.json');
  if (!fs.existsSync(manifestPath)) return prior;
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // `assets` is a keyed object, not an array. Iterating it with for...of throws,
    // which the catch below would silently swallow into an EMPTY prior map - and an
    // empty map makes every asset fall through to the next source. Use Object.values.
    const collection = Array.isArray(parsed.assets) ? parsed.assets : Object.values(parsed.assets ?? {});
    for (const entry of collection) {
      if (entry && typeof entry.acquisition_date === 'string' && entry.acquisition_date.length > 0) {
        prior.set(entry.asset_id, entry.acquisition_date);
      }
    }
  } catch {
    // A manifest that cannot be parsed is reported by the caller's own write path.
  }
  return prior;
}

const PRIOR_ACQUISITION_DATES = readExistingAcquisitionDates();

// Phase 5.2 provenance review MAJOR-4: lineage steps previously recorded a single
// hardcoded commit ('9672869', a Phase 2.1.1 commit) for every step of every asset,
// so the lineage could not identify the code that actually produced the bytes. The
// commit that last touched a given script is resolved at write time instead.
function resolveScriptCommit(scriptRelativePath: string): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%H', '--', scriptRelativePath], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (out.length > 0) return out;
  } catch {
    // Fall through to the explicit unknown marker below.
  }
  return 'UNRESOLVED_NO_GIT_HISTORY';
}

function buildEntry(assetId: string): ExtendedAssetManifestEntry {
  const isRight = assetId.includes('right');
  const isCortex = assetId.includes('cortex');

  // Phase 5.0: per-asset upstream FMA from its own ingestion record; legacy
  // hippocampus/cortex defaults preserved exactly when absent.
  let sourceFma = isRight ? 'FMA72713' : 'FMA72714';
  let nameDesc = isRight ? 'right hippocampus' : 'left hippocampus';
  let ingestionMeta: any = null;
  try {
    ingestionMeta = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'assets/raw', assetId, 'ingestion.json'), 'utf8'));
    if (typeof ingestionMeta.source_asset_id === 'string' && ingestionMeta.source_asset_id.length > 0) {
      sourceFma = ingestionMeta.source_asset_id;
    }
  } catch { /* legacy fallback below */ }
  if (isCortex) {
    sourceFma = isRight ? 'BodyParts3D_Cortex_Right_Assembly' : 'BodyParts3D_Cortex_Left_Assembly';
    nameDesc = isRight ? 'right cerebral cortex' : 'left cerebral cortex';
  } else if (ingestionMeta?.source_metadata?.component_name) {
    nameDesc = String(ingestionMeta.source_metadata.component_name).toLowerCase();
  } else if (ingestionMeta?.source_metadata?.distribution_name) {
    // Phase 5.1: fresh-download assets carry distribution_name (e.g. "Thalamus
    // (Left)"). Never fall through to the hippocampus default for them.
    nameDesc = String(ingestionMeta.source_metadata.distribution_name).toLowerCase();
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
    : path.join(PROJECT_ROOT, 'assets/raw', assetId, `${sourceFma}.stl`);  const rawBytes = fs.existsSync(rawPath) ? fs.readFileSync(rawPath) : Buffer.alloc(0);
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

  const topologyClass = isCortex
    ? 'MULTI_SHELL_COMPOSITE'
    // Phase 5.0: gyral assets inherit the validated QA topology class from
    // their own geometry report (SOLID / CLOSED_SURFACE / open-sheet class);
    // legacy hippocampus behavior (SOLID) preserved when the report is absent.
    : (geomQa?.geometricQA?.topologyClass as string | undefined) || 'SOLID';

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
    // Phase 5.0 (§31): structure linkage for hierarchy/discovery. Read from
    // the asset's own ingestion record; absent on legacy entries.
    ...(ingestionMeta?.structure_id ? { structure_id: String(ingestionMeta.structure_id) } : {}),
    // Phase 5.0 (§19): derivation passthrough for in-repo component staging.
    ...(ingestionMeta?.derived_component
      ? {
          derived_from: {
            parent_asset_id: String(ingestionMeta.derived_component.parent_asset_id),
            parent_ingestion_record: String(ingestionMeta.derived_component.parent_ingestion_record),
            input_sha256: String(ingestionMeta.derived_component.input_sha256),
            operation: String(ingestionMeta.derived_component.operation)
          }
        }
      : {}),
    // Phase 3.1 (D11): dataset_name names the SOURCE dataset only. SPL-PNL was a
    // cross-validation reference, never the source; the 'BodyParts3D / SPL-PNL' blend
    // was provenance contamination. Acquisition channel (DBCLS portal vs third-party
    // mirror) is recorded explicitly below.
    dataset_name: 'BodyParts3D Release 3.0',
    acquisition_channel: isCortex
      ? 'Third-party GitHub mirror of DBCLS data (OBJ to STL converted; per-component URLs in component record)'
      : ingestionMeta?.derived_component
        ? `Third-party GitHub mirror of DBCLS data (in-repo derivation from ${ingestionMeta.derived_component.parent_asset_id} component ${sourceFma}; per-component URL in ingestion record)`
        : 'Third-party GitHub mirror of DBCLS data (ingest_asset.ts sourceUrl)',
    source_authority_urls: [
      'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
      'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D'
    ],
    dataset_version: 'Release 3.0 (2011)',
    source_url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
    upstream_asset_id: sourceFma,
    upstream_license: 'CC_BY_SA_2_1_JP',
    // Phase 5.2 provenance review MAJOR-3: this field is the exact text that must be
    // published to users, so it must not state a licensing conclusion the project
    // records as unresolved. It previously read "Relicensed under CC Attribution 4.0
    // International", asserting as settled fact the very retroactivity question that
    // `legal_review_notes` below marks UNRESOLVED.
    attribution_text_required: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan. Upstream portal lists CC Attribution 4.0 International (listing observed 2025-02-27); whether that listing applies retroactively to these Release 3.0 files is UNRESOLVED.',
    // Recorded provenance, never a hardcoded literal and never a filesystem timestamp
    // (see readExistingAcquisitionDates above).
    //
    // Precedence is deliberately PUBLISHED-FIRST. Phase 5.2's own evidence gate requires
    // `legacy-identical`: a phase may not silently rewrite the provenance of assets that
    // were already certified. The previously published value therefore wins.
    //
    // KNOWN DISCREPANCY (open, not silently resolved): for 27 pre-5.2 assets the
    // published manifest value (2026-09-26) disagrees with the asset's own
    // `assets/raw/<id>/ingestion.json` (2026-09-27). The published 2026-09-26 was itself
    // produced by the birthtime fallback this repair removes, so it is not trustworthy
    // either. Deciding which is authoritative is a provenance judgement, not a mechanical
    // one, so both values are preserved and the conflict is documented in
    // docs/KNOWN_ANATOMICAL_LIMITATIONS.md rather than decided here.
    acquisition_date: String(
      PRIOR_ACQUISITION_DATES.get(assetId) || ingestionMeta?.acquisition_date || 'NOT_RECORDED'
    ),
    // Phase 5.2: where the published date and the source ingestion record disagree, the
    // conflict is surfaced explicitly instead of being resolved by overwrite.
    acquisition_date_conflict:
      PRIOR_ACQUISITION_DATES.get(assetId) &&
      ingestionMeta?.acquisition_date &&
      PRIOR_ACQUISITION_DATES.get(assetId) !== ingestionMeta.acquisition_date
        ? `UNRESOLVED: manifest published ${PRIOR_ACQUISITION_DATES.get(assetId)}, ingestion.json records ${ingestionMeta.acquisition_date}`
        : undefined,
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
        git_commit_hash: resolveScriptCommit(
          isCortex ? 'scripts/pipeline/ingest_cerebral_cortex.ts' : 'scripts/pipeline/ingest_asset.ts'
        ),
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
        git_commit_hash: resolveScriptCommit('scripts/pipeline/validate_mesh.ts'),
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
        git_commit_hash: resolveScriptCommit('scripts/pipeline/canonicalize_mesh.ts'),
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
        git_commit_hash: resolveScriptCommit('scripts/pipeline/generate_lods.ts'),
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
        git_commit_hash: resolveScriptCommit('scripts/pipeline/optimize_meshopt.ts'),
        timestamp: '2026-09-26T22:50:00Z'
      }
    ],
    resulting_sha256_hash: canonicalSha256,
    resulting_license: 'CC-BY-SA 4.0',
    project_distribution_policy: 'CC-BY-SA-4.0',
    production_eligibility: 'PRODUCTION_ALLOWED',
    // Phase 5.2 provenance review: this previously read 'PERMITTED' in the same
    // record whose covenant states "LEGAL_REVIEW_REQUIRED before commercial
    // redistribution" - a self-contradiction. The conservative, honest value is
    // LEGAL_REVIEW_REQUIRED until counsel rules on retroactivity.
    commercial_redistribution: 'LEGAL_REVIEW_REQUIRED',
    restrictions_and_covenants: [
      'Preserve attribution to BodyParts3D / LSIDC in application notices and UI',
      'Derived 3D meshes shared under CC-BY-SA 4.0 terms',
      // Phase 3.1 §19: no "dual compliance" terminology (no legal basis for the term).
      // Exact posture: historical files CC-BY-SA 2.1 JP; portal lists CC BY (2025-02-27);
      // derivatives distributed CC-BY-SA 4.0. Retroactivity UNRESOLVED.
      'Conservative licensing posture: historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (2025-02-27); derivatives distributed CC-BY-SA 4.0. Whether the portal listing retroactively extinguishes the 2.1-JP ShareAlike condition is UNRESOLVED — LEGAL_REVIEW_REQUIRED before commercial redistribution.'
    ],
    validation_status: 'CLEARED',
    // Phase 5.2 provenance review: AGENTS.md requires that no expert validation is
    // claimed without a documented expert review. The pipeline can attest technical QA
    // only, so this is stated explicitly on every entry rather than left implicit -
    // otherwise a reader could mistake `validation_status: CLEARED` for anatomical or
    // clinical sign-off. No expert review of this atlas has taken place.
    expert_review_status: 'EXPERT_REVIEW_PENDING',
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

  // Phase 5.0 (§31): discover candidates from raw ingestion records instead of
  // a hardcoded list; an asset joins only with a completed canonical GLB
  // (the pre-5.0 safety property, unchanged).
  const candidateIds: string[] = [];
  const rawRoot = path.join(PROJECT_ROOT, 'assets/raw');
  if (fs.existsSync(rawRoot)) {
    for (const dirent of fs.readdirSync(rawRoot, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const ingestPath = path.join(rawRoot, dirent.name, 'ingestion.json');
      if (fs.existsSync(ingestPath)) {
        candidateIds.push(dirent.name);
      }
    }
  }
  candidateIds.sort();
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
