/**
 * 3D Neuroanatomy Atlas: Mesh Geometric Quality Assurance Stage
 * Standard: AAS-2026-NEURO-V1 (Phase 1.0.1 Hardening)
 * 
 * Audits raw and derived meshes against MESH_VALIDATION_STANDARD.md.
 * Strictly decouples GEOMETRIC QA (technical validity per topology class)
 * from ANATOMICAL QA (anatomical veracity, laterality, and boundaries).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseAndAuditSTL, STLMeshAnalysis } from './stl_utils';
import { lateralityFromAssetId } from './asset_id_laterality';
import {
  TopologyClass,
  GeometricQAStatus,
  AnatomicalQAStatus,
  AssetQAProfile,
  STANDARD_QA_PROFILES
} from '../../src/types/topology';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export interface QACheckItem {
  name: string;
  category: 'geometric' | 'anatomical';
  passed: boolean;
  notApplicable?: boolean;
  details: string;
}

export interface GeometricQAResult {
  assetId: string;
  sourceFile: string;
  timestamp: string;
  topologyClass: TopologyClass;
  profileId: string;
  analysis: STLMeshAnalysis;
  checks: QACheckItem[];
  geometricStatus: GeometricQAStatus;
}

export interface AnatomicalQAResult {
  assetId: string;
  timestamp: string;
  declaredLaterality: 'left' | 'right' | 'bilateral' | 'midline';
  subfieldRepresentation: 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED' | 'DISCRETE_SUBFIELDS_SEGMENTED' | 'NOT_APPLICABLE';
  checks: QACheckItem[];
  anatomicalStatus: AnatomicalQAStatus;
  notes: string;
}

export interface UnifiedAssetQAReport {
  assetId: string;
  sourceFile: string;
  timestamp: string;
  topologyClass: TopologyClass;
  profileId: string;
  analysis: STLMeshAnalysis;
  geometricQA: GeometricQAResult;
  anatomicalQA: AnatomicalQAResult;
  overallStatus: 'GEOMETRY_VALIDATED' | 'FAILED'; // Backward-compatible field
}

/**
 * Runs pure Geometric QA against an AssetQAProfile.
 */
