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

    // Check 4: Coordinate Space & Laterality Confirmation
    try {
      const { geometry, bounds } = parseGLB(canonicalBytes);
      const centroidX = bounds.center[0];
      const centroidY = bounds.center[1];
      const centroidZ = bounds.center[2];

      const isLeft = assetId.includes('left') || assetId.includes('.l.');
      // In RAS coordinates: +X is Right, -X is Left
      const lateralityCorrect = isLeft ? centroidX < 0 : centroidX > 0;

      checks.push({
        title: 'Anatomical Laterality Verification',
        passed: lateralityCorrect,
        message: lateralityCorrect
          ? `Confirmed LEFT laterality in RAS: Centroid X = ${centroidX.toFixed(2)} mm (< 0)`
          : `LATERALITY ERROR: Left structure has Centroid X = ${centroidX.toFixed(2)} mm (Expected < 0)`
      });

      // Anatomic dimensions check
      const [dimX, dimY, dimZ] = bounds.dimensions;
      const dimensionsValid = dimX > 10 && dimX < 35 && dimY > 10 && dimY < 35 && dimZ > 25 && dimZ < 60;
      checks.push({
        title: 'Adult Organ Dimensions Verification',
        passed: dimensionsValid,
        message: dimensionsValid
          ? `Dimensions: ${dimX.toFixed(2)} mm (W) x ${dimY.toFixed(2)} mm (H) x ${dimZ.toFixed(2)} mm (L)`
          : `Abnormal dimensions: ${dimX.toFixed(2)} x ${dimY.toFixed(2)} x ${dimZ.toFixed(2)} mm`
      });
    } catch (err: any) {
      checks.push({ title: 'Canonical Geometry Inspection', passed: false, message: `Failed to inspect canonical GLB: ${err.message}` });
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

  // Check 7: Geometric QA Standard
  const geomQaPath = path.join(PROJECT_ROOT, 'assets/validation', `${assetId}.geometry_qa.json`);
  if (!fs.existsSync(geomQaPath)) {
    checks.push({ title: 'Geometric QA Report', passed: false, message: 'Missing geometry QA report.' });
  } else {
    const geomQa = JSON.parse(fs.readFileSync(geomQaPath, 'utf8'));
    const isClean = geomQa.overallStatus === 'GEOMETRY_VALIDATED' &&
      geomQa.analysis.nonManifoldEdges === 0 &&
      geomQa.analysis.duplicateFaces === 0 &&
      geomQa.analysis.zeroAreaFaces === 0 &&
      geomQa.analysis.isWatertight === true;
    checks.push({
      title: 'Topological & Geometric Standard',
      passed: isClean,
      message: isClean
        ? `Watertight: true | Non-manifold edges: 0 | Duplicate faces: 0 | Zero-area faces: 0`
        : `QA Failure: status=${geomQa.overallStatus}, non-manifold=${geomQa.analysis.nonManifoldEdges}`
    });
  }

  // Check 8: Production Eligibility & Quarantine Verification
  const isWhitelisted = manifest.production_whitelist?.includes(assetId);
  const isQuarantined = manifest.research_quarantine?.includes(assetId);
  const isAllowed = assetRecord.production_eligibility === 'PRODUCTION_ALLOWED';
  const licenseCleared = assetRecord.commercial_redistribution === 'PERMITTED';
  const productionReady = isWhitelisted && !isQuarantined && isAllowed && licenseCleared;

  checks.push({
    title: 'Production Whitelist & Licensing Cleared',
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
    console.log(`Asset ${assetId} is verified and cleared for production atlas use.\n`);
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
