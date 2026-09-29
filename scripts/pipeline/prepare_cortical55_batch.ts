/**
 * 3D Neuroanatomy Atlas: Phase 5.5 Cortical-Completion Batch Preparation
 * Standard: AAS-2026-NEURO-V1
 *
 * Stages fresh mirror downloads into `assets/raw/<assetId>/` with full
 * ingestion.json. Laterality from MEASURED source geometry, never filenames
 * alone (§20): every 5.5 item is a paired lateralised segment, so each asserts
 * the source-frame bbox-center sign (asserted DICOM LPS whole-body: +X is
 * Left) with the bulk of the span on the declared side. A sub-millimetre
 * midline touch on near-midline segments (measured, documented in the QA
 * report — e.g. the left occipital lobe touches X=-0.1 mm) does not
 * reclassify them. No subdivision is fabricated: the superior temporal gyrus
 * ships ONLY as its two sourced parts (anterior FMA72800/72801, posterior
 * FMA72804/72805); the whole-STG mesh is NOT synthesized and stays
 * DOCUMENTED. BP48/49/50 (superior parietal / precuneus, non-standard BP
 * identifiers) are NOT attempted (uncertain-source-identity hard stop).
 *
 * The 14 meshes are DISCONNECTED distribution segments. Nothing here bridges
 * gaps, smooths seams, or joins pia: continuity is documented as ABSENT (see
 * docs/PHASE_5_5_ANATOMICAL_SCOPE.md continuity decision), never implemented
 * in geometry. These are surface-derived segments, never atlas parcels: no
 * parcel mapping is performed or implied (parcel-conflation hard stop).
 *
 * Emits `data/phase55_batch.json` for the generalized batch runner.
 *
 * Thin wrapper over the shared staging core (`batch_staging.ts`): this file
 * owns the cortical-5.5 item table + spec only, exactly as the tract wrapper
 * does for 5.3 — including pinned-hash gating and acquisition-date
 * preservation. The `CORTEX` category preserves the historical cortical
 * profile names in the runner (closed-pial-surface / composite-cortical-
 * assembly / open-cortical-sheet, measured not assumed); no cavity, solid,
 * or new profile name is forced and none is invented.
 *
 * Usage: `npx tsx scripts/pipeline/prepare_cortical55_batch.ts` (repo-root CWD).
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
const PINNED_HASH_PATH = 'data/phase55_source_hashes.json';

export type Cortical55PrepVerdict = PrepVerdict;

export interface Cortical55BatchItem {
  structureName: string;
  structureId: string;
  assetId: string;
  fmaId: string;
  expectedLaterality: 'left' | 'right';
  category: 'CORTEX';
  lobe: string;
  parentId: string;
  groups: string[];
  latinName: string;
  subsystem: string;
}

const ITEMS: Cortical55BatchItem[] = [
  { structureName: 'Inferior temporal gyrus (right)', structureId: 'brain.telencephalon.right.temporal_lobe.inferior_temporal_gyrus', assetId: 'mesh.inferior_temporal_gyrus.right.v1', fmaId: 'FMA72687', expectedLaterality: 'right', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.right.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.temporal'], latinName: 'Gyrus temporalis inferior', subsystem: 'neocortex' },
  { structureName: 'Inferior temporal gyrus (left)', structureId: 'brain.telencephalon.left.temporal_lobe.inferior_temporal_gyrus', assetId: 'mesh.inferior_temporal_gyrus.left.v1', fmaId: 'FMA72688', expectedLaterality: 'left', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.left.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.temporal'], latinName: 'Gyrus temporalis inferior', subsystem: 'neocortex' },
  { structureName: 'Fusiform gyrus (right)', structureId: 'brain.telencephalon.right.temporal_lobe.fusiform_gyrus', assetId: 'mesh.fusiform_gyrus.right.v1', fmaId: 'FMA72689', expectedLaterality: 'right', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.right.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.temporal'], latinName: 'Gyrus fusiformis', subsystem: 'neocortex' },
  { structureName: 'Fusiform gyrus (left)', structureId: 'brain.telencephalon.left.temporal_lobe.fusiform_gyrus', assetId: 'mesh.fusiform_gyrus.left.v1', fmaId: 'FMA72690', expectedLaterality: 'left', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.left.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.temporal'], latinName: 'Gyrus fusiformis', subsystem: 'neocortex' },
  { structureName: 'Parahippocampal gyrus (right)', structureId: 'brain.telencephalon.right.limbic.parahippocampal_gyrus', assetId: 'mesh.parahippocampal_gyrus.right.v1', fmaId: 'FMA72705', expectedLaterality: 'right', category: 'CORTEX', lobe: 'limbic', parentId: 'brain.telencephalon.right.limbic_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.limbic'], latinName: 'Gyrus parahippocampalis', subsystem: 'limbic_system' },
  { structureName: 'Parahippocampal gyrus (left)', structureId: 'brain.telencephalon.left.limbic.parahippocampal_gyrus', assetId: 'mesh.parahippocampal_gyrus.left.v1', fmaId: 'FMA72706', expectedLaterality: 'left', category: 'CORTEX', lobe: 'limbic', parentId: 'brain.telencephalon.left.limbic_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.limbic'], latinName: 'Gyrus parahippocampalis', subsystem: 'limbic_system' },
  { structureName: 'Superior temporal gyrus, anterior part (right)', structureId: 'brain.telencephalon.right.temporal_lobe.superior_temporal_gyrus_anterior', assetId: 'mesh.superior_temporal_gyrus_anterior.right.v1', fmaId: 'FMA72800', expectedLaterality: 'right', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.right.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.temporal'], latinName: 'Gyrus temporalis superior (pars anterior)', subsystem: 'neocortex' },
  { structureName: 'Superior temporal gyrus, anterior part (left)', structureId: 'brain.telencephalon.left.temporal_lobe.superior_temporal_gyrus_anterior', assetId: 'mesh.superior_temporal_gyrus_anterior.left.v1', fmaId: 'FMA72801', expectedLaterality: 'left', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.left.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.temporal'], latinName: 'Gyrus temporalis superior (pars anterior)', subsystem: 'neocortex' },
  { structureName: 'Superior temporal gyrus, posterior part (right)', structureId: 'brain.telencephalon.right.temporal_lobe.superior_temporal_gyrus_posterior', assetId: 'mesh.superior_temporal_gyrus_posterior.right.v1', fmaId: 'FMA72804', expectedLaterality: 'right', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.right.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.temporal'], latinName: 'Gyrus temporalis superior (pars posterior)', subsystem: 'neocortex' },
  { structureName: 'Superior temporal gyrus, posterior part (left)', structureId: 'brain.telencephalon.left.temporal_lobe.superior_temporal_gyrus_posterior', assetId: 'mesh.superior_temporal_gyrus_posterior.left.v1', fmaId: 'FMA72805', expectedLaterality: 'left', category: 'CORTEX', lobe: 'temporal', parentId: 'brain.telencephalon.left.temporal_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.temporal'], latinName: 'Gyrus temporalis superior (pars posterior)', subsystem: 'neocortex' },
  { structureName: 'Insula (right)', structureId: 'brain.telencephalon.right.insular_lobe.insula', assetId: 'mesh.insula.right.v1', fmaId: 'FMA72977', expectedLaterality: 'right', category: 'CORTEX', lobe: 'insular', parentId: 'brain.telencephalon.right.insular_lobe', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.insular'], latinName: 'Insula', subsystem: 'insular_cortex' },
  { structureName: 'Insula (left)', structureId: 'brain.telencephalon.left.insular_lobe.insula', assetId: 'mesh.insula.left.v1', fmaId: 'FMA72978', expectedLaterality: 'left', category: 'CORTEX', lobe: 'insular', parentId: 'brain.telencephalon.left.insular_lobe', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.insular'], latinName: 'Insula', subsystem: 'insular_cortex' },
  { structureName: 'Occipital lobe (right)', structureId: 'brain.telencephalon.right.occipital_lobe', assetId: 'mesh.occipital_lobe.right.v1', fmaId: 'FMA72975', expectedLaterality: 'right', category: 'CORTEX', lobe: 'occipital', parentId: 'brain.telencephalon.right', groups: ['division.cerebrum', 'hemisphere.right', 'lobe.occipital'], latinName: 'Lobus occipitalis', subsystem: 'neocortex' },
  { structureName: 'Occipital lobe (left)', structureId: 'brain.telencephalon.left.occipital_lobe', assetId: 'mesh.occipital_lobe.left.v1', fmaId: 'FMA72976', expectedLaterality: 'left', category: 'CORTEX', lobe: 'occipital', parentId: 'brain.telencephalon.left', groups: ['division.cerebrum', 'hemisphere.left', 'lobe.occipital'], latinName: 'Lobus occipitalis', subsystem: 'neocortex' }
];

export function prepareCortical55Batch(): Cortical55PrepVerdict[] {
  return prepareBatch({
    items: ITEMS,
    projectRoot: PROJECT_ROOT,
    batchName: 'phase55-cortical-completion',
    generator: 'scripts/pipeline/prepare_cortical55_batch.ts',
    ledgerRelativePath: 'data/phase55_batch.json',
    stageDirEnvName: 'AUDIT_STAGE_DIR',
    stageDirDefault: 'C:/Projects/_audit_tmp',
    prepareOne: (item, ctx) => {
      // Pinned-hash gating (Phase 5.2 CRITICAL-2 pattern): staged bytes are
      // compared against the committed pins in data/phase55_source_hashes.json,
      // never against themselves. A swapped or re-converted mirror artifact is
      // REJECTED here, never ingested silently.
      const pinned = loadPinnedSourceHashes(ctx.projectRoot, PINNED_HASH_PATH);
      const staged = path.join(ctx.stageDir, `phase55_${item.fmaId}.stl`);
      if (!fs.existsSync(staged)) throw new Error(`Staged download missing: ${staged}`);
      const hash = sha256Bytes(fs.readFileSync(staged));
      const expected = pinned.get(item.fmaId);
      if (!expected) {
        throw new Error(
          `No pinned expected SHA-256 for ${item.fmaId} in data/phase55_source_hashes.json. ` +
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
      // All 5.5 items are paired lateralised segments (no midline singles).
      // Paired-geometry check in the ASSERTED source frame (DICOM LPS
      // whole-body: +X is Left, so right segments carry negative X). The
      // bbox CENTER must sit on the declared side with the bulk of the span
      // there; a sub-millimetre midline touch on near-midline segments
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
          laterality_basis: 'paired-segment source geometry: bbox center on the declared side in the asserted source frame (DICOM LPS, +X Left), bulk of span declared-side',
          continuity: 'DISCONNECTED distribution segment; no continuity with any other segment is claimed or implemented (see docs/PHASE_5_5_ANATOMICAL_SCOPE.md continuity decision)',
          parcel_mapping: 'NONE - surface-derived segment only; no atlas parcel was mapped onto this mesh'
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

export function cortical55BatchItems(): Cortical55BatchItem[] {
  return ITEMS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = prepareCortical55Batch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) process.exit(1);
}
