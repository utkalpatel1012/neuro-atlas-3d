/**
 * 3D Neuroanatomy Atlas: Section-Plane Mathematics Tests (Phase 3.2, Gate 2)
 *
 * Tests the pure math model ONLY (no renderer). cousins: docs/SECTION_PLANE_SPECIFICATION.md.
 */

import {
  dot,
  normalize,
  makePlane,
  signedDistance,
  isRetained,
  standardPlane,
  SECTION_EPS_MM,
  Vec3
} from './engine/sectionPlanes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 3.2 SECTION-PLANE MATH TEST SUITE');
  console.log('================================================================\n');
  let passedChecks = 0;

  // --- normalization ---
  const n1 = normalize([3, 0, 4]);
  assert(n1 !== null && Math.abs(n1[0] - 0.6) < 1e-12 && Math.abs(n1[2] - 0.8) < 1e-12, 'normalize (3,0,4) -> (0.6,0,0.8)');
  passedChecks++;
  assert(normalize([0, 0, 0]) === null, 'zero vector rejected');
  passedChecks++;
  assert(normalize([NaN, 0, 0]) === null, 'NaN rejected');
  passedChecks++;
  assert(normalize([Infinity, 0, 0]) === null, 'Infinity rejected');
  passedChecks++;
  const n5 = normalize([0, -2, 0]);
  assert(n5 !== null && n5[1] === -1, 'sign preserved in normalization');
  passedChecks++;

  // --- plane equation n.(p-p0)=0 + signed distance ---
  const pl = makePlane([0, 0, 1], [0, 0, 10], '+n', 'unit-test provenance');
  assert(pl !== null, 'valid plane constructed');
  passedChecks++;
  const dOn: number = signedDistance(pl!, [5, -3, 10]);
  assert(Math.abs(dOn) < 1e-12, `on-plane distance is 0 (got ${dOn})`);
  passedChecks++;
  const dPos: number = signedDistance(pl!, [0, 0, 15]);
  assert(Math.abs(dPos - 5) < 1e-12, `+n side distance +5 (got ${dPos})`);
  passedChecks++;
  const dNeg: number = signedDistance(pl!, [0, 0, 4]);
  assert(Math.abs(dNeg + 6) < 1e-12, `-n side distance -6 (got ${dNeg})`);
  passedChecks++;

  // --- clipping predicate + epsilon ---
  assert(isRetained(pl!, [0, 0, 10]) === true, 'on-plane point retained');
  passedChecks++;
  assert(isRetained(pl!, [0, 0, 11]) === true, '+n side retained');
  passedChecks++;
  assert(isRetained(pl!, [0, 0, 9]) === false, '-n side culled');
  passedChecks++;
  assert(isRetained(pl!, [0, 0, 10 - SECTION_EPS_MM / 2]) === true, 'within-epsilon retained');
  passedChecks++;
  const plNeg = makePlane([0, 0, 1], [0, 0, 10], '-n', 'unit-test provenance');
  assert(plNeg !== null && isRetained(plNeg!, [0, 0, 9]) === true, "'-n' retention flips sides");
  passedChecks++;

  // --- degenerate construction rejected ---
  assert(makePlane([0, 0, 0], [0, 0, 0], '+n', 'x') === null, 'zero normal rejected');
  passedChecks++;
  assert(makePlane([0, 0, 1], [NaN, 0, 0], '+n', 'x') === null, 'non-finite origin rejected');
  passedChecks++;
  assert(makePlane([0, 0, 1], [0, 0, 0], '+n', '') === null, 'missing provenance rejected');
  passedChecks++;

  // --- canonical axis mapping (§6 verified: sagittal->X, coronal->Z, axial->Y) ---
  const sag = standardPlane('sagittal', 0, '+n', 'midline X=0 convention');
  assert(sag !== null && sag.normal[0] === 1 && sag.origin[0] === 0, 'sagittal: X constant');
  passedChecks++;
  const cor = standardPlane('coronal', -20, '+n', 'test');
  assert(cor !== null && cor.normal[2] === 1 && cor.origin[2] === -20, 'coronal: Z constant (NOT Y)');
  passedChecks++;
  const axi = standardPlane('axial', 16, '+n', 'test');
  assert(axi !== null && axi.normal[1] === 1 && axi.origin[1] === 16, 'axial: Y constant (NOT Z)');
  passedChecks++;
  // Mesh-reality check: frontal chunk (low Z) vs occipital chunk (high Z) fall on
  // opposite sides of a mid-coronal plane — the mapping that matters for Phase 4.
  const midCor = standardPlane('coronal', -19.47, '+n', 'cortex bbox-center Z');
  const frontalPt: Vec3 = [-32.5, 16.01, -52.5];
  const occipitalPt: Vec3 = [-32.5, 16.01, 41.1];
  assert(midCor !== null && isRetained(midCor, occipitalPt) && !isRetained(midCor, frontalPt),
    'mid-coronal plane separates measured frontal/occipital component centroids');
  passedChecks++;
  assert(dot([1, 2, 3], [4, 5, 6]) === 32, 'dot product sanity');
  passedChecks++;

  console.log('\n================================================================');
  console.log(`ALL SECTION-PLANE MATH TESTS PASSED (${passedChecks} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Section-plane test execution failed:\n', err);
  process.exit(1);
});
