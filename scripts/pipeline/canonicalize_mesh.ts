/**
 * 3D Neuroanatomy Atlas: Mesh Canonicalization Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Normalizes raw geometry into standard canonical glTF 2.0 Binary (.glb) format:
 * - Coordinates: Right-Handed RAS (Right = +X, Superior = +Y, Anterior = +Z)
 * - Units: Millimeters (1.0 = 1.0 mm)
 * - Weighted smooth vertex normals pointing outward
 * - Uncompressed master geometry
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseAndAuditSTL } from './stl_utils';
import { buildGLB, computeVertexNormals, computeBoundingVolume, MeshGeometryData } from './glb_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface CanonicalizationResult {
  assetId: string;
  canonicalGlbPath: string;
  sha256: string;
  byteLength: number;
  vertexCount: number;
  triangleCount: number;
  bounds: ReturnType<typeof computeBoundingVolume>;
  centroid: [number, number, number];
  transformationRecord: {
    transformation_id: string;
    input_asset_hash: string;
    output_asset_hash: string;
    tool: string;
    parameters: Record<string, any>;
    timestamp: string;
  };
}

export function canonicalizeHippocampus(assetId: string, rawFilename: string): CanonicalizationResult {
  const rawFilePath = path.join(PROJECT_ROOT, 'assets/raw', assetId, rawFilename);
  const rawBytes = fs.readFileSync(rawFilePath);
  const inputHash = crypto.createHash('sha256').update(rawBytes).digest('hex');

  console.log(`[CANONICALIZE] Ingesting raw STL: ${rawFilePath} (SHA-256: ${inputHash})`);
  const analysis = parseAndAuditSTL(rawBytes);

  // Coordinate Conversion:
  // BodyParts3D LPS whole-body coords:
  // X_lps (Left=+), Y_lps (Posterior=-), Z_lps (Superior=+, ~1545 mm)
  // Conversion to standard NeuroAtlas3D Three.js / Blender frame (+X Right, +Y Up, +Z Anterior):
  // X_ras = -X_lps (Left hemisphere is negative X, -25.44 mm)
  // Y_ras = Z_lps - 1561.7 mm (Centered vertically relative to AC-PC, -16.36 mm)
  // Z_ras = Y_lps + 70.1 mm (Centered AP relative to AC, -20.81 mm)

  const numVerts = analysis.uniqueVertexCount;
  const canonicalPositions = new Float32Array(numVerts * 3);

  for (let i = 0; i < numVerts; i++) {
    const rawX = analysis.positions[i * 3];
    const rawY = analysis.positions[i * 3 + 1];
    const rawZ = analysis.positions[i * 3 + 2];

    const canX = -rawX;
    const canY = rawZ - 1561.7;
    const canZ = rawY + 70.1;

    canonicalPositions[i * 3] = canX;
    canonicalPositions[i * 3 + 1] = canY;
    canonicalPositions[i * 3 + 2] = canZ;
  }

  // Compute smooth weighted normals
  const normals = computeVertexNormals(canonicalPositions, analysis.indices);

  const meshData: MeshGeometryData = {
    positions: canonicalPositions,
    normals,
    indices: analysis.indices,
    nodeName: 'Mesh_Hippocampus_L',
    meshName: 'Mesh_Hippocampus_L'
  };

  const bounds = computeBoundingVolume(canonicalPositions);
  console.log(`[CANONICALIZE] Canonical bounds:`, bounds.min, bounds.max);
  console.log(`[CANONICALIZE] Canonical centroid:`, bounds.center);
  console.log(`[CANONICALIZE] Dimensions:`, bounds.dimensions);

  // Build binary GLB
  const glbBuffer = buildGLB(meshData);
  const outputHash = crypto.createHash('sha256').update(glbBuffer).digest('hex');

  const outDir = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'canonical');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${assetId}.canonical.glb`);
  fs.writeFileSync(outPath, glbBuffer);

  console.log(`[CANONICALIZE SUCCESS] Canonical GLB: ${outPath} (${glbBuffer.length} bytes)`);
  console.log(`[CANONICALIZE SUCCESS] Output SHA-256: ${outputHash}`);

  const transformationRecord = {
    transformation_id: `tx.${assetId}.canonicalization`,
    input_asset_hash: inputHash,
    output_asset_hash: outputHash,
    tool: 'NeuroAtlas3D Canonicalizer v1.0',
    parameters: {
      operation: 'DICOM_LPS_to_RAS_Alignment_and_Centroid_Registration',
      coordinate_frame: 'blender_world_ras',
      units: 'mm',
      reference_center_offset: [0, -1561.7, 70.1],
      normal_computation: 'area_weighted_smooth'
    },
    timestamp: new Date().toISOString()
  };

  // Save working transformation record
  const workingDir = path.join(PROJECT_ROOT, 'assets/working', assetId);
  fs.mkdirSync(workingDir, { recursive: true });
  fs.writeFileSync(path.join(workingDir, 'transform_canonical.json'), JSON.stringify(transformationRecord, null, 2), 'utf8');

  return {
    assetId,
    canonicalGlbPath: outPath,
    sha256: outputHash,
    byteLength: glbBuffer.length,
    vertexCount: numVerts,
    triangleCount: analysis.triangleCount,
    bounds,
    centroid: bounds.center,
    transformationRecord
  };
}

export function canonicalizeMesh(assetId: string = 'mesh.hippocampus.left.v1'): CanonicalizationResult {
  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);
  let rawFilename = 'FMA72714.stl';
  if (fs.existsSync(rawDir)) {
    const stlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.stl'));
    if (stlFiles.length > 0) rawFilename = stlFiles[0];
  }
  return canonicalizeHippocampus(assetId, rawFilename);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    canonicalizeMesh('mesh.hippocampus.left.v1');
  } catch (err) {
    console.error('Canonicalization failed:', err);
    process.exit(1);
  }
}
