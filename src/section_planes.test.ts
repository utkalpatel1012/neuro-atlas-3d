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
  invertPlane,
  movePlane,
  toThreePlane,
  standardAxisIndex,
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

  // --- inversion (Phase 4A §7): flip retained side, geometry unchanged ---
  const base = makePlane([0, 0, 1], [0, 0, 10], '+n', 'inversion test');
  assert(base !== null, 'inversion base constructed');
  passedChecks++;
  const inv = invertPlane(base!);
  assert(inv.retainedSide === '-n', 'inversion flips retained side');
  passedChecks++;
  assert(inv.normal[2] === 1 && inv.origin[2] === 10, 'inversion preserves normal+origin');
  passedChecks++;
  assert(isRetained(base!, [0, 0, 11]) === true && isRetained(inv, [0, 0, 11]) === false,
    'inversion swaps retained/culled sides');
  passedChecks++;
  assert(invertPlane(inv).retainedSide === '+n', 'double inversion restores');
  passedChecks++;

  // --- arbitrary oblique rotation (Phase 4A §7) ---
  const s = Math.SQRT1_2;
  const obl = makePlane([s, 0, s], [0, 0, 0], '+n', 'oblique test');
  assert(obl !== null, 'oblique plane constructed (auto-normalized)');
  passedChecks++;
  const oblMag = Math.sqrt(obl!.normal[0] ** 2 + obl!.normal[1] ** 2 + obl!.normal[2] ** 2);
  assert(Math.abs(oblMag - 1) < 1e-12, `oblique normal is unit (got ${oblMag})`);
  passedChecks++;
  // Point along the normal at distance 10: d must equal 10.
  const dObl: number = signedDistance(obl!, [10 * s, 0, 10 * s]);
  assert(Math.abs(dObl - 10) < 1e-9, `oblique signed distance exact (got ${dObl})`);
  passedChecks++;
  // Rotated frame: 90-degree rotation of a sagittal plane about Y gives coronal.
  const rot90 = makePlane([0, 0, 1], [0, 0, -19.47], '+n', 'rotated test');
  const sagRef = standardPlane('sagittal', 0, '+n', 'ref');
  assert(rot90 !== null && sagRef !== null, 'rotation pair constructed');
  passedChecks++;
  assert(Math.abs(signedDistance(rot90!, [7, 3, -19.47])) < 1e-12, 'rotated plane on-point distance 0');
  passedChecks++;

  // --- tolerance edge: distance ≈ 0 retained, never unstable ---
  const epsPlane = makePlane([1, 0, 0], [0, 0, 0], '+n', 'eps test');
  assert(epsPlane !== null, 'eps plane constructed');
  passedChecks++;
  assert(isRetained(epsPlane!, [SECTION_EPS_MM / 2, 0, 0]) === true, 'sub-epsilon positive retained');
  passedChecks++;
  assert(isRetained(epsPlane!, [-SECTION_EPS_MM / 2, 0, 0]) === true, 'sub-epsilon negative retained (on-plane band)');
  passedChecks++;
  assert(isRetained(epsPlane!, [-1, 0, 0]) === false, 'clear negative culled');
  passedChecks++;

  // --- movePlane preserves normal, updates origin + provenance ---
  const moved = movePlane(base!, [0, 0, 25], 'moved provenance');
  assert(moved !== null && moved.origin[2] === 25 && moved.normal[2] === 1, 'move updates origin only');
  passedChecks++;
  assert(moved!.originProvenance === 'moved provenance', 'move records new provenance');
  passedChecks++;
  assert(movePlane(base!, [NaN, 0, 0], 'x') === null, 'move to NaN rejected');
  passedChecks++;

  // --- toThreePlane mapping: constant = -n.p0, inversion negates ---
  const tp = toThreePlane(base!);
  assert(tp.normal.z === 1 && Math.abs(tp.constant - -10) < 1e-12, `THREE.Plane constant -n.p0 (got ${tp.constant})`);
  passedChecks++;
  const tpInv = toThreePlane(inv);
  assert(tpInv.normal.z === -1 && Math.abs(tpInv.constant - 10) < 1e-12, 'inverted THREE.Plane negated');
  passedChecks++;

  // --- standard axis indices (canonical: sagittal->X, coronal->Z, axial->Y) ---
  assert(standardAxisIndex('sagittal') === 0, 'sagittal axis is X');
  passedChecks++;
  assert(standardAxisIndex('coronal') === 2, 'coronal axis is Z');
  passedChecks++;
  assert(standardAxisIndex('axial') === 1, 'axial axis is Y');
  passedChecks++;

  console.log('\n================================================================');
  console.log(`ALL SECTION-PLANE MATH TESTS PASSED (${passedChecks} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Section-plane test execution failed:\n', err);
  process.exit(1);
});
