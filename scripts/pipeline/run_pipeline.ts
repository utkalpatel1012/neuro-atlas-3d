/**
 * 3D Neuroanatomy Atlas: Pipeline Orchestrator
 * Standard: AAS-2026-NEURO-V1
 * 
 * Executes the complete 6-stage anatomical asset transformation pipeline
 * reproducibly for any registered anatomical structure.
 */

import { fileURLToPath } from 'url';
import { ingestAsset } from './ingest_asset';
import { validateMesh } from './validate_mesh';
import { canonicalizeMesh } from './canonicalize_mesh';
import { generateLODs } from './generate_lods';
import { optimizeMeshopt } from './optimize_meshopt';
import { updateManifest } from './update_manifest';

export interface PipelineExecutionSummary {
  assetId: string;
  success: boolean;
  stagesCompleted: string[];
  durationMs: number;
  timestamp: string;
}

export async function runFullPipeline(assetId: string = 'mesh.hippocampus.left.v1'): Promise<PipelineExecutionSummary> {
  const startTime = Date.now();
  const stagesCompleted: string[] = [];

  console.log(`================================================================`);
  console.log(`[PIPELINE START] Beginning full pipeline execution for: ${assetId}`);
  console.log(`================================================================`);

  try {
    // Stage 1: Ingestion & Cryptographic Checksum
    console.log(`\n--- STAGE 1: INGESTION & SOURCE AUDIT ---`);
    await ingestAsset(assetId);
    stagesCompleted.push('Stage 1: Ingestion & Audit');

    // Stage 2: Geometric & Topological QA
    console.log(`\n--- STAGE 2: GEOMETRIC & TOPOLOGICAL QA ---`);
    const qaReport = await validateMesh(assetId);
    if (qaReport.overallStatus !== 'GEOMETRY_VALIDATED') {
      throw new Error(`Geometric QA failed for ${assetId}: status is ${qaReport.overallStatus}`);
    }
    stagesCompleted.push('Stage 2: Geometric QA');

    // Stage 3: Coordinate Canonicalization & Normals
    console.log(`\n--- STAGE 3: COORDINATE CANONICALIZATION & NORMALS ---`);
    await canonicalizeMesh(assetId);
    stagesCompleted.push('Stage 3: Canonicalization');

    // Stage 4: Multi-Resolution LOD Generation
    console.log(`\n--- STAGE 4: MULTI-RESOLUTION LOD GENERATION ---`);
    await generateLODs(assetId);
    stagesCompleted.push('Stage 4: LOD Generation');

    // Stage 5: Meshopt Runtime Compression & Lossless Verification
    console.log(`\n--- STAGE 5: MESHOPT RUNTIME COMPRESSION ---`);
    await optimizeMeshopt(assetId);
    stagesCompleted.push('Stage 5: Meshopt Compression');

    // Stage 6: Central Asset Manifest Compilation
    console.log(`\n--- STAGE 6: ASSET MANIFEST UPDATE ---`);
    updateManifest();
    stagesCompleted.push('Stage 6: Manifest Update');

    const durationMs = Date.now() - startTime;
    console.log(`\n================================================================`);
    console.log(`[PIPELINE COMPLETE] Asset ${assetId} processed in ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`All 6 stages verified and passed successfully.`);
    console.log(`================================================================\n`);

    return {
      assetId,
      success: true,
      stagesCompleted,
      durationMs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`\n[PIPELINE FAILED] Asset ${assetId} failed after ${(durationMs / 1000).toFixed(2)}s:`, error);
    return {
      assetId,
      success: false,
      stagesCompleted,
      durationMs,
      timestamp: new Date().toISOString()
    };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetAsset = process.argv[2] || 'mesh.hippocampus.left.v1';
  runFullPipeline(targetAsset).then((summary) => {
    if (!summary.success) {
      process.exit(1);
    }
  });
}
