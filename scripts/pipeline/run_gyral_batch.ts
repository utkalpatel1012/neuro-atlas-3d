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
  // Phase 5.2 architecture N6: declared, not merely spread in, so the ledger field is
  // typed. The anatomical category recorded at prep time, used for QA profile choice.
  anatomicalCategory: string;
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
      // Phase 5.2 architecture M7: the anatomical category is carried in the ledger so
      // QA profile selection can be category-appropriate. Previously the picker saw only
      // measured topology, so a CSF aperture and a cortical gyrus could receive the same
      // "cortical" profile - the 5.4 `wrong-category-validation` hard stop arriving early.
      anatomicalCategory: (item.category ?? 'UNSPECIFIED') as string,
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
      // Phase 5.2 architecture M7: profile selection is now driven by measured topology
      // AND anatomical category. The topology measurement is still authoritative for the
      // shell/closure decision; the category only prevents a category-inappropriate
      // template name (e.g. describing a CSF cavity as a pial/cortical surface), which is
      // the Phase 5.4 `wrong-category-validation` hard stop. For CORTEX the historical
      // names are preserved exactly, so Phase 5.0/5.1 assets are unaffected.
      const isCavityCategory = String(item.category ?? '').toUpperCase().includes('VENTRICULAR')
        || String(item.category ?? '').toUpperCase().includes('CAVITY');
      // Phase 5.3 (minimal shared fix): white-matter segments are solid
      // structures, not cortical sheets and not cavities. They must never
      // receive a cortical or cavity profile name, so watertight white-matter
      // geometry selects the SOLID profile the validator itself defaults to
      // for every non-cortex asset. Its enforced criteria are purely
      // topological (watertight / non-manifold / zero-area / duplicate /
      // aspect-ratio) with no membrane or tissue semantics.
      const isWhiteMatterCategory = String(item.category ?? '').toUpperCase().includes('WHITE_MATTER');
      // Phase 5.4 (minimal shared fix): cranial-nerve segments and gross
      // vascular tubes are solid cord-like structures, not cortical sheets,
      // cavities, or tractography streamlines. Like white matter they must
      // never receive a cortical or cavity profile name (the Phase 5.4
      // `wrong-category-validation` hard stop), so nerve/vascular geometry
      // selects the same SOLID profile. Its enforced criteria are purely
      // topological (watertight / non-manifold / zero-area / duplicate /
      // aspect-ratio) with no membrane, tissue, nucleus, or vessel-wall
      // semantics.
      const upperCategory = String(item.category ?? '').toUpperCase();
      const isNerveVascularCategory = upperCategory.includes('CRANIAL_NERVE') || upperCategory.includes('VASCULAR');
      const solidCategory = isWhiteMatterCategory || isNerveVascularCategory;
      const solidProfileId = 'solid-subcortical-nucleus';
      if (analysis.isWatertight && analysis.connectedShellCount === 1) {
        profileId = isCavityCategory ? 'closed-cavity-cast' : solidCategory ? solidProfileId : 'closed-pial-surface';
      } else if (analysis.isWatertight) {
        profileId = isCavityCategory ? 'multi-shell-cavity-cast' : solidCategory ? solidProfileId : 'composite-cortical-assembly';
        limitationNote = ` (${analysis.connectedShellCount} watertight shells: VALID_WITH_KNOWN_TOPOLOGY_LIMITATION)`;
      } else {
        profileId = isCavityCategory ? 'open-cavity-cast' : solidCategory ? solidProfileId : 'open-cortical-sheet';
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
  const labelArg = process.argv[4] || 'phase5-batch1-gyral';
  const generatorArg = process.argv[5] || 'scripts/pipeline/run_gyral_batch.ts';
  runBatch(ledgerArg, qaArg, labelArg, generatorArg).catch((err) => {
    console.error('[BATCH FATAL]', err);
    process.exit(1);
  });
}
