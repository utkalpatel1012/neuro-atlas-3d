/**
 * 3D Neuroanatomy Atlas: Phase 5.0 Batch-1 Raw Preparation (gyral components)
 * Standard: AAS-2026-NEURO-V1
 *
 * Derives per-asset raw working copies from the in-repo BodyParts3D cortex
 * components (identical provenance chain — no new downloads, licenses, or
 * coordinate frames). Source component bytes are NEVER modified; each new
 * `assets/raw/<assetId>/` holds a hash-verified copy + full ingestion.json
 * (ingestAsset schema + derivation block). Emits `data/phase5_batch1.json`
 * with per-asset SOURCE_AVAILABLE states for the batch runner.
 *
 * Thin wrapper over the shared staging core (`batch_staging.ts`): this file
 * owns the gyral item table + spec only. Behaviour is unchanged.
 *
 * Usage: `npx tsx scripts/pipeline/prepare_gyral_batch.ts` (repo-root CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  prepareBatch as runStagingBatch,
  sha256File,
  stageCopyImmutable,
  todayDate,
  type PrepVerdict
} from './batch_staging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export type { PrepVerdict };

export interface GyralBatchItem {
  structureName: string;
  structureId: string;
  assetId: string;
  lobe: string;
  laterality: 'left' | 'right';
  fmaId: string;
  parentCortexAssetId: string;
  // Architecture N4: carried through the ledger so run_gyral_batch.ts can
  // select a category-appropriate QA profile. Absent here, so the spec
  // defaults cortical batches to 'CORTEX' (historical profile names intact).
  category?: string;
}

const STRUCTURES: Array<{
  base: string;
  structureName: string;
  lobe: string;
  leftFma: string;
  rightFma: string;
}> = [
  { base: 'superior_frontal_gyrus', structureName: 'Superior frontal gyrus', lobe: 'frontal', leftFma: 'FMA72654', rightFma: 'FMA72653' },
  { base: 'middle_frontal_gyrus', structureName: 'Middle frontal gyrus', lobe: 'frontal', leftFma: 'FMA72656', rightFma: 'FMA72655' },
  { base: 'precentral_gyrus', structureName: 'Precentral gyrus', lobe: 'frontal', leftFma: 'FMA72662', rightFma: 'FMA72661' },
  { base: 'postcentral_gyrus', structureName: 'Postcentral gyrus', lobe: 'parietal', leftFma: 'FMA72666', rightFma: 'FMA72665' },
  { base: 'supramarginal_gyrus', structureName: 'Supramarginal gyrus', lobe: 'parietal', leftFma: 'FMA72668', rightFma: 'FMA72667' },
  { base: 'angular_gyrus', structureName: 'Angular gyrus', lobe: 'parietal', leftFma: 'FMA72670', rightFma: 'FMA72669' },
  { base: 'middle_temporal_gyrus', structureName: 'Middle temporal gyrus', lobe: 'temporal', leftFma: 'FMA72686', rightFma: 'FMA72685' },
  { base: 'cingulate_gyrus', structureName: 'Cingulate gyrus', lobe: 'limbic', leftFma: 'FMA72718', rightFma: 'FMA72717' }
];

export function batchItems(): GyralBatchItem[] {
  const items: GyralBatchItem[] = [];
  for (const s of STRUCTURES) {
    for (const laterality of ['left', 'right'] as const) {
      const fmaId = laterality === 'left' ? s.leftFma : s.rightFma;
      items.push({
        structureName: `${s.structureName} (${laterality === 'left' ? 'Left' : 'Right'})`,
        structureId: `brain.telencephalon.${laterality}.${s.lobe === 'limbic' ? 'limbic' : s.lobe + '_lobe'}.${s.base}`,
        assetId: `mesh.${s.base}.${laterality}.v1`,
        lobe: s.lobe,
        laterality,
        fmaId,
        parentCortexAssetId: `mesh.cortex.${laterality}.v1`
      });
    }
  }
  return items;
}

export function prepareBatch(): PrepVerdict[] {
  return runStagingBatch({
    items: batchItems(),
    projectRoot: PROJECT_ROOT,
    batchName: 'phase5-batch1-gyral',
    generator: 'scripts/pipeline/prepare_gyral_batch.ts',
    ledgerRelativePath: 'data/phase5_batch1.json',
    prepareOne: (item, ctx) => {
      const parentIngestPath = path.join(ctx.projectRoot, 'assets/raw', item.parentCortexAssetId, 'ingestion.json');
      if (!fs.existsSync(parentIngestPath)) {
        throw new Error(`Parent ingestion record missing: ${parentIngestPath}`);
      }
      const parentIngest = JSON.parse(fs.readFileSync(parentIngestPath, 'utf8'));
      const component = (parentIngest.components || []).find((c: any) => c.fma_id === item.fmaId);
      if (!component) {
        throw new Error(`Component ${item.fmaId} not in parent ingestion record (provenance authority).`);
      }
      const sourceStl = path.join(ctx.projectRoot, 'assets/raw', item.parentCortexAssetId, 'components', `${item.fmaId}.stl`);
      if (!fs.existsSync(sourceStl)) {
        throw new Error(`Component bytes missing: ${sourceStl}`);
      }
      const measuredHash = sha256File(sourceStl);
      if (measuredHash !== component.sha256) {
        throw new Error(`Source hash mismatch for ${item.fmaId}: measured ${measuredHash} vs recorded ${component.sha256}.`);
      }
      const rawDir = path.join(ctx.projectRoot, 'assets/raw', item.assetId);
      const stagedFile = stageCopyImmutable(rawDir, `${item.fmaId}.stl`, sourceStl, measuredHash);
      const ingestion = {
        asset_id: item.assetId,
        // ingestAsset.ts reads camelCase options; cortex convention is
        // snake_case — carry both so Stage 1 verification resolves.
        assetId: item.assetId,
        structure_id: item.structureId,
        source_dataset: parentIngest.source_dataset,
        source_dataset_version: parentIngest.source_dataset_version,
        source_asset_id: item.fmaId,
        source_url: component.source_url,
        sourceUrl: component.source_url,
        source_license: parentIngest.source_license,
        source_license_version: parentIngest.source_license_version,
        project_distribution_policy: 'CC-BY-SA-4.0',
        attribution: parentIngest.attribution,
        acquisition_date: todayDate(),
        original_filename: `${item.fmaId}.stl`,
        originalFilename: `${item.fmaId}.stl`,
        original_format: 'binary STL (BodyParts3D segment)',
        original_hash: measuredHash,
        source_coordinate_space: parentIngest.source_coordinate_space,
        source_units: parentIngest.source_units,
        source_metadata: {
          component_name: component.name,
          component_lobe: component.lobe,
          component_laterality: component.laterality,
          component_triangles: component.triangle_count
        },
        derived_component: {
          parent_asset_id: item.parentCortexAssetId,
          parent_ingestion_record: path.relative(ctx.projectRoot, parentIngestPath).replace(/\\/g, '/'),
          input_sha256: measuredHash,
          operation: 'hash-verified byte copy (no geometric modification)',
          software: 'scripts/pipeline/prepare_gyral_batch.ts',
          operator: 'Phase 5.0 batch preparation'
        },
        ingestion_status: 'SOURCE_VERIFIED'
      };
      return {
        rawDir,
        ingestion,
        detail: `Staged ${component.name} (${component.triangle_count} tris), hash-verified.`,
        sourceHash: measuredHash,
        byteLength: fs.statSync(stagedFile).size
      };
    },
    successVerdict: (item, result) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      state: 'SOURCE_AVAILABLE',
      category: (item.category ?? 'CORTEX'),
      detail: result.detail,
      sourceHash: result.sourceHash,
      byteLength: result.byteLength
    }),
    failureVerdict: (item, message) => ({
      assetId: item.assetId,
      structureId: item.structureId,
      state: 'PREP_FAILED',
      category: (item.category ?? 'CORTEX'),
      detail: message
    })
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verdicts = prepareBatch();
  if (verdicts.some((v) => v.state !== 'SOURCE_AVAILABLE')) {
    process.exit(1);
  }
}
