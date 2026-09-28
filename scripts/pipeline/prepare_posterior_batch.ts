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
 * Usage: `npx tsx scripts/pipeline/prepare_posterior_batch.ts` (repo-root CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
// Phase 5.2 architecture M1: this was a hardcoded absolute path to one contributor's
// machine, making the stage step non-portable and non-reproducible. Override with
// AUDIT_STAGE_DIR; the default is documented in docs/PHASE_5_2_ASSET_QA.md.
const STAGE_DIR = process.env.AUDIT_STAGE_DIR || 'C:/Projects/_audit_tmp';
const PINNED_HASH_PATH = 'data/phase52_source_hashes.json';

function loadPinnedSourceHashes(): Map<string, string> {
  const pinned = new Map<string, string>();
  const p = path.join(PROJECT_ROOT, PINNED_HASH_PATH);
  if (!fs.existsSync(p)) return pinned;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const s of doc.sources ?? []) {
    if (s && typeof s.fma_id === 'string' && typeof s.sha256 === 'string') {
      pinned.set(s.fma_id, s.sha256);
    }
  }
  return pinned;
}

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

function sourceStats(stlPath: string): { centerX: number; minX: number; maxX: number; tris: number } {
  const buf = fs.readFileSync(stlPath);
  const tris = buf.readUInt32LE(80);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50;
    for (let v = 0; v < 3; v++) {
      const x = buf.readFloatLE(base + 12 + v * 12);
      if (!Number.isFinite(x)) throw new Error(`Non-finite vertex in ${stlPath}.`);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return { centerX: Number(((minX + maxX) / 2).toFixed(2)), minX, maxX, tris };
}

export interface PosteriorPrepVerdict {
  assetId: string;
  structureId: string;
  state: 'SOURCE_AVAILABLE' | 'PREP_FAILED';
  detail: string;
  // Phase 5.2 architecture N4: the anatomical category must travel through the ledger,
  // otherwise the category-aware QA profile selection in run_gyral_batch.ts reads
  // `undefined` and silently falls back to cortical profile names for CSF cavities.
  category: PosteriorBatchItem['category'];
}

export function preparePosteriorBatch(): PosteriorPrepVerdict[] {
  const verdicts: PosteriorPrepVerdict[] = [];
  // Phase 5.2 CRITICAL-2 repair: staged bytes are now gated against a committed set of
  // expected hashes. Previously the script hashed the staged file and compared it only
  // against itself on re-run, so a swapped or re-converted mirror artifact would have
  // been ingested silently while the QA report claimed the hash was "verified".
  const pinned = loadPinnedSourceHashes();
  for (const item of ITEMS) {
    try {
      const staged = path.join(STAGE_DIR, `phase52_${item.fmaId}.stl`);
      if (!fs.existsSync(staged)) throw new Error(`Staged download missing: ${staged}`);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(staged)).digest('hex');
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
      const geo = sourceStats(staged);
      // Midline-span check: all 5.2 items must span X=0 (bilateral organs and
      // midline cavities alike). A strictly one-sided mesh here = wrong file.
      if (!(geo.minX < 0 && geo.maxX > 0)) {
        throw new Error(`Expected midline-spanning source geometry, measured X ${geo.minX}..${geo.maxX}. STOP — no guessing.`);
      }
      const rawDir = path.join(PROJECT_ROOT, 'assets/raw', item.assetId);
      fs.mkdirSync(rawDir, { recursive: true });
      const ingestionPath = path.join(rawDir, 'ingestion.json');
      // Phase 5.2 architecture M8: preserve the already-recorded acquisition date.
      let priorAcquisitionDate: string | null = null;
      if (fs.existsSync(ingestionPath)) {
        try {
          const prior = JSON.parse(fs.readFileSync(ingestionPath, 'utf8'));
          if (typeof prior.acquisition_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prior.acquisition_date)) {
            priorAcquisitionDate = prior.acquisition_date;
          }
        } catch { /* fall through to NOT_RECORDED */ }
      }
      const dest = path.join(rawDir, `${item.fmaId}.stl`);
      if (fs.existsSync(dest)) {
        const existing = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
        if (existing !== hash) throw new Error(`Staged file exists with different hash (immutability): ${dest}`);
      } else {
        fs.copyFileSync(staged, dest);
      }
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
        // Phase 5.2 architecture M8: this was `new Date()`, so re-running the stage
        // script on a later day silently rewrote committed acquisition provenance.
        // acquisition_date is now preserved from the existing record when present and
        // is otherwise an explicit, non-fabricated gap.
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
      fs.writeFileSync(ingestionPath, JSON.stringify(ingestion, null, 2), 'utf8');
      // Phase 5.2 CRITICAL-2: the wording is deliberately precise. The hash IS gated
      // against a committed pin now, but that pin attests the third-party mirror's
      // CONVERTED bytes; equivalence to a DBCLS-original artifact is not established.
      verdicts.push({
        assetId: item.assetId,
        structureId: item.structureId,
        state: 'SOURCE_AVAILABLE',
        category: item.category,
        detail: `Staged ${item.fmaId} (${geo.tris} tris), SHA-256 matches committed pin in ${PINNED_HASH_PATH}; midline-span measured. Mirror conversion itself remains MIRROR_CONVERSION_UNVERIFIED.`
      });
    } catch (err) {
      verdicts.push({ assetId: item.assetId, structureId: item.structureId, category: item.category, state: 'PREP_FAILED', detail: `Preparation failed: ${(err as Error).message}` });
    }
  }
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'data/phase52_batch.json'),
    JSON.stringify({ batch: 'phase52-posterior-ventricular', generated_at: new Date().toISOString(), generator: 'scripts/pipeline/prepare_posterior_batch.ts', items: verdicts }, null, 2),
    'utf8'
  );
  const ok = verdicts.filter((v) => v.state === 'SOURCE_AVAILABLE').length;
  console.log(`[BATCH PREP] ${ok}/${verdicts.length} assets SOURCE_AVAILABLE → data/phase52_batch.json`);
  for (const v of verdicts.filter((v) => v.state !== 'SOURCE_AVAILABLE')) console.error(`[BATCH PREP] ${v.assetId}: ${v.detail}`);
  return verdicts;
}

export function posteriorBatchItems(): PosteriorBatchItem[] {
  return ITEMS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = preparePosteriorBatch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) process.exit(1);
}