export function runGeometricQA(
  assetId: string,
  sourceFile: string,
  analysis: STLMeshAnalysis,
  profile: AssetQAProfile
): GeometricQAResult {
  const checks: QACheckItem[] = [];

  // Check 1: Non-Manifold Edges
  const nonManifoldPass = analysis.nonManifoldEdges <= profile.max_non_manifold_edges;
  checks.push({
    name: 'Non-Manifold Edges Check',
    category: 'geometric',
    passed: nonManifoldPass,
    details: `Found ${analysis.nonManifoldEdges} non-manifold edges (Limit: ${profile.max_non_manifold_edges})`
  });

  // Check 2: Duplicate Faces
  const dupFacesPass = analysis.duplicateFaces <= profile.max_duplicate_faces;
  checks.push({
    name: 'Duplicate Faces Check',
    category: 'geometric',
    passed: dupFacesPass,
    details: `Found ${analysis.duplicateFaces} duplicate faces (Limit: ${profile.max_duplicate_faces})`
  });

  // Check 3: Zero-Area Faces
  const zeroAreaPass = analysis.zeroAreaFaces <= profile.max_zero_area_faces;
  checks.push({
    name: 'Zero-Area Faces Check',
    category: 'geometric',
    passed: zeroAreaPass,
    details: `Found ${analysis.zeroAreaFaces} zero-area faces (Limit: ${profile.max_zero_area_faces})`
  });

  // Check 4: Watertight Surface
  if (profile.requires_watertight) {
    const watertightPass = analysis.isWatertight && analysis.boundaryEdges === 0;
    checks.push({
      name: 'Watertight Surface Check',
      category: 'geometric',
      passed: watertightPass,
      details: `Watertight: ${analysis.isWatertight} (Boundary open edges: ${analysis.boundaryEdges}, must be 0 for ${profile.topology_class}). NOTE: edge accounting is per-shell; see connectedShellCount for surface continuity.`
    });
  } else {
    checks.push({
      name: 'Watertight Surface Check',
      category: 'geometric',
      passed: true,
      notApplicable: true,
      details: `Open boundaries permitted for topology class '${profile.topology_class}' (Found ${analysis.boundaryEdges} boundary edges)`
    });
  }

  // Check 5: Triangle Requirement
  if (profile.requires_triangles) {
    const hasTris = analysis.triangleCount > 0;
    checks.push({
      name: 'Triangle Manifold Presence Check',
      category: 'geometric',
      passed: hasTris,
      details: `Mesh contains ${analysis.triangleCount} triangles and ${analysis.uniqueVertexCount} unique vertices`
    });
  }

  // Check 6: Surface continuity (Phase 3.1). A single continuous surface has exactly
  // 1 connected shell. Multi-shell composites are valid assets but must never be
  // classified CLOSED_SURFACE.
  if (profile.topology_class === 'MULTI_SHELL_COMPOSITE') {
    const shellsOk = analysis.connectedShellCount >= 2;
    checks.push({
      name: 'Multi-Shell Continuity Disclosure Check',
      category: 'geometric',
      passed: shellsOk,
      details: `Measured ${analysis.connectedShellCount} disjoint closed shells: asset is a concatenated composite, NOT one continuous surface. CLOSED_SURFACE classification prohibited.`
    });
  } else if (profile.topology_class === 'CLOSED_SURFACE' || profile.topology_class === 'SOLID') {
    const singleOk = analysis.connectedShellCount === 1;
    checks.push({
      name: 'Single-Surface Continuity Check',
      category: 'geometric',
      passed: singleOk,
      details: singleOk
        ? `Measured 1 connected shell: consistent with ${profile.topology_class}.`
        : `Measured ${analysis.connectedShellCount} disjoint shells: INCONSISTENT with ${profile.topology_class}; reclassify as MULTI_SHELL_COMPOSITE.`
    });
  }

  const allPassed = checks.every(c => c.passed);
  const geometricStatus: GeometricQAStatus = allPassed ? 'GEOMETRY_VALIDATED' : 'GEOMETRY_DEFECTIVE';

  return {
    assetId,
    sourceFile,
    timestamp: new Date().toISOString(),
    topologyClass: profile.topology_class,
    profileId: profile.profile_id,
    analysis,
    checks,
    geometricStatus
  };
}

/**
 * Runs pure Anatomical QA against clinical/organ criteria.
 */
