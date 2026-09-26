/**
 * 3D Neuroanatomy Atlas: Multi-Resolution Level-of-Detail (LOD) Generation Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Generates deterministic LOD0, LOD1, LOD2, and LOD3 meshes using
 * Meshopt Quadric Error Metric (QEM) simplification.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { parseGLB, buildGLB, computeVertexNormals, computeBoundingVolume, MeshGeometryData } from './glb_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface LODLevelMetrics {
  level: number;
  lodName: string;
  targetRatio: number;
  triangleCount: number;
  vertexCount: number;
  byteLength: number;
  sha256: string;
  filePath: string;
  targetIndexCount: number;
  resultingIndexCount: number;
}

export interface LODGenerationReport {
  assetId: string;
  timestamp: string;
  inputCanonicalGlb: string;
  inputCanonicalHash: string;
  levels: LODLevelMetrics[];
  transformationRecord: {
    transformation_id: string;
    tool: string;
    tool_version: string;
    parameters: Record<string, any>;
    timestamp: string;
  };
}

export async function generateLODs(assetId: string): Promise<LODGenerationReport> {
  await MeshoptSimplifier.ready;

  const canonicalPath = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'canonical', `${assetId}.canonical.glb`);
  const canonicalBytes = fs.readFileSync(canonicalPath);
  const canonicalHash = crypto.createHash('sha256').update(canonicalBytes).digest('hex');

  console.log(`[LOD GENERATION] Ingesting canonical mesh: ${canonicalPath} (SHA-256: ${canonicalHash})`);
  const { geometry: baseGeometry } = parseGLB(canonicalBytes);

  const totalBaseIndices = baseGeometry.indices.length;
  const baseTriangles = totalBaseIndices / 3;

  // Target ratios for LOD hierarchy:
  // LOD0: 100% (4280 tris) - Detailed closeup inspection
  // LOD1: 75%  (~3210 tris) - Standard orbital view
  // LOD2: 50%  (~2140 tris) - Multi-structure contextual view / iPad baseline
  // LOD3: 25%  (~1070 tris) - Whole-brain overview / distant preview
  const lodConfigs = [
    { level: 0, name: 'lod0', ratio: 1.0 },
    { level: 1, name: 'lod1', ratio: 0.75 },
    { level: 2, name: 'lod2', ratio: 0.50 },
    { level: 3, name: 'lod3', ratio: 0.25 }
  ];

  const lodDir = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'lod');
  fs.mkdirSync(lodDir, { recursive: true });

  const levels: LODLevelMetrics[] = [];

  for (const cfg of lodConfigs) {
    let simplifiedIndices: Uint16Array | Uint32Array;
    let simplifiedPositions = baseGeometry.positions;

    if (cfg.ratio === 1.0) {
      simplifiedIndices = baseGeometry.indices;
    } else {
      const targetIndices = Math.floor(baseTriangles * cfg.ratio) * 3;
      const targetError = 0.01; // Max 1% bounding sphere error tolerance

      // MeshoptSimplifier.simplify expects Uint32Array indices
      const inputIndicesU32 = baseGeometry.indices instanceof Uint32Array
        ? baseGeometry.indices
        : new Uint32Array(baseGeometry.indices);

      const [dstIndices, resultError] = MeshoptSimplifier.simplify(
        inputIndicesU32,
        baseGeometry.positions,
        3, // 3 floats per vertex position stride
        targetIndices,
        targetError
      );

      // Compact mesh to remove unused vertices
      const [remap, uniqueVertexCount] = MeshoptSimplifier.compactMesh(dstIndices);
      const compactedPositions = new Float32Array(uniqueVertexCount * 3);
      for (let v = 0; v < baseGeometry.positions.length / 3; v++) {
        const newIdx = remap[v];
        if (newIdx !== 0xffffffff) {
          compactedPositions[newIdx * 3] = baseGeometry.positions[v * 3];
          compactedPositions[newIdx * 3 + 1] = baseGeometry.positions[v * 3 + 1];
          compactedPositions[newIdx * 3 + 2] = baseGeometry.positions[v * 3 + 2];
        }
      }

      const compactedIndices = new Uint16Array(dstIndices.length);
      for (let i = 0; i < dstIndices.length; i++) {
        compactedIndices[i] = remap[dstIndices[i]];
      }

      simplifiedPositions = compactedPositions;
      simplifiedIndices = compactedIndices;
      console.log(`[LOD GENERATION] ${cfg.name.toUpperCase()}: Simplified to ${simplifiedIndices.length / 3} tris (Error: ${resultError.toFixed(5)})`);
    }

    // Recompute smooth normals
    const normals = computeVertexNormals(simplifiedPositions, simplifiedIndices);

    const lodMeshData: MeshGeometryData = {
      positions: simplifiedPositions,
      normals,
      indices: simplifiedIndices,
      nodeName: `Mesh_Hippocampus_L_${cfg.name.toUpperCase()}`,
      meshName: `Mesh_Hippocampus_L_${cfg.name.toUpperCase()}`
    };

    const glbBuffer = buildGLB(lodMeshData);
    const outFilename = `${assetId}.${cfg.name}.glb`;
    const outPath = path.join(lodDir, outFilename);
    fs.writeFileSync(outPath, glbBuffer);

    const sha256 = crypto.createHash('sha256').update(glbBuffer).digest('hex');

    levels.push({
      level: cfg.level,
      lodName: cfg.name,
      targetRatio: cfg.ratio,
      triangleCount: simplifiedIndices.length / 3,
      vertexCount: simplifiedPositions.length / 3,
      byteLength: glbBuffer.length,
      sha256,
      filePath: outPath,
      targetIndexCount: Math.floor(baseTriangles * cfg.ratio) * 3,
      resultingIndexCount: simplifiedIndices.length
    });

    console.log(`[LOD GENERATION] Written ${outFilename}: ${glbBuffer.length} bytes, SHA-256: ${sha256}`);
  }

  const report: LODGenerationReport = {
    assetId,
    timestamp: new Date().toISOString(),
    inputCanonicalGlb: canonicalPath,
    inputCanonicalHash: canonicalHash,
    levels,
    transformationRecord: {
      transformation_id: `tx.${assetId}.lod_generation`,
      tool: 'MeshoptSimplifier / NeuroAtlas3D LOD Pipeline',
      tool_version: 'meshoptimizer 1.3.0',
      parameters: {
        algorithms: 'Quadric_Error_Metric_Simplification',
        levels: lodConfigs.map(c => ({ name: c.name, ratio: c.ratio }))
      },
      timestamp: new Date().toISOString()
    }
  };

  const reportPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.lod_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[LOD SUCCESS] Report saved to: ${reportPath}`);

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateLODs('mesh.hippocampus.left.v1').catch((err) => {
    console.error('LOD generation failed:', err);
    process.exit(1);
  });
}
