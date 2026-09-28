/**
 * 3D Neuroanatomy Atlas: Phase 5.3 White-Matter / Major-Pathway Batch Preparation
 * Standard: AAS-2026-NEURO-V1
 *
 * Stages fresh mirror downloads into `assets/raw/<assetId>/` with full
 * ingestion.json. Laterality from MEASURED source geometry, never filenames
 * alone (§20): midline singles must span X=0; paired segments assert the
 * source-frame bbox-center sign (asserted DICOM LPS whole-body: +X is Left)
 * with the bulk of the span on the declared side. A sub-millimetre midline
 * touch on near-commissural paired segments (measured, documented) does not
 * reclassify them. No subdivision is fabricated: the corpus callosum ships as
 * one whole commissure, each fornix as one unsegmented lateralised segment,
 * and only the sourced anterior limb of the internal capsule is imported.
 *
 * Emits `data/phase53_batch.json` for the generalized batch runner.
 *
 * Thin wrapper over the shared staging core (`batch_staging.ts`): this file
 * owns the tract item table + spec only, exactly as the posterior wrapper
 * does for 5.2 — including pinned-hash gating and acquisition-date
 * preservation.
 *
 * Usage: `npx tsx scripts/pipeline/prepare_tract_batch.ts` (repo-root CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  prepareBatch,
  sha256Bytes,
  measureSourceX,
  loadPinnedSourceHashes,
  readPriorAcquisitionDate,
  stageCopyImmutable,
  todayDate,
  type PrepVerdict
} from './batch_staging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const PINNED_HASH_PATH = 'data/phase53_source_hashes.json';

export type TractPrepVerdict = PrepVerdict;

export interface TractBatchItem {
  structureName: string;
  structureId: string;
  assetId: string;
  fmaId: string;
  expectedLaterality: 'left' | 'right' | 'midline';
  category: 'WHITE_MATTER';
  parentId: string;
  groups: string[];
  latinName: string;
  subsystem: string;
}

const ITEMS: TractBatchItem[] = [
  { structureName: 'Corpus callosum', structureId: 'brain.white_matter.corpus_callosum', assetId: 'mesh.corpus_callosum.midline.v1', fmaId: 'FMA86464', expectedLaterality: 'midline', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.commissures'], latinName: 'Corpus callosum', subsystem: 'white_matter' },
  { structureName: 'Anterior limb of internal capsule (right)', structureId: 'brain.white_matter.internal_capsule_anterior_limb_right', assetId: 'mesh.internal_capsule_anterior_limb.right.v1', fmaId: 'FMA72908', expectedLaterality: 'right', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.internal_capsule'], latinName: 'Crus anterius capsulae internae', subsystem: 'white_matter' },
  { structureName: 'Anterior limb of internal capsule (left)', structureId: 'brain.white_matter.internal_capsule_anterior_limb_left', assetId: 'mesh.internal_capsule_anterior_limb.left.v1', fmaId: 'FMA72909', expectedLaterality: 'left', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.internal_capsule'], latinName: 'Crus anterius capsulae internae', subsystem: 'white_matter' },
  { structureName: 'Fornix (right)', structureId: 'brain.white_matter.fornix_right', assetId: 'mesh.fornix.right.v1', fmaId: 'FMA72924', expectedLaterality: 'right', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.fornix'], latinName: 'Fornix', subsystem: 'white_matter' },
  { structureName: 'Fornix (left)', structureId: 'brain.white_matter.fornix_left', assetId: 'mesh.fornix.left.v1', fmaId: 'FMA72925', expectedLaterality: 'left', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.fornix'], latinName: 'Fornix', subsystem: 'white_matter' },
  { structureName: 'Commissure of fornix', structureId: 'brain.white_matter.fornix_commissure', assetId: 'mesh.fornix_commissure.midline.v1', fmaId: 'FMA61970', expectedLaterality: 'midline', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.commissures'], latinName: 'Commissura fornicis', subsystem: 'white_matter' },
  { structureName: 'Anterior commissure', structureId: 'brain.white_matter.anterior_commissure', assetId: 'mesh.anterior_commissure.midline.v1', fmaId: 'FMA61961', expectedLaterality: 'midline', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.commissures'], latinName: 'Commissura anterior', subsystem: 'white_matter' },
  { structureName: 'Posterior commissure', structureId: 'brain.white_matter.posterior_commissure', assetId: 'mesh.posterior_commissure.midline.v1', fmaId: 'FMA62072', expectedLaterality: 'midline', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.commissures'], latinName: 'Commissura posterior', subsystem: 'white_matter' },
  { structureName: 'Optic tract (right)', structureId: 'brain.white_matter.optic_tract_right', assetId: 'mesh.optic_tract.right.v1', fmaId: 'FMA62382', expectedLaterality: 'right', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.optic_tract'], latinName: 'Tractus opticus', subsystem: 'white_matter' },
  { structureName: 'Optic tract (left)', structureId: 'brain.white_matter.optic_tract_left', assetId: 'mesh.optic_tract.left.v1', fmaId: 'FMA67936', expectedLaterality: 'left', category: 'WHITE_MATTER', parentId: 'brain.white_matter', groups: ['division.white_matter', 'region.optic_tract'], latinName: 'Tractus opticus', subsystem: 'white_matter' }
];

export function prepareTractBatch(): TractPrepVerdict[] {
  return prepareBatch({
    items: ITEMS,
    projectRoot: PROJECT_ROOT,
    batchName: 'phase53-tract-white-matter',
    generator: 'scripts/pipeline/prepare_tract_batch.ts',
    ledgerRelativePath: 'data/phase53_batch.json',
    stageDirEnvName: 'AUDIT_STAGE_DIR',
    stageDirDefault: 'C:/Projects/_audit_tmp',
    prepareOne: (item, ctx) => {
      // Pinned-hash gating (Phase 5.2 CRITICAL-2 pattern): staged bytes are
      // compared against the committed pins in data/phase53_source_hashes.json,
      // never against themselves. A swapped or re-converted mirror artifact is
      // REJECTED here, never ingested silently.
      const pinned = loadPinnedSourceHashes(ctx.projectRoot, PINNED_HASH_PATH);
      const staged = path.join(ctx.stageDir, `phase53_${item.fmaId}.stl`);
      if (!fs.existsSync(staged)) throw new Error(`Staged download missing: ${staged}`);
      const hash = sha256Bytes(fs.readFileSync(staged));
      const expected = pinned.get(item.fmaId);
      if (!expected) {
        throw new Error(
          `No pinned expected SHA-256 for ${item.fmaId} in data/phase53_source_hashes.json. ` +
          `Refusing to ingest an unpinned mirror download - STOP, do not guess.`
        );
      }
      if (hash !== expected) {
        throw new Error(
          `SOURCE INTEGRITY FAILURE for ${item.fmaId}: staged SHA-256 ${hash} does not match ` +
          `pinned expected ${expected}. Mirror swap / re-conversion suspected. REJECTED.`
        );
      }
      const geo = measureSourceX(staged);
      const centerX = (geo.minX + geo.maxX) / 2;
      if (item.expectedLaterality === 'midline') {
        // Midline-span check: midline commissures must span X=0. A strictly
        // one-sided mesh here = wrong file.
        if (!(geo.minX < 0 && geo.maxX > 0)) {
          throw new Error(`Expected midline-spanning source geometry, measured X ${geo.minX}..${geo.maxX}. STOP — no guessing.`);
        }
      } else {
        // Paired-geometry check in the ASSERTED source frame (DICOM LPS
        // whole-body: +X is Left, so right segments carry negative X). The
        // bbox CENTER must sit on the declared side with the bulk of the span
        // there; a sub-millimetre midline touch on near-commissural segments
        // (measured, documented in the QA report) does not reclassify them.
        const wantNegative = item.expectedLaterality === 'right';
        const centerOk = wantNegative ? centerX < 0 : centerX > 0;
        const extentOk = wantNegative ? geo.minX < 0 : geo.maxX > 0;
        const spill = wantNegative ? Math.max(0, geo.maxX) : Math.max(0, -geo.minX);
        if (!centerOk || !extentOk || spill > 2) {
          throw new Error(
            `Expected ${item.expectedLaterality}-sided source geometry, measured X ${geo.minX}..${geo.maxX} (center ${centerX}). STOP — no guessing.`
          );
        }
      }
      const rawDir = path.join(ctx.projectRoot, 'assets/raw', item.assetId);
      const ingestionPath = path.join(rawDir, 'ingestion.json');
      // Acquisition-date precedence: the already-recorded value wins (never
      // rewritten); a fresh staging records the genuine run date, never a
      // filesystem timestamp and never an invented back-date.
      const priorAcquisitionDate = readPriorAcquisitionDate(ingestionPath);
      stageCopyImmutable(rawDir, `${item.fmaId}.stl`, staged, hash);
      const ingestion = {
        asset_id: item.assetId,
        assetId: item.assetId,
        structure_id: item.structureId,
        source_dataset: 'BodyParts3D (Database Center for Life Sciences - DBCLS, Japan)',
        source_dataset_version: 'Release 3.0 (2011/06/20)',
        source_asset_id: item.fmaId,
        source_url: `https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/master/assets/BodyParts3D_data/stl/${item.fmaId}.stl`,
        source_license: 'Historical files CC-BY-SA 2.1 JP; upstream portal lists CC BY (verified 2025-02-27). Retroactivity UNRESOLVED — LEGAL_REVIEW_REQUIRED before commercial redistribution.',
        source_license_version: 'CC BY 4.0 (2025-02-27 portal update) / CC-BY-SA 2.1 JP',
        project_distribution_policy: 'CC-BY-SA-4.0',
        attribution: 'BodyParts3D, Copyright (c) 2008-2011 Life Science Integrated Database Center licensed by CC Attribution-Share Alike 2.1 Japan. Upstream portal lists CC Attribution 4.0 International (listing observed 2025-02-27); whether that listing applies retroactively to these Release 3.0 files is UNRESOLVED.',
        acquisition_date: priorAcquisitionDate ?? todayDate(),
        original_filename: `${item.fmaId}.stl`,
        originalFilename: `${item.fmaId}.stl`,
        original_format: 'binary STL (BodyParts3D segment)',
        original_hash: hash,
        source_coordinate_space: 'dicom_lps_whole_body',
        source_units: 'millimeters (mm)',
        source_metadata: {
          distribution_name: item.structureName,
          distribution_laterality: item.expectedLaterality,
          asset_category: item.category,
          measured_source_center_x_mm: geo.centerX,
          measured_source_triangles: geo.tris,
          laterality_basis: item.expectedLaterality === 'midline'
            ? 'midline-spanning source geometry (single midline commissure)'
            : 'paired-segment source geometry: bbox center on the declared side in the asserted source frame (DICOM LPS, +X Left), bulk of span declared-side'
        },
        ingestion_status: 'SOURCE_VERIFIED'
      };
      // Hash-gating scope (Phase 5.2 CRITICAL-2 pattern): the hash IS gated
      // against a committed pin, but that pin attests the third-party
      // mirror's CONVERTED bytes; equivalence to a DBCLS-original artifact is
      // not established.
      return {
        rawDir,
        ingestion,
        detail: `Staged ${item.fmaId} (${geo.tris} tris), SHA-256 matches committed pin in ${PINNED_HASH_PATH}; ${item.expectedLaterality}-geometry measured (X ${geo.minX.toFixed(1)}..${geo.maxX.toFixed(1)}). Mirror conversion itself remains MIRROR_CONVERSION_UNVERIFIED.`
      };
    },
    successVerdict: (item, result) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      state: 'SOURCE_AVAILABLE',
      category: item.category,
      detail: result.detail
    }),
    failureVerdict: (item, message) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      category: item.category,
      state: 'PREP_FAILED',
      detail: message
    })
  });
}

export function tractBatchItems(): TractBatchItem[] {
  return ITEMS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = prepareTractBatch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) process.exit(1);
}