export function runAnatomicalQA(params: {
  assetId: string;
  dimensionsMm: [number, number, number];
  volumeMm3: number;
  declaredLaterality: 'left' | 'right' | 'bilateral' | 'midline';
  subfieldRepresentation?: 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED' | 'DISCRETE_SUBFIELDS_SEGMENTED' | 'NOT_APPLICABLE';
  expectedDimensionsMm?: [number, number, number];
  expectedVolumeRangeCm3?: [number, number];
  // Phase 3.1 (D7): set true when the asset is a multi-component composite whose
  // per-component identities/boundaries have not been morphologically verified.
  compositeIdentitiesUnverified?: boolean;
}): AnatomicalQAResult {
  const checks: QACheckItem[] = [];
  const subfieldRep = params.subfieldRepresentation || 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED';

  // Check 1: Adult Macroscopic Brain Scale
  const [dx, dy, dz] = params.dimensionsMm;
  const reasonableBrainScale = dx >= 2.0 && dx <= 250.0 && dy >= 2.0 && dy <= 250.0 && dz >= 2.0 && dz <= 250.0;
  checks.push({
    name: 'Adult Human Anatomic Scale Check',
    category: 'anatomical',
    passed: reasonableBrainScale,
    details: `Dimensions: ${dx.toFixed(2)} x ${dy.toFixed(2)} x ${dz.toFixed(2)} mm`
  });

  // Check 2: Anatomical Volume Plausibility (if organ volume applicable)
  const volumeCm3 = params.volumeMm3 / 1000;
  if (params.expectedVolumeRangeCm3) {
    const [minV, maxV] = params.expectedVolumeRangeCm3;
    const volPass = volumeCm3 >= minV && volumeCm3 <= maxV;
    checks.push({
      name: 'Anatomical Volume Estimation Check',
      category: 'anatomical',
      passed: volPass,
      details: `Measured volume: ${volumeCm3.toFixed(2)} cm3 (Expected reference: ${minV} - ${maxV} cm3)`
    });
  } else {
    checks.push({
      name: 'Anatomical Volume Estimation Check',
      category: 'anatomical',
      passed: true,
      details: `Measured volume: ${volumeCm3.toFixed(2)} cm3`
    });
  }

  // Check 3: Subfield Resolution Scope
  let anatomicalStatus: AnatomicalQAStatus;
  let notes: string;

  if (subfieldRep === 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED') {
    checks.push({
      name: 'Internal Subfield Boundary Resolution Check',
      category: 'anatomical',
      passed: true,
      notApplicable: true,
      details: `Mesh represents macroscopic unsegmented organ body; microscopic subfields CA1-CA4 are not resolved in 3D geometry`
    });
    // Phase 3.1 correction (D7): scale/laterality plausibility checks alone do NOT
    // establish that the mesh represents the claimed anatomy (no contour comparison,
    // no landmark verification exists). Multi-component composites whose individual
    // identities/landmarks are unverified stay ANATOMICAL_MAPPING_PENDING.
    // Single-solid benchmark assets validated in their acceptance phase keep the
    // historical ANATOMY_VALIDATED status (see KNOWN_ANATOMICAL_LIMITATIONS.md:
    // that status means scale/laterality plausibility only, not morphological proof).
    if (params.compositeIdentitiesUnverified === true) {
      anatomicalStatus = 'ANATOMICAL_MAPPING_PENDING';
      notes = 'Scale and laterality plausible; individual component identities, sulcal/gyral boundaries, and landmark positions NOT morphologically verified. See Phase 3.1 report.';
    } else {
      anatomicalStatus = 'ANATOMY_VALIDATED';
      notes = 'Macroscopic scale/laterality plausibility only; internal subfields unsegmented. (Historical phase-acceptance status; not a morphological proof.)';
    }
  } else {
    anatomicalStatus = 'ANATOMY_VALIDATED';
    notes = 'Discrete subfield segmentation verified.';
  }

  return {
    assetId: params.assetId,
    timestamp: new Date().toISOString(),
    declaredLaterality: params.declaredLaterality,
    subfieldRepresentation: subfieldRep,
    checks,
    anatomicalStatus,
    notes
  };
}

/**
 * Validates an STL mesh asset against both geometric and anatomical standards.
 */
