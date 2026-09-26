/**
 * 3D Neuroanatomy Atlas: Mesh Geometric Quality Assurance Stage
 * Standard: AAS-2026-NEURO-V1
 * 
 * Audits raw and derived meshes against MESH_VALIDATION_STANDARD.md.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseAndAuditSTL, STLMeshAnalysis } from './stl_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface GeometricQAResult {
  assetId: string;
  sourceFile: string;
  timestamp: string;
  analysis: STLMeshAnalysis;
  checks: {
    name: string;
    passed: boolean;
    details: string;
  }[];
  overallStatus: 'GEOMETRY_VALIDATED' | 'FAILED';
}

export function validateRawSTL(assetId: string, filename: string): GeometricQAResult {
  const filePath = path.join(PROJECT_ROOT, 'assets/raw', assetId, filename);
  console.log(`[GEOMETRIC QA] Auditing: ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const analysis = parseAndAuditSTL(buffer);

  const checks = [
    {
      name: 'Non-Manifold Edges Check',
      passed: analysis.nonManifoldEdges === 0,
      details: `Found ${analysis.nonManifoldEdges} non-manifold edges (Must be 0)`
    },
    {
      name: 'Duplicate Faces Check',
      passed: analysis.duplicateFaces === 0,
      details: `Found ${analysis.duplicateFaces} duplicate faces (Must be 0)`
    },
    {
      name: 'Zero-Area Faces Check',
      passed: analysis.zeroAreaFaces === 0,
      details: `Found ${analysis.zeroAreaFaces} zero-area faces (Must be 0)`
    },
    {
      name: 'Watertight Surface Check',
      passed: analysis.isWatertight,
      details: `Watertight: ${analysis.isWatertight} (Boundary edges: ${analysis.boundaryEdges})`
    },
    {
      name: 'Adult Human Anatomic Scale Check',
      passed: analysis.dimensions[0] > 10 && analysis.dimensions[0] < 50 &&
              analysis.dimensions[1] > 20 && analysis.dimensions[1] < 60 &&
              analysis.dimensions[2] > 10 && analysis.dimensions[2] < 50,
      details: `Dimensions: ${analysis.dimensions.map(d => d.toFixed(2)).join(' x ')} mm`
    },
    {
      name: 'Anatomical Volume Estimation Check',
      passed: analysis.estimatedVolumeMm3 > 1500 && analysis.estimatedVolumeMm3 < 6000,
      details: `Volume: ${(analysis.estimatedVolumeMm3 / 1000).toFixed(2)} cm3 (Normal adult: 2.5 - 4.5 cm3)`
    }
  ];

  const allPassed = checks.every(c => c.passed);
  const result: GeometricQAResult = {
    assetId,
    sourceFile: filePath,
    timestamp: new Date().toISOString(),
    analysis,
    checks,
    overallStatus: allPassed ? 'GEOMETRY_VALIDATED' : 'FAILED'
  };

  const outDir = path.join(PROJECT_ROOT, 'assets/validation');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${assetId}.geometry_qa.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[GEOMETRIC QA RESULT] Overall Status: ${result.overallStatus}`);
  checks.forEach(c => {
    console.log(`  - [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
  });
  console.log(`[GEOMETRIC QA REPORT] Saved report: ${outPath}`);

  return result;
}

export function validateMesh(assetId: string = 'mesh.hippocampus.left.v1'): GeometricQAResult {
  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);
  let rawFilename = 'FMA72714.stl';
  if (fs.existsSync(rawDir)) {
    const stlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.stl'));
    if (stlFiles.length > 0) rawFilename = stlFiles[0];
  }
  return validateRawSTL(assetId, rawFilename);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const res = validateMesh('mesh.hippocampus.left.v1');
    if (res.overallStatus !== 'GEOMETRY_VALIDATED') {
      process.exit(1);
    }
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  }
}
