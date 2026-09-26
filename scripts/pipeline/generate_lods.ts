/**
 * 3D Neuroanatomy Atlas: Multi-Resolution Level-of-Detail (LOD) Generation Stage
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Generates deterministic LOD0, LOD1, LOD2, and LOD3 meshes using
 * Meshopt Quadric Error Metric (QEM) simplification.
 * Strictly separates simplification metrics from empirical geometric fidelity measurements.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { parseGLB, buildGLB, computeVertexNormals, computeBoundingVolume, MeshGeometryData, BoundingVolume } from './glb_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface GeometricFidelityMetrics {
  baseVolumeMm3: number;
  lodVolumeMm3: number;
  volumeDeviationPercent: number;
  boundingBoxDeviationMm: {
    min: [number, number, number];
    max: [number, number, number];
  };
  maxSurfaceDeviationMm: number;  // Discrete Hausdorff distance approximation
  meanSurfaceDeviationMm: number; // Mean point-to-surface distance
}

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
  simplificationMetric: {
    algorithm: string;
    meshoptResultError: number;
    description: string;
  };
  geometricFidelity: GeometricFidelityMetrics;
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

/**
 * Computes empirical geometric fidelity between base mesh and decimated LOD mesh.
 */
function computeGeometricFidelity(
  basePositions: Float32Array,
  baseIndices: Uint16Array | Uint32Array,
  lodPositions: Float32Array,
  lodIndices: Uint16Array | Uint32Array
): GeometricFidelityMetrics {
  const baseBounds = computeBoundingVolume(basePositions);
  const lodBounds = computeBoundingVolume(lodPositions);

  const bbDevMin: [number, number, number] = [
    Number((lodBounds.min[0] - baseBounds.min[0]).toFixed(4)),
    Number((lodBounds.min[1] - baseBounds.min[1]).toFixed(4)),
    Number((lodBounds.min[2] - baseBounds.min[2]).toFixed(4))
  ];
  const bbDevMax: [number, number, number] = [
    Number((lodBounds.max[0] - baseBounds.max[0]).toFixed(4)),
    Number((lodBounds.max[1] - baseBounds.max[1]).toFixed(4)),
    Number((lodBounds.max[2] - baseBounds.max[2]).toFixed(4))
  ];

  // Compute signed volume using divergence theorem: V = 1/6 * sum(v0 . (v1 x v2))
  function computeMeshVolume(positions: Float32Array, indices: Uint16Array | Uint32Array): number {
    let vol6 = 0;
    const numTris = indices.length / 3;
    for (let i = 0; i < numTris; i++) {
      const i0 = indices[i * 3] * 3;
      const i1 = indices[i * 3 + 1] * 3;
      const i2 = indices[i * 3 + 2] * 3;
      const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
      const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
      const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
      vol6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
    return Math.abs(vol6 / 6.0);
  }

  const baseVol = computeMeshVolume(basePositions, baseIndices);
  const lodVol = computeMeshVolume(lodPositions, lodIndices);
  const volumeDevPercent = baseVol > 0 ? Number((((lodVol - baseVol) / baseVol) * 100).toFixed(3)) : 0;

  // Discrete surface deviation: evaluate distance from sampled base vertices to closest LOD vertex
  let maxDev = 0;
  let sumDev = 0;
  const numLodVerts = lodPositions.length / 3;
  const numBaseVerts = basePositions.length / 3;
  const sampleStep = Math.max(1, Math.floor(numBaseVerts / 1000));
  let sampleCount = 0;

  for (let i = 0; i < numBaseVerts; i += sampleStep) {
    sampleCount++;
    const bx = basePositions[i * 3];
    const by = basePositions[i * 3 + 1];
    const bz = basePositions[i * 3 + 2];

    let minDistSq = Infinity;
    // Probe LOD vertices with an adaptive stride if LOD mesh is also very large
    const lodStep = Math.max(1, Math.floor(numLodVerts / 5000));
    for (let j = 0; j < numLodVerts; j += lodStep) {
      const dx = bx - lodPositions[j * 3];
      const dy = by - lodPositions[j * 3 + 1];
      const dz = bz - lodPositions[j * 3 + 2];
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDistSq) minDistSq = dSq;
      if (dSq < 0.0001) break; // Exact or near-exact vertex match
    }
    const dist = Math.sqrt(minDistSq);
    if (dist > maxDev) maxDev = dist;
    sumDev += dist;
  }

  return {
    baseVolumeMm3: Number(baseVol.toFixed(2)),
    lodVolumeMm3: Number(lodVol.toFixed(2)),
    volumeDeviationPercent: volumeDevPercent,
    boundingBoxDeviationMm: { min: bbDevMin, max: bbDevMax },
    maxSurfaceDeviationMm: Number(maxDev.toFixed(4)),
    meanSurfaceDeviationMm: Number((sumDev / sampleCount).toFixed(4))
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

  // Multi-resolution LOD schedule:
  // LOD0: 100% (4280 tris) - Detailed closeup inspection (< 50 mm)
  // LOD1: 75%  (~3210 tris) - Standard orbital view (50 - 150 mm)
  // LOD2: 50%  (~2140 tris) - Multi-structure contextual view (150 - 300 mm)
  // LOD3: 25%  (~1070 tris) - Whole-brain overview (> 300 mm)
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
    let meshoptError = 0.0;

    if (cfg.ratio === 1.0) {
      simplifiedIndices = baseGeometry.indices;
    } else {
      const targetIndices = Math.floor(baseTriangles * cfg.ratio) * 3;
      const targetError = 0.01; // Max 1% bounding sphere quadric residual tolerance

      const inputIndicesU32 = baseGeometry.indices instanceof Uint32Array
        ? baseGeometry.indices
        : new Uint32Array(baseGeometry.indices);

      const [dstIndices, resultError] = MeshoptSimplifier.simplify(
        inputIndicesU32,
        baseGeometry.positions,
        3,
        targetIndices,
        targetError
      );

      meshoptError = resultError;

      // Compact mesh to remove unreferenced vertices
      const [remap, uniqueVertexCount] = MeshoptSimplifier.compactMesh(dstIndices);
      const compactedPositions = new Float32Array(uniqueVertexCount * 3);
      for (let v = 0; v < baseGeometry.positions.length / 3; v++) {
        const newIdx = v < remap.length ? remap[v] : 0xffffffff;
        if (newIdx !== 0xffffffff && newIdx < uniqueVertexCount) {
          compactedPositions[newIdx * 3] = baseGeometry.positions[v * 3];
          compactedPositions[newIdx * 3 + 1] = baseGeometry.positions[v * 3 + 1];
          compactedPositions[newIdx * 3 + 2] = baseGeometry.positions[v * 3 + 2];
        }
      }

      const compactedIndices = uniqueVertexCount <= 65535
        ? new Uint16Array(dstIndices)
        : new Uint32Array(dstIndices);

      simplifiedPositions = compactedPositions;
      simplifiedIndices = compactedIndices;
    }

    // Compute smooth outward normals
    const normals = computeVertexNormals(simplifiedPositions, simplifiedIndices);

    // Compute independent geometric fidelity metrics
    const geometricFidelity = computeGeometricFidelity(
      baseGeometry.positions,
      baseGeometry.indices,
      simplifiedPositions,
      simplifiedIndices
    );

    const lodNodeName = (assetId === 'mesh.hippocampus.left.v1')
      ? `Mesh_Hippocampus_L_${cfg.name.toUpperCase()}`
      : `Mesh_${assetId.replace(/\./g, '_')}_${cfg.name.toUpperCase()}`;

    const lodMeshData: MeshGeometryData = {
      positions: simplifiedPositions,
      normals,
      indices: simplifiedIndices,
      nodeName: lodNodeName,
      meshName: lodNodeName
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
      resultingIndexCount: simplifiedIndices.length,
      simplificationMetric: {
        algorithm: 'Meshopt Quadric Error Metric (QEM)',
        meshoptResultError: Number(meshoptError.toFixed(6)),
        description: 'QEM quadric residual error relative to bounding sphere diameter (not clinical accuracy percentage)'
      },
      geometricFidelity
    });

    console.log(`[LOD GENERATION] ${cfg.name.toUpperCase()}: ${simplifiedIndices.length / 3} tris, ${simplifiedPositions.length / 3} verts, ${glbBuffer.length} bytes | Hausdorff max: ${geometricFidelity.maxSurfaceDeviationMm} mm, Vol dev: ${geometricFidelity.volumeDeviationPercent}% | SHA-256: ${sha256}`);
  }

  // Phase 3.1: QEM simplification is LOSSY by construction. LOD0 at ratio 1.0
  // preserves the input up to simplifier residual; LOD1-3 discard geometry.
  // Fidelity is measured per level in geometricFidelity — never label any LOD
  // "lossless". Report paths are repo-relative (no machine-local path leaks).
  const toRel = (p: string) => path.relative(PROJECT_ROOT, p).replace(/\\/g, '/');
  const report: LODGenerationReport = {
    assetId,
    timestamp: new Date().toISOString(),
    inputCanonicalGlb: toRel(canonicalPath),
    inputCanonicalHash: canonicalHash,
    levels: levels.map(l => ({ ...l, filePath: toRel(l.filePath) })),
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
  const target = process.argv[2] || 'mesh.hippocampus.left.v1';
  generateLODs(target).catch((err) => {
    console.error('LOD generation failed:', err);
    process.exit(1);
  });
}