export function validateMesh(
  assetId: string = 'mesh.hippocampus.left.v1',
  profileId?: string
): UnifiedAssetQAReport {
  const isCortex = assetId.includes('cortex');
  // Phase 3.1 (D1): cortical assemblies are measured multi-shell concatenations,
  // never single continuous pial surfaces.
  const defaultProfileId = isCortex ? 'composite-cortical-assembly' : 'solid-subcortical-nucleus';
  const effectiveProfileId = profileId || defaultProfileId;

  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);
  let rawFilename = isCortex ? `${assetId}.raw.stl` : 'FMA72714.stl';
  if (fs.existsSync(rawDir)) {
    const stlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.stl'));
    if (stlFiles.length > 0) rawFilename = stlFiles[0];
  }

  const filePath = path.join(rawDir, rawFilename);
  console.log(`[QA AUDIT] Auditing asset: ${assetId} at ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const analysis = parseAndAuditSTL(buffer);

  const profile = STANDARD_QA_PROFILES[effectiveProfileId] || STANDARD_QA_PROFILES['solid-subcortical-nucleus'];
  console.log(`[QA AUDIT] Applied QA Profile: ${profile.profile_id} (Topology: ${profile.topology_class})`);

  // Expected adult human hemisphere cortical volume range: ~180 - 380 cm3
  // Adult human hippocampus volume bounds: ~1.5 - 4.8 cm3
  // Phase 5.0.2: NO presupposed volume range exists for gyral segments (L6 —
  // invented biological thresholds prohibited). Non-cortex, non-hippocampus
  // assets are measured and recorded WITHOUT a reference band (the passer-by
  // hippocampus band previously produced a false FAILED check on gyral assets;
  // the geometry was never defective — the expectation was).
  const expectedVolumeRange: [number, number] | undefined = isCortex
    ? [180.0, 380.0]
    : (assetId.includes('hippocampus') ? [1.5, 4.8] : undefined);

  // Run decoupled QA passes (paths relative to repo root for portability — Phase 3.1)
  const relFilePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');

  // Phase 3.1: validation reports must stay small, portable, and machine-independent.
  // Bulk vertex/index arrays are excluded everywhere (geometry lives in the hashed
  // raw/derived assets); only summary statistics are recorded.
  const { positions: _dropPositions, indices: _dropIndices, ...analysisSummary } = analysis;
  void _dropPositions; void _dropIndices;
  const leanAnalysis = analysisSummary as STLMeshAnalysis;

  const geometricQA = runGeometricQA(assetId, relFilePath, leanAnalysis, profile);
  // Laterality comes from the asset id's laterality segment via the shared
  // helper, so this report can never contradict scripts/validate_asset.ts or the
  // structure record. A null result means the id carries no laterality segment:
  // the pipeline stops instead of writing a report that guesses "midline".
  const assetLaterality = lateralityFromAssetId(assetId);
  if (assetLaterality === null) {
    throw new Error(
      `Asset id "${assetId}" has no left/right/bilateral/midline segment; ` +
        `declaring a laterality here would be a guess about anatomy.`
    );
  }
  const anatomicalQA = runAnatomicalQA({
    assetId,
    dimensionsMm: [analysis.dimensions[0], analysis.dimensions[1], analysis.dimensions[2]],
    volumeMm3: analysis.estimatedVolumeMm3,
    declaredLaterality: assetLaterality,
    expectedVolumeRangeCm3: expectedVolumeRange,
    subfieldRepresentation: 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED',
    compositeIdentitiesUnverified: isCortex
  });

  const combinedChecks = [...geometricQA.checks, ...anatomicalQA.checks];
  const overallStatus = geometricQA.geometricStatus === 'GEOMETRY_VALIDATED' ? 'GEOMETRY_VALIDATED' : 'FAILED';

  const report: UnifiedAssetQAReport = {
    assetId,
    sourceFile: path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
    timestamp: new Date().toISOString(),
    topologyClass: profile.topology_class,
    profileId: profile.profile_id,
    analysis: leanAnalysis,
    geometricQA,
    anatomicalQA,
    overallStatus
  };

  const outDir = path.join(PROJECT_ROOT, 'assets/validation');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${assetId}.geometry_qa.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[GEOMETRIC QA RESULT] Status: ${geometricQA.geometricStatus}`);
  geometricQA.checks.forEach(c => {
    console.log(`  - [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
  });
  console.log(`[ANATOMICAL QA RESULT] Status: ${anatomicalQA.anatomicalStatus}`);
  anatomicalQA.checks.forEach(c => {
    console.log(`  - [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
  });
  console.log(`[QA REPORT SAVED] ${outPath}`);

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] || 'mesh.hippocampus.left.v1';
  try {
    const res = validateMesh(target);
    if (res.geometricQA.geometricStatus !== 'GEOMETRY_VALIDATED') {
      process.exit(1);
    }
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  }
}
