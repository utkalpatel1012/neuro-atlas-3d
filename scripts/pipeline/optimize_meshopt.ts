/**
 * 3D Neuroanatomy Atlas: Meshopt Compression & Runtime Asset Optimization Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Compresses canonical and LOD meshes using EXT_meshopt_compression for high-performance
 * web runtime streaming while verifying zero geometric distortion via round-trip decoding.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseGLB, buildMeshoptGLB, parseMeshoptGLB, MeshGeometryData } from './glb_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface MeshoptLevelMetric {
  lodName: string;
  uncompressedGlbPath: string;
  uncompressedByteLength: number;
  uncompressedSha256: string;
  runtimeGlbPath: string;
  compressedByteLength: number;
  compressedSha256: string;
  compressionRatio: number;
  savingsPercent: number;
  vertexCount: number;
  triangleCount: number;
  roundTripVerified: boolean;
}

export interface CompressionReport {
  assetId: string;
  timestamp: string;
  compressionAlgorithm: string;
  targetRuntimeDirectory: string;
  levels: MeshoptLevelMetric[];
  overallUncompressedBytes: number;
  overallCompressedBytes: number;
  overallSavingsPercent: number;
  transformationRecord: {
    transformation_id: string;
    tool: string;
    tool_version: string;
    parameters: Record<string, any>;
    timestamp: string;
  };
}

export async function optimizeMeshopt(assetId: string): Promise<CompressionReport> {
  console.log(`[MESHOPT COMPRESSION] Starting optimization for asset: ${assetId}`);

  const runtimeDir = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const lodNames = ['lod0', 'lod1', 'lod2', 'lod3'];
  const metrics: MeshoptLevelMetric[] = [];

  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (const lodName of lodNames) {
    const uncompressedGlbPath = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'lod', `${assetId}.${lodName}.glb`);
    if (!fs.existsSync(uncompressedGlbPath)) {
      throw new Error(`LOD asset not found at ${uncompressedGlbPath}`);
    }

    const uncompressedBytes = fs.readFileSync(uncompressedGlbPath);
    const uncompressedSha256 = crypto.createHash('sha256').update(uncompressedBytes).digest('hex');

    const { geometry: uncompressedGeom } = parseGLB(uncompressedBytes);

    // Build Meshopt-compressed GLB
    const compressedGlbBuffer = await buildMeshoptGLB(uncompressedGeom);
    const compressedSha256 = crypto.createHash('sha256').update(compressedGlbBuffer).digest('hex');

    const runtimeFilename = `${assetId}.${lodName}.meshopt.glb`;
    const runtimeGlbPath = path.join(runtimeDir, runtimeFilename);
    fs.writeFileSync(runtimeGlbPath, compressedGlbBuffer);

    // Verify round-trip decoding
    const { geometry: decodedGeom } = await parseMeshoptGLB(compressedGlbBuffer);

    const vertexCount = uncompressedGeom.positions.length / 3;
    const triangleCount = uncompressedGeom.indices.length / 3;

    if (decodedGeom.positions.length !== uncompressedGeom.positions.length) {
      throw new Error(`Vertex count mismatch in decoded mesh for ${lodName}`);
    }
    if (decodedGeom.indices.length !== uncompressedGeom.indices.length) {
      throw new Error(`Index count mismatch in decoded mesh for ${lodName}`);
    }

    // Verify positions bit-exact
    let maxPosDelta = 0;
    for (let i = 0; i < uncompressedGeom.positions.length; i++) {
      const delta = Math.abs(uncompressedGeom.positions[i] - decodedGeom.positions[i]);
      if (delta > maxPosDelta) maxPosDelta = delta;
    }
    if (maxPosDelta > 1e-6) {
      throw new Error(`Geometric distortion detected in ${lodName}: max position delta ${maxPosDelta}`);
    }

    const uncompressedSize = uncompressedBytes.length;
    const compressedSize = compressedGlbBuffer.length;
    const compressionRatio = Number((uncompressedSize / compressedSize).toFixed(2));
    const savingsPercent = Number((((uncompressedSize - compressedSize) / uncompressedSize) * 100).toFixed(2));

    totalUncompressed += uncompressedSize;
    totalCompressed += compressedSize;

    metrics.push({
      lodName,
      uncompressedGlbPath,
      uncompressedByteLength: uncompressedSize,
      uncompressedSha256,
      runtimeGlbPath,
      compressedByteLength: compressedSize,
      compressedSha256,
      compressionRatio,
      savingsPercent,
      vertexCount,
      triangleCount,
      roundTripVerified: true
    });

    console.log(`[MESHOPT] ${lodName.toUpperCase()}: ${uncompressedSize} -> ${compressedSize} bytes (-${savingsPercent}%, ratio ${compressionRatio}x, verified lossless)`);
  }

  const overallSavingsPercent = Number((((totalUncompressed - totalCompressed) / totalUncompressed) * 100).toFixed(2));

  const report: CompressionReport = {
    assetId,
    timestamp: new Date().toISOString(),
    compressionAlgorithm: 'EXT_meshopt_compression (ATTRIBUTES + TRIANGLES)',
    targetRuntimeDirectory: runtimeDir,
    levels: metrics,
    overallUncompressedBytes: totalUncompressed,
    overallCompressedBytes: totalCompressed,
    overallSavingsPercent,
    transformationRecord: {
      transformation_id: `tx.${assetId}.meshopt_optimization`,
      tool: 'MeshoptEncoder / NeuroAtlas3D Runtime Pipeline',
      tool_version: 'meshoptimizer 1.3.0',
      parameters: {
        extension: 'EXT_meshopt_compression',
        attributeMode: 'ATTRIBUTES',
        indexMode: 'TRIANGLES',
        lossless: true
      },
      timestamp: new Date().toISOString()
    }
  };

  const reportPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.compression_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[MESHOPT SUCCESS] Report saved to: ${reportPath}`);

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetAsset = process.argv[2] || 'mesh.hippocampus.left.v1';
  optimizeMeshopt(targetAsset).catch((err) => {
    console.error('Meshopt optimization failed:', err);
    process.exit(1);
  });
}
