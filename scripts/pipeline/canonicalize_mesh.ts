/**
 * 3D Neuroanatomy Atlas: Generic Mesh Canonicalization Stage
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Normalizes raw geometry from arbitrary source coordinate spaces (DICOM LPS, MNI152, FreeSurfer)
 * into standard canonical glTF 2.0 Binary (.glb) format using explicit SourceCoordinateAdapters:
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
import { buildGLB, computeVertexNormals, computeBoundingVolume, MeshGeometryData, BoundingVolume } from './glb_utils';
import {
  SourceCoordinateAdapter,
  BODYPARTS3D_LPS_TO_RAS_ADAPTER,
  IDENTITY_RAS_ADAPTER,
  MNI152_NONLINEAR_TO_RAS_ADAPTER,
  FREESURFER_SURFACE_RAS_ADAPTER,
  transformPositions,
  validateAdapter
} from './coordinate_adapter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface CanonicalizationConfig {
  assetId: string;
  rawFilename?: string;
  coordinateAdapter?: SourceCoordinateAdapter;
  nodeName?: string;
  meshName?: string;
}

export interface CanonicalizationResult {
  assetId: string;
  canonicalGlbPath: string;
  sha256: string;
  byteLength: number;
  vertexCount: number;
  triangleCount: number;
  bounds: BoundingVolume;
  centroid: [number, number, number];
  transformationRecord: {
    transformation_id: string;
    input_frame: string;
    output_frame: string;
    adapter_id: string;
    adapter_version: string;
    input_asset_hash: string;
    output_asset_hash: string;
    tool: string;
    parameters: Record<string, any>;
    timestamp: string;
  };
}

export function canonicalizeMesh(configOrId: CanonicalizationConfig | string): CanonicalizationResult {
  const config: CanonicalizationConfig = typeof configOrId === 'string'
    ? { assetId: configOrId }
    : configOrId;

  const assetId = config.assetId;
  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);

  // Resolve raw filename
  let rawFilename = config.rawFilename;
  if (!rawFilename) {
    if (fs.existsSync(rawDir)) {
      const stlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.stl'));
      if (stlFiles.length > 0) rawFilename = stlFiles[0];
    }
  }
  if (!rawFilename) {
    throw new Error(`No raw geometry file found for asset ${assetId} in ${rawDir}`);
  }

  // Resolve coordinate adapter
  let adapter = config.coordinateAdapter;
  if (!adapter) {
    const ingestionJsonPath = path.join(rawDir, 'ingestion.json');
    if (fs.existsSync(ingestionJsonPath)) {
      const ingestionData = JSON.parse(fs.readFileSync(ingestionJsonPath, 'utf8'));
      const sourceSpace = ingestionData.source_coordinate_space;
      if (sourceSpace === 'dicom_lps_whole_body' || sourceSpace === 'dicom_lps') {
        adapter = BODYPARTS3D_LPS_TO_RAS_ADAPTER;
      } else if (sourceSpace?.includes('mni152')) {
        adapter = MNI152_NONLINEAR_TO_RAS_ADAPTER;
      } else if (sourceSpace?.includes('freesurfer')) {
        adapter = FREESURFER_SURFACE_RAS_ADAPTER;
      }
    }
    if (!adapter) {
      adapter = IDENTITY_RAS_ADAPTER;
    }
  }

  const adapterCheck = validateAdapter(adapter);
  if (!adapterCheck.valid) {
    throw new Error(`Invalid coordinate adapter: ${adapterCheck.errors.join(', ')}`);
  }

  const rawFilePath = path.join(rawDir, rawFilename);
  const rawBytes = fs.readFileSync(rawFilePath);
  const inputHash = crypto.createHash('sha256').update(rawBytes).digest('hex');

  console.log(`[CANONICALIZE] Ingesting raw STL: ${rawFilePath} (SHA-256: ${inputHash})`);
  console.log(`[CANONICALIZE] Using coordinate adapter: ${adapter.adapter_id} (${adapter.source_coordinate_system} -> ${adapter.target_canonical_system})`);

  const analysis = parseAndAuditSTL(rawBytes);

  // Apply source coordinate transformation via adapter
  const canonicalPositions = transformPositions(analysis.positions, adapter);

  // Compute smooth outward area-weighted normals
  const normals = computeVertexNormals(canonicalPositions, analysis.indices);

  const nodeName = config.nodeName || (assetId === 'mesh.hippocampus.left.v1' ? 'Mesh_Hippocampus_L' : `Mesh_${assetId.replace(/\./g, '_')}`);
  const meshName = config.meshName || nodeName;

  const meshData: MeshGeometryData = {
    positions: canonicalPositions,
    normals,
    indices: analysis.indices,
    nodeName,
    meshName
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
    input_frame: adapter.source_coordinate_system,
    output_frame: adapter.target_canonical_system,
    adapter_id: adapter.adapter_id,
    adapter_version: adapter.transformation_version,
    input_asset_hash: inputHash,
    output_asset_hash: outputHash,
    tool: 'NeuroAtlas3D Generic Canonicalizer v1.1',
    parameters: {
      source_orientation: adapter.source_orientation,
      target_orientation: adapter.target_orientation,
      axis_mapping: adapter.axis_mapping,
      translation_mm: adapter.translation_mm,
      scale: adapter.scale,
      registration_metadata: adapter.registration_metadata,
      normals: 'area_weighted_smooth'
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
    vertexCount: analysis.uniqueVertexCount,
    triangleCount: analysis.triangleCount,
    bounds,
    centroid: bounds.center,
    transformationRecord
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetAsset = process.argv[2] || 'mesh.hippocampus.left.v1';
  try {
    canonicalizeMesh(targetAsset);
  } catch (err) {
    console.error('Canonicalization failed:', err);
    process.exit(1);
  }
}
