/**
 * 3D Neuroanatomy Atlas: Phase 5.2 Posterior-Fossa/Ventricular Batch Preparation
 * Standard: AAS-2026-NEURO-V1
 *
 * Stages fresh mirror downloads into `assets/raw/<assetId>/` with full
 * ingestion.json. Laterality from MEASURED source geometry: midline-spanning
 * singles classify BILATERAL (paired organs) or MIDLINE (cavities/foramina)
 * per the item table — never filenames alone (§20). Brainstem continuity is
 * preserved by importing whole segments (no splits).
 * Emits `data/phase52_batch.json` for the batch runner.
 *
 * Thin wrapper over the shared staging core (`batch_staging.ts`): this file
 * owns the posterior item table + spec only. Behaviour is unchanged —
 * including pinned-hash gating and acquisition-date preservation.
 *
 * Usage: `npx tsx scripts/pipeline/prepare_posterior_batch.ts` (repo-root CWD).
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
  type PrepVerdict
} from './batch_staging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const PINNED_HASH_PATH = 'data/phase52_source_hashes.json';

export type PosteriorPrepVerdict = PrepVerdict;

export interface PosteriorBatchItem {
  structureName: string;
  structureId: string;
  assetId: string;
  fmaId: string;
  expectedLaterality: 'bilateral' | 'midline';
  category: 'BRAINSTEM' | 'CEREBELLUM' | 'VENTRICULAR_SPACE';
  parentId: string;
  groups: string[];
  latinName: string;
  subsystem: string;
}

const ITEMS: PosteriorBatchItem[] = [
  { structureName: 'Pons', structureId: 'brain.brainstem.pons', assetId: 'mesh.pons.bilateral.v1', fmaId: 'FMA67943', expectedLaterality: 'bilateral', category: 'BRAINSTEM', parentId: 'brain.brainstem', groups: ['division.brainstem', 'region.pons'], latinName: 'Pons', subsystem: 'brainstem' },
  { structureName: 'Medulla oblongata', structureId: 'brain.brainstem.medulla_oblongata', assetId: 'mesh.medulla_oblongata.bilateral.v1', fmaId: 'FMA62004', expectedLaterality: 'bilateral', category: 'BRAINSTEM', parentId: 'brain.brainstem', groups: ['division.brainstem', 'region.medulla'], latinName: 'Medulla oblongata', subsystem: 'brainstem' },
  { structureName: 'Cerebellum', structureId: 'brain.cerebellum.cerebellum', assetId: 'mesh.cerebellum.bilateral.v1', fmaId: 'FMA67944', expectedLaterality: 'bilateral', category: 'CEREBELLUM', parentId: 'brain.cerebellum', groups: ['division.cerebellum', 'region.cerebellum'], latinName: 'Cerebellum', subsystem: 'cerebellum' },
  { structureName: 'Third ventricle', structureId: 'brain.ventricular_system.third_ventricle', assetId: 'mesh.third_ventricle.midline.v1', fmaId: 'FMA78454', expectedLaterality: 'midline', category: 'VENTRICULAR_SPACE', parentId: 'brain.ventricular_system', groups: ['division.ventricular_system', 'region.ventricles'], latinName: 'Ventriculus tertius', subsystem: 'ventricular_system' },
  { structureName: 'Fourth ventricle', structureId: 'brain.ventricular_system.fourth_ventricle', assetId: 'mesh.fourth_ventricle.midline.v1', fmaId: 'FMA78469', expectedLaterality: 'midline', category: 'VENTRICULAR_SPACE', parentId: 'brain.ventricular_system', groups: ['division.ventricular_system', 'region.ventricles'], latinName: 'Ventriculus quartus', subsystem: 'ventricular_system' },
  { structureName: 'Cerebral aqueduct', structureId: 'brain.ventricular_system.cerebral_aqueduct', assetId: 'mesh.cerebral_aqueduct.midline.v1', fmaId: 'FMA78467', expectedLaterality: 'midline', category: 'VENTRICULAR_SPACE', parentId: 'brain.ventricular_system', groups: ['division.ventricular_system', 'region.ventricles'], latinName: 'Aqueductus cerebri', subsystem: 'ventricular_system' },
  { structureName: 'Interventricular foramen', structureId: 'brain.ventricular_system.interventricular_foramen', assetId: 'mesh.interventricular_foramen.midline.v1', fmaId: 'FMA75351', expectedLaterality: 'midline', category: 'VENTRICULAR_SPACE', parentId: 'brain.ventricular_system', groups: ['division.ventricular_system', 'region.ventricles'], latinName: 'Foramen interventriculare', subsystem: 'ventricular_system' }
];

export function preparePosteriorBatch(): PosteriorPrepVerdict[] {
  return prepareBatch({
    items: ITEMS,
    projectRoot: PROJECT_ROOT,
    batchName: 'phase52-posterior-ventricular',
    generator: 'scripts/pipeline/prepare_posterior_batch.ts',
    ledgerRelativePath: 'data/phase52_batch.json',
    // Architecture M1: this was a hardcoded absolute path to one
    // contributor's machine, making the stage step non-portable and
    // non-reproducible. Override with AUDIT_STAGE_DIR; the default is
    // documented in docs/PHASE_5_2_ASSET_QA.md.
    stageDirEnvName: 'AUDIT_STAGE_DIR',
    stageDirDefault: 'C:/Projects/_audit_tmp',
    prepareOne: (item, ctx) => {
      // CRITICAL-2: staged bytes are gated against a committed set of
      // expected hashes. A swapped or re-converted mirror artifact is
      // REJECTED here, never ingested silently.
      const pinned = loadPinnedSourceHashes(ctx.projectRoot, PINNED_HASH_PATH);
      const staged = path.join(ctx.stageDir, `phase52_${item.fmaId}.stl`);
      if (!fs.existsSync(staged)) throw new Error(`Staged download missing: ${staged}`);
      const hash = sha256Bytes(fs.readFileSync(staged));
      const expected = pinned.get(item.fmaId);
      if (!expected) {
        throw new Error(
          `No pinned expected SHA-256 for ${item.fmaId} in data/phase52_source_hashes.json. ` +
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
      // Midline-span check: all 5.2 items must span X=0 (bilateral organs and
      // midline cavities alike). A strictly one-sided mesh here = wrong file.
      if (!(geo.minX < 0 && geo.maxX > 0)) {
        throw new Error(`Expected midline-spanning source geometry, measured X ${geo.minX}..${geo.maxX}. STOP — no guessing.`);
      }
      const rawDir = path.join(ctx.projectRoot, 'assets/raw', item.assetId);
      const ingestionPath = path.join(rawDir, 'ingestion.json');
      // Architecture M8: preserve the already-recorded acquisition date.
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
        // Architecture M8: acquisition_date is preserved from the existing
        // record when present and is otherwise an explicit, non-fabricated gap.
        acquisition_date: priorAcquisitionDate ?? 'NOT_RECORDED',
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
          laterality_basis: 'midline-spanning source geometry (bilateral organ or midline cavity)'
        },
        ingestion_status: 'SOURCE_VERIFIED'
      };
      // CRITICAL-2: the wording is deliberately precise. The hash IS gated
      // against a committed pin now, but that pin attests the third-party
      // mirror's CONVERTED bytes; equivalence to a DBCLS-original artifact is
      // not established.
      return {
        rawDir,
        ingestion,
        detail: `Staged ${item.fmaId} (${geo.tris} tris), SHA-256 matches committed pin in ${PINNED_HASH_PATH}; midline-span measured. Mirror conversion itself remains MIRROR_CONVERSION_UNVERIFIED.`
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

export function posteriorBatchItems(): PosteriorBatchItem[] {
  return ITEMS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = preparePosteriorBatch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) process.exit(1);
}
