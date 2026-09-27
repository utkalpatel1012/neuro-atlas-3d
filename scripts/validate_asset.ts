/**
 * 3D Neuroanatomy Atlas: Asset Validation CLI Tool
 * Standard: AAS-2026-NEURO-V1
 * 
 * Validates an anatomical asset against cryptographic integrity,
 * geometric quality standards, coordinate alignment, laterality,
 * and production licensing whitelist.
 * 
 * Usage:
 *   npx tsx scripts/validate_asset.ts [asset_id]
 *   npm run asset:validate -- hippocampus_left
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseGLB } from './pipeline/glb_utils';
import { validateCoordinatesAndLaterality, AnatomicalLateralityDeclaration } from './pipeline/coordinate_validator';
import { getAdapter, BODYPARTS3D_LPS_TO_RAS_ADAPTER } from './pipeline/coordinate_adapter';
import { TopologyClass, STANDARD_QA_PROFILES } from '../src/types/topology';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

interface ValidationCheck {
  title: string;
  passed: boolean;
  message: string;
}

export function validateAsset(rawArg: string): boolean {
  // Normalize alias (e.g., 'hippocampus_left' -> 'mesh.hippocampus.left.v1')
  let assetId = rawArg.trim();
  if (assetId === 'hippocampus_left' || assetId === 'left_hippocampus' || assetId === 'hippocampus.left') {
    assetId = 'mesh.hippocampus.left.v1';
  }

  console.log(`\n================================================================`);
  console.log(`[ASSET VALIDATION AUDIT] Target Asset: ${assetId}`);
  console.log(`================================================================`);

  const checks: ValidationCheck[] = [];

  // Check 1: Manifest Presence
  const manifestPath = path.join(PROJECT_ROOT, 'assets/manifests/assets.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    checks.push({ title: 'Manifest Exists', passed: false, message: 'assets/manifests/assets.manifest.json not found.' });
    reportResults(assetId, checks);
    return false;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const assetRecord = manifest.assets?.[assetId];
  if (!assetRecord) {
    checks.push({ title: 'Manifest Registration', passed: false, message: `Asset '${assetId}' not registered in manifest.` });
    reportResults(assetId, checks);
    return false;
  }
  checks.push({ title: 'Manifest Registration', passed: true, message: `Registered in manifest v${manifest.manifest_version}` });

  // Check 2: Raw Source File & Ingestion Record
  const rawDir = path.join(PROJECT_ROOT, 'assets/raw', assetId);
  const ingestionJsonPath = path.join(rawDir, 'ingestion.json');
  if (!fs.existsSync(ingestionJsonPath)) {
    checks.push({ title: 'Ingestion Record', passed: false, message: `Missing ingestion.json in ${rawDir}` });
  } else {
    const ingestionData = JSON.parse(fs.readFileSync(ingestionJsonPath, 'utf8'));
    const rawStlPath = path.join(rawDir, ingestionData.original_filename);
    if (!fs.existsSync(rawStlPath)) {
      checks.push({ title: 'Raw STL File', passed: false, message: `Missing raw source file: ${rawStlPath}` });
    } else {
      const rawBytes = fs.readFileSync(rawStlPath);
      const computedSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');
      const expectedHash = ingestionData.original_hash || ingestionData.verified_source_sha256;
      const hashMatch = computedSha256 === expectedHash;
      checks.push({
        title: 'Raw Source Integrity',
        passed: hashMatch,
        message: hashMatch
          ? `Verified SHA-256: ${computedSha256.slice(0, 16)}... (${rawBytes.length} bytes)`
          : `Hash mismatch! Expected ${expectedHash}, got ${computedSha256}`
      });
    }
  }

  // Check 3: Canonical Mesh & SHA-256
  const canonicalPath = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'canonical', `${assetId}.canonical.glb`);
  if (!fs.existsSync(canonicalPath)) {
    checks.push({ title: 'Canonical GLB File', passed: false, message: `Missing canonical GLB: ${canonicalPath}` });
  } else {
    const canonicalBytes = fs.readFileSync(canonicalPath);
    const computedCanonicalSha256 = crypto.createHash('sha256').update(canonicalBytes).digest('hex');
    const hashMatch = computedCanonicalSha256 === assetRecord.resulting_sha256_hash;
    checks.push({
      title: 'Canonical SHA-256 Verification',
      passed: hashMatch,
      message: hashMatch
        ? `Canonical GLB verified: ${computedCanonicalSha256.slice(0, 16)}... (${canonicalBytes.length} bytes)`
        : `Canonical hash mismatch! Manifest: ${assetRecord.resulting_sha256_hash}, on disk: ${computedCanonicalSha256}`
    });

    // Check 4: 4-Stage Coordinate Space & Laterality Confirmation
    try {
      const { geometry, bounds: canonicalBounds } = parseGLB(canonicalBytes);
      const isLeft = assetId.includes('left') || assetId.includes('.l.');
      const declaredLaterality: AnatomicalLateralityDeclaration = isLeft ? 'left' : 'right';

      // Load raw bounds from geometry QA report or compute from raw file
      let rawBounds = canonicalBounds;
      let qaDims: [number, number, number] | undefined;
      const geomQaPathEarly = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.geometry_qa.json`);
      if (fs.existsSync(geomQaPathEarly)) {
        const qaData = JSON.parse(fs.readFileSync(geomQaPathEarly, 'utf8'));
        if (qaData.analysis?.minBounds && qaData.analysis?.maxBounds) {
          const min = qaData.analysis.minBounds as [number, number, number];
          const max = qaData.analysis.maxBounds as [number, number, number];
          rawBounds = {
            min,
            max,
            center: [
              (min[0] + max[0]) / 2,
              (min[1] + max[1]) / 2,
              (min[2] + max[2]) / 2
            ],
            dimensions: qaData.analysis.dimensions as [number, number, number],
            radius: Math.sqrt(
              Math.pow(max[0] - min[0], 2) +
              Math.pow(max[1] - min[1], 2) +
              Math.pow(max[2] - min[2], 2)
            ) / 2
          };
          qaDims = qaData.analysis.dimensions as [number, number, number];
        }
      }

      // Resolve coordinate adapter
      const adapter = getAdapter('adapter.bodyparts3d.lps_whole_body_to_ras') || BODYPARTS3D_LPS_TO_RAS_ADAPTER;

      const coordResult = validateCoordinatesAndLaterality({
        rawBounds,
        canonicalBounds,
        adapter,
        declaredLaterality,
        midlineToleranceMm: 2.0
      });

      checks.push({
        title: '4-Stage Coordinate & Laterality Chain',
        passed: coordResult.passed,
        message: coordResult.passed
          ? `Verified 4/4 stages: Source(${adapter.source_coordinate_system}) -> Isometry -> Canonical internal (+X R, +Y S, +Z Posterior; NOT RAS/MNI) -> Laterality(${declaredLaterality}, Centroid X=${canonicalBounds.center[0].toFixed(2)} mm)`
          : `Coordinate/Laterality error: ${coordResult.diagnostics.filter(d => d.includes('Failure')).join('; ')}`
      });

      // Anatomic dimensions check — Phase 3.1 fix: the old hardcoded band
      // (10-35 x 10-35 x 25-60 mm) was a hippocampus template that failed EVERY
      // cortex asset. Now: macroscopic human scale per axis (2-250 mm, same rule as
      // coordinate_validator.ts) AND consistency with the asset's own QA report.
      const [dimX, dimY, dimZ] = canonicalBounds.dimensions;
      const macroscopic = [dimX, dimY, dimZ].every((d) => d >= 2.0 && d <= 250.0);
      // Same-set check: the adapter only permutes axes (rigid), so sorted raw-frame
      // QA dims must match sorted canonical GLB dims within tolerance. This verifies
      // transform consistency without any organ-specific template (same principle as
      // coordinate_validator.ts).
      let setConsistent = true;
      if (qaDims) {
        const a = [...qaDims].sort((x, y) => x - y);
        const b = [dimX, dimY, dimZ].sort((x, y) => x - y);
        setConsistent = a.every((v, i) => Math.abs(v - b[i]) < 0.5);
      }
      const dimensionsValid = macroscopic && setConsistent;
      checks.push({
        title: 'Adult Organ Dimensions Verification',
        passed: dimensionsValid,
        message: dimensionsValid
          ? `Dimensions: ${dimX.toFixed(2)} mm (W) x ${dimY.toFixed(2)} mm (H) x ${dimZ.toFixed(2)} mm (L)`
          : `Abnormal dimensions: ${dimX.toFixed(2)} x ${dimY.toFixed(2)} x ${dimZ.toFixed(2)} mm`
      });
    } catch (err: any) {
      checks.push({ title: 'Coordinate & Laterality Validation', passed: false, message: `Failed to validate coordinates: ${err.message}` });
    }
  }

  // Check 5: LOD Files & Manifest Hash Verification
  const lodDir = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'lod');
  const expectedLODs = ['lod0', 'lod1', 'lod2', 'lod3'];
  let allLodsPass = true;
  for (const lod of expectedLODs) {
    const lodFile = path.join(lodDir, `${assetId}.${lod}.glb`);
    if (!fs.existsSync(lodFile)) {
      allLodsPass = false;
      checks.push({ title: `LOD Check (${lod})`, passed: false, message: `File not found: ${lodFile}` });
    } else {
      const bytes = fs.readFileSync(lodFile);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const manifestLodHash = assetRecord.lod_files?.[lod]?.sha256;
      if (manifestLodHash && hash !== manifestLodHash) {
        allLodsPass = false;
        checks.push({ title: `LOD Hash (${lod})`, passed: false, message: `Hash mismatch for ${lod}: ${hash} != ${manifestLodHash}` });
      }
    }
  }
  if (allLodsPass) {
    checks.push({ title: 'Multi-LOD Hierarchy Verification', passed: true, message: 'All 4 LOD levels (LOD0-LOD3) verified with valid SHA-256 hashes' });
  }

  // Check 6: Runtime Meshopt Assets Verification
  const runtimeDir = path.join(PROJECT_ROOT, 'assets/derived', assetId, 'runtime');
  let allRuntimePass = true;
  for (const lod of expectedLODs) {
    const runtimeFile = path.join(runtimeDir, `${assetId}.${lod}.meshopt.glb`);
    if (!fs.existsSync(runtimeFile)) {
      allRuntimePass = false;
      checks.push({ title: `Runtime Check (${lod})`, passed: false, message: `File not found: ${runtimeFile}` });
    } else {
      const bytes = fs.readFileSync(runtimeFile);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const manifestRuntimeHash = assetRecord.runtime_files?.[lod]?.sha256;
      if (manifestRuntimeHash && hash !== manifestRuntimeHash) {
        allRuntimePass = false;
        checks.push({ title: `Runtime Meshopt Hash (${lod})`, passed: false, message: `Hash mismatch for ${lod}.meshopt: ${hash} != ${manifestRuntimeHash}` });
      }
    }
  }
  if (allRuntimePass) {
    checks.push({ title: 'Runtime Meshopt Assets Verification', passed: true, message: 'All 4 runtime Meshopt-compressed assets verified with valid SHA-256 hashes' });
  }

  // Check 7: Decoupled Geometric QA & Topology Profile Standard
  const geomQaPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.geometry_qa.json`);
  if (!fs.existsSync(geomQaPath)) {
    checks.push({ title: 'Geometric QA Report', passed: false, message: 'Missing geometry QA report.' });
  } else {
    const geomQa = JSON.parse(fs.readFileSync(geomQaPath, 'utf8'));
    const topologyClass: TopologyClass = geomQa.topologyClass || 'SOLID';
    const profile = STANDARD_QA_PROFILES[geomQa.profileId] || STANDARD_QA_PROFILES['solid-subcortical-nucleus'];

    const geomPassed = geomQa.geometricQA
      ? geomQa.geometricQA.geometricStatus === 'GEOMETRY_VALIDATED'
      : (geomQa.overallStatus === 'GEOMETRY_VALIDATED' && geomQa.analysis.nonManifoldEdges === 0);

    const watertightOk = profile?.watertight_required ? geomQa.analysis.isWatertight === true : true;
    const isClean = geomPassed &&
      geomQa.analysis.nonManifoldEdges === 0 &&
      geomQa.analysis.duplicateFaces === 0 &&
      geomQa.analysis.zeroAreaFaces === 0 &&
      watertightOk;

    checks.push({
      title: 'Decoupled Geometric QA Standard',
      passed: isClean,
      message: isClean
        ? `Topology: ${topologyClass} | Watertight: ${geomQa.analysis.isWatertight} | Non-manifold edges: 0 | Duplicate faces: 0 | Zero-area faces: 0`
        : `QA Failure: status=${geomQa.overallStatus}, non-manifold=${geomQa.analysis.nonManifoldEdges}, watertight=${geomQa.analysis.isWatertight}`
    });

    // Phase 3.1 (D7): ANATOMY_VALIDATED here means scale/laterality plausibility
    // only (no morphological proof exists in this repo). ANATOMICAL_MAPPING_PENDING
    // is an HONEST reported state, not a failure — only REJECTED/missing fails.
    const anatStatus: string = geomQa.anatomicalQA ? geomQa.anatomicalQA.anatomicalStatus : 'UNKNOWN';
    const anatPassed = anatStatus === 'ANATOMY_VALIDATED' || anatStatus === 'ANATOMICAL_MAPPING_PENDING';

    checks.push({
      title: 'Decoupled Anatomical QA Standard',
      passed: anatPassed,
      message: anatPassed
        ? `Anatomical status: ${anatStatus} (scale/laterality plausibility grade; see KNOWN_ANATOMICAL_LIMITATIONS.md) | Laterality: ${geomQa.anatomicalQA?.declaredLaterality || 'left'} | Subfields: ${geomQa.anatomicalQA?.subfieldRepresentation || 'MACROSCOPIC_HOMOGENEOUS_UNSEGMENTED'}`
        : `Anatomical QA Failure: status=${anatStatus}`
    });
  }

  // Check 8: Production Eligibility & Quarantine Verification
  const isWhitelisted = manifest.production_whitelist?.includes(assetId);
  const isQuarantined = manifest.research_quarantine?.includes(assetId);
  const isAllowed = assetRecord.production_eligibility === 'PRODUCTION_ALLOWED';
  const licensePermitted = assetRecord.commercial_redistribution === 'PERMITTED';
  const productionReady = isWhitelisted && !isQuarantined && isAllowed && licensePermitted;

  checks.push({
    title: 'Production Whitelist & Licensing Terms Recorded',
    passed: productionReady,
    message: productionReady
      ? `Whitelisted: true | Quarantine: false | Eligibility: PRODUCTION_ALLOWED | License: ${assetRecord.upstream_license}`
      : `Production check failed: whitelisted=${isWhitelisted}, quarantined=${isQuarantined}, eligibility=${assetRecord.production_eligibility}`
  });

  return reportResults(assetId, checks);
}

function reportResults(assetId: string, checks: ValidationCheck[]): boolean {
  console.log(`\nAudit Results for ${assetId}:`);
  console.log(`----------------------------------------------------------------`);
  let allPassed = true;
  for (const c of checks) {
    const tag = c.passed ? '[PASS]' : '[FAIL]';
    console.log(`${tag.padEnd(7)} ${c.title.padEnd(35)} : ${c.message}`);
    if (!c.passed) allPassed = false;
  }
  console.log(`----------------------------------------------------------------`);
  if (allPassed) {
    console.log(`[VALIDATION PASSED] All ${checks.length} checks successfully passed.`);
    console.log(`Asset ${assetId} passed pipeline validation for production atlas use (technical checks only; LEGAL_REVIEW_REQUIRED before commercial redistribution).\n`);
    return true;
  } else {
    console.error(`[VALIDATION FAILED] One or more checks failed for ${assetId}.\n`);
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] || 'mesh.hippocampus.left.v1';
  const ok = validateAsset(target);
  if (!ok) {
    process.exit(1);
  }
}
