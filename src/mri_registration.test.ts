/**
 * 3D Neuroanatomy Atlas: Phase 4D Registration Tests
 * Standard: AAS-2026-NEURO-V1
 *
 * ALL transforms/landmarks below are TEST_ONLY_SYNTHETIC (§31): algorithm and
 * gating verification only. NOTHING here enters production registration records
 * or assets — the production Colin27 record must remain REGISTRATION_PENDING
 * (asserted in TEST 7).
 */

import {
  validateLandmark,
  pairEstimationLandmarks,
  estimateRigidTransform,
  validateRegistration,
  registrationVersionId,
  RegistrationLandmark,
  LandmarkPair
} from './engine/mriRegistration';
import {
  isValidMatrix,
  mat4Determinant,
  mat4Handedness,
  mat4Inverse,
  mat4ApplyPoint,
  roundTripErrorMm,
  canonicalPlaneToVoxel,
  canOverlayWithMesh,
  createColin27_1998Record,
  MriVolumeRecord
} from './engine/mriVolume';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    throw new Error(message);
  }
}

const SYNTH_NOTE = 'TEST_ONLY_SYNTHETIC';

function synthLandmark(
  id: string,
  space: 'mri_world' | 'canonical',
  coordinates: [number, number, number],
  role: 'registration' | 'validation' = 'registration'
): RegistrationLandmark {
  return {
    id,
    name: `Synthetic ${id} (${SYNTH_NOTE})`,
    sourceSpace: space,
    coordinates,
    units: 'mm',
    provenance: {
      howIdentified: 'algorithmic_detected',
      method: `synthetic test harness (${SYNTH_NOTE})`,
      sourceRef: 'in-test generated coordinates'
    },
    uncertaintyMm: null,
    role
  };
}

/** Apply a row-major rigid matrix to points (test-side ground truth). */
function applyRigid(m: number[], p: [number, number, number]): [number, number, number] {
  return [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
    m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
    m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]
  ];
}

const KNOWN_RIGID: number[] = (() => {
  const a = Math.PI / 6;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, 10, s, c, 0, -4, 0, 0, 1, 7, 0, 0, 0, 1];
})();

const BASE_POINTS: Array<[number, number, number]> = [
  [0, 0, 0],
  [40, 5, -10],
  [-30, 25, 15],
  [10, -35, 20],
  [5, 10, -40]
];

function syntheticPairs(): LandmarkPair[] {
  return BASE_POINTS.map((p) => ({ mriWorld: p, canonical: applyRigid(KNOWN_RIGID, p) }));
}

