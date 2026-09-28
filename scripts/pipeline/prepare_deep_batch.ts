/**
 * 3D Neuroanatomy Atlas: Phase 5.1 Deep/Limbic Batch Preparation
 * Standard: AAS-2026-NEURO-V1
 *
 * Stages FRESH mirror downloads (verified BodyParts3D chain) into
 * `assets/raw/<assetId>/` with full ingestion.json (ingestAsset schema +
 * derivation block). Laterality is asserted from MEASURED source-frame
 * geometry (source +X maps to canonical LEFT via Xc=-Xs; midline-spanning
 * meshes classify BILATERAL/MIDLINE) — never from filenames alone (§20).
 * Emits `data/phase51_batch.json` for the batch runner.
 *
 * Thin wrapper over the shared staging core (`batch_staging.ts`): this file
 * owns the deep item table + spec only. Behaviour is unchanged.
 *
 * Usage: `npx tsx scripts/pipeline/prepare_deep_batch.ts` (repo-root CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  prepareBatch,
  sha256Bytes,
  measureSourceBbox,
  stageCopyImmutable,
  todayDate,
  type PrepVerdict
} from './batch_staging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export type DeepPrepVerdict = PrepVerdict;

export interface DeepBatchItem {
  structureName: string;
  structureId: string;
  assetId: string;
  fmaId: string;
  expectedLaterality: 'left' | 'right' | 'bilateral' | 'midline';
  parentId: string;
  groups: string[];
  latinName: string;
  subsystem: string;
  // Architecture N4: carried through the ledger so run_gyral_batch.ts can
  // select a category-appropriate QA profile instead of defaulting to
  // cortical names. Absent here, so the spec defaults to 'DEEP_GRAY'.
  category?: string;
}

const ITEMS: DeepBatchItem[] = [
  { structureName: 'Thalamus (Left)', structureId: 'brain.diencephalon.left.thalamus', assetId: 'mesh.thalamus.left.v1', fmaId: 'FMA258716', expectedLaterality: 'left', parentId: 'brain.diencephalon', groups: ['division.diencephalon', 'hemisphere.left', 'region.thalamus'], latinName: 'Thalamus', subsystem: 'diencephalon' },
  { structureName: 'Thalamus (Right)', structureId: 'brain.diencephalon.right.thalamus', assetId: 'mesh.thalamus.right.v1', fmaId: 'FMA258714', expectedLaterality: 'right', parentId: 'brain.diencephalon', groups: ['division.diencephalon', 'hemisphere.right', 'region.thalamus'], latinName: 'Thalamus', subsystem: 'diencephalon' },
  { structureName: 'Caudate nucleus (Left)', structureId: 'brain.basal_ganglia.left.caudate_nucleus', assetId: 'mesh.caudate_nucleus.left.v1', fmaId: 'FMA72827', expectedLaterality: 'left', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.left'], latinName: 'Nucleus caudatus', subsystem: 'basal_ganglia' },
  { structureName: 'Caudate nucleus (Right)', structureId: 'brain.basal_ganglia.right.caudate_nucleus', assetId: 'mesh.caudate_nucleus.right.v1', fmaId: 'FMA72826', expectedLaterality: 'right', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.right'], latinName: 'Nucleus caudatus', subsystem: 'basal_ganglia' },
  { structureName: 'Putamen (Left)', structureId: 'brain.basal_ganglia.left.putamen', assetId: 'mesh.putamen.left.v1', fmaId: 'FMA72829', expectedLaterality: 'left', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.left'], latinName: 'Putamen', subsystem: 'basal_ganglia' },
  { structureName: 'Putamen (Right)', structureId: 'brain.basal_ganglia.right.putamen', assetId: 'mesh.putamen.right.v1', fmaId: 'FMA72828', expectedLaterality: 'right', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.right'], latinName: 'Putamen', subsystem: 'basal_ganglia' },
  { structureName: 'Globus pallidus (Left)', structureId: 'brain.basal_ganglia.left.globus_pallidus', assetId: 'mesh.globus_pallidus.left.v1', fmaId: 'FMA72831', expectedLaterality: 'left', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.left'], latinName: 'Globus pallidus', subsystem: 'basal_ganglia' },
  { structureName: 'Globus pallidus (Right)', structureId: 'brain.basal_ganglia.right.globus_pallidus', assetId: 'mesh.globus_pallidus.right.v1', fmaId: 'FMA72830', expectedLaterality: 'right', parentId: 'brain.basal_ganglia', groups: ['system.basal_ganglia', 'hemisphere.right'], latinName: 'Globus pallidus', subsystem: 'basal_ganglia' },
  { structureName: 'Amygdala (Left)', structureId: 'brain.telencephalon.left.limbic.amygdala', assetId: 'mesh.amygdala.left.v1', fmaId: 'FMA72833', expectedLaterality: 'left', parentId: 'brain.telencephalon.left.limbic_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'system.limbic'], latinName: 'Corpus amygdaloideum', subsystem: 'limbic_system' },
  { structureName: 'Amygdala (Right)', structureId: 'brain.telencephalon.right.limbic.amygdala', assetId: 'mesh.amygdala.right.v1', fmaId: 'FMA72832', expectedLaterality: 'right', parentId: 'brain.telencephalon.right.limbic_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'system.limbic'], latinName: 'Corpus amygdaloideum', subsystem: 'limbic_system' },
  { structureName: 'Mammillary body', structureId: 'brain.diencephalon.bilateral.hypothalamus.mammillary_body', assetId: 'mesh.mammillary_body.bilateral.v1', fmaId: 'FMA74877', expectedLaterality: 'bilateral', parentId: 'brain.diencephalon.hypothalamus', groups: ['division.diencephalon', 'region.hypothalamus'], latinName: 'Corpus mammillare', subsystem: 'diencephalon' },
  { structureName: 'Septum pellucidum', structureId: 'brain.telencephalon.midline.septum_pellucidum', assetId: 'mesh.septum_pellucidum.midline.v1', fmaId: 'FMA61844', expectedLaterality: 'midline', parentId: 'brain.telencephalon', groups: ['division.cerebrum', 'region.septal'], latinName: 'Septum pellucidum', subsystem: 'telencephalon' }
];

export function prepareDeepBatch(): DeepPrepVerdict[] {
  return prepareBatch({
    items: ITEMS,
    projectRoot: PROJECT_ROOT,
    batchName: 'phase51-deep-limbic',
    generator: 'scripts/pipeline/prepare_deep_batch.ts',
    ledgerRelativePath: 'data/phase51_batch.json',
    // Architecture M1: was hardcoded to one contributor's machine. Override
    // with AUDIT_STAGE_DIR; default retained for continuity with prior runs.
    stageDirEnvName: 'AUDIT_STAGE_DIR',
    stageDirDefault: 'C:/Projects/_audit_tmp',
    prepareOne: (item, ctx) => {
      const staged = path.join(ctx.stageDir, `phase51_${item.fmaId}.stl`);
      if (!fs.existsSync(staged)) throw new Error(`Staged download missing: ${staged}`);
      const hash = sha256Bytes(fs.readFileSync(staged));
      const geo = measureSourceBbox(staged);
      // Laterality from MEASURED source geometry (Xc=-Xs ⇒ source +X is canonical LEFT).
      const spansMidline = geo.minX < 0 && geo.maxX > 0;
      const measured: 'left' | 'right' | 'midline-span' =
        spansMidline && Math.abs(geo.center[0]) < 5 ? 'midline-span' : geo.center[0] > 0 ? 'left' : 'right';
      const expected = item.expectedLaterality === 'bilateral' || item.expectedLaterality === 'midline' ? 'midline-span' : item.expectedLaterality;
      if (measured !== expected) {
        throw new Error(`Laterality mismatch: distribution=${item.expectedLaterality}, measured source geometry=${measured} (center X=${geo.center[0]}). STOP — no guessing.`);
      }
      const rawDir = path.join(ctx.projectRoot, 'assets/raw', item.assetId);
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
        acquisition_date: todayDate(),
        original_filename: `${item.fmaId}.stl`,
        originalFilename: `${item.fmaId}.stl`,
        original_format: 'binary STL (BodyParts3D segment)',
        original_hash: hash,
        source_coordinate_space: 'dicom_lps_whole_body',
        source_units: 'millimeters (mm)',
        source_metadata: {
          distribution_name: item.structureName,
          distribution_laterality: item.expectedLaterality,
          measured_source_centroid_mm: geo.center,
          measured_source_triangles: geo.tris,
          laterality_basis: 'distribution record + measured source-frame geometry (Xc=-Xs mapping)'
        },
        ingestion_status: 'SOURCE_VERIFIED'
      };
      return {
        rawDir,
        ingestion,
        detail: `Staged ${item.fmaId} (${geo.tris} tris), hash + laterality verified.`
      };
    },
    successVerdict: (item, result) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      category: item.category ?? 'DEEP_GRAY',
      state: 'SOURCE_AVAILABLE',
      detail: result.detail
    }),
    failureVerdict: (item, message) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      category: item.category ?? 'DEEP_GRAY',
      state: 'PREP_FAILED',
      detail: message
    })
  });
}

export function deepBatchItems(): DeepBatchItem[] {
  return ITEMS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = prepareDeepBatch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) process.exit(1);
}
