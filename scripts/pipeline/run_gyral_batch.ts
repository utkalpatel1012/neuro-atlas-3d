/**
 * 3D Neuroanatomy Atlas: Phase 5.0 Batch-1 Runner (gyral components)
 * Standard: AAS-2026-NEURO-V1
 *
 * Controlled import pipeline (§34): discovery (data/phase5_batch1.json) →
 * license/coordinate pre-checks → topology measurement → profile selection →
 * full 6-stage pipeline → verdicts. Per-asset verdicts:
 * RUNTIME_READY | REVIEW_REQUIRED | REJECTED, each with a recorded reason
 * (§35 — failures never silently enter production).
 *
 * Profile selection is MEASURED, not assumed: watertight single-shell →
 * closed-pial-surface; watertight multi-shell → composite-cortical-assembly;
 * open shells → open-cortical-sheet (VALID_WITH_KNOWN_TOPOLOGY_LIMITATION).
 * Non-manifold/duplicate/zero-area defects → REJECTED before the pipeline.
 *
 * Usage: `npx tsx scripts/pipeline/run_gyral_batch.ts` (repo-root CWD).
 * Exit 0 when the batch ledger is written (rejections are valid outcomes);
 * exit 1 only on infrastructure failure.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseAndAuditSTL } from './stl_utils';
import { runFullPipeline } from './run_pipeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface BatchVerdict {
  assetId: string;
  structureId: string;
  profileId: string | null;
  state: 'RUNTIME_READY' | 'REVIEW_REQUIRED' | 'REJECTED';
  reason: string;
  measuredTriangles: number | null;
  measuredShells: number | null;
  measuredBoundaryEdges: number | null;
  durationMs: number;
}

function licenseCoordinatePrecheck(assetId: string): { ok: boolean; reason: string } {
  try {
    const ingestPath = path.join(PROJECT_ROOT, 'assets/raw', assetId, 'ingestion.json');
    const ingest = JSON.parse(fs.readFileSync(ingestPath, 'utf8'));
    if (!ingest.source_dataset || !ingest.source_dataset_version) {
      return { ok: false, reason: 'Missing source dataset/version in ingestion record.' };
    }
    if (!ingest.source_license || !ingest.attribution) {
      return { ok: false, reason: 'Missing license/attribution in ingestion record (LEGAL_REVIEW_REQUIRED).' };
    }
    if (!ingest.source_coordinate_space || !ingest.source_units) {
      return { ok: false, reason: 'Missing source coordinate space/units in ingestion record.' };
    }
    if (!ingest.original_hash) {
      return { ok: false, reason: 'Missing source hash in ingestion record.' };
    }
    return { ok: true, reason: 'License/coordinate/hash pre-checks pass.' };
  } catch (err) {
    return { ok: false, reason: `Pre-check read failed: ${(err as Error).message}` };
  }
}

export async function runBatch(ledgerName = 'phase5_batch1.json', qaName = 'phase5_batch1_qa.json', batchLabel = 'phase5-batch1-gyral', generator = 'scripts/pipeline/run_gyral_batch.ts'): Promise<BatchVerdict[]> {
  const batchPath = path.join(PROJECT_ROOT, 'data', ledgerName);
  if (!fs.existsSync(batchPath)) {
    throw new Error(`Batch ledger missing: ${batchPath}. Run the corresponding prepare script first.`);
  }
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const items = (batch.items || []).filter((i: any) => i.state === 'SOURCE_AVAILABLE');
  const verdicts: BatchVerdict[] = [];

  for (const item of items) {
    const started = Date.now();
    const base = {
      assetId: item.assetId,
      structureId: item.structureId,
      profileId: null as string | null,
      measuredTriangles: null as number | null,
      measuredShells: null as number | null,
      measuredBoundaryEdges: null as number | null
    };
    try {
      const pre = licenseCoordinatePrecheck(item.assetId);
      if (!pre.ok) {
        verdicts.push({ ...base, state: 'REVIEW_REQUIRED', reason: `Pre-check: ${pre.reason}`, durationMs: Date.now() - started });
        continue;
      }
      const rawDir = path.join(PROJECT_ROOT, 'assets/raw', item.assetId);
      const stlFile = fs.readdirSync(rawDir).find((f) => f.endsWith('.stl'));
      if (!stlFile) {
        verdicts.push({ ...base, state: 'REJECTED', reason: 'No staged STL bytes found.', durationMs: Date.now() - started });
        continue;
      }
      const analysis = parseAndAuditSTL(fs.readFileSync(path.join(rawDir, stlFile)));
      const measured = {
        measuredTriangles: analysis.triangleCount,
        measuredShells: analysis.connectedShellCount,
        measuredBoundaryEdges: analysis.boundaryEdges
      };
      if (analysis.triangleCount <= 0) {
        verdicts.push({ ...base, ...measured, state: 'REJECTED', reason: 'Zero triangles: no geometry.', durationMs: Date.now() - started });
        continue;
      }
      if (analysis.nonManifoldEdges > 0 || analysis.duplicateFaces > 0 || analysis.zeroAreaFaces > 0) {
        verdicts.push({
          ...base,
          ...measured,
          state: 'REJECTED',
          reason: `Topology defects: non-manifold=${analysis.nonManifoldEdges}, duplicates=${analysis.duplicateFaces}, zero-area=${analysis.zeroAreaFaces}.`,
          durationMs: Date.now() - started
        });
        continue;
      }
      let profileId: string;
      let limitationNote = '';
      if (analysis.isWatertight && analysis.connectedShellCount === 1) {
        profileId = 'closed-pial-surface';
      } else if (analysis.isWatertight) {
        profileId = 'composite-cortical-assembly';
        limitationNote = ` (${analysis.connectedShellCount} watertight shells: VALID_WITH_KNOWN_TOPOLOGY_LIMITATION)`;
      } else {
        profileId = 'open-cortical-sheet';
        limitationNote = ` (${analysis.boundaryEdges} boundary edges: VALID_WITH_KNOWN_TOPOLOGY_LIMITATION)`;
      }
      console.log(`[BATCH] ${item.assetId}: profile=${profileId}${limitationNote}, tris=${analysis.triangleCount}, shells=${analysis.connectedShellCount}`);
      const summary = await runFullPipeline(item.assetId, profileId);
      if (!summary.success) {
        verdicts.push({ ...base, ...measured, profileId, state: 'REVIEW_REQUIRED', reason: `Pipeline failed at: ${summary.stagesCompleted.join(' → ') || 'start'}.`, durationMs: Date.now() - started });
        continue;
      }
      verdicts.push({
        ...base,
        ...measured,
        profileId,
        state: 'RUNTIME_READY',
        reason: `6-stage pipeline complete${limitationNote}.`,
        durationMs: Date.now() - started
      });
    } catch (err) {
      verdicts.push({ ...base, state: 'REVIEW_REQUIRED', reason: `Runner exception: ${(err as Error).message}`, durationMs: Date.now() - started });
    }
  }

  const ledger = {
    batch: batchLabel,
    generated_at: new Date().toISOString(),
    generator,
    verdicts
  };
  fs.writeFileSync(path.join(PROJECT_ROOT, 'data', qaName), JSON.stringify(ledger, null, 2), 'utf8');
  const ready = verdicts.filter((v) => v.state === 'RUNTIME_READY').length;
  const review = verdicts.filter((v) => v.state === 'REVIEW_REQUIRED').length;
  const rejected = verdicts.filter((v) => v.state === 'REJECTED').length;
  console.log(`[BATCH DONE] RUNTIME_READY=${ready} REVIEW_REQUIRED=${review} REJECTED=${rejected} → data/${qaName}`);
  return verdicts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ledgerArg = process.argv[2] || 'phase5_batch1.json';
  const qaArg = process.argv[3] || 'phase5_batch1_qa.json';
  runBatch(ledgerArg, qaArg).catch((err) => {
    console.error('[BATCH FATAL]', err);
    process.exit(1);
  });
}