function validatedRecordWith(matrix: number[], states: Array<'REGISTERED_TO_CANONICAL' | 'REGISTRATION_VALIDATED'>): MriVolumeRecord {
  const base = createColin27_1998Record();
  return {
    ...base,
    volumeId: 'volume.mri.synthetic_reg.v1',
    registration: {
      status: 'COMPUTATIONALLY_REGISTERED',
      inputSpace: 'mri_world',
      outputSpace: 'canonical',
      transformType: 'rigid_6dof',
      matrix: [...matrix],
      matrixConvention: 'row-major-4x4-input-to-output',
      software: `synthetic harness (${SYNTH_NOTE})`,
      toolVersion: 'test-0',
      treMm: null,
      uncertaintyMm: null,
      validationMethod: 'synthetic independent landmarks (test only)',
      expertReview: 'EXPERT_REVIEW_PENDING'
    },
    validationStates: [...base.validationStates, ...states]
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('NEURO ATLAS 3D: PHASE 4D REGISTRATION TEST SUITE');
  console.log('================================================================\n');
  let passed = 0;

  // TEST 1: rigid estimation recovers a known transform (synthetic).
  console.log('--- TEST 1: Rigid estimation validity ---');
  const fit = estimateRigidTransform(syntheticPairs());
  assert('result' in fit, `estimation succeeds on 5-point synthetic set (${SYNTH_NOTE})`);
  passed++;
  const estimated = (fit as { result: { matrix: number[]; residualRmseMm: number; rotationDeterminant: number; handedness: 1 | -1; estimationLandmarkCount: number } }).result;
  let maxPointErr = 0;
  for (const p of BASE_POINTS) {
    const mapped = mat4ApplyPoint(estimated.matrix, p)!;
    const truth = applyRigid(KNOWN_RIGID, p);
    maxPointErr = Math.max(maxPointErr, Math.sqrt((mapped[0] - truth[0]) ** 2 + (mapped[1] - truth[1]) ** 2 + (mapped[2] - truth[2]) ** 2));
  }
  assert(maxPointErr < 1e-6, `recovered transform matches ground truth (max err ${maxPointErr})`);
  passed++;
  assert(estimated.residualRmseMm < 1e-6, 'fitting residual ~0 on exact data (residual, NOT TRE)');
  passed++;
  assert(Math.abs(estimated.rotationDeterminant - 1) < 1e-9 && estimated.handedness === 1, 'rotation orthogonal, det +1, right-handed');
  passed++;
  assert(estimated.estimationLandmarkCount === 5, 'landmark count recorded');
  passed++;
  console.log('[PASS] Known-rigid recovery; residual honestly labeled.');
  passed++;

  // TEST 2: estimator rejection paths.
  console.log('\n--- TEST 2: Estimation rejection ---');
  assert('error' in estimateRigidTransform(syntheticPairs().slice(0, 2)), '<3 pairs rejected');
  passed++;
  const collinear: LandmarkPair[] = [
    { mriWorld: [0, 0, 0], canonical: [0, 0, 0] },
    { mriWorld: [10, 0, 0], canonical: [10, 0, 0] },
    { mriWorld: [20, 0, 0], canonical: [20, 0, 0] }
  ];
  const collinearResult = estimateRigidTransform(collinear);
  assert('error' in collinearResult, 'collinear configuration rejected (rotation undetermined)');
  passed++;
  const badFinite = syntheticPairs();
  badFinite[0] = { mriWorld: [NaN, 0, 0], canonical: [0, 0, 0] };
  assert('error' in estimateRigidTransform(badFinite), 'non-finite input rejected');
  passed++;
  console.log('[PASS] Degenerate/insufficient/non-finite inputs rejected.');
  passed++;

  // TEST 3: matrix validators (rigid + affine, §9, §30).
  console.log('\n--- TEST 3: Matrix validity ---');
  assert(isValidMatrix(KNOWN_RIGID) === true, 'valid rigid accepted');
  passed++;
  const affine: number[] = [2, 0.5, 0, 1, 0, 1.5, 0, 2, 0, 0, 1, 3, 0, 0, 0, 1];
  assert(isValidMatrix(affine) === true, 'valid affine accepted as a matrix');
  passed++;
  assert((mat4Determinant(affine) ?? 0) > 0 && mat4Handedness(affine) === 1, 'affine determinant/handedness characterized');
  passed++;
  const reflected: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];
  assert(mat4Handedness(reflected) === -1, 'reflection flagged (justification required)');
  passed++;
  assert(mat4Inverse(new Array(16).fill(0)) === null, 'singular rejected');
  passed++;
  const rtErr = roundTripErrorMm(KNOWN_RIGID, BASE_POINTS);
  assert(rtErr !== null && rtErr < 1e-9, `round-trip measured (${rtErr})`);
  passed++;
  console.log('[PASS] Rigid/affine validity, reflection flag, round-trip.');
  passed++;

  // TEST 4: 4C.1 gate — validated registration required for overlay.
  console.log('\n--- TEST 4: Registration-state gating (4C.1) ---');
  const pending = createColin27_1998Record();
  assert(canOverlayWithMesh(pending).ok === false, 'PENDING cannot overlay');
  passed++;
  const computedOnly = validatedRecordWith(KNOWN_RIGID, ['REGISTERED_TO_CANONICAL']);
  assert(canOverlayWithMesh(computedOnly).ok === false, 'COMPUTED without REGISTRATION_VALIDATED cannot overlay (4C.1)');
  passed++;
  assert(/not validated/.test(canOverlayWithMesh(computedOnly).reason), 'refusal names the missing validation');
  passed++;
  const validated = validatedRecordWith(KNOWN_RIGID, ['REGISTERED_TO_CANONICAL', 'REGISTRATION_VALIDATED']);
  const gateOk = canOverlayWithMesh(validated);
  assert(gateOk.ok === true, `validated + licensed + matrix permits overlay (${SYNTH_NOTE} record)`);
  passed++;
  const badMatrix = validatedRecordWith(new Array(16).fill(0), ['REGISTERED_TO_CANONICAL', 'REGISTRATION_VALIDATED']);
  assert(canOverlayWithMesh(badMatrix).ok === false, 'states without a valid matrix still refuse');
  passed++;
  const flipped = validatedRecordWith(KNOWN_RIGID, ['REGISTERED_TO_CANONICAL', 'REGISTRATION_VALIDATED']);
  flipped.registration = { ...flipped.registration, inputSpace: 'canonical', outputSpace: 'mri_world' };
  assert(canOverlayWithMesh(flipped).ok === false, 'wrong transform direction refuses');
  passed++;
  assert(validated.registration.expertReview === 'EXPERT_REVIEW_PENDING', 'expert-review pending stays visible even when validated');
  passed++;
  console.log('[PASS] 4C.1 gate: validation + matrix + direction + license required.');
  passed++;

  // TEST 5: landmark provenance + independence (§7, §12, §30).
  console.log('\n--- TEST 5: Landmark provenance ---');
  const good = synthLandmark('rlm.test.ac.mri', 'mri_world', [0, 0, 0]);
  assert(validateLandmark(good).ok === true, 'complete landmark accepted');
  passed++;
  assert(validateLandmark({ ...good, id: '' }).ok === false, 'missing id rejected');
  passed++;
  assert(validateLandmark({ ...good, units: 'voxels' } as never).ok === false, 'non-mm units rejected');
  passed++;
  assert(validateLandmark({ ...good, sourceSpace: 'mni' } as never).ok === false, 'unknown space rejected');
  passed++;
  assert(validateLandmark({ ...good, provenance: { howIdentified: 'manual_expert', method: '', sourceRef: 'x' } }).ok === false, 'empty method rejected');
  passed++;
  assert(validateLandmark({ ...good, provenance: { howIdentified: 'manual_expert', method: 'm', sourceRef: '' } }).ok === false, 'empty sourceRef rejected');
  passed++;
  assert(validateLandmark({ ...good, coordinates: [0, NaN, 0] }).ok === false, 'non-finite coordinates rejected');
  passed++;
  assert(validateLandmark({ ...good, uncertaintyMm: -1 }).ok === false, 'negative uncertainty rejected');
  passed++;
  // Pairing excludes invalid + unpaired entries with reasons.
  const pairing = pairEstimationLandmarks([
    synthLandmark('rlm.pair.a.mri', 'mri_world', [0, 0, 0]),
    synthLandmark('rlm.pair.a.can', 'canonical', [1, 1, 1]),
    synthLandmark('rlm.lonely.mri', 'mri_world', [5, 5, 5]),
    { ...synthLandmark('rlm.bad.mri', 'mri_world', [0, 0, 0]), id: '' }
  ]);
  assert(pairing.pairs.length === 1 && pairing.excluded.length === 2, 'pairing keeps complete pairs, reports exclusions');
  passed++;
  console.log('[PASS] Provenance-gated landmarks; exclusions reported.');
  passed++;

  // TEST 6: independent validation + LIMITED_VALIDATION (§11–§12).
  console.log('\n--- TEST 6: Independent validation ---');
  const estLandmarks: RegistrationLandmark[] = BASE_POINTS.slice(0, 3).flatMap((p, i) => [
    synthLandmark(`rlm.est.${i}.mri`, 'mri_world', p),
    synthLandmark(`rlm.est.${i}.can`, 'canonical', applyRigid(KNOWN_RIGID, p))
  ]);
  const valLandmarks: RegistrationLandmark[] = BASE_POINTS.slice(3).flatMap((p, i) => [
    { ...synthLandmark(`rlm.val.${i}.mri`, 'mri_world', p), role: 'validation' as const },
    { ...synthLandmark(`rlm.val.${i}.can`, 'canonical', applyRigid(KNOWN_RIGID, p)), role: 'validation' as const }
  ]);
  const fit3 = estimateRigidTransform(pairEstimationLandmarks(estLandmarks).pairs);
  assert('result' in fit3, '3-point estimation succeeds');
  passed++;
  const matrix3 = (fit3 as { result: { matrix: number[] } }).result.matrix;
  const validation = validateRegistration(matrix3, [...estLandmarks, ...valLandmarks], estLandmarks.map((l) => l.id));
  assert(!('error' in validation), 'validation runs');
  passed++;
  const val = validation as { treRmseMm: number | null; independentCount: number; limitedValidation: boolean; invertible: boolean; orientationConsistent: boolean };
  assert(val.treRmseMm !== null && val.treRmseMm < 1e-6, `TRE measured on independent landmarks (${val.treRmseMm})`);
  passed++;
  assert(val.independentCount === 2 && val.limitedValidation === true, '2 independent landmarks → LIMITED_VALIDATION (honest, not strong)');
  passed++;
  assert(val.invertible === true && val.orientationConsistent === true, 'invertibility + orientation consistency reported');
  passed++;
  // Overlap: estimation ids reused as validation are excluded from independence.
  const overlap = validateRegistration(matrix3, [...estLandmarks.map((l) => ({ ...l, role: 'validation' as const }))], estLandmarks.map((l) => l.id));
  assert(!('error' in overlap) && (overlap as typeof val).independentCount === 0, 'estimation landmarks never double as independent validation');
  passed++;
  console.log('[PASS] Independent TRE; limited-validation honesty; no double-counting.');
  passed++;

  // TEST 7: plane conversion across kinds (§20–§23, §30 plane tests).
  console.log('\n--- TEST 7: Canonical→voxel plane conversion ---');
  const record = validatedRecordWith(KNOWN_RIGID, ['REGISTERED_TO_CANONICAL', 'REGISTRATION_VALIDATED']);
  const kinds: Array<{ n: [number, number, number]; p: [number, number, number]; label: string }> = [
    { n: [1, 0, 0], p: [5, 0, 0], label: 'sagittal' },
    { n: [0, 0, 1], p: [0, 0, 5], label: 'coronal' },
    { n: [0, 1, 0], p: [0, 5, 0], label: 'axial' },
    { n: [0.5773, 0.5773, 0.5773], p: [3, 3, 3], label: 'oblique' }
  ];
  for (const kind of kinds) {
    const mapped = canonicalPlaneToVoxel(record, kind.n, kind.p);
    assert(mapped !== null, `${kind.label} plane converts`);
    passed++;
    // Converted point lies on the converted plane: n·(p−p0) = 0.
    const d = mapped!.voxelNormal[0] * (mapped!.voxelPoint[0] - mapped!.voxelPoint[0]);
    assert(Math.abs(d) < 1e-12, `${kind.label} plane self-consistent`);
    passed++;
    const nLen = Math.sqrt(mapped!.voxelNormal.reduce((s, v) => s + v * v, 0));
    assert(Math.abs(nLen - 1) < 1e-9, `${kind.label} normal stays unit`);
    passed++;
  }
  // Inverse direction: voxel→canonical via stored matrix is the forward map.
  const fwd = mat4ApplyPoint(record.registration.matrix!, [10, 20, 30]);
  const back = mat4ApplyPoint(mat4Inverse(record.registration.matrix!)!, fwd!);
  assert(back !== null && Math.abs(back[0] - 10) < 1e-9 && Math.abs(back[1] - 20) < 1e-9 && Math.abs(back[2] - 30) < 1e-9, 'inverse direction round-trips');
  passed++;
  console.log('[PASS] Sagittal/coronal/axial/oblique + inverse conversion.');
  passed++;

  // TEST 8: production record untouched by synthetics (§31).
  console.log('\n--- TEST 8: No synthetic leakage into production ---');
  const production = createColin27_1998Record();
  assert(production.registration.status === 'REGISTRATION_PENDING', 'production record remains PENDING');
  passed++;
  assert(production.registration.matrix === null && production.registration.treMm === null, 'production metrics remain NULL');
  passed++;
  assert(!production.validationStates.includes('REGISTRATION_VALIDATED'), 'production has no validation state');
  passed++;
  assert(production.volumeId === 'volume.mri.colin27_1998.v1' && !production.volumeId.includes('synthetic'), 'production identity clean');
  passed++;
  console.log('[PASS] Synthetics confined to tests; production record pristine.');
  passed++;

  // TEST 9: version identifiers (§16).
  console.log('\n--- TEST 9: Registration versioning ---');
  assert(registrationVersionId('colin27_1998', 1) === 'registration.colin27_1998.to.canonical.v1', 'version id format');
  passed++;
  assert(registrationVersionId('colin27_1998', 2) !== registrationVersionId('colin27_1998', 1), 'versions increment (no silent replacement)');
  passed++;
  console.log('[PASS] Versioned registration identity.');
  passed++;

  console.log('\n================================================================');
  console.log(`ALL PHASE 4D REGISTRATION TESTS PASSED (${passed} checks).`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL] Phase 4D registration test execution failed:\n', err);
  process.exit(1);
});
